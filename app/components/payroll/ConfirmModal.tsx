type UploadType = "salary" | "employees";

type ConfirmModalProps = {
  uploadType: UploadType;
  employeeCount: number;
  isDispatching: boolean;
  progressPercent?: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  uploadType,
  employeeCount,
  isDispatching,
  progressPercent,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.7)]">
        <h3 className="text-lg font-display font-semibold text-slate-900">
          Confirm {uploadType === "employees" ? "upload" : "dispatch"}
        </h3>
        <p className="mt-3 text-sm text-slate-600">
          {uploadType === "employees"
            ? `You are about to save ${employeeCount} employees to the master list.`
            : `You are about to email ${employeeCount} employees. This cannot be undone.`}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            disabled={isDispatching}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDispatching}
            className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${
              isDispatching ? "bg-slate-400" : "bg-slate-900"
            }`}
          >
            {isDispatching ? (
              uploadType === "employees" ? (
                <span className="flex items-center gap-3">
                  <div className="w-40">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-300"
                        style={{ width: `${progressPercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <span>{progressPercent ?? 0}%</span>
                </span>
              ) : (
                "Processing..."
              )
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
