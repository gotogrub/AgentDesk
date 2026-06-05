import { Copy, Save, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  api,
  formatDate,
  type GitDiffResponse,
  type GitStatusResponse,
  type SessionDetail,
  type SessionStatus
} from "../api/client";
import { AttachmentDropzone } from "../components/AttachmentDropzone";
import { DiffViewer } from "../components/DiffViewer";
import { FileList } from "../components/FileList";
import { SessionActions } from "../components/SessionActions";
import { StatusBadge } from "../components/StatusBadge";

type Props = {
  sessionId: string;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

const statuses: SessionStatus[] = ["draft", "running", "review", "done", "failed", "archived"];

export function SessionPage({ sessionId, onError, onInfo }: Props) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<SessionStatus>("draft");
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const [diff, setDiff] = useState<GitDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    void load();
  }, [sessionId]);

  async function load() {
    setLoading(true);
    try {
      const next = await api.getSession(sessionId);
      setSession(next);
      setTitle(next.title);
      setDescription(next.description || "");
      setStatus(next.status);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setSaving(true);
    try {
      const next = await api.updateSession(sessionId, {
        title: title.trim(),
        description,
        status
      });
      setSession(next);
      onInfo("Session saved.");
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function refreshStatus() {
    try {
      const next = await api.gitStatus(sessionId);
      setGitStatus(next);
      onInfo("Git status refreshed.");
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  async function refreshDiff() {
    setLoadingDiff(true);
    try {
      const next = await api.gitDiff(sessionId);
      setDiff(next);
      onInfo("Diff loaded.");
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingDiff(false);
    }
  }

  if (!session) {
    return (
      <div className="rounded-md border border-line bg-panel p-6 text-sm text-muted">
        {loading ? "Loading session..." : "Session not loaded."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2">
            <StatusBadge status={session.status} />
          </div>
          <h2 className="break-words text-xl font-semibold text-text">{session.title}</h2>
          <div className="mt-2 text-sm text-muted">
            <a className="hover:text-violet-100" href={`#/projects/${session.project.id}`}>
              {session.project.name}
            </a>
          </div>
        </div>
        <SessionActions
          session={session}
          onError={onError}
          onInfo={onInfo}
          onChanged={() => void load()}
          onStatus={() => void refreshStatus()}
          onDiff={() => void refreshDiff()}
        />
      </div>

      <form className="rounded-md border border-line bg-panel" onSubmit={(event) => void save(event)}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-text">Task Details</h3>
          <button
            className="inline-flex h-8 items-center gap-2 rounded border border-violet-400 bg-violet-500/20 px-3 text-xs text-violet-50 hover:bg-violet-500/30"
            disabled={saving}
            title="Save changes"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Title</span>
            <input
              className="mt-1 w-full rounded border border-line bg-base px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Status</span>
            <select
              className="mt-1 w-full rounded border border-line bg-base px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={status}
              onChange={(event) => setStatus(event.target.value as SessionStatus)}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className="text-xs uppercase tracking-wide text-muted">Description</span>
            <textarea
              className="mt-1 min-h-32 w-full resize-y rounded border border-line bg-base px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>
      </form>

      <section className="grid gap-4 lg:grid-cols-2">
        <InfoBlock label="Worktree" value={session.worktree_path} />
        <InfoBlock label="Branch" value={session.branch_name} />
        <InfoBlock label="Prompt" value={session.prompt_path || "not generated"} />
        <InfoBlock label="Original repo" value={session.project.repo_path} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AttachmentDropzone
          sessionId={session.id}
          attachments={session.attachments}
          onChanged={() => void load()}
          onError={onError}
          onInfo={onInfo}
        />
        <section className="rounded-md border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-text">Prompt</h3>
            <button
              className="inline-flex h-8 items-center gap-2 rounded border border-line px-3 text-xs text-text hover:border-accent"
              onClick={() => {
                void navigator.clipboard.writeText(session.prompt_content || "");
                onInfo("Prompt copied.");
              }}
              title="Copy prompt"
              type="button"
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
          <pre className="scrollbar-thin max-h-[430px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-zinc-200">
            {session.prompt_content || "Prompt file is not available."}
          </pre>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-3">
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-line px-3 text-sm text-text hover:border-accent"
            onClick={() => void refreshStatus()}
            title="Refresh git status"
            type="button"
          >
            <RefreshCw size={16} />
            Refresh Git Status
          </button>
          <FileList files={gitStatus?.files || []} />
        </div>
        <DiffViewer
          diff={diff?.raw || ""}
          truncated={diff?.truncated}
          loading={loadingDiff}
          onRefresh={() => void refreshDiff()}
        />
      </div>

      <section className="rounded-md border border-line bg-panel">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-text">Events</h3>
        </div>
        <div className="divide-y divide-line">
          {session.events.length === 0 ? (
            <div className="p-4 text-sm text-muted">No events.</div>
          ) : (
            session.events
              .slice()
              .reverse()
              .map((event) => (
                <div key={event.id} className="grid gap-2 px-4 py-3 md:grid-cols-[180px_1fr]">
                  <div className="text-xs text-muted">{formatDate(event.created_at)}</div>
                  <div>
                    <div className="font-mono text-sm text-text">{event.event_type}</div>
                    {event.payload_json ? (
                      <pre className="mt-1 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted">
                        {event.payload_json}
                      </pre>
                    ) : null}
                  </div>
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 break-all font-mono text-xs text-zinc-200">{value}</div>
    </div>
  );
}
