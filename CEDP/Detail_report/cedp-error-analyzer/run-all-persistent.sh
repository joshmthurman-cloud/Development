#!/usr/bin/env bash
# Start backend + frontend in the background. Survives closing the terminal.
# One command; app keeps running. To stop: ./run-all-stop.sh
set -e
cd "$(dirname "$0")"

# Free ports so we can start clean (user's processes only; use sudo if needed)
for port in 8093 8900; do
  pids=$(lsof -t -i ":$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Stopping existing process(es) on port $port..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
done

LOG_FILE="${LOG_FILE:-run-all.log}"
PID_FILE="run-all.pid"

# Start run-all.sh in background with nohup so it survives terminal close
nohup ./run-all.sh >> "$LOG_FILE" 2>&1 &
pid=$!
echo $pid > "$PID_FILE"

echo "App started in background (survives closing this terminal)."
echo "  Users open: http://10.200.0.235:8093"
echo "  Logs:       $LOG_FILE (tail -f $LOG_FILE to watch)"
echo "  To stop:    ./run-all-stop.sh   (or: kill $pid)"
echo "  PID saved:  $PID_FILE"
