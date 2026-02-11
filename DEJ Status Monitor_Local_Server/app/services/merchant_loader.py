"""
Merchant mapping loader service
Loads merchant code to company name mappings from merchant_mapping.json
"""
import json
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

MERCHANT_MAPPING_FILE = os.getenv("MERCHANT_MAPPING_FILE", "./merchant_mapping.json")

# Cache for merchant mapping
_merchant_mapping_cache: Optional[Dict[str, str]] = None
_merchant_mapping_file_mtime: Optional[float] = None


def load_merchant_mapping(force_reload: bool = False) -> Dict[str, str]:
    """
    Load merchant code to company name mapping from JSON file.
    Returns dict mapping 4-digit codes to company names.
    Uses in-memory cache to avoid reloading on every request.
    
    Args:
        force_reload: If True, force reload from file even if cached
    """
    global _merchant_mapping_cache, _merchant_mapping_file_mtime
    
    if not os.path.exists(MERCHANT_MAPPING_FILE):
        if _merchant_mapping_cache is None:
            logger.warning(f"Merchant mapping file not found: {MERCHANT_MAPPING_FILE}")
        return _merchant_mapping_cache or {}
    
    # Check if file has been modified
    current_mtime = os.path.getmtime(MERCHANT_MAPPING_FILE)
    
    # Return cached version if available and file hasn't changed
    if not force_reload and _merchant_mapping_cache is not None:
        if _merchant_mapping_file_mtime == current_mtime:
            return _merchant_mapping_cache
    
    # Load from file
    try:
        with open(MERCHANT_MAPPING_FILE, 'r', encoding='utf-8') as f:
            mapping = json.load(f)
        
        # Update cache
        was_cached = _merchant_mapping_cache is not None
        _merchant_mapping_cache = mapping
        _merchant_mapping_file_mtime = current_mtime
        
        # Log at INFO level only on initial load, DEBUG on reloads
        if not was_cached:
            logger.info(f"Loaded {len(mapping)} merchant mappings from {MERCHANT_MAPPING_FILE}")
        else:
            logger.debug(f"Reloaded {len(mapping)} merchant mappings from {MERCHANT_MAPPING_FILE} (file changed)")
        return mapping
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding merchant mapping file: {e}")
        return _merchant_mapping_cache or {}
    except Exception as e:
        logger.error(f"Error loading merchant mapping file: {e}")
        return _merchant_mapping_cache or {}


def get_merchant_name(code: str) -> Optional[str]:
    """Get company name for a merchant code"""
    mapping = load_merchant_mapping()
    return mapping.get(code)


def get_merchant_code_from_name(name: str, mapping: Dict[str, str]) -> Optional[str]:
    """Get merchant code from company name (reverse lookup)"""
    for code, company_name in mapping.items():
        if company_name == name:
            return code
    return None
