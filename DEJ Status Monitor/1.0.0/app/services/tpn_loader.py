"""
TPN file loader service
"""
import os
import logging
from sqlalchemy.orm import Session
from app.models import Terminal

logger = logging.getLogger(__name__)


def count_tpns_in_file(file_path: str) -> int:
    """
    Count TPNs in a file (one per line).
    Ignores blank lines and lines starting with #.
    Returns count of TPNs.
    """
    if not os.path.exists(file_path):
        return 0
    
    count = 0
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            # Strip whitespace
            line = line.strip()
            # Skip blank lines and comments
            if not line or line.startswith('#'):
                continue
            count += 1
    
    return count


def load_tpns_from_file(db: Session, file_path: str) -> int:
    """
    Load TPNs from a plaintext file (one per line).
    Ignores blank lines and lines starting with #.
    Note: Terminals not in the file are preserved (not deleted) to maintain historical data.
    Returns count of TPNs loaded.
    """
    if not os.path.exists(file_path):
        logger.warning(f"TPN file not found: {file_path}")
        return 0
    
    tpns = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            # Strip whitespace
            line = line.strip()
            # Skip blank lines and comments
            if not line or line.startswith('#'):
                continue
            tpns.append(line)
    
    logger.info(f"Loaded {len(tpns)} TPNs from {file_path}")
    
    # Convert to set for faster lookup (TPNs are already normalized from file)
    tpn_set = set(tpns)
    
    # First, normalize existing terminals in database (fix any with whitespace)
    all_terminals = db.query(Terminal).all()
    updated_count = 0
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
    
    # Upsert terminals
    count = 0
    for tpn in tpns:
        terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
        if not terminal:
            terminal = Terminal(tpn=tpn)
            db.add(terminal)
            count += 1
    
    # Note: We do NOT delete terminals that are no longer in the file.
    # All historical data is preserved. User will manage database size if needed.
    
    db.commit()
    logger.info(f"Upserted {count} new terminals, {len(tpns) - count} already existed, {updated_count} normalized. All terminals preserved (none deleted).")
    
    return len(tpns)
