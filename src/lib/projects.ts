import { supabase } from "@/lib/supabase";
import type {
  ChallengeProjectRow,
  ChallengeProjectUpdate,
  ChallengeProjectMemberRow,
  ChallengeProjectActivityRow,
  ProjectWorkspaceStatus,
  ProjectMemberRole,
  ProjectMemberType,
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
  profile?: Pick<ProfileRow, "id" | "full_name" | "email" | "phone"> | null;
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
  creatorProfileId?: string;
}): Promise<ChallengeProjectRow> {
  const trimmedTitle = params.projectTitle.trim();
  if (!trimmedTitle) {
    throw new Error("Project title is required.");
  }

  const insertPayload: Record<string, unknown> = {
    challenge_id: params.challengeId,
    institution_id: params.institutionId,
    invitation_id: params.invitationId,
    project_title: trimmedTitle,
    project_summary: params.projectSummary?.trim() || null,
    status: "FORMING_TEAM",
  };

  if (params.creatorProfileId) {
    insertPayload.created_by = params.creatorProfileId;
  }

  const { data, error } = await supabase
    .from("challenge_projects")
    .insert(insertPayload as unknown as Database["public"]["Tables"]["challenge_projects"]["Insert"])
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
  role: ProjectMemberRole = "MEMBER",
  addedByProfileId?: string
): Promise<ChallengeProjectMemberRow> {
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
    const updatePayload: Record<string, unknown> = {
      is_active: true,
      role,
    };
    if (addedByProfileId) {
      updatePayload.added_by = addedByProfileId;
    }

    const { data: reactivated, error: reactErr } = await supabase
      .from("challenge_project_members")
      .update(updatePayload as unknown as Database["public"]["Tables"]["challenge_project_members"]["Update"])
      .eq("id", existing.id)
      .select()
      .single();

    if (reactErr) {
      console.error("Error reactivating team member:", reactErr);
      throw reactErr;
    }
    return reactivated;
  }

  // Insert new member
  const insertPayload: Record<string, unknown> = {
    project_id: projectId,
    profile_id: profileId,
    role,
    is_active: true,
  };
  if (addedByProfileId) {
    insertPayload.added_by = addedByProfileId;
  }

  const { data, error } = await supabase
    .from("challenge_project_members")
    .insert(insertPayload as unknown as Database["public"]["Tables"]["challenge_project_members"]["Insert"])
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
 * Reactivate a previously deactivated project member
 */
export async function reactivateProjectMember(
  memberId: string
): Promise<ChallengeProjectMemberRow> {
  const { data, error } = await supabase
    .from("challenge_project_members")
    .update({ is_active: true })
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    console.error("Error reactivating member:", error);
    throw error;
  }

  return data;
}

export interface ResearchMemberInput {
  member_name: string;
  member_email: string;
  member_type: ProjectMemberType;
  role: ProjectMemberRole;
  designation?: string | null;
  department?: string | null;
  organization?: string | null;
  institution_name?: string | null;
  academic_program?: string | null;
  academic_year?: string | null;
  academic_level?: string | null;
  specialization?: string | null;
  expected_graduation_year?: string | null;
  years_of_experience?: number | null;
  primary_expertise?: string | null;
  secondary_expertise?: string | null;
  expertise?: string | null;
  research_areas?: string[];
  research_domains?: string[];
  technical_skills?: string[];
  technologies?: string[];
  project_responsibility?: string | null;
  project_contribution?: string | null;
  professional_bio?: string | null;
  research_profile_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
}

/**
 * Add a detailed non-authenticated research team member to a project
 */
export async function addResearchTeamMember(
  projectId: string,
  input: ResearchMemberInput,
  addedByProfileId?: string
): Promise<ChallengeProjectMemberRow> {
  const trimmedName = input.member_name.trim();
  const trimmedEmail = input.member_email.trim().toLowerCase();

  if (!trimmedName) {
    throw new Error("Full name is required.");
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    throw new Error("A valid email address is required.");
  }

  // Check if an active member with this email already exists in this project
  const { data: existingActive, error: checkError } = await supabase
    .from("challenge_project_members")
    .select("id, is_active, member_name, member_email")
    .eq("project_id", projectId)
    .ilike("member_email", trimmedEmail)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking duplicate member email:", checkError);
    throw checkError;
  }

  if (existingActive) {
    if (existingActive.is_active) {
      throw new Error(`An active team member with email "${trimmedEmail}" is already part of this project.`);
    }

    // Inactive member with this email: reactivate and update with new profile details
    const reactivatePayload: Database["public"]["Tables"]["challenge_project_members"]["Update"] = {
      is_active: true,
      member_name: trimmedName,
      member_email: trimmedEmail,
      member_type: input.member_type,
      role: input.role,
      designation: input.designation?.trim() || null,
      department: input.department?.trim() || null,
      organization: input.organization?.trim() || null,
      institution_name: input.institution_name?.trim() || null,
      academic_program: input.academic_program?.trim() || null,
      academic_year: input.academic_year?.trim() || null,
      academic_level: input.academic_level?.trim() || null,
      specialization: input.specialization?.trim() || null,
      expected_graduation_year: input.expected_graduation_year?.trim() || null,
      years_of_experience: input.years_of_experience ?? null,
      primary_expertise: input.primary_expertise?.trim() || null,
      secondary_expertise: input.secondary_expertise?.trim() || null,
      expertise: input.expertise?.trim() || null,
      research_areas: input.research_areas || [],
      research_domains: input.research_domains || [],
      technical_skills: input.technical_skills || [],
      technologies: input.technologies || [],
      project_responsibility: input.project_responsibility?.trim() || null,
      project_contribution: input.project_contribution?.trim() || null,
      professional_bio: input.professional_bio?.trim() || null,
      research_profile_url: input.research_profile_url?.trim() || null,
      linkedin_url: input.linkedin_url?.trim() || null,
      website_url: input.website_url?.trim() || null,
    };

    if (addedByProfileId) {
      reactivatePayload.added_by = addedByProfileId;
    }

    const { data: reactivated, error: reactErr } = await supabase
      .from("challenge_project_members")
      .update(reactivatePayload)
      .eq("id", existingActive.id)
      .select()
      .single();

    if (reactErr) {
      console.error("Error reactivating team member:", reactErr);
      throw reactErr;
    }
    return reactivated;
  }

  // Resolve addedBy if not provided
  let effectiveAddedBy = addedByProfileId;
  if (!effectiveAddedBy) {
    const { data: currentProf } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();
    effectiveAddedBy = currentProf?.id;
  }

  if (!effectiveAddedBy) {
    throw new Error("Unable to identify authenticated user profile for team addition.");
  }

  const insertPayload: Database["public"]["Tables"]["challenge_project_members"]["Insert"] = {
    project_id: projectId,
    profile_id: null,
    member_name: trimmedName,
    member_email: trimmedEmail,
    member_type: input.member_type,
    role: input.role,
    designation: input.designation?.trim() || null,
    department: input.department?.trim() || null,
    organization: input.organization?.trim() || null,
    institution_name: input.institution_name?.trim() || null,
    academic_program: input.academic_program?.trim() || null,
    academic_year: input.academic_year?.trim() || null,
    academic_level: input.academic_level?.trim() || null,
    specialization: input.specialization?.trim() || null,
    expected_graduation_year: input.expected_graduation_year?.trim() || null,
    years_of_experience: input.years_of_experience ?? null,
    primary_expertise: input.primary_expertise?.trim() || null,
    secondary_expertise: input.secondary_expertise?.trim() || null,
    expertise: input.expertise?.trim() || null,
    research_areas: input.research_areas || [],
    research_domains: input.research_domains || [],
    technical_skills: input.technical_skills || [],
    technologies: input.technologies || [],
    project_responsibility: input.project_responsibility?.trim() || null,
    project_contribution: input.project_contribution?.trim() || null,
    professional_bio: input.professional_bio?.trim() || null,
    research_profile_url: input.research_profile_url?.trim() || null,
    linkedin_url: input.linkedin_url?.trim() || null,
    website_url: input.website_url?.trim() || null,
    added_by: effectiveAddedBy,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("challenge_project_members")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Error creating research team member:", error);
    throw error;
  }

  return data;
}

/**
 * Update a research team member's full profile
 */
export async function updateResearchTeamMember(
  memberId: string,
  updates: Partial<ResearchMemberInput>
): Promise<ChallengeProjectMemberRow> {
  const updatePayload: Database["public"]["Tables"]["challenge_project_members"]["Update"] = {};

  if (updates.member_name !== undefined) {
    const trimmed = updates.member_name.trim();
    if (!trimmed) throw new Error("Full name cannot be blank.");
    updatePayload.member_name = trimmed;
  }

  if (updates.member_email !== undefined) {
    const trimmed = updates.member_email.trim().toLowerCase();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      throw new Error("A valid email address is required.");
    }
    updatePayload.member_email = trimmed;
  }

  if (updates.member_type !== undefined) updatePayload.member_type = updates.member_type;
  if (updates.role !== undefined) updatePayload.role = updates.role;
  if (updates.designation !== undefined) updatePayload.designation = updates.designation?.trim() || null;
  if (updates.department !== undefined) updatePayload.department = updates.department?.trim() || null;
  if (updates.organization !== undefined) updatePayload.organization = updates.organization?.trim() || null;
  if (updates.institution_name !== undefined) updatePayload.institution_name = updates.institution_name?.trim() || null;
  if (updates.academic_program !== undefined) updatePayload.academic_program = updates.academic_program?.trim() || null;
  if (updates.academic_year !== undefined) updatePayload.academic_year = updates.academic_year?.trim() || null;
  if (updates.academic_level !== undefined) updatePayload.academic_level = updates.academic_level?.trim() || null;
  if (updates.specialization !== undefined) updatePayload.specialization = updates.specialization?.trim() || null;
  if (updates.expected_graduation_year !== undefined) updatePayload.expected_graduation_year = updates.expected_graduation_year?.trim() || null;
  if (updates.years_of_experience !== undefined) updatePayload.years_of_experience = updates.years_of_experience;
  if (updates.primary_expertise !== undefined) updatePayload.primary_expertise = updates.primary_expertise?.trim() || null;
  if (updates.secondary_expertise !== undefined) updatePayload.secondary_expertise = updates.secondary_expertise?.trim() || null;
  if (updates.expertise !== undefined) updatePayload.expertise = updates.expertise?.trim() || null;
  if (updates.research_areas !== undefined) updatePayload.research_areas = updates.research_areas;
  if (updates.research_domains !== undefined) updatePayload.research_domains = updates.research_domains;
  if (updates.technical_skills !== undefined) updatePayload.technical_skills = updates.technical_skills;
  if (updates.technologies !== undefined) updatePayload.technologies = updates.technologies;
  if (updates.project_responsibility !== undefined) updatePayload.project_responsibility = updates.project_responsibility?.trim() || null;
  if (updates.project_contribution !== undefined) updatePayload.project_contribution = updates.project_contribution?.trim() || null;
  if (updates.professional_bio !== undefined) updatePayload.professional_bio = updates.professional_bio?.trim() || null;
  if (updates.research_profile_url !== undefined) updatePayload.research_profile_url = updates.research_profile_url?.trim() || null;
  if (updates.linkedin_url !== undefined) updatePayload.linkedin_url = updates.linkedin_url?.trim() || null;
  if (updates.website_url !== undefined) updatePayload.website_url = updates.website_url?.trim() || null;

  const { data, error } = await supabase
    .from("challenge_project_members")
    .update(updatePayload)
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    console.error("Error updating research team member:", error);
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

    (projMembers || []).forEach((pm) => {
      if (pm.profile_id) existingSet.add(pm.profile_id);
    });
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
