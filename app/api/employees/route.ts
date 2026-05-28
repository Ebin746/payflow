import { NextResponse } from "next/server";
import { upsertEmployeeRows } from "@/services/employeesService";

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

    const result = await upsertEmployeeRows(rows);

    return NextResponse.json({
      employeesUpserted: result.employeesUpserted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upsert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
