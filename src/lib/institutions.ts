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
      return { label: "Verified", tone: "success" as const, bg: "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" };
    case "PENDING_VERIFICATION":
      return { label: "Pending Verification", tone: "warning" as const, bg: "bg-amber-100 text-amber-950 border-amber-300 font-bold" };
    case "DRAFT":
      return { label: "Draft", tone: "info" as const, bg: "bg-slate-100 text-slate-800 border-slate-300 font-bold" };
    case "SUSPENDED":
      return { label: "Suspended", tone: "danger" as const, bg: "bg-rose-100 text-rose-950 border-rose-300 font-bold" };
    case "ARCHIVED":
      return { label: "Archived", tone: "default" as const, bg: "bg-zinc-200 text-zinc-800 border-zinc-300 font-bold" };
    default:
      return { label: status, tone: "default" as const, bg: "bg-zinc-200 text-zinc-800 border-zinc-300 font-bold" };
  }
}

export interface InstitutionCivicFixEngagement {
  challengeId: string;
  challengeTitle: string;
  issueId?: string;
  selectionSource?: string;
  invitationStatus?: string;
  invitationSentAt?: string;
  hasProject: boolean;
  projectId?: string;
  projectTitle?: string;
  projectStatus?: string;
  proposalsCount: number;
  latestProposalStatus?: string;
  latestProposalVersion?: number;
}

export interface InstitutionWithEngagement extends InstitutionRow {
  selectedChallengesCount: number;
  invitationsCount: number;
  activeProjectsCount: number;
  proposalsCount: number;
  approvedProposalsCount: number;
  engagements?: InstitutionCivicFixEngagement[];
}

export async function fetchInstitutionsWithEngagements(
  filters?: InstitutionFilterParams & { engagedOnly?: boolean }
): Promise<InstitutionWithEngagement[]> {
  const [institutions, selectionsRes, invitationsRes, projectsRes, proposalsRes] = await Promise.all([
    fetchInstitutions(filters),
    supabase.from("challenge_institution_selections").select("institution_id, challenge_id, is_manual_override, status"),
    supabase.from("institution_invitations").select("institution_id, challenge_id, status, invited_at"),
    supabase.from("challenge_projects").select("institution_id, challenge_id, id, status, project_title"),
    supabase.from("research_proposals").select("institution_id, challenge_id, id, status, version_number, is_current"),
  ]);

  const selections = selectionsRes.data ?? [];
  const invitations = invitationsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const proposals = proposalsRes.data ?? [];

  // Group by institution_id
  const selectionsByInst = new Map<string, number>();
  selections.forEach((s) => {
    selectionsByInst.set(s.institution_id, (selectionsByInst.get(s.institution_id) || 0) + 1);
  });

  const invitationsByInst = new Map<string, number>();
  invitations.forEach((inv) => {
    invitationsByInst.set(inv.institution_id, (invitationsByInst.get(inv.institution_id) || 0) + 1);
  });

  const projectsByInst = new Map<string, number>();
  projects.forEach((p) => {
    if (p.status !== "ARCHIVED") {
      projectsByInst.set(p.institution_id, (projectsByInst.get(p.institution_id) || 0) + 1);
    }
  });

  const proposalsByInst = new Map<string, { total: number; approved: number }>();
  proposals.forEach((prop) => {
    const prev = proposalsByInst.get(prop.institution_id) || { total: 0, approved: 0 };
    prev.total += 1;
    if (prop.status === "APPROVED") {
      prev.approved += 1;
    }
    proposalsByInst.set(prop.institution_id, prev);
  });

  let enriched: InstitutionWithEngagement[] = institutions.map((inst) => {
    const propStats = proposalsByInst.get(inst.id) || { total: 0, approved: 0 };
    return {
      ...inst,
      selectedChallengesCount: selectionsByInst.get(inst.id) || 0,
      invitationsCount: invitationsByInst.get(inst.id) || 0,
      activeProjectsCount: projectsByInst.get(inst.id) || 0,
      proposalsCount: propStats.total,
      approvedProposalsCount: propStats.approved,
    };
  });

  if (filters?.engagedOnly) {
    enriched = enriched.filter(
      (i) => i.selectedChallengesCount > 0 || i.invitationsCount > 0 || i.activeProjectsCount > 0 || i.proposalsCount > 0
    );
  }

  return enriched;
}

export interface InstitutionFullProfileData {
  institution: InstitutionRow | null;
  projects: InstitutionProjectRow[];
  members: InstitutionMemberWithProfile[];
  engagements: InstitutionCivicFixEngagement[];
}

export async function fetchInstitutionFullProfile(institutionId: string): Promise<InstitutionFullProfileData> {
  const [
    institution,
    projects,
    members,
    selectionsRes,
    invitationsRes,
    challengeProjectsRes,
    proposalsRes,
    challengesRes,
  ] = await Promise.all([
    fetchInstitutionById(institutionId),
    fetchInstitutionProjects(institutionId),
    fetchInstitutionMembers(institutionId),
    supabase
      .from("challenge_institution_selections")
      .select("challenge_id, is_manual_override, status")
      .eq("institution_id", institutionId),
    supabase
      .from("institution_invitations")
      .select("challenge_id, status, invited_at")
      .eq("institution_id", institutionId),
    supabase
      .from("challenge_projects")
      .select("id, challenge_id, project_title, status")
      .eq("institution_id", institutionId),
    supabase
      .from("research_proposals")
      .select("id, challenge_id, project_id, status, version_number, is_current")
      .eq("institution_id", institutionId),
    supabase
      .from("innovation_challenges")
      .select("id, title, source_issue_id"),
  ]);

  const challengesMap = new Map<string, { title: string; issueId?: string }>();
  (challengesRes.data ?? []).forEach((c) => {
    challengesMap.set(c.id, { title: c.title, issueId: c.source_issue_id ?? undefined });
  });

  // Combine engagements by challenge_id
  const challengeIds = new Set<string>();
  (selectionsRes.data ?? []).forEach((s) => challengeIds.add(s.challenge_id));
  (invitationsRes.data ?? []).forEach((inv) => challengeIds.add(inv.challenge_id));
  (challengeProjectsRes.data ?? []).forEach((p) => challengeIds.add(p.challenge_id));
  (proposalsRes.data ?? []).forEach((pr) => challengeIds.add(pr.challenge_id));

  const selectionsMap = new Map(
    (selectionsRes.data ?? []).map((s) => [s.challenge_id, s.is_manual_override ? "Manual Selection" : "Automated Matching"])
  );
  const invitationsMap = new Map((invitationsRes.data ?? []).map((inv) => [inv.challenge_id, inv]));
  const projectMap = new Map((challengeProjectsRes.data ?? []).map((p) => [p.challenge_id, p]));

  const engagements: InstitutionCivicFixEngagement[] = Array.from(challengeIds).map((cId) => {
    const challengeInfo = challengesMap.get(cId);
    const inv = invitationsMap.get(cId);
    const proj = projectMap.get(cId);
    const propsForChallenge = (proposalsRes.data ?? []).filter((p) => p.challenge_id === cId);
    const latestProp = propsForChallenge.sort((a, b) => (b.version_number || 1) - (a.version_number || 1))[0];

    return {
      challengeId: cId,
      challengeTitle: challengeInfo?.title || "Civic Innovation Challenge",
      issueId: challengeInfo?.issueId,
      selectionSource: selectionsMap.get(cId) || undefined,
      invitationStatus: inv?.status,
      invitationSentAt: inv?.invited_at || undefined,
      hasProject: Boolean(proj),
      projectId: proj?.id,
      projectTitle: proj?.project_title,
      projectStatus: proj?.status,
      proposalsCount: propsForChallenge.length,
      latestProposalStatus: latestProp?.status,
      latestProposalVersion: latestProp?.version_number,
    };
  });

  return {
    institution,
    projects,
    members,
    engagements,
  };
}

