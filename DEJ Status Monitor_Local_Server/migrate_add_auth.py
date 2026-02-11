"""
Migration script to add authentication tables
Run this after updating models.py with User, UserMerchant, and EmailNotification
"""
from app.db import engine, Base
from app.models import User, UserMerchant, EmailNotification, Terminal, StatusCheck

def migrate():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Authentication tables created successfully!")
    print("  - users")
    print("  - user_merchants")
    print("  - email_notifications")
    print("\nNext step: Run create_admin.py to create your first admin user")

if __name__ == "__main__":
    migrate()
