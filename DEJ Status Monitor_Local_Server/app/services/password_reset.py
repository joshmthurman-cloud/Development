"""
Password reset token creation and verification.
Uses hashed tokens (SHA-256) so the DB never stores the raw link token.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models import User, PasswordResetToken


# Reset link valid for 1 hour
RESET_TOKEN_EXPIRE_HOURS = 1


def _hash_token(raw_token: str) -> str:
    """Return SHA-256 hex digest of the raw token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_reset_token(db: Session, user: User) -> str:
    """
    Create a one-time reset token for the user.
    Returns the raw token to put in the email link; stores only the hash in DB.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()
    return raw_token


def verify_reset_token(db: Session, raw_token: str) -> Optional[User]:
    """
    Verify a raw token from the link. Returns the User if valid and not expired/used, else None.
    """
    if not raw_token or len(raw_token) < 16:
        return None
    token_hash = _hash_token(raw_token)
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not record:
        return None
    return db.query(User).filter(User.id == record.user_id).first()


def invalidate_reset_token(db: Session, raw_token: str) -> bool:
    """Mark the token as used so it cannot be reused. Returns True if token was found and invalidated."""
    if not raw_token:
        return False
    token_hash = _hash_token(raw_token)
    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )
    if not record:
        return False
    record.used_at = datetime.utcnow()
    db.commit()
    return True
