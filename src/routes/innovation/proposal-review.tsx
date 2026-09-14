import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  FileText,
  Layers,
  Users,
  Target,
  ShieldAlert,
  Calendar,
  Package,
  Wrench,
  GraduationCap,
  ExternalLink,
  Check,
  XCircle,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getStatusBadge(status: string) {
  switch (status) {
    case "SUBMITTED":
      return <Badge className="bg-sky-100 text-sky-800 border-sky-300">Awaiting Initial Review</Badge>;
    case "RESUBMITTED":
      return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Resubmitted Revision</Badge>;
    case "UNDER_REVIEW":
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Under Review</Badge>;
    case "REQUESTED_REVISION":
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Revision Requested</Badge>;
    case "APPROVED":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Approved &amp; Locked</Badge>;
    case "REJECTED":
      return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Rejected</Badge>;
    case "DRAFT":
      return <Badge className="bg-slate-100 text-slate-700 border-slate-300">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { TeamMemberProfileDialog } from "@/components/projects/team-member-profile-dialog";
import { getRoleBadgeColor } from "@/components/projects/team-member-utils";
import {
  fetchProposalById,
  fetchProjectProposals,
  startProposalReview,
  requestProposalRevision,
  approveProposal,
  rejectProposal,
  type ResearchProposalWithDetails,
  type ProposalMilestone,
  type ProposalDeliverable,
  type ProposalRisk,
  type ProposalMetric,
  type ProposalResource,
} from "@/lib/proposals";
import {
  fetchProjectMembers,
  type ChallengeProjectMemberWithProfile,
} from "@/lib/projects";

export function InnovationProposalReviewPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<ResearchProposalWithDetails | null>(null);
  const [allVersions, setAllVersions] = useState<ResearchProposalWithDetails[]>([]);
  const [members, setMembers] = useState<ChallengeProjectMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Review Dialogs
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewingProfileMember, setViewingProfileMember] =
    useState<ChallengeProjectMemberWithProfile | null>(null);

  useEffect(() => {
    if (!proposalId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setActionError(null);

      try {
        const propData = await fetchProposalById(proposalId!);
        if (cancelled) return;
        setProposal(propData);

        // Fetch other versions and team members for this project
        const [versionsData, membersData] = await Promise.all([
          fetchProjectProposals(propData.project_id),
          fetchProjectMembers(propData.project_id),
        ]);

        if (cancelled) return;
        setAllVersions(versionsData);
        setMembers(membersData);
      } catch (err: unknown) {
        if (!cancelled) {
          setActionError(err instanceof Error ? err.message : "Failed to load research proposal for review.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  // Start Review (transitions SUBMITTED -> UNDER_REVIEW)
  async function handleStartReview() {
    if (!proposal) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await startProposalReview(proposal.id);
      setProposal({ ...proposal, status: updated.status });
      setActionSuccess("Proposal status updated to UNDER REVIEW.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to start review.");
    } finally {
      setActionLoading(false);
    }
  }

  // Request Revision
  async function handleRequestRevision() {
    if (!proposal) return;
    if (!revisionFeedback || revisionFeedback.trim().length < 10) {
      setActionError("Revision feedback must be at least 10 characters detailing what changes are required.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await requestProposalRevision(proposal.id, revisionFeedback);
      setProposal({
        ...proposal,
        status: updated.status,
        review_feedback: updated.review_feedback,
        revision_requested_at: updated.revision_requested_at,
      });
      setRevisionDialogOpen(false);
      setActionSuccess("Revision request sent to the institution research team.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to request revision.");
    } finally {
      setActionLoading(false);
    }
  }

  // Reject Proposal
  async function handleRejectProposal() {
    if (!proposal) return;
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setActionError("Rejection reason must be at least 10 characters detailing why the proposal was rejected.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await rejectProposal(proposal.id, rejectionReason.trim());
      setProposal({
        ...proposal,
        status: updated.status,
        review_feedback: updated.review_feedback,
        reviewed_at: updated.reviewed_at,
      });
      setRejectDialogOpen(false);
      setActionSuccess("Research proposal officially REJECTED.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to reject proposal.");
    } finally {
      setActionLoading(false);
    }
  }

  // Approve Proposal
  async function handleApproveProposal() {
    if (!proposal) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await approveProposal(proposal.id);
      setProposal({
        ...proposal,
        status: updated.status,
        approved_by: updated.approved_by,
        approved_at: updated.approved_at,
      });
      setApproveDialogOpen(false);
      setActionSuccess("Research proposal officially APPROVED! Workspace is now locked.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to approve proposal.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RotateCcw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">
          Loading proposal review workspace...
        </p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EmptyState
          title="Proposal Not Found"
          description="The requested research proposal does not exist or has been removed."
          action={
            <Button onClick={() => { void navigate("/app/innovation/proposals"); }}>
              Return to Proposals Hub
            </Button>
          }
        />
      </div>
    );
  }

  const isApproved = proposal.status === "APPROVED";
  const isRejected = proposal.status === "REJECTED";
  const isRevisionRequested = proposal.status === "REQUESTED_REVISION";
  const isUnderReview = proposal.status === "UNDER_REVIEW";
  const isSubmittedOrResubmitted = proposal.status === "SUBMITTED" || proposal.status === "RESUBMITTED";

  const questions = Array.isArray(proposal.research_questions) ? (proposal.research_questions as string[]) : [];
  const resources = Array.isArray(proposal.required_resources)
    ? (proposal.required_resources as unknown as ProposalResource[])
    : [];
  const milestones = Array.isArray(proposal.milestones)
    ? (proposal.milestones as unknown as ProposalMilestone[])
    : [];
  const deliverables = Array.isArray(proposal.deliverables)
    ? (proposal.deliverables as unknown as ProposalDeliverable[])
    : [];
  const risks = Array.isArray(proposal.risks_and_mitigation)
    ? (proposal.risks_and_mitigation as unknown as ProposalRisk[])
    : [];
  const metrics = Array.isArray(proposal.success_metrics)
    ? (proposal.success_metrics as unknown as ProposalMetric[])
    : [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Clickable Hierarchical Breadcrumbs & Back Nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <nav aria-label="Breadcrumb navigation" className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/app/innovation" className="hover:text-primary transition-colors font-medium">
            Innovation
          </Link>
          <span>/</span>
          <Link to="/app/innovation/problems" className="hover:text-primary transition-colors font-medium">
            Complex Problems
          </Link>
          <span>/</span>
          {proposal.challenge && (
            <>
              <Link
                to={`/app/innovation/problems/${proposal.challenge.source_issue_id || proposal.challenge_id}`}
                className="hover:text-primary transition-colors font-medium max-w-[200px] truncate"
                title={proposal.challenge.title}
              >
                {proposal.challenge.title}
              </Link>
              <span>/</span>
            </>
          )}
          {proposal.institution && (
            <>
              <Link
                to={`/app/innovation/institutions?selected=${proposal.institution_id}`}
                className="hover:text-primary transition-colors font-medium max-w-[150px] truncate"
                title={proposal.institution.name}
              >
                {proposal.institution.name}
              </Link>
              <span>/</span>
            </>
          )}
          {proposal.project && (
            <>
              <Link
                to={`/app/innovation/projects/${proposal.project_id}`}
                className="hover:text-primary transition-colors font-medium max-w-[180px] truncate"
                title={proposal.project.project_title}
              >
                {proposal.project.project_title}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-bold">Research Proposal v{proposal.version_number}</span>
        </nav>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const target = proposal.challenge?.source_issue_id || proposal.challenge_id;
            if (target) {
              void navigate(`/app/innovation/problems/${target}`);
            } else {
              void navigate("/app/innovation/problems");
            }
          }}
          className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Problem Control Center</span>
        </Button>
      </div>

      {/* CONTEXT HEADER BANNER */}
      <Card className="border-border/90 bg-card shadow-sm">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Research Proposal Evaluation
                </span>
                <Badge variant="outline" className="text-xs font-bold">
                  Version {proposal.version_number}
                </Badge>
                {getStatusBadge(proposal.status)}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {proposal.project?.project_title || "Research Proposal"}
              </h1>
            </div>

            {/* Version Switcher if multiple versions */}
            <div className="flex items-center gap-2 flex-wrap">
              {allVersions.length > 1 && (
                <div className="flex items-center gap-1 mr-2">
                  <span className="text-xs text-muted-foreground font-medium">Versions:</span>
                  {allVersions.map((v) => (
                    <Button
                      key={v.id}
                      size="sm"
                      variant={v.id === proposal.id ? "default" : "outline"}
                      onClick={() => { void navigate(`/app/innovation/proposals/${v.id}`); }}
                      className="h-7 text-xs font-semibold px-2"
                    >
                      v{v.version_number}
                      {v.is_current && <span className="ml-1 text-[9px] opacity-80">(Active)</span>}
                    </Button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {isSubmittedOrResubmitted && (
                <Button
                  onClick={() => void handleStartReview()}
                  disabled={actionLoading}
                  className="bg-primary text-primary-foreground text-xs font-bold gap-1.5 shadow-sm h-8"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Review</span>
                </Button>
              )}

              {isUnderReview && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setRevisionDialogOpen(true)}
                    disabled={actionLoading}
                    className="border-orange-300 text-orange-800 hover:bg-orange-50 text-xs font-bold gap-1.5 h-8"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
                    <span>Request Revision</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={actionLoading}
                    className="border-rose-300 text-rose-800 hover:bg-rose-50 text-xs font-bold gap-1.5 h-8"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reject Proposal</span>
                  </Button>
                  <Button
                    onClick={() => setApproveDialogOpen(true)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm h-8"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Proposal</span>
                  </Button>
                </>
              )}

              {isApproved && (
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Approved by Innovation Manager</span>
                </Badge>
              )}

              {isRejected && (
                <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-700" />
                  <span>Rejected by Innovation Manager</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/70 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Institution</span>
              <span className="font-semibold text-foreground truncate block">
                {proposal.institution?.name || "Institution"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Originating Challenge</span>
              <span className="font-semibold text-foreground truncate block">
                {proposal.challenge?.title || "Challenge"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Project Lead</span>
              <span className="font-semibold text-foreground truncate block">
                {proposal.submitter?.full_name || "Assigned Lead"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Submitted At</span>
              <span className="font-semibold text-foreground truncate block">
                {proposal.submitted_at ? new Date(proposal.submitted_at).toLocaleString() : "Not submitted"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Rejection Banner */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}
      {isRejected && proposal.review_feedback && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-2xs">
          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h4 className="font-bold text-sm text-rose-950 dark:text-rose-100">
              Proposal Rejected by Innovation Manager
            </h4>
            <p className="leading-relaxed whitespace-pre-wrap font-medium">{proposal.review_feedback}</p>
            {proposal.reviewed_at && (
              <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1">
                Rejected on: {new Date(proposal.reviewed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Review Layout: Left (Challenge & Proposal) vs Right (Sidebar & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Challenge Context + Full 11-Section Proposal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Challenge Dossier Card */}
          <Card className="border-border/80 shadow-sm bg-muted/20">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className="text-[10px] font-semibold mb-1">
                    Originating Innovation Challenge
                  </Badge>
                  <CardTitle className="text-base font-bold text-foreground">
                    {proposal.challenge?.title}
                  </CardTitle>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {proposal.challenge?.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs leading-relaxed">
              <div>
                <span className="font-bold text-foreground block mb-0.5">Problem Statement:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">{proposal.challenge?.problem_statement}</p>
              </div>

              {proposal.challenge?.objectives && (
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Challenge Objectives:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {Array.isArray(proposal.challenge.objectives)
                      ? proposal.challenge.objectives.join(" • ")
                      : String(proposal.challenge.objectives)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proposal Structured Sections */}
          <div className="space-y-4">
            {/* 1. Project Objective */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  1. Project Objective &amp; Problem Alignment
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {proposal.project_objective || <em className="text-muted-foreground">None provided.</em>}
              </CardContent>
            </Card>

            {/* 2. Research Questions */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  2. Research Questions ({questions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {questions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No questions specified.</p>
                ) : (
                  questions.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-muted/30 rounded-lg border border-border text-xs">
                      <span className="text-xs font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-md shrink-0">
                        Q{idx + 1}
                      </span>
                      <span className="font-medium text-foreground">{q}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 3. Methodology */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  3. Proposed Research Methodology
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {proposal.proposed_methodology || <em className="text-muted-foreground">None provided.</em>}
              </CardContent>
            </Card>

            {/* 4. Technical Approach */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  4. Technical Approach &amp; Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {proposal.technical_approach || <em className="text-muted-foreground">None provided.</em>}
              </CardContent>
            </Card>

            {/* 5. Required Resources */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  5. Required Resources &amp; Facilities ({resources.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No resources specified.</p>
                ) : (
                  resources.map((r, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-bold text-foreground block">{r.category}</span>
                        <p className="text-muted-foreground">{r.description}</p>
                      </div>
                      {r.critical && (
                        <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-300 shrink-0">
                          Critical
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 6. Expected Prototype */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  6. Expected Prototype Form &amp; Validation Stage
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {proposal.expected_prototype || <em className="text-muted-foreground">None provided.</em>}
              </CardContent>
            </Card>

            {/* 7. Milestones */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  7. Research Timeline &amp; Milestones ({milestones.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {milestones.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No milestones specified.</p>
                ) : (
                  milestones.map((m, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>{m.name}</span>
                        <span className="text-primary text-[11px] font-semibold">{m.expected_completion}</span>
                      </div>
                      {m.description && <p className="text-muted-foreground">{m.description}</p>}
                      {m.deliverables && (
                        <p className="text-[11px] text-foreground/80 italic pt-0.5">
                          Output: {m.deliverables}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 8. Deliverables */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  8. Formal Project Deliverables ({deliverables.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deliverables.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No deliverables specified.</p>
                ) : (
                  deliverables.map((d, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-bold text-foreground block">{d.title}</span>
                        {d.description && <p className="text-muted-foreground">{d.description}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                        {d.format}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 9. Risks & Mitigation */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  9. Risks &amp; Mitigation Strategies ({risks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {risks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No risks specified.</p>
                ) : (
                  risks.map((r, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>{r.risk}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            r.impact === "HIGH"
                              ? "bg-rose-100 text-rose-800"
                              : r.impact === "MEDIUM"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {r.impact}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground/90">Mitigation:</strong> {r.mitigation}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 10. Success Metrics */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  10. Measurable Success Metrics ({metrics.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No metrics specified.</p>
                ) : (
                  metrics.map((m, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>{m.metric}</span>
                        <span className="text-primary font-bold text-xs">{m.target}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Verification: {m.measurement_method}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Metadata, Team Review & Action Panel */}
        <div className="space-y-5 lg:sticky lg:top-20">
          {/* Review Decision Panel */}
          <Card className="border-border/80 shadow-md bg-card">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">Governance Decision</CardTitle>
                <Badge variant="outline" className="text-xs font-semibold">
                  v{proposal.version_number}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Status Indicator */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                <span className="text-muted-foreground text-[11px] block">Current Status</span>
                <div className="flex items-center gap-2">
                  {proposal.status === "SUBMITTED" && (
                    <Badge className="bg-sky-100 text-sky-800 border-sky-300">Awaiting Initial Review</Badge>
                  )}
                  {proposal.status === "RESUBMITTED" && (
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Resubmitted Revision</Badge>
                  )}
                  {proposal.status === "UNDER_REVIEW" && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300">Under Review</Badge>
                  )}
                  {proposal.status === "REQUESTED_REVISION" && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">Revision Requested</Badge>
                  )}
                  {proposal.status === "APPROVED" && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Approved &amp; Locked</Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons based on state */}
              <div className="space-y-2 pt-1">
                {isSubmittedOrResubmitted && (
                  <Button
                    onClick={() => { void handleStartReview(); }}
                    disabled={actionLoading}
                    className="w-full gap-1.5 text-xs font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {actionLoading ? "Updating..." : "Start Formal Review"}
                  </Button>
                )}

                {isUnderReview && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setRevisionDialogOpen(true)}
                      disabled={actionLoading}
                      className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Request Revision
                    </Button>
                    <Button
                      onClick={() => setApproveDialogOpen(true)}
                      disabled={actionLoading}
                      className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Proposal
                    </Button>
                  </div>
                )}

                {isApproved && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Officially Approved</span>
                      <p className="text-[11px] leading-relaxed">
                        This research plan has been locked and certified for the forthcoming prototype development phase.
                      </p>
                    </div>
                  </div>
                )}

                {isRevisionRequested && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl text-orange-800 dark:text-orange-300 text-xs space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Awaiting Institution Revision
                    </span>
                    <p className="text-[11px] leading-relaxed italic">
                      "{proposal.review_feedback}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Institution & Project Profile */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-border/70">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" />
                Submitting Institution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-bold text-foreground text-sm block">
                  {proposal.institution?.official_name || proposal.institution?.name}
                </span>
                <p className="text-muted-foreground">
                  {proposal.institution?.city}, {proposal.institution?.state} • {proposal.institution?.institution_type}
                </p>
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <span className="font-semibold text-foreground block">Project Workspace:</span>
                <p className="font-medium text-foreground">{proposal.project?.project_title}</p>
                <Link
                  to={`/app/university/projects/${proposal.project_id}`}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px] pt-0.5"
                >
                  <span>Open Full Project Workspace</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <span className="font-semibold text-foreground block">Submitted By:</span>
                <p className="text-muted-foreground">
                  {proposal.submitter?.full_name || "Project Lead"} ({proposal.submitter?.email || "Email unavailable"})
                </p>
                {proposal.submitted_at && (
                  <p className="text-[11px] text-muted-foreground">
                    Date: {new Date(proposal.submitted_at).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related Information Panel */}
          <Card className="border-border/80 shadow-sm bg-muted/20">
            <CardHeader className="pb-2 border-b border-border/70">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                Related Information &amp; Cross-Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Source Challenge</span>
                <Link
                  to={`/app/innovation/challenges/${proposal.challenge_id}`}
                  className="font-semibold text-primary hover:underline flex items-center gap-1 truncate"
                >
                  <span className="truncate">{proposal.challenge?.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </Link>
              </div>

              <div className="pt-2 border-t border-border/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Partner Institution</span>
                <Link
                  to={`/app/innovation/institutions?selected=${proposal.institution_id}`}
                  className="font-semibold text-primary hover:underline flex items-center gap-1 truncate"
                >
                  <span className="truncate">{proposal.institution?.name}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </Link>
              </div>

              <div className="pt-2 border-t border-border/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Project Workspace</span>
                <Link
                  to={`/app/innovation/projects/${proposal.project_id}`}
                  className="font-semibold text-primary hover:underline flex items-center gap-1 truncate"
                >
                  <span className="truncate">{proposal.project?.project_title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </Link>
              </div>

              <div className="pt-2 border-t border-border/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Filtered Proposals</span>
                <Link
                  to={`/app/innovation/proposals?challenge=${proposal.challenge_id}`}
                  className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>View all proposals for this challenge</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Research Team Capability Review */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-border/70">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                Active Research Team ({members.filter((m) => m.is_active).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5 text-xs">
              {members
                .filter((m) => m.is_active)
                .map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/80 space-y-2 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs",
                            getRoleBadgeColor(member.role)
                          )}
                        >
                          {(member.member_name || member.profile?.full_name || "M").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-xs truncate">
                              {member.member_name || member.profile?.full_name || "Member"}
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded text-[10px] font-semibold border",
                                getRoleBadgeColor(member.role)
                              )}
                            >
                              {member.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {member.designation || member.academic_program || member.member_type}
                            {member.department ? ` • ${member.department}` : ""}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingProfileMember(member)}
                        className="h-6 px-2 text-[10px] shrink-0 font-medium hover:border-primary/50"
                      >
                        Profile
                      </Button>
                    </div>

                    {member.primary_expertise && (
                      <div className="text-[11px] text-primary font-medium bg-primary/5 rounded px-2 py-0.5 border border-primary/10 truncate">
                        ⚡ {member.primary_expertise}
                      </div>
                    )}

                    {member.project_responsibility && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        <strong className="text-foreground font-medium">Responsibility:</strong>{" "}
                        {member.project_responsibility}
                      </p>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request Revision Dialog */}
      {revisionDialogOpen && (
        <Dialog open={revisionDialogOpen} onClose={() => setRevisionDialogOpen(false)}>
          <div className="p-6 space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Request Proposal Revision</h3>
                <p className="text-xs text-muted-foreground">Version {proposal.version_number}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Specify concrete, actionable feedback for the institution research team. The proposal status will transition to <strong>REQUESTED_REVISION</strong> and the Project Lead will be notified.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Review Feedback &amp; Required Modifications <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="e.g. Please clarify the field sensor calibration protocol in Section 3 and define quantitative accuracy thresholds in Section 10 before resubmitting."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Minimum 10 characters required.</span>
                <span className={revisionFeedback.trim().length >= 10 ? "text-emerald-600 font-semibold" : ""}>
                  {revisionFeedback.trim().length} characters
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setRevisionDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleRequestRevision()}
                disabled={actionLoading || revisionFeedback.trim().length < 10}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                {actionLoading ? "Sending..." : "Submit Revision Request"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Approve Confirmation Dialog */}
      {approveDialogOpen && (
        <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
          <div className="p-6 space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Approve Research Proposal</h3>
                <p className="text-xs text-muted-foreground">Version {proposal.version_number}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to officially approve this research proposal?
            </p>

            <div className="p-3 bg-muted/60 rounded-xl border border-border text-xs space-y-1">
              <span className="font-semibold text-foreground block">Governance Rules:</span>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5 text-[11px]">
                <li>This approval is permanent and locks this version against editing.</li>
                <li>The institution will be notified and this challenge project becomes certified.</li>
                <li>AI assistance does not participate in this decision.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleApproveProposal()}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Check className="w-4 h-4" />
                {actionLoading ? "Approving..." : "Confirm & Approve"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Reject Confirmation Dialog */}
      {rejectDialogOpen && (
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
          <div className="p-6 space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Reject Research Proposal</h3>
                <p className="text-xs text-muted-foreground">Version {proposal.version_number}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Rejecting this proposal marks it permanently as rejected. Please explain the technical or municipal grounds for rejection.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Rejection Grounds &amp; Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. The proposed methodology lacks required field sensor telemetry calibration and does not comply with municipal regulatory constraints."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Minimum 10 characters required.</span>
                <span className={rejectionReason.trim().length >= 10 ? "text-emerald-600 font-semibold" : ""}>
                  {rejectionReason.trim().length} characters
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleRejectProposal()}
                disabled={actionLoading || rejectionReason.trim().length < 10}
                className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Team Member Full Profile Dialog for Innovation Review */}
      <TeamMemberProfileDialog
        member={viewingProfileMember}
        open={!!viewingProfileMember}
        onClose={() => setViewingProfileMember(null)}
      />
    </div>
  );
}
