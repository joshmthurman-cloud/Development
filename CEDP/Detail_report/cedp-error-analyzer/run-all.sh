#!/usr/bin/env bash
# Start backend (8900) and frontend (8093); restart either if it exits. Ctrl+C stops both.
# Backend uses --reload so it restarts on file changes. From repo root: ./run-all.sh
set -e
cd "$(dirname "$0")"
SCRIPT_DIR="$PWD"
trap 'kill 0 2>/dev/null; exit 0' INT TERM EXIT

run_backend() {
  while true; do
    "$SCRIPT_DIR/run-backend.sh" || true
    sleep 2
  done
}

run_frontend() {
  while true; do
    "$SCRIPT_DIR/run-frontend.sh" || true
    sleep 2
  done
}

echo "Starting backend (port 8900) and frontend (port 8093). Users open http://10.200.0.235:8093"
echo "Press Ctrl+C to stop both. Backend reloads on file changes; frontend hot-reloads."
run_backend &
run_frontend &
wait
