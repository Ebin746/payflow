import { forwardRef, useMemo, useState } from "react";

type DispatchResultItem = {
  employee_id: string;
  name: string;
  email: string;
  month: number;
  year: number;
  success: boolean;
  error?: string;
};

type DispatchProgress = {
  total: number;
  processed: number;
  success: number;
  failed: number;
  skipped: number;
};

type LiveDispatchPanelProps = {
  revealedCount: number;
  dispatchResults: DispatchResultItem[];
  dispatchProgress: DispatchProgress;
  progressPercent: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  allSent: boolean;
  isDispatching: boolean;
  onDownloadReport: () => void;
  onReupload: () => void;
};

const LiveDispatchPanel = forwardRef<HTMLDivElement, LiveDispatchPanelProps>(
  (
    {
      revealedCount,
      dispatchResults,
      dispatchProgress,
      progressPercent,
      sentCount,
      failedCount,
      skippedCount,
      allSent,
      isDispatching,
      onDownloadReport,
      onReupload,
    },
    ref
  ) => {
    const [sortKey, setSortKey] = useState<
      "recent" | "status" | "employee_id" | "name"
    >("recent");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const visibleResults = useMemo(
      () => dispatchResults.slice(0, revealedCount),
      [dispatchResults, revealedCount]
    );

    const sortedResults = useMemo(() => {
      if (sortKey === "recent") {
        return visibleResults;
      }

      const sorted = [...visibleResults];
      sorted.sort((a, b) => {
        if (sortKey === "status") {
          const getRank = (item: DispatchResultItem) => {
            if (item.success) {
              return 2;
            }
            if (item.error?.includes("not found")) {
              return 1;
            }
            return 0;
          };
          const rankA = getRank(a);
          const rankB = getRank(b);
          return sortDirection === "asc" ? rankA - rankB : rankB - rankA;
        }

        const valueA = String(a[sortKey] ?? "").toLowerCase();
        const valueB = String(b[sortKey] ?? "").toLowerCase();
        if (valueA < valueB) {
          return sortDirection === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      });
      return sorted;
    }, [visibleResults, sortDirection, sortKey]);

    return (
      <aside
      ref={ref}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold text-slate-900">
          Live dispatch
        </h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {revealedCount}/{dispatchResults.length}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Progress</span>
          <span>
            {dispatchProgress.processed}/{dispatchProgress.total} · {progressPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            Total Sent
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            {sentCount}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-500">
            Failed
          </p>
          <p className="mt-1 text-2xl font-semibold text-rose-700">
            {failedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-500">
            Skipped / Missing Record
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {skippedCount}
          </p>
        </div>
      </div>

      {allSent && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          All slips sent successfully.
        </div>
      )}

      {isDispatching && dispatchResults.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Dispatch in progress. Updates will appear here.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
          <span>Live updates</span>
          <div className="flex flex-wrap items-center gap-2">
            <span>{dispatchResults.length} total</span>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                Sort
              </span>
              <select
                value={sortKey}
                onChange={(event) =>
                  setSortKey(event.target.value as typeof sortKey)
                }
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
              >
                <option value="recent">Recent</option>
                <option value="status">Status</option>
                <option value="employee_id">Employee ID</option>
                <option value="name">Name</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setSortDirection((current) =>
                    current === "asc" ? "desc" : "asc"
                  )
                }
                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
              >
                {sortDirection === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
          {sortedResults.map((item, index) => {
            const isSkipped =
              !item.success && item.error?.includes("not found");
            const statusLabel = item.success
              ? "Sent"
              : isSkipped
                ? "Skipped"
                : "Failed";
            const statusClass = item.success
              ? "text-emerald-600"
              : isSkipped
                ? "text-amber-600"
                : "text-rose-600";

            return (
              <div
                key={`${item.employee_id}-${index}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-700">
                    {item.employee_id || "Unknown"}
                  </p>
                  <p className="text-slate-500">{item.name}</p>
                </div>
                <span className={`font-semibold ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
            );
          })}
          {dispatchResults.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
              Waiting for results...
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onDownloadReport}
          disabled={dispatchResults.length === 0}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            dispatchResults.length === 0
              ? "border-slate-200 text-slate-300"
              : "border-slate-300 text-slate-700 hover:border-slate-400"
          }`}
        >
          Download Report (CSV)
        </button>
        <button
          type="button"
          onClick={onReupload}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Start New Batch
        </button>
      </div>
    </aside>
    );
  }
);

LiveDispatchPanel.displayName = "LiveDispatchPanel";

export default LiveDispatchPanel;
