#!/usr/bin/env python3
"""
Simple script to run the Terminal Status Monitor
"""
import uvicorn
import os

if __name__ == "__main__":
    # Production mode: reload=False for stability
    # For development, set RELOAD=true environment variable
    reload = os.getenv("RELOAD", "false").lower() == "true"
    port = int(os.getenv("PORT", "8091"))
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=reload,
        # Exclude database and log files from reload watching
        reload_excludes=["*.db", "*.log", "*.db-journal", "__pycache__/*"]
    )
