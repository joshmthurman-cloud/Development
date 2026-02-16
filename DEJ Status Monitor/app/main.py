"""
Main FastAPI application for Terminal Status Monitor
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, Request, Query, Form, status as http_status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.db import get_db, init_db
from app.models import Terminal, StatusCheck, User, UserMerchant, UserRole, PasswordResetToken
from app.services.checker import run_check_all_terminals
from app.services.tpn_loader import load_tpns_from_file
from app.services.config_loader import load_config
from app.auth import (
    get_current_active_user, require_admin, create_access_token,
    get_password_hash, verify_password, get_user_merchant_codes
)
import pytz
from urllib.parse import unquote_plus

def safe_decode_password(password: str) -> str:
    """Safely decode URL-encoded password if needed"""
    # FastAPI's Form() should decode automatically, but handle edge cases
    # Only decode if the password contains URL-encoded patterns (%XX)
    if '%' in password:
        try:
            decoded = unquote_plus(password)
            # Only use decoded version if it's different (was actually encoded)
            # This prevents breaking passwords that legitimately contain %
            if decoded != password:
                return decoded
        except Exception:
            # If decoding fails, use original password
            pass
    return password

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO")
log_file = os.getenv("LOG_FILE", "./status_monitor.log")

# Create logs directory if it doesn't exist
log_dir = os.path.dirname(log_file) if os.path.dirname(log_file) else "."
if log_dir and not os.path.exists(log_dir):
    os.makedirs(log_dir, exist_ok=True)

# Load timezone from config for logging
from app.services.config_loader import load_config
CONFIG = load_config()
TIMEZONE = pytz.timezone(CONFIG["timezone"])

# Create custom formatter with local timezone
class LocalTimeFormatter(logging.Formatter):
    """Formatter that converts UTC time to local timezone"""
    def formatTime(self, record, datefmt=None):
        # record.created is a timestamp (seconds since epoch)
        # Convert to UTC datetime first, then to local timezone
        # Use fromtimestamp with UTC to ensure we're working with UTC
        utc_dt = datetime.fromtimestamp(record.created, tz=pytz.UTC)
        local_dt = utc_dt.astimezone(TIMEZONE)
        if datefmt:
            return local_dt.strftime(datefmt)
        return local_dt.strftime('%Y-%m-%d %H:%M:%S')

# Configure logging to both file and console with local timezone
formatter = LocalTimeFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

file_handler = logging.FileHandler(log_file)
file_handler.setFormatter(formatter)

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(getattr(logging, log_level.upper()))
root_logger.handlers = []  # Clear existing handlers
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Apply formatter to uvicorn loggers
uvicorn_logger = logging.getLogger("uvicorn")
uvicorn_logger.handlers = []
uvicorn_logger.addHandler(file_handler)
uvicorn_logger.addHandler(console_handler)

uvicorn_error = logging.getLogger("uvicorn.error")
uvicorn_error.handlers = []
uvicorn_error.addHandler(file_handler)
uvicorn_error.addHandler(console_handler)

uvicorn_access = logging.getLogger("uvicorn.access")
uvicorn_access.handlers = []
uvicorn_access.addHandler(file_handler)
uvicorn_access.addHandler(console_handler)

# Apply formatter to apscheduler logger
apscheduler_logger = logging.getLogger("apscheduler")
apscheduler_logger.handlers = []
apscheduler_logger.addHandler(file_handler)
apscheduler_logger.addHandler(console_handler)

logger = logging.getLogger(__name__)

# Log application startup
logger.info("=" * 80)
logger.info("Terminal Status Monitor - Application Starting")
logger.info(f"Log file: {log_file}")
logger.info(f"Timezone: {TIMEZONE}")
logger.info("=" * 80)

app = FastAPI(title="Terminal Status Monitor")

# Add session middleware for authentication
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-in-production-use-random-string")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Application version
APP_VERSION = "1.1.3"

# Templates
template_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(template_dir))
templates.env.globals["app_version"] = APP_VERSION

# Static files (logo, etc.)
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Add custom Jinja2 filters
def format_duration(seconds):
    """Format seconds into human-readable duration"""
    if seconds is None:
        return "Never"
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"

def to_eastern_time(iso_string):
    """Convert ISO UTC string to Eastern time string"""
    if not iso_string:
        return None
    try:
        # Parse ISO string (may or may not have timezone)
        if 'T' in iso_string:
            # Handle ISO format with or without timezone
            if iso_string.endswith('Z'):
                dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
            elif '+' in iso_string or iso_string.count('-') > 2:
                # Has timezone info
                dt = datetime.fromisoformat(iso_string)
            else:
                # No timezone, assume UTC
                dt = datetime.fromisoformat(iso_string)
                dt = pytz.UTC.localize(dt)
            
            # Convert to Eastern
            if dt.tzinfo is None:
                dt = pytz.UTC.localize(dt)
            eastern_dt = dt.astimezone(TIMEZONE)
            # Return formatted string
            return eastern_dt.strftime('%Y-%m-%d %H:%M:%S %Z')
        else:
            # Not an ISO string, return as-is
            return iso_string
    except Exception as e:
        # If parsing fails, try to return first 19 chars (YYYY-MM-DD HH:MM:SS)
        return iso_string[:19] if iso_string else None

templates.env.filters["format_duration"] = format_duration
templates.env.filters["to_eastern"] = to_eastern_time

# Scheduler
scheduler = AsyncIOScheduler()
check_in_progress = False

# Configuration
TPN_FILE_PATH = os.getenv("TPN_FILE_PATH", "./tpns.txt")
# CONFIG and TIMEZONE already loaded above for logging
CHECK_TIMES = CONFIG["check_times"]


async def scheduled_check():
    """Scheduled task to run terminal checks"""
    global check_in_progress
    if check_in_progress:
        logger.warning("Check already in progress, skipping scheduled run")
        return
    
    check_in_progress = True
    db = None
    try:
        # Create a new DB session for the scheduled task
        from app.db import SessionLocal
        db = SessionLocal()
        logger.info("Starting scheduled check...")
        run_id = await run_check_all_terminals(db)
        logger.info(f"Scheduled check completed successfully with run_id: {run_id}")
    except asyncio.CancelledError:
        logger.warning("Scheduled check was cancelled (likely due to server reload). Check may be incomplete.")
        if db:
            db.rollback()
            db.close()
        # Re-raise to allow proper cleanup
        raise
    except Exception as e:
        logger.error(f"Error in scheduled check: {e}", exc_info=True)
        if db:
            try:
                db.rollback()
                logger.info("Rolled back database transaction due to error")
            except Exception as rollback_error:
                logger.error(f"Error during rollback: {rollback_error}", exc_info=True)
    finally:
        if db:
            try:
                db.close()
            except Exception as close_error:
                logger.error(f"Error closing database session: {close_error}", exc_info=True)
        check_in_progress = False
        logger.info("Scheduled check finished, check_in_progress set to False")


async def scheduled_backup():
    """Scheduled task to run daily database backup"""
    try:
        import os
        from app.services.backup_service import daily_backup_task
        
        db_path = os.getenv("DB_PATH", "status_monitor.db")
        logger.info("Starting scheduled backup...")
        success = await daily_backup_task(db_path)
        if success:
            logger.info("Scheduled backup completed successfully")
        else:
            logger.error("Scheduled backup failed")
    except Exception as e:
        logger.error(f"Error in scheduled backup: {e}", exc_info=True)


def setup_scheduler():
    """Setup APScheduler with daily check times and nightly backup in Eastern timezone"""
    scheduler.configure(timezone=str(TIMEZONE))
    now_eastern = datetime.now(TIMEZONE)
    
    # Schedule terminal status checks
    for check_time in CHECK_TIMES:
        hour, minute = map(int, check_time.strip().split(":"))
        job_id = f"check_{hour}_{minute}"
        
        # Check if this time has already passed today
        scheduled_time_today = now_eastern.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        scheduler.add_job(
            scheduled_check,
            trigger=CronTrigger(hour=hour, minute=minute, timezone=TIMEZONE),
            id=job_id,
            replace_existing=True,
            misfire_grace_time=300,  # Allow job to run if it's up to 5 minutes late
            coalesce=True,  # If multiple runs are missed, only run the latest one
            max_instances=1  # Only allow one instance of this job to run at a time
        )
        
        # Log when the next run will be
        if scheduled_time_today > now_eastern:
            next_run = scheduled_time_today
        else:
            next_run = scheduled_time_today + timedelta(days=1)
        
        logger.info(f"Scheduled check at {hour:02d}:{minute:02d} {TIMEZONE} - Next run: {next_run.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    
    # Schedule daily backup at 2:00 AM Eastern time
    backup_time_today = now_eastern.replace(hour=2, minute=0, second=0, microsecond=0)
    if backup_time_today > now_eastern:
        next_backup = backup_time_today
    else:
        next_backup = backup_time_today + timedelta(days=1)
    
    scheduler.add_job(
        scheduled_backup,
        trigger=CronTrigger(hour=2, minute=0, timezone=TIMEZONE),
        id="daily_backup",
        replace_existing=True,
        misfire_grace_time=3600,  # Allow job to run if it's up to 1 hour late
        coalesce=True,
        max_instances=1
    )
    
    logger.info(f"Scheduled daily backup at 02:00 {TIMEZONE} - Next run: {next_backup.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    
    scheduler.start()
    logger.info(f"Scheduler started. Current Eastern time: {now_eastern.strftime('%Y-%m-%d %H:%M:%S %Z')}")


def get_next_check_time():
    """Get the next scheduled check time"""
    jobs = scheduler.get_jobs()
    if not jobs:
        return None
    
    # Get all scheduled times for today and tomorrow
    now = datetime.now(TIMEZONE)
    next_times = []
    
    for check_time in CHECK_TIMES:
        hour, minute = map(int, check_time.strip().split(":"))
        # Today's time
        today_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if today_time > now:
            next_times.append(today_time)
        else:
            # Tomorrow's time
            tomorrow_time = today_time + timedelta(days=1)
            next_times.append(tomorrow_time)
    
    if next_times:
        return min(next_times)
    return None


@app.on_event("startup")
async def startup_event():
    """Initialize database and load TPNs on startup"""
    logger.info("Application startup event triggered")
    init_db()
    logger.info("Database initialized")
    
    # Load TPNs from file
    try:
        from app.db import SessionLocal
        db = SessionLocal()
        try:
            load_tpns_from_file(db, TPN_FILE_PATH)
            db.commit()
            logger.info(f"Loaded TPNs from {TPN_FILE_PATH}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error loading TPNs: {e}", exc_info=True)
    
    # Setup scheduler
    setup_scheduler()
    
    # Run first check immediately if before first scheduled time
    now_eastern = datetime.now(TIMEZONE)
    if CHECK_TIMES:
        first_check_time = CHECK_TIMES[0].strip()
        hour, minute = map(int, first_check_time.split(":"))
        first_scheduled_time = now_eastern.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        # If we're before the first scheduled time today, run immediately
        if now_eastern < first_scheduled_time:
            logger.info(f"Running initial check (before first scheduled time {first_check_time})")
            asyncio.create_task(scheduled_check())


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown scheduler"""
    scheduler.shutdown()


# Helper function to get current user from session
async def get_current_user_from_session(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user from session token"""
    token = request.session.get("access_token")
    if not token:
        return None
    
    try:
        from jose import jwt as jose_jwt
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email:
            user = db.query(User).filter(User.email == email).first()
            if user and user.is_active:
                return user
    except Exception:
        pass
    return None


# Helper function for session-based admin authentication
async def require_admin_session(request: Request, db: Session = Depends(get_db)) -> User:
    """Require admin role using session authentication"""
    current_user = await get_current_user_from_session(request, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# API Endpoints

@app.get("/api/terminals")
async def get_terminals(
    status: Optional[str] = None,
    last_online_before: Optional[str] = None,
    search: Optional[str] = None,
    merchant: Optional[str] = None,
    min_uptime: Optional[float] = Query(None, description="Minimum uptime percentage"),
    max_uptime: Optional[float] = Query(None, description="Maximum uptime percentage"),
    db: Session = Depends(get_db)
):
    """
    Get all terminals with latest status and last online time.
    Query params:
    - status: filter by status (ONLINE/OFFLINE/DISCONNECT/ERROR/UNKNOWN)
    - last_online_before: ISO datetime string
    - search: search in TPN
    - merchant: filter by merchant number (first 4 chars of TPN)
    - min_uptime: minimum uptime percentage (0-100)
    - max_uptime: maximum uptime percentage (0-100)
    """
    # Subquery for latest status per terminal
    latest_check_subq = db.query(
        StatusCheck.terminal_id,
        func.max(StatusCheck.checked_at).label('latest_checked_at')
    ).group_by(StatusCheck.terminal_id).subquery()
    
    # Subquery for last online time per terminal
    last_online_subq = db.query(
        StatusCheck.terminal_id,
        func.max(StatusCheck.checked_at).label('last_online_at')
    ).filter(StatusCheck.status == 'ONLINE').group_by(StatusCheck.terminal_id).subquery()
    
    # Get terminals that are in the file (exclude deleted ones)
    file_tpns = set()
    if os.path.exists(TPN_FILE_PATH):
        with open(TPN_FILE_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    file_tpns.add(line)
    
    # Main query - only include terminals in the file
    query = db.query(
        Terminal,
        StatusCheck.status.label('latest_status'),
        StatusCheck.checked_at.label('latest_checked_at'),
        last_online_subq.c.last_online_at.label('last_online_at')
    ).join(
        latest_check_subq,
        Terminal.id == latest_check_subq.c.terminal_id
    ).join(
        StatusCheck,
        and_(
            StatusCheck.terminal_id == Terminal.id,
            StatusCheck.checked_at == latest_check_subq.c.latest_checked_at
        )
    ).outerjoin(
        last_online_subq,
        Terminal.id == last_online_subq.c.terminal_id
    )
    
    # Filter to only terminals in the file
    if file_tpns:
        query = query.filter(Terminal.tpn.in_(file_tpns))
    else:
        # If file doesn't exist or is empty, return empty results
        query = query.filter(False)
    
    # Apply filters
    if status:
        query = query.filter(StatusCheck.status == status.upper())
    
    if search:
        query = query.filter(Terminal.tpn.contains(search))
    
    if merchant:
        # Merchant can be either a code (4 digits) or a company name
        # If it's a company name, look up the code
        from app.services.merchant_loader import load_merchant_mapping, get_merchant_code_from_name
        mapping = load_merchant_mapping()
        
        # Check if merchant is a code (4 digits) or a company name
        merchant_code = None
        if merchant.isdigit() and len(merchant) == 4:
            merchant_code = merchant
        else:
            # Try to find code from company name
            merchant_code = get_merchant_code_from_name(merchant, mapping)
            if not merchant_code:
                # If not found, try treating it as a code anyway
                merchant_code = merchant
        
        if merchant_code:
            query = query.filter(Terminal.tpn.like(f"{merchant_code}%"))
    
    if last_online_before:
        try:
            before_dt = datetime.fromisoformat(last_online_before.replace('Z', '+00:00'))
            query = query.filter(
                or_(
                    last_online_subq.c.last_online_at < before_dt,
                    last_online_subq.c.last_online_at.is_(None)
                )
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format")
    
    results = query.all()
    
    terminals_data = []
    now = datetime.utcnow()
    
    # Helper to convert UTC datetime to Eastern ISO string
    def to_eastern_iso(dt):
        if dt:
            # Assume UTC if no timezone info
            if dt.tzinfo is None:
                dt = pytz.UTC.localize(dt)
            eastern_dt = dt.astimezone(TIMEZONE)
            return eastern_dt.isoformat()
        return None
    
    for terminal, latest_status, latest_checked_at, last_online_at in results:
        time_since_last_online = None
        if last_online_at:
            delta = now - last_online_at
            time_since_last_online = int(delta.total_seconds())
        
        # Calculate uptime percentage (all time)
        all_checks = db.query(StatusCheck).filter(StatusCheck.terminal_id == terminal.id).all()
        total_checks = len(all_checks)
        online_checks = sum(1 for c in all_checks if c.status == 'ONLINE')
        uptime_percentage = (online_checks / total_checks * 100) if total_checks > 0 else 0
        
        # Apply uptime filters
        if min_uptime is not None and uptime_percentage < min_uptime:
            continue
        if max_uptime is not None and uptime_percentage > max_uptime:
            continue
        
        terminals_data.append({
            "tpn": terminal.tpn,
            "latest_status": latest_status,
            "latest_checked_at": to_eastern_iso(latest_checked_at),
            "last_online_at": to_eastern_iso(last_online_at),
            "time_since_last_online_seconds": time_since_last_online,
            "uptime_percentage": round(uptime_percentage, 2),
            "total_checks": total_checks,
            "online_checks": online_checks
        })
    
    return {"terminals": terminals_data}


@app.get("/api/terminals/{tpn}")
async def get_terminal(tpn: str, db: Session = Depends(get_db)):
    """Get terminal info with latest status and last online time"""
    terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
    if not terminal:
        raise HTTPException(status_code=404, detail="Terminal not found")
    
    # Get latest check
    latest_check = db.query(StatusCheck).filter(
        StatusCheck.terminal_id == terminal.id
    ).order_by(desc(StatusCheck.checked_at)).first()
    
    # Get last online
    last_online_check = db.query(StatusCheck).filter(
        and_(
            StatusCheck.terminal_id == terminal.id,
            StatusCheck.status == 'ONLINE'
        )
    ).order_by(desc(StatusCheck.checked_at)).first()
    
    # Convert to Eastern time for display
    def to_eastern_iso(dt):
        if dt:
            eastern_dt = dt.replace(tzinfo=pytz.UTC).astimezone(TIMEZONE)
            return eastern_dt.isoformat()
        return None
    
    return {
        "tpn": terminal.tpn,
        "profile_id": terminal.profile_id,
        "created_at": to_eastern_iso(terminal.created_at) if terminal.created_at else None,
        "latest_status": latest_check.status if latest_check else None,
        "latest_checked_at": to_eastern_iso(latest_check.checked_at) if latest_check else None,
        "last_online_at": to_eastern_iso(last_online_check.checked_at) if last_online_check else None
    }


@app.get("/api/terminals/{tpn}/history")
async def get_terminal_history(
    tpn: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: Optional[int] = 100,
    db: Session = Depends(get_db)
):
    """Get status check history for a terminal"""
    terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
    if not terminal:
        raise HTTPException(status_code=404, detail="Terminal not found")
    
    query = db.query(StatusCheck).filter(StatusCheck.terminal_id == terminal.id)
    
    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            query = query.filter(StatusCheck.checked_at >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start datetime format")
    
    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
            query = query.filter(StatusCheck.checked_at <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end datetime format")
    
    checks = query.order_by(desc(StatusCheck.checked_at)).limit(limit).all()
    
    # Convert to Eastern time for display
    def to_eastern_iso(dt):
        if dt:
            # Assume UTC if no timezone info
            if dt.tzinfo is None:
                dt = pytz.UTC.localize(dt)
            eastern_dt = dt.astimezone(TIMEZONE)
            return eastern_dt.isoformat()
        return None
    
    return {
        "tpn": tpn,
        "checks": [
            {
                "checked_at": to_eastern_iso(check.checked_at) if check.checked_at else None,
                "status": check.status,
                "raw_response": check.raw_response,
                "error": check.error,
                "http_status": check.http_status,
                "latency_ms": check.latency_ms,
                "run_id": check.run_id
            }
            for check in checks
        ]
    }


@app.post("/api/run-check")
async def trigger_check(
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Manually trigger a check run (Admin only)"""
    global check_in_progress
    if check_in_progress:
        raise HTTPException(status_code=409, detail="Check already in progress")
    
    check_in_progress = True
    try:
        run_id = await run_check_all_terminals(db)
        return {"message": "Check run started", "run_id": run_id}
    except Exception as e:
        logger.error(f"Error in manual check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        check_in_progress = False


@app.post("/api/check-tpn/{tpn}")
async def check_single_tpn(tpn: str, db: Session = Depends(get_db)):
    """Check a single TPN manually"""
    from app.services.checker import check_single_terminal
    import httpx
    import asyncio
    
    # Check if terminal exists, if not create it
    terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
    if not terminal:
        terminal = Terminal(tpn=tpn)
        db.add(terminal)
        db.commit()
        db.refresh(terminal)
    
    # Run the check
    semaphore = asyncio.Semaphore(1)
    async with httpx.AsyncClient(timeout=30) as client:
        result = await check_single_terminal(client, tpn, semaphore)
    
    # Store result
    from datetime import datetime
    status_check = StatusCheck(
        terminal_id=terminal.id,
        checked_at=datetime.utcnow(),
        status=result["status"].value,
        raw_response=result["raw_response"],
        error=result["error"],
        http_status=result["http_status"],
        latency_ms=result["latency_ms"],
        run_id=f"manual-{datetime.utcnow().isoformat()}"
    )
    db.add(status_check)
    db.commit()
    
    # Convert to Eastern time
    def to_eastern_iso(dt):
        if dt:
            if dt.tzinfo is None:
                dt = pytz.UTC.localize(dt)
            eastern_dt = dt.astimezone(TIMEZONE)
            return eastern_dt.isoformat()
        return None
    
    return {
        "tpn": tpn,
        "status": result["status"].value,
        "checked_at": to_eastern_iso(status_check.checked_at),
        "raw_response": result["raw_response"],
        "error": result["error"],
        "http_status": result["http_status"],
        "latency_ms": result["latency_ms"]
    }


@app.post("/api/reload-tpns")
async def reload_tpns(
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Reload TPNs from STEAM SOAP API (Admin only)"""
    try:
        steam_config = CONFIG.get("steam_api", {})
        if not steam_config:
            raise HTTPException(
                status_code=500,
                detail="STEAM API configuration not found in config.json"
            )
        
        username = steam_config.get("username")
        password = steam_config.get("password")
        company_id = steam_config.get("company_id")
        soap_url = steam_config.get("soap_url", "https://dvmms.com/steam/api/ws/VDirectAccess.asmx")
        
        if not all([username, password, company_id]):
            raise HTTPException(
                status_code=500,
                detail="STEAM API credentials incomplete in config.json"
            )
        
        # Get UR account credentials if provided (optional)
        ur_account = steam_config.get("ur_account")
        
        from app.services.steam_tpn_loader import reload_tpns_from_steam
        
        # Get count before reload
        from app.services.tpn_loader import count_tpns_in_file
        tpns_before = count_tpns_in_file(TPN_FILE_PATH)
        
        results = await reload_tpns_from_steam(
            db=db,
            soap_url=soap_url,
            username=username,
            password=password,
            company_id=company_id,
            tpn_file_path=TPN_FILE_PATH,
            concurrency=10,
            ur_account=ur_account
        )
        
        # Get count after reload
        tpns_after = count_tpns_in_file(TPN_FILE_PATH)
        
        # Build detailed message
        account_info = "main account"
        if ur_account:
            account_info = "main account + UR account"
        
        message_parts = [
            f"Reloaded {results['total_tpns']} Steam Terminals from STEAM ({account_info})",
            f"Active terminals: {tpns_before} → {tpns_after} ({tpns_after - tpns_before:+d})",
            f"New terminals added: {results['new_tpns']}",
            f"Note: Terminals removed from STEAM are hidden from lists but historical data is preserved",
            f"Note: Terminal details (ProfileID, etc.) are fetched when viewing individual terminals"
        ]
        
        return {
            "message": "\n".join(message_parts),
            "details": {
                "total_tpns": results['total_tpns'],
                "new_tpns": results['new_tpns'],
                "updated_tpns": results['updated_tpns'],
                "profile_ids_fetched": results['profile_ids_fetched'],
                "steam_terminals_before": tpns_before,
                "steam_terminals_after": tpns_after
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error reloading TPNs from STEAM: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics")
async def get_analytics(
    merchant: Optional[str] = None,
    date_range: Optional[str] = Query(None, description="Date range: today, week, month, or custom"),
    start_date: Optional[str] = Query(None, description="Start date for custom range (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date for custom range (YYYY-MM-DD)"),
    user_merchant_codes: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    """
    Analytics endpoint:
    - Count of terminals offline/disconnect for ALL checks in date range
    - Count of terminals online for ALL checks in date range
    - Count of terminals that were online at least once in date range
    
    Optional merchant filter: filter by merchant code (first 4 chars of TPN)
    Optional date_range: today, week, month, or custom (requires start_date and end_date)
    """
    from app.services.merchant_loader import load_merchant_mapping, get_merchant_code_from_name
    
    # Get merchant code if filtering by merchant
    merchant_code = None
    if merchant:
        mapping = load_merchant_mapping()
        if merchant.isdigit() and len(merchant) == 4:
            merchant_code = merchant
        else:
            merchant_code = get_merchant_code_from_name(merchant, mapping) or merchant
    
    # Calculate date range
    now_utc = datetime.utcnow()
    now_eastern = datetime.now(TIMEZONE)
    range_end_utc = now_utc  # Default end time is now
    
    if date_range == "week":
        range_start = (now_eastern - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        range_start_utc = range_start.astimezone(pytz.UTC).replace(tzinfo=None)
    elif date_range == "month":
        range_start = (now_eastern - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        range_start_utc = range_start.astimezone(pytz.UTC).replace(tzinfo=None)
    elif date_range == "custom" and start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            range_start_eastern = TIMEZONE.localize(start_dt.replace(hour=0, minute=0, second=0, microsecond=0))
            range_end_eastern = TIMEZONE.localize(end_dt.replace(hour=23, minute=59, second=59, microsecond=999999))
            range_start_utc = range_start_eastern.astimezone(pytz.UTC).replace(tzinfo=None)
            range_end_utc = range_end_eastern.astimezone(pytz.UTC).replace(tzinfo=None)
        except ValueError:
            range_start_utc = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            range_end_utc = now_utc
    else:  # Default to today
        range_start = now_eastern.replace(hour=0, minute=0, second=0, microsecond=0)
        range_start_utc = range_start.astimezone(pytz.UTC).replace(tzinfo=None)
        range_end_utc = now_utc
    
    # Get all checks in date range
    query = db.query(StatusCheck).filter(
        StatusCheck.checked_at >= range_start_utc,
        StatusCheck.checked_at <= range_end_utc
    )
    range_checks = query.all()
    
    # Get total terminals for percentage calculation (only terminals in the file)
    from app.services.tpn_loader import count_tpns_in_file
    if not os.path.exists(TPN_FILE_PATH):
        total_terminals = 0
    else:
        # Read TPNs from file to ensure we only count terminals that exist
        with open(TPN_FILE_PATH, 'r', encoding='utf-8') as f:
            file_tpns = set()
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    file_tpns.add(line)
        
        total_terminals_query = db.query(Terminal).filter(Terminal.tpn.in_(file_tpns))
        if merchant_code:
            total_terminals_query = total_terminals_query.filter(Terminal.tpn.like(f"{merchant_code}%"))
        
        # Filter by user merchant access if provided (not admin)
        if user_merchant_codes is not None:
            # Build filter for user's merchant codes
            merchant_filters = [Terminal.tpn.like(f"{code}%") for code in user_merchant_codes]
            if merchant_filters:
                from sqlalchemy import or_
                total_terminals_query = total_terminals_query.filter(or_(*merchant_filters))
            else:
                # User has no merchant access, return 0
                total_terminals = 0
                return {
                    "always_offline_today_count": 0,
                    "always_offline_today": [],
                    "always_offline_percentage": 0,
                    "always_online_today_count": 0,
                    "always_online_today": [],
                    "always_online_percentage": 0,
                    "online_at_least_once_today_count": 0,
                    "online_at_least_once_today": [],
                    "online_at_least_once_percentage": 0,
                    "total_terminals": 0
                }
        
        total_terminals = total_terminals_query.count()
    
    # Get terminals that are in the file
    file_tpns = set()
    if os.path.exists(TPN_FILE_PATH):
        with open(TPN_FILE_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    file_tpns.add(line)
    
    # Group by terminal
    terminal_checks = {}
    for check in range_checks:
        if check.terminal_id not in terminal_checks:
            terminal_checks[check.terminal_id] = []
        terminal_checks[check.terminal_id].append(check)
    
    # Find terminals that were offline/disconnect for ALL checks today
    always_offline = []
    # Find terminals that were online for ALL checks today
    always_online = []
    # Find terminals that were online at least once today
    online_at_least_once = set()
    
    for terminal_id, checks in terminal_checks.items():
        if len(checks) > 0:  # At least one check in range
            terminal = db.query(Terminal).filter(Terminal.id == terminal_id).first()
            if not terminal:
                continue
            
            # Only include terminals that are in the file
            if terminal.tpn not in file_tpns:
                continue
            
            # Apply merchant filter
            if merchant_code:
                tpn_merchant_code = terminal.tpn[:4] if len(terminal.tpn) >= 4 else None
                if tpn_merchant_code != merchant_code:
                    continue
            
            # Apply user merchant access filter (if not admin)
            if user_merchant_codes is not None:
                tpn_merchant_code = terminal.tpn[:4] if len(terminal.tpn) >= 4 else None
                if tpn_merchant_code not in user_merchant_codes:
                    continue
                
            # Check if all checks are offline/disconnect/error
            all_offline = all(
                check.status in ['OFFLINE', 'DISCONNECT', 'ERROR']
                for check in checks
            )
            if all_offline:
                always_offline.append(terminal.tpn)
            
            # Check if all checks are online
            all_online = all(
                check.status == 'ONLINE'
                for check in checks
            )
            if all_online:
                always_online.append(terminal.tpn)
            
            # Check if online at least once
            if any(check.status == 'ONLINE' for check in checks):
                online_at_least_once.add(terminal.tpn)
    
    # Calculate percentages
    always_offline_pct = (len(always_offline) / total_terminals * 100) if total_terminals > 0 else 0
    always_online_pct = (len(always_online) / total_terminals * 100) if total_terminals > 0 else 0
    online_at_least_once_pct = (len(online_at_least_once) / total_terminals * 100) if total_terminals > 0 else 0
    
    return {
        "always_offline_today_count": len(always_offline),
        "always_offline_today": sorted(always_offline),
        "always_offline_percentage": round(always_offline_pct, 1),
        "always_online_today_count": len(always_online),
        "always_online_today": sorted(always_online),
        "always_online_percentage": round(always_online_pct, 1),
        "online_at_least_once_today_count": len(online_at_least_once),
        "online_at_least_once_today": sorted(list(online_at_least_once)),
        "online_at_least_once_percentage": round(online_at_least_once_pct, 1),
        "total_terminals": total_terminals
    }


@app.get("/api/next-check")
async def get_next_check():
    """Get the next scheduled check time"""
    next_time = get_next_check_time()
    if next_time:
        return {
            "next_check_time": next_time.isoformat(),
            "next_check_time_display": next_time.strftime('%Y-%m-%d %H:%M:%S %Z')
        }
    return {"next_check_time": None, "next_check_time_display": "Not scheduled"}


@app.get("/api/scheduler-status")
async def get_scheduler_status():
    """Get detailed scheduler status and job information"""
    jobs = scheduler.get_jobs()
    now_eastern = datetime.now(TIMEZONE)
    
    job_info = []
    for job in jobs:
        next_run = None
        if hasattr(job, 'next_run_time') and job.next_run_time:
            if job.next_run_time.tzinfo:
                next_run = job.next_run_time.astimezone(TIMEZONE)
            else:
                next_run = pytz.UTC.localize(job.next_run_time).astimezone(TIMEZONE)
        
        job_info.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": next_run.isoformat() if next_run else None,
            "next_run_display": next_run.strftime('%Y-%m-%d %H:%M:%S %Z') if next_run else None,
            "trigger": str(job.trigger) if hasattr(job, 'trigger') else None
        })
    
    return {
        "scheduler_running": scheduler.running,
        "current_time_eastern": now_eastern.strftime('%Y-%m-%d %H:%M:%S %Z'),
        "configured_check_times": CHECK_TIMES,
        "timezone": str(TIMEZONE),
        "jobs": job_info
    }


@app.get("/api/merchants")
async def get_merchants(db: Session = Depends(get_db)):
    """Get list of all merchants with company names - only merchants with active terminals in tpns.txt"""
    from app.services.merchant_loader import load_merchant_mapping
    
    # Get terminals that are in the file (active Steam terminals only)
    file_tpns = set()
    if os.path.exists(TPN_FILE_PATH):
        with open(TPN_FILE_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    file_tpns.add(line)
    
    # Only get merchant codes from terminals in the file
    merchant_codes = set()
    for tpn in file_tpns:
        if len(tpn) >= 4:
            merchant_codes.add(tpn[:4])
    
    # Load merchant mapping
    mapping = load_merchant_mapping()
    
    # Build list of merchants with company names
    merchants = []
    for code in sorted(merchant_codes):
        company_name = mapping.get(code, code)  # Use code as fallback if no mapping
        merchants.append({
            "code": code,
            "name": company_name,
            "display": f"{code} - {company_name}" if mapping.get(code) else code
        })
    
    # Sort by company name
    merchants.sort(key=lambda x: x["name"])
    
    return {"merchants": merchants}


@app.get("/api/merchants/{merchant}")
async def get_merchant_stats(
    merchant: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get statistics for a specific merchant (first 4 chars of TPN).
    Returns percentage online for today (default) or date range.
    """
    # Get all terminals for this merchant
    merchant_terminals = db.query(Terminal).filter(
        Terminal.tpn.like(f"{merchant}%")
    ).all()
    
    if not merchant_terminals:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    terminal_ids = [t.id for t in merchant_terminals]
    
    # Default to today if no date range provided
    if not start_date:
        # Get today in Eastern time, then convert to UTC
        now_eastern = datetime.now(TIMEZONE)
        today_start_eastern = now_eastern.replace(hour=0, minute=0, second=0, microsecond=0)
        start_date_dt = today_start_eastern.astimezone(pytz.UTC).replace(tzinfo=None)
        end_date_dt = datetime.utcnow()
    else:
        try:
            # Parse date string (format: YYYY-MM-DD from HTML date input)
            if 'T' in start_date or '+' in start_date or start_date.endswith('Z'):
                # Has time component
                start_date_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                if start_date_dt.tzinfo:
                    start_date_dt = start_date_dt.astimezone(pytz.UTC).replace(tzinfo=None)
            else:
                # Date only - treat as Eastern timezone, start of day
                date_parts = start_date.split('-')
                start_date_eastern = TIMEZONE.localize(datetime(int(date_parts[0]), int(date_parts[1]), int(date_parts[2]), 0, 0, 0))
                start_date_dt = start_date_eastern.astimezone(pytz.UTC).replace(tzinfo=None)
            
            if end_date:
                if 'T' in end_date or '+' in end_date or end_date.endswith('Z'):
                    # Has time component
                    end_date_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    if end_date_dt.tzinfo:
                        end_date_dt = end_date_dt.astimezone(pytz.UTC).replace(tzinfo=None)
                else:
                    # Date only - treat as Eastern timezone, end of day (23:59:59)
                    date_parts = end_date.split('-')
                    end_date_eastern = TIMEZONE.localize(datetime(int(date_parts[0]), int(date_parts[1]), int(date_parts[2]), 23, 59, 59))
                    end_date_dt = end_date_eastern.astimezone(pytz.UTC).replace(tzinfo=None)
            else:
                # No end date, use current UTC time
                end_date_dt = datetime.utcnow()
        except (ValueError, IndexError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    
    # Get checks for date range
    range_checks = db.query(StatusCheck).filter(
        and_(
            StatusCheck.checked_at >= start_date_dt,
            StatusCheck.checked_at <= end_date_dt,
            StatusCheck.terminal_id.in_(terminal_ids)
        )
    ).all()
    
    # Calculate statistics for date range
    total_checks = len(range_checks)
    online_count = sum(1 for c in range_checks if c.status == 'ONLINE')
    offline_count = sum(1 for c in range_checks if c.status == 'OFFLINE')
    disconnect_count = sum(1 for c in range_checks if c.status == 'DISCONNECT')
    error_count = sum(1 for c in range_checks if c.status == 'ERROR')
    unknown_count = sum(1 for c in range_checks if c.status == 'UNKNOWN')
    
    online_percentage = (online_count / total_checks * 100) if total_checks > 0 else 0
    
    # Get terminal statistics (all history)
    terminal_stats = []
    for terminal in merchant_terminals:
        all_checks = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).all()
        
        total_all = len(all_checks)
        online_all = sum(1 for c in all_checks if c.status == 'ONLINE')
        offline_all = sum(1 for c in all_checks if c.status == 'OFFLINE')
        online_pct_all = (online_all / total_all * 100) if total_all > 0 else 0
        
        # Get latest status
        latest_check = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).order_by(desc(StatusCheck.checked_at)).first()
        
        terminal_stats.append({
            "tpn": terminal.tpn,
            "latest_status": latest_check.status if latest_check else None,
            "total_checks": total_all,
            "online_count": online_all,
            "offline_count": offline_all,
            "online_percentage": round(online_pct_all, 2)
        })
    
    return {
        "merchant": merchant,
        "total_terminals": len(merchant_terminals),
        "range_stats": {
            "total_checks": total_checks,
            "online": online_count,
            "offline": offline_count,
            "disconnect": disconnect_count,
            "error": error_count,
            "unknown": unknown_count,
            "online_percentage": round(online_percentage, 2),
            "start_date": start_date_dt.isoformat() if start_date_dt else None,
            "end_date": end_date_dt.isoformat() if end_date_dt else None
        },
        "terminal_stats": terminal_stats
    }


# Authentication Routes

@app.post("/api/auth/register")
async def register(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """User registration - requires admin approval"""
    # Ensure password is properly decoded (FastAPI should handle this, but be safe)
    password = safe_decode_password(password)
    # Check if user exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user (inactive until approved)
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        is_active=False,  # Requires admin approval
        role=UserRole.USER
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Send email notifications
    from app.services.email_service import EmailService
    email_service = EmailService()
    
    # Notify admin
    admin_users = db.query(User).filter(User.is_admin == True, User.is_active == True).all()
    if admin_users:
        admin_emails = [admin.email for admin in admin_users]
        admin_subject = "New User Registration - Pending Approval"
        admin_body = f"""
        <html>
        <body>
            <h2>New User Registration</h2>
            <p>A new user has registered and is awaiting approval:</p>
            <ul>
                <li><strong>Email:</strong> {email}</li>
                <li><strong>Registered:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
            </ul>
            <p>Please log in to the admin panel to approve this user.</p>
        </body>
        </html>
        """
        await email_service.send_notification(admin_emails, admin_subject, admin_body)
    
    # Notify new user
    user_subject = "Registration Received - Awaiting Approval"
    user_body = f"""
    <html>
    <body>
        <h2>Registration Received</h2>
        <p>Thank you for registering with Terminal Status Monitor!</p>
        <p>Your account has been created and is pending admin approval. You will receive an email notification once your account has been approved.</p>
        <p>If you have any questions, please contact your administrator.</p>
    </body>
    </html>
    """
    await email_service.send_notification([email], user_subject, user_body)
    
    return {"message": "Registration successful. Awaiting admin approval."}


@app.post("/api/auth/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """User login API endpoint"""
    # Ensure password is properly decoded (FastAPI should handle this, but be safe)
    password = safe_decode_password(password)
    user = db.query(User).filter(User.email == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account pending approval")
    
    access_token_expires = timedelta(minutes=60 * 24)  # 24 hours
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "is_admin": user.is_admin,
            "role": user.role.value
        }
    }


@app.post("/login", response_class=HTMLResponse)
async def login_page_post(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Handle login form submission"""
    # Ensure password is properly decoded (FastAPI should handle this, but be safe)
    password = safe_decode_password(password)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Invalid credentials"
        })
    
    if not user.is_active:
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Account pending admin approval"
        })
    
    # Create token and store in session
    access_token_expires = timedelta(minutes=60 * 24)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    request.session["access_token"] = access_token
    request.session["user_email"] = user.email
    
    return RedirectResponse(url="/", status_code=303)


@app.get("/login", response_class=HTMLResponse)
async def login_page(
    request: Request,
    reset: Optional[str] = Query(None),
    error: Optional[str] = Query(None)
):
    """Login page"""
    context = {"request": request}
    if reset == "success":
        context["success"] = "Your password has been reset. You can now log in."
    if error == "invalid_or_expired":
        context["error"] = "Reset link is invalid or has expired. Please request a new one."
    if error == "missing_token":
        context["error"] = "Invalid reset link. Please request a new password reset."
    return templates.TemplateResponse("login.html", context)


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """Registration page"""
    return templates.TemplateResponse("register.html", {"request": request})


@app.post("/register", response_class=HTMLResponse)
async def register_page_post(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Handle registration form submission"""
    # Ensure password is properly decoded (FastAPI should handle this, but be safe)
    password = safe_decode_password(password)
    # Check if user exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return templates.TemplateResponse("register.html", {
            "request": request,
            "error": "Email already registered"
        })
    
    # Create new user (inactive until approved)
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        is_active=False,
        role=UserRole.USER
    )
    db.add(user)
    db.commit()
    
    # Send email notifications
    from app.services.email_service import EmailService
    email_service = EmailService()
    
    # Notify admin
    admin_users = db.query(User).filter(User.is_admin == True, User.is_active == True).all()
    if admin_users:
        admin_emails = [admin.email for admin in admin_users]
        admin_subject = "New User Registration - Pending Approval"
        admin_body = f"""
        <html>
        <body>
            <h2>New User Registration</h2>
            <p>A new user has registered and is awaiting approval:</p>
            <ul>
                <li><strong>Email:</strong> {email}</li>
                <li><strong>Registered:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
            </ul>
            <p>Please log in to the admin panel to approve this user.</p>
        </body>
        </html>
        """
        await email_service.send_notification(admin_emails, admin_subject, admin_body)
    
    # Notify new user
    user_subject = "Registration Received - Awaiting Approval"
    user_body = f"""
    <html>
    <body>
        <h2>Registration Received</h2>
        <p>Thank you for registering with Terminal Status Monitor!</p>
        <p>Your account has been created and is pending admin approval. You will receive an email notification once your account has been approved.</p>
        <p>If you have any questions, please contact your administrator.</p>
    </body>
    </html>
    """
    await email_service.send_notification([email], user_subject, user_body)
    
    return templates.TemplateResponse("register.html", {
        "request": request,
        "success": "Registration successful. Awaiting admin approval."
    })


@app.get("/logout")
async def logout(request: Request):
    """Logout user"""
    request.session.clear()
    return RedirectResponse(url="/login", status_code=303)


# ----- Forgot password (link-based reset) -----

@app.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    """Show form to request a password reset link."""
    return templates.TemplateResponse("forgot_password.html", {"request": request})


@app.post("/forgot-password", response_class=HTMLResponse)
async def forgot_password_post(
    request: Request,
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """Send password reset link if user exists. Always show same message (no email enumeration)."""
    from app.services.password_reset import create_reset_token
    from app.services.email_service import EmailService

    user = db.query(User).filter(User.email == email.strip()).first()
    if user and user.is_active:
        try:
            raw_token = create_reset_token(db, user)
            base_url = os.getenv("BASE_URL", "http://10.200.0.235:8091")
            reset_url = f"{base_url}/reset-password?token={raw_token}"
            email_service = EmailService()
            subject = "Reset your password - Terminal Status Monitor"
            body = f"""
            <html>
            <body>
                <h2>Reset your password</h2>
                <p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p>
                <p><a href="{reset_url}">Reset password</a></p>
                <p>If you did not request this, you can ignore this email.</p>
            </body>
            </html>
            """
            await email_service.send_notification([user.email], subject, body)
        except Exception as e:
            logger.warning(f"Failed to send password reset email: {e}", exc_info=True)

    return templates.TemplateResponse("forgot_password.html", {
        "request": request,
        "success": "If an account exists for that email, we've sent a link to reset your password. Please check your inbox."
    })


@app.get("/reset-password", response_class=HTMLResponse)
async def reset_password_page(
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Show form to set new password; token required and must be valid."""
    from app.services.password_reset import verify_reset_token

    if not token:
        return RedirectResponse(url="/login?error=missing_token", status_code=303)
    user = verify_reset_token(db, token)
    if not user:
        return RedirectResponse(url="/login?error=invalid_or_expired", status_code=303)
    return templates.TemplateResponse("reset_password.html", {"request": request, "token": token})


@app.post("/reset-password", response_class=HTMLResponse)
async def reset_password_post(
    request: Request,
    token: str = Form(...),
    new_password: str = Form(...),
    confirm_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Set new password using reset token; then invalidate token and redirect to login."""
    from app.services.password_reset import verify_reset_token, invalidate_reset_token

    new_password = safe_decode_password(new_password)
    confirm_password = safe_decode_password(confirm_password)

    if new_password != confirm_password:
        return templates.TemplateResponse("reset_password.html", {
            "request": request,
            "token": token,
            "error": "Passwords do not match."
        })
    if len(new_password) < 8:
        return templates.TemplateResponse("reset_password.html", {
            "request": request,
            "token": token,
            "error": "Password must be at least 8 characters."
        })

    user = verify_reset_token(db, token)
    if not user:
        return RedirectResponse(url="/login?error=invalid_or_expired", status_code=303)

    user.hashed_password = get_password_hash(new_password)
    db.commit()
    invalidate_reset_token(db, token)
    return RedirectResponse(url="/login?reset=success", status_code=303)


# ----- Change password (when logged in) -----

@app.get("/change-password", response_class=HTMLResponse)
async def change_password_page(
    request: Request,
    db: Session = Depends(get_db)
):
    """Show change-password form (requires login)."""
    current_user = await get_current_user_from_session(request, db)
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    return templates.TemplateResponse("change_password.html", {
        "request": request,
        "current_user": current_user
    })


@app.post("/change-password", response_class=HTMLResponse)
async def change_password_post(
    request: Request,
    current_password: str = Form(...),
    new_password: str = Form(...),
    confirm_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Update password when logged in; verify current password first."""
    current_user = await get_current_user_from_session(request, db)
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)

    current_password = safe_decode_password(current_password)
    new_password = safe_decode_password(new_password)
    confirm_password = safe_decode_password(confirm_password)

    if new_password != confirm_password:
        return templates.TemplateResponse("change_password.html", {
            "request": request,
            "current_user": current_user,
            "error": "New passwords do not match."
        })
    if len(new_password) < 8:
        return templates.TemplateResponse("change_password.html", {
            "request": request,
            "current_user": current_user,
            "error": "New password must be at least 8 characters."
        })
    if not verify_password(current_password, current_user.hashed_password):
        return templates.TemplateResponse("change_password.html", {
            "request": request,
            "current_user": current_user,
            "error": "Current password is incorrect."
        })

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    return RedirectResponse(url="/?password_changed=1", status_code=303)


@app.get("/api/auth/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information"""
    return {
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "role": current_user.role.value,
        "can_view_steam": current_user.can_view_steam
    }


@app.get("/api/admin/pending-users")
async def get_pending_users(
    request: Request,
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Get list of users pending approval"""
    pending = db.query(User).filter(User.is_active == False).all()
    return [{"id": u.id, "email": u.email, "created_at": u.created_at.isoformat()} for u in pending]


@app.post("/api/admin/approve-user/{user_id}")
async def approve_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Admin approves a user account"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = True
    user.approved_at = datetime.utcnow()
    user.approved_by = current_user.id
    db.commit()
    
    # Send approval email to user
    from app.services.email_service import EmailService
    email_service = EmailService()
    subject = "Account Approved - Terminal Status Monitor"
    base_url = os.getenv("BASE_URL", "http://10.200.0.235:8091")
    body = f"""
    <html>
    <body>
        <h2>Account Approved</h2>
        <p>Your account has been approved by an administrator!</p>
        <p>You can now log in to Terminal Status Monitor using your registered email and password.</p>
        <p><a href="{base_url}/login">Click here to log in</a></p>
        <p>If you have any questions, please contact your administrator.</p>
    </body>
    </html>
    """
    await email_service.send_notification([user.email], subject, body)
    
    return {"message": f"User {user.email} approved"}


@app.post("/api/admin/assign-merchants/{user_id}")
async def assign_merchants(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Admin assigns merchants to a user (accepts JSON array)"""
    try:
        merchant_codes = await request.json()
        if not isinstance(merchant_codes, list):
            raise HTTPException(status_code=400, detail="merchant_codes must be a list")
    except:
        merchant_codes = []
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove existing assignments
    db.query(UserMerchant).filter(UserMerchant.user_id == user_id).delete()
    
    # Add new assignments
    for code in merchant_codes:
        user_merchant = UserMerchant(user_id=user_id, merchant_code=code)
        db.add(user_merchant)
    
    db.commit()
    return {"message": f"Merchants assigned to {user.email}"}


@app.post("/api/admin/toggle-steam-access/{user_id}")
async def toggle_steam_access(
    user_id: int,
    request: Request,
    can_view: bool = Form(...),
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Admin toggles Steam/Denovo view access for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.can_view_steam = can_view
    db.commit()
    
    return {"message": f"Steam access {'enabled' if can_view else 'disabled'} for {user.email}"}


@app.get("/admin/users", response_class=HTMLResponse)
async def admin_users_page(
    request: Request,
    db: Session = Depends(get_db)
):
    """Admin user management page"""
    # Check authentication using session
    current_user = await get_current_user_from_session(request, db)
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all users
    all_users_db = db.query(User).all()
    
    # Get pending users
    pending_users = [u for u in all_users_db if not u.is_active]
    
    # Get merchants for assignment
    merchants_response = await get_merchants(db=db)
    merchants = merchants_response["merchants"]
    
    # Format user data for template
    all_users = []
    for user in all_users_db:
        merchant_access = db.query(UserMerchant).filter(UserMerchant.user_id == user.id).all()
        merchant_codes = [ma.merchant_code for ma in merchant_access]
        
        all_users.append({
            "id": user.id,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
            "can_view_steam": user.can_view_steam,
            "merchant_codes": merchant_codes,
            "created_at": user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else "N/A"
        })
    
    pending_users_formatted = [{
        "id": u.id,
        "email": u.email,
        "created_at": u.created_at.strftime('%Y-%m-%d %H:%M:%S') if u.created_at else "N/A"
    } for u in pending_users]
    
    return templates.TemplateResponse("admin_users.html", {
        "request": request,
        "current_user": current_user,
        "all_users": all_users,
        "pending_users": pending_users_formatted,
        "merchants": merchants
    })


@app.get("/api/admin/users")
async def get_all_users(
    request: Request,
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(User).all()
    result = []
    for user in users:
        merchant_access = db.query(UserMerchant).filter(UserMerchant.user_id == user.id).all()
        result.append({
            "id": user.id,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
            "can_view_steam": user.can_view_steam,
            "merchant_codes": [ma.merchant_code for ma in merchant_access],
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    return {"users": result}


@app.get("/api/admin/user/{user_id}")
async def get_user_details(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Get user details (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    merchant_access = db.query(UserMerchant).filter(UserMerchant.user_id == user.id).all()
    
    return {
        "id": user.id,
        "email": user.email,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "can_view_steam": user.can_view_steam,
        "merchant_codes": [ma.merchant_code for ma in merchant_access]
    }


@app.post("/api/admin/update-user/{user_id}")
async def update_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Update user details (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    data = await request.json()
    
    if "is_admin" in data:
        user.is_admin = data["is_admin"]
        if data["is_admin"]:
            user.role = UserRole.ADMIN
        else:
            user.role = UserRole.USER
    
    if "can_view_steam" in data:
        user.can_view_steam = data["can_view_steam"]
    
    db.commit()
    return {"message": f"User {user.email} updated"}


@app.post("/api/admin/delete-user/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin_session),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete admin users")
    
    # Delete merchant assignments
    db.query(UserMerchant).filter(UserMerchant.user_id == user_id).delete()
    
    # Delete user
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.email} deleted"}


# UI Routes

@app.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    merchant: Optional[str] = None,
    date_range: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    min_uptime: Optional[float] = Query(None),
    max_uptime: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """Main page: list all terminals"""
    # Check authentication
    current_user = await get_current_user_from_session(request, db)
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    # Get user's merchant access
    user_merchants = get_user_merchant_codes(current_user, db)
    
    # If user has merchant restrictions, filter merchants list
    # Get list of merchants for filter dropdown
    merchants_response = await get_merchants(db=db)
    merchants = merchants_response["merchants"]
    
    # Filter merchants based on user access
    if user_merchants is not None:  # Not admin, has restrictions
        merchants = [m for m in merchants if m.get("code") in user_merchants]
        # If merchant filter is set but not in user's allowed merchants, clear it
        if merchant and merchant not in user_merchants:
            merchant = None
    
    # Get terminals data (will be filtered by merchant if set)
    terminals_response = await get_terminals(
        merchant=merchant,
        min_uptime=min_uptime,
        max_uptime=max_uptime,
        db=db
    )
    terminals = terminals_response["terminals"]
    
    # Filter terminals by user merchant access if not admin
    if user_merchants is not None:
        filtered_terminals = []
        for term in terminals:
            tpn_merchant = term["tpn"][:4] if len(term["tpn"]) >= 4 else None
            if tpn_merchant in user_merchants:
                filtered_terminals.append(term)
        terminals = filtered_terminals
    
    # Get analytics (with merchant filter and date range if provided)
    # Pass user merchant codes to filter analytics by user access
    analytics = await get_analytics(
        merchant=merchant,
        date_range=date_range or "today",
        start_date=start_date,
        end_date=end_date,
        user_merchant_codes=user_merchants,
        db=db
    )
    
    # Calculate merchant counts for all three categories
    from app.services.merchant_loader import load_merchant_mapping
    mapping = load_merchant_mapping()
    
    always_offline_tpns = analytics.get("always_offline_today", [])
    always_online_tpns = analytics.get("always_online_today", [])
    online_at_least_once_tpns = analytics.get("online_at_least_once_today", [])
    
    # Helper function to calculate merchant counts
    def calculate_merchant_counts(tpns):
        counts = {}
        for tpn in tpns:
            tpn_merchant_code = tpn[:4] if len(tpn) >= 4 else None
            if tpn_merchant_code:
                merchant_name = mapping.get(tpn_merchant_code, tpn_merchant_code)
                merchant_display_name = f"{tpn_merchant_code} - {merchant_name}" if mapping.get(tpn_merchant_code) else tpn_merchant_code
                
                if tpn_merchant_code not in counts:
                    counts[tpn_merchant_code] = {
                        "code": tpn_merchant_code,
                        "name": merchant_name,
                        "display": merchant_display_name,
                        "count": 0
                    }
                counts[tpn_merchant_code]["count"] += 1
        return sorted(counts.values(), key=lambda x: x["count"], reverse=True)
    
    # Calculate merchant counts for each category
    always_offline_merchant_counts = calculate_merchant_counts(always_offline_tpns)
    always_online_merchant_counts = calculate_merchant_counts(always_online_tpns)
    online_at_least_once_merchant_counts = calculate_merchant_counts(online_at_least_once_tpns)
    
    # Count terminals in file (Steam Terminals - only active ones)
    from app.services.tpn_loader import count_tpns_in_file
    steam_terminals_count = count_tpns_in_file(TPN_FILE_PATH)
    
    # Build query string for terminal links
    query_params = []
    if merchant:
        query_params.append(f"merchant={merchant}")
    if date_range:
        query_params.append(f"date_range={date_range}")
    if start_date:
        query_params.append(f"start_date={start_date}")
    if end_date:
        query_params.append(f"end_date={end_date}")
    if min_uptime is not None:
        query_params.append(f"min_uptime={min_uptime}")
    if max_uptime is not None:
        query_params.append(f"max_uptime={max_uptime}")
    query_string = "?" + "&".join(query_params) if query_params else ""
    
    # Determine if user has only one merchant (for UI simplification)
    has_single_merchant = False
    single_merchant_code = None
    if user_merchants is not None and len(user_merchants) == 1:
        has_single_merchant = True
        single_merchant_code = user_merchants[0]
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "current_user": current_user,
        "terminals": terminals,
        "analytics": analytics,
        "merchants": merchants,
        "selected_merchant": merchant,
        "always_offline_merchant_counts": always_offline_merchant_counts,
        "always_online_merchant_counts": always_online_merchant_counts,
        "online_at_least_once_merchant_counts": online_at_least_once_merchant_counts,
        "always_offline_tpns": always_offline_tpns,
        "always_online_tpns": always_online_tpns,
        "online_at_least_once_tpns": online_at_least_once_tpns,
        "steam_terminals_count": steam_terminals_count,
        "query_string": query_string,
        "has_single_merchant": has_single_merchant,
        "single_merchant_code": single_merchant_code,
        "user_merchants": user_merchants
    })


@app.get("/terminal/{tpn}", response_class=HTMLResponse)
async def terminal_detail(
    tpn: str, 
    request: Request,
    merchant: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    min_uptime: Optional[float] = Query(None),
    max_uptime: Optional[float] = Query(None),
    from_merchant: Optional[str] = Query(None, description="Merchant code if coming from merchant view"),
    db: Session = Depends(get_db)
):
    """Terminal detail page"""
    # Check authentication
    current_user = await get_current_user_from_session(request, db)
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    # Check if user has access to this terminal's merchant
    user_merchants = get_user_merchant_codes(current_user, db)
    if user_merchants is not None:  # Not admin
        tpn_merchant = tpn[:4] if len(tpn) >= 4 else None
        if tpn_merchant not in user_merchants:
            raise HTTPException(status_code=403, detail="Access denied to this terminal")
    terminal_data = await get_terminal(tpn, db=db)
    history_data = await get_terminal_history(tpn, limit=1000, db=db)
    
    # Group history by date
    from collections import defaultdict
    today_start = datetime.now(TIMEZONE).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start.astimezone(pytz.UTC).replace(tzinfo=None)
    
    today_checks = []
    previous_days = defaultdict(list)
    
    for check in history_data["checks"]:
        # Parse the checked_at ISO string
        if check.get("checked_at"):
            try:
                checked_dt = datetime.fromisoformat(check["checked_at"].replace('Z', '+00:00'))
                if checked_dt.tzinfo:
                    checked_dt_utc = checked_dt.astimezone(pytz.UTC).replace(tzinfo=None)
                else:
                    checked_dt_utc = checked_dt
                
                # Check if it's today
                if checked_dt_utc >= today_start_utc:
                    today_checks.append(check)
                else:
                    # Group by date (YYYY-MM-DD)
                    date_key = checked_dt_utc.strftime('%Y-%m-%d')
                    previous_days[date_key].append(check)
            except (ValueError, AttributeError):
                # If parsing fails, treat as today
                today_checks.append(check)
        else:
            today_checks.append(check)
    
    # Process previous days - calculate stats for each day
    previous_days_processed = []
    for date_key in sorted(previous_days.keys(), reverse=True):
        day_checks = previous_days[date_key]
        total = len(day_checks)
        online_count = sum(1 for c in day_checks if c.get("status") == "ONLINE")
        online_percentage = (online_count / total * 100) if total > 0 else 0
        
        if online_count == total:
            day_status = "Online"
        elif online_count == 0:
            day_status = "Offline"
        else:
            day_status = f"{online_percentage:.1f}% Online"
        
        previous_days_processed.append({
            "date": date_key,
            "status": day_status,
            "checks": day_checks,
            "total": total,
            "online_count": online_count,
            "online_percentage": online_percentage
        })
    
    # Fetch TerminalInfo from STEAM
    steam_info = None
    steam_config = CONFIG.get("steam_api", {})
    if steam_config:
        username = steam_config.get("username")
        password = steam_config.get("password")
        soap_url = steam_config.get("soap_url", "https://dvmms.com/steam/api/ws/VDirectAccess.asmx")
        
        if username and password:
            from app.services.steam_soap import get_terminal_info
            try:
                steam_info = await get_terminal_info(soap_url, username, password, tpn)
                # Update terminal profile_id if we got it
                if steam_info and steam_info.get('ProfileID'):
                    terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
                    if terminal and terminal.profile_id != steam_info['ProfileID']:
                        terminal.profile_id = steam_info['ProfileID']
                        db.commit()
            except Exception as e:
                logger.warning(f"Failed to fetch TerminalInfo for {tpn}: {e}")
    
    # Build query string for back link
    # If coming from merchant view, go back to merchant view
    if from_merchant:
        # Build merchant view URL with date range if provided
        merchant_query_params = []
        if start_date:
            merchant_query_params.append(f"start_date={start_date}")
        if end_date:
            merchant_query_params.append(f"end_date={end_date}")
        merchant_query_string = "?" + "&".join(merchant_query_params) if merchant_query_params else ""
        back_url = f"/merchant/{from_merchant}{merchant_query_string}"
    else:
        # Otherwise, go back to main page with filters
        query_params = []
        if merchant:
            query_params.append(f"merchant={merchant}")
        if date_range:
            query_params.append(f"date_range={date_range}")
        if start_date:
            query_params.append(f"start_date={start_date}")
        if end_date:
            query_params.append(f"end_date={end_date}")
        if min_uptime is not None:
            query_params.append(f"min_uptime={min_uptime}")
        if max_uptime is not None:
            query_params.append(f"max_uptime={max_uptime}")
        back_url = "/" + ("?" + "&".join(query_params) if query_params else "")
    
    return templates.TemplateResponse("terminal_detail.html", {
        "request": request,
        "current_user": current_user,
        "terminal": terminal_data,
        "today_checks": today_checks,
        "previous_days": previous_days_processed,
        "steam_info": steam_info,
        "back_url": back_url
    })


@app.get("/api/terminal-counts")
async def get_terminal_counts(db: Session = Depends(get_db)):
    """Get terminal counts for display in header - only active Steam terminals"""
    from app.services.tpn_loader import count_tpns_in_file
    steam_terminals_count = count_tpns_in_file(TPN_FILE_PATH)
    return {
        "steam_terminals_count": steam_terminals_count
    }


@app.get("/merchant/{merchant}", response_class=HTMLResponse)
async def merchant_view(
    merchant: str,
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Merchant view page with statistics"""
    # Check authentication
    current_user = await get_current_user_from_session(request, db)
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    from app.services.merchant_loader import load_merchant_mapping, get_merchant_code_from_name
    
    # Get merchant code (merchant param might be code or name)
    mapping = load_merchant_mapping()
    merchant_code = None
    if merchant.isdigit() and len(merchant) == 4:
        merchant_code = merchant
    else:
        merchant_code = get_merchant_code_from_name(merchant, mapping) or merchant
    
    # Check if user has access to this merchant
    user_merchants = get_user_merchant_codes(current_user, db)
    if user_merchants is not None:  # Not admin
        if merchant_code not in user_merchants:
            raise HTTPException(status_code=403, detail="Access denied to this merchant")
    
    # Get company name
    company_name = mapping.get(merchant_code, merchant_code)
    merchant_display = f"{merchant_code} - {company_name}" if mapping.get(merchant_code) else merchant_code
    
    # Get today's stats (default)
    today_data = await get_merchant_stats(merchant_code, db=db)
    
    # Get date range stats if provided
    range_data = None
    if start_date:
        range_data = await get_merchant_stats(merchant_code, start_date=start_date, end_date=end_date, db=db)
    
    # Build query string for terminal links (preserve merchant filter)
    query_string = f"?merchant={merchant_code}" if merchant_code else ""
    
    return templates.TemplateResponse("merchant_view.html", {
        "request": request,
        "current_user": current_user,
        "merchant": merchant_code,
        "merchant_display": merchant_display,
        "company_name": company_name,
        "today_stats": today_data["range_stats"],
        "range_stats": range_data["range_stats"] if range_data else None,
        "terminal_stats": today_data["terminal_stats"],
        "total_terminals": today_data["total_terminals"],
        "start_date": start_date,
        "end_date": end_date,
        "query_string": query_string
    })


@app.get("/analytics/always-offline", response_class=HTMLResponse)
async def analytics_always_offline(
    request: Request,
    merchant: Optional[str] = None,
    min_total: Optional[str] = Query(None, description="Minimum total checks"),
    min_online: Optional[str] = Query(None, description="Minimum online count"),
    min_offline: Optional[str] = Query(None, description="Minimum offline count"),
    min_percentage: Optional[str] = Query(None, description="Minimum online percentage"),
    db: Session = Depends(get_db)
):
    """View terminals that are always offline today"""
    # Convert empty strings to None and parse numeric values
    min_total_int = int(min_total) if min_total and min_total.strip() else None
    min_online_int = int(min_online) if min_online and min_online.strip() else None
    min_offline_int = int(min_offline) if min_offline and min_offline.strip() else None
    min_percentage_float = float(min_percentage) if min_percentage and min_percentage.strip() else None
    
    # Use the converted values
    min_total = min_total_int
    min_online = min_online_int
    min_offline = min_offline_int
    min_percentage = min_percentage_float
    """View terminals that are always offline today"""
    from app.services.merchant_loader import load_merchant_mapping, get_merchant_code_from_name
    
    analytics_data = await get_analytics(db=db)
    terminals = analytics_data.get("always_offline_today", [])
    
    # Load merchant mapping
    mapping = load_merchant_mapping()
    
    # Get merchant code if filtering by merchant
    merchant_code = None
    merchant_display = None
    if merchant:
        if merchant.isdigit() and len(merchant) == 4:
            merchant_code = merchant
            company_name = mapping.get(merchant_code, merchant_code)
            merchant_display = f"{merchant_code} - {company_name}" if mapping.get(merchant_code) else merchant_code
        else:
            merchant_code = get_merchant_code_from_name(merchant, mapping)
            if merchant_code:
                company_name = mapping.get(merchant_code, merchant_code)
                merchant_display = f"{merchant_code} - {company_name}" if mapping.get(merchant_code) else merchant_code
    
    # Get list of merchants for filter dropdown
    merchants_response = await get_merchants(db=db)
    merchants = merchants_response["merchants"]
    
    # First, calculate merchant counts for ALL always-offline terminals (before filtering)
    merchant_counts = {}  # Track counts by merchant for ALL terminals
    
    for tpn in terminals:
        terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
        if not terminal:
            continue
        
        # Get merchant code (first 4 chars of TPN)
        tpn_merchant_code = tpn[:4] if len(tpn) >= 4 else None
        
        # Get merchant name
        merchant_name = mapping.get(tpn_merchant_code, tpn_merchant_code) if tpn_merchant_code else "Unknown"
        merchant_display_name = f"{tpn_merchant_code} - {merchant_name}" if tpn_merchant_code and mapping.get(tpn_merchant_code) else (tpn_merchant_code or "Unknown")
        
        # Track merchant counts for ALL terminals (not filtered)
        if tpn_merchant_code:
            if tpn_merchant_code not in merchant_counts:
                merchant_counts[tpn_merchant_code] = {
                    "code": tpn_merchant_code,
                    "name": merchant_name,
                    "display": merchant_display_name,
                    "count": 0
                }
            merchant_counts[tpn_merchant_code]["count"] += 1
    
    # Now get terminal statistics (all history) and apply filters
    terminals_data = []
    
    for tpn in terminals:
        terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
        if not terminal:
            continue
        
        # Get merchant code (first 4 chars of TPN)
        tpn_merchant_code = tpn[:4] if len(tpn) >= 4 else None
        
        # Apply merchant filter
        if merchant_code and tpn_merchant_code != merchant_code:
            continue
            
        all_checks = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).all()
        
        total_all = len(all_checks)
        online_all = sum(1 for c in all_checks if c.status == 'ONLINE')
        offline_all = sum(1 for c in all_checks if c.status == 'OFFLINE')
        online_pct_all = (online_all / total_all * 100) if total_all > 0 else 0
        
        # Get latest status
        latest_check = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).order_by(desc(StatusCheck.checked_at)).first()
        
        # Apply filters
        if min_total and total_all < min_total:
            continue
        if min_online and online_all < min_online:
            continue
        if min_offline and offline_all < min_offline:
            continue
        if min_percentage and online_pct_all < min_percentage:
            continue
        
        # Get merchant name
        merchant_name = mapping.get(tpn_merchant_code, tpn_merchant_code) if tpn_merchant_code else "Unknown"
        merchant_display_name = f"{tpn_merchant_code} - {merchant_name}" if tpn_merchant_code and mapping.get(tpn_merchant_code) else (tpn_merchant_code or "Unknown")
        
        # Track merchant counts
        if tpn_merchant_code:
            if tpn_merchant_code not in merchant_counts:
                merchant_counts[tpn_merchant_code] = {
                    "code": tpn_merchant_code,
                    "name": merchant_name,
                    "display": merchant_display_name,
                    "count": 0
                }
            merchant_counts[tpn_merchant_code]["count"] += 1
        
        terminals_data.append({
            "tpn": terminal.tpn,
            "merchant_code": tpn_merchant_code,
            "merchant_name": merchant_name,
            "merchant_display": merchant_display_name,
            "latest_status": latest_check.status if latest_check else None,
            "total_checks": total_all,
            "online_count": online_all,
            "offline_count": offline_all,
            "online_percentage": round(online_pct_all, 2)
        })
    
    # Get the base path for clear filters link
    base_path = "/analytics/always-offline"
    
    # Sort merchant counts by count (descending)
    merchant_counts_list = sorted(merchant_counts.values(), key=lambda x: x["count"], reverse=True)
    
    # Build query string for terminal links (preserve merchant filter)
    query_string = f"?merchant={merchant_code}" if merchant_code else ""
    
    return templates.TemplateResponse("analytics_list.html", {
        "request": request,
        "title": "Always Offline Today",
        "description": "Terminals that have been offline/disconnect/error for ALL checks today",
        "terminals": terminals_data,
        "count": len(terminals_data),
        "merchants": merchants,
        "selected_merchant": merchant,
        "merchant_display": merchant_display,
        "merchant_counts": merchant_counts_list,
        "min_total": min_total,
        "min_online": min_online,
        "min_offline": min_offline,
        "min_percentage": min_percentage,
        "base_path": base_path,
        "query_string": query_string
    })


@app.get("/analytics/always-online", response_class=HTMLResponse)
async def analytics_always_online(request: Request, db: Session = Depends(get_db)):
    """View terminals that are always online today"""
    analytics_data = await get_analytics(db=db)
    terminals = analytics_data.get("always_online_today", [])
    
    # Get terminal statistics (all history)
    terminals_data = []
    for tpn in terminals:
        terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
        if not terminal:
            continue
            
        all_checks = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).all()
        
        total_all = len(all_checks)
        online_all = sum(1 for c in all_checks if c.status == 'ONLINE')
        offline_all = sum(1 for c in all_checks if c.status == 'OFFLINE')
        online_pct_all = (online_all / total_all * 100) if total_all > 0 else 0
        
        # Get latest status
        latest_check = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).order_by(desc(StatusCheck.checked_at)).first()
        
        terminals_data.append({
            "tpn": terminal.tpn,
            "latest_status": latest_check.status if latest_check else None,
            "total_checks": total_all,
            "online_count": online_all,
            "offline_count": offline_all,
            "online_percentage": round(online_pct_all, 2)
        })
    
    return templates.TemplateResponse("analytics_list.html", {
        "request": request,
        "title": "Always Online Today",
        "description": "Terminals that have been online for ALL checks today",
        "terminals": terminals_data,
        "count": len(terminals_data),
        "base_path": "/analytics/always-online"
    })


@app.get("/analytics/online-once", response_class=HTMLResponse)
async def analytics_online_once(request: Request, db: Session = Depends(get_db)):
    """View terminals that were online at least once today"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get all checks today
    today_checks = db.query(StatusCheck).filter(
        StatusCheck.checked_at >= today_start
    ).all()
    
    # Find terminals that were online at least once today
    online_today = set()
    for check in today_checks:
        if check.status == 'ONLINE':
            terminal = db.query(Terminal).filter(Terminal.id == check.terminal_id).first()
            if terminal:
                online_today.add(terminal.tpn)
    
    # Get terminal statistics (all history)
    terminals_data = []
    for tpn in sorted(online_today):
        terminal = db.query(Terminal).filter(Terminal.tpn == tpn).first()
        if not terminal:
            continue
            
        all_checks = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).all()
        
        total_all = len(all_checks)
        online_all = sum(1 for c in all_checks if c.status == 'ONLINE')
        offline_all = sum(1 for c in all_checks if c.status == 'OFFLINE')
        online_pct_all = (online_all / total_all * 100) if total_all > 0 else 0
        
        # Get latest status
        latest_check = db.query(StatusCheck).filter(
            StatusCheck.terminal_id == terminal.id
        ).order_by(desc(StatusCheck.checked_at)).first()
        
        terminals_data.append({
            "tpn": terminal.tpn,
            "latest_status": latest_check.status if latest_check else None,
            "total_checks": total_all,
            "online_count": online_all,
            "offline_count": offline_all,
            "online_percentage": round(online_pct_all, 2)
        })
    
    return templates.TemplateResponse("analytics_list.html", {
        "request": request,
        "title": "Online At Least Once Today",
        "description": "Terminals that were online at least once today",
        "terminals": terminals_data,
        "count": len(terminals_data),
        "base_path": "/analytics/online-once"
    })
