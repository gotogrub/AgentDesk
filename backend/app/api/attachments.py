from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_attachment_or_404, get_session_or_404
from app.config import settings
from app.db import get_db
from app.models import Attachment
from app.schemas import AttachmentRead
from app.services.attachment_service import attachment_service
from app.services.event_service import event_service
from app.services.prompt_service import prompt_service

router = APIRouter(tags=["attachments"])


@router.post(
    "/sessions/{session_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    session_id: str,
    file: UploadFile = File(...),
    db: DbSession = Depends(get_db),
) -> Attachment:
    session = get_session_or_404(db, session_id)
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no name")

    try:
        destination = attachment_service.destination_for(session.id, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    bytes_written = 0
    try:
        with destination.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.max_upload_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail="File too large. Maximum size is 25 MB",
                    )
                output.write(chunk)
    except HTTPException:
        if destination.exists():
            destination.unlink()
        raise
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save attachment: {exc}") from exc

    attachment = Attachment(
        session_id=session.id,
        file_name=destination.name,
        file_path=str(destination),
        mime_type=file.content_type,
    )
    db.add(attachment)
    db.flush()
    prompt_service.regenerate(db, session)
    event_service.add_event(
        db,
        "attachment_added",
        session_id=session.id,
        project_id=session.project_id,
        payload={"file_path": str(destination), "mime_type": file.content_type},
    )
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/sessions/{session_id}/attachments", response_model=list[AttachmentRead])
def list_attachments(session_id: str, db: DbSession = Depends(get_db)) -> list[Attachment]:
    get_session_or_404(db, session_id)
    return list(
        db.scalars(
            select(Attachment)
            .where(Attachment.session_id == session_id)
            .order_by(Attachment.created_at.asc())
        ).all()
    )


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(attachment_id: str, db: DbSession = Depends(get_db)) -> None:
    attachment = get_attachment_or_404(db, attachment_id)
    session = attachment.session
    try:
        path = attachment_service.assert_agentdesk_attachment(session.id, attachment.file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if path.exists():
        try:
            path.unlink()
        except OSError as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete attachment file: {exc}",
            ) from exc

    event_service.add_event(
        db,
        "attachment_deleted",
        session_id=session.id,
        project_id=session.project_id,
        payload={"file_path": attachment.file_path},
    )
    db.delete(attachment)
    db.flush()
    prompt_service.regenerate(db, session)
    db.commit()
