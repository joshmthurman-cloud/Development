#!/usr/bin/env bash
# Run backend on Ubuntu server: port 8900 (reload on file change)
# From repo root: ./run-backend.sh
set -e
cd "$(dirname "$0")"
if [ ! -f ".venv/bin/activate" ]; then
  echo "Creating venv..."
  if ! python3 -m venv .venv; then
    echo "Failed to create .venv. On Ubuntu, install: sudo apt install python3-venv python3-pip"
    exit 1
  fi
fi
source .venv/bin/activate
pip install -q -r backend/requirements.txt
echo "Starting backend at http://10.200.0.235:8900 (reload on file change)"
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8900 --reload
