#!/bin/bash
# Terminal Status Monitor - Linux Startup Script

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set production environment variables
export RELOAD=false
export PORT=8091
export BASE_URL="http://10.200.0.235:8091"
export LOG_FILE="./status_monitor.log"
export LOG_LEVEL="INFO"

# Run the application
python3 run.py
