from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session as DbSession

from app.models import Attachment, Project, Session


def get_project_or_404(db: DbSession, project_id: str) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_session_or_404(db: DbSession, session_id: str) -> Session:
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def get_attachment_or_404(db: DbSession, attachment_id: str) -> Attachment:
    attachment = db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return attachment
