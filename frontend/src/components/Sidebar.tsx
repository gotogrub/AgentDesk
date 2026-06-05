import { Gauge, Plus, RefreshCw } from "lucide-react";

import type { Project } from "../api/client";

type Props = {
  projects: Project[];
  onRefreshProjects: () => void;
};

export function Sidebar({ projects, onRefreshProjects }: Props) {
  return (
    <aside className="border-b border-line bg-panel p-4 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between">
        <a href="#/" className="text-lg font-semibold text-text">
          AgentDesk
        </a>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-line text-muted hover:border-accent hover:text-text"
          onClick={onRefreshProjects}
          title="Refresh projects"
        >
          <RefreshCw size={15} />
        </button>
      </div>
      <nav className="mt-5 space-y-2">
        <a
          href="#/"
          className="flex items-center gap-2 rounded border border-line bg-base/40 px-3 py-2 text-sm text-text hover:border-accent"
        >
          <Gauge size={16} />
          Dashboard
        </a>
        <a
          href="#/?newProject=1"
          className="flex items-center gap-2 rounded border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-sm text-violet-100 hover:border-violet-300"
        >
          <Plus size={16} />
          Add Project
        </a>
      </nav>
      <div className="mt-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted">Projects</div>
        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="rounded border border-line bg-base/40 p-3 text-sm text-muted">
              No projects added.
            </div>
          ) : (
            projects.map((project) => (
              <a
                key={project.id}
                href={`#/projects/${project.id}`}
                className="block rounded border border-line bg-base/40 p-3 hover:border-accent"
              >
                <div className="truncate text-sm font-medium text-text">{project.name}</div>
                <div className="mt-1 truncate font-mono text-xs text-muted">{project.repo_path}</div>
              </a>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
