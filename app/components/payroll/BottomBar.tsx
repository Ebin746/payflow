type UploadType = "salary" | "employees";

type BottomBarProps = {
  uploadType: UploadType;
  isDispatching: boolean;
  isLoading: boolean;
  missingColumnsCount: number;
  hasBlockingIssues: boolean;
  dispatchLocked: boolean;
  progressPercent?: number;
  onReupload: () => void;
  onOpenConfirm: () => void;
};

export default function BottomBar({
  uploadType,
  isDispatching,
  isLoading,
  missingColumnsCount,
  hasBlockingIssues,
  dispatchLocked,
  progressPercent,
  onReupload,
  onOpenConfirm,
}: BottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 px-6 py-4 shadow-[0_-20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-500">
          {hasBlockingIssues
            ? "Resolve highlighted issues before confirming."
            : "Review the table before confirming."}
        </span>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onReupload}
            className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 sm:w-auto"
          >
            &larr; Re-upload
          </button>
          {!dispatchLocked && (
            <button
              type="button"
              disabled={
                missingColumnsCount > 0 ||
                hasBlockingIssues ||
                isLoading ||
                isDispatching
              }
              onClick={onOpenConfirm}
              className={`w-full rounded-full px-6 py-2 text-sm font-semibold text-white transition sm:w-auto ${
                missingColumnsCount > 0 ||
                hasBlockingIssues ||
                isLoading ||
                isDispatching
                  ? "bg-slate-400"
                  : "bg-slate-900 hover:-translate-y-0.5"
              }`}
            >
              {isDispatching ? (
                uploadType === "employees" ? (
                  <span className="flex w-full items-center gap-3">
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-white transition-all duration-300"
                          style={{ width: `${progressPercent ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{progressPercent ?? 0}%</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Processing...
                  </span>
                )
              ) : (
                <span>
                  {uploadType === "employees"
                    ? "Confirm &amp; Save Employees →"
                    : "Confirm &amp; Dispatch →"}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
