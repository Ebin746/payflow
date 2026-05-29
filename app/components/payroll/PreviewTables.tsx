type UploadPreview = {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  totalRows: number;
};

type UploadType = "salary" | "employees";

type SortState = {
  key: string;
  direction: "asc" | "desc";
};

type TableColumn = {
  key: string;
  label: string;
};

type EmployeeLookup = {
  name: string;
  email: string;
};

type SortedRow = {
  row: UploadPreview["rows"][number];
  index: number;
};

type PreviewTablesProps = {
  preview: UploadPreview | null;
  uploadType: UploadType;
  warningCountForPreview: number;
  employeeCount: number;
  isEmployeeLookupLoading: boolean;
  sortedRows: SortedRow[];
  tableColumns: TableColumn[];
  sortState: SortState;
  employeeLookup: Record<string, EmployeeLookup>;
  missingEmployeeSet: Set<string>;
  validationErrors: Record<number, Record<string, string>>;
  onSort: (key: string) => void;
  onRemoveRow: (rowIndex: number) => void;
  onEditRow: (rowIndex: number) => void;
};

export default function PreviewTables({
  preview,
  uploadType,
  warningCountForPreview,
  employeeCount,
  isEmployeeLookupLoading,
  sortedRows,
  tableColumns,
  sortState,
  employeeLookup,
  missingEmployeeSet,
  validationErrors,
  onSort,
  onRemoveRow,
  onEditRow,
}: PreviewTablesProps) {
  const getEmployeeDetails = (employeeId: string) =>
    employeeLookup[employeeId] ?? { name: "", email: "" };

  const hasMissingValue = (
    row: Record<string, string | number | boolean | null>,
    columns: string[]
  ) =>
    columns.some((column) => {
      const value = row[column];
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === "string") {
        return value.trim() === "";
      }
      return false;
    });

  const getCellError = (rowIndex: number, columnKey: string) =>
    validationErrors[rowIndex]?.[columnKey] ?? "";

  return (
    <div className="min-w-0 space-y-4 transition-all duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-semibold text-slate-900">
            Preview table
          </h2>
          {preview && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={
                  warningCountForPreview > 0
                    ? "text-rose-600"
                    : "text-slate-500"
                }
              >
                {employeeCount} rows · {warningCountForPreview} warning
                {warningCountForPreview === 1 ? "" : "s"}
              </span>
              {uploadType === "salary" && isEmployeeLookupLoading && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                  Fetching employee details
                </span>
              )}
            </div>
          )}
        </div>
        {uploadType === "salary" && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur sm:w-auto sm:flex-nowrap">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Sort by
            </span>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
              <div className="relative w-full sm:w-auto">
                <select
                  value={sortState.key}
                  onChange={(event) => onSort(event.target.value)}
                  className="w-full appearance-none rounded-full border border-sky-200 bg-white/95 px-4 py-2 pr-10 text-sm font-semibold text-slate-700 shadow-md transition focus:border-sky-300 focus:outline-none"
                >
                  {tableColumns.map((column) => (
                    <option key={`sort-${column.key}`} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSort(sortState.key)}
                className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg sm:w-auto"
              >
                {sortState.direction === "asc" ? "Ascending" : "Descending"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-b from-sky-200 to-sky-100 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.06)] min-w-0">
        {preview ? (
          <div className="max-h-[520px] min-w-0">
            <div className="max-h-[520px] space-y-3 overflow-y-auto px-4 py-4 sm:hidden">
              {uploadType === "salary"
                ? sortedRows.map((item, rowIndex) => {
                    const employeeId = String(item.row.employee_id ?? "");
                    const isMissing = missingEmployeeSet.has(employeeId);
                    const employeeDetails = getEmployeeDetails(employeeId);
                    const hasMissingFields = hasMissingValue(
                      item.row,
                      preview.columns
                    );
                    const hasRowErrors =
                      Object.keys(validationErrors[item.index] ?? {}).length >
                      0;
                    const netSalaryValue =
                      typeof item.row.net_salary === "number"
                        ? item.row.net_salary
                        : Number(item.row.base_salary ?? 0) +
                          Number(item.row.hra ?? 0) +
                          Number(item.row.allowances ?? 0) -
                          Number(item.row.deductions ?? 0);
                    const netSalary = Number.isNaN(netSalaryValue)
                      ? null
                      : netSalaryValue;

                    return (
                      <div
                        key={`mobile-${rowIndex}-${employeeId}`}
                        className={`rounded-2xl border px-4 py-3 shadow-sm transition hover:shadow-md ${
                            hasMissingFields || hasRowErrors
                              ? "border-rose-300 bg-rose-100/80"
                              : "border-sky-200/80 bg-sky-50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {employeeId || "Unknown"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {employeeDetails.name || "—"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {employeeDetails.email || "—"}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => onEditRow(item.index)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                              aria-label="Edit row"
                            >
                              <svg
                                aria-hidden="true"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveRow(item.index)}
                              className="flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                              aria-label="Remove row"
                            >
                              <svg
                                aria-hidden="true"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M6 6l1 14h10l1-14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {isMissing && (
                          <p className="mt-2 text-xs text-amber-600">
                            Employee not found. Will be skipped.
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400">Base</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.base_salary ?? "")}
                            </p>
                            {getCellError(item.index, "base_salary") && (
                              <p className="mt-1 text-[11px] text-rose-600">
                                {getCellError(item.index, "base_salary")}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400">Net</span>
                            <p className="font-semibold text-emerald-700">
                              {String(netSalary ?? "")}
                            </p>
                            {getCellError(item.index, "net_salary") && (
                              <p className="mt-1 text-[11px] text-rose-600">
                                {getCellError(item.index, "net_salary")}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400">HRA</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.hra ?? "")}
                            </p>
                            {getCellError(item.index, "hra") && (
                              <p className="mt-1 text-[11px] text-rose-600">
                                {getCellError(item.index, "hra")}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400">Allowances</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.allowances ?? "")}
                            </p>
                            {getCellError(item.index, "allowances") && (
                              <p className="mt-1 text-[11px] text-rose-600">
                                {getCellError(item.index, "allowances")}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400">Deductions</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.deductions ?? "")}
                            </p>
                            {getCellError(item.index, "deductions") && (
                              <p className="mt-1 text-[11px] text-rose-600">
                                {getCellError(item.index, "deductions")}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400">Month/Year</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.month ?? "")}/
                              {String(item.row.year ?? "")}
                            </p>
                            {(getCellError(item.index, "month") ||
                              getCellError(item.index, "year")) && (
                              <p className="mt-1 text-[11px] text-rose-600">
                                {getCellError(item.index, "month") ||
                                  getCellError(item.index, "year")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                : preview.rows.map((row, rowIndex) => {
                    const hasMissingFields = hasMissingValue(
                      row,
                      preview.columns
                    );
                    const hasRowErrors =
                      Object.keys(validationErrors[rowIndex] ?? {}).length > 0;
                    return (
                      <div
                        key={`mobile-employee-${rowIndex}`}
                        className={`rounded-2xl border px-4 py-3 shadow-sm transition hover:shadow-md ${
                            hasMissingFields || hasRowErrors
                              ? "border-rose-300 bg-rose-100/80"
                              : "border-sky-200/80 bg-sky-50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                            {String(row.employee_id ?? "") || "Employee"}
                          </p>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => onEditRow(rowIndex)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                              aria-label="Edit row"
                            >
                              <svg
                                aria-hidden="true"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveRow(rowIndex)}
                              className="flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                              aria-label="Remove row"
                            >
                              <svg
                                aria-hidden="true"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M6 6l1 14h10l1-14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2 text-xs text-slate-600">
                          {preview.columns.map((column) => {
                            const errorText = getCellError(rowIndex, column);
                            return (
                              <div key={`mobile-${rowIndex}-${column}`}>
                                <span className="text-slate-400">
                                  {column}
                                </span>
                                <p className="font-semibold text-slate-700">
                                  {String(row[column] ?? "")}
                                </p>
                                {errorText && (
                                  <p className="mt-1 text-[11px] text-rose-600">
                                    {errorText}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
            </div>

            <div className="hidden max-h-[520px] overflow-x-auto overflow-y-auto sm:block min-w-0 flex justify-center">
              {uploadType === "salary" ? (
                <table className="min-w-[1200px] w-max table-auto border-collapse text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-sky-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {tableColumns.map((column) => (
                        <th
                          key={column.key}
                          className="border-b border-sky-200/80 px-3 py-2 font-semibold sm:px-4 sm:py-3"
                        >
                          <button
                            type="button"
                            onClick={() => onSort(column.key)}
                            className="flex items-center gap-2"
                          >
                            {column.label}
                            {sortState.key === column.key && (
                              <span className="text-[10px] text-slate-400">
                                {sortState.direction === "asc" ? "A-Z" : "Z-A"}
                              </span>
                            )}
                          </button>
                        </th>
                      ))}
                      <th className="border-b border-slate-200/80 px-3 py-2 text-right text-[11px] font-semibold text-slate-500 sm:px-4 sm:py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((item, rowIndex) => {
                      const employeeId = String(item.row.employee_id ?? "");
                      const isMissing = missingEmployeeSet.has(employeeId);
                      const employeeDetails = employeeLookup[employeeId];
                      const hasMissingFields = hasMissingValue(
                        item.row,
                        preview.columns
                      );
                      const hasRowErrors =
                        Object.keys(validationErrors[item.index] ?? {}).length >
                        0;
                      const netSalaryValue =
                        typeof item.row.net_salary === "number"
                          ? item.row.net_salary
                          : Number(item.row.base_salary ?? 0) +
                            Number(item.row.hra ?? 0) +
                            Number(item.row.allowances ?? 0) -
                            Number(item.row.deductions ?? 0);
                      const netSalary = Number.isNaN(netSalaryValue)
                        ? null
                        : netSalaryValue;

                      return (
                        <tr
                          key={`${rowIndex}-${employeeId || rowIndex}`}
                          className={
                            hasMissingFields || hasRowErrors
                              ? "bg-rose-100/80"
                              : "odd:bg-white even:bg-sky-100/60"
                          }
                        >
                          {tableColumns.map((column) => {
                            let value: string | number | boolean | null =
                              column.key === "net_salary"
                                ? netSalary
                                : item.row[column.key];
                            if (column.key === "name") {
                              value = employeeDetails?.name ?? null;
                            }
                            if (column.key === "email") {
                              value = employeeDetails?.email ?? null;
                            }
                            const isTextColumn =
                              column.key === "name" || column.key === "email";
                            const cellClass =
                              column.key === "net_salary"
                                ? "bg-emerald-50/60 text-emerald-800"
                                : "text-slate-700";
                            const responsiveCellClass = isTextColumn
                              ? "whitespace-normal break-words"
                              : "whitespace-nowrap";

                            const errorText = getCellError(
                              item.index,
                              column.key
                            );
                            return (
                              <td
                                key={`${rowIndex}-${column.key}`}
                                className={`border-b border-sky-200/80 px-3 py-2 sm:px-4 sm:py-3 ${cellClass} ${responsiveCellClass}`}
                              >
                                {column.key === "employee_id" ? (
                                  <div className="flex items-center gap-2">
                                    <span>{String(value ?? "")}</span>
                                    {isMissing && (
                                      <span
                                        title="This employee ID was not found. They will be skipped."
                                        className="text-amber-500"
                                      >
                                        ⚠️
                                      </span>
                                    )}
                                  </div>
                                ) : column.key === "name" ||
                                  column.key === "email" ? (
                                  isEmployeeLookupLoading ? (
                                    <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                                  ) : isMissing ? (
                                    <span className="text-rose-600">
                                      Not found
                                    </span>
                                  ) : (
                                    String(value ?? "")
                                  )
                                ) : (
                                  <span>{String(value ?? "")}</span>
                                )}
                                {errorText && (
                                  <span className="mt-1 block text-[11px] text-rose-600">
                                    {errorText}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border-b border-slate-100/80 px-3 py-2 text-right sm:px-4 sm:py-3">
                            <div className="flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={() => onEditRow(item.index)}
                                className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1 text-slate-700 hover:text-slate-900"
                                aria-label="Edit row"
                              >
                                <svg
                                  aria-hidden="true"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveRow(item.index)}
                                className="inline-flex items-center justify-center rounded-md border border-rose-300 bg-rose-100 p-1 text-rose-700 hover:bg-rose-200"
                                aria-label="Remove row"
                              >
                                <svg
                                  aria-hidden="true"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M6 6l1 14h10l1-14" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full table-auto border-collapse text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-sky-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {preview.columns.map((column) => (
                        <th
                          key={column}
                          className="border-b border-sky-200/80 px-3 py-2 font-semibold sm:px-4 sm:py-3"
                        >
                          {column}
                        </th>
                      ))}
                      <th className="border-b border-slate-200/80 px-3 py-2 text-right text-[11px] font-semibold text-slate-500 sm:px-4 sm:py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, rowIndex) => {
                      const hasMissingFields = hasMissingValue(
                        row,
                        preview.columns
                      );
                      const hasRowErrors =
                        Object.keys(validationErrors[rowIndex] ?? {}).length >
                        0;
                      return (
                        <tr
                          key={`employee-${rowIndex}`}
                          className={
                            hasMissingFields || hasRowErrors
                              ? "bg-rose-100/80"
                              : "odd:bg-white even:bg-sky-100/60"
                          }
                        >
                          {preview.columns.map((column) => {
                            const errorText = getCellError(rowIndex, column);
                            return (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="border-b border-sky-200/80 px-3 py-2 text-slate-700 sm:px-4 sm:py-3"
                              >
                                <span className="block whitespace-normal break-words">
                                  {String(row[column] ?? "")}
                                </span>
                                {errorText && (
                                  <span className="mt-1 block text-[11px] text-rose-600">
                                    {errorText}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border-b border-slate-100/80 px-3 py-2 text-right sm:px-4 sm:py-3">
                            <div className="flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={() => onEditRow(rowIndex)}
                                className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1 text-slate-700 hover:text-slate-900"
                                aria-label="Edit row"
                              >
                                <svg
                                  aria-hidden="true"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveRow(rowIndex)}
                                className="inline-flex items-center justify-center rounded-md border border-rose-300 bg-rose-100 p-1 text-rose-700 hover:bg-rose-200"
                                aria-label="Remove row"
                              >
                                <svg
                                  aria-hidden="true"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M6 6l1 14h10l1-14" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-slate-500">
            Upload a file to preview the data.
          </div>
        )}
      </div>
    </div>
  );
}
