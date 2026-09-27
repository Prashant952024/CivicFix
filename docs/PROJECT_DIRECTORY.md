# CivicFix Project Directory & Source Map

This document catalogs every directory, critical module, configuration file, and entry point in the CivicFix repository.

---

## 1. High-Level Repository Layout

```text
CivicFix/
├── .github/                  # CI/CD workflows and automated checks
├── docs/                     # Source-of-Truth documentation suite
├── public/                   # Static public assets, icons, manifest
├── src/                      # Frontend TypeScript React source code
│   ├── assets/               # Local images, SVG icons, logos
│   ├── components/           # React UI components organized by domain
│   ├── context/              # React Context Providers (Auth, Theme, Notifications)
│   ├── hooks/                # Custom React Hooks
│   ├── lib/                  # Utilities, API client bindings, types, constants
│   ├── routes/               # Route components & Page views
│   ├── App.tsx               # App root component with routing & layout wrappers
│   ├── index.css             # Tailwind CSS v4 root stylesheet
│   └── main.tsx              # Application bootstrap with ClerkProvider & Router
├── supabase/                 # Backend infrastructure
│   ├── functions/            # Deno TypeScript Edge Functions (AI, User Mgmt)
│   │   ├── _shared/          # Shared Edge Function utilities (cors, gemini)
│   │   ├── admin-create-user/# Admin user provisioning with Clerk sync
│   │   ├── admin-delete-user/# Admin user deletion
│   │   ├── analyze-issue/    # Gemini 2.5 Flash issue analysis
│   │   ├── detect-duplicates/# PostGIS & semantic duplicate detection
│   │   ├── generate-challenge/# Complex problem to challenge synthesis
│   │   ├── match-institutions/# 8-dimension university matching algorithm
│   │   └── transcribe-voice/ # Multilingual voice-to-text with Gemini
│   └── migrations/           # 53 sequential, idempotent PostgreSQL migrations
├── package.json              # Dependencies and build scripts
├── tsconfig.json             # TypeScript compiler configuration
├── vite.config.ts            # Vite 8 bundler configuration
├── tailwind.config.js        # Tailwind styling configuration
├── AGENTS.md                 # 10 Golden Rules for AI agents
└── CIVICFIX_ARCHITECTURE.md  # Comprehensive system architecture specification
```

---

## 2. Source Subdirectories Breakdown (`src/`)

### 2.1 `src/components/`
- `auth/`: Sign-in, sign-up, user avatar, and Clerk auth wrappers.
- `citizen/`: Issue submission form, multilingual voice recorder, issue tracking cards, verification modal.
- `common/`: Reusable UI primitives (Buttons, Badges, Modals, Spinners, Tables, StatCards).
- `innovation/`: Challenge cards, match score visualizers, proposal section editors, team rosters, telemetry charts.
- `layout/`: App shell, Sidebar, Header, RoleSwitcher (dev only), NotificationBell, Breadcrumbs.
- `officer/`: Triage table, department dispatch selector, SLA monitor, GIS heatmap.
- `worker/`: Mobile task card, resolution image uploader, cost tracker, rework banner.

### 2.2 `src/routes/`
- `index.tsx`: Main route declaration table with `RequireAuth` and `RequireRole` route guards.
- `admin/`: Admin Control Center, User Management, Issue Governance, System Health.
- `citizen/`: Citizen Dashboard, New Report, Issue History, Track Issue.
- `department/`: Department Dispatch Queue, Worker Workload Monitor, Quality Review.
- `innovation/`: Problem Formulation Queue, Challenge Workspace, University Matches, Proposal Review, Active Projects, Testbeds.
- `officer/`: Municipal Triage, Department Performance Analytics, SLA Reports.
- `partner/`: Industry Marketplace, Commercial Bids, Co-development Workspace.
- `university/`: Received Invitations, Proposal Editor (11 Sections), Project Workspace, Team Roster, Testbed Applications.
- `worker/`: My Assigned Tasks, Task Detail, Submit Resolution Proof.

### 2.3 `src/lib/`
- `civicfix.ts`: Primary data client methods for issues, challenges, proposals, teams, and mutations.
- `supabase.ts`: Supabase client initialization, token injection, and storage helpers.
- `types.ts`: TypeScript type definitions mirroring database schemas and API payloads.
- `constants.ts`: System constants, role definitions, issue categories, and NIRF rankings.
- `utils.ts`: Date formatting, geo-distance calculations, string sanitizers.

---

## 3. Backend Edge Functions Breakdown (`supabase/functions/`)

1. `_shared/cors.ts`: Unified CORS headers supporting localhost and production domains.
2. `_shared/gemini.ts`: Common Google Gemini API client with fallback cascade.
3. `admin-create-user/index.ts`: Creates Clerk account and Supabase user profile transactionally.
4. `admin-delete-user/index.ts`: Deactivates user and removes credentials.
5. `analyze-issue/index.ts`: Evaluates issue text/images with Gemini 2.5 Flash.
6. `detect-duplicates/index.ts`: Spatial + semantic deduplication.
7. `generate-challenge/index.ts`: Structured R&D challenge generation.
8. `match-institutions/index.ts`: 8-dimensional weighted capability matching.
9. `transcribe-voice/index.ts`: Multilingual voice transcription and English translation.

---

## 4. Database Migrations History (`supabase/migrations/`)

- `0001_initial_schema.sql` to `0020_*.sql`: Core tables, enums, civic issue workflow, and basic RLS.
- `0021_*.sql` to `0035_*.sql`: PostGIS spatial indexes, innovation challenge schemas, and notification triggers.
- `0036_*.sql` to `0045_*.sql`: University registry (105 institutions), 11-section proposal engine, lock triggers.
- `0046_*.sql` to `0051_*.sql`: Testbed telemetry, validation panel schemas, industry marketplace bids.
- `0052_strict_admin_innovation_separation.sql`: Complete privilege separation making Admin read-only on Innovation.
- `0053_iit_bombay_thermal_proposal.sql`: Verified production proposal seed data and 5 genuine research team members.
