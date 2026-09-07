# Production deployment

The site is now wired to `/api/submissions` and expects Supabase for persistence and private application documents.

## Supabase

1. Create a Supabase project.
2. Run `database/schema.sql` in the SQL editor.
3. Create a **private** Storage bucket named `applications` (or set `SUPABASE_STORAGE_BUCKET`).
4. Never expose the service-role key in browser code.

## Vercel

Deploy the repository as a Vercel project with the repository root as the project root. Vercel will serve the HTML files and Node API functions under `/api`.

Set these environment variables in Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=applications`
- `ADMIN_API_KEY` — use a long random secret
- `ALLOWED_ORIGINS` — production site origin(s), comma-separated

The admin dashboard is `/admin/`. It requires the admin API key and does not embed credentials in source code.

## Important

The API deliberately keeps public database access disabled. Documents are stored in the private bucket and only their metadata/path is saved in the submission record. Add authenticated, signed download URLs before exposing stored documents to staff.
