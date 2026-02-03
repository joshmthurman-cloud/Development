"""
Tests for response parser
"""
import pytest
from app.services.parser import parse_status_response, truncate_response
from app.models import Status


def test_parse_online():
    """Test parsing online status"""
    assert parse_status_response("Terminal is Online") == Status.ONLINE
    assert parse_status_response("Status: ONLINE") == Status.ONLINE
    assert parse_status_response("online") == Status.ONLINE
    assert parse_status_response("ONLINE") == Status.ONLINE


def test_parse_offline():
    """Test parsing offline status"""
    assert parse_status_response("Terminal is Offline") == Status.OFFLINE
    assert parse_status_response("Status: OFFLINE") == Status.OFFLINE
    assert parse_status_response("offline") == Status.OFFLINE


def test_parse_disconnect():
    """Test parsing disconnect status"""
    assert parse_status_response("Terminal is Disconnected") == Status.DISCONNECT
    assert parse_status_response("Status: Disconnect") == Status.DISCONNECT
    assert parse_status_response("disconnect") == Status.DISCONNECT
    assert parse_status_response("Disconnected") == Status.DISCONNECT


def test_parse_unknown():
    """Test parsing unknown status"""
    assert parse_status_response("") == Status.UNKNOWN
    assert parse_status_response("Some random text") == Status.UNKNOWN
    assert parse_status_response("Status: Unknown") == Status.UNKNOWN


def test_parse_priority():
    """Test that disconnect takes priority over online/offline"""
    # Disconnect should be detected even if online/offline also present
    assert parse_status_response("Online but Disconnected") == Status.DISCONNECT


def test_truncate_response():
    """Test response truncation"""
    short_text = "Short text"
    assert truncate_response(short_text) == short_text
    
    long_text = "A" * 3000
    truncated = truncate_response(long_text, max_length=2000)
    assert len(truncated) == 2015  # 2000 + "... [truncated]"
    assert truncated.endswith("... [truncated]")
    
    assert truncate_response("") == ""
    assert truncate_response(None) == ""
