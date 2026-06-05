from __future__ import annotations

import sys
from pathlib import Path


def static_dist_dir() -> Path | None:
    bundle_root = Path(getattr(sys, "_MEIPASS", "") or ".")
    candidates = [
        bundle_root / "frontend_dist",
        Path(__file__).resolve().parents[2] / "frontend" / "dist",
    ]

    for candidate in candidates:
        index_file = candidate / "index.html"
        if index_file.exists():
            return candidate

    return None
