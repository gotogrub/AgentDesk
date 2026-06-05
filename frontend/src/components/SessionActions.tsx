import {
  Archive,
  Code2,
  GitCompare,
  History,
  ListRestart,
  MonitorPlay,
  RefreshCw,
  Square,
  Terminal,
  Trash2
} from "lucide-react";

import {
  api,
  type AgentSession,
  type CodexApprovalPolicy,
  type CodexBackgroundMode,
  type CodexLaunchMode,
  type CodexSandboxMode
} from "../api/client";

type Props = {
  session: AgentSession;
  approval: CodexApprovalPolicy;
  sandbox: CodexSandboxMode;
  onApprovalChange: (approval: CodexApprovalPolicy) => void;
  onSandboxChange: (sandbox: CodexSandboxMode) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
  onChanged: () => void;
  onStatus: () => void;
  onDiff: () => void;
  onLogs: () => void;
  onProcess: () => void;
};

const buttonClass =
  "inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-50";

export function SessionActions({
  session,
  approval,
  sandbox,
  onApprovalChange,
  onSandboxChange,
  onError,
  onInfo,
  onChanged,
  onStatus,
  onDiff,
  onLogs,
  onProcess
}: Props) {
  async function startBackground(mode: CodexBackgroundMode) {
    try {
      const run = await api.runBackground(session.id, mode, approval, sandbox);
      const pid = run.pid ? ` PID: ${run.pid}.` : "";
      onInfo(`Background Codex started.${pid} Log: ${run.log_path}`);
      onLogs();
      onProcess();
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function stopBackground() {
    try {
      const result = await api.stopBackground(session.id);
      onInfo(result.ok ? "Background Codex stopped." : "No running background Codex process found.");
      onLogs();
      onProcess();
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function launchKitty(mode: CodexLaunchMode) {
    try {
      const launch = await api.openKitty(session.id, mode, approval);
      const detail = launch.log_path ? ` Log: ${launch.log_path}` : "";
      onInfo(launch.warning || `Kitty Codex launched.${detail}`);
      onLogs();
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function run(label: string, action: () => Promise<unknown>, refresh = true) {
    try {
      await action();
      onInfo(`${label} done.`);
      if (refresh) onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
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
          <option value="never">never</option>
          <option value="on-request">on-request</option>
          <option value="untrusted">untrusted</option>
        </select>
      </label>
      <label className="flex h-9 items-center gap-2 rounded border border-line bg-panel px-3 text-xs text-muted">
        Sandbox
        <select
          className="bg-transparent text-xs text-text outline-none"
          value={sandbox}
          onChange={(event) => onSandboxChange(event.target.value as CodexSandboxMode)}
          title="Codex sandbox mode"
        >
          <option value="workspace-write">workspace-write</option>
          <option value="read-only">read-only</option>
          <option value="danger-full-access">danger-full-access</option>
        </select>
      </label>
      <button
        className="inline-flex h-9 items-center gap-2 rounded border border-violet-400 bg-violet-500/20 px-3 text-sm text-violet-50 hover:bg-violet-500/30"
        onClick={() => void startBackground("start")}
        title="Run Codex headlessly in this worktree with prompt.md"
        type="button"
      >
        <MonitorPlay size={16} />
        Run Background
      </button>
      <button
        className={buttonClass}
        onClick={() => void startBackground("resume_last")}
        title="Resume the most recent Codex conversation headlessly"
        type="button"
      >
        <History size={16} />
        Resume Background
      </button>
      <button
        className="inline-flex h-9 items-center gap-2 rounded border border-red-500/40 px-3 text-sm text-red-100 hover:border-red-300"
        onClick={() => void stopBackground()}
        title="Stop background Codex for this task"
        type="button"
      >
        <Square size={15} />
        Stop
      </button>
      <button
        className={buttonClass}
        onClick={() => void launchKitty("start")}
        title="Open Codex in kitty as a manual fallback"
        type="button"
      >
        <Terminal size={16} />
        Kitty
      </button>
      <button
        className={buttonClass}
        onClick={() => void launchKitty("resume_picker")}
        title="Open Codex resume picker in kitty"
        type="button"
      >
        <ListRestart size={16} />
        Kitty Picker
      </button>
      <button
        className={buttonClass}
        onClick={() => void run("VS Code", () => api.openSessionVscode(session.id), false)}
        title="Open worktree in VS Code"
        type="button"
      >
        <Code2 size={16} />
        VS Code
      </button>
      <button className={buttonClass} onClick={onStatus} title="Refresh git status" type="button">
        <RefreshCw size={16} />
        Status
      </button>
      <button className={buttonClass} onClick={onDiff} title="Show git diff" type="button">
        <GitCompare size={16} />
        Diff
      </button>
      <button
        className={buttonClass}
        onClick={() => void run("Archive", () => api.archiveSession(session.id))}
        title="Archive session"
        type="button"
      >
        <Archive size={16} />
        Archive
      </button>
      <button
        className="inline-flex h-9 items-center gap-2 rounded border border-red-500/40 px-3 text-sm text-red-100 hover:border-red-300"
        onClick={() => {
          const confirmed = window.confirm("Remove this git worktree from disk?");
          if (!confirmed) return;
          void run("Remove worktree", () => api.removeWorktree(session.id, false));
        }}
        title="Remove AgentDesk-created worktree"
        type="button"
      >
        <Trash2 size={16} />
        Remove Worktree
      </button>
    </div>
  );
}
