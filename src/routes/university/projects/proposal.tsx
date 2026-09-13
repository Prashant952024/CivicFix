import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Save,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Layers,
  Users,
  Target,
  ShieldAlert,
  Calendar,
  Package,
  Wrench,
  Lock,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { TeamMemberProfileDialog } from "@/components/projects/team-member-profile-dialog";
import { getRoleBadgeColor } from "@/components/projects/team-member-utils";
import {
  fetchProjectById,
  fetchProjectMembers,
  type ChallengeProjectWithDetails,
  type ChallengeProjectMemberWithProfile,
} from "@/lib/projects";
import {
  fetchProjectProposals,
  createProposalDraft,
  updateProposalDraft,
  submitProposal,
  createProposalRevision,
  checkProposalCompleteness,
  type ResearchProposalWithDetails,
  type ResearchProposalInput,
  type ProposalMilestone,
  type ProposalDeliverable,
  type ProposalRisk,
  type ProposalMetric,
  type ProposalResource,
} from "@/lib/proposals";
import type { ProposalStatus } from "@/types/database";

const SECTIONS = [
  { id: "objective", title: "Project Objective", icon: Target },
  { id: "questions", title: "Research Questions", icon: FileText },
  { id: "methodology", title: "Methodology", icon: Layers },
  { id: "technical", title: "Technical Approach", icon: Wrench },
  { id: "team", title: "Team Capabilities", icon: Users },
  { id: "resources", title: "Required Resources", icon: Package },
  { id: "prototype", title: "Expected Prototype", icon: Sparkles },
  { id: "milestones", title: "Timeline & Milestones", icon: Calendar },
  { id: "deliverables", title: "Deliverables", icon: CheckCircle2 },
  { id: "risks", title: "Risks & Mitigation", icon: ShieldAlert },
  { id: "metrics", title: "Success Metrics", icon: Target },
];

export function UniversityProposalWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { profile, roleCode } = useAppSession();
  const navigate = useNavigate();

  const [project, setProject] = useState<ChallengeProjectWithDetails | null>(null);
  const [members, setMembers] = useState<ChallengeProjectMemberWithProfile[]>([]);
  const [proposals, setProposals] = useState<ResearchProposalWithDetails[]>([]);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revising, setRevising] = useState(false);

  // Active proposal form fields
  const [objective, setObjective] = useState("");
  const [researchQuestions, setResearchQuestions] = useState<string[]>([]);
  const [methodology, setMethodology] = useState("");
  const [technicalApproach, setTechnicalApproach] = useState("");
  const [teamSummary, setTeamSummary] = useState("");
  const [resources, setResources] = useState<ProposalResource[]>([]);
  const [prototype, setPrototype] = useState("");
  const [milestones, setMilestones] = useState<ProposalMilestone[]>([]);
  const [deliverables, setDeliverables] = useState<ProposalDeliverable[]>([]);
  const [risks, setRisks] = useState<ProposalRisk[]>([]);
  const [metrics, setMetrics] = useState<ProposalMetric[]>([]);

  // UI state
  const [activeSection, setActiveSection] = useState("objective");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [viewingProfileMember, setViewingProfileMember] =
    useState<ChallengeProjectMemberWithProfile | null>(null);

  // Load project & proposals data
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function loadWorkspace() {
      setLoading(true);
      setActionError(null);

      try {
        const [projData, membersData, proposalsData] = await Promise.all([
          fetchProjectById(projectId!),
          fetchProjectMembers(projectId!),
          fetchProjectProposals(projectId!),
        ]);

        if (cancelled) return;

        setProject(projData);
        setMembers(membersData);
        setProposals(proposalsData);

        if (proposalsData.length > 0) {
          // Select latest proposal by default
          const latest = proposalsData[0];
          setActiveProposalId(latest.id);
          populateForm(latest);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setActionError(err instanceof Error ? err.message : "Failed to load research proposal workspace.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Populate form from proposal record
  function populateForm(proposal: ResearchProposalWithDetails) {
    setObjective(proposal.project_objective ?? "");
    setResearchQuestions(
      Array.isArray(proposal.research_questions)
        ? (proposal.research_questions as string[])
        : []
    );
    setMethodology(proposal.proposed_methodology ?? "");
    setTechnicalApproach(proposal.technical_approach ?? "");
    setTeamSummary(proposal.team_capability_summary ?? "");
    setResources(
      Array.isArray(proposal.required_resources)
        ? (proposal.required_resources as unknown as ProposalResource[])
        : []
    );
    setPrototype(proposal.expected_prototype ?? "");
    setMilestones(
      Array.isArray(proposal.milestones)
        ? (proposal.milestones as unknown as ProposalMilestone[])
        : []
    );
    setDeliverables(
      Array.isArray(proposal.deliverables)
        ? (proposal.deliverables as unknown as ProposalDeliverable[])
        : []
    );
    setRisks(
      Array.isArray(proposal.risks_and_mitigation)
        ? (proposal.risks_and_mitigation as unknown as ProposalRisk[])
        : []
    );
    setMetrics(
      Array.isArray(proposal.success_metrics)
        ? (proposal.success_metrics as unknown as ProposalMetric[])
        : []
    );
  }

  // Active selected proposal
  const currentProposal = useMemo(() => {
    return proposals.find((p) => p.id === activeProposalId) ?? proposals[0] ?? null;
  }, [proposals, activeProposalId]);

  const proposalStatus: ProposalStatus = currentProposal?.status ?? "DRAFT";
  const isReadOnly = proposalStatus === "SUBMITTED" || proposalStatus === "UNDER_REVIEW" || proposalStatus === "APPROVED";

  // Check user authority
  const isAuthorizedToEdit = useMemo(() => {
    if (!profile || !project) return false;
    if (roleCode === "ADMIN" || roleCode === "INNOVATION_MANAGER") return true;
    if (project.project_lead_profile_id === profile.id) return true;
    return false;
  }, [profile, project, roleCode]);

  // Form input snapshot
  const formPayload: ResearchProposalInput = useMemo(() => ({
    project_objective: objective,
    research_questions: researchQuestions,
    proposed_methodology: methodology,
    technical_approach: technicalApproach,
    team_capability_summary: teamSummary,
    required_resources: resources,
    expected_prototype: prototype,
    milestones,
    deliverables,
    risks_and_mitigation: risks,
    success_metrics: metrics,
  }), [
    objective,
    researchQuestions,
    methodology,
    technicalApproach,
    teamSummary,
    resources,
    prototype,
    milestones,
    deliverables,
    risks,
    metrics,
  ]);

  // Completeness check
  const completeness = useMemo(() => {
    return checkProposalCompleteness(formPayload);
  }, [formPayload]);

  // Handle Switch Version
  function handleSelectProposalVersion(propId: string) {
    const selected = proposals.find((p) => p.id === propId);
    if (selected) {
      setActiveProposalId(selected.id);
      populateForm(selected);
      setActionSuccess(null);
      setActionError(null);
    }
  }

  // Create initial draft if none exists
  async function handleCreateInitialDraft() {
    if (!projectId) return;
    setSaving(true);
    setActionError(null);

    try {
      const newDraft = await createProposalDraft(projectId);
      const updatedList = await fetchProjectProposals(projectId);
      setProposals(updatedList);
      setActiveProposalId(newDraft.id);
      populateForm(newDraft);
      setActionSuccess("Initial research proposal draft created.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to create draft.");
    } finally {
      setSaving(false);
    }
  }

  // Save Draft in place
  async function handleSaveDraft() {
    if (!currentProposal) return;
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await updateProposalDraft(currentProposal.id, formPayload);
      const updatedList = await fetchProjectProposals(projectId!);
      setProposals(updatedList);
      setActionSuccess("Research proposal draft saved successfully.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  // Submit Proposal
  async function handleSubmitProposal() {
    if (!currentProposal) return;
    if (!completeness.isComplete) {
      setActionError(`Cannot submit: ${completeness.missingSections.join(", ")}`);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await submitProposal(currentProposal.id, formPayload);
      const updatedList = await fetchProjectProposals(projectId!);
      setProposals(updatedList);
      setSubmitConfirmOpen(false);
      setActionSuccess("Proposal successfully submitted for Innovation Manager review!");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  // Create Revision Version (vN+1)
  async function handleStartRevision() {
    if (!currentProposal || !projectId) return;
    setRevising(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const newRevision = await createProposalRevision(currentProposal.id, formPayload);
      const updatedList = await fetchProjectProposals(projectId);
      setProposals(updatedList);
      setActiveProposalId(newRevision.id);
      populateForm(newRevision);
      setActionSuccess(`New proposal revision version ${newRevision.version_number} created. You can now make required updates.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to start revision.");
    } finally {
      setRevising(false);
    }
  }

  // Dynamic Array Handlers
  function addResearchQuestion() {
    setResearchQuestions([...researchQuestions, ""]);
  }
  function updateResearchQuestion(index: number, val: string) {
    const updated = [...researchQuestions];
    updated[index] = val;
    setResearchQuestions(updated);
  }
  function removeResearchQuestion(index: number) {
    setResearchQuestions(researchQuestions.filter((_, i) => i !== index));
  }

  function addResource() {
    setResources([
      ...resources,
      {
        id: crypto.randomUUID(),
        category: "Laboratory / Testing Facility",
        description: "",
        critical: true,
      },
    ]);
  }
  function updateResource<K extends keyof ProposalResource>(index: number, field: K, val: ProposalResource[K]) {
    const updated = [...resources];
    updated[index] = { ...updated[index], [field]: val };
    setResources(updated);
  }
  function removeResource(index: number) {
    setResources(resources.filter((_, i) => i !== index));
  }

  function addMilestone() {
    setMilestones([
      ...milestones,
      {
        id: crypto.randomUUID(),
        name: `Milestone ${milestones.length + 1}`,
        description: "",
        expected_completion: "Month 2",
        deliverables: "",
      },
    ]);
  }
  function updateMilestone(index: number, field: keyof ProposalMilestone, val: string) {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: val };
    setMilestones(updated);
  }
  function removeMilestone(index: number) {
    setMilestones(milestones.filter((_, i) => i !== index));
  }

  function addDeliverable() {
    setDeliverables([
      ...deliverables,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        format: "Research Report",
      },
    ]);
  }
  function updateDeliverable(index: number, field: keyof ProposalDeliverable, val: string) {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], [field]: val };
    setDeliverables(updated);
  }
  function removeDeliverable(index: number) {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  }

  function addRisk() {
    setRisks([
      ...risks,
      {
        id: crypto.randomUUID(),
        risk: "",
        impact: "MEDIUM",
        mitigation: "",
      },
    ]);
  }
  function updateRisk<K extends keyof ProposalRisk>(index: number, field: K, val: ProposalRisk[K]) {
    const updated = [...risks];
    updated[index] = { ...updated[index], [field]: val };
    setRisks(updated);
  }
  function removeRisk(index: number) {
    setRisks(risks.filter((_, i) => i !== index));
  }

  function addMetric() {
    setMetrics([
      ...metrics,
      {
        id: crypto.randomUUID(),
        metric: "",
        target: "",
        measurement_method: "",
      },
    ]);
  }
  function updateMetric(index: number, field: keyof ProposalMetric, val: string) {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: val };
    setMetrics(updated);
  }
  function removeMetric(index: number) {
    setMetrics(metrics.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RotateCcw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">
          Loading Research Proposal Workspace...
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EmptyState
          title="Project Not Found"
          description="The requested project workspace does not exist or has been removed."
          action={
            <Button onClick={() => { void navigate("/app/university"); }}>
              Return to Institution Workspace
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumbs & Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            to={`/app/university/projects/${projectId}`}
            className="hover:text-foreground flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Project Workspace
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Research Proposal</span>
        </div>

        {/* Version Switcher if multiple versions exist */}
        {proposals.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Version:</span>
            <div className="flex items-center gap-1">
              {proposals.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={p.id === currentProposal?.id ? "default" : "outline"}
                  onClick={() => handleSelectProposalVersion(p.id)}
                  className="h-7 text-xs font-semibold px-2.5"
                >
                  v{p.version_number}
                  {p.is_current && <span className="ml-1 text-[10px] opacity-80">(Active)</span>}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
                Version {currentProposal?.version_number ?? 1}
              </Badge>
              {proposalStatus === "DRAFT" && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                  DRAFT
                </Badge>
              )}
              {proposalStatus === "SUBMITTED" && (
                <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300">
                  SUBMITTED • AWAITING REVIEW
                </Badge>
              )}
              {proposalStatus === "UNDER_REVIEW" && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                  UNDER REVIEW
                </Badge>
              )}
              {proposalStatus === "REQUESTED_REVISION" && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300">
                  REVISION REQUESTED
                </Badge>
              )}
              {proposalStatus === "RESUBMITTED" && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300">
                  RESUBMITTED • AWAITING REVIEW
                </Badge>
              )}
              {proposalStatus === "APPROVED" && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                  APPROVED • LOCKED
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Formal Research Proposal
            </h1>
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-semibold text-foreground">{project.project_title}</span> • Challenge:{" "}
              <span className="font-semibold text-foreground">{project.challenge.title}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!currentProposal && isAuthorizedToEdit && (
              <Button onClick={() => { void handleCreateInitialDraft(); }} disabled={saving} className="gap-2">
                <Plus className="w-4 h-4" />
                {saving ? "Creating Draft..." : "Initialize Research Proposal"}
              </Button>
            )}

            {currentProposal && proposalStatus === "DRAFT" && isAuthorizedToEdit && (
              <>
                <Button variant="outline" onClick={() => { void handleSaveDraft(); }} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  onClick={() => setSubmitConfirmOpen(true)}
                  disabled={submitting || !completeness.isComplete}
                  className="gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Submit Proposal
                </Button>
              </>
            )}

            {currentProposal && proposalStatus === "REQUESTED_REVISION" && isAuthorizedToEdit && (
              <Button onClick={() => { void handleStartRevision(); }} disabled={revising} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {revising ? "Preparing Revision..." : `Create Revision (v${currentProposal.version_number + 1})`}
              </Button>
            )}

            {proposalStatus === "APPROVED" && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                <Lock className="w-3.5 h-3.5" />
                Approved &amp; Locked
              </div>
            )}
          </div>
        </div>

        {/* Read-only Alert for Submitted/Under Review */}
        {isReadOnly && (
          <div className="mt-4 p-3 bg-muted/60 border border-border rounded-xl flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <span>
              This proposal version is in <strong>{proposalStatus}</strong> state and cannot be modified.{" "}
              {proposalStatus === "APPROVED" ? "It has been officially approved." : "It is awaiting Innovation Manager evaluation."}
            </span>
          </div>
        )}

        {/* Manager Review Feedback Banner if REQUESTED_REVISION */}
        {proposalStatus === "REQUESTED_REVISION" && currentProposal?.review_feedback && (
          <div className="mt-4 p-4 rounded-xl border border-orange-300 dark:border-orange-800 bg-orange-50/90 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-orange-950 dark:text-orange-100">
                  Innovation Manager Review Feedback (Revision Required)
                </h4>
                <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                  {currentProposal.review_feedback}
                </p>
                {currentProposal.revision_requested_at && (
                  <p className="text-[11px] text-orange-700 dark:text-orange-400 pt-1">
                    Requested on: {new Date(currentProposal.revision_requested_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Notifications */}
        {actionSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* Main Content Layout: Sidebar Navigation + Active Form */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Section Navigator & Readiness Checklist */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Proposal Sections</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {completeness.score}% Ready
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-0.5">
              {SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isSecActive = activeSection === sec.id;
                const isComplete = completeness.checklist[sec.id as keyof typeof completeness.checklist] ?? false;

                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isSecActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground/80 hover:bg-muted/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sec.title}</span>
                    </div>
                    {isComplete ? (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSecActive ? "text-primary-foreground" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      />
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSecActive ? "bg-primary-foreground/60" : "bg-amber-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Proposal Completeness Card */}
          <Card className="border-border/80 shadow-sm bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Submission Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Mandatory Sections</span>
                  <span className="font-semibold text-foreground">
                    {Object.values(completeness.checklist).filter(Boolean).length} / 10
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      completeness.isComplete ? "bg-emerald-500" : "bg-primary"
                    }`}
                    style={{ width: `${completeness.score}%` }}
                  />
                </div>
              </div>

              {!completeness.isComplete && (
                <div className="space-y-1 pt-1">
                  <span className="font-semibold text-[11px] text-amber-700 dark:text-amber-400">
                    Remaining required items:
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                    {completeness.missingSections.slice(0, 4).map((sec, i) => (
                      <li key={i} className="truncate">
                        {sec}
                      </li>
                    ))}
                    {completeness.missingSections.length > 4 && (
                      <li className="font-semibold text-primary">
                        +{completeness.missingSections.length - 4} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 3 Columns: Active Section Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION 1: PROJECT OBJECTIVE */}
          {activeSection === "objective" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  1. Project Objective &amp; Problem Alignment
                </CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Clearly articulate what this research project intends to achieve, how it addresses the core citizen problem identified in the Innovation Challenge, and the intended outcome.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="proposal-objective" className="text-xs font-semibold text-foreground">
                    Primary Objective Statement <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="proposal-objective"
                    name="proposalObjective"
                    rows={6}
                    disabled={isReadOnly}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="e.g. To develop, deploy, and evaluate a decentralized, solar-powered low-latency water telemetry sensor network with localized predictive anomaly detection to eliminate recurring water delivery failures in Ward 12..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-input bg-background text-foreground disabled:opacity-80 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Minimum 20 characters required.</span>
                    <span className={objective.trim().length >= 20 ? "text-emerald-600 font-semibold" : ""}>
                      {objective.trim().length} characters
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-xl border border-border text-xs text-muted-foreground space-y-1">
                  <span className="font-semibold text-foreground">Challenge Context:</span>
                  <p className="line-clamp-2">{project.challenge.problem_statement}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 2: RESEARCH QUESTIONS */}
          {activeSection === "questions" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    2. Specific Research Questions
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Formulate 2–5 scientific, technological, or civic questions that this study directly investigates.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={addResearchQuestion} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {researchQuestions.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2">
                    <p>No research questions added yet.</p>
                    {!isReadOnly && (
                      <Button size="sm" onClick={addResearchQuestion} className="text-xs">
                        Add First Question
                      </Button>
                    )}
                  </div>
                ) : (
                  researchQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-muted/20 p-3 rounded-xl border border-border">
                      <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-md shrink-0">
                        Q{idx + 1}
                      </span>
                      <input
                        id={`proposal-question-${idx}`}
                        name={`proposalQuestion_${idx}`}
                        type="text"
                        disabled={isReadOnly}
                        value={q}
                        onChange={(e) => updateResearchQuestion(idx, e.target.value)}
                        placeholder="e.g. Can multi-sensor calibration achieve ±3% telemetry accuracy under extreme seasonal temperature variations?"
                        className="flex-1 text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-input bg-background text-foreground disabled:opacity-80 focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                      {!isReadOnly && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeResearchQuestion(idx)}
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 3: PROPOSED METHODOLOGY */}
          {activeSection === "methodology" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  3. Proposed Research Methodology
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Describe research design, data collection, experimental protocols, field sampling, and validation processes.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="proposal-methodology" className="text-xs font-semibold text-foreground">
                    Methodological Framework <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="proposal-methodology"
                    name="proposalMethodology"
                    rows={8}
                    disabled={isReadOnly}
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    placeholder="Describe baseline literature review, controlled laboratory trials, empirical field data acquisition, statistical validation, and ethical compliance..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-input bg-background text-foreground disabled:opacity-80 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Minimum 20 characters required.</span>
                    <span className={methodology.trim().length >= 20 ? "text-emerald-600 font-semibold" : ""}>
                      {methodology.trim().length} characters
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 4: TECHNICAL APPROACH */}
          {activeSection === "technical" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  4. Technical Approach &amp; System Architecture
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Detail algorithms, models, software tools, hardware configurations, sensors, and integration requirements.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="proposal-technical-approach" className="text-xs font-semibold text-foreground">
                    Technical Specifications &amp; Architecture <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="proposal-technical-approach"
                    name="proposalTechnicalApproach"
                    rows={8}
                    disabled={isReadOnly}
                    value={technicalApproach}
                    onChange={(e) => setTechnicalApproach(e.target.value)}
                    placeholder="Specify software stacks, hardware microcontrollers, telemetry protocols (LoRaWAN / NB-IoT), database schemas, edge inferencing pipelines, and interfaces..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-input bg-background text-foreground disabled:opacity-80 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Minimum 20 characters required.</span>
                    <span className={technicalApproach.trim().length >= 20 ? "text-emerald-600 font-semibold" : ""}>
                      {technicalApproach.trim().length} characters
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 5: TEAM CAPABILITIES */}
          {activeSection === "team" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  5. Team Capabilities &amp; Execution Readiness
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  The research roster is automatically integrated from your project team workspace. Provide any additional narrative explaining execution capability.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Active Members Roster Preview */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Registered Project Research Roster ({members.filter((m) => m.is_active).length} members)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Auto-synced from team workspace
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members
                      .filter((m) => m.is_active)
                      .map((member) => (
                        <div
                          key={member.id}
                          className="p-3 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-colors flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs",
                                getRoleBadgeColor(member.role)
                              )}
                            >
                              {(member.member_name || member.profile?.full_name || "M").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1 text-xs space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground truncate">
                                  {member.member_name || member.profile?.full_name || "Team Member"}
                                </span>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                    getRoleBadgeColor(member.role)
                                  )}
                                >
                                  {member.role}
                                </span>
                                {member.member_type && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-medium">
                                    {member.member_type}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {member.designation || member.academic_program || "Researcher"} • {member.department || "Academic Dept"}
                              </p>
                              {member.primary_expertise && (
                                <p className="text-[11px] text-primary font-medium truncate">
                                  ⚡ {member.primary_expertise}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingProfileMember(member)}
                            className="h-7 px-2 text-[11px] shrink-0 font-medium hover:border-primary/50"
                          >
                            Profile
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label htmlFor="proposal-team-summary" className="text-xs font-semibold text-foreground">
                    Team Justification Narrative (Optional)
                  </label>
                  <textarea
                    id="proposal-team-summary"
                    name="proposalTeamSummary"
                    rows={4}
                    disabled={isReadOnly}
                    value={teamSummary}
                    onChange={(e) => setTeamSummary(e.target.value)}
                    placeholder="Summarize key institutional strengths, specialized lab background, prior peer-reviewed research, or collaborative advantages..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-input bg-background text-foreground disabled:opacity-80 focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 6: REQUIRED RESOURCES */}
          {activeSection === "resources" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    6. Required Resources &amp; Facilities
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    List laboratories, hardware components, compute power, datasets, or field access needed.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={addResource} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Add Resource
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {resources.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2">
                    <p>No resources specified yet.</p>
                    {!isReadOnly && (
                      <Button size="sm" onClick={addResource} className="text-xs">
                        Add First Resource
                      </Button>
                    )}
                  </div>
                ) : (
                  resources.map((res, idx) => (
                    <div key={res.id || idx} className="p-3 bg-muted/20 rounded-xl border border-border space-y-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 w-full">
                          <select
                            id={`proposal-resource-category-${idx}`}
                            name={`proposalResourceCategory_${idx}`}
                            disabled={isReadOnly}
                            value={res.category}
                            onChange={(e) => updateResource(idx, "category", e.target.value)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-input bg-background text-foreground disabled:opacity-80"
                          >
                            <option value="Laboratory / Testing Facility">Laboratory / Testing Facility</option>
                            <option value="Computing / Cloud Infrastructure">Computing / Cloud Infrastructure</option>
                            <option value="Sensors / Embedded Hardware">Sensors / Embedded Hardware</option>
                            <option value="Municipal Field Access">Municipal Field Access</option>
                            <option value="Civic / Geographic Datasets">Civic / Geographic Datasets</option>
                            <option value="Specialist Domain Expertise">Specialist Domain Expertise</option>
                            <option value="Other Resource">Other Resource</option>
                          </select>
                          <label htmlFor={`proposal-resource-critical-${idx}`} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              id={`proposal-resource-critical-${idx}`}
                              name={`proposalResourceCritical_${idx}`}
                              type="checkbox"
                              disabled={isReadOnly}
                              checked={res.critical}
                              onChange={(e) => updateResource(idx, "critical", e.target.checked)}
                              className="rounded border-input text-primary focus:ring-primary"
                            />
                            <span>Critical Requirement</span>
                          </label>
                        </div>
                        {!isReadOnly && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeResource(idx)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <input
                        id={`proposal-resource-desc-${idx}`}
                        name={`proposalResourceDesc_${idx}`}
                        type="text"
                        disabled={isReadOnly}
                        value={res.description}
                        onChange={(e) => updateResource(idx, "description", e.target.value)}
                        placeholder="Description of resource, quantity, technical specifications..."
                        className="w-full text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-input bg-background text-foreground disabled:opacity-80 focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 7: EXPECTED PROTOTYPE */}
          {activeSection === "prototype" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  7. Expected Prototype Form &amp; Functionality
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Explain the physical or digital prototype that will be produced, its primary components, and its operational validation stage.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="proposal-prototype" className="text-xs font-semibold text-foreground">
                    Prototype Specification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="proposal-prototype"
                    name="proposalPrototype"
                    rows={6}
                    disabled={isReadOnly}
                    value={prototype}
                    onChange={(e) => setPrototype(e.target.value)}
                    placeholder="Describe whether it is a physical hardware prototype (e.g. PCB telemetry unit), software platform (e.g. decision dashboard), or hybrid model, and what functional validation will prove its viability..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-input bg-background text-foreground disabled:opacity-80 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Minimum 10 characters required.</span>
                    <span className={prototype.trim().length >= 10 ? "text-emerald-600 font-semibold" : ""}>
                      {prototype.trim().length} characters
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 8: TIMELINE & MILESTONES */}
          {activeSection === "milestones" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    8. Research Timeline &amp; Key Milestones
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Break down project stages into structured milestones with anticipated target horizons and outputs.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={addMilestone} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Add Milestone
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {milestones.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2">
                    <p>No milestones defined yet.</p>
                    {!isReadOnly && (
                      <Button size="sm" onClick={addMilestone} className="text-xs">
                        Add First Milestone
                      </Button>
                    )}
                  </div>
                ) : (
                  milestones.map((m, idx) => (
                    <div key={m.id || idx} className="p-3 bg-muted/20 rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          id={`proposal-milestone-name-${idx}`}
                          name={`proposalMilestoneName_${idx}`}
                          type="text"
                          disabled={isReadOnly}
                          value={m.name}
                          onChange={(e) => updateMilestone(idx, "name", e.target.value)}
                          placeholder="Milestone title (e.g. Baseline Study & Sensor Benchmarking)"
                          className="flex-1 font-bold text-xs sm:text-sm px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                        />
                        <input
                          id={`proposal-milestone-completion-${idx}`}
                          name={`proposalMilestoneCompletion_${idx}`}
                          type="text"
                          disabled={isReadOnly}
                          value={m.expected_completion}
                          onChange={(e) => updateMilestone(idx, "expected_completion", e.target.value)}
                          placeholder="Target Month (e.g. Month 2)"
                          className="w-32 text-xs px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80 text-right"
                        />
                        {!isReadOnly && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMilestone(idx)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <input
                        id={`proposal-milestone-desc-${idx}`}
                        name={`proposalMilestoneDesc_${idx}`}
                        type="text"
                        disabled={isReadOnly}
                        value={m.description}
                        onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                        placeholder="Milestone activities and technical scope..."
                        className="w-full text-xs px-2.5 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                      />
                      <input
                        id={`proposal-milestone-deliverables-${idx}`}
                        name={`proposalMilestoneDeliverables_${idx}`}
                        type="text"
                        disabled={isReadOnly}
                        value={m.deliverables}
                        onChange={(e) => updateMilestone(idx, "deliverables", e.target.value)}
                        placeholder="Expected outcome / artifact (e.g. Benchmarking report & schematic design)"
                        className="w-full text-[11px] px-2.5 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80 italic"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 9: DELIVERABLES */}
          {activeSection === "deliverables" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    9. Formal Project Deliverables
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Specify the formal artifacts, reports, software repos, or models that will be produced.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={addDeliverable} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Add Deliverable
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {deliverables.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2">
                    <p>No deliverables listed yet.</p>
                    {!isReadOnly && (
                      <Button size="sm" onClick={addDeliverable} className="text-xs">
                        Add First Deliverable
                      </Button>
                    )}
                  </div>
                ) : (
                  deliverables.map((d, idx) => (
                    <div key={d.id || idx} className="p-3 bg-muted/20 rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          id={`proposal-deliverable-title-${idx}`}
                          name={`proposalDeliverableTitle_${idx}`}
                          type="text"
                          disabled={isReadOnly}
                          value={d.title}
                          onChange={(e) => updateDeliverable(idx, "title", e.target.value)}
                          placeholder="Deliverable Title (e.g. Comprehensive Ward 12 Telemetry Dataset)"
                          className="flex-1 font-bold text-xs sm:text-sm px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                        />
                        <select
                          id={`proposal-deliverable-format-${idx}`}
                          name={`proposalDeliverableFormat_${idx}`}
                          disabled={isReadOnly}
                          value={d.format}
                          onChange={(e) => updateDeliverable(idx, "format", e.target.value)}
                          className="text-xs px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                        >
                          <option value="Research Report">Research Report</option>
                          <option value="Software Prototype">Software Prototype</option>
                          <option value="Hardware Architecture">Hardware Architecture</option>
                          <option value="Dataset">Dataset</option>
                          <option value="Trained Model">Trained Model</option>
                          <option value="Deployment Guide">Deployment Guide</option>
                          <option value="Technical Documentation">Technical Documentation</option>
                        </select>
                        {!isReadOnly && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeDeliverable(idx)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <input
                        id={`proposal-deliverable-desc-${idx}`}
                        name={`proposalDeliverableDesc_${idx}`}
                        type="text"
                        disabled={isReadOnly}
                        value={d.description}
                        onChange={(e) => updateDeliverable(idx, "description", e.target.value)}
                        placeholder="Artifact contents, format specifications, and verification standard..."
                        className="w-full text-xs px-2.5 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 10: RISKS & MITIGATION */}
          {activeSection === "risks" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                    10. Risks &amp; Mitigation Strategies
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Identify prospective research, technical, regulatory, or operational hurdles and mitigation tactics.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={addRisk} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Add Risk
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {risks.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2">
                    <p>No risks identified yet.</p>
                    {!isReadOnly && (
                      <Button size="sm" onClick={addRisk} className="text-xs">
                        Add First Risk
                      </Button>
                    )}
                  </div>
                ) : (
                  risks.map((r, idx) => (
                    <div key={r.id || idx} className="p-3 bg-muted/20 rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          id={`proposal-risk-desc-${idx}`}
                          name={`proposalRiskDesc_${idx}`}
                          type="text"
                          disabled={isReadOnly}
                          value={r.risk}
                          onChange={(e) => updateRisk(idx, "risk", e.target.value)}
                          placeholder="Risk Description (e.g. Field sensor fouling during monsoonal runoff)"
                          className="flex-1 font-bold text-xs sm:text-sm px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                        />
                        <select
                          id={`proposal-risk-impact-${idx}`}
                          name={`proposalRiskImpact_${idx}`}
                          disabled={isReadOnly}
                          value={r.impact}
                          onChange={(e) => updateRisk(idx, "impact", e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                          className="text-xs px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80 font-semibold"
                        >
                          <option value="LOW">Impact: LOW</option>
                          <option value="MEDIUM">Impact: MEDIUM</option>
                          <option value="HIGH">Impact: HIGH</option>
                        </select>
                        {!isReadOnly && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeRisk(idx)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <input
                        id={`proposal-risk-mitigation-${idx}`}
                        name={`proposalRiskMitigation_${idx}`}
                        type="text"
                        disabled={isReadOnly}
                        value={r.mitigation}
                        onChange={(e) => updateRisk(idx, "mitigation", e.target.value)}
                        placeholder="Mitigation strategy (e.g. Ultrasonic self-cleaning transducer & redundant secondary probe)"
                        className="w-full text-xs px-2.5 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 11: SUCCESS METRICS */}
          {activeSection === "metrics" && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    11. Measurable Success Metrics
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Define the quantitative performance indicators by which the Innovation Manager can assess outcomes.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={addMetric} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Add Metric
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2">
                    <p>No metrics defined yet.</p>
                    {!isReadOnly && (
                      <Button size="sm" onClick={addMetric} className="text-xs">
                        Add First Metric
                      </Button>
                    )}
                  </div>
                ) : (
                  metrics.map((m, idx) => (
                    <div key={m.id || idx} className="p-3 bg-muted/20 rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          id={`proposal-metric-name-${idx}`}
                          name={`proposalMetricName_${idx}`}
                          type="text"
                          disabled={isReadOnly}
                          value={m.metric}
                          onChange={(e) => updateMetric(idx, "metric", e.target.value)}
                          placeholder="Metric Name (e.g. Anomaly Detection Precision)"
                          className="flex-1 font-bold text-xs sm:text-sm px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                        />
                        <input
                          id={`proposal-metric-target-${idx}`}
                          name={`proposalMetricTarget_${idx}`}
                          type="text"
                          disabled={isReadOnly}
                          value={m.target}
                          onChange={(e) => updateMetric(idx, "target", e.target.value)}
                          placeholder="Target (e.g. ≥ 94%)"
                          className="w-32 text-xs font-semibold px-2 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80 text-right"
                        />
                        {!isReadOnly && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMetric(idx)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <input
                        id={`proposal-metric-method-${idx}`}
                        name={`proposalMetricMethod_${idx}`}
                        type="text"
                        disabled={isReadOnly}
                        value={m.measurement_method}
                        onChange={(e) => updateMetric(idx, "measurement_method", e.target.value)}
                        placeholder="Measurement & verification protocol..."
                        className="w-full text-xs px-2.5 py-1 rounded-md border border-input bg-background text-foreground disabled:opacity-80"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Bottom Pagination / Section Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {(() => {
              const currentIdx = SECTIONS.findIndex((s) => s.id === activeSection);
              const prev = currentIdx > 0 ? SECTIONS[currentIdx - 1] : null;
              const next = currentIdx < SECTIONS.length - 1 ? SECTIONS[currentIdx + 1] : null;

              return (
                <>
                  {prev ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSection(prev.id)}
                      className="gap-1 text-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Previous: {prev.title}
                    </Button>
                  ) : (
                    <div />
                  )}

                  {next ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveSection(next.id)}
                      className="gap-1 text-xs"
                    >
                      Next: {next.title}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    proposalStatus === "DRAFT" && isAuthorizedToEdit && (
                      <Button
                        size="sm"
                        onClick={() => setSubmitConfirmOpen(true)}
                        disabled={!completeness.isComplete || submitting}
                        className="gap-1 text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Submit for Review
                      </Button>
                    )
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submitConfirmOpen && (
        <Dialog open={submitConfirmOpen} onClose={() => setSubmitConfirmOpen(false)}>
          <div className="p-6 space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Submit Research Proposal</h3>
                <p className="text-xs text-muted-foreground">Version {currentProposal?.version_number}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Once submitted, your proposal will enter the <strong>Awaiting Review</strong> queue for the Innovation Manager.
              Content becomes <strong>read-only</strong> until the manager completes evaluation.
            </p>

            <div className="p-3 bg-muted/60 rounded-xl border border-border text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>Readiness Checklist:</span>
                <span className="text-emerald-600 dark:text-emerald-400">10 / 10 Met</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All 10 mandatory sections have been verified against institutional governance requirements.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSubmitConfirmOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmitProposal()} disabled={submitting} className="gap-1.5">
                <Send className="w-4 h-4" />
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Team Member Full Profile Dialog */}
      <TeamMemberProfileDialog
        member={viewingProfileMember}
        open={!!viewingProfileMember}
        onClose={() => setViewingProfileMember(null)}
      />
    </div>
  );
}
