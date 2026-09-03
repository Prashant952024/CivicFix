import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Flame,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldCheck,
  UserPlus,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatAdminDateTime,
  getAdminInitials,
  getAdminIssueStatusTone,
  getAdminPriorityTone,
  getAdminRoleTone,
} from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "code" | "name"> | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
};

type IssueRow = Database["public"]["Tables"]["issues"]["Row"] & {
  department_assignments?: Array<{
    id: string;
    department_id: string;
    status: string;
    department?: { id: string; name: string } | null;
  }> | null;
  issue_images?: Array<{
    id: string;
    storage_bucket: string;
    storage_path: string;
    image_type: string;
  }> | null;
};

type HistoryRow = Database["public"]["Tables"]["issue_status_history"]["Row"] & {
  issue?: Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "title" | "category"> | null;
  changed_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];

type AdminDashboardState = {
  profiles: ProfileRow[];
  issues: IssueRow[];
  activities: HistoryRow[];
  departments: DepartmentRow[];
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AdminDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [state, setState] = useState<AdminDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const [profilesResult, issuesResult, activitiesResult, departmentsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, clerk_user_id, full_name, email, phone, role_id, department_id, employee_id, designation, is_active, avatar_url, joined_at, created_at, updated_at, role:roles!profiles_role_id_fkey(code, name), department:departments!profiles_department_id_fkey(id, name, is_active)")
          .order("created_at", { ascending: false }),
        supabase
          .from("issues")
          .select(
            `
            id,
            status,
            priority,
            severity,
            category,
            title,
            description,
            location_text,
            address_text,
            created_at,
            updated_at,
            reporter_profile_id,
            latitude,
            longitude,
            department_assignments:issue_department_assignments!issue_department_assignments_issue_id_fkey(
              id,
              department_id,
              status,
              department:departments!issue_department_assignments_department_id_fkey(id, name, is_active)
            ),
            issue_images(id, storage_bucket, storage_path, image_type)
          `,
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("issue_status_history")
          .select(
            `
            id,
            issue_id,
            old_status,
            new_status,
            changed_by_profile_id,
            notes,
            created_at,
            issue:issues!issue_status_history_issue_id_fkey(id, title, category),
            changed_by_profile:profiles!issue_status_history_changed_by_profile_id_fkey(id, full_name, email)
          `,
          )
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("departments")
          .select("*")
          .order("name", { ascending: true }),
      ]);

      if (cancelled) return;

      if (profilesResult.error || issuesResult.error || activitiesResult.error || departmentsResult.error) {
        if (import.meta.env.DEV) {
          console.error("Admin dashboard load error", {
            profiles: profilesResult.error,
            issues: issuesResult.error,
            activities: activitiesResult.error,
            departments: departmentsResult.error,
          });
        }
        setError("Unable to load municipal operations data.");
        setLoading(false);
        return;
      }

      setState({
        profiles: profilesResult.data ?? [],
        issues: (issuesResult.data ?? []) as unknown as IssueRow[],
        activities: (activitiesResult.data ?? []) as unknown as HistoryRow[],
        departments: departmentsResult.data ?? [],
      });
      setLastRefreshedAt(new Date().toISOString());
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const kpis = useMemo(() => {
    if (!state) return null;
    const { issues, profiles, departments } = state;

    const totalIssues = issues.length;
    const pendingIssues = issues.filter((i) => ["SUBMITTED", "AI_ANALYZED", "UNDER_REVIEW"].includes(i.status)).length;
    const inProgressIssues = issues.filter((i) => ["ASSIGNED", "IN_PROGRESS"].includes(i.status)).length;
    const resolvedIssues = issues.filter((i) => ["RESOLVED", "CITIZEN_VERIFIED"].includes(i.status)).length;
    const activeStaff = profiles.filter((p) => p.is_active && p.role?.code !== "CITIZEN").length;
    const activeDepartments = departments.filter((d) => d.is_active).length;

    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    // Status Pipeline counts
    const today = new Date().toISOString().split("T")[0];
    const issuesToday = issues.filter((i) => i.created_at.startsWith(today)).length;
    const aiAnalyzed = issues.filter((i) => i.status === "AI_ANALYZED").length;
    const awaitingAssignment = issues.filter((i) => i.status === "SUBMITTED" || i.status === "AI_ANALYZED").length;
    const assigned = issues.filter((i) => i.status === "ASSIGNED").length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;
    const awaitingReview = issues.filter((i) => i.status === "UNDER_REVIEW").length;
    const reopened = issues.filter((i) => i.status === "REOPENED" || i.status === "REJECTED").length;

    // Breakdown
    const statusCounts: Record<string, number> = {
      SUBMITTED: issues.filter((i) => i.status === "SUBMITTED").length,
      AI_ANALYZED: aiAnalyzed,
      ASSIGNED: assigned,
      IN_PROGRESS: inProgress,
      UNDER_REVIEW: awaitingReview,
      RESOLVED: issues.filter((i) => i.status === "RESOLVED").length,
      CITIZEN_VERIFIED: issues.filter((i) => i.status === "CITIZEN_VERIFIED").length,
      REOPENED: issues.filter((i) => i.status === "REOPENED").length,
    };

    return {
      totalIssues,
      pendingIssues,
      inProgressIssues,
      resolvedIssues,
      activeStaff,
      activeDepartments,
      resolutionRate,
      statusCounts,
      pipeline: {
        issuesToday,
        aiAnalyzed,
        awaitingAssignment,
        assigned,
        inProgress,
        awaitingReview,
        resolved: resolvedIssues,
        reopened,
      },
    };
  }, [state]);

  const priorityIssues = useMemo(() => {
    if (!state) return [];
    return state.issues
      .filter((i) => !["RESOLVED", "CITIZEN_VERIFIED"].includes(i.status))
      .sort((a, b) => {
        const rank = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (rank[b.priority] || 0) - (rank[a.priority] || 0);
      })
      .slice(0, 5);
  }, [state]);

  const departmentPerformance = useMemo(() => {
    if (!state) return [];
    const { departments, issues } = state;
    return departments.map((dept) => {
      const deptIssues = issues.filter(
        (issue) => issue.department_assignments?.some((da) => da.department_id === dept.id) || issue.department_id === dept.id,
      );
      const total = deptIssues.length;
      const inProgress = deptIssues.filter((i) => ["ASSIGNED", "IN_PROGRESS"].includes(i.status)).length;
      const completed = deptIssues.filter((i) => ["RESOLVED", "CITIZEN_VERIFIED"].includes(i.status)).length;
      const pending = total - completed;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: dept.id,
        name: dept.name,
        isActive: dept.is_active,
        total,
        inProgress,
        completed,
        pending,
        rate,
      };
    }).sort((a, b) => b.total - a.total);
  }, [state]);

  const recentStaff = useMemo(() => {
    if (!state) return [];
    return state.profiles.filter((p) => p.role?.code !== "CITIZEN").slice(0, 4);
  }, [state]);

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Command Center Unavailable"
        description={sessionProblem ?? error ?? "We could not load municipal command metrics."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry Command Center
          </Button>
        }
      />
    );
  }

  if (loading || !kpis || !state) {
    return (
      <div className="space-y-6">
        <div className="h-28 w-full animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-64 animate-pulse rounded-3xl border border-border/70 bg-muted/20" />
          <div className="h-64 animate-pulse rounded-3xl border border-border/70 bg-muted/20" />
        </div>
      </div>
    );
  }

  const greeting = getGreeting();
  const adminName = profile?.full_name?.split(" ")[0] || "Admin";

  return (
    <div className="space-y-6">
      {/* 1. Command Center Hero Header */}
      <PageHeader
        tag="Municipal Civic Operations Command Center"
        title={`${greeting}, ${adminName}`}
        description="Live city-wide governance dashboard. Track incident lifecycle, dispatch throughput, workforce capacity, and system integrity."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-xs shadow-md">
              <Link to="/app/admin/users">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add a User
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/app/admin/issues">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                All Issues
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          {/* Live System Indicator */}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-1.5 font-bold text-emerald-900 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>All Municipal Systems Operational</span>
          </div>

          {lastRefreshedAt && (
            <div className="rounded-2xl border border-border/80 bg-surface/80 px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm">
              Updated: <span className="font-semibold text-foreground">{formatAdminDateTime(lastRefreshedAt)}</span>
            </div>
          )}
        </div>
      </PageHeader>

      {/* 2. Row 1 — 6 Uniform Compact KPI Cards */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {/* Card 1: Total Issues */}
        <Link to="/app/admin/issues" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-surface to-teal-50/40 p-4 shadow-sm group-hover:shadow-md group-hover:border-sky-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Total Issues</span>
              <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-bold tracking-tight text-sky-950">{kpis.totalIssues}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>All recorded</span>
              <span className="font-semibold text-sky-700">100%</span>
            </div>
          </div>
        </Link>

        {/* Card 2: Pending Issues */}
        <Link to="/app/admin/issues?status=SUBMITTED" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-surface to-orange-50/40 p-4 shadow-sm group-hover:shadow-md group-hover:border-amber-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Clock3 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-bold tracking-tight text-amber-950">{kpis.pendingIssues}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Awaiting review</span>
              <span className="font-semibold text-amber-700">{kpis.totalIssues > 0 ? Math.round((kpis.pendingIssues / kpis.totalIssues) * 100) : 0}%</span>
            </div>
          </div>
        </Link>

        {/* Card 3: In Progress */}
        <Link to="/app/admin/issues?status=IN_PROGRESS" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-surface to-indigo-50/40 p-4 shadow-sm group-hover:shadow-md group-hover:border-blue-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">In Progress</span>
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Wrench className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-bold tracking-tight text-blue-950">{kpis.inProgressIssues}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Active repair</span>
              <span className="font-semibold text-blue-700">{kpis.totalIssues > 0 ? Math.round((kpis.inProgressIssues / kpis.totalIssues) * 100) : 0}%</span>
            </div>
          </div>
        </Link>

        {/* Card 4: Resolved */}
        <Link to="/app/admin/issues?status=RESOLVED" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-surface to-teal-50/40 p-4 shadow-sm group-hover:shadow-md group-hover:border-emerald-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Resolved</span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-bold tracking-tight text-emerald-950">{kpis.resolvedIssues}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Resolution rate</span>
              <span className="font-semibold text-emerald-700">{kpis.resolutionRate}%</span>
            </div>
          </div>
        </Link>

        {/* Card 5: Active Staff */}
        <Link to="/app/admin/users" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/70 via-surface to-cyan-50/40 p-4 shadow-sm group-hover:shadow-md group-hover:border-teal-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Staff Crew</span>
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                <UsersRound className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-bold tracking-tight text-teal-950">{kpis.activeStaff}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Officers & Techs</span>
              <span className="font-semibold text-teal-700">Active</span>
            </div>
          </div>
        </Link>

        {/* Card 6: Departments */}
        <Link to="/app/admin/departments" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-surface to-violet-50/40 p-4 shadow-sm group-hover:shadow-md group-hover:border-indigo-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Departments</span>
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Building2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-bold tracking-tight text-indigo-950">{kpis.activeDepartments}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Civic branches</span>
              <span className="font-semibold text-indigo-700">Online</span>
            </div>
          </div>
        </Link>
      </section>

      {/* 3. Row 2 — Operations Overview Split: Status Pipeline & Status Breakdown */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Left: Live Operations Status Pipeline */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-teal-700 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground">Live Operations Status Pipeline</h3>
            </div>
            <span className="text-xs text-muted-foreground font-medium">End-to-End Incident Flow</span>
          </div>

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-center text-xs">
            <div className="p-3 rounded-2xl border border-border/70 bg-background/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Today's Inflow</span>
              <p className="text-xl font-bold text-foreground">{kpis.pipeline.issuesToday}</p>
              <span className="text-[10px] text-muted-foreground">New intake</span>
            </div>
            <div className="p-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-800 block">AI Analyzed</span>
              <p className="text-xl font-bold text-indigo-950">{kpis.pipeline.aiAnalyzed}</p>
              <span className="text-[10px] text-indigo-700">Triage ready</span>
            </div>
            <div className="p-3 rounded-2xl border border-sky-200/80 bg-sky-50/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-sky-800 block">Awaiting Dispatch</span>
              <p className="text-xl font-bold text-sky-950">{kpis.pipeline.awaitingAssignment}</p>
              <span className="text-[10px] text-sky-700">Officer desk</span>
            </div>
            <div className="p-3 rounded-2xl border border-teal-200/80 bg-teal-50/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-800 block">Assigned</span>
              <p className="text-xl font-bold text-teal-950">{kpis.pipeline.assigned}</p>
              <span className="text-[10px] text-teal-700">Dept queue</span>
            </div>
            <div className="p-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">In Progress</span>
              <p className="text-xl font-bold text-amber-950">{kpis.pipeline.inProgress}</p>
              <span className="text-[10px] text-amber-700">Field work</span>
            </div>
            <div className="p-3 rounded-2xl border border-violet-200/80 bg-violet-50/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-violet-800 block">Under Review</span>
              <p className="text-xl font-bold text-violet-950">{kpis.pipeline.awaitingReview}</p>
              <span className="text-[10px] text-violet-700">Proof check</span>
            </div>
            <div className="p-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Resolved</span>
              <p className="text-xl font-bold text-emerald-950">{kpis.pipeline.resolved}</p>
              <span className="text-[10px] text-emerald-700">Verified</span>
            </div>
            <div className="p-3 rounded-2xl border border-rose-200/80 bg-rose-50/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">Rework / Reopened</span>
              <p className="text-xl font-bold text-rose-950">{kpis.pipeline.reopened}</p>
              <span className="text-[10px] text-rose-700">Follow-up</span>
            </div>
          </div>
        </Card>

        {/* Right: Issue Status Breakdown */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Status Breakdown</h3>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">{kpis.totalIssues} total</span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: "Submitted / Intake", count: kpis.statusCounts.SUBMITTED, color: "bg-sky-500" },
              { label: "AI Analyzed", count: kpis.statusCounts.AI_ANALYZED, color: "bg-indigo-500" },
              { label: "Assigned to Dept", count: kpis.statusCounts.ASSIGNED, color: "bg-teal-500" },
              { label: "In Progress", count: kpis.statusCounts.IN_PROGRESS, color: "bg-amber-500" },
              { label: "Under Review", count: kpis.statusCounts.UNDER_REVIEW, color: "bg-violet-500" },
              { label: "Resolved", count: kpis.statusCounts.RESOLVED + kpis.statusCounts.CITIZEN_VERIFIED, color: "bg-emerald-500" },
              { label: "Reopened / Rework", count: kpis.statusCounts.REOPENED, color: "bg-rose-500" },
            ].map((item) => {
              const pct = kpis.totalIssues > 0 ? Math.round((item.count / kpis.totalIssues) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium truncate">{item.label}</span>
                    <span className="font-bold text-foreground shrink-0">{item.count} <span className="text-[10px] font-normal text-muted-foreground">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* 4. Row 3 — Priority Incidents & Department Performance Matrix */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: Priority Incidents */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-foreground">Priority Incidents Requiring Attention</h3>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 font-semibold">
              <Link to="/app/admin/issues">View All →</Link>
            </Button>
          </div>

          <div className="space-y-2.5">
            {priorityIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No active high-priority issues at this time.</p>
            ) : (
              priorityIssues.map((issue) => {
                const assignedDept = issue.department_assignments?.[0]?.department?.name;

                return (
                  <div
                    key={issue.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border border-border/60 bg-background/60 hover:bg-muted/20 transition gap-2.5 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{issue.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge variant={getAdminPriorityTone(issue.priority)} size="sm">
                          {issue.priority}
                        </Badge>
                        <Badge variant={getAdminIssueStatusTone(issue.status)} size="sm">
                          {issue.status}
                        </Badge>
                      </div>

                      <p className="font-bold text-foreground text-sm truncate">{issue.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{issue.address_text || issue.location_text || "Location recorded"}</span>
                        {assignedDept && (
                          <span className="ml-1 font-semibold text-teal-800 truncate">· {assignedDept}</span>
                        )}
                      </p>
                    </div>

                    <Button asChild size="sm" variant="outline" className="text-xs h-7 self-start sm:self-center shrink-0">
                      <Link to={`/app/admin/issues/${issue.id}`}>
                        Inspect →
                      </Link>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right: Department Performance Table */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Department Performance</h3>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 font-semibold">
              <Link to="/app/admin/departments">Manage Depts →</Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
                  <th className="text-left py-2 px-1">Department</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-right py-2 px-2">Active</th>
                  <th className="text-right py-2 px-2">Done</th>
                  <th className="text-right py-2 px-2">Closure Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {departmentPerformance.slice(0, 5).map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/10 transition">
                    <td className="py-2.5 px-1 font-semibold text-foreground truncate max-w-[140px]">
                      {dept.name}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-foreground">{dept.total}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-amber-700">{dept.inProgress}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-emerald-700">{dept.completed}</td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dept.rate}%` }} />
                        </div>
                        <span className="font-bold text-[11px] text-foreground min-w-[28px]">{dept.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* 5. Row 4 — Workforce Fleet, Infrastructure Health & Activity Feed */}
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left: Workforce Fleet & Services */}
        <div className="space-y-6">
          <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-teal-700" />
                <h3 className="text-sm font-bold text-foreground">Workforce Fleet</h3>
              </div>
              <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 font-semibold">
                <Link to="/app/admin/users">Staff Directory →</Link>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Staff Registrations</p>
              {recentStaff.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between p-2.5 rounded-xl bg-background/50 border border-border/60 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-900 font-bold text-xs">
                      {getAdminInitials(staff.full_name || staff.email || "Staff")}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-foreground truncate">{staff.full_name || staff.email}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{staff.role?.name || "Staff"}</p>
                    </div>
                  </div>
                  <Badge variant={getAdminRoleTone(staff.role?.code ?? "CITIZEN")} size="sm">
                    {staff.role?.name || "Staff"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Infrastructure Health */}
          <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-foreground">Infrastructure Services</h3>
              </div>
              <Badge variant="success" size="sm">100% Operational</Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-background/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-teal-600" />
                  Supabase PostgreSQL Core
                </span>
                <span className="font-semibold text-emerald-700">Healthy</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-background/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-teal-600" />
                  Clerk Identity Provider
                </span>
                <span className="font-semibold text-emerald-700">Connected</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-background/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-teal-600" />
                  Evidence Storage Bucket
                </span>
                <span className="font-semibold text-emerald-700">Active</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Recent System Activity Feed */}
        <Card className="rounded-3xl border border-border/80 bg-surface/95 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold text-foreground">Recent Administrative Activity</h3>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 font-semibold">
              <Link to="/app/admin/activity">View Audit Log →</Link>
            </Button>
          </div>

          <div className="space-y-2.5">
            {state.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No recent activity recorded.</p>
            ) : (
              state.activities.map((act) => (
                <div key={act.id} className="p-3 rounded-2xl border border-border/60 bg-background/50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{act.changed_by_profile?.full_name || "System Actor"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatAdminDateTime(act.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {act.old_status ? (
                      <>
                        <Badge variant="outline" size="sm">{act.old_status}</Badge>
                        <span>→</span>
                      </>
                    ) : null}
                    <Badge variant={getAdminIssueStatusTone(act.new_status)} size="sm">{act.new_status}</Badge>
                    <span className="truncate">for <span className="font-semibold text-foreground">"{act.issue?.title || `Issue #${act.issue_id.slice(0, 8)}`}"</span></span>
                  </div>
                  {act.notes && (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/20 px-2 py-1 rounded-lg">
                      "{act.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
