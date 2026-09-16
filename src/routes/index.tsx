import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";

import { AppSessionProvider } from "@/auth/app-session";
import { PublicOnly, RequireAuth, RequireRole } from "@/auth/route-guards";
import { AppLayout } from "@/components/layout/app-layout";
import { RootLayout } from "@/components/layout/root-layout";
import { DemoProvider } from "@/demo/demo-context";
import { DemoLayout } from "@/demo/demo-layout";

const HomePage = lazy(() => import("@/routes/home").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("@/routes/login").then((module) => ({ default: module.LoginPage })));
const NotFoundPage = lazy(() => import("@/routes/not-found").then((module) => ({ default: module.NotFoundPage })));
const RoleOnboardingPage = lazy(() => import("@/routes/onboarding").then((module) => ({ default: module.RoleOnboardingPage })));
const RoleSelectionPage = lazy(() => import("@/routes/role-selection").then((module) => ({ default: module.RoleSelectionPage })));
const CitizenDashboardPage = lazy(() => import("@/routes/citizen/dashboard").then((module) => ({ default: module.CitizenDashboardPage })));
const CitizenIssueDetailsPage = lazy(() => import("@/routes/citizen/issue-details").then((module) => ({ default: module.CitizenIssueDetailsPage })));
const CitizenIssuesPage = lazy(() => import("@/routes/citizen/issues").then((module) => ({ default: module.CitizenIssuesPage })));
const CitizenNotificationsPage = lazy(() => import("@/routes/citizen/notifications").then((module) => ({ default: module.CitizenNotificationsPage })));
const CitizenReportPage = lazy(() => import("@/routes/citizen/report").then((module) => ({ default: module.CitizenReportPage })));
const OfficerDashboardPage = lazy(() => import("@/routes/officer/dashboard").then((module) => ({ default: module.OfficerDashboardPage })));
const OfficerIssueDetailsPage = lazy(() => import("@/routes/officer/issue-details").then((module) => ({ default: module.OfficerIssueDetailsPage })));
const OfficerIssuesPage = lazy(() => import("@/routes/officer/issues").then((module) => ({ default: module.OfficerIssuesPage })));
const DepartmentDashboardPage = lazy(() => import("@/routes/department/dashboard").then((module) => ({ default: module.DepartmentDashboardPage })));
const DepartmentIssuesPage = lazy(() => import("@/routes/department/issues").then((module) => ({ default: module.DepartmentIssuesPage })));
const DepartmentIssueDetailsPage = lazy(() => import("@/routes/department/issue-details").then((module) => ({ default: module.DepartmentIssueDetailsPage })));
const DepartmentWorkersPage = lazy(() => import("@/routes/department/workers").then((module) => ({ default: module.DepartmentWorkersPage })));
const DepartmentNotificationsPage = lazy(() => import("@/routes/department/notifications").then((module) => ({ default: module.DepartmentNotificationsPage })));
const PlaceholderPage = lazy(() => import("@/routes/app-pages").then((module) => ({ default: module.PlaceholderPage })));
const WorkerAssignedIssueDetailsPage = lazy(() =>
  import("@/routes/worker/issue-details").then((module) => ({ default: module.WorkerAssignedIssueDetailsPage })),
);
const WorkerAssignedIssuesPage = lazy(() =>
  import("@/routes/worker/assigned-issues").then((module) => ({ default: module.WorkerAssignedIssuesPage })),
);
const WorkerDashboardPage = lazy(() => import("@/routes/worker/dashboard").then((module) => ({ default: module.WorkerDashboardPage })));
const WorkerNotificationsPage = lazy(() =>
  import("@/routes/worker/notifications").then((module) => ({ default: module.WorkerNotificationsPage })),
);
const AdminDashboardPage = lazy(() => import("@/routes/admin/dashboard").then((module) => ({ default: module.AdminDashboardPage })));
const AdminClassificationPage = lazy(() => import("@/routes/admin/classification").then((module) => ({ default: module.AdminClassificationPage })));
const AdminInstitutionsPage = lazy(() => import("@/routes/admin/institutions/index").then((module) => ({ default: module.AdminInstitutionsPage })));
const AdminNewInstitutionPage = lazy(() => import("@/routes/admin/institutions/new").then((module) => ({ default: module.AdminNewInstitutionPage })));
const AdminInstitutionDetailPage = lazy(() => import("@/routes/admin/institutions/detail").then((module) => ({ default: module.AdminInstitutionDetailPage })));
const AdminIssueDetailPage = lazy(() => import("@/routes/admin/issue-details").then((module) => ({ default: module.AdminIssueDetailPage })));
const AdminUsersPage = lazy(() => import("@/routes/admin/users").then((module) => ({ default: module.AdminUsersPage })));
const AdminIssuesPage = lazy(() => import("@/routes/admin/issues").then((module) => ({ default: module.AdminIssuesPage })));
const AdminAnalyticsPage = lazy(() => import("@/routes/admin/analytics").then((module) => ({ default: module.AdminAnalyticsPage })));
const AdminDepartmentsPage = lazy(() => import("@/routes/admin/departments").then((module) => ({ default: module.AdminDepartmentsPage })));
const AdminActivityPage = lazy(() => import("@/routes/admin/activity").then((module) => ({ default: module.AdminActivityPage })));
const AdminNotificationsPage = lazy(() => import("@/routes/admin/notifications").then((module) => ({ default: module.AdminNotificationsPage })));

const InnovationDashboardPage = lazy(() => import("@/routes/innovation/dashboard").then((module) => ({ default: module.InnovationDashboardPage })));
const InnovationProblemsPage = lazy(() => import("@/routes/innovation/problems").then((module) => ({ default: module.InnovationProblemsPage })));
const InnovationProblemControlCenterPage = lazy(() => import("@/routes/innovation/problem-control-center").then((module) => ({ default: module.InnovationProblemControlCenterPage })));
const InnovationIssueDetailsPage = lazy(() => import("@/routes/innovation/issue-details").then((module) => ({ default: module.InnovationIssueDetailsPage })));
const InnovationChallengesPage = lazy(() => import("@/routes/innovation/challenges").then((module) => ({ default: module.InnovationChallengesPage })));
const InnovationChallengeDetailsPage = lazy(() => import("@/routes/innovation/challenge-details").then((module) => ({ default: module.InnovationChallengeDetailsPage })));
const ChallengeMatchingPage = lazy(() => import("@/routes/innovation/challenge-matching").then((module) => ({ default: module.ChallengeMatchingPage })));
const InnovationNotificationsPage = lazy(() => import("@/routes/innovation/notifications").then((module) => ({ default: module.InnovationNotificationsPage })));
const InnovationInstitutionsPage = lazy(() => import("@/routes/innovation/institutions").then((module) => ({ default: module.InnovationInstitutionsPage })));
const InnovationUniversityWorkspacePage = lazy(() => import("@/routes/innovation/university-workspace").then((module) => ({ default: module.InnovationUniversityWorkspacePage })));
const InnovationCollaborationsPage = lazy(() => import("@/routes/innovation/collaborations").then((module) => ({ default: module.InnovationCollaborationsPage })));
const InnovationMarketplacePage = lazy(() => import("@/routes/innovation/marketplace").then((module) => ({ default: module.InnovationMarketplacePage })));
const InnovationPilotsPage = lazy(() => import("@/routes/innovation/pilots").then((module) => ({ default: module.InnovationPilotsPage })));
const InnovationKnowledgePage = lazy(() => import("@/routes/innovation/knowledge").then((module) => ({ default: module.InnovationKnowledgePage })));
const IndustryMarketplacePage = lazy(() => import("@/routes/industry/marketplace").then((module) => ({ default: module.IndustryMarketplacePage })));
const IndustryListingDetailPage = lazy(() => import("@/routes/industry/listing-detail").then((module) => ({ default: module.IndustryListingDetailPage })));
const IndustryApplicationsPage = lazy(() => import("@/routes/industry/applications").then((module) => ({ default: module.IndustryApplicationsPage })));

const UniversityDashboardPage = lazy(() => import("@/routes/university/index").then((module) => ({ default: module.UniversityDashboardPage })));
const UniversityProfilePage = lazy(() => import("@/routes/university/profile").then((module) => ({ default: module.UniversityProfilePage })));
const UniversityChallengesPage = lazy(() => import("@/routes/university/challenges").then((module) => ({ default: module.UniversityChallengesPage })));
const UniversityMarketplacePage = lazy(() => import("@/routes/university/marketplace"));
const UniversityProjectDetailPage = lazy(() => import("@/routes/university/projects/detail").then((module) => ({ default: module.UniversityProjectDetailPage })));
const UniversityProposalWorkspacePage = lazy(() => import("@/routes/university/projects/proposal").then((module) => ({ default: module.UniversityProposalWorkspacePage })));
const UniversityNotificationsPage = lazy(() => import("@/routes/university/notifications").then((module) => ({ default: module.UniversityNotificationsPage })));

const InnovationProposalsPage = lazy(() => import("@/routes/innovation/proposals").then((module) => ({ default: module.InnovationProposalsPage })));
const InnovationProposalReviewPage = lazy(() => import("@/routes/innovation/proposal-review").then((module) => ({ default: module.InnovationProposalReviewPage })));

const SignupPage = lazy(() => import("@/routes/signup").then((module) => ({ default: module.SignupPage })));
const UnauthorizedPage = lazy(() => import("@/routes/unauthorized").then((module) => ({ default: module.UnauthorizedPage })));

// Demo Sandbox Components
const DemoHubPage = lazy(() => import("@/demo/demo-hub").then((m) => ({ default: m.DemoHubPage })));
const DemoOfficerDashboardPage = lazy(() =>
  import("@/demo/officer/demo-officer-dashboard").then((m) => ({ default: m.DemoOfficerDashboardPage })),
);
const DemoOfficerIssuesPage = lazy(() =>
  import("@/demo/officer/demo-officer-issues").then((m) => ({ default: m.DemoOfficerIssuesPage })),
);
const DemoOfficerIssueDetailPage = lazy(() =>
  import("@/demo/officer/demo-officer-issue-details").then((m) => ({ default: m.DemoOfficerIssueDetailPage })),
);
const DemoWorkerDashboardPage = lazy(() =>
  import("@/demo/worker/demo-worker-dashboard").then((m) => ({ default: m.DemoWorkerDashboardPage })),
);
const DemoWorkerAssignedIssuesPage = lazy(() =>
  import("@/demo/worker/demo-worker-assigned-issues").then((m) => ({ default: m.DemoWorkerAssignedIssuesPage })),
);
const DemoWorkerIssueDetailPage = lazy(() =>
  import("@/demo/worker/demo-worker-issue-details").then((m) => ({ default: m.DemoWorkerIssueDetailPage })),
);

function RouteLoadingFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center px-4 text-sm text-muted-foreground">
      <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
        Loading CivicFix route...
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<Navigate replace to="/" />} />
        </Route>

        <Route
          path="login/*"
          element={
            <PublicOnly redirectTo="/app/role-selection">
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="signup/*"
          element={
            <PublicOnly redirectTo="/app/role-selection">
              <SignupPage />
            </PublicOnly>
          }
        />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route
          path="role-selection"
          element={<Navigate replace to="/app/role-selection" />}
        />

        {/* Safe Public Demo Sandbox Routes */}
        <Route
          path="demo"
          element={
            <DemoProvider>
              <Outlet />
            </DemoProvider>
          }
        >
          <Route index element={<DemoHubPage />} />
          <Route path="officer" element={<DemoLayout />}>
            <Route index element={<DemoOfficerDashboardPage />} />
            <Route path="issues" element={<DemoOfficerIssuesPage />} />
            <Route path="issues/:issueId" element={<DemoOfficerIssueDetailPage />} />
          </Route>
          <Route path="worker" element={<DemoLayout />}>
            <Route index element={<DemoWorkerDashboardPage />} />
            <Route path="assigned-issues" element={<DemoWorkerAssignedIssuesPage />} />
            <Route path="issues/:issueId" element={<DemoWorkerIssueDetailPage />} />
          </Route>
        </Route>

        <Route
          path="app"
          element={
            <RequireAuth redirectTo="/login">
              <AppSessionProvider />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate replace to="/app/role-selection" />} />
          <Route path="role-selection" element={<RoleSelectionPage />} />
          <Route path="onboarding" element={<RoleOnboardingPage />} />

          <Route
            path="citizen"
            element={
              <RequireRole allowedRoles={["CITIZEN"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<CitizenDashboardPage />} />
            <Route path="report" element={<CitizenReportPage />} />
            <Route path="report-issue" element={<Navigate replace to="/app/citizen/report" />} />
            <Route path="issues" element={<CitizenIssuesPage />} />
            <Route path="issues/:issueId" element={<CitizenIssueDetailsPage />} />
            <Route path="notifications" element={<CitizenNotificationsPage />} />
            <Route path="my-issues" element={<Navigate replace to="/app/citizen/issues" />} />
          </Route>

          <Route
            path="officer"
            element={
              <RequireRole allowedRoles={["MUNICIPAL_OFFICER"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<OfficerDashboardPage />} />
            <Route path="issues" element={<OfficerIssuesPage />} />
            <Route path="issues/:issueId" element={<OfficerIssueDetailsPage />} />
            <Route
              path="map"
              element={
                <PlaceholderPage
                  description="A geospatial layer for analyzing citywide issue concentration and response patterns."
                  title="Map"
                />
              }
            />
            <Route
              path="analytics"
              element={
                <PlaceholderPage
                  description="Analytics will summarize throughput, responsiveness, and service bottlenecks."
                  title="Analytics"
                />
              }
            />
            <Route
              path="notifications"
              element={
                <PlaceholderPage
                  description="Officer alerts, assignments, and verification notices will appear here."
                  title="Notifications"
                />
              }
            />
          </Route>

          {/* Department Manager Portal */}
          <Route
            path="manager"
            element={
              <RequireRole allowedRoles={["DEPARTMENT_MANAGER"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<DepartmentDashboardPage />} />
            <Route path="tasks" element={<DepartmentIssuesPage />} />
            <Route path="tasks/:taskId" element={<DepartmentIssueDetailsPage />} />
            <Route path="tasks/:issueId" element={<DepartmentIssueDetailsPage />} />
            <Route path="issues" element={<Navigate replace to="/app/manager/tasks" />} />
            <Route path="issues/:taskId" element={<DepartmentIssueDetailsPage />} />
            <Route path="workers" element={<DepartmentWorkersPage />} />
            <Route path="notifications" element={<DepartmentNotificationsPage />} />
          </Route>

          {/* Backwards-compatible /app/department alias */}
          <Route
            path="department"
            element={
              <RequireRole allowedRoles={["DEPARTMENT_MANAGER"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate replace to="/app/manager" />} />
            <Route path="tasks" element={<Navigate replace to="/app/manager/tasks" />} />
            <Route path="tasks/:taskId" element={<DepartmentIssueDetailsPage />} />
            <Route path="issues" element={<Navigate replace to="/app/manager/tasks" />} />
            <Route path="issues/:taskId" element={<DepartmentIssueDetailsPage />} />
            <Route path="workers" element={<DepartmentWorkersPage />} />
            <Route path="notifications" element={<DepartmentNotificationsPage />} />
          </Route>

          <Route
            path="worker"
            element={
              <RequireRole allowedRoles={["FIELD_WORKER"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<WorkerDashboardPage />} />
            <Route path="assigned-issues" element={<WorkerAssignedIssuesPage />} />
            <Route path="assigned-issues/:issueId" element={<WorkerAssignedIssueDetailsPage />} />
            <Route path="issues" element={<Navigate replace to="/app/worker/assigned-issues" />} />
            <Route path="issues/:issueId" element={<WorkerAssignedIssueDetailsPage />} />
            <Route path="notifications" element={<WorkerNotificationsPage />} />
          </Route>

          <Route
            path="admin"
            element={
              <RequireRole allowedRoles={["ADMIN"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="classification" element={<AdminClassificationPage />} />
            <Route path="institutions" element={<AdminInstitutionsPage />} />
            <Route path="institutions/new" element={<AdminNewInstitutionPage />} />
            <Route path="institutions/:institutionId" element={<AdminInstitutionDetailPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="departments" element={<AdminDepartmentsPage />} />
            <Route path="issues" element={<AdminIssuesPage />} />
            <Route path="issues/:issueId" element={<AdminIssueDetailPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="activity" element={<AdminActivityPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
          </Route>

          {/* Innovation Manager Portal */}
          <Route
            path="innovation"
            element={
              <RequireRole allowedRoles={["INNOVATION_MANAGER", "ADMIN"]}>
                <AppLayout roleCode="INNOVATION_MANAGER" />
              </RequireRole>
            }
          >
            <Route index element={<InnovationDashboardPage />} />
            <Route path="problems" element={<InnovationProblemsPage />} />
            <Route path="problems/:problemId" element={<InnovationProblemControlCenterPage />} />
            <Route path="problems/:problemId/universities/:institutionId" element={<InnovationUniversityWorkspacePage />} />
            <Route path="knowledge" element={<InnovationKnowledgePage />} />
            <Route path="collaborations" element={<InnovationCollaborationsPage />} />
            <Route path="pilots" element={<InnovationPilotsPage />} />
            <Route path="pilots/:pilotId" element={<InnovationPilotsPage />} />
            <Route path="marketplace" element={<InnovationMarketplacePage />} />
            <Route path="issues" element={<InnovationProblemsPage />} />
            <Route path="issues/:issueId" element={<InnovationIssueDetailsPage />} />
            <Route path="challenges" element={<InnovationChallengesPage />} />
            <Route path="challenges/:challengeId" element={<InnovationChallengeDetailsPage />} />
            <Route path="challenges/:challengeId/matching" element={<ChallengeMatchingPage />} />
            <Route path="institutions" element={<InnovationInstitutionsPage />} />
            <Route path="institutions/:institutionId" element={<InnovationInstitutionsPage />} />
            <Route path="proposals" element={<InnovationProposalsPage />} />
            <Route path="proposals/:proposalId" element={<InnovationProposalReviewPage />} />
            <Route path="projects/:projectId" element={<UniversityProjectDetailPage />} />
            <Route path="projects/:projectId/proposal" element={<UniversityProposalWorkspacePage />} />
            <Route path="notifications" element={<InnovationNotificationsPage />} />
          </Route>

          {/* University / Institution Portal */}
          <Route
            path="university"
            element={
              <RequireRole allowedRoles={["INSTITUTION", "INNOVATION_MANAGER", "ADMIN"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<UniversityDashboardPage />} />
            <Route path="profile" element={<UniversityProfilePage />} />
            <Route path="challenges" element={<UniversityChallengesPage />} />
            <Route path="marketplace" element={<UniversityMarketplacePage />} />
            <Route path="projects/:projectId" element={<UniversityProjectDetailPage />} />
            <Route path="projects/:projectId/proposal" element={<UniversityProposalWorkspacePage />} />
            <Route path="notifications" element={<UniversityNotificationsPage />} />
          </Route>

          {/* Industry / Organization Partner Portal */}
          <Route
            path="industry"
            element={
              <RequireRole allowedRoles={["INDUSTRY_PARTNER", "INNOVATION_MANAGER", "ADMIN"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate replace to="/app/industry/marketplace" />} />
            <Route path="marketplace" element={<IndustryMarketplacePage />} />
            <Route path="marketplace/:listingId" element={<IndustryListingDetailPage />} />
            <Route path="applications" element={<IndustryApplicationsPage />} />
          </Route>

          {/* Backwards-compatible /app/institution alias */}
          <Route
            path="institution"
            element={
              <RequireRole allowedRoles={["INSTITUTION"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate replace to="/app/university" />} />
            <Route path="*" element={<Navigate replace to="/app/university" />} />
          </Route>

          {/* Backwards-compatible /app/innovation-manager alias */}
          <Route
            path="innovation-manager"
            element={
              <RequireRole allowedRoles={["INNOVATION_MANAGER"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate replace to="/app/innovation" />} />
            <Route path="*" element={<Navigate replace to="/app/innovation" />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
