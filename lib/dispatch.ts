export const DISPATCH_BATCH_SIZE = 25;

export type DispatchResultItem = {
  employee_id: string;
  name: string;
  email: string;
  month: number;
  year: number;
  success: boolean;
  error?: string;
};

export type DispatchProgress = {
  total: number;
  processed: number;
  success: number;
  failed: number;
  skipped: number;
};

export type DispatchJobStatus = "queued" | "processing" | "completed" | "failed";

export type DispatchRow = Record<string, unknown>;

export type DispatchJobRecord = {
  id: string;
  upload_type: "salary";
  status: DispatchJobStatus;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  rows: DispatchRow[];
  results: DispatchResultItem[];
  error_message: string | null;
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
};

export type DispatchJobSnapshot = {
  id: string;
  status: DispatchJobStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  results: DispatchResultItem[];
  errorMessage: string | null;
};

export function toDispatchJobSnapshot(job: DispatchJobRecord): DispatchJobSnapshot {
  return {
    id: job.id,
    status: job.status,
    totalRows: job.total_rows,
    processedRows: job.processed_rows,
    successRows: job.success_rows,
    failedRows: job.failed_rows,
    skippedRows: job.skipped_rows,
    results: Array.isArray(job.results) ? job.results : [],
    errorMessage: job.error_message,
  };
}

export function isSkippedDispatchResult(item: DispatchResultItem) {
  return !item.success && item.error?.includes("not found");
}