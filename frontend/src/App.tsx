import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, type Project } from "./api/client";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectPage } from "./pages/ProjectPage";
import { SessionPage } from "./pages/SessionPage";

type Route =
  | { name: "dashboard" }
  | { name: "project"; projectId: string }
  | { name: "session"; sessionId: string }
  | { name: "not-found" };

type Notice = {
  type: "info" | "error";
  message: string;
};

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [projects, setProjects] = useState<Project[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, []);

  function showError(message: string) {
    setNotice({ type: "error", message });
  }

  function showInfo(message: string) {
    setNotice({ type: "info", message });
  }

  async function loadProjects() {
    try {
      const next = await api.listProjects();
      setProjects(next);
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
    }
  }

  const routeLabel = useMemo(() => {
    if (route.name === "project") return "Project";
    if (route.name === "session") return "Session";
    return "Dashboard";
  }, [route]);

  return (
    <Layout projects={projects} routeLabel={routeLabel} onRefreshProjects={() => void loadProjects()}>
      {notice ? <NoticeBanner notice={notice} onClose={() => setNotice(null)} /> : null}
      {route.name === "dashboard" ? (
        <DashboardPage
          projects={projects}
          onProjectsChanged={() => void loadProjects()}
          onError={showError}
          onInfo={showInfo}
        />
      ) : null}
      {route.name === "project" ? (
        <ProjectPage projectId={route.projectId} onError={showError} onInfo={showInfo} />
      ) : null}
      {route.name === "session" ? (
        <SessionPage sessionId={route.sessionId} onError={showError} onInfo={showInfo} />
      ) : null}
      {route.name === "not-found" ? (
        <div className="rounded-md border border-line bg-panel p-6">
          <h2 className="text-lg font-semibold text-text">Not Found</h2>
          <p className="mt-2 text-sm text-muted">The requested AgentDesk page does not exist.</p>
          <a className="mt-4 inline-block text-sm text-violet-200 hover:text-violet-100" href="#/">
            Back to dashboard
          </a>
        </div>
      ) : null}
    </Layout>
  );
}

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const path = hash.split("?")[0];
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "dashboard" };
  if (parts.length === 2 && parts[0] === "projects") {
    return { name: "project", projectId: parts[1] };
  }
  if (parts.length === 2 && parts[0] === "sessions") {
    return { name: "session", sessionId: parts[1] };
  }
  return { name: "not-found" };
}

function NoticeBanner({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const isError = notice.type === "error";
  return (
    <div
      className={`mb-5 flex items-start justify-between gap-3 rounded-md border p-3 ${
        isError
          ? "border-red-500/50 bg-red-500/10 text-red-100"
          : "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        {isError ? <AlertTriangle className="mt-0.5 shrink-0" size={16} /> : <CheckCircle2 size={16} />}
        <div className="break-words text-sm">{notice.message}</div>
      </div>
      <button
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-white/10 hover:border-white/30"
        onClick={onClose}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
