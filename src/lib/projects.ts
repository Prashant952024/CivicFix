import { supabase } from "@/lib/supabase";
import type {
  ChallengeProjectRow,
  ChallengeProjectUpdate,
  ChallengeProjectMemberRow,
  ChallengeProjectActivityRow,
  ProjectWorkspaceStatus,
  ProjectMemberRole,
  Database,
  InstitutionRow,
} from "@/types/database";

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface ChallengeProjectWithDetails extends ChallengeProjectRow {
  challenge: Pick<
    ChallengeRow,
    | "id"
    | "title"
    | "problem_statement"
    | "category"
    | "status"
    | "geographic_scope"
    | "required_domains"
    | "objectives"
    | "expected_outcomes"
  >;
  institution: Pick<
    InstitutionRow,
    "id" | "name" | "official_name" | "institution_type" | "city" | "state" | "acronym"
  >;
  project_lead?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  creator?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  members_count?: number;
}

export interface ChallengeProjectMemberWithProfile extends ChallengeProjectMemberRow {
  profile: Pick<ProfileRow, "id" | "full_name" | "email" | "phone">;
  added_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
}

export interface ChallengeProjectActivityWithActor extends ChallengeProjectActivityRow {
  actor: Pick<ProfileRow, "id" | "full_name" | "email">;
}

export interface AvailableInstitutionMember {
  profile_id: string;
  full_name: string;
  email: string | null;
  designation?: string | null;
  role_title?: string | null;
  is_already_member: boolean;
}

/**
 * Fetch all projects for a specific institution
 */
export async function fetchInstitutionProjects(
  institutionId: string
): Promise<ChallengeProjectWithDetails[]> {
  const { data, error } = await supabase
    .from("challenge_projects")
    .select(`
      *,
      challenge:innovation_challenges!challenge_projects_challenge_id_fkey(
        id, title, problem_statement, category, status, geographic_scope, required_domains, objectives, expected_outcomes
      ),
      institution:institutions!challenge_projects_institution_id_fkey(
        id, name, official_name, institution_type, city, state, acronym
      ),
      project_lead:profiles!challenge_projects_project_lead_profile_id_fkey(
        id, full_name, email
      ),
      creator:profiles!challenge_projects_created_by_fkey(
        id, full_name, email
      )
    `)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching institution projects:", error);
    throw error;
  }

  if (!data) return [];

  // Fetch member counts for each project
  const projectIds = data.map((p) => p.id);
  const countMap = new Map<string, number>();

  if (projectIds.length > 0) {
    const { data: members } = await supabase
      .from("challenge_project_members")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("is_active", true);

    (members || []).forEach((m) => {
      countMap.set(m.project_id, (countMap.get(m.project_id) || 0) + 1);
    });
  }

  return data.map((proj) => ({
    ...proj,
    members_count: countMap.get(proj.id) || 0,
  }));
}

export const fetchInstitutionChallengeProjects = fetchInstitutionProjects;

/**
 * Fetch all projects under an innovation challenge (for Innovation Managers / Admins)
 */
export async function fetchChallengeProjects(
  challengeId: string
): Promise<ChallengeProjectWithDetails[]> {
  const { data, error } = await supabase
    .from("challenge_projects")
    .select(`
      *,
      challenge:innovation_challenges!challenge_projects_challenge_id_fkey(
        id, title, problem_statement, category, status, geographic_scope, required_domains, objectives, expected_outcomes
      ),
      institution:institutions!challenge_projects_institution_id_fkey(
        id, name, official_name, institution_type, city, state, acronym
      ),
      project_lead:profiles!challenge_projects_project_lead_profile_id_fkey(
        id, full_name, email
      ),
      creator:profiles!challenge_projects_created_by_fkey(
        id, full_name, email
      )
    `)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching challenge projects:", error);
    throw error;
  }

  if (!data) return [];

  const projectIds = data.map((p) => p.id);
  const countMap = new Map<string, number>();

  if (projectIds.length > 0) {
    const { data: members } = await supabase
      .from("challenge_project_members")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("is_active", true);

    (members || []).forEach((m) => {
      countMap.set(m.project_id, (countMap.get(m.project_id) || 0) + 1);
    });
  }

  return data.map((proj) => ({
    ...proj,
    members_count: countMap.get(proj.id) || 0,
  }));
}

/**
 * Fetch a single project workspace by ID
 */
export async function fetchProjectById(
  projectId: string
): Promise<ChallengeProjectWithDetails | null> {
  const { data, error } = await supabase
    .from("challenge_projects")
    .select(`
      *,
      challenge:innovation_challenges!challenge_projects_challenge_id_fkey(
        id, title, problem_statement, category, status, geographic_scope, required_domains, objectives, expected_outcomes
      ),
      institution:institutions!challenge_projects_institution_id_fkey(
        id, name, official_name, institution_type, city, state, acronym
      ),
      project_lead:profiles!challenge_projects_project_lead_profile_id_fkey(
        id, full_name, email
      ),
      creator:profiles!challenge_projects_created_by_fkey(
        id, full_name, email
      )
    `)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching project by ID:", error);
    throw error;
  }

  if (!data) return null;

  const { count } = await supabase
    .from("challenge_project_members")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("is_active", true);

  return {
    ...data,
    members_count: count || 0,
  };
}

/**
 * Create a new challenge project workspace after an invitation is accepted
 */
export async function createProjectWorkspace(params: {
  challengeId: string;
  institutionId: string;
  invitationId: string;
  projectTitle: string;
  projectSummary?: string;
}): Promise<ChallengeProjectRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to create a project workspace.");
  }

  const trimmedTitle = params.projectTitle.trim();
  if (!trimmedTitle) {
    throw new Error("Project title is required.");
  }

  const { data, error } = await supabase
    .from("challenge_projects")
    .insert({
      challenge_id: params.challengeId,
      institution_id: params.institutionId,
      invitation_id: params.invitationId,
      project_title: trimmedTitle,
      project_summary: params.projectSummary?.trim() || null,
      created_by: user.id,
      status: "FORMING_TEAM",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project workspace:", error);
    throw error;
  }

  return data;
}

/**
 * Update project details (title, summary)
 */
export async function updateProjectWorkspace(
  projectId: string,
  updates: {
    projectTitle?: string;
    projectSummary?: string | null;
  }
): Promise<ChallengeProjectRow> {
  const updatePayload: ChallengeProjectUpdate = {};

  if (updates.projectTitle !== undefined) {
    const trimmedTitle = updates.projectTitle.trim();
    if (!trimmedTitle) throw new Error("Project title cannot be blank.");
    updatePayload.project_title = trimmedTitle;
  }

  if (updates.projectSummary !== undefined) {
    updatePayload.project_summary = updates.projectSummary?.trim() || null;
  }

  const { data, error } = await supabase
    .from("challenge_projects")
    .update(updatePayload)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    console.error("Error updating project workspace:", error);
    throw error;
  }

  return data;
}

/**
 * Update project lifecycle status
 */
export async function updateProjectStatus(
  projectId: string,
  newStatus: ProjectWorkspaceStatus
): Promise<ChallengeProjectRow> {
  const { data, error } = await supabase
    .from("challenge_projects")
    .update({ status: newStatus })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    console.error("Error updating project status:", error);
    throw error;
  }

  return data;
}

/**
 * Fetch project members with their profiles
 */
export async function fetchProjectMembers(
  projectId: string
): Promise<ChallengeProjectMemberWithProfile[]> {
  const { data, error } = await supabase
    .from("challenge_project_members")
    .select(`
      *,
      profile:profiles!challenge_project_members_profile_id_fkey(
        id, full_name, email, phone
      ),
      added_by_profile:profiles!challenge_project_members_added_by_fkey(
        id, full_name, email
      )
    `)
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Error fetching project members:", error);
    throw error;
  }

  return data || [];
}

/**
 * Add a member to a project workspace
 */
export async function addProjectMember(
  projectId: string,
  profileId: string,
  role: ProjectMemberRole = "MEMBER"
): Promise<ChallengeProjectMemberRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to add team members.");
  }

  // Check if existing inactive member
  const { data: existing } = await supabase
    .from("challenge_project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing) {
    if (existing.is_active) {
      throw new Error("This profile is already an active member of this project.");
    }
    // Reactivate
    const { data: reactivated, error: reactErr } = await supabase
      .from("challenge_project_members")
      .update({
        is_active: true,
        role,
        added_by: user.id,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (reactErr) throw reactErr;
    return reactivated;
  }

  const { data, error } = await supabase
    .from("challenge_project_members")
    .insert({
      project_id: projectId,
      profile_id: profileId,
      role,
      added_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding project member:", error);
    throw error;
  }

  return data;
}

/**
 * Update a project member's role
 */
export async function updateProjectMemberRole(
  memberId: string,
  newRole: ProjectMemberRole
): Promise<ChallengeProjectMemberRow> {
  const { data, error } = await supabase
    .from("challenge_project_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    console.error("Error updating member role:", error);
    throw error;
  }

  return data;
}

/**
 * Deactivate (remove) a project member
 */
export async function deactivateProjectMember(
  memberId: string
): Promise<ChallengeProjectMemberRow> {
  const { data, error } = await supabase
    .from("challenge_project_members")
    .update({ is_active: false })
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    console.error("Error deactivating member:", error);
    throw error;
  }

  return data;
}

/**
 * Assign a new Project Lead
 */
export async function assignProjectLead(
  projectId: string,
  newLeadProfileId: string
): Promise<void> {
  const { error } = await supabase
    .from("challenge_projects")
    .update({ project_lead_profile_id: newLeadProfileId })
    .eq("id", projectId);

  if (error) {
    console.error("Error assigning project lead:", error);
    throw error;
  }
}

/**
 * Fetch project activity history
 */
export async function fetchProjectActivity(
  projectId: string
): Promise<ChallengeProjectActivityWithActor[]> {
  const { data, error } = await supabase
    .from("challenge_project_activity")
    .select(`
      *,
      actor:profiles!challenge_project_activity_actor_profile_id_fkey(
        id, full_name, email
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching project activity:", error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch institution profiles available to be added to a project
 */
export async function fetchInstitutionAvailableMembers(
  institutionId: string,
  projectId?: string
): Promise<AvailableInstitutionMember[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, designation, institution_id")
    .eq("institution_id", institutionId);

  if (error) {
    console.error("Error fetching institution profiles:", error);
    throw error;
  }

  const { data: instMembers } = await supabase
    .from("institution_members")
    .select("profile_id, role_title, is_primary_contact")
    .eq("institution_id", institutionId);

  const titleMap = new Map<string, string>();
  (instMembers || []).forEach((m) => {
    if (m.role_title) titleMap.set(m.profile_id, m.role_title);
  });

  const existingSet = new Set<string>();
  if (projectId) {
    const { data: projMembers } = await supabase
      .from("challenge_project_members")
      .select("profile_id")
      .eq("project_id", projectId)
      .eq("is_active", true);

    (projMembers || []).forEach((pm) => existingSet.add(pm.profile_id));
  }

  return (profiles || []).map((p) => ({
    profile_id: p.id,
    full_name: p.full_name,
    email: p.email,
    designation: p.designation,
    role_title: titleMap.get(p.id) || null,
    is_already_member: existingSet.has(p.id),
  }));
}

/**
 * Checks whether a user is an authorized coordinator/admin for the institution
 */
export async function checkUserIsInstitutionCoordinator(
  institutionId: string,
  profileId: string
): Promise<boolean> {
  const { data: member, error } = await supabase
    .from("institution_members")
    .select("id, is_primary_contact, role_title")
    .eq("institution_id", institutionId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !member) return false;
  if (member.is_primary_contact) return true;
  const title = (member.role_title || "").toLowerCase();
  return (
    title.includes("coordinator") ||
    title.includes("admin") ||
    title.includes("nodal") ||
    title.includes("director") ||
    title.includes("dean")
  );
}
