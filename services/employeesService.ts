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

function toOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function parseRow(row: RawRow): Employee {
  return {
    employee_id: toStringValue(row.employee_id, "employee_id"),
    name: toStringValue(row.name, "name"),
    email: toStringValue(row.email, "email"),
    designation: toStringValue(row.designation, "designation"),
    birth_year: toOptionalInt(row.birth_year),
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
