#!/usr/bin/env bash
set -e

SCHEMA_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCHEMA_ROOT/backend"
FRONTEND_DIR="$SCHEMA_ROOT/frontend/app"
BACKEND_PORT=8901
FRONTEND_PORT=8095
HEALTH_URL="http://127.0.0.1:$BACKEND_PORT/api/v1/health"
HEALTH_TIMEOUT=90
HEALTH_INTERVAL=3

echo "Schema startup: root=$SCHEMA_ROOT"

# --- Step 1: Docker ---
echo "[1/4] Starting Docker containers..."
cd "$BACKEND_DIR"
docker compose up -d
echo "      Waiting 5s for Postgres/Redis/MinIO to begin startup..."
sleep 5

# --- Step 2: Backend (detached via PM2) ---
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "Error: $BACKEND_DIR/.env not found. Copy from .env.example and configure." >&2
  exit 1
fi

echo "[2/4] Starting backend (NestJS) on port $BACKEND_PORT..."
pm2 delete schema-backend 2>/dev/null || true
cd "$BACKEND_DIR"
pm2 start npm --name schema-backend -- run start:prod

# --- Step 3: Wait for backend health ---
echo "[3/4] Waiting for backend health at $HEALTH_URL (timeout ${HEALTH_TIMEOUT}s)..."
elapsed=0
while [[ $elapsed -lt $HEALTH_TIMEOUT ]]; do
  if body="$(curl -sf "$HEALTH_URL" 2>/dev/null)" && echo "$body" | grep -q '"status":"healthy"'; then
    echo "      Backend is healthy."
    break
  fi
  sleep $HEALTH_INTERVAL
  elapsed=$((elapsed + HEALTH_INTERVAL))
  echo "      ... ${elapsed}s"
done
if [[ $elapsed -ge $HEALTH_TIMEOUT ]]; then
  echo "Error: Backend health check timed out. Check backend logs: pm2 logs schema-backend" >&2
  exit 1
fi

# --- Step 4: Frontend (build if needed, then detached via PM2) ---
echo "[4/4] Starting frontend (Next.js) on port $FRONTEND_PORT..."
if [[ ! -f "$FRONTEND_DIR/.next/BUILD_ID" ]]; then
  echo "      No production build found; running npm ci and npm run build..."
  (cd "$FRONTEND_DIR" && npm ci && npm run build)
fi
pm2 delete schema-frontend 2>/dev/null || true
# Run next binary directly so cwd is correct and .next is found (pm2 + npm can lose cwd)
NEXT_BIN="$FRONTEND_DIR/node_modules/.bin/next"
if [[ ! -f "$NEXT_BIN" ]]; then
  echo "Error: Next.js not found at $NEXT_BIN. Run: cd $FRONTEND_DIR && npm ci" >&2
  exit 1
fi
pm2 start "$NEXT_BIN" --name schema-frontend --cwd "$FRONTEND_DIR" -- start -p "$FRONTEND_PORT"

# --- Show URLs (use server IP for access from other machines) ---
PUBLIC_HOST="${SCHEMA_PUBLIC_HOST:-}"
if [[ -z "$PUBLIC_HOST" ]]; then
  PUBLIC_HOST="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
if [[ -z "$PUBLIC_HOST" ]]; then
  PUBLIC_HOST="127.0.0.1"
fi

echo ""
echo "Schema is up."
echo "  Backend:  http://$PUBLIC_HOST:$BACKEND_PORT/api/v1 (health: http://$PUBLIC_HOST:$BACKEND_PORT/api/v1/health)"
echo "  Frontend: http://$PUBLIC_HOST:$FRONTEND_PORT"
echo "  PM2: pm2 status | pm2 logs schema-backend | pm2 logs schema-frontend"
