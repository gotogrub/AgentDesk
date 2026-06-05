#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_NAME="agentdesk-linux-x64"
RELEASE_DIR="$ROOT_DIR/release"
BUILD_ROOT="$RELEASE_DIR/pyinstaller"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
ARCHIVE_PATH="$RELEASE_DIR/$PACKAGE_NAME.tar.gz"

cd "$ROOT_DIR/frontend"
VITE_API_BASE_URL=/api npm run build

cd "$ROOT_DIR"
backend/.venv/bin/python -m pip install -e "backend[build]"

rm -rf "$BUILD_ROOT" "$PACKAGE_DIR" "$ARCHIVE_PATH" "$ARCHIVE_PATH.sha256"
mkdir -p "$BUILD_ROOT" "$PACKAGE_DIR"

backend/.venv/bin/python -m PyInstaller \
  --name agentdesk \
  --onefile \
  --clean \
  --noconfirm \
  --paths "$ROOT_DIR/backend" \
  --distpath "$BUILD_ROOT/dist" \
  --workpath "$BUILD_ROOT/work" \
  --specpath "$BUILD_ROOT/spec" \
  --add-data "$ROOT_DIR/frontend/dist:frontend_dist" \
  --collect-submodules uvicorn \
  --collect-submodules fastapi \
  --collect-submodules starlette \
  --collect-submodules pydantic \
  --collect-submodules sqlalchemy \
  "$ROOT_DIR/backend/app/runner.py"

cp "$BUILD_ROOT/dist/agentdesk" "$PACKAGE_DIR/agentdesk"
chmod +x "$PACKAGE_DIR/agentdesk"

cat > "$PACKAGE_DIR/README.txt" <<'EOF'
AgentDesk Linux x64

Run:
  ./agentdesk

The app starts a local server at http://127.0.0.1:8765 and opens the browser.

Default task execution uses background codex exec. Kitty is only needed for
the manual terminal fallback buttons.

Runtime requirements:
  git
  codex
  kitty is optional
  code is optional

Data is stored in ~/.agentdesk by default.
Worktrees are created in ~/Workplace/_agent-worktrees by default.

Optional environment variables:
  AGENTDESK_HOME
  WORKTREE_HOME
  BACKEND_PORT
  AGENTDESK_NO_BROWSER=1
EOF

tar -C "$RELEASE_DIR" -czf "$ARCHIVE_PATH" "$PACKAGE_NAME"
sha256sum "$ARCHIVE_PATH" > "$ARCHIVE_PATH.sha256"

echo "$ARCHIVE_PATH"
echo "$ARCHIVE_PATH.sha256"
