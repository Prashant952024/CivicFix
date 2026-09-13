import { supabase } from "@/lib/supabase";
import type { ProposalStatus } from "@/types/database";

export interface InnovationPipelineMetrics {
  complexIssuesCount: number;
  unformulatedIssuesCount: number;
  challengesCount: number;
  matchingActiveCount: number;
  invitationsPendingCount: number;
  institutionsAcceptedCount: number;
  projectsActiveCount: number;
  teamsFormedCount: number;
  proposalsAwaitingReviewCount: number;
  proposalsApprovedCount: number;
}

export interface ProposalActionItem {
  id: string;
  projectId: string;
  projectTitle: string;
  institutionId: string;
  institutionName: string;
  institutionAcronym: string | null;
  challengeId: string;
  challengeTitle: string;
  versionNumber: number;
  status: ProposalStatus;
  statusLabel: string;
  submittedAt: string | null;
  elapsedWaiting: string;
  projectLeadName: string | null;
  projectLeadEmail: string | null;
  teamSize: number;
}

export interface ActionRequiredSummary {
  proposalsAwaitingReviewCount: number;
  resubmittedCount: number;
  unformulatedIssuesCount: number;
  pendingInvitationsCount: number;
  attentionProjectsCount: number;
  proposalsQueue: ProposalActionItem[];
}

export interface ChallengeWithProgress {
  id: string;
  title: string;
  problemStatement: string;
  category: string;
  status: string;
  complexityScore: number;
  geographicScope: string;
  requiredDomains: string[];
  sourceIssueId: string | null;
  sourceIssueTitle: string | null;
  institutionsSelectedCount: number;
  invitationsSentCount: number;
  invitationsAcceptedCount: number;
  projectsCount: number;
  teamsCount: number;
  proposalsCount: number;
  proposalsApprovedCount: number;
  currentStage: string;
}

export interface ActiveProjectSummary {
  id: string;
  projectTitle: string;
  projectSummary: string;
  status: string;
  institutionId: string;
  institutionName: string;
  institutionAcronym: string | null;
  challengeId: string;
  challengeTitle: string;
  projectLeadName: string | null;
  teamSize: number;
  proposalStatus: ProposalStatus | null;
  proposalId: string | null;
  proposalVersion: number | null;
  lastActivityAt: string;
}

export interface ParticipatingInstitutionSummary {
  id: string;
  name: string;
  officialName: string | null;
  city: string | null;
  state: string | null;
  acronym: string | null;
  activeProjectsCount: number;
  acceptedInvitationsCount: number;
  proposalsCount: number;
  proposalsAwaitingReviewCount: number;
  teamMembersCount: number;
  latestActivity: string | null;
}

export interface RecentActivityItem {
  id: string;
  projectId: string;
  projectTitle: string;
  activityType: string;
  description: string;
  actorName: string | null;
  createdAt: string;
  elapsedTime: string;
}

export interface InnovationDashboardData {
  pipeline: InnovationPipelineMetrics;
  actionRequired: ActionRequiredSummary;
  proposalsAwaitingReview: ProposalActionItem[];
  proposalStatusCounts: {
    SUBMITTED: number;
    RESUBMITTED: number;
    UNDER_REVIEW: number;
    REQUESTED_REVISION: number;
    APPROVED: number;
    DRAFT: number;
    TOTAL: number;
  };
  challenges: ChallengeWithProgress[];
  projects: ActiveProjectSummary[];
  institutions: ParticipatingInstitutionSummary[];
  recentActivity: RecentActivityItem[];
}

export interface InnovationSearchResult {
  challenges: Array<{ id: string; title: string; category: string; complexity: number | null }>;
  institutions: Array<{ id: string; name: string; city: string | null; state: string | null; acronym: string | null }>;
  projects: Array<{ id: string; title: string; institutionName: string; challengeTitle: string }>;
  proposals: Array<{ id: string; title: string; institutionName: string; versionNumber: number; status: string }>;
}

/**
 * Calculates human-readable elapsed waiting time from an ISO timestamp
 */
export function formatElapsedWaitingTime(dateString: string | null): string {
  if (!dateString) return "Recently";
  const now = Date.now();
  const date = new Date(dateString).getTime();
  if (isNaN(date)) return "Recently";

  const diffMs = Math.max(0, now - date);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes === 1) return "1 min ago";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

/**
 * Formats proposal status into user-friendly UI label
 */
export function getProposalStatusLabel(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "Awaiting Review";
    case "RESUBMITTED":
      return "Review Again";
    case "UNDER_REVIEW":
      return "Under Review";
    case "REQUESTED_REVISION":
      return "Waiting for Institution";
    case "APPROVED":
      return "Approved";
    case "DRAFT":
      return "Draft (In Progress)";
    default:
      return status;
  }
}

/**
 * Consolidates all Innovation Manager dashboard data in a unified, optimized fetch
 */
export async function fetchInnovationDashboardData(): Promise<InnovationDashboardData> {
  const [
    issuesRes,
    challengesRes,
    invitationsRes,
    projectsRes,
    membersRes,
    proposalsRes,
    activityRes,
    institutionsRes,
  ] = await Promise.all([
    // 1. Complex issues
    supabase
      .from("issues")
      .select("id, title, category, status, final_issue_type, ai_complexity_score, created_at")
      .or("final_issue_type.eq.COMPLEX,status.eq.CLASSIFIED_COMPLEX,ai_issue_type.eq.COMPLEX"),

    // 2. Innovation challenges
    supabase
      .from("innovation_challenges")
      .select(`
        id, title, problem_statement, problem_category, category, status,
        complexity_score, geographic_scope, required_domains, source_issue_id, created_at,
        source_issue:issues(id, title)
      `)
      .order("created_at", { ascending: false }),

    // 3. Institution invitations
    supabase
      .from("institution_invitations")
      .select("id, challenge_id, institution_id, status, invited_at, responded_at"),

    // 4. Challenge projects
    supabase
      .from("challenge_projects")
      .select(`
        id, challenge_id, institution_id, project_title, project_summary, status,
        project_lead_profile_id, created_at, updated_at,
        institution:institutions!challenge_projects_institution_id_fkey(id, name, acronym),
        challenge:innovation_challenges!challenge_projects_challenge_id_fkey(id, title),
        lead:profiles!challenge_projects_project_lead_profile_id_fkey(id, full_name, email)
      `)
      .order("created_at", { ascending: false }),

    // 5. Active project members
    supabase
      .from("challenge_project_members")
      .select("id, project_id, role, member_name, is_active")
      .eq("is_active", true),

    // 6. Current research proposals
    supabase
      .from("research_proposals")
      .select(`
        id, project_id, challenge_id, institution_id, version_number, status, is_current,
        project_objective, submitted_at, created_at, updated_at,
        challenge:innovation_challenges!research_proposals_challenge_id_fkey(id, title),
        institution:institutions!research_proposals_institution_id_fkey(id, name, acronym),
        project:challenge_projects!research_proposals_project_id_fkey(
          id, project_title, project_lead_profile_id,
          lead:profiles!challenge_projects_project_lead_profile_id_fkey(id, full_name, email)
        )
      `)
      .order("created_at", { ascending: false }),

    // 7. Recent activity events
    supabase
      .from("challenge_project_activity")
      .select(`
        id, project_id, activity_type, description, metadata, created_at,
        actor:profiles!challenge_project_activity_actor_profile_id_fkey(full_name),
        project:challenge_projects!challenge_project_activity_project_id_fkey(project_title)
      `)
      .order("created_at", { ascending: false })
      .limit(10),

    // 8. Accredited institutions
    supabase
      .from("institutions")
      .select("id, name, official_name, city, state, acronym")
      .order("name", { ascending: true }),
  ]);

  if (issuesRes.error) throw issuesRes.error;
  if (challengesRes.error) throw challengesRes.error;
  if (invitationsRes.error) throw invitationsRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (membersRes.error) throw membersRes.error;
  if (proposalsRes.error) throw proposalsRes.error;
  if (institutionsRes.error) throw institutionsRes.error;

  const complexIssues = issuesRes.data ?? [];
  const challengesRaw = challengesRes.data ?? [];
  const invitations = invitationsRes.data ?? [];
  const projectsRaw = projectsRes.data ?? [];
  const members = membersRes.data ?? [];
  const proposalsRaw = proposalsRes.data ?? [];
  const activityRaw = activityRes.data ?? [];
  const institutionsRaw = institutionsRes.data ?? [];

  // Member count mapping per project
  const memberCounts = new Map<string, number>();
  members.forEach((m) => {
    memberCounts.set(m.project_id, (memberCounts.get(m.project_id) || 0) + 1);
  });

  // Current proposal mapping per project
  const currentProposals = proposalsRaw.filter((p) => p.is_current);
  const projectProposalMap = new Map<string, (typeof currentProposals)[0]>();
  currentProposals.forEach((p) => {
    projectProposalMap.set(p.project_id, p);
  });

  // 1. Pipeline Metrics Calculations
  const formulatedSourceIssueIds = new Set(challengesRaw.map((c) => c.source_issue_id).filter(Boolean));
  const unformulatedIssuesCount = complexIssues.filter((i) => !formulatedSourceIssueIds.has(i.id)).length;

  const challengesWithMatchingActive = new Set(invitations.map((inv) => inv.challenge_id)).size;
  const pendingInvitationsCount = invitations.filter((inv) => inv.status === "SENT" || inv.status === "PENDING").length;
  const institutionsAcceptedCount = new Set(
    invitations.filter((inv) => inv.status === "ACCEPTED").map((inv) => inv.institution_id)
  ).size;

  const projectsActiveCount = projectsRaw.filter((p) => p.status !== "ARCHIVED").length;
  const teamsFormedCount = projectsRaw.filter((p) => (memberCounts.get(p.id) || 0) >= 2).length;

  // Proposal counts by status
  const proposalStatusCounts = {
    SUBMITTED: 0,
    RESUBMITTED: 0,
    UNDER_REVIEW: 0,
    REQUESTED_REVISION: 0,
    APPROVED: 0,
    DRAFT: 0,
    TOTAL: currentProposals.length,
  };

  currentProposals.forEach((p) => {
    if (proposalStatusCounts[p.status as keyof typeof proposalStatusCounts] !== undefined) {
      proposalStatusCounts[p.status as keyof typeof proposalStatusCounts]++;
    }
  });

  const proposalsAwaitingReviewCount =
    proposalStatusCounts.SUBMITTED + proposalStatusCounts.RESUBMITTED;

  const pipeline: InnovationPipelineMetrics = {
    complexIssuesCount: complexIssues.length,
    unformulatedIssuesCount,
    challengesCount: challengesRaw.length,
    matchingActiveCount: challengesWithMatchingActive,
    invitationsPendingCount: pendingInvitationsCount,
    institutionsAcceptedCount,
    projectsActiveCount,
    teamsFormedCount,
    proposalsAwaitingReviewCount,
    proposalsApprovedCount: proposalStatusCounts.APPROVED,
  };

  // 2. Build Proposal Action Items Queue (Priority: RESUBMITTED, SUBMITTED, UNDER_REVIEW)
  const actionableProposals: ProposalActionItem[] = currentProposals
    .filter((p) => p.status === "RESUBMITTED" || p.status === "SUBMITTED" || p.status === "UNDER_REVIEW")
    .map((p) => {
      const proj = p.project as unknown as {
        id: string;
        project_title: string;
        lead?: { id: string; full_name: string; email: string | null } | null;
      } | null;
      const inst = p.institution as unknown as { id: string; name: string; acronym: string | null } | null;
      const chal = p.challenge as unknown as { id: string; title: string } | null;

      const dateToUse = p.submitted_at || p.updated_at || p.created_at;

      return {
        id: p.id,
        projectId: p.project_id,
        projectTitle: proj?.project_title || "Untitled Project",
        institutionId: p.institution_id,
        institutionName: inst?.name || "Unknown Institution",
        institutionAcronym: inst?.acronym ?? null,
        challengeId: p.challenge_id,
        challengeTitle: chal?.title || "Unknown Challenge",
        versionNumber: p.version_number,
        status: p.status,
        statusLabel: getProposalStatusLabel(p.status),
        submittedAt: p.submitted_at,
        elapsedWaiting: formatElapsedWaitingTime(dateToUse),
        projectLeadName: proj?.lead?.full_name ?? null,
        projectLeadEmail: proj?.lead?.email ?? null,
        teamSize: memberCounts.get(p.project_id) || 0,
      };
    })
    .sort((a, b) => {
      // Prioritize RESUBMITTED first, then SUBMITTED, then UNDER_REVIEW
      const priorityOrder = { RESUBMITTED: 1, SUBMITTED: 2, UNDER_REVIEW: 3, REQUESTED_REVISION: 4, DRAFT: 5, APPROVED: 6 };
      const diff = (priorityOrder[a.status] || 99) - (priorityOrder[b.status] || 99);
      if (diff !== 0) return diff;
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });

  const attentionProjectsCount = projectsRaw.filter((p) => {
    const size = memberCounts.get(p.id) || 0;
    const prop = projectProposalMap.get(p.id);
    return size < 2 || !prop || prop.status === "REQUESTED_REVISION";
  }).length;

  const actionRequired: ActionRequiredSummary = {
    proposalsAwaitingReviewCount,
    resubmittedCount: proposalStatusCounts.RESUBMITTED,
    unformulatedIssuesCount,
    pendingInvitationsCount,
    attentionProjectsCount,
    proposalsQueue: actionableProposals,
  };

  // 3. Build Challenges with Progress Breakdown
  const challenges: ChallengeWithProgress[] = challengesRaw.map((c) => {
    const chalInvs = invitations.filter((inv) => inv.challenge_id === c.id);
    const chalProjs = projectsRaw.filter((p) => p.challenge_id === c.id);
    const chalProposals = currentProposals.filter((p) => p.challenge_id === c.id);
    const approvedProposals = chalProposals.filter((p) => p.status === "APPROVED");

    const teamsCount = chalProjs.filter((p) => (memberCounts.get(p.id) || 0) >= 2).length;

    let stage = "CHALLENGE_FORMULATED";
    if (chalInvs.length > 0) stage = "MATCHING_OUTREACH";
    if (chalInvs.some((inv) => inv.status === "ACCEPTED")) stage = "INSTITUTION_ACCEPTED";
    if (chalProjs.length > 0) stage = "PROJECT_WORKSPACE_OPEN";
    if (teamsCount > 0) stage = "RESEARCH_TEAM_FORMED";
    if (chalProposals.some((p) => p.status === "SUBMITTED" || p.status === "RESUBMITTED")) {
      stage = "PROPOSAL_AWAITING_REVIEW";
    }
    if (approvedProposals.length > 0) stage = "PROPOSAL_APPROVED";

    return {
      id: c.id,
      title: c.title,
      problemStatement: c.problem_statement,
      category: c.problem_category || c.category || "Municipal Innovation",
      status: c.status,
      complexityScore: c.complexity_score || 85,
      geographicScope: c.geographic_scope || "Citywide",
      requiredDomains: Array.isArray(c.required_domains) ? c.required_domains : [],
      sourceIssueId: c.source_issue_id,
      sourceIssueTitle: (c.source_issue as { id: string; title: string } | null)?.title ?? null,
      institutionsSelectedCount: chalInvs.length,
      invitationsSentCount: chalInvs.filter((inv) => inv.status === "SENT" || inv.status === "PENDING").length,
      invitationsAcceptedCount: chalInvs.filter((inv) => inv.status === "ACCEPTED").length,
      projectsCount: chalProjs.length,
      teamsCount,
      proposalsCount: chalProposals.length,
      proposalsApprovedCount: approvedProposals.length,
      currentStage: stage,
    };
  });

  // 4. Build Active Projects Summary
  const projects: ActiveProjectSummary[] = projectsRaw.map((p) => {
    const prop = projectProposalMap.get(p.id);

    return {
      id: p.id,
      projectTitle: p.project_title,
      projectSummary: p.project_summary || "",
      status: p.status,
      institutionId: p.institution_id,
      institutionName: p.institution?.name || "Institution",
      institutionAcronym: p.institution?.acronym ?? null,
      challengeId: p.challenge_id,
      challengeTitle: p.challenge?.title || "Challenge",
      projectLeadName: p.lead?.full_name ?? null,
      teamSize: memberCounts.get(p.id) || 0,
      proposalStatus: (prop?.status as ProposalStatus) ?? null,
      proposalId: prop?.id ?? null,
      proposalVersion: prop?.version_number ?? null,
      lastActivityAt: p.updated_at || p.created_at,
    };
  });

  // 5. Build Participating Institutions Summary
  const institutions: ParticipatingInstitutionSummary[] = institutionsRaw
    .map((inst) => {
      const instProjs = projectsRaw.filter((p) => p.institution_id === inst.id);
      const instInvs = invitations.filter((inv) => inv.institution_id === inst.id);
      const instProposals = currentProposals.filter((p) => p.institution_id === inst.id);
      const instAwaiting = instProposals.filter(
        (p) => p.status === "SUBMITTED" || p.status === "RESUBMITTED"
      ).length;

      let totalMembers = 0;
      instProjs.forEach((p) => {
        totalMembers += memberCounts.get(p.id) || 0;
      });

      return {
        id: inst.id,
        name: inst.name,
        officialName: inst.official_name,
        city: inst.city,
        state: inst.state,
        acronym: inst.acronym,
        activeProjectsCount: instProjs.length,
        acceptedInvitationsCount: instInvs.filter((inv) => inv.status === "ACCEPTED").length,
        proposalsCount: instProposals.length,
        proposalsAwaitingReviewCount: instAwaiting,
        teamMembersCount: totalMembers,
        latestActivity: instProjs[0]?.created_at || null,
      };
    })
    .filter((inst) => inst.activeProjectsCount > 0 || inst.acceptedInvitationsCount > 0);

  // 6. Recent Activity Feed
  const recentActivity: RecentActivityItem[] = activityRaw.map((a) => {
    const actor = a.actor as unknown as { full_name: string | null } | null;
    const proj = a.project as unknown as { project_title: string | null } | null;

    return {
      id: a.id,
      projectId: a.project_id,
      projectTitle: proj?.project_title || "Project Workspace",
      activityType: a.activity_type,
      description: a.description,
      actorName: actor?.full_name ?? null,
      createdAt: a.created_at,
      elapsedTime: formatElapsedWaitingTime(a.created_at),
    };
  });

  return {
    pipeline,
    actionRequired,
    proposalsAwaitingReview: actionableProposals,
    proposalStatusCounts,
    challenges,
    projects,
    institutions,
    recentActivity,
  };
}

/**
 * Searches across challenges, institutions, projects, and proposals in real-time
 */
export async function searchInnovationRecords(query: string): Promise<InnovationSearchResult> {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return { challenges: [], institutions: [], projects: [], proposals: [] };
  }

  const [chalRes, instRes, projRes, propRes] = await Promise.all([
    supabase
      .from("innovation_challenges")
      .select("id, title, problem_category, category, complexity_score")
      .ilike("title", `%${clean}%`)
      .limit(5),
    supabase
      .from("institutions")
      .select("id, name, city, state, acronym")
      .or(`name.ilike.%${clean}%,acronym.ilike.%${clean}%,city.ilike.%${clean}%`)
      .limit(5),
    supabase
      .from("challenge_projects")
      .select(`
        id, project_title,
        institution:institutions(name),
        challenge:innovation_challenges(title)
      `)
      .ilike("project_title", `%${clean}%`)
      .limit(5),
    supabase
      .from("research_proposals")
      .select(`
        id, version_number, status,
        project:challenge_projects(project_title),
        institution:institutions(name)
      `)
      .eq("is_current", true)
      .limit(10),
  ]);

  const challenges = (chalRes.data || []).map((c) => ({
    id: c.id,
    title: c.title,
    category: c.problem_category || c.category || "Municipal Innovation",
    complexity: c.complexity_score,
  }));

  const institutions = (instRes.data || []).map((i) => ({
    id: i.id,
    name: i.name,
    city: i.city,
    state: i.state,
    acronym: i.acronym,
  }));

  const projects = (projRes.data || []).map((p) => {
    const inst = p.institution as unknown as { name: string } | null;
    const chal = p.challenge as unknown as { title: string } | null;
    return {
      id: p.id,
      title: p.project_title,
      institutionName: inst?.name || "Institution",
      challengeTitle: chal?.title || "Challenge",
    };
  });

  const proposals = (propRes.data || [])
    .map((pr) => {
      const proj = pr.project as unknown as { project_title: string } | null;
      const inst = pr.institution as unknown as { name: string } | null;
      return {
        id: pr.id,
        title: proj?.project_title || "Research Proposal",
        institutionName: inst?.name || "Institution",
        versionNumber: pr.version_number,
        status: pr.status,
      };
    })
    .filter((p) => p.title.toLowerCase().includes(clean) || p.institutionName.toLowerCase().includes(clean))
    .slice(0, 5);

  return {
    challenges,
    institutions,
    projects,
    proposals,
  };
}

// ---------------------------------------------------------------------------
// PROBLEM CONTROL CENTER TYPES & SERVICES
// ---------------------------------------------------------------------------

export interface ComplexProblemListItem {
  id: string; // issue_id
  issueId: string;
  challengeId: string | null;
  title: string;
  description: string;
  category: string;
  geographicScope: string;
  complexityScore: number;
  complexityConfidence: number | null;
  affectedPopulation: string | null;
  sourceCreatedAt: string;
  challengeStatus: string | null;
  challengeTitle: string | null;
  institutionsSelectedCount: number;
  invitationsSentCount: number;
  institutionsAcceptedCount: number;
  projectsCount: number;
  teamsFormedCount: number;
  proposalsCount: number;
  proposalsAwaitingReviewCount: number;
  proposalsApprovedCount: number;
  needsAction: boolean;
  needsActionReason: string | null;
  stage: string;
  stageLabel: string;
  lastActivityAt: string;
  lastActivityDescription: string;
}

export interface InstitutionLifecycleTrack {
  institutionId: string;
  institutionName: string;
  institutionAcronym: string | null;
  institutionType: string | null;
  city: string | null;
  state: string | null;
  websiteUrl: string | null;
  researchDomains: string[];
  facilities: string[];
  specializations: string[];

  // Selection & Outreach
  isSelected: boolean;
  selectedAt: string | null;
  invitationId: string | null;
  invitationStatus: "SENT" | "PENDING" | "ACCEPTED" | "DECLINED" | null;
  invitedAt: string | null;
  respondedAt: string | null;

  // Project Workspace
  projectId: string | null;
  projectTitle: string | null;
  projectSummary: string | null;
  projectStatus: string | null;
  projectLeadName: string | null;
  projectLeadEmail: string | null;

  // Team
  teamMembersCount: number;
  teamMembers: {
    id: string;
    profileId: string | null;
    memberName: string;
    memberEmail: string | null;
    memberType?: string | null;
    role: string;
    designation: string | null;
    department?: string | null;
    organization?: string | null;
    academicProgram?: string | null;
    academicYear?: string | null;
    specialization?: string | null;
    primaryExpertise?: string | null;
    researchAreas?: string[];
    technicalSkills?: string[];
    projectResponsibility?: string | null;
    projectContribution?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    isActive: boolean;
    joinedAt?: string;
  }[];

  // Proposal
  proposalId: string | null;
  proposalVersion: number | null;
  proposalStatus: ProposalStatus | null;
  proposalSubmittedAt: string | null;
  proposalReviewedAt: string | null;
  proposalReviewFeedback: string | null;
  proposals?: {
    id: string;
    versionNumber: number;
    status: ProposalStatus;
    isCurrent: boolean;
    projectObjective: string;
    proposedMethodology?: string | null;
    technicalApproach?: string | null;
    expectedPrototype?: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewFeedback: string | null;
    approvedAt?: string | null;
    createdAt: string;
  }[];

  // Scoped Activity & Updates (strictly this institution)
  scopedTimeline?: {
    id: string;
    timestamp: string;
    title: string;
    description: string;
    actorName: string | null;
    category: "INVITATION" | "PROJECT" | "TEAM" | "PROPOSAL" | "SYSTEM";
  }[];
  scopedUpdates?: {
    id: string;
    timestamp: string;
    title: string;
    description: string;
    actorName: string | null;
    type: string;
  }[];

  // Scoped Match Evidence for this problem
  matchEvidence?: {
    overallScore: number;
    structuredScore: number;
    aiSemanticScore: number;
    rank: number;
    recommendedRole: string | null;
    topStrengths: string[];
    gaps?: string[];
    whyRecommended?: string | null;
  } | null;

  // Computed Status & Lifecycle
  lifecycleStage:
    | "SELECTED"
    | "INVITED"
    | "ACCEPTED"
    | "PROJECT_CREATED"
    | "TEAM_FORMED"
    | "PROPOSAL_SUBMITTED"
    | "UNDER_REVIEW"
    | "REVISION_REQUESTED"
    | "RESUBMITTED"
    | "APPROVED";
  lifecycleLabel: string;
  actionRequired: boolean;
  actionRequiredMessage: string | null;
  lastActivityAt: string;
  lastActivityDescription: string;
}

export function getProposalStatusBadgeClass(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "bg-sky-100 text-sky-900 border-sky-300 font-bold text-xs";
    case "RESUBMITTED":
      return "bg-indigo-100 text-indigo-900 border-indigo-300 font-bold text-xs";
    case "UNDER_REVIEW":
      return "bg-purple-100 text-purple-900 border-purple-300 font-bold text-xs";
    case "REQUESTED_REVISION":
      return "bg-orange-100 text-orange-900 border-orange-300 font-bold text-xs";
    case "APPROVED":
      return "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs";
    case "DRAFT":
      return "bg-slate-100 text-slate-700 border-slate-300 text-xs";
    default:
      return "bg-muted text-muted-foreground text-xs";
  }
}

export interface ProblemControlCenterData {
  problemId: string; // matches either issue id or challenge id
  problem: {
    id: string;
    title: string;
    description: string;
    category: string;
    geographicScope: string;
    addressText: string | null;
    locationText: string | null;
    status: string;
    finalIssueType: string;
    aiComplexityScore: number | null;
    complexityConfidence: number | null;
    approvedRootCause: string | null;
    whyComplex: string | null;
    requiredExpertise: string[];
    aiSummary: string | null;
    reporterName: string | null;
    createdAt: string;
    images: { id: string; storage_bucket: string; storage_path: string; image_type?: string }[];
  };
  issue: {
    id: string;
    title: string;
    description: string;
    category: string;
    geographicScope: string;
    addressText: string | null;
    status: string;
    finalIssueType: string;
    aiComplexityScore: number | null;
    aiComplexityConfidence: number | null;
    aiComplexityReasoning: string | null;
    aiRootCause: string | null;
    aiComplexityFactors: string[];
    aiRequiredExpertise: string[];
    aiOperationalResolvability: string | null;
    aiKnownSopAvailability: string | null;
    reporterName: string | null;
    classificationDecidedBy: string | null;
    createdAt: string;
    images: { id: string; storagePath: string; imageType: string }[];
  };
  challenge: {
    id: string;
    title: string;
    problemStatement: string;
    category: string;
    geographicScope: string;
    complexityScore: number;
    requiredDomains: string[];
    requiredExpertise: string[];
    objectives: string[];
    expectedOutcomes: string[];
    constraints: string[];
    successCriteria: string[];
    status: string;
    approvedAt: string | null;
    approverName: string | null;
    createdAt: string;
  } | null;

  stats: {
    complexityScore: number;
    institutionsSelectedCount: number;
    invitationsSentCount: number;
    institutionsAcceptedCount: number;
    projectsActiveCount: number;
    teamsFormedCount: number;
    proposalsCount: number;
    proposalsAwaitingReviewCount: number;
    proposalsApprovedCount: number;
  };

  metrics: {
    complexityScore: number;
    complexityConfidence: number;
    institutionsSelectedCount: number;
    invitationsSentCount: number;
    institutionsAcceptedCount: number;
    projectsActiveCount: number;
    teamsFormedCount: number;
    proposalsCount: number;
    proposalsAwaitingReviewCount: number;
    proposalsApprovedCount: number;
  };

  pipeline: {
    key: string;
    label: string;
    stepNumber: number;
    status: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE";
    isCurrent: boolean;
    description: string;
  }[];

  currentPipelineStage: {
    stage: string;
    label: string;
    stepNumber: number;
  };

  actionRequired: {
    needsAction: boolean;
    proposalsAwaitingReviewCount: number;
    proposalsAwaitingReviewList: {
      id: string;
      institutionName: string;
      projectTitle: string;
      versionNumber: number;
      status: string;
      submittedAt: string | null;
    }[];
  };

  actionRequiredQueue: {
    proposalsAwaitingReview: {
      proposalId: string;
      institutionName: string;
      versionNumber: number;
      status: ProposalStatus;
      submittedAt: string | null;
      elapsedWaiting: string;
    }[];
    needsMatching: boolean;
    needsOutreach: boolean;
  };

  institutions: InstitutionLifecycleTrack[];

  matching: {
    lastRunAt: string | null;
    modelUsed: string | null;
    eligibleCount: number;
    matchesCount: number;
    topMatches: {
      institutionId: string;
      institutionName: string;
      institutionAcronym: string | null;
      overallScore: number;
      structuredScore: number;
      aiSemanticScore: number;
      recommendedRole: string | null;
      topStrengths: string[];
      isSelected: boolean;
      invitationStatus: string | null;
      rank: number;
    }[];
  };

  proposals: {
    id: string;
    institutionName: string;
    projectTitle: string;
    versionNumber: number;
    status: string;
    isCurrent: boolean;
    submittedAt: string | null;
    projectLeadName: string | null;
    objectiveSummary: string | null;
  }[];

  timeline: {
    id: string;
    timestamp: string;
    title: string;
    description: string;
    actorName: string | null;
    category:
      | "CLASSIFICATION"
      | "CHALLENGE"
      | "MATCHING"
      | "INVITATION"
      | "PROJECT"
      | "TEAM"
      | "PROPOSAL"
      | "SYSTEM";
  }[];
}

export function deriveProblemStage(
  challenge: { status: string } | null,
  invitationsCount: number,
  acceptedCount: number,
  projectsCount: number,
  teamsCount: number,
  proposalsCount: number,
  proposalsApprovedCount: number
): { stage: string; label: string; stepNumber: number } {
  if (!challenge) {
    return { stage: "CLASSIFIED", label: "Classified Complex", stepNumber: 1 };
  }
  if (proposalsApprovedCount > 0) {
    return { stage: "PROPOSAL_APPROVED", label: "Proposal Approved", stepNumber: 10 };
  }
  if (proposalsCount > 0) {
    return { stage: "RESEARCH_PROPOSAL", label: "Proposal Underway", stepNumber: 9 };
  }
  if (teamsCount > 0) {
    return { stage: "TEAM_FORMATION", label: "Research Team Formed", stepNumber: 8 };
  }
  if (projectsCount > 0) {
    return { stage: "PROJECT_CREATED", label: "Project Created", stepNumber: 7 };
  }
  if (acceptedCount > 0) {
    return { stage: "INSTITUTION_ACCEPTED", label: "Institution Accepted", stepNumber: 6 };
  }
  if (invitationsCount > 0) {
    return { stage: "OUTREACH", label: "Invitations Sent", stepNumber: 5 };
  }
  if (challenge.status === "INSTITUTIONS_SELECTED") {
    return { stage: "INSTITUTIONS_SELECTED", label: "Institutions Selected", stepNumber: 4 };
  }
  if (challenge.status.includes("MATCHING")) {
    return { stage: "MATCHING", label: "Matching Active", stepNumber: 3 };
  }
  return { stage: "CHALLENGE_FORMULATED", label: "Challenge Formulated", stepNumber: 2 };
}

export function deriveInstitutionLifecycle(
  invitationStatus: "SENT" | "PENDING" | "ACCEPTED" | "DECLINED" | null,
  hasProject: boolean,
  teamMembersCount: number,
  proposal: { status: ProposalStatus; version_number: number } | null
): {
  stage:
    | "SELECTED"
    | "INVITED"
    | "ACCEPTED"
    | "PROJECT_CREATED"
    | "TEAM_FORMED"
    | "PROPOSAL_SUBMITTED"
    | "UNDER_REVIEW"
    | "REVISION_REQUESTED"
    | "RESUBMITTED"
    | "APPROVED";
  label: string;
  actionRequired: boolean;
  actionRequiredMessage: string | null;
} {
  if (proposal) {
    switch (proposal.status) {
      case "APPROVED":
        return {
          stage: "APPROVED",
          label: "Proposal Approved & Locked",
          actionRequired: false,
          actionRequiredMessage: null,
        };
      case "RESUBMITTED":
        return {
          stage: "RESUBMITTED",
          label: `Proposal v${proposal.version_number} Resubmitted`,
          actionRequired: true,
          actionRequiredMessage: `Review resubmitted proposal v${proposal.version_number}`,
        };
      case "UNDER_REVIEW":
        return {
          stage: "UNDER_REVIEW",
          label: `Proposal v${proposal.version_number} Under Review`,
          actionRequired: true,
          actionRequiredMessage: `Evaluation in progress for proposal v${proposal.version_number}`,
        };
      case "REQUESTED_REVISION":
        return {
          stage: "REVISION_REQUESTED",
          label: "Revision Requested",
          actionRequired: false,
          actionRequiredMessage: null,
        };
      case "SUBMITTED":
        return {
          stage: "PROPOSAL_SUBMITTED",
          label: `Proposal v${proposal.version_number} Awaiting Review`,
          actionRequired: true,
          actionRequiredMessage: `Review submitted proposal v${proposal.version_number}`,
        };
      case "DRAFT":
        break;
    }
  }

  if (teamMembersCount >= 2) {
    return {
      stage: "TEAM_FORMED",
      label: `Team Formed (${teamMembersCount} Members)`,
      actionRequired: false,
      actionRequiredMessage: null,
    };
  }

  if (hasProject) {
    return {
      stage: "PROJECT_CREATED",
      label: "Project Workspace Created",
      actionRequired: false,
      actionRequiredMessage: null,
    };
  }

  if (invitationStatus === "ACCEPTED") {
    return {
      stage: "ACCEPTED",
      label: "Invitation Accepted",
      actionRequired: false,
      actionRequiredMessage: null,
    };
  }

  if (invitationStatus === "SENT" || invitationStatus === "PENDING") {
    return {
      stage: "INVITED",
      label: "Invited — Waiting for Response",
      actionRequired: false,
      actionRequiredMessage: null,
    };
  }

  return {
    stage: "SELECTED",
    label: "Institution Selected",
    actionRequired: false,
    actionRequiredMessage: null,
  };
}

/**
 * Fetch all complex problems for the Innovation Manager catalog
 */
export async function fetchComplexProblemsList(): Promise<ComplexProblemListItem[]> {
  const [
    issuesRes,
    challengesRes,
    invitationsRes,
    projectsRes,
    membersRes,
    proposalsRes,
  ] = await Promise.all([
    supabase
      .from("issues")
      .select(`
        id, title, description, category, address_text, location_text,
        status, final_issue_type, ai_issue_type, ai_complexity_score, ai_classification_confidence,
        created_at, updated_at
      `)
      .or("final_issue_type.eq.COMPLEX,status.eq.CLASSIFIED_COMPLEX,ai_issue_type.eq.COMPLEX")
      .order("created_at", { ascending: false }),

    supabase
      .from("innovation_challenges")
      .select("id, title, status, geographic_scope, source_issue_id, created_at, updated_at")
      .order("created_at", { ascending: false }),

    supabase
      .from("institution_invitations")
      .select("id, challenge_id, institution_id, status, invited_at, responded_at"),

    supabase
      .from("challenge_projects")
      .select("id, challenge_id, institution_id, project_title, status, created_at, updated_at"),

    supabase
      .from("challenge_project_members")
      .select("id, project_id, is_active")
      .eq("is_active", true),

    supabase
      .from("research_proposals")
      .select("id, challenge_id, project_id, version_number, status, is_current, submitted_at, created_at, updated_at"),
  ]);

  if (issuesRes.error) {
    console.error("Error loading complex problems:", issuesRes.error);
    throw issuesRes.error;
  }

  const issues = issuesRes.data || [];
  const challenges = challengesRes.data || [];
  const invitations = invitationsRes.data || [];
  const projects = projectsRes.data || [];
  const members = membersRes.data || [];
  const proposals = (proposalsRes.data || []).filter((p) => p.is_current);

  // Group members count by project_id
  const projectMemberCount = new Map<string, number>();
  members.forEach((m) => {
    projectMemberCount.set(m.project_id, (projectMemberCount.get(m.project_id) || 0) + 1);
  });

  return issues.map((issue) => {
    const chal = challenges.find((c) => c.source_issue_id === issue.id) || null;
    const chalId = chal?.id || null;

    const chalInvs = chalId ? invitations.filter((inv) => inv.challenge_id === chalId) : [];
    const chalProjs = chalId ? projects.filter((p) => p.challenge_id === chalId) : [];
    const chalProposals = chalId ? proposals.filter((p) => p.challenge_id === chalId) : [];

    const institutionsSelectedCount = chalInvs.length;
    const invitationsSentCount = chalInvs.filter((inv) => inv.status === "SENT" || inv.status === "PENDING").length;
    const institutionsAcceptedCount = chalInvs.filter((inv) => inv.status === "ACCEPTED").length;
    const projectsCount = chalProjs.length;
    const teamsFormedCount = chalProjs.filter((p) => (projectMemberCount.get(p.id) || 0) >= 2).length;
    const proposalsCount = chalProposals.length;
    const proposalsAwaitingReviewCount = chalProposals.filter(
      (p) => p.status === "SUBMITTED" || p.status === "RESUBMITTED"
    ).length;
    const proposalsApprovedCount = chalProposals.filter((p) => p.status === "APPROVED").length;

    const stageObj = deriveProblemStage(
      chal,
      chalInvs.length,
      institutionsAcceptedCount,
      projectsCount,
      teamsFormedCount,
      proposalsCount,
      proposalsApprovedCount
    );

    let needsAction = false;
    let needsActionReason: string | null = null;

    if (!chal) {
      needsAction = true;
      needsActionReason = "Challenge formulation required";
    } else if (proposalsAwaitingReviewCount > 0) {
      needsAction = true;
      needsActionReason = `${proposalsAwaitingReviewCount} Research Proposal${proposalsAwaitingReviewCount > 1 ? "s" : ""} awaiting review`;
    } else if (chal.status === "APPROVED" && chalInvs.length === 0) {
      needsAction = true;
      needsActionReason = "Institution matching required";
    }

    const lastActivityDate =
      chal?.updated_at ||
      chal?.created_at ||
      issue.updated_at ||
      issue.created_at;

    return {
      id: issue.id,
      issueId: issue.id,
      challengeId: chalId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      geographicScope: chal?.geographic_scope || "Citywide",
      complexityScore: issue.ai_complexity_score || 75,
      complexityConfidence: issue.ai_classification_confidence ?? null,
      affectedPopulation: null,
      sourceCreatedAt: issue.created_at,
      challengeStatus: chal?.status || null,
      challengeTitle: chal?.title || null,
      institutionsSelectedCount,
      invitationsSentCount,
      institutionsAcceptedCount,
      projectsCount,
      teamsFormedCount,
      proposalsCount,
      proposalsAwaitingReviewCount,
      proposalsApprovedCount,
      needsAction,
      needsActionReason,
      stage: stageObj.stage,
      stageLabel: stageObj.label,
      lastActivityAt: lastActivityDate,
      lastActivityDescription: `${stageObj.label} • ${formatElapsedWaitingTime(lastActivityDate)} ago`,
    };
  });
}

/**
 * Fetch full consolidated data for a single Problem Control Center
 */
export async function fetchProblemControlCenterData(
  problemId: string
): Promise<ProblemControlCenterData> {
  // 1. Resolve issue and challenge
  let sourceIssueId: string | null;
  let challengeId: string | null = null;

  // Try matching problemId as issue id
  const { data: issueCandidate } = await supabase
    .from("issues")
    .select(`
      id, title, description, category, address_text, location_text,
      status, final_issue_type, ai_issue_type, ai_complexity_score, ai_classification_confidence,
      ai_complexity_reasoning, ai_complexity_factors, ai_required_expertise, created_at,
      reporter_profile:profiles!issues_reporter_profile_id_fkey(full_name),
      decided_by_profile:profiles!issues_classification_decided_by_fkey(full_name),
      issue_images(id, storage_bucket, storage_path, image_type, created_at, uploaded_by_profile_id, issue_id)
    `)
    .eq("id", problemId)
    .maybeSingle();

  let issueData = issueCandidate;

  if (issueCandidate) {
    sourceIssueId = issueCandidate.id;
    const { data: chalData } = await supabase
      .from("innovation_challenges")
      .select(`
        id, title, problem_statement, category, problem_category, geographic_scope,
        complexity_score, required_domains, required_expertise, objectives,
        expected_outcomes, constraints, success_criteria, status, approved_at,
        created_at,
        approver_profile:profiles!innovation_challenges_approved_by_fkey(full_name)
      `)
      .eq("source_issue_id", sourceIssueId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chalData) {
      challengeId = chalData.id;
    }
  } else {
    // Try matching problemId as challenge id
    const { data: chalCandidate } = await supabase
      .from("innovation_challenges")
      .select(`
        id, title, problem_statement, category, problem_category, geographic_scope,
        complexity_score, required_domains, required_expertise, objectives,
        expected_outcomes, constraints, success_criteria, status, approved_at,
        source_issue_id, created_at,
        approver_profile:profiles!innovation_challenges_approved_by_fkey(full_name)
      `)
      .eq("id", problemId)
      .maybeSingle();

    if (!chalCandidate) {
      throw new Error(`Problem or challenge with ID "${problemId}" not found.`);
    }

    challengeId = chalCandidate.id;
    sourceIssueId = chalCandidate.source_issue_id;

    if (sourceIssueId) {
      const { data: resolvedIssue } = await supabase
        .from("issues")
        .select(`
          id, title, description, category, address_text, location_text,
          status, final_issue_type, ai_issue_type, ai_complexity_score, ai_classification_confidence,
          ai_complexity_reasoning, ai_complexity_factors, ai_required_expertise, created_at,
          reporter_profile:profiles!issues_reporter_profile_id_fkey(full_name),
          decided_by_profile:profiles!issues_classification_decided_by_fkey(full_name),
          issue_images(id, storage_bucket, storage_path, image_type, created_at, uploaded_by_profile_id, issue_id)
        `)
        .eq("id", sourceIssueId)
        .maybeSingle();

      issueData = resolvedIssue;
    }

    if (!issueData) {
      // Synthesize fallback issueData from challenge if source issue row is unlinked
      issueData = {
        id: chalCandidate.id,
        title: chalCandidate.title,
        description: chalCandidate.problem_statement,
        category: chalCandidate.problem_category || chalCandidate.category || "Municipal Innovation",
        address_text: null,
        location_text: null,
        status: "CLASSIFIED_COMPLEX",
        final_issue_type: "COMPLEX",
        ai_issue_type: "COMPLEX",
        ai_complexity_score: chalCandidate.complexity_score || 85,
        ai_classification_confidence: 0.95,
        ai_complexity_reasoning: null,
        ai_complexity_factors: null,
        ai_required_expertise: chalCandidate.required_expertise,
        created_at: chalCandidate.created_at,
        reporter_profile: null,
        decided_by_profile: null,
        issue_images: [],
      } as unknown as typeof issueCandidate;
    }
  }

  if (!issueData) {
    throw new Error("Unable to resolve source problem details.");
  }

  // 2. Fetch challenge if not already fetched
  let challengeRecord = null;
  if (challengeId) {
    const { data: chal } = await supabase
      .from("innovation_challenges")
      .select(`
        id, title, problem_statement, category, problem_category, geographic_scope,
        complexity_score, required_domains, required_expertise, objectives,
        expected_outcomes, constraints, success_criteria, status, approved_at,
        created_at,
        approver_profile:profiles!innovation_challenges_approved_by_fkey(full_name)
      `)
      .eq("id", challengeId)
      .maybeSingle();

    challengeRecord = chal;
  }

interface ControlCenterInstitution {
  id: string;
  name: string;
  acronym?: string | null;
  institution_type?: string | null;
  city?: string | null;
  state?: string | null;
  website_url?: string | null;
  research_domains?: string[] | null;
  facilities?: string[] | null;
  specializations?: string[] | null;
  created_at?: string;
}

interface ControlCenterProject {
  id: string;
  challenge_id: string;
  institution_id: string;
  project_title: string;
  project_summary?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  institution?: ControlCenterInstitution | null;
  project_lead?: { id: string; full_name?: string | null; email?: string | null } | null;
}

interface ControlCenterMember {
  id: string;
  project_id: string;
  profile_id?: string | null;
  role?: string | null;
  role_title?: string | null;
  designation?: string | null;
  member_name?: string | null;
  member_email?: string | null;
  member_type?: string | null;
  department?: string | null;
  organization?: string | null;
  academic_program?: string | null;
  academic_year?: string | null;
  specialization?: string | null;
  primary_expertise?: string | null;
  research_areas?: string[] | null;
  technical_skills?: string[] | null;
  project_responsibility?: string | null;
  project_contribution?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  is_active: boolean;
  joined_at?: string;
  profile?: { id: string; full_name?: string | null; email?: string | null } | null;
}

interface ControlCenterProposal {
  id: string;
  challenge_id: string;
  project_id: string;
  institution_id: string;
  version_number: number;
  status: ProposalStatus;
  is_current: boolean;
  project_objective?: string | null;
  proposed_methodology?: string | null;
  technical_approach?: string | null;
  expected_prototype?: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_feedback: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ControlCenterActivity {
  id: string;
  project_id: string;
  activity_type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  actor?: { id: string; full_name?: string | null; email?: string | null } | null;
}

  // 3. If challenge exists, query related entities in parallel
  let matchRun = null;
  let topMatches: ProblemControlCenterData["matching"]["topMatches"] = [];
  const rawMatchesMap = new Map<string, {
    overall_score: number;
    structured_score: number;
    ai_score?: number | null;
    recommended_role?: string | null;
    strengths?: string[] | null;
    concerns?: string[] | null;
    rank?: number | null;
  }>();
  let selections: { institution_id: string; selected_at: string; institution: ControlCenterInstitution | null }[] = [];
  let invitations: { id: string; institution_id: string; status: string; invited_at: string; responded_at: string | null; institution: ControlCenterInstitution | null }[] = [];
  let projects: ControlCenterProject[] = [];
  let members: ControlCenterMember[] = [];
  let proposals: ControlCenterProposal[] = [];
  let activities: ControlCenterActivity[] = [];

  if (challengeId) {
    const [
      matchRunRes,
      selectionsRes,
      invitationsRes,
      projectsRes,
      proposalsRes,
    ] = await Promise.all([
      supabase
        .from("institution_match_runs")
        .select("id, algorithm_version, ai_model_version, eligible_candidates_count, top_10_institution_ids, created_at")
        .eq("challenge_id", challengeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("challenge_institution_selections")
        .select(`
          institution_id, selected_at,
          institution:institutions(id, name, acronym, institution_type, city, state, website_url, research_domains, facilities, specializations)
        `)
        .eq("challenge_id", challengeId),

      supabase
        .from("institution_invitations")
        .select(`
          id, institution_id, status, invited_at, responded_at,
          institution:institutions(id, name, acronym, institution_type, city, state, website_url, research_domains, facilities, specializations)
        `)
        .eq("challenge_id", challengeId),

      supabase
        .from("challenge_projects")
        .select(`
          id, challenge_id, institution_id, project_title, project_summary, status, created_at, updated_at,
          institution:institutions(id, name, acronym, institution_type, city, state, website_url, research_domains, facilities, specializations),
          project_lead:profiles!challenge_projects_project_lead_profile_id_fkey(id, full_name, email)
        `)
        .eq("challenge_id", challengeId),

      supabase
        .from("research_proposals")
        .select(`
          id, challenge_id, project_id, institution_id, version_number, status, is_current,
          project_objective, proposed_methodology, technical_approach, expected_prototype,
          submitted_at, reviewed_at, review_feedback, approved_at, created_at, updated_at
        `)
        .eq("challenge_id", challengeId)
        .order("version_number", { ascending: false }),
    ]);

    matchRun = matchRunRes.data || null;
    selections = (selectionsRes.data as unknown as { institution_id: string; selected_at: string; institution: ControlCenterInstitution | null }[]) || [];
    invitations = (invitationsRes.data as unknown as { id: string; institution_id: string; status: string; invited_at: string; responded_at: string | null; institution: ControlCenterInstitution | null }[]) || [];
    projects = (projectsRes.data as unknown as ControlCenterProject[]) || [];
    proposals = (proposalsRes.data as unknown as ControlCenterProposal[]) || [];

    // Fetch members and activity for projects
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      const [membersRes, activityRes] = await Promise.all([
        supabase
          .from("challenge_project_members")
          .select(`
            id, project_id, profile_id, member_name, member_email, member_type, role, role_title,
            designation, department, organization, academic_program, academic_year, specialization,
            primary_expertise, research_areas, technical_skills, project_responsibility,
            project_contribution, linkedin_url, website_url, is_active, joined_at,
            profile:profiles(id, full_name, email)
          `)
          .in("project_id", projectIds),

        supabase
          .from("challenge_project_activity")
          .select(`
            id, project_id, activity_type, description, metadata, created_at,
            actor:profiles(id, full_name, email)
          `)
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      members = (membersRes.data as unknown as ControlCenterMember[]) || [];
      activities = (activityRes.data as unknown as ControlCenterActivity[]) || [];
    }

    // If matchRun exists, fetch matching recommendations
    if (matchRun) {
      const { data: matchesData } = await supabase
        .from("institution_matches")
        .select(`
          institution_id, rank, overall_score, structured_score, ai_score,
          confidence, recommended_role, strengths, concerns,
          institution:institutions(id, name, acronym)
        `)
        .eq("match_run_id", matchRun.id)
        .order("rank", { ascending: true });

      if (matchesData) {
        const selectedIdSet = new Set(selections.map((s) => s.institution_id));
        const invitationMap = new Map(invitations.map((inv) => [inv.institution_id, inv.status]));

        matchesData.forEach((m) => {
          rawMatchesMap.set(m.institution_id, {
            overall_score: Number(m.overall_score),
            structured_score: Number(m.structured_score),
            ai_score: m.ai_score ? Number(m.ai_score) : null,
            recommended_role: m.recommended_role,
            strengths: Array.isArray(m.strengths) ? m.strengths : [],
            concerns: Array.isArray(m.concerns) ? m.concerns : [],
            rank: m.rank,
          });
        });

        topMatches = (matchesData as {
          institution_id: string;
          overall_score: number;
          structured_score: number;
          ai_score?: number | null;
          recommended_role?: string | null;
          strengths?: string[] | null;
          rank?: number | null;
          institution?: { name?: string | null; acronym?: string | null } | null;
        }[]).map((m, idx: number) => ({
          institutionId: m.institution_id,
          institutionName: m.institution?.name || "Institution",
          institutionAcronym: m.institution?.acronym ?? null,
          overallScore: Number(m.overall_score),
          structuredScore: Number(m.structured_score),
          aiSemanticScore: Number(m.ai_score || 0),
          recommendedRole: m.recommended_role || "Research Partner",
          topStrengths: Array.isArray(m.strengths) ? m.strengths : [],
          isSelected: selectedIdSet.has(m.institution_id),
          invitationStatus: (invitationMap.get(m.institution_id) as string) || null,
          rank: m.rank || (idx + 1),
        }));
      }
    }
  }

  // 4. Build institutions map and tracks
  const institutionsMap = new Map<string, ControlCenterInstitution>();

  // Collect institutions from selections, invitations, projects
  selections.forEach((s) => {
    if (s.institution) institutionsMap.set(s.institution_id, s.institution);
  });
  invitations.forEach((inv) => {
    if (inv.institution) institutionsMap.set(inv.institution_id, inv.institution);
  });
  projects.forEach((p) => {
    if (p.institution) institutionsMap.set(p.institution_id, p.institution);
  });

  const institutionTracks: InstitutionLifecycleTrack[] = Array.from(institutionsMap.values()).map(
    (inst) => {
      const sel = selections.find((s) => s.institution_id === inst.id);
      const inv = invitations.find((i) => i.institution_id === inst.id);
      const proj = projects.find((p) => p.institution_id === inst.id);
      const projMembers = proj ? members.filter((m) => m.project_id === proj.id && m.is_active) : [];
      const instProposals = proposals.filter((pr) => pr.institution_id === inst.id || (proj && pr.project_id === proj.id));
      const currentProp = instProposals.find((pr) => pr.is_current) || instProposals[0] || null;

      const lifecycle = deriveInstitutionLifecycle(
        inv ? (inv.status as "PENDING" | "SENT" | "ACCEPTED" | "DECLINED") : null,
        Boolean(proj),
        projMembers.length,
        currentProp
          ? {
              status: currentProp.status,
              version_number: currentProp.version_number,
            }
          : null
      );

      const latestDate =
        currentProp?.submitted_at ||
        currentProp?.updated_at ||
        proj?.updated_at ||
        inv?.responded_at ||
        inv?.invited_at ||
        sel?.selected_at ||
        inst.created_at ||
        new Date().toISOString();

      // Build scoped timeline strictly for this institution
      const scopedTimeline: InstitutionLifecycleTrack["scopedTimeline"] = [];

      if (sel) {
        scopedTimeline.push({
          id: `inst-sel-${inst.id}`,
          timestamp: sel.selected_at,
          title: "Institution Selected for Challenge Outreach",
          description: `${inst.name} selected as a priority research collaborator.`,
          actorName: "Innovation Manager",
          category: "INVITATION",
        });
      }

      if (inv) {
        scopedTimeline.push({
          id: `inst-inv-${inv.id}`,
          timestamp: inv.invited_at,
          title: `Collaboration Invitation Dispatched`,
          description: `Formal municipal co-development invitation sent to ${inst.name}.`,
          actorName: "Innovation Manager",
          category: "INVITATION",
        });

        if (inv.responded_at && inv.status === "ACCEPTED") {
          scopedTimeline.push({
            id: `inst-inv-acc-${inv.id}`,
            timestamp: inv.responded_at,
            title: `Invitation Accepted`,
            description: `${inst.name} accepted the invitation and activated its research participation.`,
            actorName: `${inst.name} Coordinator`,
            category: "INVITATION",
          });
        }
      }

      if (proj) {
        scopedTimeline.push({
          id: `inst-proj-${proj.id}`,
          timestamp: proj.created_at,
          title: `Research Project Workspace Created`,
          description: `Workspace "${proj.project_title}" provisioned with Lead ${proj.project_lead?.full_name || "Assigned Coordinator"}.`,
          actorName: proj.project_lead?.full_name || "Project Lead",
          category: "PROJECT",
        });

        // Project activities strictly for this project
        const projActivities = activities.filter((a) => a.project_id === proj.id);
        projActivities.forEach((act) => {
          let cat: "PROJECT" | "TEAM" | "PROPOSAL" = "PROJECT";
          if (act.activity_type?.includes("PROPOSAL")) cat = "PROPOSAL";
          if (act.activity_type?.includes("MEMBER") || act.activity_type?.includes("TEAM")) cat = "TEAM";

          scopedTimeline.push({
            id: `inst-act-${act.id}`,
            timestamp: act.created_at,
            title: act.activity_type?.replace(/_/g, " ") || "Project Activity",
            description: act.description || "Project operational milestone recorded.",
            actorName: act.actor?.full_name || "Project Member",
            category: cat,
          });
        });
      }

      instProposals.forEach((prop) => {
        if (prop.submitted_at) {
          scopedTimeline.push({
            id: `inst-prop-sub-${prop.id}`,
            timestamp: prop.submitted_at,
            title: `Research Proposal v${prop.version_number} Submitted`,
            description: `Technical proposal submitted for municipal evaluation (Status: ${prop.status}).`,
            actorName: proj?.project_lead?.full_name || "Project Lead",
            category: "PROPOSAL",
          });
        }
        if (prop.reviewed_at) {
          scopedTimeline.push({
            id: `inst-prop-rev-${prop.id}`,
            timestamp: prop.reviewed_at,
            title: `Proposal v${prop.version_number} Evaluated`,
            description: prop.review_feedback || `Status set to ${prop.status}.`,
            actorName: "Innovation Manager",
            category: "PROPOSAL",
          });
        }
      });

      // Sort scoped timeline newest first
      scopedTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Build scoped updates feed
      const scopedUpdates: InstitutionLifecycleTrack["scopedUpdates"] = scopedTimeline.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        title: item.title,
        description: item.description,
        actorName: item.actorName,
        type: item.category,
      }));

      // Match evidence
      const rawMatch = rawMatchesMap.get(inst.id);
      const matchEvidence: InstitutionLifecycleTrack["matchEvidence"] = rawMatch
        ? {
            overallScore: rawMatch.overall_score,
            structuredScore: rawMatch.structured_score,
            aiSemanticScore: Number(rawMatch.ai_score || 0),
            rank: rawMatch.rank || 1,
            recommendedRole: rawMatch.recommended_role || "Research Partner",
            topStrengths: rawMatch.strengths || [],
            gaps: rawMatch.concerns || [],
            whyRecommended: `Strong technical domain and institutional infrastructure alignment for ${inst.name}.`,
          }
        : null;

      return {
        institutionId: inst.id,
        institutionName: inst.name,
        institutionAcronym: inst.acronym ?? null,
        institutionType: inst.institution_type ?? null,
        city: inst.city ?? null,
        state: inst.state ?? null,
        websiteUrl: inst.website_url ?? null,
        researchDomains: Array.isArray(inst.research_domains) ? inst.research_domains : [],
        facilities: Array.isArray(inst.facilities) ? inst.facilities : [],
        specializations: Array.isArray(inst.specializations) ? inst.specializations : [],

        isSelected: Boolean(sel),
        selectedAt: sel?.selected_at ?? null,
        invitationId: inv?.id ?? null,
        invitationStatus: (inv?.status as "PENDING" | "SENT" | "ACCEPTED" | "DECLINED") ?? null,
        invitedAt: inv?.invited_at ?? null,
        respondedAt: inv?.responded_at ?? null,

        projectId: proj?.id ?? null,
        projectTitle: proj?.project_title ?? null,
        projectSummary: proj?.project_summary ?? null,
        projectStatus: proj?.status ?? null,
        projectLeadName: proj?.project_lead?.full_name ?? null,
        projectLeadEmail: proj?.project_lead?.email ?? null,

        teamMembersCount: projMembers.length,
        teamMembers: projMembers.map((m) => ({
          id: m.id,
          profileId: m.profile_id ?? null,
          memberName: m.profile?.full_name || m.member_name || "Team Member",
          memberEmail: m.profile?.email || m.member_email || null,
          memberType: m.member_type ?? null,
          role: m.role || "MEMBER",
          designation: m.designation || m.role_title || null,
          department: m.department ?? null,
          organization: m.organization ?? null,
          academicProgram: m.academic_program ?? null,
          academicYear: m.academic_year ?? null,
          specialization: m.specialization ?? null,
          primaryExpertise: m.primary_expertise ?? null,
          researchAreas: Array.isArray(m.research_areas) ? m.research_areas : [],
          technicalSkills: Array.isArray(m.technical_skills) ? m.technical_skills : [],
          projectResponsibility: m.project_responsibility ?? null,
          projectContribution: m.project_contribution ?? null,
          linkedinUrl: m.linkedin_url ?? null,
          websiteUrl: m.website_url ?? null,
          isActive: m.is_active,
          joinedAt: m.joined_at,
        })),

        proposalId: currentProp?.id ?? null,
        proposalVersion: currentProp?.version_number ?? null,
        proposalStatus: currentProp?.status ?? null,
        proposalSubmittedAt: currentProp?.submitted_at ?? null,
        proposalReviewedAt: currentProp?.reviewed_at ?? null,
        proposalReviewFeedback: currentProp?.review_feedback ?? null,
        proposals: instProposals.map((pr) => ({
          id: pr.id,
          versionNumber: pr.version_number,
          status: pr.status,
          isCurrent: pr.is_current,
          projectObjective: pr.project_objective || "",
          proposedMethodology: pr.proposed_methodology ?? null,
          technicalApproach: pr.technical_approach ?? null,
          expectedPrototype: pr.expected_prototype ?? null,
          submittedAt: pr.submitted_at ?? null,
          reviewedAt: pr.reviewed_at ?? null,
          reviewFeedback: pr.review_feedback ?? null,
          approvedAt: pr.approved_at ?? null,
          createdAt: pr.created_at,
        })),

        scopedTimeline,
        scopedUpdates,
        matchEvidence,

        lifecycleStage: lifecycle.stage,
        lifecycleLabel: lifecycle.label,
        actionRequired: lifecycle.actionRequired,
        actionRequiredMessage: lifecycle.actionRequiredMessage,
        lastActivityAt: latestDate,
        lastActivityDescription: `${lifecycle.label} • ${formatElapsedWaitingTime(latestDate)} ago`,
      };
    }
  );

  // 5. Aggregate metrics
  const institutionsSelectedCount = institutionsMap.size;
  const invitationsSentCount = invitations.filter((inv) => inv.status === "SENT" || inv.status === "PENDING").length;
  const institutionsAcceptedCount = invitations.filter((inv) => inv.status === "ACCEPTED").length;
  const projectsActiveCount = projects.filter((p) => p.status !== "ARCHIVED").length;
  const teamsFormedCount = projects.filter((p) => {
    const count = members.filter((m) => m.project_id === p.id && m.is_active).length;
    return count >= 2;
  }).length;
  const currentProposals = proposals.filter((pr) => pr.is_current);
  const proposalsAwaitingReviewList = currentProposals.filter(
    (pr) => pr.status === "SUBMITTED" || pr.status === "RESUBMITTED"
  );
  const proposalsApprovedCount = currentProposals.filter((pr) => pr.status === "APPROVED").length;

  const stageObj = deriveProblemStage(
    challengeRecord,
    invitations.length,
    institutionsAcceptedCount,
    projectsActiveCount,
    teamsFormedCount,
    currentProposals.length,
    proposalsApprovedCount
  );

  // 6. Build timeline
  const timeline: ProblemControlCenterData["timeline"] = [];

  // Issue Classification event
  const decidedByProfile = issueData.decided_by_profile as { full_name?: string | null } | { full_name?: string | null }[] | null;
  const decidedByName = (Array.isArray(decidedByProfile) ? decidedByProfile[0]?.full_name : decidedByProfile?.full_name) || "Municipal Administrator";

  timeline.push({
    id: `issue-${issueData.id}`,
    timestamp: issueData.created_at,
    title: "Problem Classified as Complex",
    description: `Administrative classification: COMPLEX (${issueData.ai_complexity_score || 75}/100 complexity score).`,
    actorName: decidedByName,
    category: "CLASSIFICATION",
  });

  // Challenge approval event
  if (challengeRecord) {
    const approverProfile = challengeRecord.approver_profile as { full_name?: string | null } | { full_name?: string | null }[] | null;
    const approverName = (Array.isArray(approverProfile) ? approverProfile[0]?.full_name : approverProfile?.full_name) || "Innovation Manager";

    timeline.push({
      id: `challenge-${challengeRecord.id}`,
      timestamp: challengeRecord.approved_at || challengeRecord.created_at,
      title: "Innovation Challenge Formulated & Approved",
      description: `Challenge "${challengeRecord.title}" approved for institution matching.`,
      actorName: approverName,
      category: "CHALLENGE",
    });
  }

  // Matching run event
  if (matchRun) {
    timeline.push({
      id: `matching-${matchRun.id}`,
      timestamp: matchRun.created_at,
      title: "Institution Matching Run Completed",
      description: `Screened ${matchRun.eligible_candidates_count || 0} accredited institutions; identified ${topMatches.length} matches.`,
      actorName: "CivicFix AI Matching Engine",
      category: "MATCHING",
    });
  }

  // Invitation events
  invitations.forEach((inv) => {
    timeline.push({
      id: `inv-${inv.id}`,
      timestamp: inv.invited_at,
      title: `Invitation Sent to ${inv.institution?.name || "Institution"}`,
      description: `Collaboration invitation dispatched for this innovation challenge.`,
      actorName: "Innovation Manager",
      category: "INVITATION",
    });

    if (inv.responded_at && inv.status === "ACCEPTED") {
      timeline.push({
        id: `inv-acc-${inv.id}`,
        timestamp: inv.responded_at,
        title: `${inv.institution?.name || "Institution"} Accepted Invitation`,
        description: `Institution officially joined this civic challenge and initiated research workspace.`,
        actorName: inv.institution?.name || "Institution Coordinator",
        category: "INVITATION",
      });
    }
  });

  // Project activities
  activities.forEach((act) => {
    let cat: ProblemControlCenterData["timeline"][0]["category"] = "PROJECT";
    if (act.activity_type?.includes("PROPOSAL")) cat = "PROPOSAL";
    if (act.activity_type?.includes("MEMBER") || act.activity_type?.includes("TEAM")) cat = "TEAM";

    timeline.push({
      id: `act-${act.id}`,
      timestamp: act.created_at,
      title: act.activity_type?.replace(/_/g, " ") || "Project Activity",
      description: act.description || "Project operational update recorded.",
      actorName: act.actor?.full_name || "Project Lead",
      category: cat,
    });
  });

  // Sort timeline newest first
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const pipeline = [
    {
      key: "PROBLEM_CLASSIFIED",
      label: "Problem Classified",
      stepNumber: 1,
      status: "COMPLETED" as const,
      isCurrent: stageObj.stepNumber === 1,
      description: "Admin classified grievance as COMPLEX",
    },
    {
      key: "CHALLENGE_FORMULATED",
      label: "Challenge Formulated",
      stepNumber: 2,
      status: (challengeRecord ? "COMPLETED" : "IN_PROGRESS") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 2,
      description: challengeRecord ? "Challenge formulated & approved" : "Challenge formulation required",
    },
    {
      key: "MATCHING_ACTIVE",
      label: "Institution Matching",
      stepNumber: 3,
      status: (matchRun ? "COMPLETED" : challengeRecord ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 3,
      description: matchRun ? "AI matching run completed" : "Run institution matching",
    },
    {
      key: "INSTITUTIONS_SELECTED",
      label: "Institutions Selected",
      stepNumber: 4,
      status: (institutionsSelectedCount > 0 ? "COMPLETED" : matchRun ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 4,
      description: institutionsSelectedCount > 0 ? `${institutionsSelectedCount} institutions selected` : "Select institutions",
    },
    {
      key: "INVITATIONS_SENT",
      label: "Invitations Sent",
      stepNumber: 5,
      status: (invitationsSentCount > 0 ? "COMPLETED" : institutionsSelectedCount > 0 ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 5,
      description: invitationsSentCount > 0 ? `${invitationsSentCount} invitations dispatched` : "Dispatch invitations",
    },
    {
      key: "INVITATIONS_ACCEPTED",
      label: "Invitations Accepted",
      stepNumber: 6,
      status: (institutionsAcceptedCount > 0 ? "COMPLETED" : invitationsSentCount > 0 ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 6,
      description: institutionsAcceptedCount > 0 ? `${institutionsAcceptedCount} institutions confirmed` : "Awaiting university responses",
    },
    {
      key: "PROJECT_CREATED",
      label: "Project Workspaces",
      stepNumber: 7,
      status: (projectsActiveCount > 0 ? "COMPLETED" : institutionsAcceptedCount > 0 ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 7,
      description: projectsActiveCount > 0 ? `${projectsActiveCount} workspaces established` : "Institutions establish workspaces",
    },
    {
      key: "TEAM_FORMED",
      label: "Research Teams",
      stepNumber: 8,
      status: (teamsFormedCount > 0 ? "COMPLETED" : projectsActiveCount > 0 ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 8,
      description: teamsFormedCount > 0 ? `${teamsFormedCount} multidisciplinary teams staffed` : "Academic staff & researchers assigned",
    },
    {
      key: "PROPOSAL_SUBMITTED",
      label: "Research Proposals",
      stepNumber: 9,
      status: (currentProposals.length > 0 ? (proposalsApprovedCount > 0 ? "COMPLETED" : "IN_PROGRESS") : teamsFormedCount > 0 ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 9,
      description: currentProposals.length > 0 ? `${currentProposals.length} proposal(s) submitted` : "Teams prepare technical proposals",
    },
    {
      key: "PROPOSAL_APPROVED",
      label: "Proposal Approved",
      stepNumber: 10,
      status: (proposalsApprovedCount > 0 ? "COMPLETED" : currentProposals.length > 0 ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FUTURE",
      isCurrent: stageObj.stepNumber === 10,
      description: proposalsApprovedCount > 0 ? `${proposalsApprovedCount} solution approved by manager` : "Manager evaluation & approval",
    },
  ];

  const proposalsList = proposals.map((pr) => {
    const inst = institutionsMap.get(pr.institution_id);
    const proj = projects.find((p) => p.id === pr.project_id);
    return {
      id: pr.id,
      institutionName: inst?.name || "Institution",
      projectTitle: proj?.project_title || "Research Project",
      versionNumber: pr.version_number,
      status: pr.status,
      isCurrent: Boolean(pr.is_current),
      submittedAt: pr.submitted_at ?? null,
      projectLeadName: proj?.project_lead?.full_name ?? null,
      objectiveSummary: pr.project_objective ?? null,
    };
  });

  const statsObj = {
    complexityScore: issueData.ai_complexity_score || challengeRecord?.complexity_score || 85,
    complexityConfidence: issueData.ai_classification_confidence || 92,
    institutionsSelectedCount,
    invitationsSentCount,
    institutionsAcceptedCount,
    projectsActiveCount,
    teamsFormedCount,
    proposalsCount: currentProposals.length,
    proposalsAwaitingReviewCount: proposalsAwaitingReviewList.length,
    proposalsApprovedCount,
  };

  const actionReqObj = {
    needsAction: proposalsAwaitingReviewList.length > 0 || !challengeRecord,
    proposalsAwaitingReviewCount: proposalsAwaitingReviewList.length,
    proposalsAwaitingReviewList: proposalsAwaitingReviewList.map((pr) => {
      const inst = institutionsMap.get(pr.institution_id);
      const proj = projects.find((p) => p.id === pr.project_id);
      return {
        id: pr.id,
        institutionName: inst?.name || "Institution",
        projectTitle: proj?.project_title || "Research Project",
        versionNumber: pr.version_number,
        status: pr.status,
        submittedAt: pr.submitted_at ?? null,
      };
    }),
  };

  const problemObj = {
    id: issueData.id,
    title: issueData.title,
    description: issueData.description,
    category: issueData.category,
    geographicScope: challengeRecord?.geographic_scope || "Citywide",
    addressText: issueData.address_text || null,
    locationText: issueData.location_text || null,
    status: issueData.status,
    finalIssueType: issueData.final_issue_type || "COMPLEX",
    aiComplexityScore: issueData.ai_complexity_score ?? 85,
    complexityConfidence: issueData.ai_classification_confidence ?? 0.92,
    approvedRootCause:
      typeof issueData.ai_complexity_factors === "object" &&
      issueData.ai_complexity_factors !== null &&
      "root_cause" in issueData.ai_complexity_factors
        ? String((issueData.ai_complexity_factors as Record<string, unknown>).root_cause)
        : null,
    whyComplex: issueData.ai_complexity_reasoning ?? null,
    requiredExpertise: Array.isArray(issueData.ai_required_expertise) ? issueData.ai_required_expertise : [],
    aiSummary: issueData.ai_complexity_reasoning ?? null,
    reporterName:
      issueData.reporter_profile && typeof issueData.reporter_profile === "object" && "full_name" in issueData.reporter_profile
        ? (issueData.reporter_profile as { full_name?: string | null }).full_name ?? null
        : null,
    createdAt: issueData.created_at,
    images: Array.isArray(issueData.issue_images) ? issueData.issue_images : [],
  };

  return {
    problemId,
    problem: problemObj,
    issue: {
      ...problemObj,
      images: problemObj.images.map((img) => ({
        id: img.id,
        storagePath: img.storage_path,
        imageType: img.image_type || "INITIAL_REPORT",
      })),
      aiComplexityConfidence: issueData.ai_classification_confidence ?? null,
      aiComplexityReasoning: issueData.ai_complexity_reasoning ?? null,
      aiRootCause:
        typeof issueData.ai_complexity_factors === "object" &&
        issueData.ai_complexity_factors !== null &&
        "root_cause" in issueData.ai_complexity_factors
          ? String((issueData.ai_complexity_factors as Record<string, unknown>).root_cause)
          : null,
      aiComplexityFactors: Array.isArray(issueData.ai_complexity_factors)
        ? (issueData.ai_complexity_factors as string[])
        : [],
      aiRequiredExpertise: Array.isArray(issueData.ai_required_expertise)
        ? issueData.ai_required_expertise
        : [],
      aiOperationalResolvability: null,
      aiKnownSopAvailability: null,
      classificationDecidedBy:
        issueData.decided_by_profile && typeof issueData.decided_by_profile === "object" && "full_name" in issueData.decided_by_profile
          ? (issueData.decided_by_profile as { full_name?: string | null }).full_name ?? null
          : null,
    },
    challenge: challengeRecord
      ? {
          id: challengeRecord.id,
          title: challengeRecord.title,
          problemStatement: challengeRecord.problem_statement,
          category: challengeRecord.problem_category || challengeRecord.category || "Municipal Innovation",
          geographicScope: challengeRecord.geographic_scope || "Citywide",
          complexityScore: challengeRecord.complexity_score || 85,
          requiredDomains: Array.isArray(challengeRecord.required_domains)
            ? challengeRecord.required_domains
            : [],
          requiredExpertise: Array.isArray(challengeRecord.required_expertise)
            ? challengeRecord.required_expertise
            : [],
          objectives: Array.isArray(challengeRecord.objectives)
            ? challengeRecord.objectives
            : [],
          expectedOutcomes: Array.isArray(challengeRecord.expected_outcomes)
            ? challengeRecord.expected_outcomes
            : [],
          constraints: Array.isArray(challengeRecord.constraints)
            ? challengeRecord.constraints
            : [],
          successCriteria: Array.isArray(challengeRecord.success_criteria)
            ? challengeRecord.success_criteria
            : [],
          status: challengeRecord.status,
          approvedAt: challengeRecord.approved_at ?? null,
          approverName:
            challengeRecord.approver_profile && typeof challengeRecord.approver_profile === "object" && "full_name" in challengeRecord.approver_profile
              ? (challengeRecord.approver_profile as { full_name?: string | null }).full_name ?? null
              : null,
          createdAt: challengeRecord.created_at,
        }
      : null,

    stats: statsObj,
    metrics: statsObj,

    pipeline,
    currentPipelineStage: stageObj,

    actionRequired: actionReqObj,
    actionRequiredQueue: {
      proposalsAwaitingReview: proposalsAwaitingReviewList.map((pr) => {
        const inst = institutionsMap.get(pr.institution_id);
        const dateToUse = pr.submitted_at || pr.updated_at || pr.created_at;
        return {
          proposalId: pr.id,
          institutionName: inst?.name || "Institution",
          versionNumber: pr.version_number,
          status: pr.status,
          submittedAt: pr.submitted_at ?? null,
          elapsedWaiting: formatElapsedWaitingTime(dateToUse),
        };
      }),
      needsMatching: Boolean(challengeRecord && challengeRecord.status === "APPROVED" && institutionsMap.size === 0),
      needsOutreach: Boolean(challengeRecord && selections.length > 0 && invitations.length === 0),
    },

    institutions: institutionTracks,
    matching: {
      lastRunAt: matchRun?.created_at ?? null,
      modelUsed: matchRun ? (matchRun.ai_model_version || matchRun.algorithm_version || "CivicFix AI Matching") : null,
      eligibleCount: matchRun?.eligible_candidates_count ?? 0,
      matchesCount: topMatches.length,
      topMatches,
    },

    proposals: proposalsList,
    timeline,
  };
}

export interface UniversityWorkspaceData {
  problem: ProblemControlCenterData["problem"];
  challenge: ProblemControlCenterData["challenge"];
  institution: InstitutionLifecycleTrack;
  allInstitutionsCount: number;
}

/**
 * Fetch dedicated workspace data for a single university participating in a complex civic problem.
 * Guarantees that only this university's participation, project, team, proposals, and activity are returned.
 */
export async function fetchUniversityWorkspaceData(
  problemId: string,
  institutionId: string
): Promise<UniversityWorkspaceData | null> {
  const controlCenterData = await fetchProblemControlCenterData(problemId);
  const instTrack = controlCenterData.institutions.find(
    (i) => i.institutionId === institutionId
  );
  if (!instTrack) {
    return null;
  }
  return {
    problem: controlCenterData.problem,
    challenge: controlCenterData.challenge,
    institution: instTrack,
    allInstitutionsCount: controlCenterData.institutions.length,
  };
}
