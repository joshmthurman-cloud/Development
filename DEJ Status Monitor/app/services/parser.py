"""
Parser for terminal status responses
"""
import re
from app.models import Status


def parse_status_response(response_text: str) -> Status:
    """
    Parse the response text to determine terminal status.
    
    Rules:
    - If contains "Online" => ONLINE
    - If contains "Offline" => OFFLINE
    - If contains "Disconnect" or "Disconnected" => DISCONNECT
    - Else => UNKNOWN
    """
    if not response_text:
        return Status.UNKNOWN
    
    text_lower = response_text.lower()
    
    # Check for Disconnect first (more specific)
    if "disconnect" in text_lower:
        return Status.DISCONNECT
    
    # Check for Online
    if "online" in text_lower:
        return Status.ONLINE
    
    # Check for Offline
    if "offline" in text_lower:
        return Status.OFFLINE
    
    return Status.UNKNOWN


def truncate_response(response_text: str, max_length: int = 2000) -> str:
    """Truncate response text for storage"""
    if not response_text:
        return ""
    if len(response_text) <= max_length:
        return response_text
    return response_text[:max_length] + "... [truncated]"
