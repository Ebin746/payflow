# Payflow Console

Payflow Console is a salary slip automation app for employee payroll processing. An admin can upload employee master data and monthly salary rows, preview and validate them, queue the dispatch run, generate salary slip PDFs, and email each employee automatically. The app keeps the browser responsive by running payroll in the background through QStash-backed jobs and showing live job status in the UI.

## Overview

Payflow is designed for larger payroll batches, not just small one-off uploads. The app stores dispatch runs in Supabase, processes them in queue-driven batches, and updates the dashboard as each batch finishes. That makes it practical to handle hundreds of emails in a single run without holding a single request open until the end.

## Features

- Upload employee master files and salary files in CSV or Excel format.
- Preview rows before dispatch and edit records directly in the table.
- Validate required columns, field types, and employee lookups early.
- Queue salary dispatch runs through QStash.
- Generate branded salary slip PDFs.
- Send each slip by email as a PDF attachment.
- Show live dispatch progress, sent count, failed count, and row-level results.
- Persist dispatch job state in Supabase for reliability and auditability.
- Handle 500+ salary slips in a single queued dispatch run.
- Support local development with QStash local mode.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase
- Upstash Redis + QStash
- Nodemailer
- pdf-lib and muhammara
- XLSX

## Architecture

The codebase uses a layered structure:

- app/ - App Router UI, route handlers, and layout
- app/api/ - upload, employee lookup, employee validation, and dispatch endpoints
- app/components/ - upload, preview, and live status components
- services/ - dispatch orchestration, PDF generation, email delivery, and queue integration
- repositories/ - Supabase access for employees, salary records, and dispatch jobs
- lib/ - shared types, helpers, and Supabase client setup
- supabase/ - SQL schema and DB trigger definitions
- public/ - sample CSV files and UI screenshots

### Directory Layout

```text
payflow/
├── app/
│   ├── api/
│   │   ├── dispatch/
│   │   ├── employees/
│   │   └── upload/
│   ├── components/
│   │   └── payroll/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase/
├── repositories/
├── services/
├── supabase/
│   └── schema.sql
└── public/
	├── sample-csvs/
	└── screenshots/
```

## Processing Flow

Salary dispatch now runs as a background workflow:

1. The admin uploads a salary CSV or Excel file.
2. The app parses the file and shows a preview table.
3. The admin confirms the data.
4. The app creates a `dispatch_jobs` row in Supabase.
5. The uploaded rows are queued through QStash.
6. QStash calls `POST /api/dispatch/worker`.
7. The worker processes the next batch, looks up employees, generates PDFs, sends emails, and inserts successful salary records into `salary_records`.
8. The worker updates job counters and requeues itself until the batch is complete.
9. The UI polls `GET /api/dispatch/[jobId]` and shows live progress.

## Local Setup

### Prerequisites

- Node.js 20 LTS or newer
- npm
- A Supabase project
- Upstash Redis and QStash accounts
- Gmail or another SMTP provider

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root and set the required values.

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

QSTASH_TOKEN=
QSTASH_URL=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM=
COMPANY_NAME=
EMAIL_MODE=
```

Notes:
- `QSTASH_URL` can be left empty in production.
- For local QStash testing, set `QSTASH_URL=http://127.0.0.1:8080`.
- `EMAIL_MODE=dummy` can be used for local testing when you do not want to send real emails.
- Keep all secret values server-side only.

### 3. Set up the database

Run `supabase/schema.sql` in your Supabase SQL editor. It creates:

- `employees`
- `salary_records`
- `dispatch_jobs`

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Using the Application

- Upload the employee master file first if you want to prepare the employee table.
- Upload the salary dispatch file after that.
- Review the preview grid for missing columns, invalid values, and missing employee records.
- Fix rows directly in the UI before dispatching.
- Start the dispatch run and watch the live status panel while QStash processes the batches.

## Expected Data

### Employee master upload

Required columns:

- `employee_id`
- `name`
- `email`
- `designation`

Optional columns:

- `birth_year`

### Salary dispatch upload

Required columns:

- `employee_id`
- `base_salary`
- `hra`
- `allowances`
- `deductions`
- `month`
- `year`

Optional columns:

- `net_salary` - if missing, the app calculates it from the salary fields

## Scalability Highlights

- Queue-based processing keeps the UI fast even when the payroll run is large.
- QStash moves work out of the browser request/response path.
- Batch processing reduces the cost of large dispatch runs.
- The `dispatch_jobs` table keeps job state, results, and timestamps for retries and auditing.
- Live polling gives visibility without blocking the client session.
- The design is suitable for hundreds of emails in one run.

## Database Schema

Payflow uses three main tables in Supabase.

### `employees`

Employee master data used to resolve names, emails, and designations.

| Column | Type | Description |
| --- | --- | --- |
| `employee_id` | `text` | Primary key and employee identifier |
| `name` | `text` | Employee full name |
| `email` | `text` | Email address used for salary slip delivery |
| `designation` | `text` | Job title or role |
| `birth_year` | `int` | Optional metadata used by the PDF password helper |

### `salary_records`

Stored salary data used to generate and archive salary slips.

| Column | Type | Description |
| --- | --- | --- |
| `id` | `bigint` | Auto-generated primary key |
| `employee_id` | `text` | Foreign key to `employees.employee_id` |
| `base_salary` | `numeric(12, 2)` | Base salary amount |
| `hra` | `numeric(12, 2)` | House rent allowance |
| `allowances` | `numeric(12, 2)` | Additional allowances |
| `deductions` | `numeric(12, 2)` | Deducted amount |
| `month` | `int` | Payroll month |
| `year` | `int` | Payroll year |
| `net_salary` | `numeric(12, 2)` | Final computed salary |

### `dispatch_jobs`

Stores each queued dispatch run and the dashboard state for that run.

| Column | Type | Description |
| --- | --- | --- |
| `id` | `uuid` | Primary key for the job |
| `upload_type` | `text` | Job type, currently `salary` |
| `status` | `text` | `queued`, `processing`, `completed`, or `failed` |
| `total_rows` | `int` | Total rows submitted for processing |
| `processed_rows` | `int` | Rows already processed by the worker |
| `success_rows` | `int` | Rows sent successfully |
| `failed_rows` | `int` | Rows that failed during processing |
| `skipped_rows` | `int` | Rows that could not be processed |
| `rows` | `jsonb` | Raw uploaded rows stored with the job |
| `results` | `jsonb` | Row-level result history |
| `error_message` | `text` | Last error message, if any |
| `created_at` | `timestamptz` | Creation time |
| `updated_at` | `timestamptz` | Last update time |
| `started_at` | `timestamptz` | Time processing started |
| `completed_at` | `timestamptz` | Time processing completed |

### Relationships

- `salary_records.employee_id` references `employees.employee_id`.
- `dispatch_jobs.rows` stores the queued payload for the worker.
- `dispatch_jobs.results` stores the live row-level outcome list.
- The `updated_at` field is maintained by a trigger on `dispatch_jobs`.

### Salary Calculation

```text
Net Salary = (Base Salary + HRA + Allowances) - Deductions
```

If `net_salary` is missing in the upload, the app calculates it from the other salary fields.

## API Routes

### `POST /api/upload`

- Parses a CSV or Excel file.
- Returns columns, rows, and total row count.
- Used by the preview screen.

### `POST /api/employees`

- Upserts employee master rows into Supabase.
- Used when the admin uploads an employee master file.

### `POST /api/employees/validate`

- Validates employee IDs against the employee master table.
- Returns missing employee IDs.

### `POST /api/employees/lookup`

- Fetches employee names and emails for employee IDs.
- Returns IDs that cannot be found in the database.

### `POST /api/dispatch`

- Creates a `dispatch_jobs` record.
- Stores the uploaded rows.
- Enqueues the job through QStash.
- Returns a job snapshot.

### `GET /api/dispatch/[jobId]`

- Returns the current job snapshot.
- Used by the UI to poll live status.

### `POST /api/dispatch/worker`

- Receives QStash callback requests.
- Processes the next batch.
- Generates PDFs, sends emails, and writes successful rows into `salary_records`.
- Updates the job record and requeues itself when more rows remain.

### API Flow Summary

1. Upload data through `POST /api/upload`.
2. Validate employees with `POST /api/employees/validate` and `POST /api/employees/lookup`.
3. Save employee master data with `POST /api/employees`.
4. Start dispatch with `POST /api/dispatch`.
5. Poll `GET /api/dispatch/[jobId]` while QStash calls `POST /api/dispatch/worker`.

## Deployment on Vercel

Yes, the app is hostable on Vercel.

What you need to configure:

- Supabase environment variables
- Upstash Redis REST URL and token
- QStash token and signing keys
- Gmail or SMTP variables
- `QSTASH_URL` for local mode only

The production build is compatible with Vercel because the app uses standard Next.js route handlers and server-side code. Use the deployed Vercel URL as the QStash worker destination in production.

## Screenshots

### Home

![Home](public/screenshots/landingPage.png)

### Upload Table

![Upload Table](public/screenshots/dataUpload.png)

### Live Update

![Live Update](public/screenshots/liveupdataion_table.png)

### PDF Example

![PDF Example](public/screenshots/pdfExampl1e.png)

### Email Notification

![Email Notification](public/screenshots/email.png)

## Notes

- The app uses Supabase for data storage and job state.
- Salary slips are generated dynamically and emailed as PDF attachments.
- The live dispatch panel shows processing progress, sent count, and failed count.
- Upload rows can be edited before dispatch.
- The app can be run locally with QStash local mode or deployed to Vercel.

## Future Enhancements

- Add retry controls for failed dispatch rows.
- Add a richer audit history for past payroll runs.
- Add worker metrics for long-running batches.
- Add PDF encryption if native runtime support is preferred later.
