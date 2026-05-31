import {
  DISPATCH_BATCH_SIZE,
  DispatchJobRecord,
  DispatchJobSnapshot,
  DispatchResultItem,
  isSkippedDispatchResult,
  toDispatchJobSnapshot,
} from "@/lib/dispatch";
import {
  createDispatchJob,
  getDispatchJobById,
  updateDispatchJob,
} from "@/repositories/dispatchJobsRepository";
import { dispatchSalaryUploadWithProgress } from "@/services/dispatchService";
import { enqueueDispatchJob } from "@/services/dispatchQueueService";

function countOutcomes(results: DispatchResultItem[]) {
  return results.reduce(
    (accumulator, item) => {
      if (item.success) {
        accumulator.success += 1;
        return accumulator;
      }

      if (isSkippedDispatchResult(item)) {
        accumulator.skipped += 1;
        return accumulator;
      }

      accumulator.failed += 1;
      return accumulator;
    },
    { success: 0, failed: 0, skipped: 0 }
  );
}

async function processDispatchJobBatch(
  jobId: string,
  destinationUrl: string
): Promise<DispatchJobSnapshot> {
  const job = await getDispatchJobById(jobId);

  if (job.status === "completed" || job.status === "failed") {
    return toDispatchJobSnapshot(job);
  }

  const rows = Array.isArray(job.rows) ? job.rows : [];
  const processedRows = Math.max(0, job.processed_rows ?? 0);

  if (job.status === "queued") {
    await updateDispatchJob(jobId, {
      status: "processing",
      started_at: job.started_at ?? new Date().toISOString(),
      error_message: null,
    });
  }

  const batchRows = rows.slice(
    processedRows,
    processedRows + DISPATCH_BATCH_SIZE
  );

  if (batchRows.length === 0) {
    const completedJob = await updateDispatchJob(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    return toDispatchJobSnapshot(completedJob);
  }

  try {
    const batchResult = await dispatchSalaryUploadWithProgress(batchRows);
    const outcomes = countOutcomes(batchResult.results);
    const nextProcessedRows = processedRows + batchRows.length;
    const hasMoreRows = nextProcessedRows < rows.length;

    const updatedJob = await updateDispatchJob(jobId, {
      status: hasMoreRows ? "processing" : "completed",
      processed_rows: nextProcessedRows,
      success_rows: (job.success_rows ?? 0) + outcomes.success,
      failed_rows: (job.failed_rows ?? 0) + outcomes.failed,
      skipped_rows: (job.skipped_rows ?? 0) + outcomes.skipped,
      results: [...(job.results ?? []), ...batchResult.results],
      error_message: null,
      started_at: job.started_at ?? new Date().toISOString(),
      completed_at: hasMoreRows ? null : new Date().toISOString(),
    });

    if (hasMoreRows) {
      await enqueueDispatchJob(jobId, destinationUrl);
    }

    return toDispatchJobSnapshot(updatedJob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    const failedJob = await updateDispatchJob(jobId, {
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    });
    return toDispatchJobSnapshot(failedJob);
  }
}

export async function createAndQueueDispatchJob(
  rows: DispatchJobRecord["rows"],
  destinationUrl: string
) {
  const job = await createDispatchJob(rows);
  await enqueueDispatchJob(job.id, destinationUrl);
  return toDispatchJobSnapshot(job);
}

export async function getDispatchJobSnapshot(jobId: string) {
  const job = await getDispatchJobById(jobId);
  return toDispatchJobSnapshot(job);
}

export async function processNextQueuedDispatchJob(
  jobId: string,
  destinationUrl: string
) {
  return processDispatchJobBatch(jobId, destinationUrl);
}
