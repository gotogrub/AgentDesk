from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


class TerminalService:
    def command_path(self, name: str) -> str | None:
        return shutil.which(name)

    def open_kitty(self, worktree_path: Path) -> str | None:
        kitty_path = self.command_path("kitty")
        if not kitty_path:
            raise FileNotFoundError("kitty command not found")

        codex_path = self.command_path("codex")
        if codex_path:
            subprocess.Popen(
                [kitty_path, "--working-directory", str(worktree_path), codex_path],
                start_new_session=True,
            )
            return None

        subprocess.Popen(
            [kitty_path, "--working-directory", str(worktree_path)],
            start_new_session=True,
        )
        return "codex command not found. Opened kitty in the worktree without launching Codex."

    def open_vscode(self, worktree_path: Path) -> None:
        code_path = self.command_path("code")
        if not code_path:
            raise FileNotFoundError("code command not found")
        subprocess.Popen([code_path, str(worktree_path)], start_new_session=True)


terminal_service = TerminalService()
