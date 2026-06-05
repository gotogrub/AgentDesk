from __future__ import annotations

from pathlib import Path


def resolve_existing_path(raw_path: str) -> Path:
    return Path(raw_path).expanduser().resolve()


def is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False
