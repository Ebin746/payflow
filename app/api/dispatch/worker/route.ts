import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

import { processNextQueuedDispatchJob } from "@/services/dispatchJobsService";

async function handleDispatchWorker(request: Request) {
  try {
    const body = await request.json();
    const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId must be a string." },
        { status: 400 }
      );
    }

    const destinationUrl = new URL(request.url).toString();
    const job = await processNextQueuedDispatchJob(jobId, destinationUrl);

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handleDispatchWorker);