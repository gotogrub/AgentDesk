import { Archive, Code2, GitCompare, Monitor, RefreshCw, Trash2 } from "lucide-react";

import { api, type AgentSession } from "../api/client";

type Props = {
  session: AgentSession;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
  onChanged: () => void;
  onStatus: () => void;
  onDiff: () => void;
};

const buttonClass =
  "inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm text-text hover:border-accent";

export function SessionActions({ session, onError, onInfo, onChanged, onStatus, onDiff }: Props) {
  async function run(label: string, action: () => Promise<unknown>, refresh = true) {
    try {
      const result = await action();
      if (label === "kitty") {
        const warning = (result as { warning?: string | null })?.warning;
        onInfo(warning || "Kitty opened.");
      } else {
        onInfo(`${label} done.`);
      }
      if (refresh) onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={buttonClass}
        onClick={() => run("kitty", () => api.openKitty(session.id))}
        title="Open Codex in kitty"
      >
        <Monitor size={16} />
        Kitty
      </button>
      <button
        className={buttonClass}
        onClick={() => run("VS Code", () => api.openSessionVscode(session.id), false)}
        title="Open worktree in VS Code"
      >
        <Code2 size={16} />
        VS Code
      </button>
      <button className={buttonClass} onClick={onStatus} title="Refresh git status">
        <RefreshCw size={16} />
        Status
      </button>
      <button className={buttonClass} onClick={onDiff} title="Show git diff">
        <GitCompare size={16} />
        Diff
      </button>
      <button
        className={buttonClass}
        onClick={() => run("Archive", () => api.archiveSession(session.id))}
        title="Archive session"
      >
        <Archive size={16} />
        Archive
      </button>
      <button
        className="inline-flex h-9 items-center gap-2 rounded border border-red-500/40 px-3 text-sm text-red-100 hover:border-red-300"
        onClick={() => {
          const force = window.confirm(
            "Remove this git worktree? Press OK for normal remove. Use Cancel to keep it."
          );
          if (!force) return;
          run("Remove worktree", () => api.removeWorktree(session.id, false));
        }}
        title="Remove AgentDesk-created worktree"
      >
        <Trash2 size={16} />
        Remove Worktree
      </button>
    </div>
  );
}
