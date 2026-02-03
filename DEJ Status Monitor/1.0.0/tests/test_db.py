"""
Tests for database queries
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db import SessionLocal, init_db, engine
from app.models import Terminal, StatusCheck


@pytest.fixture
def db():
    """Create a test database session"""
    # Use in-memory SQLite for tests
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    test_engine = create_engine("sqlite:///:memory:")
    from app.models import Base
    Base.metadata.create_all(bind=test_engine)
    
    TestSessionLocal = sessionmaker(bind=test_engine)
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_create_terminal(db: Session):
    """Test creating a terminal"""
    terminal = Terminal(tpn="TEST001")
    db.add(terminal)
    db.commit()
    
    assert terminal.id is not None
    assert terminal.tpn == "TEST001"
    assert terminal.created_at is not None


def test_create_status_check(db: Session):
    """Test creating a status check"""
    terminal = Terminal(tpn="TEST001")
    db.add(terminal)
    db.commit()
    
    check = StatusCheck(
        terminal_id=terminal.id,
        status="ONLINE",
        checked_at=datetime.utcnow(),
        http_status=200,
        latency_ms=150
    )
    db.add(check)
    db.commit()
    
    assert check.id is not None
    assert check.terminal_id == terminal.id
    assert check.status == "ONLINE"


def test_query_latest_status(db: Session):
    """Test querying latest status for a terminal"""
    terminal = Terminal(tpn="TEST001")
    db.add(terminal)
    db.commit()
    
    # Add multiple checks
    now = datetime.utcnow()
    check1 = StatusCheck(
        terminal_id=terminal.id,
        status="ONLINE",
        checked_at=now - timedelta(hours=2)
    )
    check2 = StatusCheck(
        terminal_id=terminal.id,
        status="OFFLINE",
        checked_at=now - timedelta(hours=1)
    )
    check3 = StatusCheck(
        terminal_id=terminal.id,
        status="ONLINE",
        checked_at=now
    )
    
    db.add_all([check1, check2, check3])
    db.commit()
    
    # Query latest check
    latest = db.query(StatusCheck).filter(
        StatusCheck.terminal_id == terminal.id
    ).order_by(StatusCheck.checked_at.desc()).first()
    
    assert latest.status == "ONLINE"
    assert latest.checked_at == now


def test_query_last_online(db: Session):
    """Test querying last online time"""
    terminal = Terminal(tpn="TEST001")
    db.add(terminal)
    db.commit()
    
    now = datetime.utcnow()
    
    # Add checks with different statuses
    check1 = StatusCheck(
        terminal_id=terminal.id,
        status="ONLINE",
        checked_at=now - timedelta(hours=3)
    )
    check2 = StatusCheck(
        terminal_id=terminal.id,
        status="OFFLINE",
        checked_at=now - timedelta(hours=2)
    )
    check3 = StatusCheck(
        terminal_id=terminal.id,
        status="ONLINE",
        checked_at=now - timedelta(hours=1)
    )
    
    db.add_all([check1, check2, check3])
    db.commit()
    
    # Query last online
    last_online = db.query(StatusCheck).filter(
        StatusCheck.terminal_id == terminal.id,
        StatusCheck.status == "ONLINE"
    ).order_by(StatusCheck.checked_at.desc()).first()
    
    assert last_online.status == "ONLINE"
    assert last_online.checked_at == now - timedelta(hours=1)
