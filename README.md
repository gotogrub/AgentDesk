# AgentDesk

AgentDesk is a local web command center for running several Codex CLI tasks in parallel on Ubuntu.

One task maps to one git branch, one git worktree, and one Codex CLI session opened in a separate kitty window. The MVP does not embed a browser terminal.

## Requirements

- Ubuntu 24.04
- Python 3.12+
- Node.js 20+
- git
- kitty
- Codex CLI available as `codex`
- VS Code CLI `code` is optional

## Install

```bash
cp .env.example .env
./scripts/install.sh
```

Defaults:

- API: `http://localhost:8765/api`
- Frontend: `http://localhost:5173`
- Data: `~/.agentdesk/`
- Worktrees: `~/Workplace/_agent-worktrees/`

## Run

```bash
./scripts/dev.sh
```

Open `http://localhost:5173`.

## Workflow

1. Add an existing git repository on the dashboard.
2. Open the project and create a new agent task.
3. AgentDesk checks that the original repository is clean.
4. AgentDesk creates `agent/<task-slug>` and a worktree under `WORKTREE_HOME`.
5. AgentDesk creates `~/.agentdesk/prompts/<session_id>/prompt.md`.
6. Attach screenshots or files on the session page.
7. Attachment files are stored under `~/.agentdesk/attachments/<session_id>/`.
8. Attachment absolute paths are inserted into `prompt.md`.
9. Click `Kitty` to open `kitty --working-directory <worktree> codex`.
10. Review git status and diff on the session page.
11. Mark the task as `review`, `done`, `failed`, or `archived`.
12. Remove the worktree only when you are done with it.

## Linux Release Build

Build a self-contained Linux x64 archive:

```bash
./scripts/build-linux.sh
```

The script builds the frontend with `VITE_API_BASE_URL=/api`, bundles the FastAPI backend and static frontend with PyInstaller, and writes:

- `release/agentdesk-linux-x64.tar.gz`
- `release/agentdesk-linux-x64.tar.gz.sha256`

Run the packaged app:

```bash
tar -xzf release/agentdesk-linux-x64.tar.gz -C /tmp
/tmp/agentdesk-linux-x64/agentdesk
```

The executable starts the local server at `http://127.0.0.1:8765` and opens the browser automatically.
Set `AGENTDESK_NO_BROWSER=1` if you want to start only the server.

## Backend

Run only the API:

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8765 --reload
```

Core endpoints:

- `GET /api/health`
- `GET /api/system/check`
- `GET /api/projects`
- `POST /api/projects`
- `POST /api/projects/{project_id}/sessions`
- `GET /api/sessions/{session_id}`
- `POST /api/sessions/{session_id}/open-kitty`
- `GET /api/sessions/{session_id}/git/status`
- `GET /api/sessions/{session_id}/git/diff`

## Safety

- AgentDesk is local-only and does not implement auth in the MVP.
- It does not read `~/.codex/auth.json`.
- It does not send uploaded files anywhere.
- It only runs predefined commands: git status/diff/worktree, kitty, code.
- Worktree removal is restricted to `WORKTREE_HOME`.
- Project deletion removes the AgentDesk record only, not the repository on disk.

## MVP Limits

- No embedded web terminal.
- No Docker, Postgres, Redis, Celery, Electron, or Tauri.
- No automatic merge.
- No branch deletion after worktree removal.
- No multi-user mode.
