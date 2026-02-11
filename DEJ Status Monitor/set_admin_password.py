"""
One-time script to create or update an admin user with a given password.
Usage: python set_admin_password.py [email] [password]
   or: set EMAIL=... PASSWORD=... and run with no args.
"""
import sys
import os
from app.db import SessionLocal
from app.models import User, UserRole
from app.auth import get_password_hash

def set_admin(email: str, password: str) -> None:
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.hashed_password = get_password_hash(password)
            user.is_active = True
            user.is_admin = True
            user.role = UserRole.ADMIN
            db.commit()
            print(f"Updated admin: {email}")
        else:
            user = User(
                email=email,
                hashed_password=get_password_hash(password),
                is_active=True,
                is_admin=True,
                role=UserRole.ADMIN,
                can_view_steam=True,
            )
            db.add(user)
            db.commit()
            print(f"Created admin: {email}")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    email = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("EMAIL", "")).strip()
    password = (sys.argv[2] if len(sys.argv) > 2 else os.environ.get("PASSWORD", "")).strip()
    if not email or not password:
        print("Usage: python set_admin_password.py <email> <password>")
        sys.exit(1)
    set_admin(email, password)
