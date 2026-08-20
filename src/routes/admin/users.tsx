import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw, Search, ShieldCheck, SlidersHorizontal, UserPlus, UsersRound, X } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useLocation } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import { formatAdminDateTime, getAdminInitials } from "@/lib/admin";
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

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load users</h2>
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
        <section className="h-64 animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.10)_45%,rgba(124,58,237,0.10)_100%)] shadow-2xl shadow-teal-950/12">
        <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
        <div className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.86)_0%,rgba(247,250,248,0.76)_100%)] px-6 py-6 backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                User management
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Manage CivicFix accounts</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Search users, review account metadata, and update roles when the existing RLS policy allows it. Self-role changes are disabled.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground shadow-sm shadow-teal-950/5">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-[#0f766e]" aria-hidden="true" />
                Role updates are direct Supabase writes
              </div>
              <p className="mt-1 leading-6">Only profiles already visible to Admin can be updated.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total users", value: users.length, icon: UsersRound },
          { label: "Citizens", value: users.filter((user) => user.role?.code === "CITIZEN").length, icon: UsersRound },
          { label: "Officers", value: users.filter((user) => user.role?.code === "MUNICIPAL_OFFICER").length, icon: SlidersHorizontal },
          { label: "Workers", value: users.filter((user) => user.role?.code === "FIELD_WORKER").length, icon: RefreshCw },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-teal-950/5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(239,246,244,0.9)_100%)] p-5 shadow-lg shadow-teal-950/10">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.75fr_0.75fr_auto]">
          <label className="relative">
            <span className="sr-only">Search users</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border border-border/80 bg-white/80 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, phone, role, or department"
              value={search}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Role</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleFilter);
                setPage(1);
              }}
              value={roleFilter}
            >
              <option value="all">All roles</option>
              {managedRoleOptions.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Department</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setPage(1);
              }}
              value={departmentFilter}
            >
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <Button onClick={openCreateModal} type="button">
              <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create User
            </Button>
            <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button" variant="outline">
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {createSuccess ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm shadow-emerald-950/5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">User created</p>
            <p className="text-sm leading-6">{createSuccess}</p>
          </div>
          <button
            className="ml-auto rounded-full p-1 text-emerald-700 transition hover:bg-emerald-100"
            onClick={() => setCreateSuccess(null)}
            type="button"
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Account list</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">User records from the live schema</h3>
          </div>
          <div className="rounded-full border border-border/70 bg-surface-elevated px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {filteredUsers.length} matches
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
          <div className="grid grid-cols-[1.3fr_0.9fr_0.8fr_0.9fr_0.8fr_auto] gap-3 border-b border-border/70 bg-surface-elevated px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <div>User</div>
            <div>Role</div>
            <div>Department</div>
            <div>Activity</div>
            <div>Reports</div>
            <div>Action</div>
          </div>

            <div className="divide-y divide-border/70">
              {visibleUsers.length > 0 ? (
                visibleUsers.map((user) => {
                  const isSelf = user.id === profile?.id;
                  return (
                  <div key={user.id} className="grid grid-cols-[1.3fr_0.9fr_0.8fr_0.9fr_0.8fr_auto] gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 via-teal-100 to-emerald-100 text-sm font-semibold text-teal-900 ring-1 ring-teal-200">
                          {getAdminInitials(user.full_name || user.email || user.phone || "User")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{user.full_name || "Unnamed user"}</p>
                          <p className="truncate text-sm text-muted-foreground">{user.email || "No email on file"}</p>
                          {user.phone ? <p className="truncate text-xs text-muted-foreground">{user.phone}</p> : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${
                          user.role?.code === "ADMIN"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : user.role?.code === "MUNICIPAL_OFFICER"
                              ? "bg-amber-50 text-amber-700 ring-amber-200"
                              : user.role?.code === "FIELD_WORKER"
                                ? "bg-rose-50 text-rose-700 ring-rose-200"
                                : "bg-sky-50 text-sky-700 ring-sky-200"
                        }`}
                      >
                        {user.role?.name ?? "Citizen"}
                      </span>
                    </div>

                    <div>
                      <p className="font-medium text-foreground">{user.department?.name || "No department"}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.department?.is_active === false ? "Inactive department" : "Active department"}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-foreground">{formatAdminDateTime(user.updated_at)}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatAdminDateTime(user.created_at)}</p>
                    </div>

                    <div>
                      <p className="text-2xl font-semibold text-foreground">{user.issueCount}</p>
                      <p className="text-xs text-muted-foreground">Reported issues</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <select
                        className="w-44 rounded-2xl border border-border/80 bg-white/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        {isSelf ? "Your own role is locked." : "Changes are written through the Admin RLS policy."}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No users match the current filters.</div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {visibleUsers.length} of {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <Button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button" variant="outline">
              Previous
            </Button>
            <span className="rounded-full border border-border/70 bg-surface-elevated px-3 py-2 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          onClick={closeCreateModal}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-[1.75rem] border border-border/80 bg-surface/95 p-6 shadow-2xl shadow-slate-950/30"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-800">
                  <UserPlus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  New account
                </div>
                <div>
                  <h3 id="create-user-title" className="text-2xl font-semibold tracking-tight text-foreground">
                    Create a CivicFix field account
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This uses Clerk for authentication and syncs a matching Supabase profile with the chosen operational role.
                  </p>
                </div>
              </div>
              <button
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={closeCreateModal}
                type="button"
                aria-label="Close create user dialog"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {createError ? (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm leading-6">{createError}</p>
              </div>
            ) : null}

            <form className="mt-5 space-y-5" onSubmit={(event) => void submitCreateUser(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Full name</span>
                  <input
                    className="w-full rounded-2xl border border-border/80 bg-white/85 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    onChange={(event) => setCreateForm((value) => ({ ...value, fullName: event.target.value }))}
                    placeholder="Aarav Mehta"
                    value={createForm.fullName}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                      autoComplete="email"
                      className="w-full rounded-2xl border border-border/80 bg-white/85 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      onChange={(event) => setCreateForm((value) => ({ ...value, email: event.target.value }))}
                      placeholder="aarav@example.com"
                      value={createForm.email}
                    />
                  </div>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Role</span>
                <select
                  className="w-full rounded-2xl border border-border/80 bg-white/85 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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
                <p className="text-xs leading-5 text-muted-foreground">
                  Only Municipal Officer and Field Worker accounts can be created here. Admin accounts stay outside this flow.
                </p>
              </label>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button onClick={closeCreateModal} type="button" variant="outline">
                  Cancel
                </Button>
                <Button disabled={createSubmitting} type="submit">
                  {createSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {createSubmitting ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
