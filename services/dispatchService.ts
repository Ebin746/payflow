import { getEmployeesByIds } from "@/repositories/employeesRepository";
import {
  SalaryRecord,
  insertSalaryRecords,
} from "@/repositories/salaryRecordsRepository";
import { generateSalarySlipPdfBuffer } from "@/services/generatePDF";
import { sendSalarySlipEmail } from "@/services/sendEmail";

type RawRow = Record<string, unknown>;

type DispatchResult = {
  matchedEmployees: number;
  salaryRecordsInserted: number;
  results: DispatchResultItem[];
};

type DispatchResultItem = {
  employee_id: string;
  name: string;
  email: string;
  month: number;
  year: number;
  success: boolean;
  error?: string;
};

const NUMBER_FIELDS = [
  "base_salary",
  "hra",
  "allowances",
  "deductions",
  "net_salary",
];

function toStringValue(value: unknown, field: string) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    throw new Error(`${field} is required.`);
  }
  return String(value).trim();
}

function toNumberValue(value: unknown, field: string) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  throw new Error(`${field} must be a number.`);
}

function toIntValue(value: unknown, field: string) {
  const parsed = toNumberValue(value, field);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${field} must be an integer.`);
  }
  return parsed;
}

function parseRow(row: RawRow) {
  const employee_id = toStringValue(row.employee_id, "employee_id");
  const month = toIntValue(row.month, "month");
  const year = toIntValue(row.year, "year");

  if (month < 1 || month > 12) {
    throw new Error("month must be between 1 and 12.");
  }

  const base_salary = toNumberValue(row.base_salary, "base_salary");
  const hra = toNumberValue(row.hra, "hra");
  const allowances = toNumberValue(row.allowances, "allowances");
  const deductions = toNumberValue(row.deductions, "deductions");

  let net_salary = toNumberValue(row.net_salary, "net_salary");
  if (!NUMBER_FIELDS.some((field) => row[field] !== undefined)) {
    net_salary = base_salary + hra + allowances - deductions;
  }

  const salaryRecord: SalaryRecord = {
    employee_id,
    base_salary,
    hra,
    allowances,
    deductions,
    month,
    year,
    net_salary,
  };

  return { employee_id, salaryRecord };
}

export async function dispatchSalaryUpload(rows: RawRow[]) {
  if (rows.length === 0) {
    throw new Error("No rows to dispatch.");
  }

  const parsedRows = rows.map(parseRow);
  const salaryRecordsToInsert: SalaryRecord[] = [];
  const results: DispatchResultItem[] = [];

  const uniqueEmployeeIds = Array.from(
    new Set(parsedRows.map((parsed) => parsed.employee_id))
  );
  const employees = await getEmployeesByIds(uniqueEmployeeIds);
  const employeeMap = new Map(
    employees.map((employee) => [employee.employee_id, employee])
  );

  const companyName = process.env.COMPANY_NAME ?? "Company";

  for (const parsed of parsedRows) {
    const employee = employeeMap.get(parsed.employee_id);
    if (!employee) {
      results.push({
        employee_id: parsed.employee_id,
        name: "",
        email: "",
        month: parsed.salaryRecord.month,
        year: parsed.salaryRecord.year,
        success: false,
        error: "Employee not found in master data.",
      });
      continue;
    }

    try {
      const pdfBuffer = await generateSalarySlipPdfBuffer({
        companyName,
        employee,
        salaryRecord: parsed.salaryRecord,
      });

      await sendSalarySlipEmail({
        to: employee.email,
        name: employee.name,
        month: parsed.salaryRecord.month,
        year: parsed.salaryRecord.year,
        pdfBuffer,
      });

      salaryRecordsToInsert.push(parsed.salaryRecord);
      results.push({
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        month: parsed.salaryRecord.month,
        year: parsed.salaryRecord.year,
        success: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dispatch failed";
      results.push({
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        month: parsed.salaryRecord.month,
        year: parsed.salaryRecord.year,
        success: false,
        error: message,
      });
    }
  }

  const salaryRecordsInserted = await insertSalaryRecords(
    salaryRecordsToInsert
  );

  return {
    matchedEmployees: employees.length,
    salaryRecordsInserted,
    results,
  } satisfies DispatchResult;
}
