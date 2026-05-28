"use client";

import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";

type PreviewRow = Record<string, string | number | boolean | null>;

type UploadResponse = {
  columns: string[];
  rows: PreviewRow[];
  totalRows: number;
};

type UploadType = "salary" | "employees";

export default function AdminUploadPage() {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>("salary");

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setColumns([]);
    setRows([]);
    setTotalRows(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed");
      }

      const data = (await response.json()) as UploadResponse;
      setColumns(data.columns);
      setRows(data.rows);
      setTotalRows(data.totalRows);
      toast.success("File parsed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsDispatching(true);

    try {
      const endpoint = uploadType === "employees" ? "/api/employees" : "/api/dispatch";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Dispatch failed");
      }

      const data = (await response.json()) as {
        employeesUpserted?: number;
        salaryRecordsInserted?: number;
        matchedEmployees?: number;
      };
      if (uploadType === "employees") {
        toast.success(`Upserted ${data.employeesUpserted ?? 0} employees.`);
      } else {
        toast.success(
          `Dispatched ${data.salaryRecordsInserted ?? 0} salary records for ${
            data.matchedEmployees ?? 0
          } employees.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dispatch failed";
      toast.error(message);
    } finally {
      setIsDispatching(false);
    }
  };

  const hasPreview = rows.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Toaster position="top-right" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Admin Console
            </p>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              Secure Uploads
            </span>
          </div>
          <h1 className="text-4xl font-semibold text-white">
            Payroll Data Operations
          </h1>
          <p className="max-w-2xl text-base text-slate-300">
            Upload employee master data once, then dispatch monthly salary files
            with validation and preview.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl shadow-slate-900/20">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Upload file
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>
                  {fileName ? "Selected: " + fileName : "No file selected"}
                </span>
                {isLoading ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                    Parsing...
                  </span>
                ) : null}
                {isDispatching ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                    Dispatching...
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Upload Type
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {(["employees", "salary"] as UploadType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setUploadType(type)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                    uploadType === type
                      ? "border-blue-500 bg-blue-500/10 text-blue-100"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className="font-semibold">
                    {type === "employees" ? "Employee Master" : "Salary Dispatch"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {type === "employees"
                      ? "One-time master upload"
                      : "Monthly payroll file"}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
              {uploadType === "employees" ? (
                <p>
                  Required columns: employee_id, name, email, designation.
                </p>
              ) : (
                <p>
                  Required columns: employee_id, month, year, base_salary, hra,
                  allowances, deductions, net_salary.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl shadow-slate-900/20">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Preview
                </h2>
                <p className="text-sm text-slate-500">
                  {hasPreview
                    ? `Showing ${rows.length} of ${totalRows} rows`
                    : "Upload a file to see a preview"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!hasPreview || isDispatching}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isDispatching
                  ? "Dispatching..."
                  : uploadType === "employees"
                  ? "Confirm & Save Employees"
                  : "Confirm & Dispatch"}
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              {hasPreview ? (
                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {columns.map((column) => (
                          <th key={column} className="px-4 py-3 font-semibold">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          {columns.map((column) => (
                            <td key={column} className="px-4 py-3">
                              {row[column] ?? "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                  <div className="h-10 w-10 rounded-full bg-slate-100" />
                  <p className="text-sm">No preview available yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Status
              </p>
              <p className="text-sm">{hasPreview ? "Ready" : "Waiting"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Success signals
              </p>
              <p className="text-sm text-emerald-400">Green messages</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Error signals
              </p>
              <p className="text-sm text-red-400">Red messages</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
