#!/usr/bin/env python3
"""
Simple script to run the Terminal Status Monitor
"""
import uvicorn
import os

if __name__ == "__main__":
    # Use reload=True for development, but be aware that file changes during
    # scheduled checks will cause the check to be cancelled.
    # For production, set RELOAD=false environment variable or use:
    # uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
    reload = os.getenv("RELOAD", "true").lower() == "true"
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=reload,
        # Exclude database and log files from reload watching
        reload_excludes=["*.db", "*.log", "*.db-journal", "__pycache__/*"]
    )
