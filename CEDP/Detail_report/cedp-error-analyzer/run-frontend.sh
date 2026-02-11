#!/usr/bin/env bash
# Run frontend on Ubuntu server (port 8093 - user-facing). Set NEXT_PUBLIC_API_URL in frontend/.env first.
# From repo root: ./run-frontend.sh
set -e
cd "$(dirname "$0")/frontend"
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi
echo "Starting frontend at http://0.0.0.0:8093 (users open http://10.200.0.235:8093)"
exec npm run dev -- -H 0.0.0.0 -p 8093
