import type { FormEvent } from "react";

type RowEditModalProps = {
  isOpen: boolean;
  rowIndex: number | null;
  columns: string[];
  row: Record<string, string | number | boolean | null> | null;
  nonEditableColumns: string[];
  onCancel: () => void;
  onSave: (rowIndex: number, updatedRow: Record<string, string>) => void;
};

const getInputMode = (columnKey: string) => {
  if (["month", "year"].includes(columnKey)) {
    return "numeric" as const;
  }
  if (
    [
      "base_salary",
      "hra",
      "allowances",
      "deductions",
      "net_salary",
      "birth_year",
    ].includes(columnKey)
  ) {
    return "decimal" as const;
  }
  return "text" as const;
};

export default function RowEditModal({
  isOpen,
  rowIndex,
  columns,
  row,
  nonEditableColumns,
  onCancel,
  onSave,
}: RowEditModalProps) {
  if (!isOpen || rowIndex === null || !row) {
    return null;
  }

  const editableColumns = columns.filter(
    (column) => !nonEditableColumns.includes(column)
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updatedRow: Record<string, string> = {};

    editableColumns.forEach((column) => {
      const value = formData.get(column);
      updatedRow[column] = typeof value === "string" ? value : "";
    });

    onSave(rowIndex, updatedRow);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.7)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-display font-semibold text-slate-900">
              Edit row
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Update the missing or incorrect fields. Locked fields stay read-only.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {columns.map((column) => {
              const isEditable = !nonEditableColumns.includes(column);
              const value = String(row[column] ?? "");
              return (
                <label key={column} className="space-y-1 text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wide">
                    {column}
                  </span>
                  {isEditable ? (
                    <input
                      name={column}
                      defaultValue={value}
                      inputMode={getInputMode(column)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                      {value || "—"}
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
