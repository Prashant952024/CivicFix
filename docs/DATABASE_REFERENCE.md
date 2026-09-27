# CivicFix Database Reference

This document provides a comprehensive specification of every table, column, relationship, trigger, function, and Row-Level Security (RLS) policy across all 53 PostgreSQL migrations in CivicFix.

---

## 1. System Enums

| Enum Type Name | Permitted Values | Definition Migration |
|---|---|---|
| `public.role_code` | `'CITIZEN'`, `'MUNICIPAL_OFFICER'`, `'DEPARTMENT_MANAGER'`, `'FIELD_WORKER'`, `'ADMIN'`, `'INNOVATION_MANAGER'`, `'INSTITUTION'`, `'INDUSTRY_PARTNER'` | `0001`, `0015`, `0028`, `0031`, `0044` |
| `public.issue_status` | `'SUBMITTED'`, `'AI_ANALYZED'`, `'UNDER_REVIEW'`, `'VERIFIED'`, `'REJECTED'`, `'ASSIGNED'`, `'IN_PROGRESS'`, `'RESOLVED'`, `'CITIZEN_VERIFIED'`, `'REOPENED'` | `0001` |
| `public.issue_type_enum` | `'SIMPLE'`, `'COMPLEX'`, `'DEVELOPMENT'` | `0027` |
| `public.issue_severity` | `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'` | `0001` |
| `public.issue_priority` | `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'URGENT'` | `0001` |
| `public.issue_image_type` | `'INITIAL_REPORT'`, `'RESOLUTION_EVIDENCE'` | `0001` |
| `public.institution_verification_status` | `'DRAFT'`, `'PENDING_VERIFICATION'`, `'VERIFIED'`, `'SUSPENDED'`, `'ARCHIVED'` | `0032` |
| `public.duplicate_detection_method` | `'GPS_PROXIMITY'`, `'CATEGORY'`, `'TIME'`, `'IMAGE_SIMILARITY'`, `'MANUAL_REVIEW'` | `0001` |
| `public.duplicate_status` | `'PENDING'`, `'CONFIRMED'`, `'DISMISSED'` | `0001` |
| `public.verification_result` | `'VERIFIED'`, `'UNRESOLVED'` | `0001` |

---

## 2. Table Specifications

### 1. `public.roles`
- **Purpose**: System role dictionary mapping role codes to display labels.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**: None
- **Important Columns**: `code` (public.role_code, unique), `name` (text, unique), `description` (text), `is_system_role` (boolean).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: All authenticated users & public
  - `INSERT` / `UPDATE` / `DELETE`: Privileged admin migrations only

---

### 2. `public.departments`
- **Purpose**: Municipal operational departments (Roads, Water Supply, Sanitation, Street Lighting, Electricity, Waste Management, Parks, Drainage, Other).
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**: None
- **Important Columns**: `name` (text, unique), `code` (text), `description` (text), `is_active` (boolean).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: All authenticated users
  - `INSERT` / `UPDATE` / `DELETE`: `ADMIN` only

---

### 3. `public.profiles`
- **Purpose**: User profile record linking Clerk user identity to CivicFix system role, department, and institution.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `role_id` $\rightarrow$ `public.roles(id)`
  - `department_id` $\rightarrow$ `public.departments(id)`
  - `institution_id` $\rightarrow$ `public.institutions(id)`
- **Important Columns**: `clerk_user_id` (text, unique), `full_name` (text), `email` (text, unique), `phone` (text), `designation` (text), `employee_id` (text), `is_active` (boolean).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Authenticated users can view own profile and colleagues. Officers/Admins can view municipal staff.
  - `INSERT`: Edge Function `admin-create-user` or self-onboarding for citizens.
  - `UPDATE`: Own user for non-sensitive fields; `ADMIN` for role/department reassignments.
  - `DELETE`: Edge Function `admin-delete-user` (Admin only).

---

### 4. `public.issues`
- **Purpose**: Central civic grievance entity tracking citizen reports, geolocation, classification, department routing, and lifecycle states.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `reporter_profile_id` $\rightarrow$ `public.profiles(id)`
  - `canonical_issue_id` $\rightarrow$ `public.issues(id)` (Self-reference for duplicate clustering)
- **Important Columns**: `title` (text), `description` (text), `category` (text), `status` (public.issue_status), `severity` (public.issue_severity), `priority` (public.issue_priority), `latitude` (double precision), `longitude` (double precision), `address_text` (text), `location_text` (text), `suggested_issue_type` (public.issue_type_enum), `final_issue_type` (public.issue_type_enum), `ai_complexity_score` (integer), `ai_complexity_reasoning` (text), `ai_required_expertise` (text[]), `classification_override_reason` (text), `is_canonical` (boolean).
- **Triggers**:
  - `enforce_issue_classification_authority()`: Intercepts `final_issue_type` updates to guarantee only `ADMIN` can set it.
  - `enforce_issue_status_transition()`: Validates allowed status transitions.
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Authenticated users & Citizens (own reports + verified public issues).
  - `INSERT`: Authenticated `CITIZEN` and `ADMIN`.
  - `UPDATE`: Role-scoped based on transition invariants.
  - `DELETE`: Denied (immutable record retention).

---

### 5. `public.issue_images`
- **Purpose**: Photos uploaded by citizens (initial report) or field workers (resolution evidence).
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `issue_id` $\rightarrow$ `public.issues(id)` (CASCADE delete)
  - `uploaded_by` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `storage_path` (text), `image_type` (public.issue_image_type), `caption` (text).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Authorized users viewing parent issue.
  - `INSERT`: Citizens (for initial report) & Assigned Workers/Managers (for resolution evidence).
  - `UPDATE` / `DELETE`: Denied.

---

### 6. `public.issue_ai_analysis`
- **Purpose**: Complete structured diagnostic payload generated by Gemini multimodal inference.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `issue_id` $\rightarrow$ `public.issues(id)` (CASCADE delete)
- **Important Columns**: `category` (text), `severity` (text), `priority` (text), `department` (text), `confidence` (numeric), `explanation` (text), `root_problem_summary` (text), `complexity_score` (integer), `complexity_reasoning` (text), `complexity_factors` (jsonb), `required_expertise` (text[]), `model_version` (text).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Officers, Managers, Innovation Managers, Admins.
  - `INSERT`: Service role (`analyze-issue` edge function).
  - `UPDATE`: Admin only (manual diagnostic adjustments).

---

### 7. `public.issue_duplicates`
- **Purpose**: Pairwise similarity evaluation between candidate and target reports.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `issue_id` $\rightarrow$ `public.issues(id)`
  - `duplicate_issue_id` $\rightarrow$ `public.issues(id)`
- **Important Columns**: `similarity_score` (numeric), `distance_meters` (numeric), `status` (public.duplicate_status), `detection_method` (public.duplicate_detection_method), `confidence` (text).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Officers, Admins.
  - `INSERT`: Service role (`detect-duplicates` edge function).
  - `UPDATE`: Officers, Admins (confirming or dismissing duplicates).

---

### 8. `public.canonical_duplicate_clusters`
- **Purpose**: Aggregation of duplicate issues linked to a single canonical master grievance.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `canonical_issue_id` $\rightarrow$ `public.issues(id)`
- **Important Columns**: `cluster_title` (text), `total_reports_count` (integer), `cluster_status` (text), `member_issue_ids` (uuid[]).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Officers, Managers, Admins.
  - `INSERT` / `UPDATE`: Officers, Admins.

---

### 9. `public.issue_department_assignments`
- **Purpose**: Routing record connecting an approved issue to a municipal department.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `issue_id` $\rightarrow$ `public.issues(id)`
  - `department_id` $\rightarrow$ `public.departments(id)`
  - `assigned_by` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `assignment_notes` (text), `is_active` (boolean).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Officers, Managers of assigned department, Admins.
  - `INSERT`: `MUNICIPAL_OFFICER`, `ADMIN`.
  - `UPDATE`: `MUNICIPAL_OFFICER`, `ADMIN` (reassignment).

---

### 10. `public.department_worker_assignments`
- **Purpose**: Operational task dispatch connecting an issue to an active field worker.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `assignment_id` $\rightarrow$ `public.issue_department_assignments(id)`
  - `worker_profile_id` $\rightarrow$ `public.profiles(id)`
  - `assigned_by` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `instructions` (text), `is_active` (boolean), `status` (text).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Department Manager, Assigned Worker, Admin.
  - `INSERT` / `UPDATE`: `DEPARTMENT_MANAGER` (matching `department_id`), `ADMIN`.

---

### 11. `public.issue_status_history`
- **Purpose**: Immutable audit log of every state transition across an issue's lifecycle.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `issue_id` $\rightarrow$ `public.issues(id)`
  - `changed_by` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `from_status` (public.issue_status), `to_status` (public.issue_status), `reason` (text), `metadata` (jsonb).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Authenticated users viewing the issue.
  - `INSERT`: Trigger-driven automatically on `public.issues` status change.

---

### 12. `public.citizen_verifications`
- **Purpose**: Ground verification sign-off submitted by the reporting citizen after work completion.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `issue_id` $\rightarrow$ `public.issues(id)`
  - `verified_by` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `result` (public.verification_result: `'VERIFIED'` or `'UNRESOLVED'`), `feedback` (text), `rating` (integer).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Reporting Citizen, Officers, Managers, Admins.
  - `INSERT`: Reporting `CITIZEN` only.

---

### 13. `public.institutions`
- **Purpose**: Registry of 105 accredited universities, research institutes, and IITs with multi-dimensional capability arrays.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Important Columns**: `name` (text, unique), `official_name` (text), `institution_type` (text), `city` (text), `state` (text), `research_domains` (text[]), `areas_of_expertise` (text[]), `technologies` (text[]), `laboratories` (text[]), `facilities` (text[]), `equipment` (text[]), `field_capabilities` (text[]), `collaboration_capabilities` (text[]), `verification_status` (public.institution_verification_status), `is_active` (boolean).
- **GIN Indexes**: Created on all capability text arrays for high-speed token search.
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: All authenticated users.
  - `INSERT` / `UPDATE` / `DELETE`: `ADMIN` only.

---

### 14. `public.innovation_challenges`
- **Purpose**: Formulated R&D challenge dossiers derived from complex civic grievances.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `source_issue_id` $\rightarrow$ `public.issues(id)` (Unique, 1:1)
  - `created_by` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `title` (text), `problem_statement` (text), `root_cause` (text), `affected_population` (text), `geographic_scope` (text), `required_domains` (text[]), `current_limitations` (text), `objectives` (text[]), `expected_outcomes` (text[]), `constraints` (text[]), `potential_technology_areas` (text[]), `research_requirements` (text), `success_criteria` (text[]), `complexity_score` (integer), `status` (text).
- **RLS Enabled**: Yes (Migration 0052)
- **Permissions**:
  - `SELECT`: `INNOVATION_MANAGER`, `ADMIN`, `INSTITUTION`, `INDUSTRY_PARTNER`.
  - `INSERT` / `UPDATE`: `INNOVATION_MANAGER` only.

---

### 15. `public.challenge_projects`
- **Purpose**: Institutional project workspace container per accepted university.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `challenge_id` $\rightarrow$ `public.innovation_challenges(id)`
  - `institution_id` $\rightarrow$ `public.institutions(id)`
  - `invitation_id` $\rightarrow$ `public.institution_invitations(id)`
  - `project_lead_profile_id` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `project_title` (text), `project_summary` (text), `status` (text: `'FORMING_TEAM'`, `'ACTIVE'`, `'PAUSED'`, `'COMPLETED'`, `'ARCHIVED'`).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Affiliated University, Innovation Manager, Admin.
  - `INSERT` / `UPDATE`: Affiliated `INSTITUTION` and `INNOVATION_MANAGER`.

---

### 16. `public.challenge_project_members`
- **Purpose**: Research team roster supporting authenticated and non-authenticated faculty, researchers, PhD scholars, and technical staff.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `project_id` $\rightarrow$ `public.challenge_projects(id)` (CASCADE delete)
  - `profile_id` $\rightarrow$ `public.profiles(id)` (Nullable)
- **Important Columns**: `role` (text: `'PROJECT_LEAD'`, `'FACULTY'`, `'RESEARCHER'`, `'STUDENT'`, `'MEMBER'`, `'ENGINEER'`, `'DATA_SCIENTIST'`, `'TECHNICAL_STAFF'`), `member_name` (text), `member_email` (text), `member_type` (text), `designation` (text), `department` (text), `institution_name` (text), `specialization` (text), `years_of_experience` (numeric), `primary_expertise` (text), `research_domains` (text[]), `technical_skills` (text[]), `technologies` (text[]), `project_responsibility` (text), `project_contribution` (text), `professional_bio` (text), `is_active` (boolean).
- **Triggers**: `enforce_project_member_governance()` enforces single active `PROJECT_LEAD` and validates non-authenticated email format.
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: University members, Innovation Manager, Admin.
  - `INSERT` / `UPDATE` / `DELETE`: Project Lead of affiliated institution.

---

### 17. `public.research_proposals`
- **Purpose**: Authoritative 11-section structured research proposals submitted by universities.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `project_id` $\rightarrow$ `public.challenge_projects(id)`
  - `challenge_id` $\rightarrow$ `public.innovation_challenges(id)`
  - `institution_id` $\rightarrow$ `public.institutions(id)`
  - `submitted_by` $\rightarrow$ `public.profiles(id)`
  - `reviewed_by` $\rightarrow$ `public.profiles(id)`
  - `approved_by` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `version_number` (integer), `status` (text: `'DRAFT'`, `'SUBMITTED'`, `'UNDER_REVIEW'`, `'REQUESTED_REVISION'`, `'RESUBMITTED'`, `'APPROVED'`, `'REJECTED'`), `is_current` (boolean), `project_objective` (text), `research_questions` (jsonb), `proposed_methodology` (text), `technical_approach` (text), `team_capability_summary` (text), `required_resources` (jsonb), `expected_prototype` (text), `milestones` (jsonb), `deliverables` (jsonb), `risks_and_mitigation` (jsonb), `success_metrics` (jsonb), `review_feedback` (text).
- **Triggers**:
  - `trg_validate_research_proposal_creation`: Enforces 11-section completeness on submission.
  - `trg_enforce_research_proposal_governance`: Locks submitted content against modification and restricts approval to `INNOVATION_MANAGER`.
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Affiliated University, Innovation Manager, Admin.
  - `INSERT`: Affiliated `INSTITUTION` Project Lead.
  - `UPDATE`: Affiliated `INSTITUTION` (when DRAFT); `INNOVATION_MANAGER` (for status governance).

---

### 18. `public.pilot_plans` & `public.pilot_metric_telemetry`
- **Purpose**: Real-world municipal testbed pilot planning, risk protocols, and empirical sensor telemetry ingestion.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `project_id` $\rightarrow$ `public.challenge_projects(id)`
  - `challenge_id` $\rightarrow$ `public.innovation_challenges(id)`
- **Important Columns**: `pilot_title` (text), `testbed_location` (text), `target_metrics` (jsonb), `safety_protocols` (text), `status` (text: `'DRAFT'`, `'APPROVED'`, `'DEPLOYED'`, `'COMPLETED'`), `telemetry_stream` (numeric sensor values, timestamps, threshold alerts).
- **RLS Enabled**: Yes
- **Permissions**:
  - `SELECT`: Affiliated University, Innovation Manager, Admin.
  - `INSERT` / `UPDATE`: Affiliated `INSTITUTION` and `INNOVATION_MANAGER`.

---

### 19. `public.complex_solution_knowledge_base`
- **Purpose**: Authoritative catalog of validated pilot solutions and policy design guidelines indexed for citywide replication.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `pilot_id` $\rightarrow$ `public.pilot_plans(id)`
  - `challenge_id` $\rightarrow$ `public.innovation_challenges(id)`
- **Important Columns**: `solution_title` (text), `solution_summary` (text), `proven_impact_metrics` (jsonb), `policy_guidelines` (text), `replication_readiness_score` (numeric).
- **RLS Enabled**: Yes (Migration 0050, 0052)
- **Permissions**:
  - `SELECT`: All authenticated users & Admins.
  - `INSERT` / `UPDATE`: `INNOVATION_MANAGER` only.

---

### 20. `public.marketplace_listings` & `public.marketplace_applications`
- **Purpose**: Innovation marketplace for research co-funding, equipment requirements, and industry partner sponsorships.
- **Primary Key**: `id` (UUID, default `gen_random_uuid()`)
- **Foreign Keys**:
  - `project_id` $\rightarrow$ `public.challenge_projects(id)`
  - `listing_id` $\rightarrow$ `public.marketplace_listings(id)`
  - `partner_profile_id` $\rightarrow$ `public.profiles(id)`
- **Important Columns**: `requirement_type` (text), `funding_target` (numeric), `application_status` (text), `contribution_details` (text).
- **RLS Enabled**: Yes (Migration 0044)
- **Permissions**:
  - `SELECT`: Universities, Industry Partners, Innovation Managers, Admins.
  - `INSERT` on Listings: Affiliated `INSTITUTION`.
  - `INSERT` on Applications: `INDUSTRY_PARTNER`.
