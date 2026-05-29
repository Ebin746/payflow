create table if not exists employees (
  employee_id text primary key,
  name text not null,
  email text not null,
  designation text not null,
  birth_year int
);

create table if not exists salary_records (
  id bigint generated always as identity primary key,
  employee_id text not null references employees(employee_id) on delete restrict,
  base_salary numeric(12, 2) not null,
  hra numeric(12, 2) not null,
  allowances numeric(12, 2) not null,
  deductions numeric(12, 2) not null,
  month int not null,
  year int not null,
  net_salary numeric(12, 2) not null
);

create index if not exists salary_records_employee_id_idx
  on salary_records(employee_id);
