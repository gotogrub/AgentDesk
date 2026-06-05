import { Archive, GitBranch, Monitor } from "lucide-react";

import { api, formatDate, type AgentSession } from "../api/client";
import { StatusBadge } from "./StatusBadge";

type Props = {
  sessions: AgentSession[];
  onChanged: () => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function SessionList({ sessions, onChanged, onError, onInfo }: Props) {
  async function openKitty(session: AgentSession) {
    try {
      const result = await api.openKitty(session.id);
      onInfo(result.warning || "Kitty opened.");
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function archive(session: AgentSession) {
    if (!window.confirm(`Archive task ${session.title}?`)) return;
    try {
      await api.archiveSession(session.id);
      onInfo("Session archived.");
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-md border border-line bg-panel p-6 text-sm text-muted">
        No agent tasks yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel">
      <div className="grid grid-cols-[1.4fr_120px_1fr_160px_180px] gap-3 border-b border-line px-4 py-3 text-xs uppercase tracking-wide text-muted max-lg:hidden">
        <div>Task</div>
        <div>Status</div>
        <div>Branch</div>
        <div>Updated</div>
        <div>Actions</div>
      </div>
      <div className="divide-y divide-line">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="grid gap-3 px-4 py-3 lg:grid-cols-[1.4fr_120px_1fr_160px_180px]"
          >
            <a href={`#/sessions/${session.id}`} className="min-w-0">
              <div className="truncate text-sm font-medium text-text">{session.title}</div>
              <div className="mt-1 truncate text-xs text-muted">{session.description || "No description"}</div>
            </a>
            <div>
              <StatusBadge status={session.status} />
            </div>
            <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted">
              <GitBranch size={14} />
              <span className="truncate">{session.branch_name}</span>
            </div>
            <div className="text-xs text-muted">{formatDate(session.updated_at)}</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-8 items-center gap-2 rounded border border-line px-2 text-xs text-text hover:border-accent"
                onClick={() => void openKitty(session)}
                title="Open in kitty"
              >
                <Monitor size={14} />
                Kitty
              </button>
              <button
                className="inline-flex h-8 items-center gap-2 rounded border border-line px-2 text-xs text-text hover:border-accent"
                onClick={() => {
                  window.location.hash = `#/sessions/${session.id}`;
                }}
              >
                Open
              </button>
              <button
                className="inline-flex h-8 items-center gap-2 rounded border border-line px-2 text-xs text-text hover:border-accent"
                onClick={() => void archive(session)}
                title="Archive"
              >
                <Archive size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
