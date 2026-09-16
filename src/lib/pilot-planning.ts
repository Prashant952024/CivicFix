import { supabase } from "@/lib/supabase";
import type {
  Database,
  PilotPlanRow,
  PilotPlanInsert,
  PilotPlanUpdate,
  PilotPlanRevisionRow,
  PilotPlanStatus,
  PilotEnvironmentType,
  PilotKPI,
  PilotRisk,
  ChallengeProjectRow,
  InstitutionRow,
  ResearchProposalRow,
  ProjectSupportPartnerRow,
} from "@/types/database";

export type {
  PilotPlanStatus,
  PilotEnvironmentType,
  PilotKPI,
  PilotRisk,
  PilotPlanRow,
  PilotPlanRevisionRow,
};

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const PILOT_ENVIRONMENT_META: Record<
  PilotEnvironmentType,
  { label: string; description: string; icon: string }
> = {
  LAB: {
    label: "University Laboratory",
    description: "Controlled laboratory facility with specialized testing instrumentation.",
    icon: "FlaskConical",
  },
  CAMPUS: {
    label: "University Campus Testbed",
    description: "Campus grounds, university buildings, test grids, or controlled campus roads.",
    icon: "GraduationCap",
  },
  FIELD_SITE: {
    label: "Dedicated Field Site",
    description: "Dedicated real-world test facility or specialized outdoor testing arena.",
    icon: "MapPin",
  },
  AGRICULTURAL_SITE: {
    label: "Agricultural / Farmland Site",
    description: "Farmland, greenhouse, agroforestry plot, or irrigation testing basin.",
    icon: "Sprout",
  },
  PARTNER_SITE: {
    label: "Partner Organization Facility",
    description: "Partner corporate campus, utility yard, or institutional facility.",
    icon: "Building",
  },
  INDUSTRIAL_SITE: {
    label: "Industrial / Manufacturing Site",
    description: "Factory, industrial processing plant, warehouse, or freight yard.",
    icon: "Factory",
  },
  COMMUNITY_SITE: {
    label: "Community / Neighborhood Site",
    description: "Community center, residential neighborhood, or cooperative zone.",
    icon: "Users",
  },
  PUBLIC_ENVIRONMENT: {
    label: "Public Infrastructure Environment",
    description: "Public roads, transit stations, municipal parks, or civic waterways.",
    icon: "Landmark",
  },
  DIGITAL_ENVIRONMENT: {
    label: "Digital / Cloud Infrastructure",
    description: "Cloud data lake, civic app store, API gateway, or telemetry backend.",
    icon: "Cloud",
  },
  SIMULATION: {
    label: "High-Fidelity Simulation Testbed",
    description: "Hardware-in-the-loop (HIL) simulator, digital twin, or mathematical grid.",
    icon: "Cpu",
  },
  OTHER: {
    label: "Other Specialized Environment",
    description: "Custom environment tailored specifically to this research domain.",
    icon: "HelpCircle",
  },
};

export const PILOT_STATUS_META: Record<
  PilotPlanStatus,
  { label: string; badgeTone: "default" | "info" | "warning" | "danger" | "outline" | "teal" | "emerald"; description: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeTone: "default",
    description: "Pilot plan is being authored by the university project team.",
  },
  SUBMITTED: {
    label: "Submitted for Review",
    badgeTone: "info",
    description: "Pilot plan submitted to the Innovation Manager for governance review.",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeTone: "warning",
    description: "Innovation Manager is actively evaluating the pilot plan proposal.",
  },
  REQUESTED_REVISION: {
    label: "Revision Requested",
    badgeTone: "warning",
    description: "Innovation Manager has requested changes and provided feedback.",
  },
  RESUBMITTED: {
    label: "Resubmitted",
    badgeTone: "info",
    description: "University has updated the pilot plan and resubmitted for review.",
  },
  APPROVED: {
    label: "Approved (Pilot Ready)",
    badgeTone: "emerald",
    description: "Pilot plan governance is approved. Project is ready for pilot execution.",
  },
  REJECTED: {
    label: "Rejected",
    badgeTone: "danger",
    description: "Pilot plan was not approved for real-world testing in its current formulation.",
  },
};

export interface PilotPlanWithDetails extends PilotPlanRow {
  challenge?: (Pick<
    ChallengeRow,
    "id" | "title" | "problem_statement" | "category" | "status" | "geographic_scope"
  > & {
    source_issue?: { id: string; title: string } | null;
  }) | null;
  institution?: Pick<
    InstitutionRow,
    "id" | "name" | "official_name" | "institution_type" | "city" | "state" | "acronym"
  > | null;
  project?: Pick<
    ChallengeProjectRow,
    "id" | "project_title" | "project_summary" | "status" | "research_stage" | "project_lead_profile_id"
  > | null;
  created_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  reviewed_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  approved_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  rejected_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  revisions?: PilotPlanRevisionRow[];
  support_partners?: Array<{
    id: string;
    organization_name: string;
    organization_type: string;
    category: string | null;
    contribution_summary: string | null;
    participation_status: string;
  }>;
}

export interface PilotPlanInput {
  title: string;
  summary: string;
  objective: string;
  research_hypothesis: string;
  test_environment_type: PilotEnvironmentType;
  test_environment_description: string;
  location_description: string;
  planned_start_date: string;
  planned_end_date: string;
  estimated_duration_days?: number;
  baseline_description: string;
  baseline_metrics: Record<string, string | number>;
  kpis: PilotKPI[];
  success_criteria: string;
  participant_description?: string;
  participant_count?: number;
  participant_selection_method?: string;
  risk_and_safety_considerations: string;
  risk_mitigation_plan: string;
  ethical_considerations?: string;
}

export interface PilotReadinessStatus {
  isReadyToSubmit: boolean;
  canCreatePlan: boolean;
  blockReason?: string;
  checks: {
    hasApprovedProposal: boolean;
    proposalStatus: string | null;
    isAdvancedResearchStage: boolean;
    researchStage: string;
    hasDefinedKPIs: boolean;
    hasSafetyPlan: boolean;
    hasBaseline: boolean;
    hasTimeline: boolean;
    hasSupportPartners: boolean;
    activePartnersCount: number;
  };
}

/**
 * Fetch pilot plan for a specific research project
 */
export async function fetchPilotPlanByProjectId(
  projectId: string
): Promise<PilotPlanWithDetails | null> {
  const { data, error } = await supabase
    .from("pilot_plans")
    .select(`
      *,
      challenge:innovation_challenges(
        id,
        title,
        problem_statement,
        category,
        status,
        geographic_scope,
        source_issue:issues(id, title)
      ),
      institution:institutions(
        id,
        name,
        official_name,
        institution_type,
        city,
        state,
        acronym
      ),
      project:challenge_projects(
        id,
        project_title,
        project_summary,
        status,
        research_stage,
        project_lead_profile_id
      ),
      created_by_profile:profiles!pilot_plans_created_by_fkey(id, full_name, email),
      reviewed_by_profile:profiles!pilot_plans_reviewed_by_fkey(id, full_name, email),
      approved_by_profile:profiles!pilot_plans_approved_by_fkey(id, full_name, email),
      rejected_by_profile:profiles!pilot_plans_rejected_by_fkey(id, full_name, email)
    `)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching pilot plan by project ID:", error);
    throw error;
  }

  if (!data) return null;

  const row = data as any;

  // Fetch revisions and support partners in parallel
  const [revisionsRes, partnersRes] = await Promise.all([
    supabase
      .from("pilot_plan_revisions")
      .select("*")
      .eq("pilot_plan_id", row.id)
      .order("version", { ascending: false }),
    supabase
      .from("project_support_partners")
      .select(`
        id,
        category,
        contribution_summary,
        participation_status,
        organization:industry_organizations(name, organization_type)
      `)
      .eq("project_id", projectId)
      .eq("participation_status", "ACTIVE"),
  ]);

  const support_partners = (partnersRes.data || []).map((p: any) => ({
    id: p.id,
    organization_name: p.organization?.name || "Partner Organization",
    organization_type: p.organization?.organization_type || "COMPANY",
    category: p.category,
    contribution_summary: p.contribution_summary,
    participation_status: p.participation_status,
  }));

  return {
    ...row,
    challenge: row.challenge,
    institution: row.institution,
    project: row.project,
    created_by_profile: row.created_by_profile,
    reviewed_by_profile: row.reviewed_by_profile,
    approved_by_profile: row.approved_by_profile,
    rejected_by_profile: row.rejected_by_profile,
    revisions: (revisionsRes.data || []) as PilotPlanRevisionRow[],
    support_partners,
  };
}

/**
 * Fetch pilot plan by its unique ID
 */
export async function fetchPilotPlanById(
  pilotPlanId: string
): Promise<PilotPlanWithDetails | null> {
  const { data, error } = await supabase
    .from("pilot_plans")
    .select(`
      *,
      challenge:innovation_challenges(
        id,
        title,
        problem_statement,
        category,
        status,
        geographic_scope,
        source_issue:issues(id, title)
      ),
      institution:institutions(
        id,
        name,
        official_name,
        institution_type,
        city,
        state,
        acronym
      ),
      project:challenge_projects(
        id,
        project_title,
        project_summary,
        status,
        research_stage,
        project_lead_profile_id
      ),
      created_by_profile:profiles!pilot_plans_created_by_fkey(id, full_name, email),
      reviewed_by_profile:profiles!pilot_plans_reviewed_by_fkey(id, full_name, email),
      approved_by_profile:profiles!pilot_plans_approved_by_fkey(id, full_name, email),
      rejected_by_profile:profiles!pilot_plans_rejected_by_fkey(id, full_name, email)
    `)
    .eq("id", pilotPlanId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching pilot plan by ID:", error);
    throw error;
  }

  if (!data) return null;

  const row = data as any;

  const [revisionsRes, partnersRes] = await Promise.all([
    supabase
      .from("pilot_plan_revisions")
      .select("*")
      .eq("pilot_plan_id", row.id)
      .order("version", { ascending: false }),
    supabase
      .from("project_support_partners")
      .select(`
        id,
        category,
        contribution_summary,
        participation_status,
        organization:industry_organizations(name, organization_type)
      `)
      .eq("project_id", row.project_id)
      .eq("participation_status", "ACTIVE"),
  ]);

  const support_partners = (partnersRes.data || []).map((p: any) => ({
    id: p.id,
    organization_name: p.organization?.name || "Partner Organization",
    organization_type: p.organization?.organization_type || "COMPANY",
    category: p.category,
    contribution_summary: p.contribution_summary,
    participation_status: p.participation_status,
  }));

  return {
    ...row,
    challenge: row.challenge,
    institution: row.institution,
    project: row.project,
    created_by_profile: row.created_by_profile,
    reviewed_by_profile: row.reviewed_by_profile,
    approved_by_profile: row.approved_by_profile,
    rejected_by_profile: row.rejected_by_profile,
    revisions: (revisionsRes.data || []) as PilotPlanRevisionRow[],
    support_partners,
  };
}

/**
 * Fetch pilot readiness context for a project
 */
export async function fetchPilotReadiness(
  projectId: string
): Promise<PilotReadinessStatus> {
  // 1. Fetch project details and approved proposal
  const [projectRes, proposalRes, partnersRes] = await Promise.all([
    supabase
      .from("challenge_projects")
      .select("id, status, research_stage")
      .eq("id", projectId)
      .single(),
    supabase
      .from("research_proposals")
      .select("id, status")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("project_support_partners")
      .select("id")
      .eq("project_id", projectId)
      .eq("participation_status", "ACTIVE"),
  ]);

  const project = projectRes.data as any;
  const proposal = proposalRes.data as any;
  const activePartnersCount = (partnersRes.data || []).length;

  const hasApprovedProposal = proposal?.status === "APPROVED";
  const researchStage = project?.research_stage || "RESEARCH_STARTED";
  const isAdvancedResearchStage = [
    "PROTOTYPE_COMPLETED",
    "TESTING",
    "PILOT_READY",
    "PILOT_ACTIVE",
    "VALIDATION",
    "COMPLETED",
  ].includes(researchStage);

  // Check if pilot plan already exists to inspect completeness
  const { data: plan } = await supabase
    .from("pilot_plans")
    .select("kpis, risk_and_safety_considerations, baseline_description, planned_start_date, planned_end_date")
    .eq("project_id", projectId)
    .maybeSingle();

  const kpis = Array.isArray(plan?.kpis) ? (plan.kpis as unknown as PilotKPI[]) : [];
  const hasDefinedKPIs = kpis.length > 0;
  const hasSafetyPlan = Boolean(
    plan?.risk_and_safety_considerations &&
    plan.risk_and_safety_considerations.trim().length >= 10
  );
  const hasBaseline = Boolean(
    plan?.baseline_description && plan.baseline_description.trim().length >= 10
  );
  const hasTimeline = Boolean(plan?.planned_start_date && plan?.planned_end_date);

  const canCreatePlan = hasApprovedProposal;
  let blockReason: string | undefined;

  if (!hasApprovedProposal) {
    blockReason = "Research proposal must be approved by the Innovation Manager before pilot planning can begin.";
  }

  const isReadyToSubmit =
    canCreatePlan &&
    hasDefinedKPIs &&
    hasSafetyPlan &&
    hasBaseline &&
    hasTimeline;

  return {
    isReadyToSubmit,
    canCreatePlan,
    blockReason,
    checks: {
      hasApprovedProposal,
      proposalStatus: proposal?.status || null,
      isAdvancedResearchStage,
      researchStage,
      hasDefinedKPIs,
      hasSafetyPlan,
      hasBaseline,
      hasTimeline,
      hasSupportPartners: activePartnersCount > 0,
      activePartnersCount,
    },
  };
}

/**
 * Save or update pilot plan draft
 */
export async function savePilotPlanDraft(
  projectId: string,
  input: Partial<PilotPlanInput>
): Promise<PilotPlanRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated user required");

  // Get project, challenge, and institution
  const { data: project, error: projErr } = await supabase
    .from("challenge_projects")
    .select("id, challenge_id, institution_id")
    .eq("id", projectId)
    .single();

  if (projErr || !project) {
    throw new Error("Project not found");
  }

  // Calculate duration if start and end dates provided
  let duration = input.estimated_duration_days;
  if (input.planned_start_date && input.planned_end_date) {
    const start = new Date(input.planned_start_date);
    const end = new Date(input.planned_end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    duration = diffDays > 0 ? diffDays : 1;
  }

  const payload: any = {
    project_id: projectId,
    challenge_id: project.challenge_id,
    institution_id: project.institution_id,
    created_by: user.id,
    title: input.title || "Pilot Plan Draft",
    summary: input.summary || "Draft summary",
    objective: input.objective || "Draft objective",
    research_hypothesis: input.research_hypothesis || "Draft hypothesis",
    test_environment_type: input.test_environment_type || "LAB",
    test_environment_description: input.test_environment_description || "Draft testbed description",
    location_description: input.location_description || "Draft location",
    planned_start_date: input.planned_start_date || new Date().toISOString().split("T")[0],
    planned_end_date: input.planned_end_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    estimated_duration_days: duration || 30,
    baseline_description: input.baseline_description || "Draft baseline",
    baseline_metrics: (input.baseline_metrics as any) || {},
    kpis: (input.kpis as any) || [],
    success_criteria: input.success_criteria || "Draft success criteria",
    participant_description: input.participant_description || null,
    participant_count: input.participant_count || 0,
    participant_selection_method: input.participant_selection_method || null,
    risk_and_safety_considerations: input.risk_and_safety_considerations || "Draft safety considerations",
    risk_mitigation_plan: input.risk_mitigation_plan || "Draft mitigation plan",
    ethical_considerations: input.ethical_considerations || null,
    status: "DRAFT",
    updated_at: new Date().toISOString(),
  };

  // Check if exists
  const { data: existing } = await supabase
    .from("pilot_plans")
    .select("id, status")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "DRAFT" && existing.status !== "REQUESTED_REVISION") {
      throw new Error(`Cannot edit pilot plan in ${existing.status} status.`);
    }

    const { data: updated, error: updateErr } = await supabase
      .from("pilot_plans")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logPilotActivity(
      projectId,
      user.id,
      "PILOT_PLAN_UPDATED",
      "Pilot plan draft updated.",
      { plan_id: existing.id }
    );

    return updated as PilotPlanRow;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("pilot_plans")
      .insert(payload)
      .select()
      .single();

    if (insertErr) throw insertErr;

    await logPilotActivity(
      projectId,
      user.id,
      "PILOT_PLAN_CREATED",
      "Initial pilot plan created.",
      { plan_id: inserted.id }
    );

    return inserted as PilotPlanRow;
  }
}

/**
 * Submit pilot plan for governance review
 */
export async function submitPilotPlan(
  pilotPlanId: string,
  projectId: string
): Promise<PilotPlanRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated user required");

  // Validate current plan
  const { data: plan, error: planErr } = await supabase
    .from("pilot_plans")
    .select("*")
    .eq("id", pilotPlanId)
    .single();

  if (planErr || !plan) throw new Error("Pilot plan not found");
  if (plan.status !== "DRAFT") {
    throw new Error(`Only draft plans can be submitted, current status is ${plan.status}`);
  }

  // Check completeness
  if (!plan.title || !plan.objective || !plan.success_criteria || !plan.baseline_description) {
    throw new Error("Please complete all required pilot plan fields before submitting.");
  }

  const { data: updated, error: updateErr } = await supabase
    .from("pilot_plans")
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pilotPlanId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Snapshot into pilot_plan_revisions
  await supabase.from("pilot_plan_revisions").insert({
    pilot_plan_id: plan.id,
    version: plan.version,
    title: plan.title,
    summary: plan.summary,
    objective: plan.objective,
    research_hypothesis: plan.research_hypothesis,
    test_environment_type: plan.test_environment_type,
    test_environment_description: plan.test_environment_description,
    location_description: plan.location_description,
    planned_start_date: plan.planned_start_date,
    planned_end_date: plan.planned_end_date,
    estimated_duration_days: plan.estimated_duration_days,
    baseline_description: plan.baseline_description,
    baseline_metrics: plan.baseline_metrics,
    kpis: plan.kpis,
    success_criteria: plan.success_criteria,
    participant_description: plan.participant_description,
    participant_count: plan.participant_count,
    participant_selection_method: plan.participant_selection_method,
    risk_and_safety_considerations: plan.risk_and_safety_considerations,
    risk_mitigation_plan: plan.risk_mitigation_plan,
    ethical_considerations: plan.ethical_considerations,
    status: "SUBMITTED",
    submitted_by: user.id,
    submitted_at: new Date().toISOString(),
  });

  await logPilotActivity(
    projectId,
    user.id,
    "PILOT_PLAN_SUBMITTED",
    `Pilot plan "${plan.title}" submitted for Innovation Manager review.`,
    { plan_id: pilotPlanId, version: plan.version }
  );

  return updated as PilotPlanRow;
}

/**
 * Innovation Manager starts review of pilot plan
 */
export async function startPilotPlanReview(
  pilotPlanId: string,
  projectId: string
): Promise<PilotPlanRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated user required");

  const { data: updated, error } = await supabase
    .from("pilot_plans")
    .update({
      status: "UNDER_REVIEW",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pilotPlanId)
    .select()
    .single();

  if (error) throw error;

  await logPilotActivity(
    projectId,
    user.id,
    "PILOT_REVIEW_STARTED",
    "Innovation Manager began governance review of the pilot plan.",
    { plan_id: pilotPlanId }
  );

  return updated as PilotPlanRow;
}

/**
 * Innovation Manager requests revisions on the pilot plan
 */
export async function requestPilotPlanRevision(
  pilotPlanId: string,
  projectId: string,
  feedback: string
): Promise<PilotPlanRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated user required");

  if (!feedback || feedback.trim().length < 10) {
    throw new Error("Revision feedback must be at least 10 characters.");
  }

  const { data: updated, error } = await supabase
    .from("pilot_plans")
    .update({
      status: "REQUESTED_REVISION",
      revision_feedback: feedback.trim(),
      revision_requested_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pilotPlanId)
    .select()
    .single();

  if (error) throw error;

  await logPilotActivity(
    projectId,
    user.id,
    "PILOT_REVISION_REQUESTED",
    `Changes requested for pilot plan: ${feedback.slice(0, 100)}...`,
    { plan_id: pilotPlanId, feedback }
  );

  return updated as PilotPlanRow;
}

/**
 * University resubmits revised pilot plan
 */
export async function resubmitPilotPlan(
  pilotPlanId: string,
  projectId: string,
  input?: Partial<PilotPlanInput>
): Promise<PilotPlanRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated user required");

  const { data: plan, error: fetchErr } = await supabase
    .from("pilot_plans")
    .select("*")
    .eq("id", pilotPlanId)
    .single();

  if (fetchErr || !plan) throw new Error("Pilot plan not found");
  if (plan.status !== "REQUESTED_REVISION") {
    throw new Error(`Only plans with status REQUESTED_REVISION can be resubmitted. Current status is ${plan.status}`);
  }

  const updateData: any = {
    status: "RESUBMITTED",
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (input) {
    if (input.title) updateData.title = input.title;
    if (input.summary) updateData.summary = input.summary;
    if (input.objective) updateData.objective = input.objective;
    if (input.research_hypothesis) updateData.research_hypothesis = input.research_hypothesis;
    if (input.test_environment_type) updateData.test_environment_type = input.test_environment_type;
    if (input.test_environment_description) updateData.test_environment_description = input.test_environment_description;
    if (input.location_description) updateData.location_description = input.location_description;
    if (input.planned_start_date) updateData.planned_start_date = input.planned_start_date;
    if (input.planned_end_date) updateData.planned_end_date = input.planned_end_date;
    if (input.baseline_description) updateData.baseline_description = input.baseline_description;
    if (input.baseline_metrics) updateData.baseline_metrics = input.baseline_metrics as any;
    if (input.kpis) updateData.kpis = input.kpis as any;
    if (input.success_criteria) updateData.success_criteria = input.success_criteria;
    if (input.participant_description !== undefined) updateData.participant_description = input.participant_description;
    if (input.participant_count !== undefined) updateData.participant_count = input.participant_count;
    if (input.participant_selection_method !== undefined) updateData.participant_selection_method = input.participant_selection_method;
    if (input.risk_and_safety_considerations) updateData.risk_and_safety_considerations = input.risk_and_safety_considerations;
    if (input.risk_mitigation_plan) updateData.risk_mitigation_plan = input.risk_mitigation_plan;
    if (input.ethical_considerations !== undefined) updateData.ethical_considerations = input.ethical_considerations;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("pilot_plans")
    .update(updateData)
    .eq("id", pilotPlanId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Snapshot into pilot_plan_revisions
  await supabase.from("pilot_plan_revisions").insert({
    pilot_plan_id: updated.id,
    version: updated.version,
    title: updated.title,
    summary: updated.summary,
    objective: updated.objective,
    research_hypothesis: updated.research_hypothesis,
    test_environment_type: updated.test_environment_type,
    test_environment_description: updated.test_environment_description,
    location_description: updated.location_description,
    planned_start_date: updated.planned_start_date,
    planned_end_date: updated.planned_end_date,
    estimated_duration_days: updated.estimated_duration_days,
    baseline_description: updated.baseline_description,
    baseline_metrics: updated.baseline_metrics,
    kpis: updated.kpis,
    success_criteria: updated.success_criteria,
    participant_description: updated.participant_description,
    participant_count: updated.participant_count,
    participant_selection_method: updated.participant_selection_method,
    risk_and_safety_considerations: updated.risk_and_safety_considerations,
    risk_mitigation_plan: updated.risk_mitigation_plan,
    ethical_considerations: updated.ethical_considerations,
    status: "RESUBMITTED",
    submitted_by: user.id,
    submitted_at: new Date().toISOString(),
  });

  await logPilotActivity(
    projectId,
    user.id,
    "PILOT_RESUBMITTED",
    `Revised pilot plan (v${updated.version}) resubmitted for Innovation Manager review.`,
    { plan_id: pilotPlanId, version: updated.version }
  );

  return updated as PilotPlanRow;
}

/**
 * Innovation Manager approves pilot plan -> Transitions project research_stage to PILOT_READY
 */
export async function approvePilotPlan(
  pilotPlanId: string,
  projectId: string,
  notes?: string
): Promise<PilotPlanRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated user required");

  const { data: updated, error } = await supabase
    .from("pilot_plans")
    .update({
      status: "APPROVED",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      approval_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pilotPlanId)
    .select()
    .single();

  if (error) throw error;

  await logPilotActivity(
    projectId,
    user.id,
    "PILOT_APPROVED",
    `Pilot plan approved. Project transitioned to PILOT_READY stage.${notes ? ` Notes: ${notes}` : ""}`,
    { plan_id: pilotPlanId, notes }
  );

  return updated as PilotPlanRow;
}

/**
 * Innovation Manager rejects pilot plan
 */
export async function rejectPilotPlan(
  pilotPlanId: string,
  projectId: string,
  reason: string
): Promise<PilotPlanRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated user required");

  if (!reason || reason.trim().length < 10) {
    throw new Error("Rejection reason must be at least 10 characters.");
  }

  const { data: updated, error } = await supabase
    .from("pilot_plans")
    .update({
      status: "REJECTED",
      rejected_at: new Date().toISOString(),
      rejected_by: user.id,
      rejection_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pilotPlanId)
    .select()
    .single();

  if (error) throw error;

  await logPilotActivity(
    projectId,
    user.id,
    "PILOT_REJECTED",
    `Pilot plan rejected: ${reason.slice(0, 100)}...`,
    { plan_id: pilotPlanId, reason }
  );

  return updated as PilotPlanRow;
}

/**
 * Fetch all pilot plans for Innovation Manager Pilot Control Center
 */
export async function fetchInnovationManagerPilots(filters?: {
  status?: string;
  environment?: string;
  search?: string;
}): Promise<PilotPlanWithDetails[]> {
  let query = supabase
    .from("pilot_plans")
    .select(`
      *,
      challenge:innovation_challenges(
        id,
        title,
        problem_statement,
        category,
        status,
        geographic_scope,
        source_issue:issues(id, title)
      ),
      institution:institutions(
        id,
        name,
        official_name,
        institution_type,
        city,
        state,
        acronym
      ),
      project:challenge_projects(
        id,
        project_title,
        project_summary,
        status,
        research_stage,
        project_lead_profile_id
      ),
      created_by_profile:profiles!pilot_plans_created_by_fkey(id, full_name, email),
      reviewed_by_profile:profiles!pilot_plans_reviewed_by_fkey(id, full_name, email),
      approved_by_profile:profiles!pilot_plans_approved_by_fkey(id, full_name, email),
      rejected_by_profile:profiles!pilot_plans_rejected_by_fkey(id, full_name, email)
    `)
    .order("updated_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status as PilotPlanStatus);
  }

  if (filters?.environment && filters.environment !== "ALL") {
    query = query.eq("test_environment_type", filters.environment as PilotEnvironmentType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching manager pilot plans:", error);
    throw error;
  }

  let list = (data || []) as unknown as PilotPlanWithDetails[];

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter((p) => {
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchInst = p.institution?.name?.toLowerCase().includes(q) || p.institution?.official_name?.toLowerCase().includes(q);
      const matchProj = p.project?.project_title?.toLowerCase().includes(q);
      const matchChal = p.challenge?.title?.toLowerCase().includes(q) || p.challenge?.source_issue?.title?.toLowerCase().includes(q);
      return matchTitle || matchInst || matchProj || matchChal;
    });
  }

  return list;
}

/**
 * Log activity helper
 */
async function logPilotActivity(
  projectId: string,
  actorProfileId: string,
  activityType: any,
  description: string,
  metadata: Record<string, any> = {}
) {
  try {
    await supabase.from("challenge_project_activity").insert({
      project_id: projectId,
      actor_profile_id: actorProfileId,
      activity_type: activityType,
      description,
      metadata,
    });
  } catch (err) {
    console.warn("Failed to log pilot activity:", err);
  }
}
