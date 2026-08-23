import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@clerk/react";
import { useLocation } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDate, formatAdminDateTime, getAdminInitials, getAdminRoleTone } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "id" | "code" | "name"> | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
};

type RoleRow = Pick<Database["public"]["Tables"]["roles"]["Row"], "id" | "code" | "name" | "description" | "is_system_role">;
type DepartmentRow = Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active">;
type IssueRow = Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "reporter_profile_id" | "updated_at">;
type ManagedRoleCode = "MUNICIPAL_OFFICER" | "FIELD_WORKER";
type CreateUserFormState = {
  fullName: string;
  email: string;
  roleCode: ManagedRoleCode;
};

type UserRecord = ProfileRow & {
  issueCount: number;
  lastIssueUpdatedAt: string | null;
};

const PAGE_SIZE = 10;
type RoleFilter = "all" | "CITIZEN" | "MUNICIPAL_OFFICER" | "FIELD_WORKER" | "ADMIN";
const DEFAULT_CREATE_FORM: CreateUserFormState = {
  fullName: "",
  email: "",
  roleCode: "MUNICIPAL_OFFICER",
};

export function AdminUsersPage() {
  const { getToken } = useAuth();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const location = useLocation();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserFormState>(DEFAULT_CREATE_FORM);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError(null);

      const [profilesResult, rolesResult, departmentsResult, issuesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, clerk_user_id, full_name, email, phone, role_id, department_id, created_at, updated_at, role:roles(id, code, name), department:departments(id, name, is_active)")
          .order("created_at", { ascending: false }),
        supabase.from("roles").select("id, code, name, description, is_system_role").order("name", { ascending: true }),
        supabase.from("departments").select("id, name, is_active").order("name", { ascending: true }),
        supabase.from("issues").select("id, reporter_profile_id, updated_at"),
      ]);

      if (cancelled) {
        return;
      }

      const firstError = profilesResult.error ?? rolesResult.error ?? departmentsResult.error ?? issuesResult.error;
      if (firstError) {
        if (import.meta.env.DEV) {
          console.error("Admin users load failed", firstError);
        }
        setError("Unable to load user management right now.");
        setLoading(false);
        return;
      }

      setProfiles(profilesResult.data ?? []);
      setRoles(rolesResult.data ?? []);
      setDepartments(departmentsResult.data ?? []);
      setIssues(issuesResult.data ?? []);
      setLoading(false);
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshNonce, sessionStatus]);

  const users = useMemo<UserRecord[]>(() => {
    const issueMap = new Map<string, { count: number; lastIssueUpdatedAt: string | null }>();

    for (const issue of issues) {
      const entry = issueMap.get(issue.reporter_profile_id) ?? { count: 0, lastIssueUpdatedAt: null };
      entry.count += 1;
      if (!entry.lastIssueUpdatedAt || new Date(issue.updated_at).getTime() > new Date(entry.lastIssueUpdatedAt).getTime()) {
        entry.lastIssueUpdatedAt = issue.updated_at;
      }
      issueMap.set(issue.reporter_profile_id, entry);
    }

    return profiles.map((entry) => {
      const issueSummary = issueMap.get(entry.id) ?? { count: 0, lastIssueUpdatedAt: null };
      return {
        ...entry,
        issueCount: issueSummary.count,
        lastIssueUpdatedAt: issueSummary.lastIssueUpdatedAt,
      };
    });
  }, [issues, profiles]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [user.full_name, user.email, user.phone, user.role?.name, user.department?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesRole = roleFilter === "all" || user.role?.code === roleFilter;
      const matchesDepartment = departmentFilter === "all" || user.department_id === departmentFilter;
      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [departmentFilter, roleFilter, search, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const managedRoleOptions = roles.filter(
    (role) => role.code === "MUNICIPAL_OFFICER" || role.code === "FIELD_WORKER",
  );

  async function updateRole(user: ProfileRow, nextRoleId: string) {
    if (!profile?.id || user.id === profile.id || user.role_id === nextRoleId) {
      return;
    }

    setSavingUserId(user.id);
    const { error: updateError } = await supabase.from("profiles").update({ role_id: nextRoleId }).eq("id", user.id);
    setSavingUserId(null);

    if (updateError) {
      setError("Unable to update the selected user's role.");
      return;
    }

    setRefreshNonce((value) => value + 1);
  }

  function openCreateModal() {
    setCreateForm(DEFAULT_CREATE_FORM);
    setCreateError(null);
    setCreateSuccess(null);
    setCreateModalOpen(true);
  }

  useEffect(() => {
    const shouldOpenCreateModal =
      Boolean(location.state && typeof location.state === "object" && (location.state as { openCreateModal?: boolean }).openCreateModal);

    if (shouldOpenCreateModal) {
      const handle = window.setTimeout(() => {
        setCreateForm(DEFAULT_CREATE_FORM);
        setCreateError(null);
        setCreateSuccess(null);
        setCreateModalOpen(true);
      }, 0);

      return () => window.clearTimeout(handle);
    }
  }, [location.key, location.state]);

  function closeCreateModal() {
    if (createSubmitting) {
      return;
    }

    setCreateModalOpen(false);
    setCreateError(null);
  }

  async function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fullName = createForm.fullName.trim();
    const email = createForm.email.trim().toLowerCase();
    const roleCode = createForm.roleCode;

    if (!fullName) {
      setCreateError("Full name is required.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateError("A valid email is required.");
      return;
    }

    if (!roleCode) {
      setCreateError("Please choose a role.");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Clerk session token is unavailable.");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          roleCode,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; user?: { fullName?: string; email?: string; roleName?: string } };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create the new user.");
      }

      setCreateSuccess(
        `User created successfully: ${payload.user?.fullName ?? fullName} · ${payload.user?.roleName ?? roleCode} · ${payload.user?.email ?? email}`,
      );
      setCreateModalOpen(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      setRefreshNonce((value) => value + 1);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to create the new user.";
      setCreateError(message);
      if (import.meta.env.DEV) {
        console.error("Admin user creation failed", submitError);
      }
    } finally {
      setCreateSubmitting(false);
    }
  }

  const hasActiveFilters = search.trim().length > 0 || roleFilter !== "all" || departmentFilter !== "all";

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="User Management Unavailable"
        description={sessionProblem ?? error ?? "Unable to load user accounts right now."}
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
        <div className="h-44 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="User Management"
        title="CivicFix Accounts"
        description="Search platform accounts, inspect roles, and update operational assignments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openCreateModal} size="default" type="button">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Create Field Account
            </Button>
            <Button onClick={() => setRefreshNonce((value) => value + 1)} size="sm" type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* 2. Top Summary Metric Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: users.length, icon: UsersRound, tone: "info" as const },
          { label: "Citizens", value: users.filter((u) => u.role?.code === "CITIZEN").length, icon: UsersRound, tone: "info" as const },
          { label: "Officers", value: users.filter((u) => u.role?.code === "MUNICIPAL_OFFICER").length, icon: Building2, tone: "warning" as const },
          { label: "Field Workers", value: users.filter((u) => u.role?.code === "FIELD_WORKER").length, icon: RefreshCw, tone: "danger" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border border-border/80 bg-surface/95 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    tone === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : tone === "danger"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Feedback Banner */}
      {createSuccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm animate-in fade-in">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm">Account Created Successfully</p>
            <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">{createSuccess}</p>
          </div>
          <button
            className="rounded-full p-1 text-emerald-700 hover:bg-emerald-100"
            onClick={() => setCreateSuccess(null)}
            type="button"
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 4. Filter and Search Bar */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-4 text-xs sm:text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, phone, role, or department..."
                value={search}
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2.5">
              <select
                className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setRoleFilter(event.target.value as RoleFilter);
                  setPage(1);
                }}
                value={roleFilter}
              >
                <option value="all">All Roles</option>
                <option value="CITIZEN">Citizen</option>
                <option value="MUNICIPAL_OFFICER">Municipal Officer</option>
                <option value="FIELD_WORKER">Field Worker</option>
                <option value="ADMIN">Admin</option>
              </select>

              <select
                className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setDepartmentFilter(event.target.value);
                  setPage(1);
                }}
                value={departmentFilter}
              >
                <option value="all">All Departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                    setDepartmentFilter("all");
                    setPage(1);
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Mobile Filter Button */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <Button
                onClick={() => setMobileFilterOpen(true)}
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-primary-foreground font-bold">
                    Active
                  </span>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                    setDepartmentFilter("all");
                    setPage(1);
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Mobile Filters Modal Dialog */}
      <Dialog
        description="Filter user list by operational role and department"
        onClose={() => setMobileFilterOpen(false)}
        open={mobileFilterOpen}
        title="Filter User Accounts"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Role
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleFilter);
                setPage(1);
              }}
              value={roleFilter}
            >
              <option value="all">All Roles</option>
              <option value="CITIZEN">Citizen</option>
              <option value="MUNICIPAL_OFFICER">Municipal Officer</option>
              <option value="FIELD_WORKER">Field Worker</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Department
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setPage(1);
              }}
              value={departmentFilter}
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border/60">
            <Button
              className="flex-1"
              onClick={() => {
                setRoleFilter("all");
                setDepartmentFilter("all");
                setPage(1);
                setMobileFilterOpen(false);
              }}
              type="button"
              variant="outline"
            >
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setMobileFilterOpen(false)} type="button">
              Apply Filters
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 6. User Directory: Desktop Table + Mobile Cards */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">User Directory</CardTitle>
              <p className="text-xs text-muted-foreground">Live accounts synced with Supabase profiles</p>
            </div>
            <Badge variant="outline" size="sm">
              {filteredUsers.length} {filteredUsers.length === 1 ? "match" : "matches"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {visibleUsers.length > 0 ? (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-border/60 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Reports</th>
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 text-right">Role Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {visibleUsers.map((user) => {
                      const isSelf = user.id === profile?.id;
                      const roleTone = getAdminRoleTone(user.role?.code ?? "CITIZEN");

                      return (
                        <tr key={user.id} className="hover:bg-muted/20 transition">
                          {/* User Avatar + Info */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 via-sky-100 to-emerald-100 text-xs font-bold text-teal-900 border border-teal-200">
                                {getAdminInitials(user.full_name || user.email || "User")}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate">{user.full_name || "Unnamed User"}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email || "No email"}</p>
                                {user.phone && <p className="text-[11px] text-muted-foreground truncate">{user.phone}</p>}
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="px-4 py-3.5">
                            <Badge variant={roleTone} size="sm">
                              {user.role?.name ?? "Citizen"}
                            </Badge>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-foreground">{user.department?.name || "Unassigned"}</p>
                            {user.department && (
                              <span className="text-[10px] text-muted-foreground">
                                {user.department.is_active ? "Active" : "Inactive"}
                              </span>
                            )}
                          </td>

                          {/* Reports count */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-foreground">{user.issueCount}</span>
                          </td>

                          {/* Activity dates */}
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            <p>Joined {formatAdminDate(user.created_at)}</p>
                            <p className="text-[11px]">Updated {formatAdminDateTime(user.updated_at)}</p>
                          </td>

                          {/* Role Updater Select */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {savingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : null}
                              <select
                                className="w-36 rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isSelf || savingUserId === user.id}
                                onChange={(event) => void updateRole(user, event.target.value)}
                                value={user.role_id}
                              >
                                {roles.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List (< 768px) */}
              <div className="md:hidden divide-y divide-border/60 p-3 space-y-3">
                {visibleUsers.map((user) => {
                  const isSelf = user.id === profile?.id;
                  const roleTone = getAdminRoleTone(user.role?.code ?? "CITIZEN");

                  return (
                    <div key={user.id} className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 via-sky-100 to-emerald-100 text-xs font-bold text-teal-900 border border-teal-200">
                            {getAdminInitials(user.full_name || user.email || "User")}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{user.full_name || "Unnamed User"}</p>
                            <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                          </div>
                        </div>

                        <Badge variant={roleTone} size="sm">
                          {user.role?.name ?? "Citizen"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground">Department</span>
                          <p className="font-medium text-foreground">{user.department?.name || "Unassigned"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground">Reported Issues</span>
                          <p className="font-bold text-foreground">{user.issueCount}</p>
                        </div>
                      </div>

                      {/* Mobile Role Updater */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Change Role:</span>
                        <div className="flex items-center gap-1.5">
                          {savingUserId === user.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                          <select
                            className="rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none disabled:opacity-50"
                            disabled={isSelf || savingUserId === user.id}
                            onChange={(event) => void updateRole(user, event.target.value)}
                            value={user.role_id}
                          >
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-8">
              <EmptyState
                icon={UsersRound}
                title="No Users Found"
                description={hasActiveFilters ? "No users match your active filter criteria." : "No platform user accounts are available."}
                action={
                  hasActiveFilters ? (
                    <Button
                      onClick={() => {
                        setSearch("");
                        setRoleFilter("all");
                        setDepartmentFilter("all");
                        setPage(1);
                      }}
                      size="sm"
                      type="button"
                    >
                      Clear Filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Previous
            </Button>
            <span className="rounded-xl border border-border/70 bg-surface px-3 py-1.5 text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* 8. Create User Modal Dialog */}
      <Dialog
        description="Creates a Clerk identity and matching Supabase profile with the selected role"
        onClose={closeCreateModal}
        open={createModalOpen}
        title="Create CivicFix Field Account"
      >
        {createError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p>{createError}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={(event) => void submitCreateUser(event)}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCreateForm((value) => ({ ...value, fullName: event.target.value }))}
              placeholder="e.g. Aarav Mehta"
              required
              value={createForm.fullName}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Email Address <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setCreateForm((value) => ({ ...value, email: event.target.value }))}
                placeholder="e.g. aarav@civicfix.gov"
                required
                type="email"
                value={createForm.email}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Operational Role <span className="text-destructive">*</span>
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) =>
                setCreateForm((value) => ({
                  ...value,
                  roleCode: event.target.value as ManagedRoleCode,
                }))
              }
              value={createForm.roleCode}
            >
              {managedRoleOptions.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Only Municipal Officer and Field Worker accounts can be provisioned through this flow.
            </p>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border/60 justify-end">
            <Button disabled={createSubmitting} onClick={closeCreateModal} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={createSubmitting} type="submit">
              {createSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
