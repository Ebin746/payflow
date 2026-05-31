import { supabaseAdmin } from "@/lib/supabase/server";

import { DispatchJobRecord, DispatchRow } from "@/lib/dispatch";

type DispatchJobDatabaseRow = DispatchJobRecord;

function selectDispatchJobColumns() {
  return [
    "id",
    "upload_type",
    "status",
    "total_rows",
    "processed_rows",
    "success_rows",
    "failed_rows",
    "skipped_rows",
    "rows",
    "results",
    "error_message",
    "created_at",
    "updated_at",
    "started_at",
    "completed_at",
  ].join(",");
}

function asDispatchJob(row: DispatchJobDatabaseRow) {
  return row;
}

export async function createDispatchJob(records: DispatchRow[]) {
  const payload: Omit<DispatchJobRecord, "id" | "created_at" | "updated_at"> = {
    upload_type: "salary",
    status: "queued",
    total_rows: records.length,
    processed_rows: 0,
    success_rows: 0,
    failed_rows: 0,
    skipped_rows: 0,
    rows: records,
    results: [],
    error_message: null,
    started_at: null,
    completed_at: null,
  };

  const { data, error } = await supabaseAdmin
    .from("dispatch_jobs")
    .insert(payload)
    .select(selectDispatchJobColumns())
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create dispatch job.");
  }

  return asDispatchJob(data as unknown as DispatchJobDatabaseRow);
}

export async function getDispatchJobById(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from("dispatch_jobs")
    .select(selectDispatchJobColumns())
    .eq("id", jobId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Dispatch job not found.");
  }

  return asDispatchJob(data as unknown as DispatchJobDatabaseRow);
}

export async function updateDispatchJob(
  jobId: string,
  patch: Partial<
    Pick<
      DispatchJobRecord,
      | "status"
      | "total_rows"
      | "processed_rows"
      | "success_rows"
      | "failed_rows"
      | "skipped_rows"
      | "rows"
      | "results"
      | "error_message"
      | "started_at"
      | "completed_at"
    >
  >
) {
  const { data, error } = await supabaseAdmin
    .from("dispatch_jobs")
    .update(patch)
    .eq("id", jobId)
    .select(selectDispatchJobColumns())
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update dispatch job.");
  }

  return asDispatchJob(data as unknown as DispatchJobDatabaseRow);
}