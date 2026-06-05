from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_project_or_404, get_session_or_404
from app.config import settings
from app.db import get_db
from app.models import Project, Session
from app.schemas import (
    BackgroundRunResponse,
    CodexApprovalPolicy,
    CodexBackgroundMode,
    CodexLaunchMode,
    CodexSandboxMode,
    OpenKittyResponse,
    SessionCreate,
    SessionDetail,
    SessionLogResponse,
    SessionPatch,
    SessionProcessResponse,
    SessionRead,
)
from app.services.codex_service import codex_service
from app.services.event_service import event_service
from app.services.git_service import GitError, GitService
from app.services.prompt_service import prompt_service
from app.services.terminal_service import terminal_service
from app.utils.paths import is_relative_to
from app.utils.slug import slugify

router = APIRouter(tags=["sessions"])
git_service = GitService()


@router.get("/projects/{project_id}/sessions", response_model=list[SessionRead])
def list_project_sessions(project_id: str, db: DbSession = Depends(get_db)) -> list[Session]:
    get_project_or_404(db, project_id)
    sessions = list(
        db.scalars(
            select(Session)
            .where(Session.project_id == project_id)
            .order_by(Session.updated_at.desc())
        ).all()
    )
    changed = False
    for session in sessions:
        changed = _sync_background_state(db, session) or changed
    if changed:
        db.commit()
    return sessions


@router.post(
    "/projects/{project_id}/sessions",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    project_id: str,
    payload: SessionCreate,
    db: DbSession = Depends(get_db),
) -> Session:
    project = get_project_or_404(db, project_id)
    repo_path = Path(project.repo_path)

    if not repo_path.exists():
        raise HTTPException(status_code=400, detail="Project repository path is missing")

    try:
        if not git_service.is_git_repo(repo_path):
            raise HTTPException(status_code=400, detail="Project path is not a git repository")
        if not git_service.is_clean(repo_path):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Repository has uncommitted changes. Commit or stash them before "
                    "creating an agent task."
                ),
            )
    except GitError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    settings.worktree_home.mkdir(parents=True, exist_ok=True)
    slug, branch_name, worktree_path = _allocate_session_paths(project, payload.title, repo_path)

    try:
        git_service.create_worktree(repo_path, worktree_path, branch_name)
    except GitError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to create git worktree: {exc}",
        ) from exc

    session = Session(
        project_id=project.id,
        title=payload.title.strip(),
        slug=slug,
        description=payload.description,
        status="draft",
        branch_name=branch_name,
        worktree_path=str(worktree_path),
    )
    db.add(session)
    db.flush()
    prompt_service.regenerate(db, session, project)
    event_service.add_event(
        db,
        "session_created",
        session_id=session.id,
        project_id=project.id,
        payload={
            "title": session.title,
            "branch_name": branch_name,
            "worktree_path": str(worktree_path),
        },
    )
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: str, db: DbSession = Depends(get_db)) -> SessionDetail:
    session = get_session_or_404(db, session_id)
    if _sync_background_state(db, session):
        db.commit()
        db.refresh(session)
    detail = SessionDetail.model_validate(session)
    detail.prompt_content = prompt_service.read_prompt(session)
    return detail


@router.patch("/sessions/{session_id}", response_model=SessionDetail)
def update_session(
    session_id: str,
    payload: SessionPatch,
    db: DbSession = Depends(get_db),
) -> SessionDetail:
    session = get_session_or_404(db, session_id)
    changed_prompt = False

    if payload.title is not None and payload.title.strip() != session.title:
        old_title = session.title
        session.title = payload.title.strip()
        changed_prompt = True
        event_service.add_event(
            db,
            "session_renamed",
            session_id=session.id,
            project_id=session.project_id,
            payload={"from": old_title, "to": session.title},
        )

    if payload.description is not None and payload.description != session.description:
        session.description = payload.description
        changed_prompt = True
        event_service.add_event(
            db,
            "description_changed",
            session_id=session.id,
            project_id=session.project_id,
        )

    if payload.status is not None and payload.status != session.status:
        old_status = session.status
        session.status = payload.status
        event_service.add_event(
            db,
            "status_changed",
            session_id=session.id,
            project_id=session.project_id,
            payload={"from": old_status, "to": session.status},
        )

    if changed_prompt:
        prompt_service.regenerate(db, session)

    db.add(session)
    db.commit()
    db.refresh(session)
    detail = SessionDetail.model_validate(session)
    detail.prompt_content = prompt_service.read_prompt(session)
    return detail


@router.post("/sessions/{session_id}/open-kitty", response_model=OpenKittyResponse)
def open_kitty(
    session_id: str,
    mode: CodexLaunchMode = Query(default="start"),
    approval: CodexApprovalPolicy = Query(default="on-request"),
    db: DbSession = Depends(get_db),
) -> OpenKittyResponse:
    session = get_session_or_404(db, session_id)
    worktree_path = Path(session.worktree_path)
    if not worktree_path.exists():
        raise HTTPException(status_code=400, detail="Worktree path does not exist")

    if not session.prompt_path or not Path(session.prompt_path).exists():
        prompt_service.regenerate(db, session)
        db.flush()

    try:
        launch = terminal_service.open_codex_kitty(
            worktree_path,
            session_id=session.id,
            prompt_path=Path(session.prompt_path),
            log_dir=settings.logs_dir / session.id,
            mode=mode,
            approval=approval,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to open kitty: {exc}") from exc

    if session.status == "draft":
        session.status = "running"
        event_service.add_event(
            db,
            "status_changed",
            session_id=session.id,
            project_id=session.project_id,
            payload={"from": "draft", "to": "running"},
        )

    event_service.add_event(
        db,
        "kitty_opened",
        session_id=session.id,
        project_id=session.project_id,
        payload={
            "worktree_path": session.worktree_path,
            "warning": launch["warning"],
            "mode": mode,
            "approval": approval,
            "log_path": launch["log_path"],
            "script_path": launch["script_path"],
            "pid": launch["pid"],
        },
    )
    db.add(session)
    db.commit()
    return OpenKittyResponse(
        ok=True,
        warning=launch["warning"],
        mode=mode,
        approval=approval,
        log_path=launch["log_path"],
        pid=launch["pid"],
    )


@router.get("/sessions/{session_id}/logs", response_model=SessionLogResponse)
def get_session_logs(
    session_id: str,
    limit: int = Query(default=200_000, ge=1_000, le=1_000_000),
    db: DbSession = Depends(get_db),
) -> SessionLogResponse:
    get_session_or_404(db, session_id)
    log_path = settings.logs_dir / session_id / "codex.log"
    if not log_path.exists():
        return SessionLogResponse(raw="", log_path=str(log_path), exists=False, truncated=False)

    raw = log_path.read_text(encoding="utf-8", errors="replace")
    truncated = len(raw) > limit
    if truncated:
        raw = raw[-limit:]
    return SessionLogResponse(raw=raw, log_path=str(log_path), exists=True, truncated=truncated)


@router.post("/sessions/{session_id}/run-background", response_model=BackgroundRunResponse)
def run_background(
    session_id: str,
    mode: CodexBackgroundMode = Query(default="start"),
    approval: CodexApprovalPolicy = Query(default="never"),
    sandbox: CodexSandboxMode = Query(default="workspace-write"),
    db: DbSession = Depends(get_db),
) -> BackgroundRunResponse:
    session = get_session_or_404(db, session_id)
    worktree_path = Path(session.worktree_path)
    if not worktree_path.exists():
        raise HTTPException(status_code=400, detail="Worktree path does not exist")

    if not session.prompt_path or not Path(session.prompt_path).exists():
        prompt_service.regenerate(db, session)
        db.flush()

    log_dir = settings.logs_dir / session.id
    try:
        run = codex_service.run_background(
            worktree_path=worktree_path,
            session_id=session.id,
            prompt_path=Path(session.prompt_path),
            log_dir=log_dir,
            mode=mode,
            approval=approval,
            sandbox=sandbox,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to start Codex: {exc}") from exc

    if session.status in {"draft", "review", "failed", "done"}:
        old_status = session.status
        session.status = "running"
        event_service.add_event(
            db,
            "status_changed",
            session_id=session.id,
            project_id=session.project_id,
            payload={"from": old_status, "to": "running"},
        )

    event_service.add_event(
        db,
        "background_started",
        session_id=session.id,
        project_id=session.project_id,
        payload={
            "mode": mode,
            "approval": approval,
            "sandbox": sandbox,
            "pid": run["pid"],
            "log_path": run["log_path"],
        },
    )
    db.add(session)
    db.commit()
    return BackgroundRunResponse(
        ok=True,
        pid=run["pid"],
        log_path=str(run["log_path"]),
        mode=mode,
        approval=approval,
        sandbox=sandbox,
    )


@router.post("/sessions/{session_id}/stop-background")
def stop_background(session_id: str, db: DbSession = Depends(get_db)) -> dict[str, bool]:
    session = get_session_or_404(db, session_id)
    stopped = codex_service.stop(settings.logs_dir / session.id)
    if stopped:
        old_status = session.status
        session.status = "failed"
        event_service.add_event(
            db,
            "status_changed",
            session_id=session.id,
            project_id=session.project_id,
            payload={"from": old_status, "to": "failed"},
        )
        event_service.add_event(
            db,
            "background_stopped",
            session_id=session.id,
            project_id=session.project_id,
        )
        db.add(session)
        db.commit()
    return {"ok": stopped}


@router.get("/sessions/{session_id}/process", response_model=SessionProcessResponse)
def get_process(session_id: str, db: DbSession = Depends(get_db)) -> SessionProcessResponse:
    session = get_session_or_404(db, session_id)
    if _sync_background_state(db, session):
        db.commit()
    state = codex_service.process_state(settings.logs_dir / session.id)
    return SessionProcessResponse(**state)


@router.post("/sessions/{session_id}/open-vscode")
def open_session_vscode(session_id: str, db: DbSession = Depends(get_db)) -> dict[str, bool]:
    session = get_session_or_404(db, session_id)
    worktree_path = Path(session.worktree_path)
    if not worktree_path.exists():
        raise HTTPException(status_code=400, detail="Worktree path does not exist")

    try:
        terminal_service.open_vscode(worktree_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to open VS Code: {exc}") from exc

    event_service.add_event(
        db,
        "vscode_opened",
        session_id=session.id,
        project_id=session.project_id,
        payload={"worktree_path": session.worktree_path},
    )
    db.commit()
    return {"ok": True}


@router.post("/sessions/{session_id}/archive", response_model=SessionRead)
def archive_session(session_id: str, db: DbSession = Depends(get_db)) -> Session:
    session = get_session_or_404(db, session_id)
    old_status = session.status
    session.status = "archived"
    event_service.add_event(
        db,
        "status_changed",
        session_id=session.id,
        project_id=session.project_id,
        payload={"from": old_status, "to": "archived"},
    )
    event_service.add_event(
        db,
        "session_archived",
        session_id=session.id,
        project_id=session.project_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/sessions/{session_id}/worktree")
def remove_worktree(
    session_id: str,
    force: bool = Query(default=False),
    db: DbSession = Depends(get_db),
) -> dict[str, bool]:
    session = get_session_or_404(db, session_id)
    project = session.project
    worktree_path = Path(session.worktree_path).expanduser().resolve()
    if not is_relative_to(worktree_path, settings.worktree_home):
        raise HTTPException(
            status_code=400,
            detail="Refusing to remove a worktree outside AgentDesk WORKTREE_HOME",
        )

    try:
        git_service.remove_worktree(Path(project.repo_path), worktree_path, force=force)
    except GitError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to remove git worktree: {exc}",
        ) from exc

    event_service.add_event(
        db,
        "worktree_removed",
        session_id=session.id,
        project_id=session.project_id,
        payload={"worktree_path": str(worktree_path), "force": force},
    )
    db.commit()
    return {"ok": True}


def _allocate_session_paths(project: Project, title: str, repo_path: Path) -> tuple[str, str, Path]:
    base_slug = slugify(title, "task")
    project_slug = slugify(project.name or Path(project.repo_path).name, "project")
    for index in range(1, 10_000):
        slug = base_slug if index == 1 else f"{base_slug}-{index}"
        branch_name = f"agent/{slug}"
        worktree_path = settings.worktree_home / f"{project_slug}-{slug}"
        if worktree_path.exists():
            continue
        if git_service.branch_exists(repo_path, branch_name):
            continue
        return slug, branch_name, worktree_path

    raise HTTPException(status_code=409, detail="Could not allocate a unique branch/worktree name")


def _sync_background_state(db: DbSession, session: Session) -> bool:
    if session.status != "running":
        return False
    state = codex_service.process_state(settings.logs_dir / session.id)
    if state["running"] or state["exit_code"] is None:
        return False

    exit_code = state["exit_code"]
    next_status = "review" if exit_code == 0 else "failed"
    session.status = next_status
    event_service.add_event(
        db,
        "background_finished",
        session_id=session.id,
        project_id=session.project_id,
        payload={"exit_code": exit_code, "log_path": state["log_path"]},
    )
    event_service.add_event(
        db,
        "status_changed",
        session_id=session.id,
        project_id=session.project_id,
        payload={"from": "running", "to": next_status},
    )
    db.add(session)
    return True
