"""
Database backup service
Creates daily backups and maintains 1 week of backups
"""
import os
import shutil
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def get_backup_dir() -> Path:
    """Get the backup directory path"""
    backup_dir = Path(os.getenv("BACKUP_DIR", "./backups"))
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def create_backup(db_path: str) -> Optional[str]:
    """
    Create a backup of the database file.
    Returns the backup file path if successful, None otherwise.
    """
    try:
        if not os.path.exists(db_path):
            logger.warning(f"Database file not found: {db_path}")
            return None
        
        backup_dir = get_backup_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"status_monitor_{timestamp}.db"
        backup_path = backup_dir / backup_filename
        
        logger.info(f"Creating backup: {backup_path}")
        shutil.copy2(db_path, backup_path)
        logger.info(f"Backup created successfully: {backup_path}")
        
        return str(backup_path)
    except Exception as e:
        logger.error(f"Error creating backup: {e}", exc_info=True)
        return None


def cleanup_old_backups(keep_days: int = 7) -> int:
    """
    Remove backups older than keep_days.
    Returns the number of backups deleted.
    """
    try:
        backup_dir = get_backup_dir()
        if not backup_dir.exists():
            return 0
        
        cutoff_date = datetime.now() - timedelta(days=keep_days)
        deleted_count = 0
        
        for backup_file in backup_dir.glob("status_monitor_*.db"):
            try:
                # Extract timestamp from filename: status_monitor_YYYYMMDD_HHMMSS.db
                filename = backup_file.stem  # status_monitor_YYYYMMDD_HHMMSS
                timestamp_str = filename.replace("status_monitor_", "")
                file_date = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                
                if file_date < cutoff_date:
                    logger.info(f"Deleting old backup: {backup_file}")
                    backup_file.unlink()
                    deleted_count += 1
            except (ValueError, Exception) as e:
                logger.warning(f"Error processing backup file {backup_file}: {e}")
                # If we can't parse the date, skip it (might be manually created)
                continue
        
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old backup(s)")
        
        return deleted_count
    except Exception as e:
        logger.error(f"Error cleaning up old backups: {e}", exc_info=True)
        return 0


def get_latest_backup() -> Optional[str]:
    """Get the path to the most recent backup file"""
    try:
        backup_dir = get_backup_dir()
        if not backup_dir.exists():
            return None
        
        backups = list(backup_dir.glob("status_monitor_*.db"))
        if not backups:
            return None
        
        # Sort by modification time (most recent first)
        backups.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return str(backups[0])
    except Exception as e:
        logger.error(f"Error finding latest backup: {e}", exc_info=True)
        return None


def restore_backup(backup_path: str, db_path: str) -> bool:
    """
    Restore database from a backup file.
    Returns True if successful, False otherwise.
    """
    try:
        if not os.path.exists(backup_path):
            logger.error(f"Backup file not found: {backup_path}")
            return False
        
        logger.info(f"Restoring database from backup: {backup_path}")
        shutil.copy2(backup_path, db_path)
        logger.info(f"Database restored successfully from: {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Error restoring backup: {e}", exc_info=True)
        return False


async def daily_backup_task(db_path: str) -> bool:
    """
    Daily backup task: create backup and cleanup old ones.
    Returns True if backup was created successfully.
    """
    logger.info("Starting daily backup task...")
    
    backup_path = create_backup(db_path)
    if backup_path:
        cleanup_old_backups(keep_days=7)
        logger.info("Daily backup task completed successfully")
        return True
    else:
        logger.error("Daily backup task failed - backup not created")
        return False
