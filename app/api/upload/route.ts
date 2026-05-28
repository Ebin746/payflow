import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const MAX_PREVIEW_ROWS = 200;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json(
        { error: "No worksheet found." },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    }) as Record<string, string | number | boolean | null>[];

    const columnsSet = new Set<string>();
    rawRows.forEach((row) => {
      Object.keys(row).forEach((key) => columnsSet.add(key));
    });

    const columns = Array.from(columnsSet);
    const rows = rawRows.slice(0, MAX_PREVIEW_ROWS);

    return NextResponse.json({
      columns,
      rows,
      totalRows: rawRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
