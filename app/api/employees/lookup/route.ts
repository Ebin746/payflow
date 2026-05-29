import { NextResponse } from "next/server";
import { getEmployeesByIds } from "@/repositories/employeesRepository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeIds = Array.isArray(body?.employeeIds)
      ? (body.employeeIds as string[])
      : null;

    if (!employeeIds) {
      return NextResponse.json(
        { error: "employeeIds must be an array." },
        { status: 400 }
      );
    }

    const trimmedIds = employeeIds
      .map((id) => String(id).trim())
      .filter(Boolean);

    const employees = await getEmployeesByIds(trimmedIds);
    const employeeSet = new Set(
      employees.map((employee) => employee.employee_id)
    );
    const missingEmployeeIds = trimmedIds.filter(
      (employeeId) => !employeeSet.has(employeeId)
    );

    return NextResponse.json({ employees, missingEmployeeIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
