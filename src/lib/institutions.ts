import { supabase } from "@/lib/supabase";
import type {
  InstitutionRow,
  InstitutionInsert,
  InstitutionUpdate,
  InstitutionProjectRow,
  InstitutionProjectInsert,
  InstitutionMemberRow,
  InstitutionVerificationStatus,
} from "@/types/database";

export interface InstitutionFilterParams {
  search?: string;
  type?: string;
  state?: string;
  domain?: string;
  technology?: string;
  verificationStatus?: InstitutionVerificationStatus | "ALL";
  activeOnly?: boolean;
}

export interface InstitutionStats {
  total: number;
  verified: number;
  pending: number;
  iits: number;
  nits: number;
  researchLabs: number;
  universities: number;
  agriculture: number;
}

export async function fetchInstitutions(filters?: InstitutionFilterParams): Promise<InstitutionRow[]> {
  let query = supabase
    .from("institutions")
    .select("*")
    .order("name", { ascending: true });

  if (filters?.verificationStatus && filters.verificationStatus !== "ALL") {
    query = query.eq("verification_status", filters.verificationStatus);
  }

  if (filters?.activeOnly) {
    query = query.eq("is_active", true);
  }

  if (filters?.type && filters.type !== "ALL") {
    query = query.eq("institution_type", filters.type);
  }

  if (filters?.state && filters.state !== "ALL") {
    query = query.eq("state", filters.state);
  }

  if (filters?.domain) {
    query = query.contains("research_domains", [filters.domain]);
  }

  if (filters?.technology) {
    query = query.contains("technologies", [filters.technology]);
  }

  if (filters?.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(
      `name.ilike.%${term}%,official_name.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%,acronym.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchInstitutions error:", error);
    throw error;
  }

  return data ?? [];
}

export async function fetchInstitutionById(id: string): Promise<InstitutionRow | null> {
  const { data, error } = await supabase
    .from("institutions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("fetchInstitutionById error:", error);
    throw error;
  }

  return data;
}

export async function fetchInstitutionStats(): Promise<InstitutionStats> {
  const { data, error } = await supabase
    .from("institutions")
    .select("id, institution_type, verification_status, is_active");

  if (error) {
    console.error("fetchInstitutionStats error:", error);
    return {
      total: 0,
      verified: 0,
      pending: 0,
      iits: 0,
      nits: 0,
      researchLabs: 0,
      universities: 0,
      agriculture: 0,
    };
  }

  const list = data ?? [];
  return {
    total: list.length,
    verified: list.filter((i) => i.verification_status === "VERIFIED").length,
    pending: list.filter((i) => i.verification_status === "PENDING_VERIFICATION").length,
    iits: list.filter((i) => i.institution_type === "IIT").length,
    nits: list.filter((i) => i.institution_type === "NIT").length,
    researchLabs: list.filter(
      (i) => i.institution_type === "Government Research Organization" || i.institution_type === "Research Institute"
    ).length,
    universities: list.filter(
      (i) => i.institution_type === "Central University" || i.institution_type === "State University" || i.institution_type === "University"
    ).length,
    agriculture: list.filter((i) => i.institution_type === "Agricultural University").length,
  };
}

export async function fetchInstitutionProjects(institutionId: string): Promise<InstitutionProjectRow[]> {
  const { data, error } = await supabase
    .from("institution_projects")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchInstitutionProjects error:", error);
    throw error;
  }

  return data ?? [];
}

export interface InstitutionMemberWithProfile extends InstitutionMemberRow {
  profile?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    designation: string | null;
    is_active: boolean;
  } | null;
}

export async function fetchInstitutionMembers(institutionId: string): Promise<InstitutionMemberWithProfile[]> {
  const { data, error } = await supabase
    .from("institution_members")
    .select(`
      id,
      institution_id,
      profile_id,
      role_title,
      is_primary_contact,
      created_at,
      updated_at,
      profile:profiles!institution_members_profile_id_fkey(
        id,
        full_name,
        email,
        phone,
        designation,
        is_active
      )
    `)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchInstitutionMembers error:", error);
    throw error;
  }

  return data ?? [];
}

export async function createInstitution(payload: InstitutionInsert): Promise<InstitutionRow> {
  const { data, error } = await supabase
    .from("institutions")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("createInstitution error:", error);
    throw error;
  }

  return data;
}

export async function updateInstitution(id: string, payload: InstitutionUpdate): Promise<InstitutionRow> {
  const { data, error } = await supabase
    .from("institutions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("updateInstitution error:", error);
    throw error;
  }

  return data;
}

export async function createInstitutionProject(payload: InstitutionProjectInsert): Promise<InstitutionProjectRow> {
  const { data, error } = await supabase
    .from("institution_projects")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("createInstitutionProject error:", error);
    throw error;
  }

  return data;
}

export async function deleteInstitutionProject(id: string): Promise<void> {
  const { error } = await supabase
    .from("institution_projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteInstitutionProject error:", error);
    throw error;
  }
}

export interface ProvisionCoordinatorParams {
  institutionId: string;
  fullName: string;
  email: string;
  phone?: string;
  roleTitle?: string;
  isPrimaryContact?: boolean;
}

export interface ProvisionCoordinatorResult {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    employeeId: string;
    username: string;
    designation: string | null;
    roleCode: string;
    roleName: string;
    institutionId: string;
    institutionName: string;
    isActive: boolean;
    temporaryPassword?: string;
  };
}

export async function provisionInstitutionCoordinator(
  params: ProvisionCoordinatorParams
): Promise<ProvisionCoordinatorResult> {
  const response = await supabase.functions.invoke<ProvisionCoordinatorResult & { error?: string }>("admin-create-user", {
    body: {
      roleCode: "INSTITUTION",
      institutionId: params.institutionId,
      fullName: params.fullName,
      email: params.email,
      phone: params.phone || undefined,
      roleTitle: params.roleTitle || "Institution Coordinator",
      isPrimaryContact: params.isPrimaryContact ?? true,
    },
  });

  if (response.error) {
    const errorMsg = response.error instanceof Error ? response.error.message : "Failed to provision coordinator account";
    throw new Error(errorMsg);
  }

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  if (!response.data) {
    throw new Error("No data returned from provisioning service");
  }

  return response.data;
}

export function getVerificationStatusBadge(status: InstitutionVerificationStatus) {
  switch (status) {
    case "VERIFIED":
      return { label: "Verified", tone: "success" as const, bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "PENDING_VERIFICATION":
      return { label: "Pending Verification", tone: "warning" as const, bg: "bg-amber-50 text-amber-700 border-amber-200" };
    case "DRAFT":
      return { label: "Draft", tone: "info" as const, bg: "bg-slate-50 text-slate-700 border-slate-200" };
    case "SUSPENDED":
      return { label: "Suspended", tone: "danger" as const, bg: "bg-red-50 text-red-700 border-red-200" };
    case "ARCHIVED":
      return { label: "Archived", tone: "default" as const, bg: "bg-zinc-100 text-zinc-600 border-zinc-200" };
    default:
      return { label: status, tone: "default" as const, bg: "bg-zinc-100 text-zinc-600 border-zinc-200" };
  }
}
