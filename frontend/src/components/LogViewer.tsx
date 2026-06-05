import { Copy, RefreshCw } from "lucide-react";

type Props = {
  raw: string;
  logPath: string;
  exists: boolean;
  truncated?: boolean;
  loading?: boolean;
  onRefresh: () => void;
  onCopyPath: () => void;
};

export function LogViewer({
  raw,
  logPath,
  exists,
  truncated,
  loading,
  onRefresh,
  onCopyPath
}: Props) {
  return (
    <section className="rounded-md border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Process Logs</h2>
          <div className="mt-1 break-all font-mono text-xs text-muted">{logPath}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex h-8 items-center gap-2 rounded border border-line px-3 text-xs text-text hover:border-accent"
            onClick={onCopyPath}
            title="Copy log path"
            type="button"
          >
            <Copy size={14} />
            Copy Path
          </button>
          <button
            className="inline-flex h-8 items-center gap-2 rounded border border-line px-3 text-xs text-text hover:border-accent"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh process logs"
            type="button"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>
      <pre className="scrollbar-thin max-h-[520px] min-h-40 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-zinc-200">
        {exists ? raw || "Log file is empty." : "No Codex process log yet."}
      </pre>
      {truncated ? (
        <div className="border-t border-line px-4 py-2 text-xs text-amber-200">
          Showing the tail of a large log file.
        </div>
      ) : null}
    </section>
  );
}
