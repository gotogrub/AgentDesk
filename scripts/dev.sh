#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8765}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-8765}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:${BACKEND_PORT}/api}"

if [ -x "$ROOT_DIR/backend/.venv/bin/uvicorn" ]; then
  UVICORN_BIN="$ROOT_DIR/backend/.venv/bin/uvicorn"
else
  UVICORN_BIN="uvicorn"
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

cd "$ROOT_DIR/backend"
"$UVICORN_BIN" app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT"
