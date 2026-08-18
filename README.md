# CivicFix

CivicFix is a React + Vite + TypeScript foundation for civic issue reporting, Clerk authentication, and Supabase-backed data access.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS v4
- shadcn/ui button setup
- React Router
- Clerk
- Supabase JS
- lucide-react
- ESLint

## Environment

Create a `.env` file with these variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
```

The project does not use a service role key, Clerk secret key, or Gemini key in the browser.

## Supabase

This repository includes version-controlled database migrations and seed data in `supabase/`.

- `supabase/migrations/0001_civicfix_schema.sql`
- `supabase/migrations/0002_civicfix_rls.sql`
- `supabase/seed.sql`

The schema models roles, profiles, departments, issues, issue images, AI analysis, assignments, status history, duplicates, notifications, and resolution verifications.

Clerk is the identity provider. Supabase is used for PostgreSQL, RLS, Storage, Realtime, and future Edge Functions.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Structure

- `src/main.tsx` boots the app and wraps it with `ClerkProvider`.
- `src/routes/` holds the router and page views.
- `src/auth/` holds Clerk-to-Supabase bridging and route guards.
- `src/components/layout/` holds the shell.
- `src/components/ui/button.tsx` is the shadcn-style button.
- `src/lib/supabase.ts` exports a single typed client that accepts Clerk session tokens.
- `src/types/database.ts` contains the handwritten database types until Supabase CLI generation is available.

## Manual setup still required

- In Clerk Dashboard, enable the Supabase integration and copy the Clerk domain.
- In Supabase Dashboard, add Clerk as a third-party auth provider and paste the Clerk domain.
- Keep the Clerk publishable key in `VITE_CLERK_PUBLISHABLE_KEY`.
- Keep `CLERK_SECRET_KEY` server-side only if you later add backend code.
- Keep `GEMINI_API_KEY` server-side only for the future AI phase.

## Regenerating types

If the Supabase CLI is available, regenerate `src/types/database.ts` with:

```bash
supabase gen types typescript --schema public > src/types/database.ts
```
