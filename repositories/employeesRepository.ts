import { supabaseAdmin } from "@/lib/supabase/server";

export type Employee = {
  employee_id: string;
  name: string;
  email: string;
  designation: string;
  birth_year: number | null;
};

export async function upsertEmployees(employees: Employee[]) {
  if (employees.length === 0) {
    return 0;
  }

  const { data, error } = await supabaseAdmin
    .from("employees")
    .upsert(employees, { onConflict: "employee_id" })
    .select("employee_id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function getEmployeesByIds(employeeIds: string[]) {
  if (employeeIds.length === 0) {
    return [] as Employee[];
  }

  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("employee_id,name,email,designation,birth_year")
    .in("employee_id", employeeIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Employee[];
}
