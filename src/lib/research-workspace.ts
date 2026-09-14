import { supabase } from "@/lib/supabase";
import type {
  BlockerSeverity,
  ChallengeProjectUpdate,
  EvidenceType,
  ResearchBlockerRiskInsert,
  ResearchBlockerRiskRow,
  ResearchEvidenceInsert,
  ResearchEvidenceRow,
  ResearchMilestoneStatus,
  ResearchProgressUpdateInsert,
  ResearchProgressUpdateRow,
  ResearchProjectMilestoneInsert,
  ResearchProjectMilestoneRow,
  ResearchProposalRow,
  ResearchStage,
  SupportCategory,
} from "@/types/database";

export interface ResearchWorkspaceSummary {
  projectId: string;
  projectTitle: string;
  projectSummary: string | null;
  institutionId: string;
  institutionName?: string;
  challengeId: string;
  challengeTitle?: string;
  updateCadenceDays: number;
  researchStage: ResearchStage;
  approvedProposal: ResearchProposalRow | null;
  isGated: boolean; // true if NO approved proposal
  proposalStatus: string | null;
  milestones: ResearchProjectMilestoneRow[];
  currentMilestone: ResearchProjectMilestoneRow | null;
  nextMilestone: ResearchProjectMilestoneRow | null;
  overallProgressPct: number;
  progressUpdates: (ResearchProgressUpdateRow & {
    submitterName?: string;
    acknowledgingManagerName?: string;
    evidenceItems?: ResearchEvidenceRow[];
  })[];
  lastUpdateAt: string | null;
  nextUpdateDueAt: string | null;
  daysRemainingOrOverdue: number; // positive = days until due, negative = days overdue, 0 = due today
  isOverdue: boolean;
  cadenceStatusLabel: string;
  evidence: ResearchEvidenceRow[];
  blockersAndRisks: ResearchBlockerRiskRow[];
  openBlockersCount: number;
  openRisksCount: number;
  activeSupportRequests: {
    id: string;
    title: string;
    category?: string | null;
    supportRequired: string;
    source: "BLOCKER" | "UPDATE";
    createdAt: string;
  }[];
}

export interface SubmitProgressUpdateInput {
  projectId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  summaryCompleted: string;
  currentFindings?: string;
  milestoneId?: string;
  milestoneProgressPct?: number;
  nextPlannedWork: string;
  supportRequired?: string;
  supportCategory?: SupportCategory;
  evidence?: {
    title: string;
    evidenceType: EvidenceType;
    url?: string;
    description?: string;
  }[];
  newBlocker?: {
    itemType: "BLOCKER" | "RISK";
    title: string;
    description: string;
    severity: BlockerSeverity;
    supportRequired?: string;
  };
}

export interface AddEvidenceInput {
  projectId: string;
  progressUpdateId?: string;
  milestoneId?: string;
  title: string;
  evidenceType: EvidenceType;
  url?: string;
  description?: string;
}

export interface ReportBlockerRiskInput {
  projectId: string;
  itemType: "BLOCKER" | "RISK";
  title: string;
  description: string;
  severity: BlockerSeverity;
  supportRequired?: string;
}

/**
 * Fetch all Research & Prototype Workspace data for a project
 */
export async function fetchResearchWorkspaceData(projectId: string): Promise<ResearchWorkspaceSummary | null> {
  // 1. Fetch project details
  const { data: project, error: projErr } = await supabase
    .from("challenge_projects")
    .select(`
      id,
      challenge_id,
      institution_id,
      project_title,
      project_summary,
      status,
      update_cadence_days,
      research_stage,
      created_at,
      challenge:innovation_challenges(id, title),
      institution:institutions(id, name)
    `)
    .eq("id", projectId)
    .single();

  if (projErr || !project) {
    console.error("fetchResearchWorkspaceData project error:", projErr);
    return null;
  }

  // 2. Fetch current approved proposal (strict gating check)
  const { data: proposals, error: propErr } = await supabase
    .from("research_proposals")
    .select("*")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false });

  if (propErr) {
    console.error("fetchResearchWorkspaceData proposals error:", propErr);
  }

  const approvedProposal = proposals?.find((p) => p.status === "APPROVED") || null;
  const currentProposal = proposals?.find((p) => p.is_current) || proposals?.[0] || null;
  const proposalStatus = approvedProposal ? "APPROVED" : currentProposal?.status || null;
  const isGated = !approvedProposal;

  // 3. Fetch milestones (if project is approved)
  let milestones: ResearchProjectMilestoneRow[] = [];
  if (!isGated) {
    const { data: mData, error: mErr } = await supabase
      .from("research_project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("sequence_order", { ascending: true });

    if (mErr) {
      console.error("fetchResearchWorkspaceData milestones error:", mErr);
    } else {
      milestones = mData || [];
    }

    // Auto-seed milestones if table is empty but proposal is approved
    if (milestones.length === 0) {
      const { error: seedErr } = await (
        supabase.rpc as unknown as (
          name: string,
          args: Record<string, unknown>
        ) => Promise<{ error: unknown }>
      )("seed_milestones_from_approved_proposal", {
        p_project_id: projectId,
      });
      if (!seedErr) {
        const { data: seededData } = await supabase
          .from("research_project_milestones")
          .select("*")
          .eq("project_id", projectId)
          .order("sequence_order", { ascending: true });
        if (seededData && seededData.length > 0) {
          milestones = seededData;
        }
      }
    }
  }

  // 4. Fetch progress updates
  let progressUpdates: (ResearchProgressUpdateRow & {
    submitterName?: string;
    acknowledgingManagerName?: string;
    evidenceItems?: ResearchEvidenceRow[];
  })[] = [];

  const { data: updatesData, error: upErr } = await supabase
    .from("research_progress_updates")
    .select(`
      *,
      submitter:profiles!research_progress_updates_submitted_by_fkey(full_name),
      manager:profiles!research_progress_updates_manager_acknowledged_by_fkey(full_name)
    `)
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false });

  if (upErr) {
    console.error("fetchResearchWorkspaceData updates error:", upErr);
  } else if (updatesData) {
    const rawUpdates = updatesData as unknown as Array<
      ResearchProgressUpdateRow & {
        submitter?: { full_name?: string } | null;
        manager?: { full_name?: string } | null;
      }
    >;
    progressUpdates = rawUpdates.map((u) => {
      const sub = u.submitter;
      const mgr = u.manager;
      return {
        ...u,
        submitterName: sub?.full_name || undefined,
        acknowledgingManagerName: mgr?.full_name || undefined,
      };
    });
  }

  // 5. Fetch evidence & external resources
  let evidence: ResearchEvidenceRow[] = [];
  const { data: evData, error: evErr } = await supabase
    .from("research_evidence")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (evErr) {
    console.error("fetchResearchWorkspaceData evidence error:", evErr);
  } else {
    evidence = evData || [];
  }

  // Attach evidence to their respective progress updates
  if (evidence.length > 0 && progressUpdates.length > 0) {
    progressUpdates = progressUpdates.map((u) => ({
      ...u,
      evidenceItems: evidence.filter((e) => e.progress_update_id === u.id),
    }));
  }

  // 6. Fetch risks and blockers
  let blockersAndRisks: ResearchBlockerRiskRow[] = [];
  const { data: brData, error: brErr } = await supabase
    .from("research_blockers_risks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (brErr) {
    console.error("fetchResearchWorkspaceData blockers error:", brErr);
  } else {
    blockersAndRisks = brData || [];
  }

  // 7. Compute Milestone progress & current/next pointers
  let overallProgressPct = 0;
  let currentMilestone: ResearchProjectMilestoneRow | null = null;
  let nextMilestone: ResearchProjectMilestoneRow | null = null;

  if (milestones.length > 0) {
    const totalPct = milestones.reduce((sum, m) => sum + (m.completion_percentage || 0), 0);
    overallProgressPct = Math.round(totalPct / milestones.length);

    // Find first active (IN_PROGRESS or BLOCKED or DELAYED) milestone
    const activeIdx = milestones.findIndex(
      (m) => m.status === "IN_PROGRESS" || m.status === "BLOCKED" || m.status === "DELAYED"
    );

    if (activeIdx !== -1) {
      currentMilestone = milestones[activeIdx];
      nextMilestone = milestones[activeIdx + 1] || null;
    } else {
      // If none currently in progress, find first NOT_STARTED
      const notStartedIdx = milestones.findIndex((m) => m.status === "NOT_STARTED");
      if (notStartedIdx !== -1) {
        currentMilestone = milestones[notStartedIdx];
        nextMilestone = milestones[notStartedIdx + 1] || null;
      } else {
        // All completed!
        currentMilestone = milestones[milestones.length - 1];
        nextMilestone = null;
      }
    }
  }

  // 8. Compute cadence & overdue metrics from authentic timestamps
  const cadenceDays = project.update_cadence_days || 5;
  const lastUpdate = progressUpdates[0] || null;
  const lastUpdateAt = lastUpdate?.submitted_at || null;

  const anchorDate = lastUpdateAt
    ? new Date(lastUpdateAt)
    : approvedProposal?.approved_at
    ? new Date(approvedProposal.approved_at)
    : new Date(project.created_at);

  const dueDate = new Date(anchorDate.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
  const nextUpdateDueAt = dueDate.toISOString();

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const daysRemainingOrOverdue = diffDays;

  let isOverdue: boolean;
  let cadenceStatusLabel: string;

  if (diffDays < 0) {
    isOverdue = true;
    const absOverdue = Math.abs(diffDays);
    cadenceStatusLabel = `Update overdue by ${absOverdue} day${absOverdue === 1 ? "" : "s"}`;
  } else if (diffDays === 0) {
    isOverdue = false;
    cadenceStatusLabel = "Update due today";
  } else {
    isOverdue = false;
    cadenceStatusLabel = `Update due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }

  // 9. Aggregate active blockers & support requests
  const openBlockers = blockersAndRisks.filter((b) => b.item_type === "BLOCKER" && b.status !== "RESOLVED");
  const openRisks = blockersAndRisks.filter((b) => b.item_type === "RISK" && b.status !== "RESOLVED");

  const activeSupportRequests: ResearchWorkspaceSummary["activeSupportRequests"] = [];

  for (const b of openBlockers) {
    if (b.support_required && b.support_required.trim().length > 0) {
      activeSupportRequests.push({
        id: b.id,
        title: b.title,
        supportRequired: b.support_required,
        source: "BLOCKER",
        createdAt: b.created_at,
      });
    }
  }

  for (const u of progressUpdates) {
    if (u.support_required && u.support_required.trim().length > 0 && !u.manager_acknowledged_at) {
      activeSupportRequests.push({
        id: u.id,
        title: `Period ${u.reporting_period_start} – ${u.reporting_period_end}`,
        supportRequired: u.support_required,
        category: u.support_category || undefined,
        source: "UPDATE",
        createdAt: u.submitted_at,
      });
    }
  }

  const chal = project.challenge as unknown as { title?: string } | null;
  const inst = project.institution as unknown as { name?: string } | null;

  return {
    projectId: project.id,
    projectTitle: project.project_title,
    projectSummary: project.project_summary,
    institutionId: project.institution_id,
    institutionName: inst?.name || undefined,
    challengeId: project.challenge_id,
    challengeTitle: chal?.title || undefined,
    updateCadenceDays: cadenceDays,
    researchStage: project.research_stage || "RESEARCH_STARTED",
    approvedProposal,
    isGated,
    proposalStatus,
    milestones,
    currentMilestone,
    nextMilestone,
    overallProgressPct,
    progressUpdates,
    lastUpdateAt,
    nextUpdateDueAt,
    daysRemainingOrOverdue,
    isOverdue,
    cadenceStatusLabel,
    evidence,
    blockersAndRisks,
    openBlockersCount: openBlockers.length,
    openRisksCount: openRisks.length,
    activeSupportRequests,
  };
}

/**
 * Submit a periodic progress update with optional milestone progression, evidence, and blockers
 */
export async function submitProgressUpdate(input: SubmitProgressUpdateInput): Promise<ResearchProgressUpdateRow> {
  const { data: profile } = await supabase.auth.getUser();
  let submitterProfileId: string | null = null;

  if (profile?.user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", profile.user.id)
      .maybeSingle();
    submitterProfileId = prof?.id || null;
  }

  // 1. Insert progress update
  const insertPayload: ResearchProgressUpdateInsert = {
    project_id: input.projectId,
    reporting_period_start: input.reportingPeriodStart,
    reporting_period_end: input.reportingPeriodEnd,
    summary_completed: input.summaryCompleted.trim(),
    current_findings: input.currentFindings?.trim() || null,
    milestone_id: input.milestoneId || null,
    milestone_progress_pct: input.milestoneProgressPct ?? null,
    next_planned_work: input.nextPlannedWork.trim(),
    support_required: input.supportRequired?.trim() || null,
    support_category: input.supportCategory || null,
    submitted_by: submitterProfileId,
  };

  const { data: updateRecord, error: updateErr } = await supabase
    .from("research_progress_updates")
    .insert(insertPayload)
    .select()
    .single();

  if (updateErr || !updateRecord) {
    console.error("submitProgressUpdate error:", updateErr);
    throw new Error(updateErr?.message || "Failed to submit progress update");
  }

  // 2. Update milestone progress percentage if provided
  if (input.milestoneId && input.milestoneProgressPct !== undefined) {
    const pct = Math.min(100, Math.max(0, input.milestoneProgressPct));
    let nextStatus: ResearchMilestoneStatus | undefined;
    if (pct === 100) {
      nextStatus = "COMPLETED";
    } else if (pct > 0) {
      nextStatus = "IN_PROGRESS";
    }

    const updateMilestonePayload: Partial<ResearchProjectMilestoneRow> = {
      completion_percentage: pct,
      updated_at: new Date().toISOString(),
    };
    if (nextStatus) {
      updateMilestonePayload.status = nextStatus;
      if (nextStatus === "COMPLETED") {
        updateMilestonePayload.actual_completion_date = new Date().toISOString().split("T")[0];
      }
    }

    await supabase
      .from("research_project_milestones")
      .update(updateMilestonePayload)
      .eq("id", input.milestoneId);
  }

  // 3. Attach evidence items if any
  if (input.evidence && input.evidence.length > 0) {
    for (const ev of input.evidence) {
      if (ev.title.trim().length > 0) {
        await supabase.from("research_evidence").insert({
          project_id: input.projectId,
          progress_update_id: updateRecord.id,
          milestone_id: input.milestoneId || null,
          title: ev.title.trim(),
          evidence_type: ev.evidenceType,
          url: ev.url?.trim() || null,
          description: ev.description?.trim() || null,
          uploaded_by: submitterProfileId,
        });
      }
    }
  }

  // 4. Report new blocker/risk if included in update
  if (input.newBlocker && input.newBlocker.title.trim().length > 0) {
    await supabase.from("research_blockers_risks").insert({
      project_id: input.projectId,
      item_type: input.newBlocker.itemType,
      title: input.newBlocker.title.trim(),
      description: input.newBlocker.description.trim(),
      severity: input.newBlocker.severity,
      status: "OPEN",
      support_required: input.newBlocker.supportRequired?.trim() || null,
      reported_by: submitterProfileId,
    });
  }

  // 5. Log activity
  if (submitterProfileId) {
    await supabase.from("challenge_project_activity").insert({
      project_id: input.projectId,
      actor_profile_id: submitterProfileId,
      activity_type: "PROGRESS_UPDATE_SUBMITTED",
      description: `Progress update submitted for period ${input.reportingPeriodStart} – ${input.reportingPeriodEnd}`,
      metadata: {
        update_id: updateRecord.id,
        milestone_id: input.milestoneId,
        milestone_progress_pct: input.milestoneProgressPct,
        has_support_required: Boolean(input.supportRequired),
      },
    });
  }

  return updateRecord;
}

/**
 * Innovation Manager acknowledges a submitted progress update
 */
export async function acknowledgeProgressUpdate(
  updateId: string,
  projectId: string,
  feedback?: string
): Promise<ResearchProgressUpdateRow> {
  const { data: profile } = await supabase.auth.getUser();
  let managerProfileId: string | null = null;

  if (profile?.user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", profile.user.id)
      .maybeSingle();
    managerProfileId = prof?.id || null;
  }

  const { data: updated, error } = await supabase
    .from("research_progress_updates")
    .update({
      manager_acknowledged_at: new Date().toISOString(),
      manager_acknowledged_by: managerProfileId,
      manager_feedback: feedback?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updateId)
    .select()
    .single();

  if (error || !updated) {
    console.error("acknowledgeProgressUpdate error:", error);
    throw new Error(error?.message || "Failed to acknowledge update");
  }

  // Log activity
  if (managerProfileId) {
    await supabase.from("challenge_project_activity").insert({
      project_id: projectId,
      actor_profile_id: managerProfileId,
      activity_type: "PROGRESS_UPDATE_ACKNOWLEDGED",
      description: `Innovation Manager acknowledged progress update with feedback`,
      metadata: {
        update_id: updateId,
        has_feedback: Boolean(feedback && feedback.trim().length > 0),
      },
    });
  }

  return updated;
}

/**
 * Update milestone progression or status
 */
export async function updateMilestoneStatus(
  milestoneId: string,
  projectId: string,
  status: ResearchMilestoneStatus,
  completionPercentage: number,
  notes?: string
): Promise<ResearchProjectMilestoneRow> {
  const { data: profile } = await supabase.auth.getUser();
  let actorProfileId: string | null = null;

  if (profile?.user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", profile.user.id)
      .maybeSingle();
    actorProfileId = prof?.id || null;
  }

  const pct = Math.min(100, Math.max(0, completionPercentage));
  const payload: Partial<ResearchProjectMilestoneRow> = {
    status,
    completion_percentage: pct,
    updated_at: new Date().toISOString(),
  };

  if (notes !== undefined) {
    payload.notes = notes.trim() || null;
  }

  if (status === "COMPLETED" || pct === 100) {
    payload.status = "COMPLETED";
    payload.completion_percentage = 100;
    payload.actual_completion_date = new Date().toISOString().split("T")[0];
  }

  const { data: updated, error } = await supabase
    .from("research_project_milestones")
    .update(payload)
    .eq("id", milestoneId)
    .select()
    .single();

  if (error || !updated) {
    console.error("updateMilestoneStatus error:", error);
    throw new Error(error?.message || "Failed to update milestone");
  }

  // Log activity
  if (actorProfileId) {
    const actType = updated.status === "COMPLETED" ? "MILESTONE_COMPLETED" : "MILESTONE_UPDATED";
    await supabase.from("challenge_project_activity").insert({
      project_id: projectId,
      actor_profile_id: actorProfileId,
      activity_type: actType,
      description: `Milestone "${updated.title}" updated to ${updated.status} (${updated.completion_percentage}%)`,
      metadata: {
        milestone_id: milestoneId,
        status: updated.status,
        percentage: updated.completion_percentage,
      },
    });
  }

  return updated;
}

/**
 * Create a new operational milestone
 */
export async function createOperationalMilestone(
  input: Omit<ResearchProjectMilestoneInsert, "id" | "created_at" | "updated_at">
): Promise<ResearchProjectMilestoneRow> {
  const { data: profile } = await supabase.auth.getUser();
  let actorProfileId: string | null = null;

  if (profile?.user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", profile.user.id)
      .maybeSingle();
    actorProfileId = prof?.id || null;
  }

  const { data: created, error } = await supabase
    .from("research_project_milestones")
    .insert(input)
    .select()
    .single();

  if (error || !created) {
    console.error("createOperationalMilestone error:", error);
    throw new Error(error?.message || "Failed to create milestone");
  }

  if (actorProfileId) {
    await supabase.from("challenge_project_activity").insert({
      project_id: input.project_id,
      actor_profile_id: actorProfileId,
      activity_type: "MILESTONE_CREATED",
      description: `New operational milestone created: "${created.title}"`,
      metadata: { milestone_id: created.id },
    });
  }

  return created;
}

/**
 * Add research evidence or external resource link
 */
export async function addResearchEvidence(input: AddEvidenceInput): Promise<ResearchEvidenceRow> {
  const { data: profile } = await supabase.auth.getUser();
  let actorProfileId: string | null = null;

  if (profile?.user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", profile.user.id)
      .maybeSingle();
    actorProfileId = prof?.id || null;
  }

  const insertPayload: ResearchEvidenceInsert = {
    project_id: input.projectId,
    progress_update_id: input.progressUpdateId || null,
    milestone_id: input.milestoneId || null,
    title: input.title.trim(),
    evidence_type: input.evidenceType,
    url: input.url?.trim() || null,
    description: input.description?.trim() || null,
    uploaded_by: actorProfileId,
  };

  const { data: evidenceRecord, error } = await supabase
    .from("research_evidence")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !evidenceRecord) {
    console.error("addResearchEvidence error:", error);
    throw new Error(error?.message || "Failed to add research evidence");
  }

  if (actorProfileId) {
    const actType = input.url ? "EXTERNAL_RESOURCE_ADDED" : "EVIDENCE_ADDED";
    await supabase.from("challenge_project_activity").insert({
      project_id: input.projectId,
      actor_profile_id: actorProfileId,
      activity_type: actType,
      description: `Attached ${input.evidenceType.toLowerCase()}: "${evidenceRecord.title}"`,
      metadata: {
        evidence_id: evidenceRecord.id,
        evidence_type: evidenceRecord.evidence_type,
        url: evidenceRecord.url,
      },
    });
  }

  return evidenceRecord;
}

/**
 * Report a technical blocker or prospective risk
 */
export async function reportBlockerOrRisk(input: ReportBlockerRiskInput): Promise<ResearchBlockerRiskRow> {
  const { data: profile } = await supabase.auth.getUser();
  let actorProfileId: string | null = null;

  if (profile?.user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", profile.user.id)
      .maybeSingle();
    actorProfileId = prof?.id || null;
  }

  const insertPayload: ResearchBlockerRiskInsert = {
    project_id: input.projectId,
    item_type: input.itemType,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    status: "OPEN",
    support_required: input.supportRequired?.trim() || null,
    reported_by: actorProfileId,
  };

  const { data: record, error } = await supabase
    .from("research_blockers_risks")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !record) {
    console.error("reportBlockerOrRisk error:", error);
    throw new Error(error?.message || "Failed to report blocker or risk");
  }

  if (actorProfileId) {
    const actType = input.itemType === "BLOCKER" ? "BLOCKER_REPORTED" : "RISK_REPORTED";
    await supabase.from("challenge_project_activity").insert({
      project_id: input.projectId,
      actor_profile_id: actorProfileId,
      activity_type: actType,
      description: `${input.itemType} reported (${input.severity} severity): "${record.title}"`,
      metadata: {
        item_id: record.id,
        severity: record.severity,
        support_required: Boolean(record.support_required),
      },
    });
  }

  return record;
}

/**
 * Resolve an active blocker or risk
 */
export async function resolveBlockerOrRisk(
  id: string,
  projectId: string,
  resolutionNotes: string
): Promise<ResearchBlockerRiskRow> {
  const { data: profile } = await supabase.auth.getUser();
  let actorProfileId: string | null = null;

  if (profile?.user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", profile.user.id)
      .maybeSingle();
    actorProfileId = prof?.id || null;
  }

  const { data: updated, error } = await supabase
    .from("research_blockers_risks")
    .update({
      status: "RESOLVED",
      resolution_notes: resolutionNotes.trim(),
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    console.error("resolveBlockerOrRisk error:", error);
    throw new Error(error?.message || "Failed to resolve item");
  }

  if (actorProfileId) {
    await supabase.from("challenge_project_activity").insert({
      project_id: projectId,
      actor_profile_id: actorProfileId,
      activity_type: "BLOCKER_RESOLVED",
      description: `Resolved ${updated.item_type.toLowerCase()}: "${updated.title}"`,
      metadata: { item_id: updated.id },
    });
  }

  return updated;
}

/**
 * Update project reporting cadence (days) or research stage
 */
export async function updateProjectCadenceAndStage(
  projectId: string,
  data: { cadenceDays?: number; researchStage?: ResearchStage }
): Promise<void> {
  const payload: Partial<ChallengeProjectUpdate> = {
    updated_at: new Date().toISOString(),
  };

  if (data.cadenceDays !== undefined) {
    payload.update_cadence_days = Math.min(90, Math.max(1, data.cadenceDays));
  }
  if (data.researchStage) {
    payload.research_stage = data.researchStage;
  }

  const { error } = await supabase
    .from("challenge_projects")
    .update(payload)
    .eq("id", projectId);

  if (error) {
    console.error("updateProjectCadenceAndStage error:", error);
    throw new Error(error.message);
  }
}
