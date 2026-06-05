import { RefreshCw } from "lucide-react";

type Props = {
  diff: string;
  truncated?: boolean;
  loading?: boolean;
  onRefresh: () => void;
};

export function DiffViewer({ diff, truncated, loading, onRefresh }: Props) {
  return (
    <section className="rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-text">Diff</h2>
        <button
          className="inline-flex h-8 items-center gap-2 rounded border border-line px-3 text-xs text-text hover:border-accent"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh diff"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
      <pre className="scrollbar-thin max-h-[520px] overflow-auto p-4 text-xs leading-5 text-zinc-200">
        {diff || "No diff loaded."}
      </pre>
      {truncated ? (
        <div className="border-t border-line px-4 py-2 text-xs text-amber-200">Diff was truncated.</div>
      ) : null}
    </section>
  );
}
