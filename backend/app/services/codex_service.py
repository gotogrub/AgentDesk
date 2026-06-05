from __future__ import annotations

import os
import shutil
import signal
import subprocess
from datetime import UTC, datetime
from pathlib import Path


class CodexService:
    def run_background(
        self,
        *,
        worktree_path: Path,
        session_id: str,
        prompt_path: Path,
        log_dir: Path,
        mode: str,
        approval: str,
        sandbox: str,
    ) -> dict[str, int | str | None]:
        if self.is_running(log_dir):
            raise RuntimeError("Codex is already running for this task")
        if shutil.which("codex") is None:
            raise FileNotFoundError("codex command was not found in PATH")

        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / "codex.log"
        pid_path = log_dir / "codex.pid"
        exit_path = log_dir / "codex.exit"
        script_path = log_dir / "run_codex_background.sh"

        self._write_background_script(
            script_path=script_path,
            log_path=log_path,
            pid_path=pid_path,
            exit_path=exit_path,
            worktree_path=worktree_path,
            prompt_path=prompt_path,
            mode=mode,
            approval=approval,
            sandbox=sandbox,
        )

        with (log_dir / "background.out").open("ab") as output:
            process = subprocess.Popen(
                ["bash", str(script_path)],
                cwd=str(worktree_path),
                stdout=output,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                start_new_session=True,
            )

        return {
            "pid": process.pid,
            "log_path": str(log_path),
            "script_path": str(script_path),
        }

    def process_state(self, log_dir: Path) -> dict[str, int | str | bool | None]:
        pid_path = log_dir / "codex.pid"
        exit_path = log_dir / "codex.exit"
        log_path = log_dir / "codex.log"
        pid = _read_int(pid_path)
        exit_code = _read_int(exit_path)
        running = bool(pid and self._pid_running(pid) and exit_code is None)
        return {
            "running": running,
            "pid": pid,
            "exit_code": exit_code,
            "log_path": str(log_path),
            "exists": log_path.exists(),
        }

    def is_running(self, log_dir: Path) -> bool:
        return bool(self.process_state(log_dir)["running"])

    def stop(self, log_dir: Path) -> bool:
        state = self.process_state(log_dir)
        pid = state["pid"]
        if not isinstance(pid, int) or not state["running"]:
            return False

        try:
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            return False
        return True

    def _pid_running(self, pid: int) -> bool:
        proc_stat = Path("/proc") / str(pid) / "stat"
        if proc_stat.exists():
            parts = proc_stat.read_text(encoding="utf-8", errors="ignore").split()
            if len(parts) > 2 and parts[2] == "Z":
                return False
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        except PermissionError:
            return True
        return True

    def _write_background_script(
        self,
        *,
        script_path: Path,
        log_path: Path,
        pid_path: Path,
        exit_path: Path,
        worktree_path: Path,
        prompt_path: Path,
        mode: str,
        approval: str,
        sandbox: str,
    ) -> None:
        timestamp = datetime.now(UTC).isoformat()
        content = f"""#!/usr/bin/env bash
set -u

export WORKTREE={_shell_quote(str(worktree_path))}
export PROMPT_FILE={_shell_quote(str(prompt_path))}
export LOG_FILE={_shell_quote(str(log_path))}
export PID_FILE={_shell_quote(str(pid_path))}
export EXIT_FILE={_shell_quote(str(exit_path))}
export AGENTDESK_CODEX_MODE={_shell_quote(mode)}
export AGENTDESK_APPROVAL={_shell_quote(approval)}
export AGENTDESK_SANDBOX={_shell_quote(sandbox)}

mkdir -p "$(dirname "$LOG_FILE")"
rm -f "$EXIT_FILE"
echo "$$" > "$PID_FILE"

{{
  echo ""
  echo "=== AgentDesk background Codex run {timestamp} ==="
  echo "PID: $$"
  echo "Mode: $AGENTDESK_CODEX_MODE"
  echo "Approval: $AGENTDESK_APPROVAL"
  echo "Sandbox: $AGENTDESK_SANDBOX"
  echo "Worktree: $WORKTREE"
  echo "Prompt: $PROMPT_FILE"
}} >> "$LOG_FILE"

cd "$WORKTREE" || exit 1

if [ "$AGENTDESK_CODEX_MODE" = "resume_last" ]; then
  codex exec resume --last --json - < "$PROMPT_FILE" >> "$LOG_FILE" 2>&1
  EXIT_CODE=$?
else
  codex exec -C "$WORKTREE" \
    -a "$AGENTDESK_APPROVAL" \
    -s "$AGENTDESK_SANDBOX" \
    --json - < "$PROMPT_FILE" >> "$LOG_FILE" 2>&1
  EXIT_CODE=$?
fi

{{
  echo ""
  echo "=== AgentDesk background Codex exited with code $EXIT_CODE $(date --iso-8601=seconds) ==="
}} >> "$LOG_FILE"

echo "$EXIT_CODE" > "$EXIT_FILE"
exit "$EXIT_CODE"
"""
        script_path.write_text(content.replace("\n+", "\n"), encoding="utf-8")
        os.chmod(script_path, 0o755)


def _read_int(path: Path) -> int | None:
    if not path.exists():
        return None
    try:
        return int(path.read_text(encoding="utf-8").strip())
    except ValueError:
        return None


def _shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\\''") + "'"


codex_service = CodexService()
