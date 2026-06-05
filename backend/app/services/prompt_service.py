from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.models import Attachment, Project, Session


class PromptService:
    def prompt_path_for(self, session_id: str) -> Path:
        return settings.prompts_dir / session_id / "prompt.md"

    def regenerate(self, db: DbSession, session: Session, project: Project | None = None) -> Path:
        project = project or session.project
        prompt_path = self.prompt_path_for(session.id)
        prompt_path.parent.mkdir(parents=True, exist_ok=True)

        attachments = (
            db.query(Attachment)
            .filter(Attachment.session_id == session.id)
            .order_by(Attachment.created_at.asc())
            .all()
        )
        attachment_lines = (
            "\n".join(f"* {attachment.file_path}" for attachment in attachments)
            if attachments
            else "* None"
        )
        description = session.description or ""
        content = f"""# AgentDesk Task

You are working in a separate git worktree and branch.

Project:

* Name: {project.name}
* Original repo: {project.repo_path}
* Worktree: {session.worktree_path}
* Branch: {session.branch_name}

Task:

{session.title}

Description: {description}

Attachments:
{attachment_lines}

Rules:

1. First inspect README, package files, docs, and relevant source files.
2. Do not modify unrelated files.
3. Do not perform large refactors unless required by the task.
4. Keep changes minimal and reviewable.
5. If screenshots are attached, use them as UI/bug context.
6. Run available checks after changes.
7. At the end, write a concise report:
   * what changed
   * changed files
   * commands/checks run
   * remaining risks
8. Do not commit unless explicitly asked.

Suggested first command:
cat "{prompt_path}"
"""
        prompt_path.write_text(content, encoding="utf-8")
        session.prompt_path = str(prompt_path)
        db.add(session)
        return prompt_path

    def read_prompt(self, session: Session) -> str | None:
        if not session.prompt_path:
            return None
        prompt_path = Path(session.prompt_path)
        if not prompt_path.exists():
            return None
        return prompt_path.read_text(encoding="utf-8")


prompt_service = PromptService()
