"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import BottomBar from "@/app/components/payroll/BottomBar";
import ConfirmModal from "@/app/components/payroll/ConfirmModal";
import LiveDispatchPanel from "@/app/components/payroll/LiveDispatchPanel";
import PreviewTables from "@/app/components/payroll/PreviewTables";
import RowEditModal from "@/app/components/payroll/RowEditModal";
import Landing from "@/app/components/Landing";

import type {
  DispatchJobSnapshot,
  DispatchProgress,
  DispatchResultItem,
} from "@/lib/dispatch";

type UploadPreview = {
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  totalRows: number;
};

type UploadType = "salary" | "employees";

type EmployeeLookup = {
  name: string;
  email: string;
};

type EmployeeLookupItem = EmployeeLookup & {
  employee_id: string;
};

type ValidationErrors = Record<number, Record<string, string>>;

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

function formatDispatchReason(reason?: string) {
  if (!reason) {
    return "";
  }

  if (/not found/i.test(reason)) {
    return "Employee master record is not available in the dispatch register.";
  }

  if (/Missing Gmail email configuration/i.test(reason)) {
    return "Email delivery settings are incomplete for this dispatch.";
  }

  if (/Dispatch failed/i.test(reason)) {
    return "Dispatch could not be completed for this record. Please review the payroll entry and try again.";
  }

  return reason.endsWith(".") ? reason : `${reason}.`;
}

const SAMPLE_CSV_FILES: Record<UploadType, { href: string; download: string }> = {
  employees: {
    href: "/sample-csvs/employees-sample.csv",
    download: "employees-sample.csv",
  },
  salary: {
    href: "/sample-csvs/salary-records-sample.csv",
    download: "salary-records-sample.csv",
  },
};

const TABLE_COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
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

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return false;
}

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function validateRows(
  preview: UploadPreview | null,
  uploadType: UploadType,
  requiredColumns: string[]
) {
  if (!preview) {
    return {} as ValidationErrors;
  }

  const errors: ValidationErrors = {};
  const salaryNumericFields = [
    "base_salary",
    "hra",
    "allowances",
    "deductions",
    "net_salary",
  ];
  const salaryIntegerFields = ["month", "year"];

  preview.rows.forEach((row, rowIndex) => {
    const rowErrors: Record<string, string> = {};

    requiredColumns.forEach((column) => {
      if (isEmptyValue(row[column])) {
        rowErrors[column] = "Required.";
      }
    });

    if (uploadType === "salary") {
      salaryNumericFields.forEach((field) => {
        if (!isEmptyValue(row[field])) {
          const parsed = parseNumber(row[field]);
          if (parsed === null) {
            rowErrors[field] = "Must be a number.";
          }
        }
      });

      salaryIntegerFields.forEach((field) => {
        if (!isEmptyValue(row[field])) {
          const parsed = parseNumber(row[field]);
          if (parsed === null || !Number.isInteger(parsed)) {
            rowErrors[field] = "Must be an integer.";
          }
        }
      });

      const monthValue = parseNumber(row.month);
      if (monthValue !== null && (monthValue < 1 || monthValue > 12)) {
        rowErrors.month = "Must be 1-12.";
      }

      const yearValue = parseNumber(row.year);
      if (yearValue !== null && yearValue < 1900) {
        rowErrors.year = "Check year.";
      }
    }

    if (uploadType === "employees") {
      const emailValue = String(row.email ?? "").trim();
      if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        rowErrors.email = "Invalid email.";
      }

      if (!isEmptyValue(row.birth_year)) {
        const parsed = parseNumber(row.birth_year);
        if (parsed === null || !Number.isInteger(parsed)) {
          rowErrors.birth_year = "Must be an integer.";
        }
      }
    }

    if (Object.keys(rowErrors).length > 0) {
      errors[rowIndex] = rowErrors;
    }
  });

  return errors;
}

export default function Home() {
  const [uploadType, setUploadType] = useState<UploadType>("employees");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<string[]>([]);
  const [employeeLookup, setEmployeeLookup] = useState<
    Record<string, EmployeeLookup>
  >({});
  const [isEmployeeLookupLoading, setIsEmployeeLookupLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchLocked, setDispatchLocked] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);
  const [dispatchResults, setDispatchResults] = useState<DispatchResultItem[]>(
    []
  );
  const [dispatchProgress, setDispatchProgress] = useState<DispatchProgress>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  });
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showEmployeeSuccessTick, setShowEmployeeSuccessTick] = useState(false);
  const [sortState, setSortState] = useState<SortState>({
    key: "employee_id",
    direction: "asc",
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const requiredColumns =
    uploadType === "employees" ? EMPLOYEE_REQUIRED_COLUMNS : REQUIRED_COLUMNS;

  const sampleCsv = useMemo(() => SAMPLE_CSV_FILES[uploadType], [uploadType]);

  const activePreview = useMemo(() => preview, [preview]);

  async function fetchEmployeeLookup(employeeIds: string[]) {
    if (employeeIds.length === 0) {
      setEmployeeLookup({});
      setMissingEmployees([]);
      return;
    }
    setIsEmployeeLookupLoading(true);
    try {
      const validateResponse = await fetch("/api/employees/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds }),
      });
      const validatePayload = (await validateResponse.json()) as
        | { missingEmployeeIds: string[]; employees: EmployeeLookupItem[] }
        | { error: string };

      if (validateResponse.ok && "employees" in validatePayload) {
        const employees = Array.isArray(validatePayload.employees)
          ? validatePayload.employees
          : [];
        const lookup: Record<string, EmployeeLookup> = {};
        employees.forEach((employee) => {
          lookup[employee.employee_id] = {
            name: employee.name,
            email: employee.email,
          };
        });
        setEmployeeLookup(lookup);
        setMissingEmployees(validatePayload.missingEmployeeIds ?? []);
      }
    } finally {
      setIsEmployeeLookupLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setSelectedFile(file);
    setPreview(null);
    setMissingColumns([]);
    setMissingEmployees([]);
    setEmployeeLookup({});
    setIsEmployeeLookupLoading(false);
    setDispatchLocked(false);
    setErrorMessage(null);
    setDispatchMessage(null);
    setDispatchResults([]);
    setDispatchProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    });
    setEditRowIndex(null);
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

        await fetchEmployeeLookup(employeeIds);
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
    if (!activePreview || hasBlockingIssues || isDispatching) {
      if (hasBlockingIssues) {
        setErrorMessage("Resolve validation issues before dispatch.");
      }
      return;
    }

    setShowConfirmModal(false);
    setIsDispatching(true);
    setDispatchLocked(true);
    setDispatchMessage(null);
    setDispatchResults([]);
    setDispatchProgress({
      total: activePreview.rows.length,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    });

    try {
      if (uploadType === "employees") {
        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: activePreview.rows }),
        });
        const payload = (await response.json()) as
          | { employeesUpserted?: number }
          | { error: string };

        if (!response.ok) {
          const message = "error" in payload ? payload.error : "Dispatch failed";
          throw new Error(message);
        }

        const upsertedCount = "employeesUpserted" in payload ? (payload.employeesUpserted ?? 0) : 0;
        setDispatchMessage(
          `Employee upload complete. ${upsertedCount} records saved.`
        );
        setShowEmployeeSuccessTick(true);
        return;
      }

      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: activePreview.rows }),
      });

      const payload = (await response.json()) as
        | { job?: DispatchJobSnapshot }
        | { error?: string };

      if (!response.ok || !payload || !("job" in payload) || !payload.job) {
        const message = "error" in payload ? payload.error : "Dispatch failed";
        throw new Error(message ?? "Dispatch failed");
      }

      const syncDispatchSnapshot = (job: DispatchJobSnapshot) => {
        setDispatchResults(job.results);
        setDispatchProgress({
          total: job.totalRows,
          processed: job.processedRows,
          success: job.successRows,
          failed: job.failedRows,
          skipped: job.skippedRows,
        });

        if (job.status === "completed") {
          setDispatchMessage(
            `Dispatch complete. ${job.successRows} sent, ${job.failedRows} failed.`
          );
          return;
        }

        if (job.status === "failed") {
          setDispatchMessage(job.errorMessage ?? "Dispatch failed");
          return;
        }

        setDispatchMessage("Dispatch queued. QStash is processing the batches.");
      };

      syncDispatchSnapshot(payload.job);

      if (
        payload.job.status === "queued" ||
        payload.job.status === "processing"
      ) {
        while (true) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));

          const jobResponse = await fetch(`/api/dispatch/${payload.job.id}`);
          const jobPayload = (await jobResponse.json()) as
            | { job?: DispatchJobSnapshot }
            | { error?: string };

          if (
            !jobResponse.ok ||
            !jobPayload ||
            !("job" in jobPayload) ||
            !jobPayload.job
          ) {
            const message =
              "error" in jobPayload ? jobPayload.error : "Dispatch failed";
            throw new Error(message ?? "Dispatch failed");
          }

          syncDispatchSnapshot(jobPayload.job);

          if (
            jobPayload.job.status === "completed" ||
            jobPayload.job.status === "failed"
          ) {
            break;
          }
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "Dispatch failed";
      setDispatchMessage(message);
    } finally {
      setIsDispatching(false);
      setDispatchLocked(false);
    }
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleUpload(file);
    }
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }

  function handleReupload(shouldScroll = true) {
    setSelectedFile(null);
    setPreview(null);
    setMissingColumns([]);
    setMissingEmployees([]);
    setErrorMessage(null);
    setDispatchMessage(null);
    setDispatchResults([]);
    setDispatchProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    });
    setRevealedCount(0);
    setShowEmployeeSuccessTick(false);
    setEditRowIndex(null);
    setIsLoading(false);
    setIsDispatching(false);
    setShowConfirmModal(false);
    setDispatchLocked(false);
    if (shouldScroll) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  function handleUploadTypeChange(type: UploadType) {
    if (type === uploadType) {
      return;
    }
    setUploadType(type);
    // clear preview/state but don't scroll to top when switching upload type
    handleReupload(false);
  }

  const extension = selectedFile ? getExtension(selectedFile.name) : "";
  const employeeCount = activePreview?.rows.length ?? 0;
  const totalResults = dispatchResults.length;
  const sentCount = dispatchResults.filter((item) => item.success).length;
  const failedCount = dispatchResults.filter((item) => !item.success).length;
  const allSent = totalResults > 0 && failedCount === 0;
  const showLivePanel =
    uploadType === "salary" &&
    (isDispatching || dispatchProgress.total > 0 || dispatchResults.length > 0);
  const progressPercent =
    dispatchProgress.total === 0
      ? 0
      : Math.round(
          (dispatchProgress.processed / dispatchProgress.total) * 100
        );
  const editColumns =
    uploadType === "salary"
      ? [
          "employee_id",
          "base_salary",
          "hra",
          "allowances",
          "deductions",
          "net_salary",
          "month",
          "year",
        ]
        : activePreview?.columns ?? [];

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
      formatDispatchReason(item.error),
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

  const rowEmployeeIdSet = useMemo(() => {
    if (!activePreview || uploadType !== "salary") {
      return new Set<string>();
    }
    return new Set(
      activePreview.rows
        .map((row) => String(row.employee_id ?? "").trim())
        .filter(Boolean)
    );
  }, [activePreview, uploadType]);

  const missingEmployeeSet = useMemo(() => {
    if (uploadType !== "salary") {
      return new Set<string>();
    }
    return new Set(
      missingEmployees.filter((employeeId) => rowEmployeeIdSet.has(employeeId))
    );
  }, [missingEmployees, rowEmployeeIdSet, uploadType]);

  const validationErrors = useMemo(
    () => validateRows(activePreview, uploadType, requiredColumns),
    [activePreview, uploadType, requiredColumns]
  );

  const validationErrorCount = useMemo(
    () =>
      Object.values(validationErrors).reduce(
        (total, rowErrors) => total + Object.keys(rowErrors).length,
        0
      ),
    [validationErrors]
  );

  const warningCountForPreview =
    (uploadType === "salary" ? missingEmployeeSet.size : 0) +
    validationErrorCount;

  const hasBlockingIssues =
    missingColumns.length > 0 ||
    validationErrorCount > 0 ||
    (uploadType === "salary" && missingEmployeeSet.size > 0);

  const sortedRows = useMemo(() => {
    if (!activePreview) {
      return [];
    }
    const rowsCopy = activePreview.rows.map((row, index) => ({
      row,
      index,
    }));
    const { key, direction } = sortState;

    const getSortableValue = (row: UploadPreview["rows"][number]) => {
      if (key === "name" || key === "email") {
        return employeeLookup[String(row.employee_id ?? "")]?.[key] ?? "";
      }
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
      const valueA = getSortableValue(a.row);
      const valueB = getSortableValue(b.row);
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
  }, [activePreview, sortState, employeeLookup]);

  function handleRemoveRow(rowIndex: number) {
    setPreview((current) => {
      if (!current) {
        return current;
      }
      const nextRows = current.rows.filter(
        (_, index) => index !== rowIndex
      );
      setDispatchLocked(false);
      return { ...current, rows: nextRows, totalRows: nextRows.length };
    });
  }

  function handleEditRow(rowIndex: number) {
    setEditRowIndex(rowIndex);
  }

  function handleSaveRow(
    rowIndex: number,
    updatedRow: Record<string, string>
  ) {
    setPreview((current) => {
      if (!current) {
        return current;
      }
      const nextRows = current.rows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }
        return { ...row, ...updatedRow };
      });
      setDispatchLocked(false);
      return { ...current, rows: nextRows, totalRows: nextRows.length };
    });
    setEditRowIndex(null);
  }

  useEffect(() => {
    if (!activePreview || uploadType !== "salary" || missingColumns.length > 0) {
      return;
    }

    const employeeIds = activePreview.rows
      .map((row) => String(row.employee_id ?? "").trim())
      .filter(Boolean);

    const timeoutId = window.setTimeout(() => {
      void fetchEmployeeLookup(employeeIds);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activePreview, uploadType, missingColumns.length]);

  useEffect(() => {
    if (dispatchResults.length === 0) {
      const timeoutId = window.setTimeout(() => setRevealedCount(0), 0);
      return () => window.clearTimeout(timeoutId);
    }

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
  }, [dispatchResults.length]);

  useEffect(() => {
    if (!showEmployeeSuccessTick) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowEmployeeSuccessTick(false);
      setDispatchMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [showEmployeeSuccessTick]);

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <Landing previewRef={previewRef} />
      <div
        className={`mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-10 overflow-x-hidden ${
          preview ? "pb-32" : ""
        }`}
      >
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-display font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Nippon Toyota payroll dispatch desk
          </h1>
          {/* Steps moved to Landing component to keep layout consistent */}
        </header>

        {missingColumns.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            <span className="font-semibold">Missing columns:</span>{" "}
            {missingColumns.join(", ")}
          </div>
        )}

        {validationErrorCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            {validationErrorCount} validation issue
            {validationErrorCount === 1 ? "" : "s"} found. Fix the highlighted
            fields before dispatch.
          </div>
        )}

        {uploadType === "salary" && missingEmployeeSet.size > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            {missingEmployeeSet.size} employee
            {missingEmployeeSet.size === 1 ? " is" : "s are"} missing from the
            master list and will be skipped. Add them or fix the IDs before
            dispatch.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            {errorMessage}
          </div>
        )}

        {/* dispatch message removed from header section per request */}

        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-display font-semibold text-slate-900">
                  Upload & Preview
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Upload type
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Choose what you want to manage in Payflow.
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
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-semibold text-white"
                        >
                          {type === "employees" ? "1" : "2"}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {type === "employees"
                              ? "Employee master data"
                              : "Salary dispatch"}
                          </span>
                          <span
                            className={`text-xs ${
                              uploadType === type
                                ? "text-slate-200"
                                : "text-slate-400"
                            }`}
                          >
                            {type === "employees"
                              ? "Create or update the employee directory once"
                              : "Upload monthly payroll to generate slips"}
                          </span>
                        </div>
                      </div>
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
                    href={sampleCsv.href}
                    download={sampleCsv.download}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    Download sample CSV
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </details>

              {/* tip removed per request */}
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
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
          className={`grid gap-6 min-w-0 ${
            showLivePanel
              ? "lg:grid-cols-[minmax(0,1fr)_360px]"
              : "lg:grid-cols-1"
          }`}
        >
          <PreviewTables
            preview={activePreview}
            uploadType={uploadType}
            isLoading={isLoading}
            warningCountForPreview={warningCountForPreview}
            employeeCount={employeeCount}
            isEmployeeLookupLoading={isEmployeeLookupLoading}
            sortedRows={sortedRows}
            tableColumns={TABLE_COLUMNS}
            sortState={sortState}
            employeeLookup={employeeLookup}
            missingEmployeeSet={missingEmployeeSet}
            validationErrors={validationErrors}
            totalRows={preview?.totalRows ?? 0}
            onSort={handleSort}
            onRemoveRow={handleRemoveRow}
            onEditRow={handleEditRow}
          />

          {showLivePanel && (
            <LiveDispatchPanel
              ref={summaryRef}
              revealedCount={revealedCount}
              dispatchResults={dispatchResults}
              dispatchProgress={dispatchProgress}
              dispatchMessage={dispatchMessage}
              sentCount={sentCount}
              failedCount={failedCount}
              allSent={allSent}
              isDispatching={isDispatching}
              onDownloadReport={handleDownloadReport}
              onReupload={handleReupload}
            />
          )}
        </section>
      </div>

      {preview && (
        <BottomBar
          uploadType={uploadType}
          isDispatching={isDispatching}
          isLoading={isLoading}
          missingColumnsCount={missingColumns.length}
          hasBlockingIssues={hasBlockingIssues}
          dispatchLocked={dispatchLocked}
          progressPercent={progressPercent}
          onReupload={handleReupload}
          onOpenConfirm={() => setShowConfirmModal(true)}
        />
      )}

      {showConfirmModal && preview && (
        <ConfirmModal
          uploadType={uploadType}
          employeeCount={employeeCount}
          isDispatching={isDispatching}
          progressPercent={progressPercent}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleDispatch}
        />
      )}

      <RowEditModal
        isOpen={editRowIndex !== null}
        rowIndex={editRowIndex}
        columns={editColumns}
        row={
          editRowIndex !== null && activePreview
            ? activePreview.rows[editRowIndex]
            : null
        }
        nonEditableColumns={[]}
        onCancel={() => setEditRowIndex(null)}
        onSave={handleSaveRow}
      />

      {isDispatching &&
        (uploadType === "employees" ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/8">
            <div className="w-105 rounded-xl border border-sky-100 bg-linear-to-b from-white to-sky-50 px-4 py-3 text-sm text-slate-700 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-600">Saving employees</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sky-100">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700">{progressPercent}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/15">
            <div className="w-75 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center">
                  <div className="absolute h-full w-full rounded-full border border-slate-200" />
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                  <div className="absolute h-4 w-4 animate-pulse rounded-full bg-slate-900/10" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Dispatching
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    Processing... {progressPercent}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div className="-mt-2 h-2 w-full animate-pulse bg-linear-to-r from-transparent via-white/60 to-transparent" />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  {dispatchProgress.processed}/{dispatchProgress.total} processed
                </p>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs">
                  <span className="text-emerald-600">Sent</span>
                  <span className="font-semibold text-emerald-700">{sentCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs">
                  <span className="text-rose-600">Failed</span>
                  <span className="font-semibold text-rose-700">{failedCount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

      {showEmployeeSuccessTick && dispatchMessage?.startsWith("Employee upload complete") && (
        <div className="pointer-events-none fixed right-6 top-6 z-40 px-6">
          <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.7)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner animate-pulse">
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                  Success
                </p>
                <p className="text-base font-semibold text-slate-900">
                  Employee file saved successfully
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {dispatchMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
