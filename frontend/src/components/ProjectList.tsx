import { Code2, Trash2 } from "lucide-react";

import { api, formatDate, type Project } from "../api/client";

type Props = {
  projects: Project[];
  onChanged: () => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function ProjectList({ projects, onChanged, onError, onInfo }: Props) {
  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete project ${project.name} from AgentDesk? The repository stays on disk.`)) {
      return;
    }
    try {
      await api.deleteProject(project.id);
      onInfo("Project removed from AgentDesk.");
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function openVscode(project: Project) {
    try {
      await api.openProjectVscode(project.id);
      onInfo("VS Code opened.");
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-md border border-line bg-panel p-6 text-sm text-muted">
        Add an existing git repository to start.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <div key={project.id} className="rounded-md border border-line bg-panel p-4">
          <a href={`#/projects/${project.id}`} className="block hover:text-violet-100">
            <div className="text-base font-semibold text-text">{project.name}</div>
            <div className="mt-2 break-all font-mono text-xs text-muted">{project.repo_path}</div>
          </a>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Branch: {project.default_branch || "unknown"}</span>
            <span>Updated: {formatDate(project.updated_at)}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="inline-flex h-8 items-center gap-2 rounded border border-line px-2 text-xs text-text hover:border-accent"
              onClick={() => void openVscode(project)}
              title="Open repository in VS Code"
            >
              <Code2 size={14} />
              VS Code
            </button>
            <button
              className="inline-flex h-8 items-center gap-2 rounded border border-red-500/40 px-2 text-xs text-red-100 hover:border-red-300"
              onClick={() => void deleteProject(project)}
              title="Delete project from AgentDesk"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
