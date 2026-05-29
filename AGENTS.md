# payflow Architecture Rules

## Architecture
- Follow layered architecture
- Keep API routes thin
- Business logic belongs in /services
- Database access belongs in /repositories
- Shared utilities belong in /lib
- UI components must remain presentation-focused

## Code Quality
- Avoid duplicated logic
- Use async/await consistently
- Handle all API and database errors properly
- Prefer reusable functions over inline logic
- Keep functions small and focused

## Project Structure
- Group code by feature when possible
- Do not place complex logic directly inside React components
- Avoid direct database access from UI components
- Keep environment variables secure

## API Standards
- Return consistent JSON responses
- Use proper HTTP status codes
- Validate incoming request data

## UI/UX
- Keep UI responsive
- Show loading and error states
- Maintain clean and simple design