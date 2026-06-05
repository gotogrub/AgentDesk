from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SessionStatus = Literal["draft", "running", "review", "done", "failed", "archived"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    repo_path: str = Field(min_length=1)


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    repo_path: str
    default_branch: str | None
    created_at: datetime
    updated_at: datetime


class SessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class SessionPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: SessionStatus | None = None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    title: str
    slug: str
    description: str | None
    status: str
    branch_name: str
    worktree_path: str
    prompt_path: str | None
    summary_path: str | None
    created_at: datetime
    updated_at: datetime


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    file_name: str
    file_path: str
    mime_type: str | None
    created_at: datetime


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str | None
    project_id: str | None
    event_type: str
    payload_json: str | None
    created_at: datetime


class SessionDetail(SessionRead):
    project: ProjectRead
    attachments: list[AttachmentRead]
    events: list[EventRead]
    prompt_content: str | None = None


class CommandCheck(BaseModel):
    name: str
    found: bool
    path: str | None = None
    version: str | None = None
    required: bool = True
    error: str | None = None


class SystemCheck(BaseModel):
    ok: bool
    commands: list[CommandCheck]


class GitStatusItem(BaseModel):
    status: str
    path: str


class GitStatusResponse(BaseModel):
    raw: str
    files: list[GitStatusItem]


class GitDiffResponse(BaseModel):
    raw: str
    truncated: bool = False


class OpenKittyResponse(BaseModel):
    ok: bool
    warning: str | None = None
