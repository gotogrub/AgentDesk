from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    agentdesk_home: Path
    worktree_home: Path
    database_url: str
    backend_port: int
    max_upload_bytes: int = 25 * 1024 * 1024
    diff_limit_chars: int = 300_000

    @property
    def attachments_dir(self) -> Path:
        return self.agentdesk_home / "attachments"

    @property
    def prompts_dir(self) -> Path:
        return self.agentdesk_home / "prompts"

    @property
    def logs_dir(self) -> Path:
        return self.agentdesk_home / "logs"

    @property
    def summaries_dir(self) -> Path:
        return self.agentdesk_home / "summaries"


def _path_from_env(name: str, default: str) -> Path:
    return Path(os.environ.get(name, default)).expanduser().resolve()


def get_settings() -> Settings:
    agentdesk_home = _path_from_env("AGENTDESK_HOME", "~/.agentdesk")
    worktree_home = _path_from_env("WORKTREE_HOME", "~/Workplace/_agent-worktrees")
    backend_port = int(os.environ.get("BACKEND_PORT", "8765"))
    return Settings(
        agentdesk_home=agentdesk_home,
        worktree_home=worktree_home,
        database_url=f"sqlite:///{agentdesk_home / 'agentdesk.db'}",
        backend_port=backend_port,
    )


settings = get_settings()


def ensure_data_dirs() -> None:
    for path in (
        settings.agentdesk_home,
        settings.attachments_dir,
        settings.prompts_dir,
        settings.logs_dir,
        settings.summaries_dir,
        settings.worktree_home,
    ):
        path.mkdir(parents=True, exist_ok=True)
