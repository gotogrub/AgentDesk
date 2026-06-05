from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_session_or_404
from app.config import settings
from app.db import get_db
from app.schemas import GitDiffResponse, GitStatusItem, GitStatusResponse
from app.services.event_service import event_service
from app.services.git_service import GitError, GitService, parse_status_short

router = APIRouter(prefix="/sessions/{session_id}/git", tags=["git"])
git_service = GitService()


@router.get("/status", response_model=GitStatusResponse)
def git_status(session_id: str, db: DbSession = Depends(get_db)) -> GitStatusResponse:
    session = get_session_or_404(db, session_id)
    worktree_path = _worktree_or_error(session.worktree_path)
    try:
        raw = git_service.status_short(worktree_path)
    except GitError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    event_service.add_event(
        db,
        "git_status_checked",
        session_id=session.id,
        project_id=session.project_id,
    )
    db.commit()
    return GitStatusResponse(raw=raw, files=parse_status_short(raw))


@router.get("/diff", response_model=GitDiffResponse)
def git_diff(session_id: str, db: DbSession = Depends(get_db)) -> GitDiffResponse:
    session = get_session_or_404(db, session_id)
    worktree_path = _worktree_or_error(session.worktree_path)
    try:
        raw = git_service.diff(worktree_path)
    except GitError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    truncated = len(raw) > settings.diff_limit_chars
    if truncated:
        raw = raw[: settings.diff_limit_chars] + "\n\n... diff truncated by AgentDesk ..."

    event_service.add_event(
        db,
        "diff_viewed",
        session_id=session.id,
        project_id=session.project_id,
        payload={"truncated": truncated},
    )
    db.commit()
    return GitDiffResponse(raw=raw, truncated=truncated)


@router.get("/files", response_model=list[GitStatusItem])
def git_files(session_id: str, db: DbSession = Depends(get_db)) -> list[GitStatusItem]:
    status_response = git_status(session_id, db)
    return status_response.files


def _worktree_or_error(worktree_path: str) -> Path:
    path = Path(worktree_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail="Worktree path does not exist")
    return path
