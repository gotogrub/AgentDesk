import { Copy, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { api, type Attachment } from "../api/client";

type Props = {
  sessionId: string;
  attachments: Attachment[];
  onChanged: () => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function AttachmentDropzone({ sessionId, attachments, onChanged, onError, onInfo }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadAttachment(sessionId, file);
      }
      onInfo("Attachment uploaded.");
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function deleteAttachment(attachment: Attachment) {
    if (!window.confirm(`Delete attachment ${attachment.file_name}?`)) return;
    try {
      await api.deleteAttachment(attachment.id);
      onInfo("Attachment deleted.");
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-text">Attachments</h2>
        <button
          className="inline-flex h-8 items-center gap-2 rounded border border-line px-3 text-xs text-text hover:border-accent"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={14} />
          Upload
        </button>
      </div>
      <div
        className={`m-4 rounded-md border border-dashed p-5 text-center ${
          dragging ? "border-accent bg-violet-500/10" : "border-line bg-base/40"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) {
            void uploadFiles(event.dataTransfer.files);
          }
        }}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.txt,.md,.pdf"
          onChange={(event) => {
            if (event.target.files?.length) void uploadFiles(event.target.files);
          }}
        />
        <Paperclip className="mx-auto mb-2 text-muted" size={20} />
        <div className="text-sm text-text">{uploading ? "Uploading..." : "Drop files here"}</div>
        <div className="mt-1 text-xs text-muted">png, jpg, jpeg, webp, txt, md, pdf. Max 25 MB.</div>
      </div>
      <div className="space-y-2 px-4 pb-4">
        {attachments.length === 0 ? (
          <div className="text-sm text-muted">No attachments yet.</div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="grid gap-2 rounded border border-line bg-base/40 p-3 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="text-sm font-medium text-text">{attachment.file_name}</div>
                <div className="break-all font-mono text-xs text-muted">{attachment.file_path}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-8 items-center gap-2 rounded border border-line px-2 text-xs text-text hover:border-accent"
                  onClick={() => {
                    void navigator.clipboard.writeText(attachment.file_path);
                    onInfo("Path copied.");
                  }}
                  title="Copy attachment path"
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button
                  className="inline-flex h-8 items-center gap-2 rounded border border-red-500/40 px-2 text-xs text-red-100 hover:border-red-300"
                  onClick={() => void deleteAttachment(attachment)}
                  title="Delete attachment"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
