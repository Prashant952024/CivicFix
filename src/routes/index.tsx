import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  UsersRound,
} from "lucide-react";

import { AppSessionProvider } from "@/auth/app-session";
import { PublicOnly, RequireAuth, RequireRole } from "@/auth/route-guards";
import { AppLayout } from "@/components/layout/app-layout";
import { RootLayout } from "@/components/layout/root-layout";

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
const PlaceholderPage = lazy(() => import("@/routes/app-pages").then((module) => ({ default: module.PlaceholderPage })));
const DashboardPage = lazy(() => import("@/routes/app-pages").then((module) => ({ default: module.DashboardPage })));
const WorkerAssignedIssueDetailsPage = lazy(() =>
  import("@/routes/worker/issue-details").then((module) => ({ default: module.WorkerAssignedIssueDetailsPage })),
);
const WorkerAssignedIssuesPage = lazy(() =>
  import("@/routes/worker/assigned-issues").then((module) => ({ default: module.WorkerAssignedIssuesPage })),
);
const WorkerDashboardPage = lazy(() => import("@/routes/worker/dashboard").then((module) => ({ default: module.WorkerDashboardPage })));
const SignupPage = lazy(() => import("@/routes/signup").then((module) => ({ default: module.SignupPage })));
const UnauthorizedPage = lazy(() => import("@/routes/unauthorized").then((module) => ({ default: module.UnauthorizedPage })));

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
            <Route
              path="notifications"
              element={
                <PlaceholderPage
                  description="Assignment changes, reminders, and status updates will surface here."
                  title="Notifications"
                />
              }
            />
          </Route>

          <Route
            path="admin"
            element={
              <RequireRole allowedRoles={["ADMIN"]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route
              index
              element={
                <DashboardPage
                  accentNote="Administrators oversee the platform, the people on it, and the systems behind it."
                  description="A high-level administrative workspace for CivicFix platform operations."
                  roleCode="ADMIN"
                  stats={[
                    { icon: UsersRound, label: "Total Users", value: "248" },
                    { icon: ClipboardList, label: "Total Issues", value: "1,024" },
                    { icon: Building2, label: "Departments", tone: "info", value: "9" },
                    { icon: CheckCircle2, label: "Resolved Issues", tone: "success", value: "742" },
                  ]}
                  title="Admin Dashboard"
                />
              }
            />
            <Route
              path="users"
              element={
                <PlaceholderPage
                  description="User administration, role oversight, and profile management will live here."
                  title="Users"
                />
              }
            />
            <Route
              path="departments"
              element={
                <PlaceholderPage
                  description="Manage municipal departments and their civic routing responsibilities."
                  title="Departments"
                />
              }
            />
            <Route
              path="issues"
              element={
                <PlaceholderPage
                  description="Administrative issue controls, escalations, and system-wide oversight will appear here."
                  title="Issues"
                />
              }
            />
            <Route
              path="analytics"
              element={
                <PlaceholderPage
                  description="Platform metrics and operational performance dashboards will live here."
                  title="Analytics"
                />
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
