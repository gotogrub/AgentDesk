from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import attachments, git, projects, sessions, system
from app.config import ensure_data_dirs
from app.db import init_db
from app.static_files import static_dist_dir


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    ensure_data_dirs()
    init_db()
    yield


app = FastAPI(title="AgentDesk API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")
app.include_router(git.router, prefix="/api")

static_dir = static_dist_dir()
if static_dir is not None:
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
