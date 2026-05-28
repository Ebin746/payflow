import { Employee, upsertEmployees } from "@/repositories/employeesRepository";

type RawRow = Record<string, unknown>;

type EmployeeUpsertResult = {
  employeesUpserted: number;
};

function toStringValue(value: unknown, field: string) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    throw new Error(`${field} is required.`);
  }
  return String(value).trim();
}

function parseRow(row: RawRow): Employee {
  return {
    employee_id: toStringValue(row.employee_id, "employee_id"),
    name: toStringValue(row.name, "name"),
    email: toStringValue(row.email, "email"),
    designation: toStringValue(row.designation, "designation"),
  };
}

export async function upsertEmployeeRows(rows: RawRow[]) {
  if (rows.length === 0) {
    throw new Error("No rows to upsert.");
  }

  const employees = rows.map(parseRow);
  const employeesUpserted = await upsertEmployees(employees);

  return {
    employeesUpserted,
  } satisfies EmployeeUpsertResult;
}
