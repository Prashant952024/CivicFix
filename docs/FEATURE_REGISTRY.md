# CivicFix Feature Registry

---

### Feature: Multilingual Citizen Reporting
- **Status**: `IMPLEMENTED`
- **Roles**: `CITIZEN`
- **Frontend**: `src/routes/citizen/report.tsx`, `src/lib/i18n/context.tsx`, `src/components/citizen/language-selector.tsx`
- **Backend**: None (Client-side i18n dictionary interpolation)
- **Database**: `public.issues`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Citizens can toggle between English (`en`), Hindi (`hi`), and Marathi (`mr`). All labels, error messages, and form placeholders adapt instantly. Selected language persists in `localStorage`.
- **Known limitations**: Custom user-typed text is not auto-translated in the UI (it is stored verbatim).
- **Dependencies**: Custom i18n React Context.

---

### Feature: Multilingual Voice Input
- **Status**: `IMPLEMENTED`
- **Roles**: `CITIZEN`
- **Frontend**: `src/components/citizen/voice-input-button.tsx`, `src/routes/citizen/report.tsx`
- **Backend**: Supabase Edge Function
- **Database**: None (in-flight transcription)
- **Edge Functions**: `supabase/functions/transcribe-voice/index.ts`
- **Storage**: None (ephemeral in-memory audio chunk processing)
- **AI**: Google Gemini API (`gemini-2.5-flash`, `gemini-2.0-flash`)
- **Current behavior**: Citizens click the microphone button, record speech in English, Hindi, or Marathi, and Gemini transcribes the audio into verbatim text populated directly into the editable issue description field.
- **Known limitations**: Requires browser microphone permissions (`navigator.mediaDevices.getUserMedia`).
- **Dependencies**: Browser MediaRecorder API, Gemini Flash multimodal API.

---

### Feature: Multimodal Issue Diagnostic & Triage
- **Status**: `IMPLEMENTED`
- **Roles**: `CITIZEN`, `MUNICIPAL_OFFICER`, `ADMIN`, `INNOVATION_MANAGER`
- **Frontend**: `src/routes/citizen/report.tsx`, `src/routes/officer/issue-details.tsx`
- **Backend**: Supabase Edge Function
- **Database**: `public.issue_ai_analysis`, `public.issues`
- **Edge Functions**: `supabase/functions/analyze-issue/index.ts`
- **Storage**: `issue-images` bucket
- **AI**: Google Gemini API (`gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-2.0-flash`)
- **Current behavior**: When an issue is created, photo evidence and text description are analyzed to predict category, severity (`LOW`–`CRITICAL`), priority (`LOW`–`URGENT`), department, confidence score, diagnostic explanation, and complexity score (0–100).
- **Known limitations**: Requires valid Gemini API key in Supabase secrets.
- **Dependencies**: Supabase Storage, Google AI Studio.

---

### Feature: 4-Signal Duplicate Issue Clustering
- **Status**: `IMPLEMENTED`
- **Roles**: `MUNICIPAL_OFFICER`, `ADMIN`
- **Frontend**: `src/routes/officer/issue-details.tsx`, `src/lib/duplicate-clustering.ts`
- **Backend**: Supabase Edge Function
- **Database**: `public.issue_duplicates`, `public.canonical_duplicate_clusters`
- **Edge Functions**: `supabase/functions/detect-duplicates/index.ts`
- **Storage**: None
- **AI**: Mathematical algorithms (Haversine GPS 35%, Category 25%, Dice Token Similarity 25%, Exponential Time Decay 15%)
- **Current behavior**: Evaluates incoming reports against existing issues within 30 days and 500 meters. Scores $\ge 40\%$ are recorded and flagged for municipal officer review.
- **Known limitations**: Merging is supervised (requires officer confirmation).
- **Dependencies**: Mathematical spatial and string similarity utilities.

---

### Feature: Admin Issue Classification Authority
- **Status**: `IMPLEMENTED`
- **Roles**: `ADMIN`
- **Frontend**: `src/routes/admin/classification.tsx`, `src/lib/admin.ts`
- **Backend**: Database Trigger & Direct Postgres Mutation
- **Database**: `public.issues` (`final_issue_type`, `classification_override_reason`)
- **Edge Functions**: None
- **Storage**: None
- **AI**: Consumes suggested classification from `issue_ai_analysis`
- **Current behavior**: Only authenticated Admins have database authority (enforced by trigger `enforce_issue_classification_authority`) to approve or override `final_issue_type` to `SIMPLE`, `COMPLEX`, or `DEVELOPMENT`.
- **Known limitations**: Non-admin users attempting to mutate `final_issue_type` are rejected by PostgreSQL.
- **Dependencies**: Migration 0052.

---

### Feature: Simple Issue Dispatch & Field Worker Workflow
- **Status**: `IMPLEMENTED`
- **Roles**: `MUNICIPAL_OFFICER`, `DEPARTMENT_MANAGER`, `FIELD_WORKER`
- **Frontend**: `src/routes/officer/`, `src/routes/department/`, `src/routes/worker/`
- **Backend**: Database RLS & Triggers
- **Database**: `public.issue_department_assignments`, `public.department_worker_assignments`, `public.issues`
- **Edge Functions**: None
- **Storage**: `resolution-images` bucket
- **AI**: None
- **Current behavior**: Officers route verified issues to departments; managers assign workers; workers accept tasks, execute work, and upload completion photos; managers review quality and approve or request rework.
- **Known limitations**: Workers must have network connectivity to upload resolution photos.
- **Dependencies**: Supabase Storage, PostgreSQL RLS.

---

### Feature: Citizen Ground Verification & Reopen Loop
- **Status**: `IMPLEMENTED`
- **Roles**: `CITIZEN`
- **Frontend**: `src/routes/citizen/issue-details.tsx`
- **Backend**: Database Triggers
- **Database**: `public.citizen_verifications`, `public.issues`, `public.issue_status_history`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: When an issue is resolved, the reporting citizen inspects before/after photos and submits `VERIFIED` (permanently closing the issue) or `UNRESOLVED` (reopening the issue back to `UNDER_REVIEW`).
- **Known limitations**: Only the original reporter can submit verification.
- **Dependencies**: Migration 0013.

---

### Feature: AI Innovation Challenge Synthesis
- **Status**: `IMPLEMENTED`
- **Roles**: `INNOVATION_MANAGER`
- **Frontend**: `src/routes/innovation/problem-control-center.tsx`
- **Backend**: Supabase Edge Function
- **Database**: `public.innovation_challenges`
- **Edge Functions**: `supabase/functions/generate-challenge/index.ts`
- **Storage**: None
- **AI**: Google Gemini API (`gemini-2.5-flash`)
- **Current behavior**: Innovation Managers click "Formulate Challenge" on complex grievances. Gemini synthesizes a structured R&D challenge covering root causes, affected population, constraints, objectives, and success criteria.
- **Known limitations**: Generated drafts must be reviewed and saved by the manager.
- **Dependencies**: `analyze-issue` diagnostic context.

---

### Feature: 8-Dimensional University Capability Matching
- **Status**: `IMPLEMENTED`
- **Roles**: `INNOVATION_MANAGER`
- **Frontend**: `src/routes/innovation/challenge-matching.tsx`, `src/lib/matching.ts`
- **Backend**: Supabase Edge Function
- **Database**: `public.institutions`, `public.institution_match_runs`, `public.institution_matches`
- **Edge Functions**: `supabase/functions/match-institutions/index.ts`
- **Storage**: None
- **AI**: Mathematical capability scoring + Gemini qualitative evaluation
- **Current behavior**: Ranks 105 accredited universities across 8 dimensions (domains, expertise, tools, labs, facilities, equipment, field capabilities, past pilots) and displays ranked fit scores with dimensional breakdowns.
- **Known limitations**: Rerunning matching takes ~2–4 seconds due to multi-dimensional matrix evaluation.
- **Dependencies**: Migration 0032 (Institution Registry).

---

### Feature: University Research Project Workspace & Team Roster
- **Status**: `IMPLEMENTED`
- **Roles**: `INSTITUTION`, `INNOVATION_MANAGER`, `ADMIN` (Read-only)
- **Frontend**: `src/routes/university/projects/`, `src/components/projects/team-member-card.tsx`
- **Backend**: Database Triggers & RLS
- **Database**: `public.challenge_projects`, `public.challenge_project_members`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Universities form project teams consisting of Project Leads, Faculty, PhD Researchers, and Technical Engineers. Supports non-authenticated research profiles without requiring separate Clerk accounts.
- **Known limitations**: Project leads can only be assigned from verified institutional personnel.
- **Dependencies**: Migration 0039.

---

### Feature: 11-Section Research Proposal Submission & Review
- **Status**: `IMPLEMENTED`
- **Roles**: `INSTITUTION`, `INNOVATION_MANAGER`
- **Frontend**: `src/routes/university/projects/proposal.tsx`, `src/routes/innovation/proposal-review.tsx`
- **Backend**: Database Triggers (`trg_validate_research_proposal_creation`, `trg_enforce_research_proposal_governance`)
- **Database**: `public.research_proposals`, `public.challenge_project_activity`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Universities author structured 11-section proposals (objectives, research questions, methodology, technical approach, resources, prototype, milestones, deliverables, risks, success metrics). Once submitted, proposal content is locked against tampering. Innovation Managers review, request revisions, or approve.
- **Known limitations**: Approved proposals are permanently immutable.
- **Dependencies**: Migration 0040, Migration 0041.

---

### Feature: Real-World Testbed Pilot Planning & Telemetry
- **Status**: `IMPLEMENTED`
- **Roles**: `INNOVATION_MANAGER`, `INSTITUTION`
- **Frontend**: `src/routes/innovation/pilots.tsx`, `src/lib/pilot-planning.ts`
- **Backend**: Database RLS & API
- **Database**: `public.pilot_plans`, `public.pilot_metric_telemetry`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Governs testbed pilot deployment, safety protocols, and live telemetry metric streams with threshold breach detection.
- **Known limitations**: Hardware sensor telemetry pushes via REST endpoints rather than MQTT broker webhooks.
- **Dependencies**: Migration 0046, Migration 0047.

---

### Feature: Complex Solution Knowledge Base & Reuse Engine
- **Status**: `IMPLEMENTED`
- **Roles**: `INNOVATION_MANAGER`, `ADMIN`
- **Frontend**: `src/routes/innovation/knowledge.tsx`, `src/lib/solution-knowledge.ts`
- **Backend**: Database RLS
- **Database**: `public.complex_solution_knowledge_base`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Indexes validated pilot solutions into an authoritative solution catalog for cross-municipality reuse and policy guideline generation.
- **Known limitations**: Publishing solutions requires completed pilot validation.
- **Dependencies**: Migration 0050.

---

### Feature: Innovation Marketplace & Co-Funding
- **Status**: `IMPLEMENTED`
- **Roles**: `INSTITUTION`, `INDUSTRY_PARTNER`, `INNOVATION_MANAGER`
- **Frontend**: `src/routes/university/marketplace.tsx`, `src/routes/industry/marketplace.tsx`
- **Backend**: Database RLS
- **Database**: `public.marketplace_listings`, `public.marketplace_applications`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Universities publish resource/co-funding requirements; industry partners browse listings and submit co-funding applications.
- **Known limitations**: Monetary transactions are tracked as commitments rather than integrated Stripe payment gateways.
- **Dependencies**: Migration 0044.

---

### Feature: Staff User Provisioning & Deprovisioning
- **Status**: `IMPLEMENTED`
- **Roles**: `ADMIN`
- **Frontend**: `src/routes/admin/users.tsx`
- **Backend**: Supabase Edge Functions + Clerk Backend SDK
- **Database**: `public.profiles`, `public.roles`, `public.departments`, `public.institutions`
- **Edge Functions**: `supabase/functions/admin-create-user/index.ts`, `supabase/functions/admin-delete-user/index.ts`
- **Storage**: None
- **AI**: None
- **Current behavior**: Admins create municipal staff and institution accounts with automatic Clerk identity provisioning and Supabase profile linking.
- **Known limitations**: Only Admins can invoke these edge functions.
- **Dependencies**: Clerk Secret Key, Supabase Service Role Key.

---

### Feature: Geospatial Citywide Map
- **Status**: `UI_ONLY`
- **Roles**: `MUNICIPAL_OFFICER`
- **Frontend**: `src/routes/officer/map` (`PlaceholderPage`)
- **Backend**: Database has PostGIS coordinates (`latitude`, `longitude` on `issues`)
- **Database**: `public.issues`
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Renders a placeholder card describing geospatial issue visualization.
- **Known limitations**: Mapbox / Leaflet tile layer is not yet mounted.
- **Dependencies**: PostGIS coordinates in database.

---

### Feature: Officer Throughput Analytics View
- **Status**: `UI_ONLY`
- **Roles**: `MUNICIPAL_OFFICER`
- **Frontend**: `src/routes/officer/analytics` (`PlaceholderPage`)
- **Backend**: None (Platform analytics exist in `/app/admin/analytics`)
- **Database**: None
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Renders a placeholder card describing officer throughput metrics.
- **Known limitations**: Officer-specific sub-analytics are not yet rendered in this specific sub-route.
- **Dependencies**: Issue status history logs.

---

### Feature: Public Zero-Auth Sandbox Demo Hub
- **Status**: `MOCKED`
- **Roles**: Public / Unauthenticated
- **Frontend**: `src/demo/demo-hub.tsx`, `src/demo/demo-layout.tsx`
- **Backend**: None (In-memory state provider)
- **Database**: None
- **Edge Functions**: None
- **Storage**: None
- **AI**: None
- **Current behavior**: Allows evaluators to simulate Officer triage and Field Worker task execution in an isolated React state sandbox without touching production database tables.
- **Known limitations**: State resets on page reload.
- **Dependencies**: `DemoProvider` context.
