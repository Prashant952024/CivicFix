import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, Save } from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
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

function getDepartmentWorkloadTone(openCount: number, totalCount: number) {
  const ratio = totalCount > 0 ? openCount / totalCount : 0;
  if (ratio >= 0.75) return "danger";
  if (ratio >= 0.45) return "warning";
  if (ratio > 0) return "info";
  return "success";
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

    setRefreshNonce((value) => value + 1);
  }

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load departments</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.10)_48%,rgba(124,58,237,0.08)_100%)] p-6 shadow-lg shadow-teal-950/10">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.12)_45%,rgba(124,58,237,0.10)_100%)] p-6 shadow-2xl shadow-teal-950/12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
              Department administration
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Manage civic departments</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Update department names, descriptions, and active state using the schema already available to Admin.
              </p>
            </div>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button" variant="outline">
            Refresh data
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5">
          <p className="text-sm font-medium text-muted-foreground">Total departments</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{departments.length}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5">
          <p className="text-sm font-medium text-muted-foreground">Active departments</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{departments.filter((department) => department.is_active).length}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5">
          <p className="text-sm font-medium text-muted-foreground">Department-linked issues</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{issues.filter((issue) => issue.department_id).length}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5">
          <p className="text-sm font-medium text-muted-foreground">Department-linked staff</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{profiles.filter((user) => user.department_id).length}</p>
        </div>
      </section>

      <section className="space-y-4">
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

          return (
            <article key={department.id} className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 via-teal-100 to-emerald-100 text-teal-900 ring-1 ring-teal-200">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{department.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Updated {formatAdminDateTime(department.updated_at)} · Created {formatAdminDateTime(department.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{issueCount} linked issues</span>
                    <span>•</span>
                    <span>{staffCount} linked staff</span>
                    <span>•</span>
                    <span>{department.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl border border-border/70 bg-surface-elevated p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Open</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{workload.open}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-surface-elevated p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resolved</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{workload.resolved}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-surface-elevated p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stale</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{workload.stale}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-surface-elevated p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Closed rate</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{resolutionRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <span
                    className={[
                      "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1",
                      workloadTone === "success"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : workloadTone === "warning"
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : workloadTone === "danger"
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : "bg-sky-50 text-sky-700 ring-sky-200",
                    ].join(" ")}
                  >
                    {workloadTone === "success" ? "Healthy" : workloadTone === "warning" ? "Busy" : workloadTone === "danger" ? "Overloaded" : "Balanced"}
                  </span>
                  <Button disabled={savingDepartmentId === department.id} onClick={() => void saveDepartment(department)} type="button">
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Save changes
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.3fr_auto]">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Department name</span>
                  <input
                    className="w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [department.id]: { ...draft, name: event.target.value },
                      }))
                    }
                    value={draft.name}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Description</span>
                  <textarea
                    className="min-h-[5.6rem] w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [department.id]: { ...draft, description: event.target.value },
                      }))
                    }
                    value={draft.description}
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-border/80 bg-surface-elevated px-4 py-3">
                  <input
                    checked={draft.is_active}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [department.id]: { ...draft, is_active: event.target.checked },
                      }))
                    }
                    type="checkbox"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-sm text-muted-foreground">Controls whether this department is available for routing.</p>
                  </div>
                </label>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
