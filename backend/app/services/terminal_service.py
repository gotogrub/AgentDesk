from __future__ import annotations

import os
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path


class TerminalService:
    def command_path(self, name: str) -> str | None:
        return shutil.which(name)

    def open_codex_kitty(
        self,
        worktree_path: Path,
        *,
        session_id: str,
        prompt_path: Path,
        log_dir: Path,
        mode: str = "start",
        approval: str = "on-request",
    ) -> dict[str, str | int | None]:
        kitty_path = self.command_path("kitty")
        if not kitty_path:
            raise FileNotFoundError("kitty command not found")

        codex_path = self.command_path("codex")
        if not codex_path:
            subprocess.Popen(
                [kitty_path, "--working-directory", str(worktree_path)],
                start_new_session=True,
            )
            return {
                "warning": (
                    "codex command not found. Opened kitty in the worktree "
                    "without launching Codex."
                ),
                "log_path": None,
                "script_path": None,
                "pid": None,
            }

        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / "codex.log"
        script_path = log_dir / "launch_codex.sh"
        self._write_launcher_script(
            script_path=script_path,
            log_path=log_path,
            worktree_path=worktree_path,
            prompt_path=prompt_path,
            mode=mode,
            approval=approval,
        )

        process = subprocess.Popen(
            [kitty_path, "--working-directory", str(worktree_path), "bash", str(script_path)],
            start_new_session=True,
        )
        return {
            "warning": None,
            "log_path": str(log_path),
            "script_path": str(script_path),
            "pid": process.pid,
        }

    def open_vscode(self, worktree_path: Path) -> None:
        code_path = self.command_path("code")
        if not code_path:
            raise FileNotFoundError("code command not found")
        subprocess.Popen([code_path, str(worktree_path)], start_new_session=True)

    def _write_launcher_script(
        self,
        *,
        script_path: Path,
        log_path: Path,
        worktree_path: Path,
        prompt_path: Path,
        mode: str,
        approval: str,
    ) -> None:
        timestamp = datetime.now(UTC).isoformat()
        content = f"""#!/usr/bin/env bash
set -u

export WORKTREE={_shell_quote(str(worktree_path))}
export PROMPT_FILE={_shell_quote(str(prompt_path))}
export LOG_FILE={_shell_quote(str(log_path))}
export AGENTDESK_CODEX_MODE={_shell_quote(mode)}
export AGENTDESK_APPROVAL={_shell_quote(approval)}

mkdir -p "$(dirname "$LOG_FILE")"

{{
  echo ""
  echo "=== AgentDesk Codex launch {timestamp} ==="
  echo "Mode: $AGENTDESK_CODEX_MODE"
  echo "Approval: $AGENTDESK_APPROVAL"
  echo "Worktree: $WORKTREE"
  echo "Prompt: $PROMPT_FILE"
}} >> "$LOG_FILE"

cd "$WORKTREE" || exit 1

if [ "$AGENTDESK_CODEX_MODE" = "resume_last" ]; then
  CODEX_CMD='codex resume --last -C "$WORKTREE" -a "$AGENTDESK_APPROVAL" "$(cat "$PROMPT_FILE")"'
elif [ "$AGENTDESK_CODEX_MODE" = "resume_picker" ]; then
  CODEX_CMD='codex resume -C "$WORKTREE" -a "$AGENTDESK_APPROVAL"'
else
  CODEX_CMD='codex -C "$WORKTREE" -a "$AGENTDESK_APPROVAL" "$(cat "$PROMPT_FILE")"'
fi

echo "Command: $CODEX_CMD" >> "$LOG_FILE"

if command -v script >/dev/null 2>&1; then
  script -f -q -a "$LOG_FILE" -c "$CODEX_CMD"
  EXIT_CODE=$?
else
  bash -lc "$CODEX_CMD" 2>&1 | tee -a "$LOG_FILE"
  EXIT_CODE=${{PIPESTATUS[0]}}
fi

{{
  echo ""
  echo "=== AgentDesk Codex exited with code $EXIT_CODE $(date --iso-8601=seconds) ==="
}} >> "$LOG_FILE"

printf '\nCodex exited with code %s. Press Enter to close this window.' "$EXIT_CODE"
read -r _
exit "$EXIT_CODE"
"""
        script_path.write_text(content, encoding="utf-8")
        os.chmod(script_path, 0o755)


def _shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\\''") + "'"


terminal_service = TerminalService()
