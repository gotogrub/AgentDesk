from __future__ import annotations

import re
from pathlib import Path

from app.config import settings
from app.utils.paths import is_relative_to

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".pdf"}


class AttachmentService:
    def safe_file_name(self, raw_name: str) -> str:
        base_name = Path(raw_name).name
        base_name = re.sub(r"[^A-Za-z0-9._ -]+", "-", base_name).strip(" .")
        return base_name or "attachment"

    def validate_extension(self, file_name: str) -> None:
        suffix = Path(file_name).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
            raise ValueError(f"Unsupported file type. Allowed extensions: {allowed}")

    def session_dir(self, session_id: str) -> Path:
        path = settings.attachments_dir / session_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def destination_for(self, session_id: str, file_name: str) -> Path:
        self.validate_extension(file_name)
        safe_name = self.safe_file_name(file_name)
        session_dir = self.session_dir(session_id)
        candidate = session_dir / safe_name
        if not candidate.exists():
            return candidate

        stem = candidate.stem
        suffix = candidate.suffix
        for index in range(2, 10_000):
            next_candidate = session_dir / f"{stem}-{index}{suffix}"
            if not next_candidate.exists():
                return next_candidate
        raise ValueError("Could not allocate a unique attachment file name")

    def assert_agentdesk_attachment(self, session_id: str, file_path: str) -> Path:
        path = Path(file_path).expanduser().resolve()
        root = self.session_dir(session_id).resolve()
        if not is_relative_to(path, root):
            raise ValueError("Attachment path is outside the AgentDesk attachment directory")
        return path


attachment_service = AttachmentService()
