#!/usr/bin/env bash
# Run backend on Ubuntu server: 10.200.0.235:8093
# From repo root: ./run-backend.sh
set -e
cd "$(dirname "$0")"
if [ ! -d ".venv" ]; then
  echo "Creating venv..."
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r backend/requirements.txt
echo "Starting backend at http://10.200.0.235:8093 (and http://0.0.0.0:8093)"
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8093
