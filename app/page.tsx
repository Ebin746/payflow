"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UploadPreview = {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  totalRows: number;
};

type DispatchResultItem = {
  employee_id: string;
  name: string;
  email: string;
  month: number;
  year: number;
  success: boolean;
  error?: string;
};

type UploadType = "salary" | "employees";

const REQUIRED_COLUMNS = [
  "employee_id",
  "base_salary",
  "hra",
  "allowances",
  "deductions",
  "month",
  "year",
];

const EMPLOYEE_REQUIRED_COLUMNS = [
  "employee_id",
  "name",
  "email",
  "designation",
];

const TABLE_COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "base_salary", label: "Base Salary" },
  { key: "hra", label: "HRA" },
  { key: "allowances", label: "Allowances" },
  { key: "deductions", label: "Deductions" },
  { key: "net_salary", label: "Net Salary" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

type SortState = {
  key: string;
  direction: "asc" | "desc";
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getExtension(filename: string) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

export default function Home() {
  const [uploadType, setUploadType] = useState<UploadType>("salary");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);
  const [dispatchResults, setDispatchResults] = useState<DispatchResultItem[]>(
    []
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [revealedCount, setRevealedCount] = useState(0);
  const [sortState, setSortState] = useState<SortState>({
    key: "employee_id",
    direction: "asc",
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const requiredColumns =
    uploadType === "employees" ? EMPLOYEE_REQUIRED_COLUMNS : REQUIRED_COLUMNS;

  const sampleCsv = useMemo(() => {
    const header = requiredColumns.join(",");
    const sampleRow =
      uploadType === "employees"
        ? "EMP001,Jordan Lee,jordan.lee@payflow.com,Accountant"
        : "EMP001,60000,12000,3000,1500,5,2026";
    return `data:text/csv;charset=utf-8,${encodeURIComponent(
      `${header}\n${sampleRow}`
    )}`;
  }, [requiredColumns, uploadType]);

  async function handleUpload(file: File) {
    setSelectedFile(file);
    setPreview(null);
    setMissingColumns([]);
    setMissingEmployees([]);
    setErrorMessage(null);
    setDispatchMessage(null);
    setDispatchResults([]);
    setExpandedRows(new Set());
    setRevealedCount(0);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | UploadPreview
        | { error: string };

      if (!response.ok) {
        const message =
          "error" in payload ? payload.error : "Upload failed";
        throw new Error(message);
      }

      const previewPayload = payload as UploadPreview;
      setPreview(previewPayload);

      const missing = requiredColumns.filter(
        (column) => !previewPayload.columns.includes(column)
      );
      setMissingColumns(missing);

      if (missing.length === 0 && uploadType === "salary") {
        const employeeIds = previewPayload.rows
          .map((row) => String(row.employee_id ?? "").trim())
          .filter(Boolean);

        if (employeeIds.length > 0) {
          const validateResponse = await fetch("/api/employees/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeIds }),
          });
          const validatePayload = (await validateResponse.json()) as
            | { missingEmployeeIds: string[] }
            | { error: string };

          if (validateResponse.ok) {
            setMissingEmployees(validatePayload.missingEmployeeIds ?? []);
          }
        }
      }

      requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSort(key: string) {
    setSortState((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  }

  async function handleDispatch() {
    if (!preview || missingColumns.length > 0 || isDispatching) {
      return;
    }

    setIsDispatching(true);
    setDispatchMessage(null);

    try {
      const endpoint =
        uploadType === "employees" ? "/api/employees" : "/api/dispatch";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows }),
      });
      const payload = (await response.json()) as
        | {
            matchedEmployees?: number;
            results?: DispatchResultItem[];
            employeesUpserted?: number;
          }
        | { error: string };

      console.log("dispatch response", payload);

      if (!response.ok) {
        const message = "error" in payload ? payload.error : "Dispatch failed";
        throw new Error(message);
      }

      if (uploadType === "employees") {
        setDispatchResults([]);
        setDispatchMessage(
          `Employee upload complete. ${payload.employeesUpserted ?? 0} records saved.`
        );
      } else {
        if (!payload.results) {
          throw new Error("Dispatch response missing results.");
        }

        setDispatchResults(payload.results);
        const successCount = payload.results.filter((item) => item.success).length;
        setDispatchMessage(
          `Dispatch complete. ${successCount} sent, ${payload.results.length - successCount} failed.`
        );
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "Dispatch failed";
      setDispatchMessage(message);
    } finally {
      setIsDispatching(false);
      setShowConfirmModal(false);
    }
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }

  function handleReupload() {
    setSelectedFile(null);
    setPreview(null);
    setMissingColumns([]);
    setMissingEmployees([]);
    setErrorMessage(null);
    setDispatchMessage(null);
    setDispatchResults([]);
    setExpandedRows(new Set());
    setRevealedCount(0);
    setIsLoading(false);
    setIsDispatching(false);
    setShowConfirmModal(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleUploadTypeChange(type: UploadType) {
    if (type === uploadType) {
      return;
    }
    setUploadType(type);
    handleReupload();
  }

  const extension = selectedFile ? getExtension(selectedFile.name) : "";
  const warningCount = uploadType === "salary" ? missingEmployees.length : 0;
  const employeeCount = preview?.rows.length ?? 0;
  const totalResults = dispatchResults.length;
  const sentCount = dispatchResults.filter((item) => item.success).length;
  const failedCount = dispatchResults.filter((item) => !item.success).length;
  const skippedCount = dispatchResults.filter(
    (item) => !item.success && item.error?.includes("not found")
  ).length;
  const allSent = totalResults > 0 && failedCount === 0;
  const showLivePanel =
    uploadType === "salary" && (isDispatching || dispatchResults.length > 0);

  function handleDownloadReport() {
    if (dispatchResults.length === 0) {
      return;
    }
    const header = ["employee_id", "name", "email", "status", "reason"];
    const rows = dispatchResults.map((item) => [
      item.employee_id,
      item.name,
      item.email,
      item.success
        ? "Sent"
        : item.error?.includes("not found")
          ? "Skipped"
          : "Failed",
      item.error ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dispatch-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toggleExpandedRow(key: string) {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const missingEmployeeSet = useMemo(
    () => new Set(missingEmployees),
    [missingEmployees]
  );

  const sortedRows = useMemo(() => {
    if (!preview) {
      return [];
    }
    const rowsCopy = [...preview.rows];
    const { key, direction } = sortState;

    const getSortableValue = (row: UploadPreview["rows"][number]) => {
      if (key === "net_salary") {
        if (row.net_salary !== null && row.net_salary !== undefined) {
          return Number(row.net_salary);
        }
        return (
          Number(row.base_salary ?? 0) +
          Number(row.hra ?? 0) +
          Number(row.allowances ?? 0) -
          Number(row.deductions ?? 0)
        );
      }
      return row[key];
    };

    rowsCopy.sort((a, b) => {
      const valueA = getSortableValue(a);
      const valueB = getSortableValue(b);
      const numericA = Number(valueA);
      const numericB = Number(valueB);
      const bothNumeric = !Number.isNaN(numericA) && !Number.isNaN(numericB);

      if (bothNumeric) {
        return direction === "asc" ? numericA - numericB : numericB - numericA;
      }

      const textA = String(valueA ?? "").toLowerCase();
      const textB = String(valueB ?? "").toLowerCase();
      if (textA < textB) {
        return direction === "asc" ? -1 : 1;
      }
      if (textA > textB) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return rowsCopy;
  }, [preview, sortState]);

  useEffect(() => {
    if (dispatchResults.length === 0) {
      setRevealedCount(0);
      return;
    }

    setRevealedCount(0);
    const intervalId = window.setInterval(() => {
      setRevealedCount((current) => {
        if (current >= dispatchResults.length) {
          window.clearInterval(intervalId);
          return current;
        }
        return current + 1;
      });
    }, 220);

    return () => window.clearInterval(intervalId);
  }, [dispatchResults]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(252,252,250,1)_0%,_rgba(240,243,248,1)_45%,_rgba(230,236,244,1)_100%)]">
      <div
        className={`mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-10 ${
          preview ? "pb-32" : ""
        }`}
      >
        <header className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Payroll Console
          </p>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Upload payroll data, validate, and preview slips
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Drag in your payroll workbook to validate columns, inspect the
            preview table, and confirm only when everything checks out.
          </p>
        </header>

        {missingColumns.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            <span className="font-semibold">Missing columns:</span>{" "}
            {missingColumns.join(", ")}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            {errorMessage}
          </div>
        )}

        {dispatchMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
            {dispatchMessage}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-display font-semibold text-slate-900">
                  Instructions
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Upload a CSV or XLSX file. We will extract the first sheet and
                  validate required columns before previewing.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Upload type
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {(["employees", "salary"] as UploadType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleUploadTypeChange(type)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        uploadType === type
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-semibold">
                        {type === "employees"
                          ? "Employee master"
                          : "Salary dispatch"}
                      </span>
                      <span
                        className={`text-xs ${
                          uploadType === type ? "text-slate-200" : "text-slate-400"
                        }`}
                      >
                        {type === "employees"
                          ? "One-time master upload"
                          : "Monthly payroll file"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <details className="group rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700">
                  Expected format
                  <span className="text-slate-400 transition-transform duration-300 group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="mt-3 flex flex-col gap-3 text-sm text-slate-600">
                  <div className="flex flex-wrap gap-2">
                    {requiredColumns.map((column) => (
                      <span
                        key={column}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {column}
                      </span>
                    ))}
                  </div>
                  <a
                    href={sampleCsv}
                    download="salary-template.csv"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    Download sample CSV
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </details>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-xs text-slate-500">
                {uploadType === "employees"
                  ? "Tip: Keep employee columns in lowercase and avoid empty header rows."
                  : "Tip: Keep the salary slip columns in lowercase and avoid empty header rows."}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all ${
                isDragging
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-300 bg-white"
              }`}
            >
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 16V8M12 8L8.5 11.5M12 8L15.5 11.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 16.5C3.4 16.5 2 15.2 2 13.6C2 12.2 3 11 4.4 10.7C4.7 8.4 6.7 6.5 9.1 6.5C10.5 5 12.7 4.1 14.9 4.8C16.7 5.4 18 7 18.3 9C20.1 9.3 21.5 10.8 21.5 12.6C21.5 14.4 20.1 16 18.2 16.3H16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Drag & drop your {uploadType === "employees" ? "employee" : "salary"} file
                </p>
                <p className="text-sm text-slate-500">
                  or click to browse
                </p>
              </div>
              <label className="cursor-pointer rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-transform hover:-translate-y-0.5">
                Select file
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={handleFileInput}
                />
              </label>
              <p className="text-xs text-slate-400">CSV or XLSX up to 10MB</p>
            </div>

            {selectedFile && (
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <span className="text-sm font-semibold">
                    {extension}
                  </span>
                  <span className="absolute -bottom-2 right-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
                    FILE
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                {isLoading && (
                  <span className="text-xs font-semibold text-slate-500">
                    Processing...
                  </span>
                )}
              </div>
            )}

            {isLoading && (
              <div className="mt-6 space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
              </div>
            )}
          </div>
        </section>

        <section
          ref={previewRef}
          className={`grid gap-6 ${
            showLivePanel ? "lg:grid-cols-[1.4fr_0.9fr]" : "lg:grid-cols-1"
          }`}
        >
          <div className="space-y-4 transition-all duration-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-display font-semibold text-slate-900">
                Preview table
              </h2>
              {preview && (
                <span className="text-sm text-slate-500">
                  {employeeCount} rows · {warningCount} warning
                  {warningCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-48px_rgba(15,23,42,0.6)]">
              {preview ? (
                <div className="max-h-[520px] overflow-auto">
                  {uploadType === "salary" ? (
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          {TABLE_COLUMNS.map((column) => (
                            <th
                              key={column.key}
                              className="border-b border-slate-200 px-4 py-3 font-semibold"
                            >
                              <button
                                type="button"
                                onClick={() => handleSort(column.key)}
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
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, rowIndex) => {
                          const employeeId = String(row.employee_id ?? "");
                          const isMissing = missingEmployeeSet.has(employeeId);
                          const netSalary =
                            typeof row.net_salary === "number"
                              ? row.net_salary
                              : Number(row.base_salary ?? 0) +
                                Number(row.hra ?? 0) +
                                Number(row.allowances ?? 0) -
                                Number(row.deductions ?? 0);

                          return (
                            <tr
                              key={`${rowIndex}-${employeeId || rowIndex}`}
                              className="odd:bg-white even:bg-slate-50/60"
                            >
                              {TABLE_COLUMNS.map((column) => {
                                const value =
                                  column.key === "net_salary"
                                    ? netSalary
                                    : row[column.key];
                                const cellClass =
                                  column.key === "net_salary"
                                    ? "bg-emerald-50/60 text-emerald-800"
                                    : "text-slate-700";

                                return (
                                  <td
                                    key={`${rowIndex}-${column.key}`}
                                    className={`border-b border-slate-100 px-4 py-3 ${cellClass}`}
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
                                    ) : (
                                      String(value ?? "")
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          {preview.columns.map((column) => (
                            <th
                              key={column}
                              className="border-b border-slate-200 px-4 py-3 font-semibold"
                            >
                              {column}
                            </th>
                          ))}
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
                                className="border-b border-slate-100 px-4 py-3 text-slate-700"
                              >
                                {String(row[column] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-slate-500">
                  Upload a file to preview the data.
                </div>
              )}
            </div>
          </div>

          {showLivePanel && (
            <aside
              ref={summaryRef}
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
                    Skipped / Not Found
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
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Live updates</span>
                  <span>{dispatchResults.length} total</span>
                </div>
                <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                  {dispatchResults.slice(0, revealedCount).map((item, index) => {
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
                  onClick={handleDownloadReport}
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
                  onClick={handleReupload}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start New Batch
                </button>
              </div>
            </aside>
          )}
        </section>
      </div>

      {preview && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 px-6 py-4 shadow-[0_-20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              Review the table before confirming.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReupload}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                &larr; Re-upload
              </button>
              <button
                type="button"
                disabled={missingColumns.length > 0 || isLoading || isDispatching}
                onClick={() => setShowConfirmModal(true)}
                className={`rounded-full px-6 py-2 text-sm font-semibold text-white transition ${
                  missingColumns.length > 0 || isLoading || isDispatching
                    ? "bg-slate-400"
                    : "bg-slate-900 hover:-translate-y-0.5"
                }`}
              >
                {isDispatching ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Processing...
                  </span>
                ) : (
                  <span>
                    {uploadType === "employees"
                      ? "Confirm &amp; Save Employees →"
                      : "Confirm &amp; Dispatch →"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && preview && (
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
                onClick={() => setShowConfirmModal(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                disabled={isDispatching}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatch}
                disabled={isDispatching}
                className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${
                  isDispatching ? "bg-slate-400" : "bg-slate-900"
                }`}
              >
                {isDispatching ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
