create extension if not exists pgcrypto;

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

create table if not exists dispatch_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_type text not null default 'salary' check (upload_type = 'salary'),
  status text not null check (status in ('queued', 'processing', 'completed', 'failed')),
  total_rows int not null default 0,
  processed_rows int not null default 0,
  success_rows int not null default 0,
  failed_rows int not null default 0,
  skipped_rows int not null default 0,
  rows jsonb not null default '[]'::jsonb,
  results jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists dispatch_jobs_status_idx
  on dispatch_jobs(status);

create index if not exists dispatch_jobs_created_at_idx
  on dispatch_jobs(created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dispatch_jobs_updated_at on dispatch_jobs;

create trigger set_dispatch_jobs_updated_at
before update on dispatch_jobs
for each row
execute function set_updated_at();
