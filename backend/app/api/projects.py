from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_project_or_404
from app.db import get_db
from app.models import Project
from app.schemas import ProjectCreate, ProjectRead
from app.services.event_service import event_service
from app.services.git_service import GitError, GitService
from app.services.terminal_service import terminal_service
from app.utils.paths import resolve_existing_path

router = APIRouter(prefix="/projects", tags=["projects"])
git_service = GitService()


@router.get("", response_model=list[ProjectRead])
def list_projects(db: DbSession = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.updated_at.desc())).all())


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: DbSession = Depends(get_db)) -> Project:
    repo_path = resolve_existing_path(payload.repo_path)
    if not repo_path.exists():
        raise HTTPException(status_code=400, detail="Repository path does not exist")
    if not repo_path.is_dir():
        raise HTTPException(status_code=400, detail="Repository path is not a directory")

    try:
        if not git_service.is_git_repo(repo_path):
            raise HTTPException(status_code=400, detail="Repository path is not a git repository")
        default_branch = git_service.current_branch(repo_path)
    except GitError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    existing = db.scalar(select(Project).where(Project.repo_path == str(repo_path)))
    if existing:
        raise HTTPException(status_code=409, detail="Project already exists in AgentDesk")

    project = Project(
        name=payload.name.strip(),
        repo_path=str(repo_path),
        default_branch=default_branch,
    )
    db.add(project)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Project already exists in AgentDesk") from exc

    event_service.add_event(
        db,
        "project_created",
        project_id=project.id,
        payload={"name": project.name, "repo_path": project.repo_path},
    )
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, db: DbSession = Depends(get_db)) -> Project:
    return get_project_or_404(db, project_id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: DbSession = Depends(get_db)) -> None:
    project = get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()


@router.post("/{project_id}/open-vscode")
def open_project_vscode(project_id: str, db: DbSession = Depends(get_db)) -> dict[str, bool]:
    project = get_project_or_404(db, project_id)
    repo_path = Path(project.repo_path)
    try:
        terminal_service.open_vscode(repo_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to open VS Code: {exc}") from exc

    event_service.add_event(
        db,
        "vscode_opened",
        project_id=project.id,
        payload={"path": str(repo_path)},
    )
    db.commit()
    return {"ok": True}
