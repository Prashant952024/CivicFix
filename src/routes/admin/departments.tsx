import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Eye,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDateTime } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
type IssueRow = Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "department_id" | "status" | "created_at" | "updated_at">;
type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "department_id" | "role_id" | "full_name" | "email" | "phone" | "employee_id" | "is_active"
> & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "code" | "name"> | null;
};

type DepartmentDraft = {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  manager_profile_id: string | null;
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
  const [viewingDept, setViewingDept] = useState<DepartmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingDepartmentId, setSavingDepartmentId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [referenceTime, setReferenceTime] = useState<number>(0);

  // New Department Dialog state
  const [isCreatingDeptOpen, setIsCreatingDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [newDeptActive, setNewDeptActive] = useState(true);
  const [newDeptManagerId, setNewDeptManagerId] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadDepartments() {
      setLoading(true);
      setError(null);

      const [departmentsResult, issuesResult, profilesResult] = await Promise.all([
        supabase.from("departments").select("id, name, code, description, is_active, manager_profile_id, created_at, updated_at").order("name", { ascending: true }),
        supabase.from("issues").select("id, department_id, status, created_at, updated_at"),
        supabase.from("profiles").select("id, department_id, role_id, full_name, email, phone, employee_id, is_active, role:roles(code, name)"),
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
              code: department.code ?? "",
              description: department.description ?? "",
              is_active: department.is_active,
              manager_profile_id: department.manager_profile_id ?? null,
            },
          ]),
        ),
      );
      setReferenceTime(Date.now());
      setLoading(false);
    }

    void loadDepartments();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshNonce, sessionStatus]);

  async function handleCreateDepartment(event: React.FormEvent) {
    event.preventDefault();
    const nameTrimmed = newDeptName.trim();
    if (!nameTrimmed) {
      setCreateError("Department name is required.");
      return;
    }

    const formattedCode =
      newDeptCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") ||
      nameTrimmed.toUpperCase().replace(/[^A-Z0-9]+/g, "_");

    setIsSubmittingCreate(true);
    setCreateError(null);

    const { data: createdDept, error: insertError } = await supabase
      .from("departments")
      .insert({
        name: nameTrimmed,
        code: formattedCode,
        description: newDeptDesc.trim() || null,
        is_active: newDeptActive,
        manager_profile_id: newDeptManagerId || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setIsSubmittingCreate(false);
      if (import.meta.env.DEV) {
        console.error("Create department failed", insertError);
      }
      setCreateError(insertError.message || "Failed to create department. Please ensure the code/name is unique.");
      return;
    }

    // If manager was assigned, synchronize manager's profile.department_id
    if (newDeptManagerId && createdDept?.id) {
      await supabase
        .from("profiles")
        .update({ department_id: createdDept.id })
        .eq("id", newDeptManagerId);
    }

    setIsSubmittingCreate(false);

    // Reset and close dialog
    setNewDeptName("");
    setNewDeptCode("");
    setNewDeptDesc("");
    setNewDeptActive(true);
    setNewDeptManagerId(null);
    setIsCreatingDeptOpen(false);
    setRefreshNonce((curr) => curr + 1);
  }

  async function saveDepartment(department: DepartmentRow) {
    const draft = drafts[department.id];
    if (!draft) return;

    setSavingDepartmentId(department.id);
    setError(null);

    const { error: saveError } = await supabase
      .from("departments")
      .update({
        name: draft.name.trim(),
        code: draft.code?.trim() || null,
        description: draft.description.trim() || null,
        is_active: draft.is_active,
        manager_profile_id: draft.manager_profile_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", department.id);

    if (saveError) {
      setSavingDepartmentId(null);
      if (import.meta.env.DEV) {
        console.error("Failed to save department", saveError);
      }
      setError("Unable to save department changes.");
      return;
    }

    // If manager was assigned, synchronize manager's profile.department_id
    if (draft.manager_profile_id) {
      await supabase
        .from("profiles")
        .update({ department_id: department.id })
        .eq("id", draft.manager_profile_id);
    }

    setSavingDepartmentId(null);
    setSavedSuccessId(department.id);
    setTimeout(() => setSavedSuccessId(null), 3000);
    setRefreshNonce((value) => value + 1);
  }

  const issueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of issues) {
      if (issue.department_id) {
        counts.set(issue.department_id, (counts.get(issue.department_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [issues]);

  const staffCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of profiles) {
      if (p.department_id) {
        counts.set(p.department_id, (counts.get(p.department_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [profiles]);

  const workloadByDepartment = useMemo(() => {
    const workloads = new Map<
      string,
      { total: number; open: number; resolved: number; reopened: number; stale: number }
    >();

    const now = referenceTime || 0;
    const staleThresholdMs = 14 * 24 * 60 * 60 * 1000;

    for (const issue of issues) {
      if (!issue.department_id) continue;
      const current = workloads.get(issue.department_id) ?? {
        total: 0,
        open: 0,
        resolved: 0,
        reopened: 0,
        stale: 0,
      };
      current.total += 1;
      const status = issue.status;
      if (isResolvedLikeStatus(status)) {
        current.resolved += 1;
      } else if (status === "REOPENED") {
        current.reopened += 1;
        current.open += 1;
      } else {
        current.open += 1;
      }

      const updatedAtMs = issue.updated_at ? new Date(issue.updated_at).getTime() : 0;
      if (!isResolvedLikeStatus(status) && updatedAtMs > 0 && now > 0 && now - updatedAtMs > staleThresholdMs) {
        current.stale += 1;
      }

      workloads.set(issue.department_id, current);
    }
    return workloads;
  }, [issues, referenceTime]);

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
        description="Configure municipal departments, adjust routing availability, inspect staff assignments, and monitor operational capacity."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setCreateError(null);
                setIsCreatingDeptOpen(true);
              }}
              size="sm"
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Department
            </Button>
            <Button onClick={() => setRefreshNonce((value) => value + 1)} size="sm" type="button" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* 2. Top Summary KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Departments", value: departments.length, icon: Building2, tone: "info" as const, desc: "Configured divisions" },
          { label: "Active Divisions", value: activeDepartmentsCount, icon: CheckCircle2, tone: "success" as const, desc: "Open for routing" },
          { label: "Linked Issues", value: linkedIssuesCount, icon: Layers, tone: "warning" as const, desc: "Total assigned backlog" },
          { label: "Assigned Staff", value: linkedStaffCount, icon: Users, tone: "info" as const, desc: "Field & manager crew" },
        ].map(({ label, value, icon: Icon, tone, desc }) => (
          <div
            key={label}
            className={`flex flex-col justify-between h-28 rounded-2xl border p-4 shadow-sm ${
              tone === "success"
                ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-surface to-teal-50/40"
                : tone === "warning"
                  ? "border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-surface to-orange-50/40"
                  : "border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-surface to-teal-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</span>
              <div
                className={`p-1.5 rounded-lg ${
                  tone === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : tone === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-sky-100 text-sky-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
          </div>
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
          const managerProfile = profiles.find((p) => p.id === department.manager_profile_id);

          return (
            <Card key={department.id} className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 via-sky-100 to-emerald-100 text-teal-900 border border-teal-200">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base font-bold text-foreground">{department.name}</CardTitle>
                        {department.code && (
                          <Badge variant="outline" size="sm" className="font-mono text-[10px] bg-muted/50">
                            {department.code}
                          </Badge>
                        )}
                        <Badge variant={department.is_active ? "success" : "outline"} size="sm">
                          {department.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant={workloadTone} size="sm">
                          {getWorkloadLabel(workloadTone)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manager: <strong className="text-foreground font-semibold">{managerProfile?.full_name || managerProfile?.email || "Unassigned"}</strong> · {issueCount} linked issues · {staffCount} assigned staff · Updated {formatAdminDateTime(department.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 text-teal-800 border-teal-200 hover:bg-teal-50"
                      onClick={() => setViewingDept(department)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View Crew & Tasks
                    </Button>

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
                      className="h-8 text-xs"
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
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3 flex flex-col justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Open Issues</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{workload.open}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3 flex flex-col justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resolved Issues</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{workload.resolved}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3 flex flex-col justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stale Issues</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{workload.stale}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3 flex flex-col justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Closure Rate</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{resolutionRate}%</p>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr_1fr_auto] items-start pt-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Department Name
                    </label>
                    <input
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs sm:text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
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
                      Code
                    </label>
                    <input
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs sm:text-sm text-foreground font-mono shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                      value={draft.code}
                      placeholder="e.g. ROAD_INFRASTRUCTURE"
                      onChange={(e) =>
                        setDrafts((curr) => ({
                          ...curr,
                          [department.id]: { ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") },
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
                      className="w-full rounded-xl border border-border/80 bg-background p-2 text-xs sm:text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[40px]"
                      value={draft.description}
                      onChange={(e) =>
                        setDrafts((curr) => ({
                          ...curr,
                          [department.id]: { ...draft, description: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Department Manager
                    </label>
                    <select
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs sm:text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                      value={draft.manager_profile_id ?? ""}
                      onChange={(e) =>
                        setDrafts((curr) => ({
                          ...curr,
                          [department.id]: { ...draft, manager_profile_id: e.target.value || null },
                        }))
                      }
                    >
                      <option value="">No manager assigned</option>
                      {profiles
                        .filter((p) => p.role?.code === "DEPARTMENT_MANAGER" || p.id === department.manager_profile_id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.email || `Manager ${p.id.slice(0, 6)}`}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Routing Status
                    </span>
                    <label
                      htmlFor={`active-${department.id}`}
                      className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background px-3 h-10 cursor-pointer select-none hover:bg-muted/20 transition"
                    >
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
                      <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                        Active for Routing
                      </span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 4. Department Details & Workforce Modal */}
      {viewingDept && (
        <Dialog
          className="max-w-2xl w-full"
          onClose={() => setViewingDept(null)}
          open={Boolean(viewingDept)}
          title={`Department Overview: ${viewingDept.name}`}
        >
          <div className="space-y-5 py-2 text-xs sm:text-sm">
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-teal-950">{viewingDept.name}</span>
                  {viewingDept.code && (
                    <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                      {viewingDept.code}
                    </Badge>
                  )}
                </div>
                <Badge variant={viewingDept.is_active ? "success" : "outline"} size="sm">
                  {viewingDept.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{viewingDept.description || "No department description set."}</p>
            </div>

            {/* Department Workforce */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-teal-700" />
                Assigned Staff & Field Technicians ({profiles.filter((p) => p.department_id === viewingDept.id).length})
              </h4>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {profiles.filter((p) => p.department_id === viewingDept.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed rounded-xl">
                    No staff members assigned to this department yet.
                  </p>
                ) : (
                  profiles
                    .filter((p) => p.department_id === viewingDept.id)
                    .map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-background/60 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-900 font-bold text-xs">
                            {staff.full_name ? staff.full_name[0].toUpperCase() : "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{staff.full_name || staff.email}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{staff.role?.name || "Staff"} {staff.employee_id ? `· ${staff.employee_id}` : ""}</p>
                          </div>
                        </div>

                        <Badge variant={staff.is_active ? "success" : "outline"} size="sm">
                          {staff.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Action Links */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link to={`/app/admin/users?department=${viewingDept.id}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View All Staff in Users Directory
                </Link>
              </Button>
              <Button type="button" size="sm" onClick={() => setViewingDept(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* 5. Create Department Dialog Modal */}
      {isCreatingDeptOpen && (
        <Dialog
          className="max-w-md w-full"
          onClose={() => setIsCreatingDeptOpen(false)}
          open={isCreatingDeptOpen}
          title="Create New Civic Department"
        >
          <form
            onSubmit={(e) => {
              void handleCreateDepartment(e);
            }}
            className="space-y-4 py-2 text-xs sm:text-sm"
          >
            {createError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {createError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Department Name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Flood & Disaster Management"
                value={newDeptName}
                onChange={(e) => {
                  setNewDeptName(e.target.value);
                  if (!newDeptCode) {
                    setNewDeptCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Department Code
              </label>
              <input
                className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm font-mono text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. FLOOD_DISASTER"
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
              />
              <p className="text-[11px] text-muted-foreground">Unique identifier used for automated routing and system events.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-border/80 bg-background p-2.5 text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Brief description of municipal scope and responsibilities..."
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Assign Initial Department Manager
              </label>
              <select
                className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                value={newDeptManagerId ?? ""}
                onChange={(e) => setNewDeptManagerId(e.target.value || null)}
              >
                <option value="">No manager assigned (optional)</option>
                {profiles
                  .filter((p) => p.role?.code === "DEPARTMENT_MANAGER")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email || `Manager ${p.id.slice(0, 6)}`}
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background p-3 cursor-pointer select-none hover:bg-muted/20 transition">
                <input
                  type="checkbox"
                  checked={newDeptActive}
                  onChange={(e) => setNewDeptActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground block">Active for Routing</span>
                  <span className="text-[11px] text-muted-foreground">Eligible for AI recommendations and officer issue assignments.</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatingDeptOpen(false)}
                disabled={isSubmittingCreate}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingCreate}>
                {isSubmittingCreate ? "Creating..." : "Create Department"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
