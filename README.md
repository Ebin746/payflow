# Payflow Console

Payflow Console is a web application for employee salary slip automation. It lets an admin upload employee master data and monthly payroll files in CSV or Excel format, preview and validate the records, queue salary dispatch jobs, generate salary slip PDFs, and email each employee their slip automatically. The app also includes live dispatch status monitoring so the admin can track the progress of each run.

## Features

- Upload employee master data and monthly salary dispatch files using CSV or Excel.
- Preview uploaded data in a structured table before processing it.
- Validate required columns and highlight missing or invalid values early.
- Generate professional salary slip PDFs for each employee.
- Send salary slips automatically by email and monitor live dispatch status.
- Queue salary dispatch jobs through QStash and monitor job status from the dashboard.
- Persist every salary dispatch run in Supabase so large batches can be processed safely and resumed from the job table.
- Edit rows and columns directly in the preview table before dispatching.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase
- Upstash Redis + QStash
- Nodemailer
- PDF generation with muhammara and pdf-lib
- XLSX parsing for spreadsheet uploads

## Architecture

This project follows a layered architecture:

- `app/` - Next.js app routes, pages, and UI components
- `app/api/` - Thin API routes for upload, validation, employee lookup, and dispatch
- `app/components/` - Presentation-focused React components
- `services/` - Business logic for dispatch, PDF generation, email, and employee handling
- `repositories/` - Database access layer
- `lib/` - Shared utilities and Supabase client setup
- `supabase/` - Database schema and SQL setup
- `public/` - Static assets, sample CSV files, and screenshots

### Directory Structure

```text
payflow/
├── app/
│   ├── api/
│   ├── components/
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

Payroll dispatch now runs as a queued background workflow instead of a single blocking request:

1. Upload the salary CSV or Excel file through the UI.
2. Parse and validate the rows, then preview the data in the browser.
3. Store the uploaded rows in Supabase through the dispatch job record.
4. Create a `dispatch_jobs` row and enqueue the job through QStash.
5. QStash calls `POST /api/dispatch/worker` to process the next batch.
6. The worker looks up employees, generates the PDF, sends the email, and writes successful salary rows into `salary_records`.
7. The worker updates job counters and requeues itself until every batch is complete.
8. The UI polls `GET /api/dispatch/[jobId]` so the admin sees live progress, success, and failure counts.

This design keeps the browser responsive while long-running payroll jobs continue in the background.

## Local Installation

### Prerequisites

- Node.js 20 LTS recommended
- npm
- A Supabase project
- Gmail or another SMTP provider for email delivery

### 1. Clone the repository

```bash
git clone https://github.com/Ebin746/payflow.git
cd payflow
```

If you are not already in the project root, make sure you change into the root directory before continuing.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and copy the values from `.env.local.example`:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM=
COMPANY_NAME=

QSTASH_TOKEN=
QSTASH_URL=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
```

Fill in all required values before running the app.

For local QStash testing, set `QSTASH_URL=http://127.0.0.1:8080` and keep the local-mode token and signing keys from the Upstash local mode console.

If you run the queued dispatch flow locally, make sure the Upstash Redis REST URL and token are also configured so QStash can publish and replay the job callbacks.

### 4. Set up the database

1. Create a new Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL file at `supabase/schema.sql` to create the required tables:
   - `employees`
	- `salary_records`
	- `dispatch_jobs`

### 5. Start the development server

```bash
npm run dev
```

Then open the application at:

```text
http://localhost:3000
```

## Using the Application

- Use the sample data in `public/sample-csvs/` to test the workflow.
- First upload the employee details file with columns like `name`, `employee_id`, `email`, and `designation`.
- Then choose the salary dispatch option and upload the monthly salary details file.
- After that, confirm the data and dispatch the salary slips.
- If you need help with file structure, check the `Expected format` section in the upload card.
- You can also download the dummy template files directly from the upload section.

### Expected Data

- Employee master upload: `employee_id`, `name`, `email`, `designation`
- Salary dispatch upload: `employee_id`, `base_salary`, `hra`, `allowances`, `deductions`, `month`, `year`

## Live Demo

Access the deployed version here:

https://payflow-console.vercel.app/

## Deployment

The application is deployed on Vercel and the live link above points to the production build.

For deployment, make sure the following are configured in the Vercel project settings:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_FROM`
- `COMPANY_NAME`

The Supabase database must also be created separately by running `supabase/schema.sql` in the SQL editor.

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

- The app uses Supabase for structured data storage.
- Salary slips are generated dynamically and emailed to each employee as PDF attachments.
- Live dispatch monitoring helps the admin track progress, success, and failure status during processing.
- The dispatch UI polls the job status endpoint so the admin can see live send/fail updates while processing runs.
- Uploaded rows can be edited in the preview grid before final confirmation.

## Scalability Highlights

- Queue-backed processing keeps the UI responsive even for large payroll runs.
- QStash offloads worker execution so batches can be retried and continued without blocking the request thread.
- The `dispatch_jobs` table stores job state, counters, results, timestamps, and error messages for reliable auditability.
- Redis-backed queue delivery and batch processing make it practical to handle hundreds of emails in a single run.
- The live polling dashboard gives visibility without tying processing to the client session.

## Database Tables

Payflow uses three main tables in Supabase:

### `employees`

Stores the employee master data that is used as the source of truth for dispatching salary slips.

| Column | Type | Description |
| --- | --- | --- |
| `employee_id` | `text` | Primary key. Unique identifier for each employee. |
| `name` | `text` | Employee full name. |
| `email` | `text` | Employee email address used for sending salary slips. |
| `designation` | `text` | Job title or role. |
| `birth_year` | `int` | Optional employee metadata. |

### `salary_records`

Stores the monthly salary information that is used to generate the PDF slip and compute the net salary.

| Column | Type | Description |
| --- | --- | --- |
| `id` | `bigint` | Primary key. Auto-generated row identifier. |
| `employee_id` | `text` | Foreign key referencing `employees.employee_id`. |
| `base_salary` | `numeric(12, 2)` | Base salary amount. |
| `hra` | `numeric(12, 2)` | House rent allowance. |
| `allowances` | `numeric(12, 2)` | Additional allowances. |
| `deductions` | `numeric(12, 2)` | Total deductions. |
| `month` | `int` | Payroll month. |
| `year` | `int` | Payroll year. |
| `net_salary` | `numeric(12, 2)` | Final calculated salary amount. |

### `dispatch_jobs`

Stores each queued payroll run and the live counters used by the dashboard.

| Column | Type | Description |
| --- | --- | --- |
| `id` | `uuid` | Primary key. Generated for every queued dispatch job. |
| `upload_type` | `text` | Job type. Currently set to `salary`. |
| `status` | `text` | Queue state: `queued`, `processing`, `completed`, or `failed`. |
| `total_rows` | `int` | Total number of rows submitted for dispatch. |
| `processed_rows` | `int` | Number of rows already handled by the worker. |
| `success_rows` | `int` | Number of successful sends. |
| `failed_rows` | `int` | Number of failed sends. |
| `skipped_rows` | `int` | Number of skipped rows that could not be processed. |
| `rows` | `jsonb` | Raw uploaded rows stored with the job. |
| `results` | `jsonb` | Row-level live results returned by the worker. |
| `error_message` | `text` | Last error message when the job fails. |
| `created_at` | `timestamptz` | Time the job was created. |
| `updated_at` | `timestamptz` | Time the job was last updated. |
| `started_at` | `timestamptz` | Time processing started. |
| `completed_at` | `timestamptz` | Time processing completed. |

### Relationships

- `employees.employee_id` is the primary key for the employee master table.
- `salary_records.employee_id` is a foreign key that references `employees.employee_id`.
- This relationship ensures that every salary record belongs to a valid employee.
- The app uses `employee_id` to look up employee details when processing monthly salary uploads.
- Deleting an employee is restricted if salary records already exist for that employee.
- `dispatch_jobs.rows` stores the uploaded payload that the queue worker processes in batches.
- `dispatch_jobs.results` stores the row-level processing history shown in the live dashboard.

### Salary Calculation

The PDF generation flow uses the following formula:

```text
Net Salary = (Base Salary + HRA + Allowances) - Deductions
```

This value is stored in `salary_records.net_salary` and used in the generated salary slip PDF.

## API Routes

Payflow uses a small set of focused API routes to keep the upload and dispatch flow modular:

### `POST /api/upload`

- Parses the uploaded CSV or Excel file.
- Returns the column list, all parsed rows, and the total row count.
- Used immediately after a file is selected to build the preview table.

### `POST /api/employees/validate`

- Validates employee IDs against the employee master table.
- Returns only the missing employee IDs.
- Used before salary dispatch so invalid salary rows can be flagged early.

### `POST /api/employees/lookup`

- Fetches employee name and email details for a list of employee IDs.
- Also returns which IDs are missing from the database.
- Used to enrich salary rows with employee information in the preview table.

### `POST /api/employees`

- Upserts employee master rows into the `employees` table.
- Used when the admin uploads an employee master file.
- Confirms how many employee records were saved successfully.

### `POST /api/dispatch`

- Creates a salary dispatch job, stores the uploaded rows in `dispatch_jobs`, and pushes the job to QStash.
- Used by the UI to start queued payroll processing.
- Returns a job snapshot with queued/processing/completed state and row-level results.

### `GET /api/dispatch/[jobId]`

- Fetches the current job snapshot for polling.
- Used by the UI to show live queued-job progress.
- Exposes counters for processed, successful, failed, and skipped rows.

### `POST /api/dispatch/worker`

- Receives QStash callbacks for queued dispatch jobs.
- Processes the next salary batch, updates the job, and requeues itself if more rows remain.
- Generates PDFs, sends emails, inserts successful salary rows, and updates the job counters in Supabase.

### How the APIs Work Together

1. The user uploads a file through `POST /api/upload`.
2. The UI validates employee IDs with `POST /api/employees/validate` and enriches rows with `POST /api/employees/lookup` when needed.
3. Employee master uploads are saved through `POST /api/employees`.
4. Salary dispatch uses `POST /api/dispatch` to create a queued job, then polls `GET /api/dispatch/[jobId]` while QStash calls `POST /api/dispatch/worker`.
5. The worker batch-processes the payload until the job is marked completed or failed.

## Future Enhancements

Planned improvements for scaling and reliability:

- Better retry handling and failure recovery for email delivery.
- More detailed audit logs for admin actions and dispatch history.

