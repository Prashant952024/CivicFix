# CivicFix AI Agent Guidelines & Engineering Rules

This file establishes strict engineering rules and guidelines for all AI agents working on the CivicFix codebase.

---

## 1. Golden Rules of CivicFix Development

1. **NEVER BYPASS DATABASE RLS**: Never disable RLS, write insecure bypass policies, or use the Supabase Service Role Key on the frontend.
2. **RESPECT THE DUAL WORKFLOW ARCHITECTURE**: Keep `SIMPLE` (routine municipal resolution) and `COMPLEX` (academic & engineering innovation) workflows strictly separated.
3. **PRESERVE ROLE SEPARATION**:
   - `ADMIN` is for Platform Governance, Monitoring, User Management, and Issue Classification Override. Admin is **READ-ONLY** on Innovation operations.
   - `INNOVATION_MANAGER` is the sole operational mutator for Challenges, Matches, Proposals, and R&D Projects.
4. **MIGRATION DISCIPLINE**: Never edit applied migrations. Always write sequential, idempotent migrations (`0054_*.sql`, etc.) with reversible rollbacks.
5. **KEEP POSTGIS QUERIES SAFE**: Always use parameterized coordinates and bounding boxes to prevent SQL injection in spatial calculations.
6. **EDGE FUNCTION RESILIENCE**: Every Gemini invocation must specify schema validation, error cascading (e.g. `gemini-2.5-flash` $\to$ `gemini-1.5-flash`), and handle rate-limiting gracefully.
7. **PROPOSAL COMPLETENESS INTEGRITY**: Never bypass the 11-section validation rule for university proposals.
8. **UNAUTHENTICATED TEAM MEMBER SUPPORT**: Retain support for academic research team members without mandatory login accounts (Migration 0039).
9. **ZERO BREAKING UI REGRESSIONS**: Maintain responsive Tailwind CSS v4 layouts across mobile field worker screens and desktop admin portals.
10. **ALWAYS RUN BUILD VERIFICATION**: Before declaring any coding task complete, run `npm run build` (`tsc -b && vite build`) to guarantee 0 TypeScript/build errors.

---

## 2. Directory & Coding Conventions

- **Frontend Routes**: `src/routes/` uses React Router v7 / standard layout wrapping with `RequireRole` guards.
- **Components**: Group by domain (`src/components/common/`, `src/components/innovation/`, `src/components/citizen/`, etc.).
- **Data Layer**: Centralized API functions live in `src/lib/civicfix.ts` and `src/lib/supabase.ts`.
- **Database Migrations**: Located in `supabase/migrations/` following timestamp/numeric sequence.
- **Edge Functions**: Located in `supabase/functions/` in Deno TypeScript.

---

## 3. Reference Documentation Map

Before modifying any subsystem, consult the definitive documentation:
- Architecture Overview: [`CIVICFIX_ARCHITECTURE.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/CIVICFIX_ARCHITECTURE.md)
- Feature Registry: [`docs/FEATURE_REGISTRY.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/FEATURE_REGISTRY.md)
- Role Permissions: [`docs/ROLE_PERMISSION_MATRIX.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/ROLE_PERMISSION_MATRIX.md)
- Database Schema: [`docs/DATABASE_REFERENCE.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/DATABASE_REFERENCE.md)
- State Machines: [`docs/STATE_MACHINES.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/STATE_MACHINES.md)
- AI Pipelines: [`docs/AI_ARCHITECTURE.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/AI_ARCHITECTURE.md)
- Data Flows: [`docs/DATA_FLOWS.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/DATA_FLOWS.md)
- Gaps & Roadmap: [`docs/IMPLEMENTATION_GAP.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/IMPLEMENTATION_GAP.md)
- File Map: [`docs/FEATURE_FILE_MAP.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/FEATURE_FILE_MAP.md)
- Directory Map: [`docs/PROJECT_DIRECTORY.md`](file:///Users/prashantkumar/Documents/ChatGPT/CivicFix/docs/PROJECT_DIRECTORY.md)
