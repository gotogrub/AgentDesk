import type { SessionStatus } from "../api/client";

const styles: Record<SessionStatus, string> = {
  draft: "border-zinc-500/50 bg-zinc-500/10 text-zinc-200",
  running: "border-violet-400/50 bg-violet-500/15 text-violet-100",
  review: "border-amber-400/60 bg-amber-500/15 text-amber-100",
  done: "border-emerald-400/60 bg-emerald-500/15 text-emerald-100",
  failed: "border-red-400/60 bg-red-500/15 text-red-100",
  archived: "border-slate-500/50 bg-slate-500/10 text-slate-300"
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
