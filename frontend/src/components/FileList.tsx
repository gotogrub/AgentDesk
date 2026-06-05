import type { GitStatusItem } from "../api/client";

export function FileList({ files }: { files: GitStatusItem[] }) {
  return (
    <div className="rounded-md border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-text">Git Status</h2>
      </div>
      <div className="max-h-64 overflow-auto p-3">
        {files.length === 0 ? (
          <div className="text-sm text-muted">No changed files.</div>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={`${file.status}-${file.path}`}
                className="grid grid-cols-[48px_1fr] gap-3 rounded border border-line/70 bg-base/40 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-accent">{file.status}</span>
                <span className="break-all font-mono text-xs text-zinc-200">{file.path}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
