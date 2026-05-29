# Payflow

## Project Title
Payflow Console — Payflow

## Overview
Payflow is a web application for automating payflow uploads, validation, PDF salary slip generation and email dispatch. It provides an admin-facing UI to upload employee or salary spreadsheets, preview and edit rows, validate required columns and fields, then generate and email personalized PDF salary slips to employees.

## What the project does
- Accepts CSV or XLSX uploads (first sheet extracted).
- Validates required columns and data types.
- Shows a preview table with inline row editing.
- Generates dynamic PDF salary slips and dispatches them via email.
- Streams salary dispatch progress and shows results.

## Problem it solves
Manual payflow email distribution is time-consuming, error-prone, and hard to audit. Payflow automates the parsing, validation, PDF generation, and email dispatch of salary slips, reducing manual effort and improving accuracy and traceability.

## Key objectives
- Fast, reliable bulk payflow processing.
- Clear preview and validation before dispatch.
- Simple setup and extensible architecture.

## Live Demo
- Live URL: (add your public URL here)
- Demo Video URL: (link to demo video)
- GitHub Repository URL: (add repository URL)

## Features
### Main functionalities
- Upload CSV/XLSX files and extract first sheet.
- Column and row validation with inline edit.
- Employee lookup for missing records.
- PDF salary slip generation per employee.
- Email dispatch with per-recipient results and progress tracking.
- Separate behaviors for `employees` and `salary` uploads.

### Key highlights
- Streamed dispatch pipeline to avoid blocking the UI.
- Compact progress UI for employee uploads and streaming progress for salary dispatch.
- Tailwind-driven responsive UI in Next.js app directory.

## Tech Stack
- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS
- Backend: Next.js API routes (serverless-style endpoints)
- Database: Supabase (Postgres) via `@supabase/supabase-js` (project includes `supabase/schema.sql`)
- Email: `nodemailer` for SMTP dispatch
- PDF: `muhammara` and `pdf-lib` for PDF generation/modification
- File parsing: `xlsx` for CSV/XLSX parsing

### Detected dependencies (from package.json)
- @supabase/supabase-js
- muhammara
- next
- nodemailer
- pdf-lib
- react, react-dom
- react-hot-toast
- xlsx

### Dev dependencies
- tailwindcss, @tailwindcss/postcss
- typescript, ts-node
- eslint

## System Architecture
Payflow follows a simple web-frontend + serverless API pattern:
- User uploads file from the UI → POST `/api/upload` handles parsing and validation → returns a preview JSON.
- Admin reviews preview, edits rows (in-memory), then confirms.
- For salary dispatch: the client opens a streaming connection to `/api/dispatch/stream` which returns per-record events and final summary.
- The server builds PDFs (dynamic PDF engine) and sends emails via SMTP (Nodemailer).

### Architecture Diagram
(Replace with a diagram image if available) 
```
[Upload UI] -> /api/upload -> [Validation] -> [Preview Table] -> /api/dispatch -> [PDF Engine] -> [SMTP] -> Email
```

## Folder Structure
(Top-level important files and folders)
```
app/
	page.tsx            # Main UI, upload flow, preview and dispatch wiring
	components/
		Landing.tsx
		payflow/
			PreviewTables.tsx
			BottomBar.tsx
			ConfirmModal.tsx
			RowEditModal.tsx
			LiveDispatchPanel.tsx
lib/
	supabase/server.ts
repositories/
	employeesRepository.ts
	salaryRecordsRepository.ts
services/
	dispatchService.ts
	employeesService.ts
	generatePDF.ts
	sendEmail.ts
public/
	preview/pdfExample.png (optional)
supabase/
	schema.sql
package.json
README.md
```

## Application Flow
1. Choose upload type: `employees` (master) or `salary` (payflow slips).
2. Upload CSV/XLSX (first sheet extracted and validated against required columns).
3. Preview data in a table, edit rows inline if needed.
4. Confirm to dispatch: generate PDFs and send emails. For salary dispatch, progress is streamed and displayed.

## Screenshots
- Home Page: `app/page.tsx` (Header + upload panel)
- Processing Page: Upload preview + Confirm modal
- Results Dashboard: Dispatch results + Live dispatch panel
- Generated PDF: (save a sample under `public/preview/pdfExample.png`)

## Database Design
Tables (example from `supabase/schema.sql`):
- `employees` (employee_id PK, name, email, designation, ...)
- `salary_records` (id PK, employee_id FK, month, year, base_salary, hra, allowances, deductions, net_salary, status)

Relationships: `salary_records.employee_id` -> `employees.employee_id`

## API Documentation
### Internal API Endpoints
- `POST /api/upload` — Accepts file in form-data, parses first sheet, validates required columns, returns preview JSON.
- `POST /api/employees/lookup` — Given a list of IDs, returns matching employee metadata and missing IDs.
- `POST /api/employees` — Upsert employee master records (used when saving edited rows for `employees` uploads).
- `POST /api/dispatch` — Start a dispatch job for salary upload (non-streaming).
- `GET /api/dispatch/stream` — Streaming endpoint: returns per-record events and final summary while dispatching.
- `POST /api/upload/validate` (internal helper) — Validate headers and sample rows.

### External Services Used
- SMTP server via Nodemailer (or any transactional email provider with SMTP)
- Supabase (Postgres) for persistence and employee lookup

## Prerequisites
- Node.js 18+ (recommended)
- Supabase account (for Postgres) or other Postgres-compatible DB
- SMTP credentials (host, port, user, pass)

## Installation Guide
1. Clone repository
```bash
git clone <repo-url>
cd payflow
```
2. Install dependencies
```bash
npm install
```
3. Configure environment variables (see section below)
4. Run database setup: apply `supabase/schema.sql` to your Postgres database
5. Start development server
```bash
npm run dev
```

## Environment Variables
Create a `.env` file in the project root with the following values:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key (server-side only)
- `DATABASE_URL` — Postgres connection string (if used directly)
- `SMTP_HOST` — SMTP server host
- `SMTP_PORT` — SMTP server port
- `SMTP_USER` — SMTP user
- `SMTP_PASS` — SMTP password
- `EMAIL_FROM` — Default from address for salary emails
- `NEXTAUTH_URL` — (if authentication used)

## Dependencies
(Extracted from `package.json`)
- Production dependencies: `@supabase/supabase-js`, `muhammara`, `next`, `nodemailer`, `pdf-lib`, `react`, `react-dom`, `react-hot-toast`, `xlsx`
- Dev dependencies: `tailwindcss`, `@tailwindcss/postcss`, `typescript`, `ts-node`, `eslint`

## Security & Validation
- Input validation: All uploaded files are parsed server-side and validated for required headers and types. Rows with missing required fields are flagged in the preview.
- Credential management: Store secrets in environment variables and do not commit `.env` to version control.
- File validation: Limit accepted file types to `.csv`, `.xls`, `.xlsx` and check file size before processing.

## Performance Optimizations
- Bulk processing: Dispatch handler batches PDF generation and email sending; streaming output prevents blocking and reduces client-side timeouts.
- Database indexing: Add indexes on `employee_id`, `month`, `year` on `salary_records` for faster lookups.
- Efficient PDF generation: Reuse templates and only fill per-employee fields rather than re-rendering full templates each time.

## Assumptions & Limitations
- Assumes CSV/XLSX files use consistent headers (lowercase recommended).
- Large files may need server resources tuning; consider queueing or background workers for very large payflows.

## Future Enhancements
- Background job queue (e.g., BullMQ) for large dispatches.
- Multi-tenant support and role-based access control.
- Webhooks for delivery receipts and bounce handling.
- Attach generated PDF archive for admin download.

## Testing
- Unit tests for parsing, validation and PDF generation.
- Integration tests that mock SMTP to validate dispatch results.
- Suggested test cases: missing columns, invalid emails, numeric parsing errors, large file handling.

## Deployment
### Hosting platform
- Vercel for Next.js frontend + API routes (or any Node-friendly host)
- External Postgres (Supabase) for persistence

### Deployment steps
1. Push code to GitHub
2. Configure environment variables in the hosting provider
3. Deploy via Vercel (connect repo) or use Docker to deploy to other platforms

---

If you want, I can also:
- Add a diagram file for architecture (SVG/PNG) under `public/`.
- Commit and push `README.md` and open a PR.
- Start the dev server and run a smoke test.

---
*Generated on 2026-05-29.*
