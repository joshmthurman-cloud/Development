"""
STEAM SOAP-based TPN loader service
"""
import asyncio
import logging
import shutil
import os
from datetime import datetime
from typing import Dict, List
from sqlalchemy.orm import Session
from app.models import Terminal
from app.services.steam_soap import get_terminals_from_steam

logger = logging.getLogger(__name__)


async def reload_tpns_from_steam(
    db: Session,
    soap_url: str,
    username: str,
    password: str,
    company_id: str,
    tpn_file_path: str,
    concurrency: int = 10
) -> Dict[str, int]:
    """
    Reload TPNs from STEAM SOAP API and update tpns.txt file.
    Also fetches ProfileID for each TPN.
    
    Returns dict with counts: total_tpns, new_tpns, updated_tpns, profile_ids_fetched
    """
    logger.info("Starting TPN reload from STEAM SOAP API")
    
    # Step 1: Get all TPNs from STEAM
    try:
        tpns_raw = await get_terminals_from_steam(soap_url, username, password, company_id)
        # Normalize TPNs: strip whitespace and ensure consistent format
        tpns = [tpn.strip() for tpn in tpns_raw if tpn.strip()]
        logger.info(f"Retrieved {len(tpns)} TPNs from STEAM (normalized from {len(tpns_raw)} raw)")
    except Exception as e:
        logger.error(f"Failed to get TPNs from STEAM: {e}", exc_info=True)
        raise
    
    # Step 2: Backup the TPN file before modifying it (in case we need to restore)
    original_file_backup = None
    if os.path.exists(tpn_file_path):
        try:
            backup_suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
            original_file_backup = f"{tpn_file_path}.backup_{backup_suffix}"
            shutil.copy2(tpn_file_path, original_file_backup)
            logger.info(f"Backed up original TPN file to: {original_file_backup}")
        except Exception as e:
            logger.warning(f"Failed to backup TPN file (continuing anyway): {e}")
    
    # Step 3: Write TPNs to file (but don't commit to DB yet)
    try:
        with open(tpn_file_path, 'w', encoding='utf-8') as f:
            for tpn in sorted(tpns):
                f.write(f"{tpn}\n")
        logger.info(f"Wrote {len(tpns)} TPNs to {tpn_file_path}")
    except Exception as e:
        logger.error(f"Failed to write TPNs to file: {e}", exc_info=True)
        # Restore original file if write failed
        if original_file_backup and os.path.exists(original_file_backup):
            try:
                shutil.copy2(original_file_backup, tpn_file_path)
                logger.info(f"Restored original TPN file from backup")
            except Exception as restore_error:
                logger.error(f"Failed to restore TPN file: {restore_error}")
        raise
    
    # Step 4: Upsert terminals in database (transactional - rollback if fails)
    # Normalize TPNs to set for comparison
    tpn_set = set(tpns)
    new_count = 0
    existing_count = 0
    updated_count = 0
    
    # First, normalize existing terminals in database (fix any with whitespace)
    all_terminals = db.query(Terminal).all()
    for terminal in all_terminals:
        normalized_tpn = terminal.tpn.strip()
        if terminal.tpn != normalized_tpn:
            logger.info(f"Normalizing TPN: '{terminal.tpn}' -> '{normalized_tpn}'")
            terminal.tpn = normalized_tpn
            updated_count += 1
    
    # Commit normalization changes before proceeding
    if updated_count > 0:
        db.commit()
        # Re-query to get updated terminals
        all_terminals = db.query(Terminal).all()
    
    # Now upsert terminals
    for tpn in tpns:
        # Use normalized TPN for lookup
        terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
        if not terminal:
            terminal = Terminal(tpn=tpn)
            db.add(terminal)
            new_count += 1
        else:
            existing_count += 1
    
    # Note: We do NOT delete terminals that are no longer in the list.
    # All historical data is preserved. User will manage database size if needed.
    
    # Commit database changes
    try:
        db.commit()
        logger.info(f"Upserted {new_count} new terminals, {existing_count} already existed, {updated_count} normalized. All terminals preserved (none deleted).")
        
        # Clean up backup file after successful commit
        if original_file_backup and os.path.exists(original_file_backup):
            try:
                os.remove(original_file_backup)
                logger.debug(f"Removed temporary backup file: {original_file_backup}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to remove temporary backup file: {cleanup_error}")
    except Exception as db_error:
        # Rollback database changes
        db.rollback()
        logger.error(f"Database commit failed, rolling back changes: {db_error}", exc_info=True)
        
        # Restore original TPN file if database commit failed
        if original_file_backup and os.path.exists(original_file_backup):
            try:
                shutil.copy2(original_file_backup, tpn_file_path)
                logger.info(f"Restored original TPN file from backup due to database error")
            except Exception as restore_error:
                logger.error(f"Failed to restore TPN file: {restore_error}")
        
        raise
    
    # ProfileID fetching removed - will be fetched on-demand when viewing terminal details
    
    return {
        "total_tpns": len(tpns),
        "new_tpns": new_count,
        "updated_tpns": existing_count,
        "normalized_tpns": updated_count,
        "profile_ids_fetched": 0  # No longer fetching during reload
    }
