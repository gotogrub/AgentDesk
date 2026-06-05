from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.models import Event


class EventService:
    def add_event(
        self,
        db: DbSession,
        event_type: str,
        *,
        session_id: str | None = None,
        project_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> Event:
        payload_json = json.dumps(payload, ensure_ascii=False) if payload is not None else None
        event = Event(
            session_id=session_id,
            project_id=project_id,
            event_type=event_type,
            payload_json=payload_json,
        )
        db.add(event)
        self._append_log(session_id, event_type, payload)
        return event

    def _append_log(
        self,
        session_id: str | None,
        event_type: str,
        payload: dict[str, Any] | None,
    ) -> None:
        if not session_id:
            return
        log_dir = settings.logs_dir / session_id
        log_dir.mkdir(parents=True, exist_ok=True)
        payload_json = json.dumps(payload or {}, ensure_ascii=False)
        log_path = log_dir / "events.log"
        with log_path.open("a", encoding="utf-8") as file:
            file.write(f"{event_type} {payload_json}\n")


event_service = EventService()
