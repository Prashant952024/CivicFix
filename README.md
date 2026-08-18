# ConsoleLog

React + Vite + TypeScript starter with Tailwind, shadcn-style UI, React Router, and a typed Supabase client.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS v4
- shadcn/ui button setup
- React Router
- Supabase JS
- lucide-react
- ESLint

## Environment

Create a `.env` file with these variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The project does not use a service role key or database migrations.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Structure

- `src/main.tsx` boots the app.
- `src/routes/` holds the router and page views.
- `src/components/layout/` holds the shell.
- `src/components/ui/button.tsx` is the shadcn-style button.
- `src/lib/supabase.ts` exports a single typed client.
