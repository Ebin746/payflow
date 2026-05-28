import { supabaseAdmin } from "@/lib/supabase/server";

export type SalaryRecord = {
  employee_id: string;
  base_salary: number;
  hra: number;
  allowances: number;
  deductions: number;
  month: number;
  year: number;
  net_salary: number;
};

export async function insertSalaryRecords(records: SalaryRecord[]) {
  if (records.length === 0) {
    return 0;
  }

  const { data, error } = await supabaseAdmin
    .from("salary_records")
    .insert(records)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
