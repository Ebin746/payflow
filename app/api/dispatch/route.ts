import { NextResponse } from "next/server";
import { dispatchSalaryUpload } from "@/services/dispatchService";

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

    const result = await dispatchSalaryUpload(rows);

    console.log("dispatch result", {
      matchedEmployees: result.matchedEmployees,
      salaryRecordsInserted: result.salaryRecordsInserted,
      resultsCount: result.results.length,
    });

    return NextResponse.json({
      matchedEmployees: result.matchedEmployees,
      salaryRecordsInserted: result.salaryRecordsInserted,
      results: result.results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
