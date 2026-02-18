#!/usr/bin/env bash
set -e

SCHEMA_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCHEMA_ROOT/backend"

echo "Stopping Schema (frontend, backend, Docker)..."

pm2 stop schema-frontend schema-backend 2>/dev/null || true
pm2 delete schema-frontend schema-backend 2>/dev/null || true

echo "Stopping Docker containers..."
cd "$BACKEND_DIR"
docker compose down

echo "Schema stopped."
