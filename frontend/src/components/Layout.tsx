import { Activity, FolderGit2, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";

import type { Project } from "../api/client";
import { Sidebar } from "./Sidebar";

type Props = {
  projects: Project[];
  routeLabel: string;
  children: ReactNode;
  onRefreshProjects: () => void;
};

export function Layout({ projects, routeLabel, children, onRefreshProjects }: Props) {
  return (
    <div className="min-h-screen bg-base text-text">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <Sidebar projects={projects} onRefreshProjects={onRefreshProjects} />
        <main className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-line bg-base/90 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                  <LayoutDashboard size={14} />
                  {routeLabel}
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-text">AgentDesk</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <FolderGit2 size={14} />
                {projects.length} projects
                <Activity className="ml-2" size={14} />
                Local only
              </div>
            </div>
          </header>
          <div className="mx-auto w-full max-w-7xl p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
