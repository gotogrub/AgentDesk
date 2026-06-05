import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, formatDate, type AgentSession, type Project, type SystemCheck } from "../api/client";
import { NewProjectDialog } from "../components/NewProjectDialog";
import { ProjectList } from "../components/ProjectList";
import { StatusBadge } from "../components/StatusBadge";

type Props = {
  projects: Project[];
  onProjectsChanged: () => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function DashboardPage({ projects, onProjectsChanged, onError, onInfo }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [system, setSystem] = useState<SystemCheck | null>(null);
  const [recentSessions, setRecentSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("newProject=1")) {
      setDialogOpen(true);
      window.location.hash = "#/";
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [projects.length]);

  async function refresh() {
    setLoading(true);
    try {
      const [systemCheck, sessionGroups] = await Promise.all([
        api.systemCheck(),
        Promise.all(projects.map((project) => api.listSessions(project.id)))
      ]);
      setSystem(systemCheck);
      setRecentSessions(
        sessionGroups
          .flat()
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 8)
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  const systemLabel = useMemo(() => {
    if (!system) return "Not checked";
    return system.ok ? "Ready" : "Needs attention";
  }, [system]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text">Dashboard</h2>
          <p className="mt-1 text-sm text-muted">Local worktree command center for Codex CLI.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm text-text hover:border-accent"
            onClick={() => void refresh()}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-violet-400 bg-violet-500/20 px-3 text-sm text-violet-50 hover:bg-violet-500/30"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={16} />
            Add Project
          </button>
        </div>
      </div>

      <section className="rounded-md border border-line bg-panel">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-text">System Check</h3>
        </div>
        <div className="p-4">
          <div className="mb-3 text-sm text-muted">Status: {systemLabel}</div>
          {system ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {system.commands.map((command) => (
                <div key={command.name} className="rounded border border-line bg-base/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-text">{command.name}</span>
                    <span className={command.found ? "text-xs text-emerald-200" : "text-xs text-red-200"}>
                      {command.found ? "found" : command.required ? "missing" : "optional"}
                    </span>
                  </div>
                  <div className="mt-2 truncate font-mono text-xs text-muted">
                    {command.path || command.error || "not installed"}
                  </div>
                  {command.version ? (
                    <div className="mt-1 truncate text-xs text-muted">{command.version}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted">Run refresh to check git, codex, kitty and code.</div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Projects</h3>
        </div>
        <ProjectList
          projects={projects}
          onChanged={onProjectsChanged}
          onError={onError}
          onInfo={onInfo}
        />
      </section>

      <section className="rounded-md border border-line bg-panel">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-text">Recent Sessions</h3>
        </div>
        <div className="divide-y divide-line">
          {recentSessions.length === 0 ? (
            <div className="p-4 text-sm text-muted">No sessions yet.</div>
          ) : (
            recentSessions.map((session) => (
              <a
                key={session.id}
                href={`#/sessions/${session.id}`}
                className="grid gap-3 px-4 py-3 hover:bg-base/40 md:grid-cols-[1fr_120px_1fr_160px]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text">{session.title}</div>
                  <div className="truncate text-xs text-muted">{session.description || "No description"}</div>
                </div>
                <StatusBadge status={session.status} />
                <div className="truncate font-mono text-xs text-muted">{session.branch_name}</div>
                <div className="text-xs text-muted">{formatDate(session.updated_at)}</div>
              </a>
            ))
          )}
        </div>
      </section>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={onProjectsChanged}
        onError={onError}
        onInfo={onInfo}
      />
    </div>
  );
}
