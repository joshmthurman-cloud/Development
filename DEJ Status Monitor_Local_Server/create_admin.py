"""
Script to create the first admin user
Usage: python create_admin.py
"""
import sys
import bcrypt
from app.db import SessionLocal
from app.models import User, UserRole

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly"""
    # Bcrypt has a 72 byte limit, truncate if necessary
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        print("Warning: Password truncated to 72 bytes (bcrypt limitation)")
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def create_admin():
    """Create admin user"""
    db = SessionLocal()
    
    try:
        email = input("Enter admin email address: ").strip()
        if not email:
            print("Email is required!")
            sys.exit(1)
        
        password = input("Enter admin password (min 8 characters): ").strip()
        if len(password) < 8:
            print("Password must be at least 8 characters!")
            sys.exit(1)
        
        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User with email {email} already exists!")
            response = input("Do you want to make this user an admin? (y/n): ").strip().lower()
            if response == 'y':
                existing.is_admin = True
                existing.is_active = True
                existing.role = UserRole.ADMIN
                existing.hashed_password = get_password_hash(password)
                db.commit()
                print(f"User {email} is now an admin!")
            else:
                print("Cancelled.")
            db.close()
            return
        
        # Create new admin user
        admin = User(
            email=email,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_admin=True,
            role=UserRole.ADMIN,
            can_view_steam=True
        )
        db.add(admin)
        db.commit()
        
        print(f"Admin user created successfully!")
        print(f"  Email: {email}")
        print(f"  Role: Admin")
        print(f"  Status: Active")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
