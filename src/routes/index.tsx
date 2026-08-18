import { Navigate, Route, Routes } from "react-router-dom";
import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  UsersRound,
} from "lucide-react";

import { AppSessionProvider } from "@/auth/app-session";
import { PublicOnly, RedirectToRoleDashboard, RequireAuth, RequireRole } from "@/auth/route-guards";
import { AppLayout } from "@/components/layout/app-layout";
import { RootLayout } from "@/components/layout/root-layout";
import { CitizenDashboardPage } from "@/routes/citizen/dashboard";
import { CitizenIssueDetailsPage } from "@/routes/citizen/issue-details";
import { CitizenIssuesPage } from "@/routes/citizen/issues";
import { CitizenReportPage } from "@/routes/citizen/report";
import { HomePage } from "@/routes/home";
import { LoginPage } from "@/routes/login";
import { NotFoundPage } from "@/routes/not-found";
import { PlaceholderPage, DashboardPage } from "@/routes/app-pages";
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
        path="login"
        element={
          <PublicOnly redirectTo="/app">
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="signup"
        element={
          <PublicOnly redirectTo="/app">
            <SignupPage />
          </PublicOnly>
        }
      />
      <Route path="unauthorized" element={<UnauthorizedPage />} />
      <Route path="404" element={<NotFoundPage />} />

      <Route
        path="app"
        element={
          <RequireAuth redirectTo="/login">
            <AppSessionProvider />
          </RequireAuth>
        }
      >
        <Route index element={<RedirectToRoleDashboard />} />

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
            path="my-issues"
            element={<Navigate replace to="/app/citizen/issues" />}
          />
          <Route
            path="notifications"
            element={
              <PlaceholderPage
                description="Notification history will surface civic updates, verification prompts, and workflow changes."
                title="Notifications"
              />
            }
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
          <Route
            index
            element={
              <DashboardPage
                accentNote="Officers get a triage-first workspace for verification, routing, and progress oversight."
                description="Operational visibility for municipal officers managing civic issue flow."
                roleCode="MUNICIPAL_OFFICER"
                stats={[
                  { icon: ClipboardList, label: "Total Issues", value: "124" },
                  { icon: Bell, label: "Pending Verification", tone: "warning", value: "21" },
                  { icon: Gauge, label: "In Progress", tone: "info", value: "18" },
                  { icon: CheckCircle2, label: "Resolved", tone: "success", value: "85" },
                ]}
                title="Municipal Officer Dashboard"
              />
            }
          />
          <Route
            path="issues"
            element={
              <PlaceholderPage
                description="Queue, verify, and route civic issues with a clear operational view."
                title="Issues"
              />
            }
          />
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
          <Route
            index
            element={
              <DashboardPage
                accentNote="Workers see the assignments that matter now, with a clean path from queue to completion."
                description="A compact workspace for field execution and progress tracking."
                roleCode="FIELD_WORKER"
                stats={[
                  { icon: ClipboardCheck, label: "Assigned Issues", value: "14" },
                  { icon: Gauge, label: "In Progress", tone: "info", value: "9" },
                  { icon: CheckCircle2, label: "Completed", tone: "success", value: "27" },
                ]}
                title="Field Worker Dashboard"
              />
            }
          />
          <Route
            path="assigned-issues"
            element={
              <PlaceholderPage
                description="Your assigned work queue will live here, ready for progress updates and evidence capture."
                title="Assigned Issues"
              />
            }
          />
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
