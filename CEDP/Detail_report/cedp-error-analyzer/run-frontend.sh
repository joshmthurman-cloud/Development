#!/usr/bin/env bash
# Run frontend on Ubuntu server (port 3000). Set NEXT_PUBLIC_API_URL in frontend/.env first.
# From repo root: ./run-frontend.sh
set -e
cd "$(dirname "$0")/frontend"
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi
echo "Starting frontend at http://0.0.0.0:3000 (use http://10.200.0.235:3000 to open)"
exec npm run dev -- -H 0.0.0.0
