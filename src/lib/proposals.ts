import { supabase } from "@/lib/supabase";
import type {
  Database,
  ResearchProposalRow,
  ResearchProposalInsert,
  ResearchProposalUpdate,
  ProposalStatus,
  ProposalMilestone,
  ProposalDeliverable,
  ProposalRisk,
  ProposalMetric,
  ProposalResource,
  ChallengeProjectRow,
  InstitutionRow,
} from "@/types/database";

export type {
  ProposalStatus,
  ProposalMilestone,
  ProposalDeliverable,
  ProposalRisk,
  ProposalMetric,
  ProposalResource,
};

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface ResearchProposalWithDetails extends ResearchProposalRow {
  challenge?: Pick<
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
  > | null;
  institution?: Pick<
    InstitutionRow,
    "id" | "name" | "official_name" | "institution_type" | "city" | "state" | "acronym"
  > | null;
  project?: Pick<
    ChallengeProjectRow,
    "id" | "project_title" | "project_summary" | "status" | "project_lead_profile_id"
  > | null;
  submitter?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  reviewer?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  approver?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  project_lead?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  team_members_count?: number;
}

export interface ResearchProposalInput {
  project_objective: string;
  research_questions: string[];
  proposed_methodology: string;
  technical_approach: string;
  team_capability_summary?: string;
  required_resources: ProposalResource[];
  expected_prototype: string;
  milestones: ProposalMilestone[];
  deliverables: ProposalDeliverable[];
  risks_and_mitigation: ProposalRisk[];
  success_metrics: ProposalMetric[];
}

export interface ProposalCompletenessStatus {
  isComplete: boolean;
  score: number; // 0 - 100
  missingSections: string[];
  checklist: {
    objective: boolean;
    researchQuestions: boolean;
    methodology: boolean;
    technicalApproach: boolean;
    resources: boolean;
    prototype: boolean;
    milestones: boolean;
    deliverables: boolean;
    risks: boolean;
    successMetrics: boolean;
  };
}

/**
 * Check if a research proposal has satisfied all completeness invariants
 */
export function checkProposalCompleteness(
  proposal: Partial<ResearchProposalRow> | Partial<ResearchProposalInput>
): ProposalCompletenessStatus {
  const objective = Boolean(
    proposal.project_objective && proposal.project_objective.trim().length >= 20
  );

  const rawQuestions = proposal.research_questions;
  const questionsCount = Array.isArray(rawQuestions) ? rawQuestions.length : 0;
  const researchQuestions = questionsCount >= 1;

  const methodology = Boolean(
    proposal.proposed_methodology && proposal.proposed_methodology.trim().length >= 20
  );

  const technicalApproach = Boolean(
    proposal.technical_approach && proposal.technical_approach.trim().length >= 20
  );

  const rawResources = proposal.required_resources;
  const resourcesCount = Array.isArray(rawResources) ? rawResources.length : 0;
  const resources = resourcesCount >= 1;

  const prototype = Boolean(
    proposal.expected_prototype && proposal.expected_prototype.trim().length >= 10
  );

  const rawMilestones = proposal.milestones;
  const milestonesCount = Array.isArray(rawMilestones) ? rawMilestones.length : 0;
  const milestones = milestonesCount >= 1;

  const rawDeliverables = proposal.deliverables;
  const deliverablesCount = Array.isArray(rawDeliverables) ? rawDeliverables.length : 0;
  const deliverables = deliverablesCount >= 1;

  const rawRisks = proposal.risks_and_mitigation;
  const risksCount = Array.isArray(rawRisks) ? rawRisks.length : 0;
  const risks = risksCount >= 1;

  const rawMetrics = proposal.success_metrics;
  const metricsCount = Array.isArray(rawMetrics) ? rawMetrics.length : 0;
  const successMetrics = metricsCount >= 1;

  const checklist = {
    objective,
    researchQuestions,
    methodology,
    technicalApproach,
    resources,
    prototype,
    milestones,
    deliverables,
    risks,
    successMetrics,
  };

  const missingSections: string[] = [];
  if (!objective) missingSections.push("Project Objective (min 20 chars)");
  if (!researchQuestions) missingSections.push("Research Questions (at least 1 question)");
  if (!methodology) missingSections.push("Proposed Methodology (min 20 chars)");
  if (!technicalApproach) missingSections.push("Technical Approach (min 20 chars)");
  if (!resources) missingSections.push("Required Resources (at least 1 resource)");
  if (!prototype) missingSections.push("Expected Prototype (min 10 chars)");
  if (!milestones) missingSections.push("Timeline & Milestones (at least 1 milestone)");
  if (!deliverables) missingSections.push("Deliverables (at least 1 deliverable)");
  if (!risks) missingSections.push("Risks & Mitigation (at least 1 entry)");
  if (!successMetrics) missingSections.push("Success Metrics (at least 1 metric)");

  const totalCriteria = Object.keys(checklist).length;
  const metCriteria = Object.values(checklist).filter(Boolean).length;
  const score = Math.round((metCriteria / totalCriteria) * 100);

  return {
    isComplete: missingSections.length === 0,
    score,
    missingSections,
    checklist,
  };
}

/**
 * Fetch all proposal versions for a project workspace
 */
export async function fetchProjectProposals(
  projectId: string
): Promise<ResearchProposalWithDetails[]> {
  const { data, error } = await supabase
    .from("research_proposals")
    .select(`
      *,
      challenge:innovation_challenges!research_proposals_challenge_id_fkey(
        id, title, problem_statement, category, status, geographic_scope, required_domains, objectives, expected_outcomes
      ),
      institution:institutions!research_proposals_institution_id_fkey(
        id, name, official_name, institution_type, city, state, acronym
      ),
      project:challenge_projects!research_proposals_project_id_fkey(
        id, project_title, project_summary, status, project_lead_profile_id
      ),
      submitter:profiles!research_proposals_submitted_by_fkey(id, full_name, email),
      reviewer:profiles!research_proposals_reviewed_by_fkey(id, full_name, email),
      approver:profiles!research_proposals_approved_by_fkey(id, full_name, email)
    `)
    .eq("project_id", projectId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch project proposals: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch the active/current proposal version for a project
 */
export async function fetchCurrentProposal(
  projectId: string
): Promise<ResearchProposalWithDetails | null> {
  const { data, error } = await supabase
    .from("research_proposals")
    .select(`
      *,
      challenge:innovation_challenges!research_proposals_challenge_id_fkey(
        id, title, problem_statement, category, status, geographic_scope, required_domains, objectives, expected_outcomes
      ),
      institution:institutions!research_proposals_institution_id_fkey(
        id, name, official_name, institution_type, city, state, acronym
      ),
      project:challenge_projects!research_proposals_project_id_fkey(
        id, project_title, project_summary, status, project_lead_profile_id
      ),
      submitter:profiles!research_proposals_submitted_by_fkey(id, full_name, email),
      reviewer:profiles!research_proposals_reviewed_by_fkey(id, full_name, email),
      approver:profiles!research_proposals_approved_by_fkey(id, full_name, email)
    `)
    .eq("project_id", projectId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active proposal: ${error.message}`);
  }

  return (data) ?? null;
}

/**
 * Fetch a specific research proposal by ID
 */
export async function fetchProposalById(
  proposalId: string
): Promise<ResearchProposalWithDetails> {
  const { data, error } = await supabase
    .from("research_proposals")
    .select(`
      *,
      challenge:innovation_challenges!research_proposals_challenge_id_fkey(
        id, title, problem_statement, category, status, geographic_scope, required_domains, objectives, expected_outcomes
      ),
      institution:institutions!research_proposals_institution_id_fkey(
        id, name, official_name, institution_type, city, state, acronym
      ),
      project:challenge_projects!research_proposals_project_id_fkey(
        id, project_title, project_summary, status, project_lead_profile_id
      ),
      submitter:profiles!research_proposals_submitted_by_fkey(id, full_name, email),
      reviewer:profiles!research_proposals_reviewed_by_fkey(id, full_name, email),
      approver:profiles!research_proposals_approved_by_fkey(id, full_name, email)
    `)
    .eq("id", proposalId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch proposal details: ${error.message}`);
  }

  return data;
}

/**
 * Create a new initial research proposal draft for a project
 */
export async function createProposalDraft(
  projectId: string,
  input?: Partial<ResearchProposalInput>
): Promise<ResearchProposalRow> {
  // Fetch project to retrieve challenge_id and institution_id
  const { data: project, error: projError } = await supabase
    .from("challenge_projects")
    .select("id, challenge_id, institution_id")
    .eq("id", projectId)
    .single();

  if (projError || !project) {
    throw new Error(`Cannot create proposal: Project ${projectId} not found.`);
  }

  const insertPayload: ResearchProposalInsert = {
    project_id: projectId,
    challenge_id: project.challenge_id,
    institution_id: project.institution_id,
    version_number: 1,
    status: "DRAFT",
    is_current: true,
    project_objective: input?.project_objective ?? "",
    research_questions: input?.research_questions ?? [],
    proposed_methodology: input?.proposed_methodology ?? "",
    technical_approach: input?.technical_approach ?? "",
    team_capability_summary: input?.team_capability_summary ?? null,
    required_resources: input?.required_resources ?? [],
    expected_prototype: input?.expected_prototype ?? "",
    milestones: input?.milestones ?? [],
    deliverables: input?.deliverables ?? [],
    risks_and_mitigation: input?.risks_and_mitigation ?? [],
    success_metrics: input?.success_metrics ?? [],
  };

  const { data, error } = await supabase
    .from("research_proposals")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create proposal draft: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing proposal draft in place
 */
export async function updateProposalDraft(
  proposalId: string,
  updates: Partial<ResearchProposalInput>
): Promise<ResearchProposalRow> {
  const updatePayload: ResearchProposalUpdate = {};

  if (updates.project_objective !== undefined) {
    updatePayload.project_objective = updates.project_objective;
  }
  if (updates.research_questions !== undefined) {
    updatePayload.research_questions = updates.research_questions;
  }
  if (updates.proposed_methodology !== undefined) {
    updatePayload.proposed_methodology = updates.proposed_methodology;
  }
  if (updates.technical_approach !== undefined) {
    updatePayload.technical_approach = updates.technical_approach;
  }
  if (updates.team_capability_summary !== undefined) {
    updatePayload.team_capability_summary = updates.team_capability_summary;
  }
  if (updates.required_resources !== undefined) {
    updatePayload.required_resources = updates.required_resources;
  }
  if (updates.expected_prototype !== undefined) {
    updatePayload.expected_prototype = updates.expected_prototype;
  }
  if (updates.milestones !== undefined) {
    updatePayload.milestones = updates.milestones;
  }
  if (updates.deliverables !== undefined) {
    updatePayload.deliverables = updates.deliverables;
  }
  if (updates.risks_and_mitigation !== undefined) {
    updatePayload.risks_and_mitigation = updates.risks_and_mitigation;
  }
  if (updates.success_metrics !== undefined) {
    updatePayload.success_metrics = updates.success_metrics;
  }

  const { data, error } = await supabase
    .from("research_proposals")
    .update(updatePayload)
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update proposal draft: ${error.message}`);
  }

  return data;
}

/**
 * Submit a complete proposal for Innovation Manager review
 */
export async function submitProposal(
  proposalId: string,
  finalContent?: Partial<ResearchProposalInput>
): Promise<ResearchProposalRow> {
  // If final content passed, update first or perform in single update payload
  const updatePayload: ResearchProposalUpdate = {
    status: "SUBMITTED",
  };

  if (finalContent) {
    if (finalContent.project_objective !== undefined) {
      updatePayload.project_objective = finalContent.project_objective;
    }
    if (finalContent.research_questions !== undefined) {
      updatePayload.research_questions = finalContent.research_questions;
    }
    if (finalContent.proposed_methodology !== undefined) {
      updatePayload.proposed_methodology = finalContent.proposed_methodology;
    }
    if (finalContent.technical_approach !== undefined) {
      updatePayload.technical_approach = finalContent.technical_approach;
    }
    if (finalContent.team_capability_summary !== undefined) {
      updatePayload.team_capability_summary = finalContent.team_capability_summary;
    }
    if (finalContent.required_resources !== undefined) {
      updatePayload.required_resources = finalContent.required_resources;
    }
    if (finalContent.expected_prototype !== undefined) {
      updatePayload.expected_prototype = finalContent.expected_prototype;
    }
    if (finalContent.milestones !== undefined) {
      updatePayload.milestones = finalContent.milestones;
    }
    if (finalContent.deliverables !== undefined) {
      updatePayload.deliverables = finalContent.deliverables;
    }
    if (finalContent.risks_and_mitigation !== undefined) {
      updatePayload.risks_and_mitigation = finalContent.risks_and_mitigation;
    }
    if (finalContent.success_metrics !== undefined) {
      updatePayload.success_metrics = finalContent.success_metrics;
    }
  }

  const { data, error } = await supabase
    .from("research_proposals")
    .update(updatePayload)
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit proposal: ${error.message}`);
  }

  return data;
}

/**
 * Start review of a submitted research proposal (Innovation Manager action)
 */
export async function startProposalReview(
  proposalId: string
): Promise<ResearchProposalRow> {
  const { data, error } = await supabase
    .from("research_proposals")
    .update({
      status: "UNDER_REVIEW",
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start proposal review: ${error.message}`);
  }

  return data;
}

/**
 * Request revision for a research proposal with mandatory feedback (Innovation Manager action)
 */
export async function requestProposalRevision(
  proposalId: string,
  reviewFeedback: string
): Promise<ResearchProposalRow> {
  if (!reviewFeedback || reviewFeedback.trim().length < 10) {
    throw new Error("Review feedback must be at least 10 characters explaining what revisions are needed.");
  }

  const { data, error } = await supabase
    .from("research_proposals")
    .update({
      status: "REQUESTED_REVISION",
      review_feedback: reviewFeedback.trim(),
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to request proposal revision: ${error.message}`);
  }

  return data;
}

/**
 * Create a new version of a proposal following a revision request
 */
export async function createProposalRevision(
  previousProposalId: string,
  updatedContent?: Partial<ResearchProposalInput>
): Promise<ResearchProposalRow> {
  // 1. Fetch previous proposal
  const previous = await fetchProposalById(previousProposalId);
  if (!previous) {
    throw new Error(`Previous proposal ${previousProposalId} not found.`);
  }

  // 2. Prepare payload for next version
  const nextVersionNumber = previous.version_number + 1;

  const insertPayload: ResearchProposalInsert = {
    project_id: previous.project_id,
    challenge_id: previous.challenge_id,
    institution_id: previous.institution_id,
    version_number: nextVersionNumber,
    status: "DRAFT",
    is_current: true,
    project_objective: updatedContent?.project_objective ?? previous.project_objective,
    research_questions: updatedContent?.research_questions ?? previous.research_questions,
    proposed_methodology: updatedContent?.proposed_methodology ?? previous.proposed_methodology,
    technical_approach: updatedContent?.technical_approach ?? previous.technical_approach,
    team_capability_summary: updatedContent?.team_capability_summary ?? previous.team_capability_summary,
    required_resources: updatedContent?.required_resources ?? previous.required_resources,
    expected_prototype: updatedContent?.expected_prototype ?? previous.expected_prototype,
    milestones: updatedContent?.milestones ?? previous.milestones,
    deliverables: updatedContent?.deliverables ?? previous.deliverables,
    risks_and_mitigation: updatedContent?.risks_and_mitigation ?? previous.risks_and_mitigation,
    success_metrics: updatedContent?.success_metrics ?? previous.success_metrics,
  };

  const { data, error } = await supabase
    .from("research_proposals")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create proposal revision: ${error.message}`);
  }

  return data;
}

/**
 * Resubmit a revised proposal for review
 */
export async function resubmitProposal(
  proposalId: string,
  finalContent?: Partial<ResearchProposalInput>
): Promise<ResearchProposalRow> {
  const updatePayload: ResearchProposalUpdate = {
    status: "RESUBMITTED",
  };

  if (finalContent) {
    if (finalContent.project_objective !== undefined) {
      updatePayload.project_objective = finalContent.project_objective;
    }
    if (finalContent.research_questions !== undefined) {
      updatePayload.research_questions = finalContent.research_questions;
    }
    if (finalContent.proposed_methodology !== undefined) {
      updatePayload.proposed_methodology = finalContent.proposed_methodology;
    }
    if (finalContent.technical_approach !== undefined) {
      updatePayload.technical_approach = finalContent.technical_approach;
    }
    if (finalContent.team_capability_summary !== undefined) {
      updatePayload.team_capability_summary = finalContent.team_capability_summary;
    }
    if (finalContent.required_resources !== undefined) {
      updatePayload.required_resources = finalContent.required_resources;
    }
    if (finalContent.expected_prototype !== undefined) {
      updatePayload.expected_prototype = finalContent.expected_prototype;
    }
    if (finalContent.milestones !== undefined) {
      updatePayload.milestones = finalContent.milestones;
    }
    if (finalContent.deliverables !== undefined) {
      updatePayload.deliverables = finalContent.deliverables;
    }
    if (finalContent.risks_and_mitigation !== undefined) {
      updatePayload.risks_and_mitigation = finalContent.risks_and_mitigation;
    }
    if (finalContent.success_metrics !== undefined) {
      updatePayload.success_metrics = finalContent.success_metrics;
    }
  }

  const { data, error } = await supabase
    .from("research_proposals")
    .update(updatePayload)
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to resubmit proposal: ${error.message}`);
  }

  return data;
}

/**
 * Authoritatively approve a research proposal (Innovation Manager action)
 */
export async function approveProposal(
  proposalId: string
): Promise<ResearchProposalRow> {
  const { data, error } = await supabase
    .from("research_proposals")
    .update({
      status: "APPROVED",
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve proposal: ${error.message}`);
  }

  return data;
}

/**
 * Fetch all research proposals across projects for Innovation Manager review hub
 */
export async function fetchAllProposals(options?: {
  status?: ProposalStatus | "ALL";
  challengeId?: string;
  institutionId?: string;
  search?: string;
  isCurrentOnly?: boolean;
}): Promise<ResearchProposalWithDetails[]> {
  let query = supabase
    .from("research_proposals")
    .select(`
      *,
      challenge:innovation_challenges!research_proposals_challenge_id_fkey(
        id, title, problem_statement, category, status, geographic_scope, required_domains, objectives, expected_outcomes
      ),
      institution:institutions!research_proposals_institution_id_fkey(
        id, name, official_name, institution_type, city, state, acronym
      ),
      project:challenge_projects!research_proposals_project_id_fkey(
        id, project_title, project_summary, status, project_lead_profile_id
      ),
      submitter:profiles!research_proposals_submitted_by_fkey(id, full_name, email),
      reviewer:profiles!research_proposals_reviewed_by_fkey(id, full_name, email),
      approver:profiles!research_proposals_approved_by_fkey(id, full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (options?.isCurrentOnly !== false) {
    query = query.eq("is_current", true);
  }

  if (options?.status && options.status !== "ALL") {
    query = query.eq("status", options.status);
  }

  if (options?.challengeId) {
    query = query.eq("challenge_id", options.challengeId);
  }

  if (options?.institutionId) {
    query = query.eq("institution_id", options.institutionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch proposals: ${error.message}`);
  }

  let results = (data ?? []) as unknown as ResearchProposalWithDetails[];

  // Attach member counts and project leads
  const projectIds = Array.from(new Set(results.map((p) => p.project_id).filter(Boolean)));
  const projectLeadIds = Array.from(
    new Set(results.map((p) => p.project?.project_lead_profile_id).filter(Boolean) as string[])
  );

  const [membersRes, leadsRes] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from("challenge_project_members")
          .select("project_id")
          .in("project_id", projectIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    projectLeadIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", projectLeadIds)
      : Promise.resolve({ data: [] }),
  ]);

  const memberCounts = new Map<string, number>();
  (membersRes.data || []).forEach((m) => {
    memberCounts.set(m.project_id, (memberCounts.get(m.project_id) || 0) + 1);
  });

  const leadMap = new Map<string, { id: string; full_name: string; email: string | null }>();
  (leadsRes.data || []).forEach((l) => {
    leadMap.set(l.id, l);
  });

  results = results.map((p) => {
    const leadId = p.project?.project_lead_profile_id;
    return {
      ...p,
      team_members_count: memberCounts.get(p.project_id) || 0,
      project_lead: leadId ? leadMap.get(leadId) ?? null : null,
    };
  });

  if (options?.search && options.search.trim().length > 0) {
    const term = options.search.trim().toLowerCase();
    results = results.filter((p) => {
      const projTitle = p.project?.project_title?.toLowerCase() ?? "";
      const chalTitle = p.challenge?.title?.toLowerCase() ?? "";
      const instName = p.institution?.name?.toLowerCase() ?? "";
      const instAcronym = p.institution?.acronym?.toLowerCase() ?? "";
      const submitter = p.submitter?.full_name?.toLowerCase() ?? "";
      const leadName = p.project_lead?.full_name?.toLowerCase() ?? "";
      return (
        projTitle.includes(term) ||
        chalTitle.includes(term) ||
        instName.includes(term) ||
        instAcronym.includes(term) ||
        submitter.includes(term) ||
        leadName.includes(term)
      );
    });
  }

  return results;
}
