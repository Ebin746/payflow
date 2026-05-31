import { NextResponse } from "next/server";

import { createAndQueueDispatchJob } from "@/services/dispatchJobsService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : null;

    if (!rows) {
      return NextResponse.json(
        { error: "rows must be an array." },
        { status: 400 }
      );
    }

    const destinationUrl = new URL("/api/dispatch/worker", request.url).toString();
    const job = await createAndQueueDispatchJob(rows, destinationUrl);

    return NextResponse.json({
      job,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
