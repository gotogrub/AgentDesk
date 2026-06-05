import { X } from "lucide-react";
import { FormEvent, useState } from "react";

import { api } from "../api/client";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function NewProjectDialog({ open, onClose, onCreated, onError, onInfo }: Props) {
  const [name, setName] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createProject({ name: name.trim(), repo_path: repoPath.trim() });
      onInfo("Project added.");
      setName("");
      setRepoPath("");
      onCreated();
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        className="w-full max-w-lg rounded-md border border-line bg-panel shadow-2xl"
        onSubmit={(event) => void submit(event)}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Add Project</h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-line text-muted hover:border-accent hover:text-text"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Name</span>
            <input
              className="mt-1 w-full rounded border border-line bg-base px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="CRM"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Repository path</span>
            <input
              className="mt-1 w-full rounded border border-line bg-base px-3 py-2 font-mono text-sm text-text outline-none focus:border-accent"
              value={repoPath}
              onChange={(event) => setRepoPath(event.target.value)}
              placeholder="/home/mrv/Workplace/CRM"
              required
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            className="rounded border border-line px-3 py-2 text-sm text-text hover:border-accent"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded border border-violet-400 bg-violet-500/20 px-3 py-2 text-sm text-violet-50 hover:bg-violet-500/30"
            disabled={saving}
          >
            {saving ? "Adding..." : "Add Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
