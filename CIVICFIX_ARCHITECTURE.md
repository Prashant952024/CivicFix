# CivicFix Architecture

## 1. Project Purpose

CivicFix is an AI-assisted municipal issue resolution and civic innovation platform designed to bridge routine neighborhood complaint management with multi-institution academic research and industrial innovation.

The platform solves two interconnected societal challenges:
1. **Simple Civic Grievances**: Accelerating the detection, validation, dispatch, repair, and citizen verification of standard municipal maintenance issues (potholes, water leaks, broken streetlights, garbage dumps).
2. **Complex Civic Challenges**: Channeling systemic, recurring, or multidisciplinary failures (urban heat islands, chronic water contamination, drainage basin bottlenecks) into formal R&D challenges with 105+ accredited universities (IITs, NITs), research teams, industry partners, structured proposals, prototypes, and real-world testbed pilots.

---

## 2. Technology Stack

### Frontend
- **Framework**: React `19.2.8` with React DOM `19.2.8`
- **Language**: TypeScript `6.0.3`
- **Build Tool**: Vite `8.2.1` with `@vitejs/plugin-react` `6.0.5`
- **Styling**: Tailwind CSS `v4.3.3` with `@tailwindcss/vite`
- **Routing**: React Router `7.18.2`
- **Icons**: Lucide React `1.31.0`
- **Class Utilities**: `clsx` `2.1.1` & `tailwind-merge` `3.6.0`
- **Authentication Client**: `@clerk/react` `6.14.4`
- **Database / API Client**: `@supabase/supabase-js` `2.112.3`
- **Localization**: Custom React Context i18n engine (`src/lib/i18n/`) supporting English (`en`), Hindi (`hi`), and Marathi (`mr`).

### Backend & Edge Compute
- **Runtime**: Deno runtime on Supabase Edge Functions (`supabase/functions/`)
- **Backend Auth SDK**: `@clerk/backend`
- **Serverless Functions (7)**:
  - `transcribe-voice`: Multimodal Gemini speech-to-text with spoken language auto-detection.
  - `analyze-issue`: Multimodal diagnostic triage, severity/priority scoring, and issue classification.
  - `detect-duplicates`: Composite 4-signal spatial & token similarity clustering.
  - `generate-challenge`: Structured innovation challenge synthesis from complex grievances.
  - `match-institutions`: 8-dimensional university capability evaluation & ranking.
  - `admin-create-user`: Clerk backend user provisioning & database profile synchronization.
  - `admin-delete-user`: User deprovisioning and relational cleanup.

### Database & Storage
- **Database**: PostgreSQL 15 (Supabase managed)
- **Migrations**: 53 sequential SQL migrations in `supabase/migrations/`
- **Security**: PostgreSQL Row Level Security (RLS) on all public tables with `SECURITY DEFINER` helper functions.
- **Storage**: S3-compatible Supabase Storage (`issue-images` and `resolution-images` buckets).

### AI Services
- **Provider**: Google Gemini API via REST `generateContent`
- **Models**: `gemini-2.5-flash` (Primary), `gemini-1.5-flash`, `gemini-2.0-flash` (Fallback)

---

## 3. System Architecture

```
[ Citizen (Mobile / Web) ]
       │
       ▼ (Photos + Audio + GPS + Text)
[ React 19 Frontend SPA ]
       │
       ├──► [ Clerk Authentication ] (Identity, MFA, JWT Session Tokens)
       │
       ├──► [ Supabase Storage ] (`issue-images`, `resolution-images`)
       │
       ├──► [ Supabase Edge Functions (Deno) ]
       │          ├── /transcribe-voice    ──► Google Gemini Flash
       │          ├── /analyze-issue       ──► Google Gemini Flash
       │          ├── /detect-duplicates   ──► Spatial Math & Token Similarity
       │          ├── /generate-challenge  ──► Google Gemini Flash
       │          ├── /match-institutions  ──► 8D Capability Engine + Gemini
       │          └── /admin-create-user   ──► Clerk Backend API
       │
       └──► [ Supabase PostgreSQL 15 Database ]
                  ├── RLS Security & Policy Enforcement
                  ├── Trigger State Guards & Invariants
                  ├── Simple Civic Pipeline (Issues, Assignments, Duplicates)
                  └── Complex Innovation Pipeline (Challenges, Projects, Proposals, Pilots)
```

---

## 4. Frontend Architecture

### Application Structure
```text
src/
├── main.tsx                  # ClerkProvider initialization & root DOM mounting
├── App.tsx                   # I18nProvider, Language context, and AppRoutes
├── index.css                 # Tailwind CSS v4 directives & design tokens
├── auth/                     # Session context, profile sync hook, and route guards
├── components/               # Domain-specific and reusable UI primitives
│   ├── citizen/              # Voice input button, Language selector
│   ├── layout/               # AppLayout, AppNavbar, AppSidebar, RootLayout
│   ├── ui/                   # Button, Card, Badge, Modal, Tabs primitives
│   ├── innovation/           # Problem Control Center sub-components
│   └── projects/             # Team member cards, Profile dialogs
├── demo/                     # Zero-auth sandbox for Officer and Worker evaluation
├── lib/                      # Supabase client, query services, domain state engines
├── routes/                   # Role-scoped page routes and sub-dashboards
└── types/                    # Database schema TypeScript types and enums
```

### Route Guard Model
- `PublicOnly`: Accessible only to unauthenticated visitors; redirects logged-in users to `/app/role-selection`.
- `RequireAuth`: Verifies active Clerk authentication; redirects unauthenticated visitors to `/login`.
- `RequireRole`: Inspects the active user profile's assigned role code against `allowedRoles`; redirects unauthorized attempts to `/unauthorized`.

---

## 5. Backend Architecture

All server-side code executes as stateless, isolated Deno Edge Functions on Supabase.
- **Request Authentication**: Inbound requests include `Authorization: Bearer <token>` and `apikey`.
- **Administrative Operations**: Privileged functions (`analyze-issue`, `generate-challenge`, `admin-create-user`) utilize `SUPABASE_SERVICE_ROLE_KEY` to query and mutate records protected by RLS.
- **CORS Handling**: Standard preflight `OPTIONS` routing with explicit method and header permissions.

---

## 6. Database Architecture

The database enforces referential integrity, domain constraints, immutable audit trails, and strict role permissions through:
- **53 Migrations**: Version-controlled, idempotent migration files.
- **Trigger-Enforced Invariants**: State transitions, authority overrides, and profile mutations are validated at the PostgreSQL trigger level.
- **Audit Logging**: Dedicated immutable activity tables (`issue_status_history`, `challenge_project_activity`, `worker_assignment_history`).

---

## 7. Authentication Architecture

1. **Authentication Provider**: Clerk manages user registration, email verification, password reset, and session issuance.
2. **Profile Synchronization (`useCivicFixProfileSync`)**:
   - Matches Clerk user ID (`clerk_user_id`) or normalized email (`email`) in `public.profiles`.
   - Populates role code, department assignment, and institution membership into the React application context.
3. **Session State (`useAppSession`)**: Exposes `profile`, `roleCode`, `needsOnboarding`, `status`, and `refresh()` across all authenticated views.

---

## 8. Authorization / RBAC

CivicFix implements 8 distinct system roles (`public.role_code`):
1. `CITIZEN`: Grievance submission, personal issue tracking, ground verification sign-off.
2. `MUNICIPAL_OFFICER`: Triage review, priority validation, department routing, sign-off.
3. `DEPARTMENT_MANAGER`: Departmental queue management, worker assignment, rework review.
4. `FIELD_WORKER`: Task acceptance, ground execution, before/after evidence capture.
5. `ADMIN`: Platform control plane, user provisioning, exclusive classification authority.
6. `INNOVATION_MANAGER`: Complex challenge formulation, university matching, proposal review, pilot governance.
7. `INSTITUTION`: University research team roster, 11-section proposal authoring, pilot execution.
8. `INDUSTRY_PARTNER`: Marketplace browsing, co-funding application, resource sponsorship.

---

## 9. AI Architecture

### 1. Multimodal Issue Triage (`analyze-issue`)
- **Input**: Title, text description, location, GPS, Base64 photographic evidence.
- **Outputs**: Category, Severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), Suggested Department, Confidence (0.0 to 1.0), Diagnostic Explanation, Suggested Issue Type (`SIMPLE`, `COMPLEX`, `DEVELOPMENT`), Complexity Score (0 to 100), Complexity Factors, and Required Expertise Disciplines.

### 2. Duplicate Detection Engine (`detect-duplicates`)
- Evaluates pairwise candidate issues within a 30-day window using a 4-signal composite formula:
  - GPS Proximity: 35%
  - Category Match: 25%
  - Text Similarity (Tokenized Dice / Levenshtein): 25%
  - Time Proximity: 15%

### 3. Innovation Challenge Synthesis (`generate-challenge`)
- Extracts complex grievance diagnostic data and synthesizes a structured R&D challenge dossier covering root cause, affected population, geographic scope, multidisciplinary domains, objectives, constraints, potential technologies, research requirements, and success criteria.

### 4. 8-Dimensional University Matching (`match-institutions`)
- Evaluates 105 accredited institutions across 8 weighted dimensions:
  - Research Domains (20%), Areas of Expertise (20%), Technologies (15%), Laboratories (10%), Facilities (10%), Equipment (10%), Field Capabilities (10%), Collaboration History (5%).
- Blends mathematical capability overlap (60%) with Gemini qualitative reasoning (40%).

### 5. Multilingual Voice Transcription (`transcribe-voice`)
- Ingests in-flight audio recordings (`webm`, `mp4`, `wav`), automatically detects spoken language (`hi`, `mr`, `en`), and streams back structured JSON containing verbatim transcription in Devanagari or Roman script.

---

## 10. Storage Architecture

| Bucket Name | Access Model | Permitted File Types | Maximum Size | Primary Use Case |
|---|---|---|---|---|
| `issue-images` | Public Read / Authenticated Upload | `image/jpeg`, `image/png`, `image/webp` | 10 MB | Citizen grievance photos |
| `resolution-images` | Public Read / Authenticated Upload | `image/jpeg`, `image/png`, `image/webp` | 10 MB | Field worker resolution evidence |

---

## 11. Notification Architecture

- **Table**: `public.notifications`
- **Delivery**: Trigger-dispatched relational rows queried real-time via `AppNavbar` badge and dedicated notification routes (`/app/*/notifications`).
- **Types**: `STATUS_CHANGE`, `ASSIGNMENT`, `SYSTEM`, `VERIFICATION`, `PROPOSAL_UPDATE`.

---

## 12. Simple Issue Workflow

```
[ Citizen Report ] ──► [ AI Analysis ] ──► [ Admin Classifies SIMPLE ]
                                                    │
                                                    ▼
[ Officer Review & Triage ] ◄───────────────────────┘
          │
          ▼ (Routes to Department)
[ Department Manager Assigns Worker ]
          │
          ▼
[ Worker Executes Task & Uploads Photo Evidence ]
          │
          ▼
[ Department Manager Reviews Quality ] ──(Needs Rework)──► [ Worker Fixes ]
          │
          ▼ (Approved)
[ Officer Final Sign-Off ]
          │
          ▼
[ Citizen Verification ] ──(Unresolved)──► [ Reopened to Officer ]
          │
          ▼ (Verified)
[ Closed & Resolved ]
```

---

## 13. Complex Issue Workflow

```
[ Citizen Report ] ──► [ AI Analysis ] ──► [ Admin Classifies COMPLEX ]
                                                    │
                                                    ▼
[ Innovation Manager Control Center ] ◄─────────────┘
          │
          ▼ (Synthesizes AI Challenge Formulation)
[ Authoritative Challenge Approved ]
          │
          ▼ (Runs 8D Capability Matching Engine)
[ Evaluates 105 Universities & Ranks Top Matches ]
          │
          ▼ (Dispatches Outreach Invitations)
[ University Accepts Invitation & Forms Project Team ]
          │
          ▼
[ University Authors 11-Section Research Proposal ]
          │
          ▼
[ Innovation Manager Reviews & Approves Proposal ]
          │
          ▼
[ Prototype Development & Marketplace Co-Funding ]
          │
          ▼
[ Testbed Pilot Planning & Live Telemetry Ingestion ]
          │
          ▼
[ Validation Panel Evaluation & Policy Guideline Delivery ]
          │
          ▼
[ Solution Published to Knowledge Hub for Citywide Reuse ]
```

---

## 14. Development Issue Workflow

- **Definition**: Long-term capital expenditure or infrastructure development grievances (flyovers, public hospitals, water filtration plants).
- **Current Architecture**: Admin classifies issue as `DEVELOPMENT`. Issue is marked with strategic development flags and routed to capital budget planning repositories for municipal engineering review.

---

## 15. Innovation Workflow

Governs the interaction between Municipal Innovation Managers, Universities, and Industry Partners:
1. **Challenge Formulation**: Structured scope definition.
2. **Matching & Selection**: 8-dimensional university capability discovery.
3. **Outreach & Invitation**: Audited formal invitation lifecycle.
4. **Project Workspace**: Isolated collaboration container per university.
5. **Research Teams**: Support for non-authenticated and authenticated faculty/scholars.
6. **Proposal Lifecycle**: 11-section structured proposal state machine.
7. **Marketplace**: Co-funding requirements and partner sponsorships.
8. **Pilots & Telemetry**: Empirical sensor data collection.
9. **Knowledge Base**: Solution reuse blueprints for cross-ward scale-up.

---

## 16. User Roles

| Role Code | Name | Primary Domain | Dashboard Route |
|---|---|---|---|
| `CITIZEN` | Citizen | Grievance Reporting & Verification | `/app/citizen` |
| `MUNICIPAL_OFFICER` | Municipal Officer | Simple Issue Triage & Routing | `/app/officer` |
| `DEPARTMENT_MANAGER` | Department Manager | Crew Dispatch & Rework Review | `/app/manager` |
| `FIELD_WORKER` | Field Worker | Physical Work Execution & Photos | `/app/worker` |
| `ADMIN` | Platform Admin | Control Plane, Governance & Analytics | `/app/admin` |
| `INNOVATION_MANAGER` | Innovation Manager | Complex Challenges & Pilots | `/app/innovation` |
| `INSTITUTION` | University Coordinator | Research Projects & Proposals | `/app/university` |
| `INDUSTRY_PARTNER` | Industry Partner | Marketplace & Sponsorships | `/app/industry` |

---

## 17. Route Architecture

- **Public Routes**: `/`, `/login/*`, `/signup/*`, `/demo/*`, `/unauthorized`, `/404`.
- **Protected Authenticated Shell**: `/app` (Wraps `<AppSessionProvider>`).
- **Role Portals**:
  - Citizen: `/app/citizen` (`dashboard`, `report`, `issues`, `issues/:issueId`, `notifications`)
  - Officer: `/app/officer` (`dashboard`, `issues`, `issues/:issueId`, `map`, `analytics`, `notifications`)
  - Manager: `/app/manager` (`dashboard`, `tasks`, `tasks/:taskId`, `workers`, `notifications`)
  - Worker: `/app/worker` (`dashboard`, `assigned-issues`, `assigned-issues/:issueId`, `notifications`)
  - Admin: `/app/admin` (`dashboard`, `classification`, `institutions`, `users`, `departments`, `issues`, `analytics`, `activity`, `notifications`)
  - Innovation: `/app/innovation` (`dashboard`, `problems`, `problems/:problemId`, `knowledge`, `collaborations`, `pilots`, `marketplace`, `challenges`, `proposals`)
  - University: `/app/university` (`dashboard`, `projects`, `projects/:projectId`, `profile`, `challenges`, `marketplace`, `notifications`)
  - Industry: `/app/industry` (`dashboard`, `marketplace`, `applications`, `listings`, `contributions`)

---

## 18. Database Relationships

```text
public.profiles
  ├── (1:N) ──► public.issues (reporter_profile_id)
  ├── (1:N) ──► public.issue_department_assignments (assigned_by)
  ├── (1:N) ──► public.department_worker_assignments (worker_profile_id)
  └── (1:N) ──► public.challenge_project_members (profile_id)

public.issues
  ├── (1:1) ──► public.issue_ai_analysis (issue_id)
  ├── (1:N) ──► public.issue_images (issue_id)
  ├── (1:N) ──► public.issue_duplicates (issue_id)
  ├── (1:N) ──► public.issue_status_history (issue_id)
  └── (1:1) ──► public.innovation_challenges (source_issue_id)

public.innovation_challenges
  ├── (1:N) ──► public.institution_matches (challenge_id)
  ├── (1:N) ──► public.challenge_institution_selections (challenge_id)
  ├── (1:N) ──► public.institution_invitations (challenge_id)
  └── (1:N) ──► public.challenge_projects (challenge_id)

public.challenge_projects
  ├── (1:N) ──► public.challenge_project_members (project_id)
  ├── (1:N) ──► public.research_proposals (project_id)
  ├── (1:N) ──► public.project_milestones (project_id)
  ├── (1:N) ──► public.project_progress_updates (project_id)
  ├── (1:N) ──► public.project_blockers (project_id)
  ├── (1:N) ──► public.marketplace_listings (project_id)
  └── (1:N) ──► public.pilot_plans (project_id)
```

---

## 19. State Machines

### 1. Simple Issue State Machine
`SUBMITTED` $\rightarrow$ `AI_ANALYZED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `VERIFIED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CITIZEN_VERIFIED` (or `REOPENED` $\rightarrow$ `UNDER_REVIEW`).

### 2. Innovation Challenge State Machine
`DRAFT` $\rightarrow$ `APPROVED` $\rightarrow$ `READY_FOR_MATCHING` $\rightarrow$ `MATCHING_IN_PROGRESS` $\rightarrow$ `MATCHING_COMPLETED` $\rightarrow$ `INSTITUTIONS_SELECTED` $\rightarrow$ `READY_FOR_INVITATION` $\rightarrow$ `INVITATIONS_SENT` $\rightarrow$ `OPEN_FOR_PROPOSALS` $\rightarrow$ `PILOT_ACTIVE` $\rightarrow$ `SOLVED` $\rightarrow$ `ARCHIVED`.

### 3. Research Proposal State Machine
`DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `APPROVED` (Terminal) or `REQUESTED_REVISION` $\rightarrow$ `RESUBMITTED` $\rightarrow$ `UNDER_REVIEW` or `REJECTED`.

---

## 20. Security Model

1. **Service Role Key Isolation**: Client code uses only public anonymous keys; service-role keys execute strictly in backend Deno functions.
2. **PostgreSQL RLS**: All 33+ relational tables enforce strict RLS policies.
3. **Trigger Invariants**: Triggers prevent non-admin classification tampering and ensure immutability of submitted research proposals.
4. **Storage Rules**: S3 buckets validate image mime-types (`jpeg`, `png`, `webp`) and enforce maximum 10MB limits.

---

## 21. Current Limitations

1. **Map Views**: `/app/officer/map` currently renders a placeholder interface pending PostGIS Leaflet/Mapbox integration.
2. **SMS/WhatsApp Gateways**: Notifications are rendered in-app; external messaging gateways are not yet wired.
3. **Live LoRaWAN Telemetry**: Ingestion schema is active; field devices push telemetry via REST endpoints rather than binary LoRaWAN broker webhooks.

---

## 22. Known Technical Debt

1. **Bundle Chunk Sizes**: Several complex operational routes (`problem-control-center`, `pilot-execution-workspace`) exceed 200 kB minified and should be refactored into lazy sub-components.
2. **Dev Persona Switching**: `/app/role-selection` allows fast switching for development; production deployment requires restricting self-service role selection to `CITIZEN`.

---

## 23. Planned Features

1. Native Mobile Push Notifications (FCM / APNs).
2. GIS Shapefile Boundary Import for Municipal Wards.
3. Real-Time WebRTC Video Assistance for Field Workers.
4. Automated Municipal ERP & Work Order Integration.
