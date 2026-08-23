import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Layers,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDateTime } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
type IssueRow = Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "department_id" | "status" | "created_at" | "updated_at">;
type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "department_id" | "role_id"> & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "code" | "name"> | null;
};

type DepartmentDraft = {
  name: string;
  description: string;
  is_active: boolean;
};

function isResolvedLikeStatus(status: IssueRow["status"]) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

function getDepartmentWorkloadTone(openCount: number, totalCount: number): "success" | "warning" | "danger" | "info" {
  const ratio = totalCount > 0 ? openCount / totalCount : 0;
  if (ratio >= 0.75) return "danger";
  if (ratio >= 0.45) return "warning";
  if (ratio > 0) return "info";
  return "success";
}

function getWorkloadLabel(tone: "success" | "warning" | "danger" | "info") {
  if (tone === "success") return "Healthy";
  if (tone === "warning") return "Busy";
  if (tone === "danger") return "Overloaded";
  return "Balanced";
}

export function AdminDepartmentsPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DepartmentDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingDepartmentId, setSavingDepartmentId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;
  const snapshotTimeMs = lastRefreshedAt ? new Date(lastRefreshedAt).getTime() : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadDepartments() {
      setLoading(true);
      setError(null);

      const [departmentsResult, issuesResult, profilesResult] = await Promise.all([
        supabase.from("departments").select("id, name, description, is_active, created_at, updated_at").order("name", { ascending: true }),
        supabase.from("issues").select("id, department_id, status, created_at, updated_at"),
        supabase.from("profiles").select("id, department_id, role_id, role:roles(code, name)"),
      ]);

      if (cancelled) {
        return;
      }

      const firstError = departmentsResult.error ?? issuesResult.error ?? profilesResult.error;
      if (firstError) {
        if (import.meta.env.DEV) {
          console.error("Admin departments load failed", firstError);
        }
        setError("Unable to load department management right now.");
        setLoading(false);
        return;
      }

      const nextDepartments = departmentsResult.data ?? [];
      setDepartments(nextDepartments);
      setIssues(issuesResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
      setDrafts(
        Object.fromEntries(
          nextDepartments.map((department) => [
            department.id,
            {
              name: department.name,
              description: department.description ?? "",
              is_active: department.is_active,
            },
          ]),
        ),
      );
      setLastRefreshedAt(new Date().toISOString());
      setLoading(false);
    }

    void loadDepartments();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshNonce, sessionStatus]);

  const issueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of issues) {
      if (!issue.department_id) continue;
      counts.set(issue.department_id, (counts.get(issue.department_id) ?? 0) + 1);
    }
    return counts;
  }, [issues]);

  const workloadByDepartment = useMemo(() => {
    const summaries = new Map<string, { total: number; open: number; resolved: number; reopened: number; stale: number }>();
    const staleThresholdMs = 21 * 24 * 60 * 60 * 1000;

    for (const issue of issues) {
      if (!issue.department_id) continue;

      const current = summaries.get(issue.department_id) ?? { total: 0, open: 0, resolved: 0, reopened: 0, stale: 0 };
      current.total += 1;
      if (issue.status === "REOPENED") {
        current.reopened += 1;
      }

      if (isResolvedLikeStatus(issue.status)) {
        current.resolved += 1;
      } else {
        current.open += 1;
        if (snapshotTimeMs && snapshotTimeMs - new Date(issue.updated_at).getTime() > staleThresholdMs) {
          current.stale += 1;
        }
      }

      summaries.set(issue.department_id, current);
    }

    return summaries;
  }, [issues, snapshotTimeMs]);

  const staffCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of profiles) {
      if (!user.department_id) continue;
      counts.set(user.department_id, (counts.get(user.department_id) ?? 0) + 1);
    }
    return counts;
  }, [profiles]);

  async function saveDepartment(department: DepartmentRow) {
    const draft = drafts[department.id];
    if (!draft) {
      return;
    }

    setSavingDepartmentId(department.id);
    const { error: updateError } = await supabase
      .from("departments")
      .update({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        is_active: draft.is_active,
      })
      .eq("id", department.id);
    setSavingDepartmentId(null);

    if (updateError) {
      setError("Unable to save department changes.");
      return;
    }

    setSavedSuccessId(department.id);
    setTimeout(() => setSavedSuccessId(null), 3000);
    setRefreshNonce((value) => value + 1);
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Departments Unavailable"
        description={sessionProblem ?? error ?? "Unable to load departments."}
        action={
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-60 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
      </div>
    );
  }

  const activeDepartmentsCount = departments.filter((d) => d.is_active).length;
  const linkedIssuesCount = issues.filter((i) => i.department_id).length;
  const linkedStaffCount = profiles.filter((p) => p.department_id).length;

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Civic Infrastructure"
        title="Department Management"
        description="Configure municipal departments, adjust routing availability, and monitor operational capacity."
        actions={
          <Button onClick={() => setRefreshNonce((value) => value + 1)} size="sm" type="button" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* 2. Top Summary KPI Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Departments", value: departments.length, icon: Building2, tone: "info" as const },
          { label: "Active Departments", value: activeDepartmentsCount, icon: CheckCircle2, tone: "success" as const },
          { label: "Linked Issues", value: linkedIssuesCount, icon: Layers, tone: "warning" as const },
          { label: "Assigned Staff", value: linkedStaffCount, icon: Users, tone: "default" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border border-border/80 bg-surface/95 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Department Cards List */}
      <div className="space-y-4">
        {departments.map((department) => {
          const draft = drafts[department.id];
          if (!draft) {
            return null;
          }

          const issueCount = issueCounts.get(department.id) ?? 0;
          const staffCount = staffCounts.get(department.id) ?? 0;
          const workload = workloadByDepartment.get(department.id) ?? { total: 0, open: 0, resolved: 0, reopened: 0, stale: 0 };
          const workloadTone = getDepartmentWorkloadTone(workload.open, workload.total);
          const resolutionRate = workload.total > 0 ? Math.round((workload.resolved / workload.total) * 100) : 0;
          const isSaving = savingDepartmentId === department.id;
          const isSaved = savedSuccessId === department.id;

          return (
            <Card key={department.id} className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 via-sky-100 to-emerald-100 text-teal-900 border border-teal-200">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-foreground">{department.name}</CardTitle>
                        <Badge variant={department.is_active ? "success" : "outline"} size="sm">
                          {department.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant={workloadTone} size="sm">
                          {getWorkloadLabel(workloadTone)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {issueCount} linked issues · {staffCount} assigned staff · Updated {formatAdminDateTime(department.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isSaved && (
                      <span className="flex items-center text-xs font-semibold text-emerald-600 animate-fade-in">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Saved
                      </span>
                    )}
                    <Button
                      size="sm"
                      disabled={isSaving}
                      onClick={() => void saveDepartment(department)}
                      type="button"
                    >
                      <Save className={`mr-1.5 h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Workload Mini Stats */}
                <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Open Issues</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{workload.open}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resolved Issues</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{workload.resolved}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stale Issues</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{workload.stale}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Closure Rate</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{resolutionRate}%</p>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="grid gap-4 md:grid-cols-[1fr_1.4fr_auto] items-start pt-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Department Name
                    </label>
                    <input
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3.5 text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                      value={draft.name}
                      onChange={(e) =>
                        setDrafts((curr) => ({
                          ...curr,
                          [department.id]: { ...draft, name: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-border/80 bg-background p-2.5 text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      value={draft.description}
                      onChange={(e) =>
                        setDrafts((curr) => ({
                          ...curr,
                          [department.id]: { ...draft, description: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/40 p-3 h-10 self-end">
                    <input
                      id={`active-${department.id}`}
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) =>
                        setDrafts((curr) => ({
                          ...curr,
                          [department.id]: { ...draft, is_active: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    />
                    <label htmlFor={`active-${department.id}`} className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Active for Routing
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

