import { supabase } from "@/lib/supabase";
import type {
  Database,
  DeploymentPlanRow,
  DeploymentPlanInsert,
  DeploymentImpactMetricRow,
  DeploymentImpactMetricInsert,
  DeploymentImpactReportRow,
  DeploymentPlanRevisionRow,
  DeploymentPlanStatus,
  DeploymentDecision,
  ImpactMetricStatus,
  DeploymentPhaseItem,
  ResearchEvidenceRow,
  ChallengeProjectRow,
  InstitutionRow,
  ChallengeProjectActivityInsert,
} from "@/types/database";
import { fetchPilotValidationByProjectId, type PilotValidationWithDetails } from "@/lib/pilot-validation";
import { fetchPilotPlanByProjectId, type PilotPlanWithDetails } from "@/lib/pilot-planning";

export type {
  DeploymentPlanStatus,
  DeploymentDecision,
  ImpactMetricStatus,
  DeploymentPhaseItem,
  DeploymentPlanRow,
  DeploymentImpactMetricRow,
  DeploymentImpactReportRow,
  DeploymentPlanRevisionRow,
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

async function logDeploymentActivity(
  projectId: string,
  actorProfileId: string,
  activityType: ChallengeProjectActivityInsert["activity_type"],
  description: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from("challenge_project_activity").insert({
      project_id: projectId,
      actor_profile_id: actorProfileId,
      activity_type: activityType,
      description,
      metadata: (metadata as any) || {},
    });
  } catch (err) {
    console.warn("Failed to log deployment activity:", err);
  }
}

export const DEPLOYMENT_STATUS_META: Record<
  DeploymentPlanStatus,
  { label: string; badgeTone: "default" | "info" | "warning" | "danger" | "outline" | "teal" | "emerald"; description: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeTone: "default",
    description: "Scale-up plan and deployment readiness are being drafted by university team.",
  },
  SUBMITTED: {
    label: "Submitted for Review",
    badgeTone: "info",
    description: "Scale-up plan submitted to Innovation Manager for deployment authorization.",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeTone: "warning",
    description: "Innovation Manager is evaluating scale-up scope, resource readiness, and risk plans.",
  },
  REQUESTED_REVISION: {
    label: "Revision Requested",
    badgeTone: "warning",
    description: "Innovation Manager has requested revisions or operational clarifications on scale-up.",
  },
  RESUBMITTED: {
    label: "Resubmitted",
    badgeTone: "info",
    description: "University updated the scale-up plan and resubmitted for governance review.",
  },
  APPROVED: {
    label: "Approved for Scale-up",
    badgeTone: "emerald",
    description: "Scale-up plan approved by Innovation Manager. Project is deployment ready.",
  },
  REJECTED: {
    label: "Rejected",
    badgeTone: "danger",
    description: "Scale-up plan was rejected during deployment governance review.",
  },
};

export const DEPLOYMENT_DECISION_META: Record<
  DeploymentDecision,
  { label: string; badgeTone: "emerald" | "warning" | "danger" | "default"; description: string }
> = {
  PENDING_REVIEW: {
    label: "Pending Review",
    badgeTone: "default",
    description: "Awaiting formal review and decision from Innovation Manager.",
  },
  APPROVED_FOR_SCALE_UP: {
    label: "Approved for Scale-up",
    badgeTone: "emerald",
    description: "Solution validated and formally authorized for large-scale deployment.",
  },
  REQUESTED_REVISION: {
    label: "Changes Requested",
    badgeTone: "warning",
    description: "Scale-up plan requires adjustments before deployment can be authorized.",
  },
  NOT_READY: {
    label: "Not Ready for Scale-up",
    badgeTone: "warning",
    description: "Evidence or operational readiness is currently insufficient for full deployment.",
  },
  REJECTED: {
    label: "Scale-up Rejected",
    badgeTone: "danger",
    description: "Deployment authorization was formally denied.",
  },
};

export const IMPACT_METRIC_STATUS_META: Record<
  ImpactMetricStatus,
  { label: string; badgeTone: "emerald" | "info" | "warning" | "danger" | "default"; description: string }
> = {
  PENDING: {
    label: "Baseline / Pending",
    badgeTone: "default",
    description: "Metric defined, awaiting post-deployment measurements.",
  },
  ON_TRACK: {
    label: "On Track",
    badgeTone: "info",
    description: "Observed scale-up results are progressing toward target.",
  },
  SURPASSED: {
    label: "Target Surpassed",
    badgeTone: "emerald",
    description: "Observed impact surpassed target expectations at scale.",
  },
  BELOW_TARGET: {
    label: "Below Target",
    badgeTone: "warning",
    description: "Observed impact is lagging behind projected scaling target.",
  },
  INCONCLUSIVE: {
    label: "Inconclusive",
    badgeTone: "default",
    description: "Measurement data insufficient or ongoing.",
  },
};

export interface DeploymentPlanWithDetails extends Omit<DeploymentPlanRow, "deployment_phases"> {
  deployment_phases: DeploymentPhaseItem[];
  impact_metrics: DeploymentImpactMetricRow[];
  impact_reports: DeploymentImpactReportRow[];
  revisions?: DeploymentPlanRevisionRow[];
  evidence?: ResearchEvidenceRow[];
  validation?: PilotValidationWithDetails | null;
  plan?: PilotPlanWithDetails | null;
  project?: (Pick<
    ChallengeProjectRow,
    "id" | "project_title" | "project_summary" | "status" | "research_stage" | "project_lead_profile_id" | "update_cadence_days" | "institution_id"
  >) | null;
  institution?: Pick<
    InstitutionRow,
    "id" | "name" | "official_name" | "institution_type" | "city" | "state" | "acronym"
  > | null;
  challenge?: {
    id: string;
    title: string;
    problem_statement: string;
    category: string;
    status: string;
    geographic_scope: string | null;
    source_issue?: { id: string; title: string } | null;
  } | null;
  submitted_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  reviewed_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  approved_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
  rejected_by_profile?: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
}

export interface DeploymentReadinessStatus {
  hasApprovedValidation: boolean;
  validationOutcome: string | null;
  isValidationOutcomeApproved: boolean;
  hasScopeDefined: boolean;
  hasReadinessAssessed: boolean;
  hasRiskPlanDefined: boolean;
  hasImpactMetricsDefined: boolean;
  canSubmit: boolean;
  validationSummary: string | null;
  missingRequirements: string[];
}

export interface DeploymentPlanInput {
  title: string;
  summary: string;
  deployment_scope: string;
  target_geography: string;
  target_population: string;
  scale_multiplier?: string;
  deployment_phases: DeploymentPhaseItem[];
  technical_readiness: string;
  operational_readiness: string;
  funding_requirements?: string;
  hardware_requirements?: string;
  technology_requirements?: string;
  human_resource_requirements?: string;
  infrastructure_requirements?: string;
  training_plan?: string;
  maintenance_plan?: string;
  risk_management_plan: string;
  planned_start_date: string;
  planned_end_date: string;
  estimated_duration_days: number;
  impact_metrics: Array<{
    metric_name: string;
    description?: string;
    unit?: string;
    baseline_value: string;
    target_value: string;
    observed_value?: string;
    measurement_period?: string;
    measurement_method?: string;
    data_source?: string;
    status?: ImpactMetricStatus;
    notes?: string;
  }>;
}

export interface DeploymentImpactReportInput {
  reporting_period: string;
  period_start_date: string;
  period_end_date: string;
  key_findings: string;
  deployment_progress_summary: string;
  metric_measurements: Array<{
    metric_id?: string;
    metric_name: string;
    observed_value: string;
    status: ImpactMetricStatus;
    notes?: string;
  }>;
  unexpected_effects?: string;
  emerging_risks?: string;
  corrective_actions?: string;
  next_steps?: string;
  evidence_ids?: string[];
}

/**
 * Get current profile helper
 */
async function getCurrentProfile(): Promise<ProfileRow | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  return profile;
}

/**
 * Fetch deployment plan and all associated details by project ID
 */
export async function fetchDeploymentByProjectId(
  projectId: string
): Promise<DeploymentPlanWithDetails | null> {
  const { data: rawPlan, error } = await supabase
    .from("deployment_plans")
    .select(`
      *,
      challenge:challenges(
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
        project_lead_profile_id,
        update_cadence_days,
        institution_id
      ),
      submitted_by_profile:profiles!deployment_plans_submitted_by_fkey(id, full_name, email),
      reviewed_by_profile:profiles!deployment_plans_reviewed_by_fkey(id, full_name, email),
      approved_by_profile:profiles!deployment_plans_approved_by_fkey(id, full_name, email),
      rejected_by_profile:profiles!deployment_plans_rejected_by_fkey(id, full_name, email)
    `)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching deployment plan by project ID:", error);
    throw error;
  }

  const planRecord = rawPlan as any;

  // Also fetch validation and pilot plan in parallel
  const [validation, pilotPlan, evidenceRes] = await Promise.all([
    fetchPilotValidationByProjectId(projectId),
    fetchPilotPlanByProjectId(projectId),
    supabase
      .from("research_evidence")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  if (!planRecord) {
    if (!validation) return null;

    // Return empty template with validation reference
    return {
      id: "",
      project_id: projectId,
      pilot_plan_id: validation.pilot_plan_id,
      validation_id: validation.id,
      challenge_id: validation.challenge_id,
      institution_id: validation.institution_id,
      created_by: "",
      version: 1,
      status: "DRAFT",
      deployment_decision: "PENDING_REVIEW",
      title: `${validation.project?.project_title || "Solution"} — Scale-up & Large-Scale Deployment Plan`,
      summary: "",
      deployment_scope: "",
      target_geography: "",
      target_population: "",
      scale_multiplier: "5x-10x pilot scope",
      deployment_phases: [],
      technical_readiness: "",
      operational_readiness: "",
      funding_requirements: null,
      hardware_requirements: null,
      technology_requirements: null,
      human_resource_requirements: null,
      infrastructure_requirements: null,
      training_plan: null,
      maintenance_plan: null,
      risk_management_plan: "",
      planned_start_date: new Date().toISOString().split("T")[0],
      planned_end_date: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
      estimated_duration_days: 180,
      deployment_started_at: null,
      deployment_completed_at: null,
      submitted_by: null,
      submitted_at: null,
      reviewed_by: null,
      reviewed_at: null,
      review_feedback: null,
      revision_requested_at: null,
      approved_by: null,
      approved_at: null,
      approval_notes: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      impact_metrics: (validation.kpis || []).map((k) => ({
        id: "",
        deployment_plan_id: "",
        project_id: projectId,
        metric_name: k.kpi_name,
        description: k.description || null,
        unit: k.unit || null,
        baseline_value: k.observed_value || k.baseline_value || "0",
        target_value: k.target_value || "0",
        observed_value: "",
        measurement_period: null,
        measurement_method: k.measurement_method || null,
        data_source: null,
        evidence_ids: [],
        status: "PENDING",
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      impact_reports: [],
      revisions: [],
      evidence: evidenceRes.data || [],
      validation,
      plan: pilotPlan,
      project: validation.project as any,
      institution: validation.institution,
      challenge: validation.challenge as any,
    };
  }

  // Fetch impact metrics, reports, and revisions in parallel
  const [metricsRes, reportsRes, revisionsRes] = await Promise.all([
    supabase
      .from("deployment_impact_metrics")
      .select("*")
      .eq("deployment_plan_id", planRecord.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("deployment_impact_reports")
      .select(`
        *,
        submitted_by_profile:profiles!deployment_impact_reports_submitted_by_fkey(id, full_name, email),
        acknowledged_by_profile:profiles!deployment_impact_reports_acknowledged_by_fkey(id, full_name, email)
      `)
      .eq("deployment_plan_id", planRecord.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("deployment_plan_revisions")
      .select("*")
      .eq("deployment_plan_id", planRecord.id)
      .order("version", { ascending: false }),
  ]);

  return {
    ...planRecord,
    deployment_phases: Array.isArray(planRecord.deployment_phases)
      ? (planRecord.deployment_phases as unknown as DeploymentPhaseItem[])
      : [],
    impact_metrics: (metricsRes.data || []) as DeploymentImpactMetricRow[],
    impact_reports: (reportsRes.data || []) as DeploymentImpactReportRow[],
    revisions: (revisionsRes.data || []) as DeploymentPlanRevisionRow[],
    evidence: evidenceRes.data || [],
    validation,
    plan: pilotPlan,
    project: planRecord.project as any,
    institution: planRecord.institution,
    challenge: planRecord.challenge as any,
  };
}

/**
 * Fetch deployment readiness status
 */
export async function fetchDeploymentReadiness(
  projectId: string
): Promise<DeploymentReadinessStatus> {
  const [validation, plan] = await Promise.all([
    fetchPilotValidationByProjectId(projectId),
    supabase
      .from("deployment_plans")
      .select("id, status, title, summary, deployment_scope, target_geography, target_population, technical_readiness, operational_readiness, risk_management_plan")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  const hasApprovedValidation = validation?.status === "APPROVED";
  const validationOutcome = validation?.final_outcome || null;
  const isValidationOutcomeApproved =
    validationOutcome === "MEETS_SUCCESS_CRITERIA" ||
    validationOutcome === "PARTIALLY_MEETS_SUCCESS_CRITERIA";

  const pData = plan.data;
  const hasScopeDefined = Boolean(
    pData &&
      pData.title?.trim() &&
      pData.summary?.trim() &&
      pData.deployment_scope?.trim() &&
      pData.target_geography?.trim() &&
      pData.target_population?.trim()
  );

  const hasReadinessAssessed = Boolean(
    pData &&
      pData.technical_readiness?.trim() &&
      pData.operational_readiness?.trim()
  );

  const hasRiskPlanDefined = Boolean(
    pData && pData.risk_management_plan?.trim()
  );

  let hasImpactMetricsDefined = false;
  if (pData?.id) {
    const { count } = await supabase
      .from("deployment_impact_metrics")
      .select("id", { count: "exact", head: true })
      .eq("deployment_plan_id", pData.id);
    hasImpactMetricsDefined = (count || 0) > 0;
  }

  const missingRequirements: string[] = [];
  if (!hasApprovedValidation) {
    missingRequirements.push("Pilot validation results must be formally APPROVED by Innovation Manager.");
  }
  if (!validationOutcome) {
    missingRequirements.push("Pilot validation must have an authoritative final outcome recorded.");
  }
  if (!hasScopeDefined) {
    missingRequirements.push("Scale-up scope, target geography, and target population must be defined.");
  }
  if (!hasReadinessAssessed) {
    missingRequirements.push("Technical and operational readiness assessments must be documented.");
  }
  if (!hasRiskPlanDefined) {
    missingRequirements.push("Risk management and safety mitigation plan for large-scale rollout required.");
  }
  if (!hasImpactMetricsDefined) {
    missingRequirements.push("At least one long-term impact metric must be defined.");
  }

  const canSubmit =
    hasApprovedValidation &&
    Boolean(validationOutcome) &&
    hasScopeDefined &&
    hasReadinessAssessed &&
    hasRiskPlanDefined &&
    hasImpactMetricsDefined;

  return {
    hasApprovedValidation,
    validationOutcome,
    isValidationOutcomeApproved,
    hasScopeDefined,
    hasReadinessAssessed,
    hasRiskPlanDefined,
    hasImpactMetricsDefined,
    canSubmit,
    validationSummary: validation?.overall_summary || null,
    missingRequirements,
  };
}

/**
 * Save or update deployment plan draft
 */
export async function saveDeploymentPlanDraft(
  projectId: string,
  input: Partial<DeploymentPlanInput>
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  // Fetch validation
  const validation = await fetchPilotValidationByProjectId(projectId);
  if (!validation || validation.status !== "APPROVED") {
    throw new Error("Cannot draft deployment plan: Pilot validation must be formally APPROVED.");
  }

  // Check if plan already exists
  const { data: existing } = await supabase
    .from("deployment_plans")
    .select("id, status, version")
    .eq("project_id", projectId)
    .maybeSingle();

  const payload: Partial<DeploymentPlanInsert> = {
    title: input.title || `${validation.project?.project_title || "Solution"} — Large-Scale Deployment Plan`,
    summary: input.summary || "",
    deployment_scope: input.deployment_scope || "",
    target_geography: input.target_geography || "",
    target_population: input.target_population || "",
    scale_multiplier: input.scale_multiplier || null,
    deployment_phases: (input.deployment_phases || []) as any,
    technical_readiness: input.technical_readiness || "",
    operational_readiness: input.operational_readiness || "",
    funding_requirements: input.funding_requirements || null,
    hardware_requirements: input.hardware_requirements || null,
    technology_requirements: input.technology_requirements || null,
    human_resource_requirements: input.human_resource_requirements || null,
    infrastructure_requirements: input.infrastructure_requirements || null,
    training_plan: input.training_plan || null,
    maintenance_plan: input.maintenance_plan || null,
    risk_management_plan: input.risk_management_plan || "",
    planned_start_date: input.planned_start_date || new Date().toISOString().split("T")[0],
    planned_end_date: input.planned_end_date || new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
    estimated_duration_days: input.estimated_duration_days || 180,
    updated_at: new Date().toISOString(),
  };

  let planId: string;

  if (existing) {
    planId = existing.id;
    const { error: updateErr } = await supabase
      .from("deployment_plans")
      .update(payload)
      .eq("id", existing.id);

    if (updateErr) {
      console.error("Failed to update deployment plan draft:", updateErr);
      throw updateErr;
    }
  } else {
    const { data: newPlan, error: insertErr } = await supabase
      .from("deployment_plans")
      .insert({
        project_id: projectId,
        pilot_plan_id: validation.pilot_plan_id,
        validation_id: validation.id,
        challenge_id: validation.challenge_id,
        institution_id: validation.institution_id,
        created_by: profile.id,
        status: "DRAFT",
        version: 1,
        ...payload,
      } as DeploymentPlanInsert)
      .select("id")
      .single();

    if (insertErr || !newPlan) {
      console.error("Failed to insert deployment plan draft:", insertErr);
      throw insertErr || new Error("Failed to insert deployment plan");
    }
    planId = newPlan.id;

    // Log Activity
    await logDeploymentActivity(
      projectId,
      profile.id,
      "DEPLOYMENT_PLAN_CREATED",
      "Draft deployment plan initiated following pilot validation.",
      { plan_id: planId }
    );
  }

  // Update or insert impact metrics if provided
  if (input.impact_metrics && input.impact_metrics.length > 0 && planId) {
    // Delete existing metrics and recreate
    await supabase.from("deployment_impact_metrics").delete().eq("deployment_plan_id", planId);

    const metricsPayload: DeploymentImpactMetricInsert[] = input.impact_metrics.map((m) => ({
      deployment_plan_id: planId!,
      project_id: projectId,
      metric_name: m.metric_name,
      description: m.description || null,
      unit: m.unit || null,
      baseline_value: m.baseline_value || "0",
      target_value: m.target_value || "0",
      observed_value: m.observed_value || "",
      measurement_period: m.measurement_period || null,
      measurement_method: m.measurement_method || null,
      data_source: m.data_source || null,
      status: m.status || "PENDING",
      notes: m.notes || null,
      evidence_ids: [],
    }));

    const { error: metricErr } = await supabase
      .from("deployment_impact_metrics")
      .insert(metricsPayload);

    if (metricErr) {
      console.error("Failed to save deployment impact metrics:", metricErr);
    }
  }

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to reload deployment plan after draft save.");
  return updated;
}

/**
 * Submit deployment plan for formal Innovation Manager review
 */
export async function submitDeploymentPlan(
  planId: string,
  projectId: string
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  // Validate readiness before submitting
  const readiness = await fetchDeploymentReadiness(projectId);
  if (!readiness.canSubmit) {
    throw new Error(
      `Cannot submit deployment plan: ${readiness.missingRequirements.join(" ")}`
    );
  }

  const { error } = await supabase
    .from("deployment_plans")
    .update({
      status: "SUBMITTED",
      submitted_by: profile.id,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    console.error("Failed to submit deployment plan:", error);
    throw error;
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "DEPLOYMENT_PLAN_SUBMITTED",
    "University research lead submitted scale-up plan for formal deployment authorization.",
    { plan_id: planId }
  );

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to load deployment plan after submit.");
  return updated;
}

/**
 * Start review on deployment plan (Innovation Manager)
 */
export async function startDeploymentPlanReview(
  planId: string,
  projectId: string
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { error } = await supabase
    .from("deployment_plans")
    .update({
      status: "UNDER_REVIEW",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    console.error("Failed to mark deployment plan under review:", error);
    throw error;
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "DEPLOYMENT_REVIEW_STARTED",
    "Innovation Manager began reviewing scale-up strategy, technical readiness, and resource requirements.",
    { plan_id: planId }
  );

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to load deployment plan after review start.");
  return updated;
}

/**
 * Request revisions on deployment plan (Innovation Manager)
 */
export async function requestDeploymentPlanRevision(
  planId: string,
  projectId: string,
  feedback: string
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  if (!feedback || feedback.trim().length < 10) {
    throw new Error("Revision feedback must be at least 10 characters.");
  }

  // Fetch current plan to snapshot
  const { data: currentPlan, error: fetchErr } = await supabase
    .from("deployment_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (fetchErr || !currentPlan) {
    throw new Error("Failed to fetch deployment plan for revision snapshot.");
  }

  // Fetch current impact metrics
  const { data: metrics } = await supabase
    .from("deployment_impact_metrics")
    .select("*")
    .eq("deployment_plan_id", planId);

  // 1. Create immutable snapshot in deployment_plan_revisions
  const { error: revErr } = await supabase.from("deployment_plan_revisions").insert({
    deployment_plan_id: planId,
    version: currentPlan.version,
    title: currentPlan.title,
    summary: currentPlan.summary,
    deployment_scope: currentPlan.deployment_scope,
    target_geography: currentPlan.target_geography,
    target_population: currentPlan.target_population,
    scale_multiplier: currentPlan.scale_multiplier,
    deployment_phases: currentPlan.deployment_phases as any,
    technical_readiness: currentPlan.technical_readiness,
    operational_readiness: currentPlan.operational_readiness,
    funding_requirements: currentPlan.funding_requirements,
    hardware_requirements: currentPlan.hardware_requirements,
    technology_requirements: currentPlan.technology_requirements,
    human_resource_requirements: currentPlan.human_resource_requirements,
    infrastructure_requirements: currentPlan.infrastructure_requirements,
    training_plan: currentPlan.training_plan,
    maintenance_plan: currentPlan.maintenance_plan,
    risk_management_plan: currentPlan.risk_management_plan,
    impact_metrics_snapshot: (metrics || []) as any,
    status: "REQUESTED_REVISION",
    deployment_decision: "REQUESTED_REVISION",
    submitted_by: currentPlan.submitted_by,
    submitted_at: currentPlan.submitted_at,
    reviewed_by: profile.id,
    reviewed_at: new Date().toISOString(),
    review_feedback: feedback.trim(),
    created_at: new Date().toISOString(),
  });

  if (revErr) {
    console.error("Failed to archive revision snapshot:", revErr);
    throw revErr;
  }

  // 2. Update plan status
  const { error: planErr } = await supabase
    .from("deployment_plans")
    .update({
      status: "REQUESTED_REVISION",
      review_feedback: feedback.trim(),
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      revision_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (planErr) {
    console.error("Failed to request deployment revision:", planErr);
    throw planErr;
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "DEPLOYMENT_REVISION_REQUESTED",
    `Innovation Manager requested modifications: "${feedback.trim().slice(0, 140)}..."`,
    { plan_id: planId, feedback: feedback.trim() }
  );

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to load deployment plan after revision request.");
  return updated;
}

/**
 * Resubmit deployment plan with revised parameters
 */
export async function resubmitDeploymentPlan(
  planId: string,
  projectId: string,
  input: DeploymentPlanInput
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  // Save changes & update metrics
  await saveDeploymentPlanDraft(projectId, input);

  // Update status to RESUBMITTED
  const { error } = await supabase
    .from("deployment_plans")
    .update({
      status: "RESUBMITTED",
      submitted_by: profile.id,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    console.error("Failed to resubmit deployment plan:", error);
    throw error;
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "DEPLOYMENT_RESUBMITTED",
    "University research team addressed review feedback and resubmitted the deployment plan.",
    { plan_id: planId }
  );

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to load deployment plan after resubmit.");
  return updated;
}

/**
 * Approve deployment plan (Innovation Manager only)
 */
export async function approveDeploymentPlan(
  planId: string,
  projectId: string,
  notes?: string
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { error } = await supabase
    .from("deployment_plans")
    .update({
      status: "APPROVED",
      deployment_decision: "APPROVED_FOR_SCALE_UP",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      approval_notes: notes?.trim() || "Scale-up plan approved for large-scale execution.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    console.error("Failed to approve deployment plan:", error);
    throw error;
  }

  // Advance project research stage to DEPLOYMENT_READY
  await supabase
    .from("challenge_projects")
    .update({ research_stage: "DEPLOYMENT_READY" })
    .eq("id", projectId);

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "DEPLOYMENT_APPROVED",
    "Innovation Manager approved deployment plan. Project transitioned to DEPLOYMENT_READY.",
    { plan_id: planId, notes }
  );

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to load deployment plan after approval.");
  return updated;
}

/**
 * Reject deployment plan (Innovation Manager only)
 */
export async function rejectDeploymentPlan(
  planId: string,
  projectId: string,
  reason: string
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  if (!reason || reason.trim().length < 10) {
    throw new Error("Rejection reason must be at least 10 characters.");
  }

  const { error } = await supabase
    .from("deployment_plans")
    .update({
      status: "REJECTED",
      deployment_decision: "REJECTED",
      rejected_by: profile.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    console.error("Failed to reject deployment plan:", error);
    throw error;
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "DEPLOYMENT_REJECTED",
    `Scale-up plan was rejected: "${reason.trim().slice(0, 140)}..."`,
    { plan_id: planId, reason: reason.trim() }
  );

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to load deployment plan after rejection.");
  return updated;
}

/**
 * Start large-scale deployment execution (University Lead)
 */
export async function startDeploymentExecution(
  planId: string,
  projectId: string
): Promise<DeploymentPlanWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { error } = await supabase
    .from("deployment_plans")
    .update({
      deployment_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    console.error("Failed to start deployment execution:", error);
    throw error;
  }

  // Advance project research stage to DEPLOYMENT_ACTIVE
  await supabase
    .from("challenge_projects")
    .update({ research_stage: "DEPLOYMENT_ACTIVE" })
    .eq("id", projectId);

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "DEPLOYMENT_STARTED",
    "University research team launched field operations for approved large-scale deployment.",
    { plan_id: planId }
  );

  const updated = await fetchDeploymentByProjectId(projectId);
  if (!updated) throw new Error("Failed to load deployment plan after deployment start.");
  return updated;
}

/**
 * Submit periodic impact report
 */
export async function submitDeploymentImpactReport(
  projectId: string,
  planId: string,
  reportInput: DeploymentImpactReportInput
): Promise<DeploymentImpactReportRow> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { data: newReport, error } = await supabase
    .from("deployment_impact_reports")
    .insert({
      deployment_plan_id: planId,
      project_id: projectId,
      reporting_period: reportInput.reporting_period.trim(),
      period_start_date: reportInput.period_start_date,
      period_end_date: reportInput.period_end_date,
      key_findings: reportInput.key_findings.trim(),
      deployment_progress_summary: reportInput.deployment_progress_summary.trim(),
      metric_measurements: reportInput.metric_measurements as any,
      unexpected_effects: reportInput.unexpected_effects?.trim() || null,
      emerging_risks: reportInput.emerging_risks?.trim() || null,
      corrective_actions: reportInput.corrective_actions?.trim() || null,
      next_steps: reportInput.next_steps?.trim() || null,
      evidence_ids: (reportInput.evidence_ids || []) as any,
      submitted_by: profile.id,
      submitted_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !newReport) {
    console.error("Failed to submit impact report:", error);
    throw error || new Error("Failed to submit impact report");
  }

  // Update corresponding impact metric observed values if provided
  if (reportInput.metric_measurements && reportInput.metric_measurements.length > 0) {
    for (const m of reportInput.metric_measurements) {
      if (m.metric_id) {
        await supabase
          .from("deployment_impact_metrics")
          .update({
            observed_value: m.observed_value,
            status: m.status,
            notes: m.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", m.metric_id);
      }
    }
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "IMPACT_REPORT_SUBMITTED",
    `Submitted real-world impact findings and metric measurements for ${reportInput.reporting_period}.`,
    { report_id: newReport.id, reporting_period: reportInput.reporting_period }
  );

  return newReport as DeploymentImpactReportRow;
}

/**
 * Acknowledge impact report (Innovation Manager)
 */
export async function acknowledgeDeploymentImpactReport(
  reportId: string,
  projectId: string,
  notes?: string
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { error } = await supabase
    .from("deployment_impact_reports")
    .update({
      acknowledged_by: profile.id,
      acknowledged_at: new Date().toISOString(),
      acknowledgement_notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("Failed to acknowledge impact report:", error);
    throw error;
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "IMPACT_REPORT_ACKNOWLEDGED",
    "Innovation Manager reviewed and acknowledged periodic impact findings.",
    { report_id: reportId, notes }
  );
}

/**
 * Update single impact metric
 */
export async function updateDeploymentImpactMetric(
  metricId: string,
  projectId: string,
  updates: Partial<DeploymentImpactMetricRow>
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { error } = await supabase
    .from("deployment_impact_metrics")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", metricId);

  if (error) {
    console.error("Failed to update impact metric:", error);
    throw error;
  }

  // Log Activity
  await logDeploymentActivity(
    projectId,
    profile.id,
    "IMPACT_METRIC_UPDATED",
    `Updated observed impact measurement to ${updates.observed_value || "new value"} (${updates.status || "STATUS"}).`,
    { metric_id: metricId }
  );
}
