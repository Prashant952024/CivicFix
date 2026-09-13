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
export function getProposalStatusLabel(status: ProposalStatus): string {
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
