import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  Filter,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UsersRound,
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
import { getAdminInitials, getAdminRoleTone } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "id" | "code" | "name"> | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
};

type RoleRow = Pick<Database["public"]["Tables"]["roles"]["Row"], "id" | "code" | "name" | "description" | "is_system_role">;
type DepartmentRow = Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active">;
type IssueRow = Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "reporter_profile_id" | "updated_at">;
type AssignmentRow = Pick<Database["public"]["Tables"]["issue_assignments"]["Row"], "id" | "worker_id" | "department_id" | "status" | "unassigned_at">;

type ManagedRoleCode = "MUNICIPAL_OFFICER" | "DEPARTMENT_MANAGER" | "FIELD_WORKER";
type WizardStep = 1 | 2 | 3 | 4;

type CreateUserFormState = {
  fullName: string;
  email: string;
  phone: string;
  roleCode: ManagedRoleCode;
  departmentId: string;
  employeeId: string;
  designation: string;
  joinedAt: string;
  avatarUrl: string;
  avatarFile: File | null;
};

type EditUserFormState = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  roleCode: string;
  departmentId: string;
  employeeId: string;
  designation: string;
  avatarUrl: string;
  avatarFile: File | null;
  isActive: boolean;
};

type UserRecord = ProfileRow & {
  issueCount: number;
  lastIssueUpdatedAt: string | null;
  activeAssignmentsCount: number;
};

const PAGE_SIZE = 10;
type RoleFilter = "all" | "CITIZEN" | "MUNICIPAL_OFFICER" | "DEPARTMENT_MANAGER" | "FIELD_WORKER" | "ADMIN";
type StatusFilter = "all" | "active" | "inactive";

const DEFAULT_CREATE_FORM: CreateUserFormState = {
  fullName: "",
  email: "",
  phone: "",
  roleCode: "FIELD_WORKER",
  departmentId: "",
  employeeId: "",
  designation: "",
  joinedAt: new Date().toISOString().split("T")[0],
  avatarUrl: "",
  avatarFile: null,
};

function getSuggestedPrefix(roleCode: ManagedRoleCode, departmentName?: string | null): string {
  if (roleCode === "MUNICIPAL_OFFICER") return "municipal-officer";
  if (roleCode === "DEPARTMENT_MANAGER") {
    if (departmentName) {
      const norm = departmentName.toLowerCase();
      if (norm.includes("road") || norm.includes("infrastructure")) return "road-manager";
      if (norm.includes("water") || norm.includes("sewage")) return "water-manager";
      if (norm.includes("waste") || norm.includes("garbage")) return "waste-manager";
      if (norm.includes("electr") || norm.includes("light")) return "electricity-manager";
      if (norm.includes("park")) return "parks-manager";
      if (norm.includes("health")) return "health-manager";
      if (norm.includes("traffic")) return "traffic-manager";
      if (norm.includes("build")) return "building-manager";
    }
    return "dept-manager";
  }

  if (departmentName) {
    const norm = departmentName.toLowerCase();
    if (norm.includes("road") || norm.includes("infrastructure")) return "road-worker";
    if (norm.includes("water") || norm.includes("sewage")) return "water-worker";
    if (norm.includes("waste") || norm.includes("garbage")) return "waste-worker";
    if (norm.includes("electr") || norm.includes("light")) return "electricity-worker";
    if (norm.includes("park")) return "parks-worker";
    if (norm.includes("health")) return "health-worker";
    if (norm.includes("traffic")) return "traffic-worker";
    if (norm.includes("build")) return "building-worker";
    if (norm.includes("drain")) return "drainage-worker";
    if (norm.includes("fire")) return "fire-worker";
  }

  return "field-worker";
}

export function AdminUsersPage() {
  const { getToken } = useAuth();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const location = useLocation();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Add User Wizard State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<WizardStep>(1);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<{
    fullName: string;
    email: string;
    employeeId: string;
    roleName: string;
    departmentName: string;
    temporaryPassword?: string;
  } | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserFormState>(DEFAULT_CREATE_FORM);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User View Drawer State
  const [viewingUser, setViewingUser] = useState<UserRecord | null>(null);

  // User Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditUserFormState | null>(null);
  const [editAvatarPreviewUrl, setEditAvatarPreviewUrl] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Deactivation confirmation state
  const [deactivateTarget, setDeactivateTarget] = useState<ProfileRow | null>(null);
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);

  // Permanent Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError(null);

      const [profilesResult, rolesResult, departmentsResult, issuesResult, assignmentsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, clerk_user_id, full_name, email, phone, role_id, department_id, employee_id, designation, is_active, avatar_url, joined_at, created_at, updated_at, role:roles!profiles_role_id_fkey(id, code, name), department:departments!profiles_department_id_fkey(id, name, is_active)",
          )
          .order("created_at", { ascending: false }),
        supabase.from("roles").select("id, code, name, description, is_system_role").order("name", { ascending: true }),
        supabase.from("departments").select("id, name, is_active").order("name", { ascending: true }),
        supabase.from("issues").select("id, reporter_profile_id, updated_at"),
        supabase.from("issue_assignments").select("id, worker_id, department_id, status, unassigned_at"),
      ]);

      if (cancelled) {
        return;
      }

      if (profilesResult.error) {
        console.error("Admin users profiles query error:", profilesResult.error);
      }
      if (rolesResult.error) {
        console.error("Admin users roles query error:", rolesResult.error);
      }
      if (departmentsResult.error) {
        console.error("Admin users departments query error:", departmentsResult.error);
      }
      if (issuesResult.error) {
        console.error("Admin users issues query error:", issuesResult.error);
      }
      if (assignmentsResult.error) {
        console.error("Admin users assignments query error:", assignmentsResult.error);
      }

      const firstError =
        profilesResult.error ?? rolesResult.error ?? departmentsResult.error ?? issuesResult.error ?? assignmentsResult.error;
      if (firstError) {
        setError(firstError.message || "Unable to load user management right now.");
        setLoading(false);
        return;
      }

      setProfiles(profilesResult.data ?? []);
      setRoles(rolesResult.data ?? []);
      setDepartments(departmentsResult.data ?? []);
      setIssues(issuesResult.data ?? []);
      setAssignments(assignmentsResult.data ?? []);
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

    const activeAssignmentsMap = new Map<string, number>();
    for (const assignment of assignments) {
      if (assignment.worker_id && assignment.unassigned_at === null && assignment.status === "ACTIVE") {
        activeAssignmentsMap.set(assignment.worker_id, (activeAssignmentsMap.get(assignment.worker_id) ?? 0) + 1);
      }
    }

    return profiles.map((entry) => {
      const issueSummary = issueMap.get(entry.id) ?? { count: 0, lastIssueUpdatedAt: null };
      const activeAssignments = activeAssignmentsMap.get(entry.id) ?? 0;
      return {
        ...entry,
        issueCount: issueSummary.count,
        lastIssueUpdatedAt: issueSummary.lastIssueUpdatedAt,
        activeAssignmentsCount: activeAssignments,
      };
    });
  }, [assignments, issues, profiles]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [user.full_name, user.email, user.phone, user.employee_id, user.designation, user.role?.name, user.department?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesRole = roleFilter === "all" || user.role?.code === roleFilter;
      const matchesDepartment = departmentFilter === "all" || user.department_id === departmentFilter;
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? user.is_active : !user.is_active);

      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    });
  }, [departmentFilter, roleFilter, search, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const managedRoleOptions = useMemo(
    () =>
      roles.filter(
        (role) =>
          role.code === "MUNICIPAL_OFFICER" ||
          role.code === "DEPARTMENT_MANAGER" ||
          role.code === "FIELD_WORKER",
      ),
    [roles],
  );

  const selectedCreateDepartmentName = useMemo(() => {
    if (!createForm.departmentId) return null;
    return departments.find((d) => d.id === createForm.departmentId)?.name ?? null;
  }, [createForm.departmentId, departments]);

  // Open modal from URL or button
  useEffect(() => {
    const shouldOpenCreateModal = Boolean(
      location.state && typeof location.state === "object" && (location.state as { openCreateModal?: boolean }).openCreateModal,
    );

    if (shouldOpenCreateModal) {
      const handle = window.setTimeout(() => {
        openCreateModal();
      }, 0);

      return () => window.clearTimeout(handle);
    }
  }, [location.key, location.state]);

  function openCreateModal() {
    const prefix = getSuggestedPrefix("FIELD_WORKER", null);
    setCreateForm({
      ...DEFAULT_CREATE_FORM,
      employeeId: `${prefix}-001`,
    });
    setCreateStep(1);
    setAvatarPreviewUrl(null);
    setCreateError(null);
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (createSubmitting) return;
    setCreateModalOpen(false);
    setCreateError(null);
  }

  function handleAvatarFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCreateError("Please select a valid image file (PNG, JPEG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCreateError("Image size must be less than 5 MB.");
      return;
    }

    setCreateForm((prev) => ({ ...prev, avatarFile: file }));
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setCreateError(null);
  }

  function handleEditAvatarFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditError("Please select a valid image file (PNG, JPEG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditError("Image size must be less than 5 MB.");
      return;
    }

    setEditForm((prev) => (prev ? { ...prev, avatarFile: file } : null));
    setEditAvatarPreviewUrl(URL.createObjectURL(file));
    setEditError(null);
  }

  function handleRoleOrDeptChange(newRole: ManagedRoleCode, newDeptId: string) {
    const deptName = departments.find((d) => d.id === newDeptId)?.name ?? null;
    const prefix = getSuggestedPrefix(newRole, deptName);
    setCreateForm((prev) => ({
      ...prev,
      roleCode: newRole,
      departmentId: newDeptId,
      employeeId: `${prefix}-001`,
    }));
  }

  async function uploadAvatarToStorage(file: File, userIdOrPrefix: string): Promise<string | null> {
    try {
      const fileExt = file.name.split(".").pop() ?? "jpg";
      const fileName = `${userIdOrPrefix}_${Date.now()}.${fileExt}`;
      const filePath = `staff/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

      if (uploadError) {
        console.warn("Avatar upload to avatars bucket failed, attempting public URL fallback", uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return urlData.publicUrl ?? filePath;
    } catch (err) {
      console.error("Storage upload exception", err);
      return null;
    }
  }

  async function submitCreateUser(event?: FormEvent) {
    if (event) event.preventDefault();

    const fullName = createForm.fullName.trim();
    const email = createForm.email.trim().toLowerCase();
    const phone = createForm.phone.trim();
    const roleCode = createForm.roleCode;
    const departmentId = createForm.departmentId.trim();
    const employeeId = createForm.employeeId.trim();
    const designation = createForm.designation.trim();
    const joinedAt = createForm.joinedAt.trim() || new Date().toISOString().split("T")[0];

    if (!fullName) {
      setCreateError("Full name is required.");
      setCreateStep(1);
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateError("A valid official email is required.");
      setCreateStep(1);
      return;
    }

    if (!roleCode) {
      setCreateError("Please select a role.");
      setCreateStep(2);
      return;
    }

    if ((roleCode === "DEPARTMENT_MANAGER" || roleCode === "FIELD_WORKER") && !departmentId) {
      setCreateError("Department assignment is mandatory for Department Manager and Field Worker roles.");
      setCreateStep(2);
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      let finalAvatarUrl: string | null = null;
      if (createForm.avatarFile) {
        finalAvatarUrl = await uploadAvatarToStorage(createForm.avatarFile, (employeeId || "staff").toLowerCase().replace(/[^a-z0-9]/g, ""));
      }

      const token = await getToken();
      if (!token) {
        throw new Error("Clerk session token is unavailable. Please log in again.");
      }

      const payload = {
        fullName,
        email,
        phone: phone || undefined,
        roleCode,
        departmentId: departmentId || undefined,
        employeeId: employeeId || undefined,
        designation: designation || undefined,
        avatarUrl: finalAvatarUrl || undefined,
        joinedAt,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
        headers["apikey"] = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: {
          fullName?: string;
          email?: string;
          employeeId?: string;
          roleName?: string;
          departmentName?: string;
          temporaryPassword?: string;
        };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create user account.");
      }

      const createdUser = data.user;
      setCreateSuccess({
        fullName: createdUser?.fullName ?? fullName,
        email: createdUser?.email ?? email,
        employeeId: createdUser?.employeeId ?? employeeId,
        roleName: createdUser?.roleName ?? roleCode,
        departmentName: createdUser?.departmentName ?? (departments.find((d) => d.id === departmentId)?.name || "N/A"),
        temporaryPassword: createdUser?.temporaryPassword,
      });

      setCreateModalOpen(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      setAvatarPreviewUrl(null);
      setRefreshNonce((value) => value + 1);
    } catch (submitErr) {
      const msg = submitErr instanceof Error ? submitErr.message : "Unable to create user account.";
      setCreateError(msg);
      if (import.meta.env.DEV) {
        console.error("User creation error", submitErr);
      }
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Open Edit Modal
  function openEditModal(user: ProfileRow) {
    setEditForm({
      id: user.id,
      fullName: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      roleId: user.role_id,
      roleCode: user.role?.code ?? "CITIZEN",
      departmentId: user.department_id || "",
      employeeId: user.employee_id || "",
      designation: user.designation || "",
      avatarUrl: user.avatar_url || "",
      avatarFile: null,
      isActive: user.is_active,
    });
    setEditAvatarPreviewUrl(user.avatar_url || null);
    setEditError(null);
    setEditModalOpen(true);
  }

  async function submitEditUser(event: FormEvent) {
    event.preventDefault();
    if (!editForm) return;

    const fullName = editForm.fullName.trim();
    const phone = editForm.phone.trim();
    const designation = editForm.designation.trim();
    const employeeId = editForm.employeeId.trim();
    const departmentId = editForm.departmentId.trim() || null;
    const roleId = editForm.roleId;

    if (!fullName) {
      setEditError("Full name is required.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      let finalAvatarUrl = editForm.avatarUrl;
      if (editForm.avatarFile) {
        const uploaded = await uploadAvatarToStorage(editForm.avatarFile, editForm.id);
        if (uploaded) {
          finalAvatarUrl = uploaded;
        }
      }

      const updatePayload = {
        full_name: fullName,
        phone: phone || null,
        designation: designation || null,
        employee_id: employeeId || null,
        department_id: departmentId,
        role_id: roleId,
        is_active: editForm.isActive,
        avatar_url: finalAvatarUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase.from("profiles").update(updatePayload).eq("id", editForm.id);

      if (updateErr) {
        throw updateErr;
      }

      setEditModalOpen(false);
      setEditForm(null);
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save user profile changes.";
      setEditError(msg);
      if (import.meta.env.DEV) {
        console.error("Profile update error", err);
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  // Deactivate / Reactivate User
  async function confirmToggleUserStatus() {
    if (!deactivateTarget) return;

    setDeactivateSubmitting(true);
    try {
      const nextStatus = !deactivateTarget.is_active;
      const { error: toggleErr } = await supabase
        .from("profiles")
        .update({
          is_active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deactivateTarget.id);

      if (toggleErr) throw toggleErr;

      setDeactivateTarget(null);
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      console.error("Status toggle error", err);
    } finally {
      setDeactivateSubmitting(false);
    }
  }

  // Permanent Delete User
  async function confirmDeleteUser() {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
        headers["apikey"] = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers,
        body: JSON.stringify({ profileId: deleteTarget.id }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; success?: boolean };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete user.");
      }

      setDeleteTarget(null);
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to delete user. The user may have associated historical issues or assignments. Consider deactivating instead.";
      setDeleteError(msg);
      if (import.meta.env.DEV) {
        console.error("Delete user error", err);
      }
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const hasActiveFilters = search.trim().length > 0 || roleFilter !== "all" || departmentFilter !== "all" || statusFilter !== "all";

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
        <div className="h-40 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
      </div>
    );
  }

  const citizenCount = users.filter((u) => u.role?.code === "CITIZEN").length;
  const officerCount = users.filter((u) => u.role?.code === "MUNICIPAL_OFFICER").length;
  const managerCount = users.filter((u) => u.role?.code === "DEPARTMENT_MANAGER").length;
  const workerCount = users.filter((u) => u.role?.code === "FIELD_WORKER").length;
  const adminCount = users.filter((u) => u.role?.code === "ADMIN").length;

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="User Administration"
        title="CivicFix User Directory"
        description="Manage municipal officers, department managers, field workers, citizens, and system administrators."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openCreateModal} size="default" type="button" className="shadow-sm">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add a User
            </Button>
            <Button onClick={() => setRefreshNonce((value) => value + 1)} size="sm" type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* 2. Top Summary Metric Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total Accounts", value: users.length, icon: UsersRound, tone: "info" as const, desc: "Synced profiles" },
          { label: "Citizens", value: citizenCount, icon: UsersRound, tone: "info" as const, desc: "Registered residents" },
          { label: "Officers", value: officerCount, icon: Building2, tone: "warning" as const, desc: "Triage & verification" },
          { label: "Dept Managers", value: managerCount, icon: ShieldCheck, tone: "warning" as const, desc: "Operations leads" },
          { label: "Field Workers", value: workerCount, icon: RefreshCw, tone: "danger" as const, desc: "Field technician fleet" },
          { label: "Admins", value: adminCount, icon: ShieldAlert, tone: "danger" as const, desc: "System controllers" },
        ].map(({ label, value, icon: Icon, tone, desc }) => (
          <div
            key={label}
            className={`flex flex-col justify-between h-28 rounded-2xl border p-4 shadow-sm ${
              tone === "warning"
                ? "border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-surface to-orange-50/40"
                : tone === "danger"
                  ? "border-rose-200/80 bg-gradient-to-br from-rose-50/70 via-surface to-pink-50/40"
                  : "border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-surface to-teal-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</span>
              <div
                className={`p-1.5 rounded-lg ${
                  tone === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : tone === "danger"
                      ? "bg-rose-100 text-rose-700"
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

      {/* 3. Feedback Banner: Successful User Addition with One-Time Credentials */}
      {createSuccess && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 text-emerald-950 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3 w-full">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-bold text-base text-emerald-900">User Added Successfully</p>
                <p className="text-xs text-emerald-800">
                  Real authentication account created and linked to the CivicFix directory.
                </p>
              </div>

              {/* Credentials Summary Box */}
              <div className="grid gap-2.5 rounded-xl border border-emerald-300 bg-white/90 p-4 text-xs shadow-xs sm:grid-cols-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Name</span>
                  <p className="font-bold text-foreground text-sm">{createSuccess.fullName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Username / Employee ID</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded-md">
                      {createSuccess.employeeId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createSuccess.employeeId, "copy-empid")}
                      className="text-teal-700 hover:text-teal-900"
                      title="Copy Employee ID"
                    >
                      {copiedId === "copy-empid" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Role</span>
                  <p className="font-semibold text-foreground">{createSuccess.roleName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Department</span>
                  <p className="font-semibold text-foreground">{createSuccess.departmentName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Login Email</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-foreground truncate">{createSuccess.email}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createSuccess.email, "copy-email")}
                      className="text-muted-foreground hover:text-foreground"
                      title="Copy Email"
                    >
                      {copiedId === "copy-email" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {createSuccess.temporaryPassword && (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">
                      Temporary Password (Shown Once)
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md text-xs">
                        {createSuccess.temporaryPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createSuccess?.temporaryPassword ?? "", "copy-pwd")}
                        className="text-amber-800 hover:text-amber-950"
                        title="Copy Password"
                      >
                        {copiedId === "copy-pwd" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Warning Notice */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  This temporary password is shown once. Store it securely and give it directly to the staff member so they can log in at <span className="font-mono font-semibold">/login</span>.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 w-full pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(createSuccess.employeeId, "copy-empid-btn")}
              className="bg-white text-xs"
            >
              {copiedId === "copy-empid-btn" ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Username Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy Username
                </>
              )}
            </Button>
            {createSuccess.temporaryPassword && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(createSuccess.temporaryPassword!, "copy-pwd-btn")}
                className="bg-white text-xs border-amber-300 text-amber-950 hover:bg-amber-50"
              >
                {copiedId === "copy-pwd-btn" ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Password Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1 text-amber-700" />
                    Copy Password
                  </>
                )}
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateSuccess(null)} className="text-xs">
              Done
            </Button>
          </div>
        </div>
      )}

      {/* 4. Filter and Search Controls */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm">
        <CardContent className="p-3.5">
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full h-10 rounded-xl border border-border/80 bg-background pl-10 pr-4 text-xs sm:text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, employee ID, email, designation, role, or department..."
                value={search}
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">
              <select
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setRoleFilter(event.target.value as RoleFilter);
                  setPage(1);
                }}
                value={roleFilter}
              >
                <option value="all">All Roles</option>
                <option value="CITIZEN">Citizen</option>
                <option value="MUNICIPAL_OFFICER">Municipal Officer</option>
                <option value="DEPARTMENT_MANAGER">Department Manager</option>
                <option value="FIELD_WORKER">Field Worker</option>
                <option value="ADMIN">Admin</option>
              </select>

              <select
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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

              <select
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(1);
                }}
                value={statusFilter}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive / Deactivated</option>
              </select>

              {hasActiveFilters && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                    setDepartmentFilter("all");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground"
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
                    setStatusFilter("all");
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
        description="Filter user list by operational role, department, and account status"
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
              <option value="DEPARTMENT_MANAGER">Department Manager</option>
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Account Status
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
              value={statusFilter}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Deactivated</option>
            </select>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border/60">
            <Button
              className="flex-1"
              onClick={() => {
                setRoleFilter("all");
                setDepartmentFilter("all");
                setStatusFilter("all");
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

      {/* 6. User Directory Table / Cards */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">User Directory</CardTitle>
              <p className="text-xs text-muted-foreground">Platform accounts synced with Clerk & Supabase</p>
            </div>
            <Badge variant="outline" size="sm">
              {filteredUsers.length} {filteredUsers.length === 1 ? "account" : "accounts"}
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
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {visibleUsers.map((user) => {
                      const isSelf = user.id === profile?.id;
                      const roleTone = getAdminRoleTone(user.role?.code ?? "CITIZEN");

                      return (
                        <tr key={user.id} className={`hover:bg-muted/20 transition ${!user.is_active ? "opacity-60 bg-muted/10" : ""}`}>
                          {/* User Avatar + Name + Designation */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.full_name || "Avatar"}
                                  className="h-10 w-10 rounded-xl object-cover border border-border shadow-xs"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 via-sky-100 to-emerald-100 text-xs font-bold text-teal-900 border border-teal-200">
                                  {getAdminInitials(user.full_name || user.email || "User")}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                                  {user.full_name || "Unnamed User"}
                                  {isSelf && (
                                    <span className="rounded-md bg-teal-100 px-1.5 py-0.2 text-[10px] font-bold text-teal-800">
                                      You
                                    </span>
                                  )}
                                </p>
                                {user.designation ? (
                                  <p className="text-xs font-medium text-teal-700 truncate">{user.designation}</p>
                                ) : (
                                  <p className="text-xs text-muted-foreground truncate">{user.email || "No email"}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="px-4 py-3.5">
                            {user.employee_id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800">
                                  {user.employee_id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(user.employee_id!, user.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Copy Employee ID"
                                >
                                  {copiedId === user.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </td>

                          {/* Role Badge */}
                          <td className="px-4 py-3.5">
                            <Badge variant={roleTone} size="sm">
                              {user.role?.name ?? "Citizen"}
                            </Badge>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3.5">
                            {user.department ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 border border-sky-200/80">
                                  <Building2 className="mr-1 h-3 w-3" />
                                  {user.department.name}
                                </span>
                                {user.activeAssignmentsCount > 0 && (
                                  <p className="text-[10px] text-amber-700 font-semibold">
                                    {user.activeAssignmentsCount} active {user.activeAssignmentsCount === 1 ? "task" : "tasks"}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">None (Cross-Dept)</span>
                            )}
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-3.5 text-xs">
                            <p className="text-muted-foreground truncate">{user.email || "—"}</p>
                            {user.phone && <p className="text-slate-600 font-medium truncate mt-0.5">{user.phone}</p>}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            {user.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Deactivated
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs text-teal-800 hover:text-teal-950 hover:bg-teal-50"
                                onClick={() => setViewingUser(user)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => openEditModal(user)}
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>

                              {!isSelf && (
                                <>
                                  <Button
                                    size="sm"
                                    variant={user.is_active ? "ghost" : "outline"}
                                    className={`h-8 px-2 text-xs ${user.is_active ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"}`}
                                    onClick={() => setDeactivateTarget(user)}
                                    title={user.is_active ? "Deactivate User" : "Activate User"}
                                  >
                                    {user.is_active ? (
                                      <>
                                        <PowerOff className="h-3.5 w-3.5 mr-1" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Power className="h-3.5 w-3.5 mr-1" />
                                        Activate
                                      </>
                                    )}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => {
                                      setDeleteError(null);
                                      setDeleteTarget(user);
                                    }}
                                    title="Delete User"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  </Button>
                                </>
                              )}
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
                    <div key={user.id} className={`rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3 ${!user.is_active ? "opacity-65" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || "Avatar"}
                              className="h-10 w-10 rounded-xl object-cover border border-border shadow-xs"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 via-sky-100 to-emerald-100 text-xs font-bold text-teal-900 border border-teal-200">
                              {getAdminInitials(user.full_name || user.email || "User")}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-foreground text-sm">{user.full_name || "Unnamed User"}</p>
                            {user.designation && <p className="text-xs text-teal-700 font-medium">{user.designation}</p>}
                            <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={roleTone} size="sm">
                            {user.role?.name ?? "Citizen"}
                          </Badge>
                          {user.is_active ? (
                            <span className="text-[10px] text-emerald-700 font-semibold">Active</span>
                          ) : (
                            <span className="text-[10px] text-rose-700 font-semibold">Deactivated</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground">Employee ID</span>
                          <p className="font-mono font-medium text-foreground">{user.employee_id || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground">Department</span>
                          <p className="font-medium text-foreground">{user.department?.name || "Unassigned"}</p>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-xs text-teal-800" onClick={() => setViewingUser(user)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => openEditModal(user)}>
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        {!isSelf && (
                          <>
                            <Button
                              size="sm"
                              variant={user.is_active ? "ghost" : "outline"}
                              className={`text-xs ${user.is_active ? "text-rose-600" : "text-emerald-700"}`}
                              onClick={() => setDeactivateTarget(user)}
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-rose-600"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(user);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
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
                        setStatusFilter("all");
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
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} accounts
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

      {/* 8. Add User Modal Dialog */}
      <Dialog
        description="Creates official Clerk authentication identity and linked Supabase profile with role and department locking"
        onClose={closeCreateModal}
        open={createModalOpen}
        title="Add a User"
      >
        <div className="space-y-4">
          {/* Step Progress Indicators */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            {[
              { num: 1 as const, label: "Personal" },
              { num: 2 as const, label: "Employment" },
              { num: 3 as const, label: "Identifier" },
              { num: 4 as const, label: "Review & Submit" },
            ].map((step) => (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (createStep > step.num) setCreateStep(step.num);
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  createStep === step.num
                    ? "text-primary"
                    : createStep > step.num
                      ? "text-emerald-700 hover:underline"
                      : "text-muted-foreground opacity-60"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    createStep === step.num
                      ? "bg-primary text-primary-foreground"
                      : createStep > step.num
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {createStep > step.num ? "✓" : step.num}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            ))}
          </div>

          {createError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p>{createError}</p>
            </div>
          )}

          {/* STEP 1: Personal Details & Avatar */}
          {createStep === 1 && (
            <div className="space-y-4">
              {/* Profile Photo Uploader */}
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-border/70 bg-muted/20">
                <div className="relative group">
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="Preview"
                      className="h-16 w-16 rounded-2xl object-cover border-2 border-primary/40 shadow-sm"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-background text-muted-foreground">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Profile Photo</p>
                  <p className="text-[11px] text-muted-foreground">PNG, JPG, or WebP up to 5 MB</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {avatarPreviewUrl ? "Change Photo" : "Upload Photo"}
                    </Button>
                    {avatarPreviewUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-rose-600 hover:text-rose-700"
                        onClick={() => {
                          setAvatarPreviewUrl(null);
                          setCreateForm((p) => ({ ...p, avatarFile: null }));
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => setCreateForm((v) => ({ ...v, fullName: e.target.value }))}
                  placeholder="e.g. Rajesh Kumar"
                  required
                  value={createForm.fullName}
                />
              </div>

              {/* Official Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Official Email Address <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoComplete="email"
                    className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    onChange={(e) => setCreateForm((v) => ({ ...v, email: e.target.value }))}
                    placeholder="e.g. rajesh.kumar@civicfix.gov"
                    required
                    type="email"
                    value={createForm.email}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    onChange={(e) => setCreateForm((v) => ({ ...v, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    type="tel"
                    value={createForm.phone}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/60">
                <Button
                  type="button"
                  disabled={!createForm.fullName.trim() || !createForm.email.trim()}
                  onClick={() => setCreateStep(2)}
                >
                  Next: Employment Details →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Role, Department, Designation & Joining Date */}
          {createStep === 2 && (
            <div className="space-y-4">
              {/* Role Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Staff Role <span className="text-destructive">*</span>
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { code: "FIELD_WORKER" as const, name: "Field Worker", desc: "Executes repairs & evidence" },
                    { code: "DEPARTMENT_MANAGER" as const, name: "Dept Manager", desc: "Manages department crew" },
                    { code: "MUNICIPAL_OFFICER" as const, name: "Municipal Officer", desc: "Triage & routes issues" },
                  ].map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => handleRoleOrDeptChange(r.code, createForm.departmentId)}
                      className={`p-3 rounded-xl border text-left transition ${
                        createForm.roleCode === r.code
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/80 hover:bg-muted/20"
                      }`}
                    >
                      <p className="text-xs font-bold text-foreground">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Picker (Strictly mandatory for Department Manager and Field Worker) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Assigned Municipal Department{" "}
                  {createForm.roleCode !== "MUNICIPAL_OFFICER" ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-muted-foreground font-normal">(Optional for Officer)</span>
                  )}
                </label>
                <select
                  className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => handleRoleOrDeptChange(createForm.roleCode, e.target.value)}
                  required={createForm.roleCode !== "MUNICIPAL_OFFICER"}
                  value={createForm.departmentId}
                >
                  <option value="">Select Department...</option>
                  {departments
                    .filter((d) => d.is_active)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {createForm.roleCode === "FIELD_WORKER" || createForm.roleCode === "DEPARTMENT_MANAGER"
                    ? "Department Manager and Field Worker roles are strictly locked to their assigned department."
                    : "Municipal Officers can oversee multiple departments or specialize in one."}
                </p>
              </div>

              {/* Designation / Job Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Designation / Official Title
                </label>
                <input
                  className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => setCreateForm((v) => ({ ...v, designation: e.target.value }))}
                  placeholder={
                    createForm.roleCode === "FIELD_WORKER"
                      ? "e.g. Senior Asphalt Specialist, Line Inspector"
                      : createForm.roleCode === "DEPARTMENT_MANAGER"
                        ? "e.g. Road Works Lead Supervisor"
                        : "e.g. Senior Municipal Triage Officer"
                  }
                  value={createForm.designation}
                />
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Joining Date
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none focus:border-primary/50"
                    onChange={(e) => setCreateForm((v) => ({ ...v, joinedAt: e.target.value }))}
                    type="date"
                    value={createForm.joinedAt}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setCreateStep(1)}>
                  ← Back
                </Button>
                <Button
                  type="button"
                  disabled={
                    (createForm.roleCode === "DEPARTMENT_MANAGER" || createForm.roleCode === "FIELD_WORKER") &&
                    !createForm.departmentId
                  }
                  onClick={() => setCreateStep(3)}
                >
                  Next: Identifier →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Identifier Badge & Security Info */}
          {createStep === 3 && (
            <div className="space-y-4">
              {/* Employee ID / Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Staff Username / Employee Identifier
                </label>
                <input
                  className="w-full font-mono rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => setCreateForm((v) => ({ ...v, employeeId: e.target.value.toLowerCase() }))}
                  placeholder="e.g. road-worker-001"
                  value={createForm.employeeId}
                />
                <p className="text-[11px] text-muted-foreground">
                  The backend automatically assigns and guarantees the next sequential canonical username upon creation.
                </p>
              </div>

              {/* Temporary Password Security Info */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                  <KeyRound className="h-4 w-4 text-emerald-700" />
                  <span>Server-Generated Cryptographic Temporary Password</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  A strong 16-character temporary password will be cryptographically generated on the backend and registered in Clerk. It will be shown to you <strong>once</strong> upon submission so you can give it directly to the employee.
                </p>
              </div>

              <div className="flex justify-between pt-2 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setCreateStep(2)}>
                  ← Back
                </Button>
                <Button type="button" onClick={() => setCreateStep(4)}>
                  Next: Review & Confirm →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Summary Review & Submit */}
          {createStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User Summary</p>
                <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                  {avatarPreviewUrl ? (
                    <img src={avatarPreviewUrl} alt="Avatar" className="h-12 w-12 rounded-xl object-cover border" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-900 font-bold">
                      {getAdminInitials(createForm.fullName)}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-base text-foreground">{createForm.fullName}</p>
                    <p className="text-xs text-muted-foreground">{createForm.designation || "Municipal Staff"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Employee ID</span>
                    <p className="font-mono font-bold text-foreground">{createForm.employeeId || "Auto-assigned"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role</span>
                    <p className="font-bold text-foreground">
                      {managedRoleOptions.find((r) => r.code === createForm.roleCode)?.name ?? createForm.roleCode}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department</span>
                    <p className="font-bold text-foreground">{selectedCreateDepartmentName || "Cross-Departmental"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Official Email</span>
                    <p className="font-mono text-foreground truncate">{createForm.email}</p>
                  </div>
                  {createForm.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone</span>
                      <p className="font-medium text-foreground">{createForm.phone}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Joining Date</span>
                    <p className="font-medium text-foreground">{createForm.joinedAt}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-border/60">
                <Button disabled={createSubmitting} type="button" variant="outline" onClick={() => setCreateStep(3)}>
                  ← Back
                </Button>
                <Button disabled={createSubmitting} type="button" onClick={() => void submitCreateUser()}>
                  {createSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating User...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Add User
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* 9. Edit User Modal Dialog */}
      {editForm && (
        <Dialog
          description="Update user details, department assignment, and active account status"
          onClose={() => {
            if (!editSubmitting) setEditModalOpen(false);
          }}
          open={editModalOpen}
          title="Edit User Account"
        >
          {editError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p>{editError}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={(e) => void submitEditUser(e)}>
            {/* Avatar Photo Edit */}
            <div className="flex items-center gap-4 p-3 rounded-2xl border border-border/70 bg-muted/20">
              {editAvatarPreviewUrl ? (
                <img
                  src={editAvatarPreviewUrl}
                  alt="Avatar"
                  className="h-14 w-14 rounded-2xl object-cover border-2 border-primary/40 shadow-sm"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-900 font-bold">
                  {getAdminInitials(editForm.fullName)}
                </div>
              )}
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleEditAvatarFileSelect}
              />
              <div>
                <p className="text-xs font-bold text-foreground">Profile Photo</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs mt-1"
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Change Photo
                </Button>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                value={editForm.fullName}
                onChange={(e) => setEditForm((p) => (p ? { ...p, fullName: e.target.value } : null))}
                required
              />
            </div>

            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Employee ID
              </label>
              <input
                className="w-full font-mono uppercase rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                value={editForm.employeeId}
                onChange={(e) => setEditForm((p) => (p ? { ...p, employeeId: e.target.value.toUpperCase() } : null))}
                placeholder="e.g. CIV-RD-001"
              />
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Designation
              </label>
              <input
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                value={editForm.designation}
                onChange={(e) => setEditForm((p) => (p ? { ...p, designation: e.target.value } : null))}
                placeholder="e.g. Senior Asphalt Specialist"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Phone Number
              </label>
              <input
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => (p ? { ...p, phone: e.target.value } : null))}
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Department
              </label>
              <select
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                value={editForm.departmentId}
                onChange={(e) => setEditForm((p) => (p ? { ...p, departmentId: e.target.value } : null))}
              >
                <option value="">Unassigned / Cross-Department</option>
                {departments
                  .filter((d) => d.is_active)
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Role</label>
              <select
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                value={editForm.roleId}
                onChange={(e) => setEditForm((p) => (p ? { ...p, roleId: e.target.value } : null))}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Status Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
              <div>
                <p className="text-xs font-bold text-foreground">Account Status</p>
                <p className="text-[11px] text-muted-foreground">Deactivated users cannot log in or take assignments</p>
              </div>
              <button
                type="button"
                onClick={() => setEditForm((p) => (p ? { ...p, isActive: !p.isActive } : null))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  editForm.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}
              >
                {editForm.isActive ? "Active" : "Deactivated"}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                disabled={editSubmitting}
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* 10. Deactivate / Activate Confirmation Dialog */}
      {deactivateTarget && (
        <Dialog
          description={`Are you sure you want to ${deactivateTarget.is_active ? "deactivate" : "activate"} ${deactivateTarget.full_name || deactivateTarget.email}?`}
          onClose={() => {
            if (!deactivateSubmitting) setDeactivateTarget(null);
          }}
          open={Boolean(deactivateTarget)}
          title={deactivateTarget.is_active ? "Deactivate User Account" : "Reactivate User Account"}
        >
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <p>
                {deactivateTarget.is_active
                  ? "Deactivating this user account will revoke application access immediately. Historical activity records, resolution history, and issues will remain preserved."
                  : "Reactivating this user account will restore their operational permissions and allow immediate login."}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={deactivateSubmitting}
                onClick={() => setDeactivateTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={deactivateTarget.is_active ? "destructive" : "default"}
                disabled={deactivateSubmitting}
                onClick={() => void confirmToggleUserStatus()}
              >
                {deactivateSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : deactivateTarget.is_active ? (
                  "Confirm Deactivation"
                ) : (
                  "Confirm Activation"
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* 11. Delete User Permanent Confirmation Dialog */}
      {deleteTarget && (
        <Dialog
          description={`Permanently remove user record for ${deleteTarget.full_name || deleteTarget.email}?`}
          onClose={() => {
            if (!deleteSubmitting) setDeleteTarget(null);
          }}
          open={Boolean(deleteTarget)}
          title="Delete User Account"
        >
          <div className="space-y-4 py-2">
            {deleteError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p>{deleteError}</p>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Permanent Record Deletion</p>
                <p className="mt-1">
                  This permanently removes the user's profile and Clerk authentication identity. If the user has historical issue records, deletion will be blocked by database foreign key constraints to preserve civic records. In that case, use <strong>Deactivate</strong> instead.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleteSubmitting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteSubmitting}
                onClick={() => void confirmDeleteUser()}
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Permanently Delete"
                )}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* 8. User Details Drawer / Modal */}
      {viewingUser && (
        <Dialog
          className="max-w-2xl w-full"
          onClose={() => setViewingUser(null)}
          open={Boolean(viewingUser)}
          title={`Staff Profile: ${viewingUser.full_name || viewingUser.email}`}
        >
          <div className="space-y-5 py-2 text-xs sm:text-sm">
            {/* Header / Avatar Row */}
            <div className="flex items-center gap-4 rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/50 p-4">
              {viewingUser.avatar_url ? (
                <img
                  src={viewingUser.avatar_url}
                  alt={viewingUser.full_name || "Avatar"}
                  className="h-16 w-16 rounded-2xl object-cover border border-teal-300 shadow-sm"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-900 font-bold text-xl border border-teal-300">
                  {getAdminInitials(viewingUser.full_name || viewingUser.email || "Staff")}
                </div>
              )}

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-foreground truncate">{viewingUser.full_name || "Unnamed"}</h3>
                  <Badge variant={getAdminRoleTone(viewingUser.role?.code ?? "CITIZEN")} size="sm">
                    {viewingUser.role?.name ?? "Staff"}
                  </Badge>
                  <Badge variant={viewingUser.is_active ? "success" : "outline"} size="sm">
                    {viewingUser.is_active ? "Active Account" : "Deactivated"}
                  </Badge>
                </div>
                {viewingUser.designation && (
                  <p className="font-semibold text-teal-800">{viewingUser.designation}</p>
                )}
                <p className="text-xs text-muted-foreground">{viewingUser.email}</p>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-border/80 bg-surface/90 p-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Employee ID / Canonical Username</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-mono font-bold text-foreground text-xs bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                    {viewingUser.employee_id || "—"}
                  </span>
                  {viewingUser.employee_id && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(viewingUser.employee_id!, "view-emp-id")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === "view-emp-id" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Department</span>
                <p className="font-semibold text-foreground mt-1 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-sky-700" />
                  {viewingUser.department?.name || "None (Cross-Department)"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Contact Phone</span>
                <p className="font-medium text-foreground mt-1 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {viewingUser.phone || "No phone provided"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Active Assignments</span>
                <p className="font-bold text-foreground mt-1">
                  {viewingUser.activeAssignmentsCount} tasks currently assigned
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Joined Date</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {viewingUser.joined_at ? new Date(viewingUser.joined_at).toLocaleDateString() : "—"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Clerk Identity Ref</span>
                <p className="font-mono text-[11px] text-muted-foreground mt-1 truncate" title={viewingUser.clerk_user_id || undefined}>
                  {viewingUser.clerk_user_id || "—"}
                </p>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const userToEdit = viewingUser;
                  setViewingUser(null);
                  openEditModal(userToEdit);
                }}
              >
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Edit Profile
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setViewingUser(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
