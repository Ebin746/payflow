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

type RemovedRow = {
  row: Record<string, string | number | boolean | null>;
  reason: string;
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
  removedRows: RemovedRow[];
  onSort: (key: string) => void;
  onRemoveRow: (rowIndex: number) => void;
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
  removedRows,
  onSort,
  onRemoveRow,
}: PreviewTablesProps) {
  const getEmployeeDetails = (employeeId: string) =>
    employeeLookup[employeeId] ?? { name: "", email: "" };

  return (
    <div className="space-y-4 transition-all duration-500">
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
                  className="w-full appearance-none rounded-xl border border-slate-200/80 bg-white px-3 py-2 pr-8 text-xs font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
                >
                  {tableColumns.map((column) => (
                    <option key={`sort-${column.key}`} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  ▼
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSort(sortState.key)}
                className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 sm:w-auto"
              >
                {sortState.direction === "asc" ? "Ascending" : "Descending"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_24px_60px_-48px_rgba(15,23,42,0.6)]">
        {preview ? (
          <div className="max-h-[520px]">
            <div className="space-y-3 px-4 py-4 sm:hidden">
              {uploadType === "salary"
                ? sortedRows.map((item, rowIndex) => {
                    const employeeId = String(item.row.employee_id ?? "");
                    const isMissing = missingEmployeeSet.has(employeeId);
                    const employeeDetails = getEmployeeDetails(employeeId);
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
                        className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {employeeId || "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {employeeDetails.name || "—"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {employeeDetails.email || "—"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveRow(item.index)}
                            className="text-xs font-semibold text-rose-600"
                          >
                            Remove
                          </button>
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
                          </div>
                          <div>
                            <span className="text-slate-400">Net</span>
                            <p className="font-semibold text-emerald-700">
                              {String(netSalary ?? "")}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">HRA</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.hra ?? "")}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Allowances</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.allowances ?? "")}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Deductions</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.deductions ?? "")}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Month/Year</span>
                            <p className="font-semibold text-slate-700">
                              {String(item.row.month ?? "")}/
                              {String(item.row.year ?? "")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                : preview.rows.map((row, rowIndex) => (
                    <div
                      key={`mobile-employee-${rowIndex}`}
                      className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {String(row.employee_id ?? "") || "Employee"}
                        </p>
                        <button
                          type="button"
                          onClick={() => onRemoveRow(rowIndex)}
                          className="text-xs font-semibold text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        {preview.columns.map((column) => (
                          <div key={`mobile-${rowIndex}-${column}`}>
                            <span className="text-slate-400">
                              {column}
                            </span>
                            <p className="font-semibold text-slate-700">
                              {String(row[column] ?? "")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
            </div>
            <div className="hidden max-h-[520px] overflow-x-auto overflow-y-auto sm:block">
            {uploadType === "salary" ? (
              <table className="w-full min-w-full table-auto border-collapse text-left text-xs sm:text-sm lg:min-w-[980px] lg:table-fixed">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        key={column.key}
                        className="border-b border-slate-200/80 px-3 py-2 font-semibold sm:px-4 sm:py-3"
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
                        className="odd:bg-white even:bg-slate-50/60"
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
                            ? "max-w-[120px] truncate sm:max-w-[200px] sm:whitespace-normal sm:break-words"
                            : "whitespace-nowrap";

                          return (
                            <td
                              key={`${rowIndex}-${column.key}`}
                              className={`border-b border-slate-100/80 px-3 py-2 sm:px-4 sm:py-3 ${cellClass} ${responsiveCellClass}`}
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
                                String(value ?? "")
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-slate-100 px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onRemoveRow(item.index)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-full table-auto border-collapse text-left text-xs sm:text-sm lg:min-w-[760px] lg:table-fixed">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    {preview.columns.map((column) => (
                      <th
                        key={column}
                        className="border-b border-slate-200/80 px-3 py-2 font-semibold sm:px-4 sm:py-3"
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
                  {preview.rows.map((row, rowIndex) => (
                    <tr
                      key={`employee-${rowIndex}`}
                      className="odd:bg-white even:bg-slate-50/60"
                    >
                      {preview.columns.map((column) => (
                          <td
                            key={`${rowIndex}-${column}`}
                            className="border-b border-slate-100/80 px-3 py-2 text-slate-700 sm:px-4 sm:py-3"
                          >
                            <span className="block truncate sm:whitespace-normal sm:break-words">
                              {String(row[column] ?? "")}
                            </span>
                          </td>
                      ))}
                      <td className="border-b border-slate-100/80 px-3 py-2 text-right sm:px-4 sm:py-3">
                        <button
                          type="button"
                          onClick={() => onRemoveRow(rowIndex)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {removedRows.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-rose-200/70 bg-rose-50/40 shadow-[0_20px_50px_-40px_rgba(244,63,94,0.4)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-rose-700">
                Removed rows
              </h3>
              <p className="text-xs text-rose-600">
                {removedRows.length} rows moved out of the preview
              </p>
            </div>
          </div>
          <div className="max-h-[260px]">
            <div className="space-y-3 px-4 py-4 sm:hidden">
              {removedRows.map((removed, index) => (
                <div
                  key={`removed-mobile-${index}`}
                  className="rounded-2xl border border-rose-200/80 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="text-xs font-semibold text-rose-700">
                    {removed.reason}
                  </div>
                  <div className="mt-2 space-y-2 text-xs text-rose-700/80">
                    {uploadType === "salary"
                      ? tableColumns.map((column) => {
                          let value = removed.row[column.key];
                          if (column.key === "name") {
                            value =
                              employeeLookup[
                                String(removed.row.employee_id ?? "")
                              ]?.name ?? "";
                          }
                          if (column.key === "email") {
                            value =
                              employeeLookup[
                                String(removed.row.employee_id ?? "")
                              ]?.email ?? "";
                          }
                          return (
                            <div key={`removed-mobile-${index}-${column.key}`}>
                              <span className="text-rose-400">
                                {column.label}
                              </span>
                              <p className="font-semibold text-rose-700">
                                {String(value ?? "")}
                              </p>
                            </div>
                          );
                        })
                      : preview?.columns.map((column) => (
                          <div key={`removed-mobile-${index}-${column}`}>
                            <span className="text-rose-400">{column}</span>
                            <p className="font-semibold text-rose-700">
                              {String(removed.row[column] ?? "")}
                            </p>
                          </div>
                        ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden max-h-[260px] overflow-x-auto overflow-y-auto sm:block">
              <table className="w-full min-w-full table-auto border-collapse text-left text-[11px] sm:text-xs lg:min-w-[980px] lg:table-fixed">
              <thead className="sticky top-0 bg-rose-100/80 text-[10px] uppercase tracking-wide text-rose-700 sm:text-[11px]">
                <tr>
                  {uploadType === "salary" ? (
                    <>
                      {tableColumns.map((column) => (
                        <th
                          key={`removed-${column.key}`}
                          className="border-b border-rose-200/80 px-3 py-2 font-semibold sm:px-4"
                        >
                          {column.label}
                        </th>
                      ))}
                    </>
                  ) : (
                    <>
                      {preview?.columns.map((column) => (
                        <th
                          key={`removed-${column}`}
                          className="border-b border-rose-200/80 px-3 py-2 font-semibold sm:px-4"
                        >
                          {column}
                        </th>
                      ))}
                    </>
                  )}
                  <th className="border-b border-rose-200/80 px-3 py-2 text-right font-semibold sm:px-4">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="text-rose-900/80">
                {removedRows.map((removed, index) => (
                  <tr
                    key={`removed-row-${index}`}
                    className="odd:bg-rose-50/40 even:bg-rose-100/30"
                  >
                    {uploadType === "salary" ? (
                      <>
                        {tableColumns.map((column) => {
                          let value = removed.row[column.key];
                          if (column.key === "name") {
                            value =
                              employeeLookup[
                                String(removed.row.employee_id ?? "")
                              ]?.name ?? "";
                          }
                          if (column.key === "email") {
                            value =
                              employeeLookup[
                                String(removed.row.employee_id ?? "")
                              ]?.email ?? "";
                          }
                          const isTextColumn =
                            column.key === "name" || column.key === "email";
                          const responsiveCellClass = isTextColumn
                            ? "max-w-[120px] truncate sm:max-w-[200px] sm:whitespace-normal sm:break-words"
                            : "whitespace-nowrap";

                          return (
                            <td
                              key={`removed-${index}-${column.key}`}
                              className={`border-b border-rose-200/80 px-3 py-2 sm:px-4 ${responsiveCellClass}`}
                            >
                              {String(value ?? "")}
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        {preview?.columns.map((column) => (
                          <td
                            key={`removed-${index}-${column}`}
                            className="border-b border-rose-200/80 px-3 py-2 sm:px-4"
                          >
                            <span className="block truncate sm:whitespace-normal sm:break-words">
                              {String(removed.row[column] ?? "")}
                            </span>
                          </td>
                        ))}
                      </>
                    )}
                    <td className="border-b border-rose-200/80 px-3 py-2 text-right font-semibold sm:px-4">
                      {removed.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
