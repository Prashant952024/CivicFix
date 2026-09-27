# CivicFix Feature-to-File Reference Map

This document maps every primary system feature directly to its corresponding frontend components, route pages, client lib functions, Edge Functions, database tables, and database triggers.

---

## 1. Feature Map Table

| Feature Area | Frontend Route / Page | Frontend Components | Data Layer Function (`src/lib/`) | Edge Function (`supabase/functions/`) | DB Tables Affected | DB Triggers / Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Citizen Issue Reporting** | `/app/citizen/new` | `CitizenIssueForm.tsx`, `ImageUploader.tsx`, `LocationPicker.tsx` | `createCivicIssue()`, `uploadIssueImage()` | `analyze-issue` | `civic_issues`, `audit_logs` | `trg_audit_issue_insert`, `update_timestamp()` |
| **Voice Input & Translation** | `/app/citizen/new` | `VoiceRecorderModal.tsx`, `AudioVisualizer.tsx` | `transcribeVoiceAudio()` | `transcribe-voice` | None (in-memory to form) | None |
| **Duplicate Detection** | `/app/citizen/new` | `DuplicateWarningCard.tsx` | `checkDuplicateIssues()` | `detect-duplicates` | `civic_issues` | Spatial PostGIS index `idx_civic_issues_geo` |
| **Admin Governance & Triage Override** | `/app/admin/issues`, `/app/innovation/problems` | `AdminIssueTable.tsx`, `IssueClassificationModal.tsx` | `classifyIssue()`, `overrideIssueStatus()` | None | `civic_issues`, `audit_logs` | `enforce_issue_classification_authority()` |
| **Admin User Management** | `/app/admin/users` | `UserManagementTable.tsx`, `CreateUserModal.tsx` | `adminCreateUser()`, `adminDeleteUser()` | `admin-create-user`, `admin-delete-user` | `users`, `audit_logs` | Unique email & Clerk ID constraints |
| **Innovation Challenge Formulation** | `/app/innovation/problems/:problemId` | `ChallengeFormulator.tsx`, `AIGeneratorButton.tsx` | `generateChallengeAI()`, `createChallenge()` | `generate-challenge` | `innovation_challenges`, `civic_issues` | `trg_audit_challenge_creation` |
| **University 8D Capability Matching** | `/app/innovation/challenges/:id/match` | `UniversityMatchTable.tsx`, `DimensionBreakdownModal.tsx` | `runUniversityMatch()`, `getInstitutionMatches()` | `match-institutions` | `institution_matches`, `universities` | Unique `(challenge_id, university_id)` constraint |
| **Outreach & Invitation Dispatch** | `/app/innovation/challenges/:id/outreach` | `OutreachManager.tsx`, `InvitationStatusBadge.tsx` | `sendChallengeInvitation()`, `acceptInvitation()` | None | `challenge_invitations`, `notifications` | `trg_notify_invitation_sent` |
| **University 11-Section Proposal Editor** | `/app/university/proposals/new`, `/app/university/proposals/:id` | `ProposalEditor.tsx`, `SectionForm11.tsx`, `BudgetBreakdownTable.tsx` | `saveProposalDraft()`, `submitProposal()` | None | `research_proposals` | `enforce_proposal_section_completeness()`, `lock_submitted_proposal()` |
| **Academic Team Management** | `/app/university/projects/:id/team` | `ResearchTeamRoster.tsx`, `AddMemberModal.tsx` | `addResearchMember()`, `deleteResearchMember()` | None | `research_team_members` | Unique `(project_id, email)` constraint |
| **Proposal Review & Commissioning** | `/app/innovation/proposals/:id/review` | `ProposalReviewCard.tsx`, `ApprovalDecisionModal.tsx` | `reviewProposal()`, `commissionProject()` | None | `research_proposals`, `innovation_projects` | `trg_notify_proposal_decision` |
| **Testbed Pilot Telemetry Tracking** | `/app/innovation/projects/:id/testbed` | `TelemetryDashboard.tsx`, `SensorMetricChart.tsx` | `getPilotTelemetry()`, `recordTelemetryMetric()` | None | `pilot_deployments`, `pilot_telemetry` | Time-series indexing on `recorded_at` |
| **Solution Knowledge Catalog** | `/app/innovation/solutions` | `SolutionCatalogGrid.tsx`, `SolutionDetailModal.tsx` | `getSolutionCatalog()`, `publishSolution()` | None | `solution_catalog` | Full-text search index on `title_vector` |
| **Municipal Officer Triage** | `/app/officer/triage` | `OfficerTriageQueue.tsx`, `DepartmentAssignModal.tsx` | `triageCivicIssue()`, `assignDepartment()` | None | `civic_issues`, `departments` | `trg_notify_department_assigned` |
| **Department Manager Dispatch** | `/app/department/dispatch` | `ManagerDispatchBoard.tsx`, `WorkerSelectDropdown.tsx` | `dispatchFieldWorker()` | None | `civic_issues`, `users` | `trg_notify_worker_dispatched` |
| **Field Worker Execution & Proof** | `/app/worker/tasks/:id` | `WorkerTaskView.tsx`, `ResolutionProofUpload.tsx` | `startTask()`, `submitResolutionProof()` | None | `civic_issues`, `audit_logs` | Evidence photo requirement check |
| **Manager QA & Rework Loop** | `/app/department/review/:id` | `ManagerReviewPanel.tsx`, `ReworkReasonModal.tsx` | `approveResolution()`, `requestRework()` | None | `civic_issues`, `notifications` | Status transition validations |
| **Citizen Resolution Verification** | `/app/citizen/issues/:id/verify` | `CitizenVerifyModal.tsx`, `StarRatingInput.tsx` | `verifyResolution()`, `reopenIssue()` | None | `civic_issues`, `notifications` | 7-day verification window guard |
| **Industry Partner Marketplace** | `/app/partner/marketplace` | `PartnerBidsList.tsx`, `CreateOfferModal.tsx` | `submitMarketplaceOffer()`, `acceptOffer()` | None | `partner_marketplace_offers` | FK to `innovation_projects` |
| **Real-Time Notification Bell** | Header (`All Pages`) | `NotificationBell.tsx`, `NotificationDropdown.tsx` | `subscribeNotifications()`, `markAsRead()` | None | `notifications` | Supabase Realtime Channel |
