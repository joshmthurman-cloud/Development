from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum, Boolean, Float
from sqlalchemy.orm import relationship
from app.db import Base
import enum


class Status(enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    DISCONNECT = "DISCONNECT"
    ERROR = "ERROR"
    UNKNOWN = "UNKNOWN"


class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    USER = "USER"


class Terminal(Base):
    __tablename__ = "terminals"

    id = Column(Integer, primary_key=True, index=True)
    tpn = Column(String, unique=True, index=True, nullable=False)
    profile_id = Column(Integer, nullable=True, index=True)  # ProfileID from STEAM for STEAM URL
    created_at = Column(DateTime, default=datetime.utcnow)

    status_checks = relationship("StatusCheck", back_populates="terminal", order_by="desc(StatusCheck.checked_at)")


class StatusCheck(Base):
    __tablename__ = "status_checks"

    id = Column(Integer, primary_key=True, index=True)
    terminal_id = Column(Integer, ForeignKey("terminals.id"), nullable=False)
    checked_at = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String, nullable=False, index=True)  # Store as string: ONLINE/OFFLINE/DISCONNECT/ERROR/UNKNOWN
    raw_response = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    http_status = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    run_id = Column(String, nullable=True, index=True)

    terminal = relationship("Terminal", back_populates="status_checks")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)  # Admin approval required
    is_admin = Column(Boolean, default=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    can_view_steam = Column(Boolean, default=False)  # Permission to view Steam/Denovo buttons
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    approved_by_user = relationship("User", remote_side=[id])
    merchant_access = relationship("UserMerchant", back_populates="user", cascade="all, delete-orphan")
    email_notifications = relationship("EmailNotification", back_populates="user", cascade="all, delete-orphan")


class UserMerchant(Base):
    __tablename__ = "user_merchants"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    merchant_code = Column(String, primary_key=True)
    
    user = relationship("User", back_populates="merchant_access")


class EmailNotification(Base):
    __tablename__ = "email_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric_type = Column(String, nullable=False)  # e.g., "always_offline_threshold"
    threshold_value = Column(Float, nullable=True)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="email_notifications")


class PasswordResetToken(Base):
    """One-time tokens for password reset links. Token stored hashed; raw token only in email."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hex
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="password_reset_tokens")
