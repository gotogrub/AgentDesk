import { X } from "lucide-react";
import { FormEvent, useState } from "react";

import { api } from "../api/client";

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (sessionId: string) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function NewSessionDialog({ projectId, open, onClose, onCreated, onError, onInfo }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const session = await api.createSession(projectId, {
        title: title.trim(),
        description: description.trim()
      });
      onInfo("Agent task created.");
      setTitle("");
      setDescription("");
      onCreated(session.id);
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
        className="w-full max-w-2xl rounded-md border border-line bg-panel shadow-2xl"
        onSubmit={(event) => void submit(event)}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-text">New Agent Task</h2>
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
            <span className="text-xs uppercase tracking-wide text-muted">Title</span>
            <input
              className="mt-1 w-full rounded border border-line bg-base px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Fix contract autofill"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-muted">Description</span>
            <textarea
              className="mt-1 min-h-32 w-full resize-y rounded border border-line bg-base px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Find why contract form fields are empty and fix autofill."
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
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
