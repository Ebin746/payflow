import { NextResponse } from "next/server";

import { getDispatchJobSnapshot } from "@/services/dispatchJobsService";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const job = await getDispatchJobSnapshot(jobId);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch job not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}