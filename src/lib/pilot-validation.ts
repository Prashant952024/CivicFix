import { supabase } from "@/lib/supabase";
import type {
  Database,
  PilotValidationResultRow,
  PilotValidationResultInsert,
  PilotValidationResultUpdate,
  PilotValidationKPIResultRow,
  PilotValidationRevisionRow,
  PilotValidationStatus,
  PilotValidationOutcome,
  PilotKPIAchievementStatus,
  PilotDeviationItem,
  PilotPlanRow,
  PilotKPI,
  ChallengeProjectRow,
  InstitutionRow,
} from "@/types/database";
import { fetchPilotPlanByProjectId, type PilotPlanWithDetails } from "@/lib/pilot-planning";

export type {
  PilotValidationStatus,
  PilotValidationOutcome,
  PilotKPIAchievementStatus,
  PilotDeviationItem,
  PilotValidationResultRow,
  PilotValidationKPIResultRow,
  PilotValidationRevisionRow,
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const PILOT_VALIDATION_STATUS_META: Record<
  PilotValidationStatus,
  { label: string; badgeTone: "default" | "info" | "warning" | "danger" | "outline" | "teal" | "emerald"; description: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeTone: "default",
    description: "Validation results are being formulated by the university project team.",
  },
  SUBMITTED: {
    label: "Submitted for Review",
    badgeTone: "info",
    description: "Validation results submitted to Innovation Manager for formal governance review.",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeTone: "warning",
    description: "Innovation Manager is actively inspecting pilot results, KPIs, and evidence.",
  },
  REQUESTED_REVISION: {
    label: "Revision Requested",
    badgeTone: "warning",
    description: "Innovation Manager has requested revisions, clarifications, or extra evidence.",
  },
  RESUBMITTED: {
    label: "Resubmitted",
    badgeTone: "info",
    description: "University updated the validation submission and resubmitted for review.",
  },
  APPROVED: {
    label: "Validated",
    badgeTone: "emerald",
    description: "Pilot validation governance complete. Official outcome recorded.",
  },
  REJECTED: {
    label: "Rejected",
    badgeTone: "danger",
    description: "Pilot validation was rejected for governance or validation non-compliance.",
  },
};

export const PILOT_VALIDATION_OUTCOME_META: Record<
  PilotValidationOutcome,
  { label: string; badgeTone: "emerald" | "warning" | "danger" | "default"; description: string; icon: string }
> = {
  MEETS_SUCCESS_CRITERIA: {
    label: "Meets Success Criteria",
    badgeTone: "emerald",
    description: "The pilot met or exceeded all core objectives and approved KPI targets with sound evidence.",
    icon: "CheckCircle2",
  },
  PARTIALLY_MEETS_SUCCESS_CRITERIA: {
    label: "Partially Meets Criteria",
    badgeTone: "warning",
    description: "The pilot met essential operational milestones but observed partial attainment on secondary KPIs.",
    icon: "AlertTriangle",
  },
  DOES_NOT_MEET_SUCCESS_CRITERIA: {
    label: "Does Not Meet Criteria",
    badgeTone: "danger",
    description: "The observed metrics significantly deviated from approved targets or safety parameters.",
    icon: "XCircle",
  },
  INCONCLUSIVE: {
    label: "Inconclusive Findings",
    badgeTone: "default",
    description: "Observed data is insufficient, interrupted by external factors, or requires further testing.",
    icon: "HelpCircle",
  },
};

export const PILOT_KPI_ACHIEVEMENT_META: Record<
  PilotKPIAchievementStatus,
  { label: string; badgeTone: "emerald" | "warning" | "danger" | "default"; description: string }
> = {
  ACHIEVED: {
    label: "Achieved",
    badgeTone: "emerald",
    description: "Observed metric met or surpassed the approved target value.",
  },
  PARTIALLY_ACHIEVED: {
    label: "Partially Achieved",
    badgeTone: "warning",
    description: "Observed metric showed positive movement but did not fully reach target.",
  },
  NOT_ACHIEVED: {
    label: "Not Achieved",
    badgeTone: "danger",
    description: "Observed metric fell short of baseline expectations or target criteria.",
  },
  INCONCLUSIVE: {
    label: "Inconclusive",
    badgeTone: "default",
    description: "Telemetry or measurement data insufficient to determine achievement status.",
  },
};

export interface PilotValidationWithDetails extends Omit<PilotValidationResultRow, "deviations"> {
  deviations: PilotDeviationItem[];
  kpis: PilotValidationKPIResultRow[];
  revisions?: PilotValidationRevisionRow[];
  evidence?: any[];
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

export interface PilotValidationInput {
  overall_summary: string;
  observed_outcomes: string;
  deviations: PilotDeviationItem[];
  lessons_learned: string;
  limitations?: string;
  recommendations?: string;
  university_interpretation?: string;
  kpi_results: Array<{
    kpi_id: string;
    kpi_name: string;
    description?: string;
    unit?: string;
    baseline_value: string;
    target_value: string;
    observed_value: string;
    measurement_method?: string;
    measurement_period?: string;
    achievement_status: PilotKPIAchievementStatus;
    evidence_ids?: string[];
    notes?: string;
  }>;
}

export interface PilotValidationReadiness {
  canValidate: boolean;
  isReadyToSubmit: boolean;
  blockReason?: string;
  checks: {
    hasApprovedPlan: boolean;
    planStatus: string | null;
    isPilotActiveOrCompleted: boolean;
    researchStage: string;
    isPilotStarted: boolean;
    startedAt: string | null;
    totalMilestonesCount: number;
    completedMilestonesCount: number;
    updatesCount: number;
    evidenceCount: number;
    openBlockersCount: number;
    approvedKpisCount: number;
    enteredKpisCount: number;
  };
}

async function getCurrentProfile(): Promise<{ id: string; institution_id?: string | null } | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    const { data: profiles } = await supabase.from("profiles").select("id, institution_id").limit(1);
    return profiles && profiles.length > 0 ? profiles[0] : null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, institution_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profile) return profile;

  const { data: clerkProfile } = await supabase
    .from("profiles")
    .select("id, institution_id")
    .eq("clerk_user_id", authData.user.id)
    .maybeSingle();
  return clerkProfile || { id: authData.user.id };
}

/**
 * Fetch pilot validation readiness for a project
 */
export async function fetchPilotValidationReadiness(
  projectId: string
): Promise<PilotValidationReadiness> {
  const [projectRes, planRes, milestonesRes, updatesRes, evidenceRes, blockersRes] =
    await Promise.all([
      supabase
        .from("challenge_projects")
        .select("id, research_stage")
        .eq("id", projectId)
        .single(),
      supabase
        .from("pilot_plans")
        .select("id, status, kpis, pilot_started_at")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("research_project_milestones")
        .select("id, status")
        .eq("project_id", projectId),
      supabase
        .from("research_progress_updates")
        .select("id")
        .eq("project_id", projectId),
      supabase
        .from("research_evidence")
        .select("id")
        .eq("project_id", projectId),
      supabase
        .from("research_blockers_risks")
        .select("id")
        .eq("project_id", projectId)
        .neq("status", "RESOLVED"),
    ]);

  const project = projectRes.data;
  const plan = planRes.data;
  const milestones = milestonesRes.data || [];
  const updates = updatesRes.data || [];
  const evidence = evidenceRes.data || [];
  const openBlockers = blockersRes.data || [];

  const hasApprovedPlan = plan?.status === "APPROVED";
  const researchStage = project?.research_stage || "RESEARCH_STARTED";
  const isPilotStarted = Boolean(plan?.pilot_started_at);
  const isPilotActiveOrCompleted = ["PILOT_ACTIVE", "VALIDATION", "COMPLETED"].includes(researchStage);

  const approvedKpis = Array.isArray(plan?.kpis) ? (plan.kpis as unknown as PilotKPI[]) : [];
  const approvedKpisCount = approvedKpis.length;

  // Check if validation draft exists and has KPI results
  let enteredKpisCount = 0;
  if (plan?.id) {
    const { data: val } = await supabase
      .from("pilot_validation_results")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();

    if (val?.id) {
      const { data: kpiResults } = await supabase
        .from("pilot_validation_kpi_results")
        .select("id, observed_value")
        .eq("validation_id", val.id);
      
      enteredKpisCount = (kpiResults || []).filter((k) => Boolean(k.observed_value?.trim())).length;
    }
  }

  const completedMilestonesCount = milestones.filter((m) => m.status === "COMPLETED").length;
  const canValidate = hasApprovedPlan && isPilotStarted && isPilotActiveOrCompleted;

  let blockReason: string | undefined;
  if (!hasApprovedPlan) {
    blockReason = "Pilot plan must be approved by the Innovation Manager before validation can begin.";
  } else if (!isPilotStarted) {
    blockReason = "Pilot execution must officially be started by the Project Lead before validation.";
  } else if (!isPilotActiveOrCompleted) {
    blockReason = `Current project stage (${researchStage}) is not ready for validation.`;
  }

  const isReadyToSubmit =
    canValidate &&
    (approvedKpisCount === 0 || enteredKpisCount >= approvedKpisCount);

  return {
    canValidate,
    isReadyToSubmit,
    blockReason,
    checks: {
      hasApprovedPlan,
      planStatus: plan?.status || null,
      isPilotActiveOrCompleted,
      researchStage,
      isPilotStarted,
      startedAt: plan?.pilot_started_at || null,
      totalMilestonesCount: milestones.length,
      completedMilestonesCount,
      updatesCount: updates.length,
      evidenceCount: evidence.length,
      openBlockersCount: openBlockers.length,
      approvedKpisCount,
      enteredKpisCount,
    },
  };
}

/**
 * Fetch pilot validation with full details for a project
 */
export async function fetchPilotValidationByProjectId(
  projectId: string
): Promise<PilotValidationWithDetails | null> {
  const { data: rawVal, error } = await supabase
    .from("pilot_validation_results")
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
      submitted_by_profile:profiles!pilot_validation_results_submitted_by_fkey(id, full_name, email),
      reviewed_by_profile:profiles!pilot_validation_results_reviewed_by_fkey(id, full_name, email),
      approved_by_profile:profiles!pilot_validation_results_approved_by_fkey(id, full_name, email),
      rejected_by_profile:profiles!pilot_validation_results_rejected_by_fkey(id, full_name, email)
    `)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching pilot validation by project ID:", error);
    throw error;
  }

  const val = rawVal as any;

  if (!val) {
    // If no validation record created yet, fetch approved plan to pre-populate KPIs
    const plan = await fetchPilotPlanByProjectId(projectId);
    if (!plan) return null;
    return {
      id: "",
      pilot_plan_id: plan.id,
      project_id: projectId,
      challenge_id: plan.challenge_id,
      institution_id: plan.institution_id,
      version: 1,
      status: "DRAFT",
      overall_summary: "",
      observed_outcomes: "",
      deviations: [],
      lessons_learned: "",
      limitations: null,
      recommendations: null,
      university_interpretation: null,
      final_outcome: null,
      submitted_by: null,
      submitted_at: null,
      reviewed_by: null,
      reviewed_at: null,
      review_feedback: null,
      revision_requested_at: null,
      approved_at: null,
      approved_by: null,
      approval_notes: null,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      kpis: (Array.isArray(plan.kpis) ? (plan.kpis as unknown as PilotKPI[]) : []).map((k) => ({
        id: "",
        validation_id: "",
        kpi_id: k.id,
        kpi_name: k.name,
        description: k.description || null,
        unit: k.unit || null,
        baseline_value: k.baseline_value || "0",
        target_value: k.target_value || "0",
        observed_value: "",
        measurement_method: k.measurement_method || null,
        measurement_period: null,
        achievement_status: "INCONCLUSIVE",
        evidence_ids: [],
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      plan,
      project: plan.project as any,
      institution: plan.institution,
      challenge: plan.challenge as any,
    };
  }

  // Fetch KPI results, revisions, and evidence in parallel
  const [kpiRes, revisionsRes, evidenceRes, plan] = await Promise.all([
    supabase
      .from("pilot_validation_kpi_results")
      .select("*")
      .eq("validation_id", val.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("pilot_validation_revisions")
      .select("*")
      .eq("validation_id", val.id)
      .order("version", { ascending: false }),
    supabase
      .from("research_evidence")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    fetchPilotPlanByProjectId(projectId),
  ]);

  return {
    ...val,
    deviations: (Array.isArray(val.deviations) ? val.deviations : []) as unknown as PilotDeviationItem[],
    kpis: (kpiRes.data || []) as PilotValidationKPIResultRow[],
    revisions: (revisionsRes.data || []) as PilotValidationRevisionRow[],
    evidence: evidenceRes.data || [],
    plan,
    project: val.project as any,
    institution: val.institution,
    challenge: val.challenge as any,
  };
}

/**
 * Save or update pilot validation draft
 */
export async function savePilotValidationDraft(
  projectId: string,
  input: Partial<PilotValidationInput>
): Promise<PilotValidationWithDetails> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  // Fetch plan
  const { data: plan, error: planErr } = await supabase
    .from("pilot_plans")
    .select("id, challenge_id, institution_id, status, pilot_started_at, kpis")
    .eq("project_id", projectId)
    .single();

  if (planErr || !plan) throw new Error("Pilot plan not found");
  if (plan.status !== "APPROVED") throw new Error("Pilot plan must be approved before validation.");
  if (!plan.pilot_started_at) throw new Error("Pilot execution must be started before validation.");

  const payload: any = {
    pilot_plan_id: plan.id,
    project_id: projectId,
    challenge_id: plan.challenge_id,
    institution_id: plan.institution_id,
    overall_summary: input.overall_summary || "Draft overall summary",
    observed_outcomes: input.observed_outcomes || "Draft observed outcomes",
    deviations: (input.deviations as any) || [],
    lessons_learned: input.lessons_learned || "Draft lessons learned",
    limitations: input.limitations || null,
    recommendations: input.recommendations || null,
    university_interpretation: input.university_interpretation || null,
    status: "DRAFT",
    updated_at: new Date().toISOString(),
  };

  // Check if validation record already exists
  const { data: existing } = await supabase
    .from("pilot_validation_results")
    .select("id, status, version")
    .eq("project_id", projectId)
    .maybeSingle();

  let validationId: string;

  if (existing) {
    if (existing.status !== "DRAFT" && existing.status !== "REQUESTED_REVISION") {
      throw new Error(`Cannot edit validation in ${existing.status} status.`);
    }

    const { data: updated, error: updateErr } = await supabase
      .from("pilot_validation_results")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    validationId = updated.id;

    await logValidationActivity(
      projectId,
      profile.id,
      "VALIDATION_UPDATED",
      "Pilot validation draft updated.",
      { validation_id: validationId }
    );
  } else {
    payload.created_at = new Date().toISOString();
    payload.submitted_by = profile.id;
    const { data: inserted, error: insertErr } = await supabase
      .from("pilot_validation_results")
      .insert(payload)
      .select()
      .single();

    if (insertErr) throw insertErr;
    validationId = inserted.id;

    await logValidationActivity(
      projectId,
      profile.id,
      "VALIDATION_CREATED",
      "Initial pilot validation draft formulated.",
      { validation_id: validationId }
    );
  }

  // Save / Upsert KPI Results
  if (input.kpi_results && input.kpi_results.length > 0) {
    for (const k of input.kpi_results) {
      const kpiPayload = {
        validation_id: validationId,
        kpi_id: k.kpi_id,
        kpi_name: k.kpi_name,
        description: k.description || null,
        unit: k.unit || null,
        baseline_value: k.baseline_value,
        target_value: k.target_value,
        observed_value: k.observed_value,
        measurement_method: k.measurement_method || null,
        measurement_period: k.measurement_period || null,
        achievement_status: k.achievement_status || "INCONCLUSIVE",
        evidence_ids: (k.evidence_ids as any) || [],
        notes: k.notes || null,
      };

      const { data: existingKpi } = await supabase
        .from("pilot_validation_kpi_results")
        .select("id")
        .eq("validation_id", validationId)
        .eq("kpi_id", k.kpi_id)
        .maybeSingle();

      if (existingKpi) {
        await supabase
          .from("pilot_validation_kpi_results")
          .update(kpiPayload)
          .eq("id", existingKpi.id);
      } else {
        await supabase
          .from("pilot_validation_kpi_results")
          .insert(kpiPayload);
      }
    }
  }

  const full = await fetchPilotValidationByProjectId(projectId);
  return full!;
}

/**
 * Submit pilot validation for Innovation Manager review
 */
export async function submitPilotValidation(
  validationId: string,
  projectId: string
): Promise<PilotValidationResultRow> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { data: val, error: valErr } = await supabase
    .from("pilot_validation_results")
    .select("*")
    .eq("id", validationId)
    .single();

  if (valErr || !val) throw new Error("Validation record not found");
  if (val.status !== "DRAFT") {
    throw new Error(`Only draft validation can be submitted (current status: ${val.status})`);
  }

  if (!val.overall_summary || !val.observed_outcomes || !val.lessons_learned) {
    throw new Error("Please complete the overall summary, observed outcomes, and lessons learned before submitting.");
  }

  // Verify KPI results exist
  const { data: kpis } = await supabase
    .from("pilot_validation_kpi_results")
    .select("*")
    .eq("validation_id", validationId);

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from("pilot_validation_results")
    .update({
      status: "SUBMITTED",
      submitted_by: profile.id,
      submitted_at: now,
      updated_at: now,
    })
    .eq("id", validationId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Snapshot into revisions
  await supabase.from("pilot_validation_revisions").insert({
    validation_id: val.id,
    version: val.version,
    overall_summary: val.overall_summary,
    observed_outcomes: val.observed_outcomes,
    deviations: val.deviations,
    lessons_learned: val.lessons_learned,
    limitations: val.limitations,
    recommendations: val.recommendations,
    university_interpretation: val.university_interpretation,
    kpi_results_snapshot: (kpis as any) || [],
    status: "SUBMITTED",
    submitted_by: profile.id,
    submitted_at: now,
  });

  await logValidationActivity(
    projectId,
    profile.id,
    "VALIDATION_SUBMITTED",
    `Pilot validation results submitted for Innovation Manager review (v${val.version}).`,
    { validation_id: validationId, version: val.version }
  );

  return updated as PilotValidationResultRow;
}

/**
 * Start review of validation (Innovation Manager action)
 */
export async function startPilotValidationReview(
  validationId: string,
  projectId: string
): Promise<PilotValidationResultRow> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("pilot_validation_results")
    .update({
      status: "UNDER_REVIEW",
      reviewed_at: now,
      reviewed_by: profile.id,
      updated_at: now,
    })
    .eq("id", validationId)
    .select()
    .single();

  if (error) throw error;

  await logValidationActivity(
    projectId,
    profile.id,
    "VALIDATION_REVIEW_STARTED",
    "Innovation Manager began governance review of pilot validation results.",
    { validation_id: validationId }
  );

  return updated as PilotValidationResultRow;
}

/**
 * Request revision on validation (Innovation Manager action)
 */
export async function requestPilotValidationRevision(
  validationId: string,
  projectId: string,
  feedback: string
): Promise<PilotValidationResultRow> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  if (!feedback || feedback.trim().length < 10) {
    throw new Error("Revision feedback must be at least 10 characters.");
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("pilot_validation_results")
    .update({
      status: "REQUESTED_REVISION",
      review_feedback: feedback.trim(),
      revision_requested_at: now,
      reviewed_by: profile.id,
      updated_at: now,
    })
    .eq("id", validationId)
    .select()
    .single();

  if (error) throw error;

  await logValidationActivity(
    projectId,
    profile.id,
    "VALIDATION_REVISION_REQUESTED",
    `Validation revision requested: "${feedback.slice(0, 100)}..."`,
    { validation_id: validationId, feedback }
  );

  return updated as PilotValidationResultRow;
}

/**
 * Resubmit revised validation (University Project Lead action)
 */
export async function resubmitPilotValidation(
  validationId: string,
  projectId: string,
  input?: Partial<PilotValidationInput>
): Promise<PilotValidationResultRow> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  const { data: val, error: fetchErr } = await supabase
    .from("pilot_validation_results")
    .select("*")
    .eq("id", validationId)
    .single();

  if (fetchErr || !val) throw new Error("Validation record not found");
  if (val.status !== "REQUESTED_REVISION") {
    throw new Error(`Only validations with status REQUESTED_REVISION can be resubmitted (current status: ${val.status})`);
  }

  const updateData: any = {
    status: "RESUBMITTED",
    submitted_by: profile.id,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (input) {
    if (input.overall_summary) updateData.overall_summary = input.overall_summary;
    if (input.observed_outcomes) updateData.observed_outcomes = input.observed_outcomes;
    if (input.deviations) updateData.deviations = input.deviations as any;
    if (input.lessons_learned) updateData.lessons_learned = input.lessons_learned;
    if (input.limitations !== undefined) updateData.limitations = input.limitations;
    if (input.recommendations !== undefined) updateData.recommendations = input.recommendations;
    if (input.university_interpretation !== undefined) updateData.university_interpretation = input.university_interpretation;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("pilot_validation_results")
    .update(updateData)
    .eq("id", validationId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Snapshot into revisions
  const { data: kpis } = await supabase
    .from("pilot_validation_kpi_results")
    .select("*")
    .eq("validation_id", validationId);

  await supabase.from("pilot_validation_revisions").insert({
    validation_id: updated.id,
    version: updated.version,
    overall_summary: updated.overall_summary,
    observed_outcomes: updated.observed_outcomes,
    deviations: updated.deviations,
    lessons_learned: updated.lessons_learned,
    limitations: updated.limitations,
    recommendations: updated.recommendations,
    university_interpretation: updated.university_interpretation,
    kpi_results_snapshot: (kpis as any) || [],
    status: "RESUBMITTED",
    submitted_by: profile.id,
    submitted_at: new Date().toISOString(),
  });

  await logValidationActivity(
    projectId,
    profile.id,
    "VALIDATION_RESUBMITTED",
    `Revised validation results (v${updated.version}) resubmitted for Innovation Manager review.`,
    { validation_id: validationId, version: updated.version }
  );

  return updated as PilotValidationResultRow;
}

/**
 * Approve validation with authoritative governance outcome (Innovation Manager action)
 */
export async function approvePilotValidation(
  validationId: string,
  projectId: string,
  outcome: PilotValidationOutcome,
  notes?: string
): Promise<PilotValidationResultRow> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  if (!outcome) {
    throw new Error("You must select a final validation outcome (e.g. Meets Success Criteria).");
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("pilot_validation_results")
    .update({
      status: "APPROVED",
      final_outcome: outcome,
      approved_at: now,
      approved_by: profile.id,
      approval_notes: notes || null,
      reviewed_by: profile.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", validationId)
    .select()
    .single();

  if (error) throw error;

  const outcomeMeta = PILOT_VALIDATION_OUTCOME_META[outcome];
  await logValidationActivity(
    projectId,
    profile.id,
    "VALIDATION_APPROVED",
    `Pilot validation officially APPROVED with outcome: ${outcomeMeta.label}.${notes ? ` Notes: ${notes}` : ""}`,
    { validation_id: validationId, outcome, notes }
  );

  return updated as PilotValidationResultRow;
}

/**
 * Reject validation (Innovation Manager action)
 */
export async function rejectPilotValidation(
  validationId: string,
  projectId: string,
  reason: string
): Promise<PilotValidationResultRow> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Authenticated user required");

  if (!reason || reason.trim().length < 10) {
    throw new Error("Rejection reason must be at least 10 characters.");
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("pilot_validation_results")
    .update({
      status: "REJECTED",
      rejected_at: now,
      rejected_by: profile.id,
      rejection_reason: reason.trim(),
      reviewed_by: profile.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", validationId)
    .select()
    .single();

  if (error) throw error;

  await logValidationActivity(
    projectId,
    profile.id,
    "VALIDATION_REJECTED",
    `Pilot validation rejected: "${reason.slice(0, 100)}..."`,
    { validation_id: validationId, reason }
  );

  return updated as PilotValidationResultRow;
}

/**
 * Log activity helper
 */
async function logValidationActivity(
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
    console.warn("Failed to log validation activity:", err);
  }
}
