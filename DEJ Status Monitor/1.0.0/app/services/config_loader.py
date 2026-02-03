"""
Configuration loader for check times and settings
"""
import json
import os
import logging
from typing import List

logger = logging.getLogger(__name__)

CONFIG_FILE_PATH = os.getenv("CONFIG_FILE_PATH", "./config.json")
DEFAULT_CHECK_TIMES = ["08:00", "14:00", "20:00"]
DEFAULT_TIMEZONE = "America/New_York"


def load_config() -> dict:
    """
    Load configuration from JSON file.
    Returns dict with check_times (list), checks_per_day (int), timezone (str)
    """
    if not os.path.exists(CONFIG_FILE_PATH):
        logger.warning(f"Config file not found: {CONFIG_FILE_PATH}, using defaults")
        return {
            "check_times": DEFAULT_CHECK_TIMES,
            "checks_per_day": len(DEFAULT_CHECK_TIMES),
            "timezone": DEFAULT_TIMEZONE
        }
    
    try:
        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Validate and set defaults
        check_times = config.get("check_times", DEFAULT_CHECK_TIMES)
        checks_per_day = config.get("checks_per_day", len(check_times))
        timezone = config.get("timezone", DEFAULT_TIMEZONE)
        
        # Ensure check_times matches checks_per_day
        if len(check_times) != checks_per_day:
            logger.warning(f"check_times count ({len(check_times)}) doesn't match checks_per_day ({checks_per_day}), using check_times length")
            checks_per_day = len(check_times)
        
        # Get STEAM API config
        steam_api = config.get("steam_api", {})
        
        return {
            "check_times": check_times,
            "checks_per_day": checks_per_day,
            "timezone": timezone,
            "steam_api": steam_api
        }
    except Exception as e:
        logger.error(f"Error loading config file: {e}, using defaults")
        return {
            "check_times": DEFAULT_CHECK_TIMES,
            "checks_per_day": len(DEFAULT_CHECK_TIMES),
            "timezone": DEFAULT_TIMEZONE
        }
