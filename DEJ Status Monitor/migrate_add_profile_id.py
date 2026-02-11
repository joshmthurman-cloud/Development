#!/usr/bin/env python3
"""
Database migration script to add profile_id column to terminals table.
Run this once after updating the code to add ProfileID support.
"""
import sqlite3
import os
import sys

DB_PATH = os.getenv("DB_PATH", "status_monitor.db")

def migrate():
    """Add profile_id column to terminals table if it doesn't exist"""
    if not os.path.exists(DB_PATH):
        print(f"Database file {DB_PATH} not found. Creating new database...")
        print("Note: New databases will have the profile_id column automatically.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(terminals)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'profile_id' in columns:
            print("profile_id column already exists. Migration not needed.")
            return
        
        # Add the column
        print("Adding profile_id column to terminals table...")
        cursor.execute("ALTER TABLE terminals ADD COLUMN profile_id INTEGER")
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
