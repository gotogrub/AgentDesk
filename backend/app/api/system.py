from __future__ import annotations

import shutil
import subprocess

from fastapi import APIRouter

from app.schemas import CommandCheck, SystemCheck

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/system/check", response_model=SystemCheck)
def system_check() -> SystemCheck:
    commands = [
        _check_command("git", required=True),
        _check_command("codex", required=True),
        _check_command("kitty", required=True),
        _check_command("code", required=False),
        _check_command("script", required=False),
    ]
    ok = all(command.found for command in commands if command.required)
    return SystemCheck(ok=ok, commands=commands)


def _check_command(name: str, *, required: bool) -> CommandCheck:
    path = shutil.which(name)
    if not path:
        return CommandCheck(name=name, found=False, required=required, error="command not found")

    version: str | None = None
    error: str | None = None
    try:
        result = subprocess.run(
            [path, "--version"],
            text=True,
            capture_output=True,
            timeout=3,
            check=False,
        )
        output = (result.stdout or result.stderr).strip()
        if result.returncode == 0 and output:
            version = output.splitlines()[0]
        elif output:
            error = output.splitlines()[0]
    except Exception as exc:  # noqa: BLE001
        error = str(exc)

    return CommandCheck(
        name=name,
        found=True,
        path=path,
        version=version,
        required=required,
        error=error,
    )
