#!/usr/bin/env bash
# Stop the app started with ./run-all-persistent.sh
set -e
cd "$(dirname "$0")"
PID_FILE="run-all.pid"
if [ ! -f "$PID_FILE" ]; then
  echo "No $PID_FILE found. App may not be running via run-all-persistent.sh."
  exit 0
fi
pid=$(cat "$PID_FILE")
if ! kill -0 "$pid" 2>/dev/null; then
  echo "Process $pid not running."
  rm -f "$PID_FILE"
  exit 0
fi
echo "Stopping app (PID $pid)..."
kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
rm -f "$PID_FILE"
echo "Stopped."
