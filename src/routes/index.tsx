import { Navigate, Route, Routes } from "react-router-dom";
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
import { CitizenDashboardPage } from "@/routes/citizen/dashboard";
import { CitizenIssueDetailsPage } from "@/routes/citizen/issue-details";
import { CitizenIssuesPage } from "@/routes/citizen/issues";
import { CitizenNotificationsPage } from "@/routes/citizen/notifications";
import { CitizenReportPage } from "@/routes/citizen/report";
import { OfficerDashboardPage } from "@/routes/officer/dashboard";
import { OfficerIssueDetailsPage } from "@/routes/officer/issue-details";
import { OfficerIssuesPage } from "@/routes/officer/issues";
import { HomePage } from "@/routes/home";
import { LoginPage } from "@/routes/login";
import { NotFoundPage } from "@/routes/not-found";
import { RoleOnboardingPage } from "@/routes/onboarding";
import { RoleSelectionPage } from "@/routes/role-selection";
import { PlaceholderPage, DashboardPage } from "@/routes/app-pages";
import { WorkerAssignedIssueDetailsPage } from "@/routes/worker/issue-details";
import { WorkerAssignedIssuesPage } from "@/routes/worker/assigned-issues";
import { WorkerDashboardPage } from "@/routes/worker/dashboard";
import { SignupPage } from "@/routes/signup";
import { UnauthorizedPage } from "@/routes/unauthorized";

export function AppRoutes() {
  return (
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
        path="app/role-selection"
        element={
          <RequireAuth redirectTo="/login">
            <AppSessionProvider>
              <RoleSelectionPage />
            </AppSessionProvider>
          </RequireAuth>
        }
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
        <Route path="onboarding" element={<RoleOnboardingPage />} />

        <Route
          path="citizen"
          element={
            <RequireRole allowedRoles={["CITIZEN"]}>
              <AppLayout />
            </RequireRole>
          }
        >
          <Route
            index
            element={<CitizenDashboardPage />}
          />
          <Route
            path="report"
            element={<CitizenReportPage />}
          />
          <Route
            path="report-issue"
            element={<Navigate replace to="/app/citizen/report" />}
          />
          <Route
            path="issues"
            element={<CitizenIssuesPage />}
          />
          <Route path="issues/:issueId" element={<CitizenIssueDetailsPage />} />
          <Route
            path="notifications"
            element={<CitizenNotificationsPage />}
          />
          <Route
            path="my-issues"
            element={<Navigate replace to="/app/citizen/issues" />}
          />
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
  );
}
