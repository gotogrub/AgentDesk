export type SessionStatus = "draft" | "running" | "review" | "done" | "failed" | "archived";
export type CodexLaunchMode = "start" | "resume_last" | "resume_picker";
export type CodexBackgroundMode = "start" | "resume_last";
export type CodexApprovalPolicy = "untrusted" | "on-request" | "never";
export type CodexSandboxMode = "read-only" | "workspace-write" | "danger-full-access";

export type Project = {
  id: string;
  name: string;
  repo_path: string;
  default_branch: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentSession = {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: SessionStatus;
  branch_name: string;
  worktree_path: string;
  prompt_path: string | null;
  summary_path: string | null;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: string;
  session_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  created_at: string;
};

export type EventItem = {
  id: string;
  session_id: string | null;
  project_id: string | null;
  event_type: string;
  payload_json: string | null;
  created_at: string;
};

export type SessionDetail = AgentSession & {
  project: Project;
  attachments: Attachment[];
  events: EventItem[];
  prompt_content: string | null;
};

export type CommandCheck = {
  name: string;
  found: boolean;
  path: string | null;
  version: string | null;
  required: boolean;
  error: string | null;
};

export type SystemCheck = {
  ok: boolean;
  commands: CommandCheck[];
};

export type GitStatusItem = {
  status: string;
  path: string;
};

export type GitStatusResponse = {
  raw: string;
  files: GitStatusItem[];
};

export type GitDiffResponse = {
  raw: string;
  truncated: boolean;
};

export type SessionLogResponse = {
  raw: string;
  log_path: string;
  exists: boolean;
  truncated: boolean;
};

export type BackgroundRunResponse = {
  ok: boolean;
  pid: number | null;
  log_path: string;
  mode: CodexBackgroundMode;
  approval: CodexApprovalPolicy;
  sandbox: CodexSandboxMode;
};

export type SessionProcessResponse = {
  running: boolean;
  pid: number | null;
  exit_code: number | null;
  log_path: string;
  exists: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8765/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  if (hasBody && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (body.detail) {
        message = JSON.stringify(body.detail);
      }
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  systemCheck: () => request<SystemCheck>("/system/check"),

  listProjects: () => request<Project[]>("/projects"),
  createProject: (payload: { name: string; repo_path: string }) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),
  deleteProject: (projectId: string) =>
    request<void>(`/projects/${projectId}`, {
      method: "DELETE"
    }),
  openProjectVscode: (projectId: string) =>
    request<{ ok: boolean }>(`/projects/${projectId}/open-vscode`, {
      method: "POST"
    }),

  listSessions: (projectId: string) => request<AgentSession[]>(`/projects/${projectId}/sessions`),
  createSession: (projectId: string, payload: { title: string; description?: string }) =>
    request<AgentSession>(`/projects/${projectId}/sessions`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getSession: (sessionId: string) => request<SessionDetail>(`/sessions/${sessionId}`),
  updateSession: (
    sessionId: string,
    payload: Partial<{ title: string; description: string; status: SessionStatus }>
  ) =>
    request<SessionDetail>(`/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  openKitty: (
    sessionId: string,
    mode: CodexLaunchMode = "start",
    approval: CodexApprovalPolicy = "on-request"
  ) =>
    request<{ ok: boolean; warning: string | null; log_path: string | null; pid: number | null }>(
      `/sessions/${sessionId}/open-kitty?mode=${mode}&approval=${approval}`,
      {
        method: "POST"
      }
    ),
  runBackground: (
    sessionId: string,
    mode: CodexBackgroundMode = "start",
    approval: CodexApprovalPolicy = "never",
    sandbox: CodexSandboxMode = "workspace-write"
  ) =>
    request<BackgroundRunResponse>(
      `/sessions/${sessionId}/run-background?mode=${mode}&approval=${approval}&sandbox=${sandbox}`,
      {
        method: "POST"
      }
    ),
  stopBackground: (sessionId: string) =>
    request<{ ok: boolean }>(`/sessions/${sessionId}/stop-background`, {
      method: "POST"
    }),
  sessionProcess: (sessionId: string) =>
    request<SessionProcessResponse>(`/sessions/${sessionId}/process`),

  openSessionVscode: (sessionId: string) =>
    request<{ ok: boolean }>(`/sessions/${sessionId}/open-vscode`, {
      method: "POST"
    }),
  archiveSession: (sessionId: string) =>
    request<AgentSession>(`/sessions/${sessionId}/archive`, {
      method: "POST"
    }),
  removeWorktree: (sessionId: string, force = false) =>
    request<{ ok: boolean }>(`/sessions/${sessionId}/worktree?force=${force ? "true" : "false"}`, {
      method: "DELETE"
    }),

  uploadAttachment: (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Attachment>(`/sessions/${sessionId}/attachments`, {
      method: "POST",
      body: formData
    });
  },
  deleteAttachment: (attachmentId: string) =>
    request<void>(`/attachments/${attachmentId}`, {
      method: "DELETE"
    }),

  gitStatus: (sessionId: string) => request<GitStatusResponse>(`/sessions/${sessionId}/git/status`),
  gitDiff: (sessionId: string) => request<GitDiffResponse>(`/sessions/${sessionId}/git/diff`),
  sessionLogs: (sessionId: string) => request<SessionLogResponse>(`/sessions/${sessionId}/logs`)
};

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
