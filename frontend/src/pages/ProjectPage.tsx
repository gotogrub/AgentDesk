import { Code2, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type AgentSession, type Project } from "../api/client";
import { NewSessionDialog } from "../components/NewSessionDialog";
import { SessionList } from "../components/SessionList";

type Props = {
  projectId: string;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function ProjectPage({ projectId, onError, onInfo }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void load();
  }, [projectId]);

  async function load() {
    setLoading(true);
    try {
      const [nextProject, nextSessions] = await Promise.all([
        api.getProject(projectId),
        api.listSessions(projectId)
      ]);
      setProject(nextProject);
      setSessions(nextSessions);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function openVscode() {
    try {
      await api.openProjectVscode(projectId);
      onInfo("VS Code opened.");
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  if (!project) {
    return <div className="rounded-md border border-line bg-panel p-6 text-sm text-muted">Loading project...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-text">{project.name}</h2>
          <div className="mt-2 break-all font-mono text-xs text-muted">{project.repo_path}</div>
          <div className="mt-1 text-sm text-muted">Default branch: {project.default_branch || "unknown"}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm text-text hover:border-accent"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm text-text hover:border-accent"
            onClick={() => void openVscode()}
          >
            <Code2 size={16} />
            VS Code
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-violet-400 bg-violet-500/20 px-3 text-sm text-violet-50 hover:bg-violet-500/30"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={16} />
            New Agent Task
          </button>
        </div>
      </div>

      <SessionList sessions={sessions} onChanged={() => void load()} onError={onError} onInfo={onInfo} />

      <NewSessionDialog
        projectId={projectId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(sessionId) => {
          window.location.hash = `#/sessions/${sessionId}`;
        }}
        onError={onError}
        onInfo={onInfo}
      />
    </div>
  );
}
