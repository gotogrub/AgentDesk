from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class GitError(Exception):
    message: str
    stdout: str = ""
    stderr: str = ""
    returncode: int | None = None

    def __str__(self) -> str:
        detail = self.stderr.strip() or self.stdout.strip()
        if detail:
            return f"{self.message}: {detail}"
        return self.message


class GitService:
    def _run(
        self,
        args: list[str],
        cwd: Path,
        *,
        check: bool = True,
        timeout: int = 30,
    ) -> subprocess.CompletedProcess[str]:
        try:
            result = subprocess.run(
                ["git", *args],
                cwd=str(cwd),
                text=True,
                capture_output=True,
                timeout=timeout,
                check=False,
            )
        except FileNotFoundError as exc:
            raise GitError("git command not found") from exc
        except subprocess.TimeoutExpired as exc:
            raise GitError("git command timed out") from exc

        if check and result.returncode != 0:
            raise GitError(
                "git command failed",
                stdout=result.stdout,
                stderr=result.stderr,
                returncode=result.returncode,
            )
        return result

    def is_git_repo(self, repo_path: Path) -> bool:
        result = self._run(["rev-parse", "--is-inside-work-tree"], repo_path, check=False)
        return result.returncode == 0 and result.stdout.strip() == "true"

    def current_branch(self, repo_path: Path) -> str | None:
        result = self._run(["rev-parse", "--abbrev-ref", "HEAD"], repo_path, check=False)
        if result.returncode != 0:
            return None
        branch = result.stdout.strip()
        return None if branch == "HEAD" else branch

    def is_clean(self, repo_path: Path) -> bool:
        result = self._run(["status", "--porcelain"], repo_path)
        return result.stdout.strip() == ""

    def branch_exists(self, repo_path: Path, branch_name: str) -> bool:
        result = self._run(
            ["rev-parse", "--verify", "--quiet", f"refs/heads/{branch_name}"],
            repo_path,
            check=False,
        )
        return result.returncode == 0

    def create_worktree(self, repo_path: Path, worktree_path: Path, branch_name: str) -> None:
        self._run(
            ["worktree", "add", str(worktree_path), "-b", branch_name],
            repo_path,
            timeout=120,
        )

    def remove_worktree(self, repo_path: Path, worktree_path: Path, *, force: bool = False) -> None:
        args = ["worktree", "remove", str(worktree_path)]
        if force:
            args.append("--force")
        self._run(args, repo_path, timeout=120)

    def status_short(self, worktree_path: Path) -> str:
        result = self._run(["status", "--short"], worktree_path)
        return result.stdout

    def diff(self, worktree_path: Path) -> str:
        result = self._run(["diff", "--", ".", ":!package-lock.json"], worktree_path, timeout=60)
        return result.stdout

    def changed_files(self, worktree_path: Path) -> list[dict[str, str]]:
        raw = self.status_short(worktree_path)
        return parse_status_short(raw)


def parse_status_short(raw: str) -> list[dict[str, str]]:
    files: list[dict[str, str]] = []
    for line in raw.splitlines():
        if not line:
            continue
        status = line[:2].strip() or line[:2]
        path = line[3:] if len(line) > 3 else ""
        files.append({"status": status, "path": path})
    return files
