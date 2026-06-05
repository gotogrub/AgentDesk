import {
  Archive,
  Code2,
  GitCompare,
  History,
  ListRestart,
  MonitorPlay,
  RefreshCw,
  Trash2
} from "lucide-react";

import { api, type AgentSession, type CodexApprovalPolicy, type CodexLaunchMode } from "../api/client";

type Props = {
  session: AgentSession;
  approval: CodexApprovalPolicy;
  onApprovalChange: (approval: CodexApprovalPolicy) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
  onChanged: () => void;
  onStatus: () => void;
  onDiff: () => void;
  onLogs: () => void;
};

const buttonClass =
  "inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm text-text hover:border-accent";

export function SessionActions({
  session,
  approval,
  onApprovalChange,
  onError,
  onInfo,
  onChanged,
  onStatus,
  onDiff,
  onLogs
}: Props) {
  async function run(label: string, action: () => Promise<unknown>, refresh = true) {
    try {
      const result = await action();
      if (label === "Codex") {
        const launch = result as { warning?: string | null; log_path?: string | null; pid?: number | null };
        const detail = launch.log_path ? ` Log: ${launch.log_path}` : "";
        onInfo(launch.warning || `Codex launched.${detail}`);
        onLogs();
      } else {
        onInfo(`${label} done.`);
      }
      if (refresh) onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  function launch(mode: CodexLaunchMode) {
    return run("Codex", () => api.openKitty(session.id, mode, approval));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex h-9 items-center gap-2 rounded border border-line bg-panel px-3 text-xs text-muted">
        Approval
        <select
          className="bg-transparent text-xs text-text outline-none"
          value={approval}
          onChange={(event) => onApprovalChange(event.target.value as CodexApprovalPolicy)}
          title="Codex approval policy"
        >
          <option value="on-request">on-request</option>
          <option value="never">never</option>
          <option value="untrusted">untrusted</option>
        </select>
      </label>
      <button
        className={buttonClass}
        onClick={() => void launch("start")}
        title="Start Codex with prompt.md as the initial prompt"
      >
        <MonitorPlay size={16} />
        Start Codex
      </button>
      <button
        className={buttonClass}
        onClick={() => void launch("resume_last")}
        title="Resume the most recent Codex conversation for this worktree"
      >
        <History size={16} />
        Resume Last
      </button>
      <button
        className={buttonClass}
        onClick={() => void launch("resume_picker")}
        title="Open Codex resume picker filtered by this worktree"
      >
        <ListRestart size={16} />
        Resume Picker
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
