import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  FileCheck,
  FileText,
  HelpCircle,
  History,
  Lock,
  MessageSquare,
  Package,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getProposalStatusBadgeClass,
  getProposalStatusLabel,
  type InstitutionLifecycleTrack,
} from "@/lib/innovation";
import {
  approveProposal,
  rejectProposal,
  requestProposalRevision,
  startProposalReview,
} from "@/lib/proposals";

interface UniversityProposalProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityProposal({ institution }: UniversityProposalProps) {
  const { roleCode } = useAppSession();
  const isAdmin = roleCode === "ADMIN";
  const proposals = institution.proposals || [];
  const currentProposal = proposals.find((p) => p.isCurrent) || proposals[0] || null;

  // Track currently selected version to inspect (defaults to current proposal version)
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(
    currentProposal?.versionNumber ?? institution.proposalVersion ?? null
  );

  const activeProposal =
    proposals.find((p) => p.versionNumber === selectedVersionNumber) ||
    currentProposal;

  const targetProposalId = activeProposal?.id || institution.proposalId;

  // Local overrides for reactive updates
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);
  const [overrideFeedback, setOverrideFeedback] = useState<string | null>(null);

  const localStatus =
    (activeProposal?.id === targetProposalId && overrideStatus)
      ? overrideStatus
      : (activeProposal?.status || institution.proposalStatus || "DRAFT");

  const localFeedback =
    (activeProposal?.id === targetProposalId && overrideFeedback)
      ? overrideFeedback
      : (activeProposal?.reviewFeedback || institution.proposalReviewFeedback || null);

  // Dialog & Form states
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!activeProposal && !institution.proposalId) {
    return (
      <EmptyState
        title="No Research Proposal Submitted Yet"
        description={`${institution.institutionName}'s research team has not submitted a formal technical proposal for this civic problem yet.`}
      />
    );
  }

  const isApproved = localStatus === "APPROVED";
  const isRejected = localStatus === "REJECTED";
  const isRevisionRequested = localStatus === "REQUESTED_REVISION";
  const isUnderReview = localStatus === "UNDER_REVIEW";
  const isSubmittedOrResubmitted = localStatus === "SUBMITTED" || localStatus === "RESUBMITTED";
  const isReviewable = isSubmittedOrResubmitted || isUnderReview;
  const isViewingCurrent = activeProposal?.isCurrent ?? true;

  // Action: Start Review (transitions SUBMITTED / RESUBMITTED -> UNDER_REVIEW)
  const handleStartReview = async () => {
    if (!targetProposalId) return;
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await startProposalReview(targetProposalId);
      setOverrideStatus("UNDER_REVIEW");
      setActionSuccess("Proposal marked as UNDER REVIEW. You can now evaluate and decide.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to start review.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action: Accept / Approve Proposal
  const handleApprove = async () => {
    if (!targetProposalId) return;
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await approveProposal(targetProposalId);
      setOverrideStatus("APPROVED");
      setApproveDialogOpen(false);
      setActionSuccess(`Research Proposal for ${institution.institutionName} authoritatively APPROVED. Version is locked.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to approve proposal.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action: Request Changes / Revision
  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProposalId || revisionFeedback.trim().length < 10) return;
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await requestProposalRevision(targetProposalId, revisionFeedback.trim());
      setOverrideStatus("REQUESTED_REVISION");
      setOverrideFeedback(revisionFeedback.trim());
      setRevisionDialogOpen(false);
      setActionSuccess(`Revision requested from ${institution.institutionName}. Proposal status is now REQUESTED_REVISION.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to request revision.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Action: Reject Proposal
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProposalId || rejectionReason.trim().length < 10) return;
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await rejectProposal(targetProposalId, rejectionReason.trim());
      setOverrideStatus("REJECTED");
      setOverrideFeedback(rejectionReason.trim());
      setRejectDialogOpen(false);
      setActionSuccess(`Research Proposal for ${institution.institutionName} marked as REJECTED.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to reject proposal.");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Historical Version Notice if inspecting past snapshot */}
      {!isViewingCurrent && (
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-xs">Viewing Historical Snapshot (v{activeProposal?.versionNumber})</span>
              <p className="text-[11px] text-amber-900/90 dark:text-amber-300">
                This is an immutable historical snapshot. The latest active proposal is v{currentProposal?.versionNumber}.
              </p>
            </div>
          </div>
          {currentProposal && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedVersionNumber(currentProposal.versionNumber)}
              className="h-7 text-xs font-semibold shrink-0 border-amber-400 text-amber-900 hover:bg-amber-100"
            >
              Switch to Active (v{currentProposal.versionNumber})
            </Button>
          )}
        </div>
      )}

      {/* 1. TOP STATUS & REVIEW ACTIONS CARD */}
      <Card
        className={`rounded-2xl border transition-all ${
          isApproved
            ? "border-emerald-300 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-800"
            : isRejected
            ? "border-rose-300 bg-rose-50/20 dark:bg-rose-950/10 dark:border-rose-800"
            : isRevisionRequested
            ? "border-orange-300 bg-orange-50/20 dark:bg-orange-950/10 dark:border-orange-800"
            : isReviewable
            ? "border-sky-300 bg-sky-50/20 dark:bg-sky-950/10 dark:border-sky-800"
            : "border-border bg-card"
        }`}
      >
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getProposalStatusBadgeClass(localStatus)}>
                  {getProposalStatusLabel(localStatus)}
                </Badge>
                <Badge variant="outline" className="text-[11px] font-mono font-bold">
                  Version {activeProposal?.versionNumber || institution.proposalVersion || 1}
                </Badge>
                {activeProposal?.isCurrent && (
                  <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                    Current Version
                  </Badge>
                )}
                {isApproved && (
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Authorized Solution
                  </Badge>
                )}
                {isRejected && (
                  <Badge className="bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Closed
                  </Badge>
                )}
              </div>

              <h4 className="text-base sm:text-lg font-bold text-foreground">
                Technical Co-Development Research Proposal
              </h4>
            </div>

            {/* Inline Governance Action Buttons (Active version only) */}
            {isAdmin ? (
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Badge variant="outline" className="text-xs font-medium border-primary/30 bg-primary/5 text-primary py-1 px-2.5 rounded-xl gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Proposal Oversight (Read-Only)</span>
                </Badge>
              </div>
            ) : isViewingCurrent && (
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {isSubmittedOrResubmitted && (
                  <Button
                    size="sm"
                    onClick={() => { void handleStartReview(); }}
                    disabled={submittingAction}
                    className="h-8 px-3 text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-xs gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{submittingAction ? "Updating..." : "Review Proposal"}</span>
                  </Button>
                )}

                {isReviewable && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRevisionDialogOpen(true)}
                      disabled={submittingAction}
                      className="h-8 px-3 text-xs font-bold text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Request Changes</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={submittingAction}
                      className="h-8 px-3 text-xs font-bold text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reject Proposal</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setApproveDialogOpen(true)}
                      disabled={submittingAction}
                      className="h-8 px-4 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept Proposal</span>
                    </Button>
                  </>
                )}

                {isApproved && (
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100/60 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800">
                    <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Proposal Approved &amp; Locked</span>
                  </div>
                )}

                {isRejected && (
                  <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold bg-rose-100/60 dark:bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800">
                    <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                    <span>Proposal Rejected</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feedback & Error Alerts */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-semibold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 font-semibold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Submission & Review Timestamps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60 text-muted-foreground">
            <div>
              <span className="text-[10px] uppercase font-bold block text-muted-foreground">
                Submitted Date
              </span>
              <span className="font-semibold text-foreground block">
                {activeProposal?.submittedAt || institution.proposalSubmittedAt
                  ? new Date(
                      activeProposal?.submittedAt || institution.proposalSubmittedAt!
                    ).toLocaleDateString()
                  : "Draft"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block text-muted-foreground">
                Review Status
              </span>
              <span className="font-semibold text-foreground block">
                {isApproved
                  ? "Approved ✓"
                  : isRejected
                  ? "Rejected ✗"
                  : isRevisionRequested
                  ? "Revision Requested"
                  : isUnderReview
                  ? "Under Active Review"
                  : isSubmittedOrResubmitted
                  ? "Awaiting Initial Review"
                  : "Draft"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block text-muted-foreground">
                Evaluated Date
              </span>
              <span className="font-semibold text-foreground block">
                {activeProposal?.reviewedAt || institution.proposalReviewedAt
                  ? new Date(
                      activeProposal?.reviewedAt || institution.proposalReviewedAt!
                    ).toLocaleDateString()
                  : "Pending"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block text-muted-foreground">
                Lead Researcher
              </span>
              <span className="font-semibold text-foreground truncate block">
                {institution.projectLeadName || "Assigned Coordinator"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. REJECTION OR REVISION FEEDBACK BANNER */}
      {isRejected && localFeedback && (
        <Card className="border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800 shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-rose-950 dark:text-rose-200 font-bold">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Manager Rejection Reason</span>
            </div>
            <p className="text-rose-900 dark:text-rose-300 bg-white/80 dark:bg-card p-3 rounded-xl border border-rose-200 dark:border-rose-800 leading-relaxed font-medium">
              {localFeedback}
            </p>
          </CardContent>
        </Card>
      )}

      {isRevisionRequested && localFeedback && (
        <Card className="border-orange-300 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-800 shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-orange-950 dark:text-orange-200 font-bold">
              <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Revision Feedback Provided to University Team</span>
            </div>
            <p className="text-orange-900 dark:text-orange-300 bg-white/80 dark:bg-card p-3 rounded-xl border border-orange-200 dark:border-orange-800 leading-relaxed font-medium">
              {localFeedback}
            </p>
            <span className="text-[11px] text-orange-800 dark:text-orange-400 italic block">
              Waiting for {institution.institutionName}&apos;s research team to revise and resubmit (creates v{((activeProposal?.versionNumber || 1) + 1)}).
            </span>
          </CardContent>
        </Card>
      )}

      {/* 3. STRUCTURED PROPOSAL SECTIONS (ALL 11 SECTIONS) */}
      <div className="space-y-4">
        {/* Section 1: Core Project Objective */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span>1. Core Project Objective</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70 text-xs">
              {activeProposal?.projectObjective || "No project objective specified."}
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Research Questions */}
        {activeProposal?.researchQuestions && activeProposal.researchQuestions.length > 0 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>2. Research Questions ({activeProposal.researchQuestions.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <ul className="list-disc list-inside space-y-1.5 text-foreground bg-muted/20 p-3.5 rounded-xl border border-border/70 text-xs">
                {activeProposal.researchQuestions.map((q, idx) => (
                  <li key={idx} className="leading-relaxed">{q}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Sections 3 & 4: Methodology & Technical Approach */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>3. Proposed Methodology</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70 min-h-[90px] text-xs">
                {activeProposal?.proposedMethodology || "Applied methodology detailed in research submission."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-teal-600" />
                <span>4. Technical Approach &amp; Architecture</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70 min-h-[90px] text-xs">
                {activeProposal?.technicalApproach || "Hardware, software, sensor telemetry, and algorithmic specifications."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sections 5 & 6: Prototype & Team Capability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>5. Expected Prototype / Solution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70 min-h-[80px] text-xs">
                {activeProposal?.expectedPrototype || "Functional prototype delivered for civic municipal validation."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>6. Team Capability Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70 min-h-[80px] text-xs">
                {activeProposal?.teamCapabilitySummary || `${institution.institutionName} laboratory infrastructure, faculty expertise, and student investigators.`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section 7: Required Resources */}
        {activeProposal?.requiredResources && activeProposal.requiredResources.length > 0 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>7. Required Resources &amp; Equipment ({activeProposal.requiredResources.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeProposal.requiredResources.map((res, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                    <span className="font-bold text-foreground text-xs block">
                      {res.resource_type || "Resource Item"}
                    </span>
                    {res.description && <p className="text-muted-foreground text-[11px]">{res.description}</p>}
                    {res.quantity && (
                      <span className="text-[10px] text-primary font-mono block">Quantity: {res.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 8: Timeline & Milestones */}
        {activeProposal?.milestones && activeProposal.milestones.length > 0 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>8. Research Milestones &amp; Schedule ({activeProposal.milestones.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="space-y-2">
                {activeProposal.milestones.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-card flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground text-xs">{m.name || m.title || `Milestone ${idx + 1}`}</span>
                        {m.timeline && <span className="text-[10px] text-muted-foreground font-medium">{m.timeline}</span>}
                      </div>
                      {m.description && <p className="text-muted-foreground text-[11px]">{m.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 9: Deliverables & Artifacts */}
        {activeProposal?.deliverables && activeProposal.deliverables.length > 0 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>9. Deliverables &amp; Artifacts ({activeProposal.deliverables.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeProposal.deliverables.map((d, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="font-bold text-foreground block text-xs">{d.name || d.title || `Deliverable ${idx + 1}`}</span>
                    {d.description && <p className="text-muted-foreground text-[11px] mt-0.5">{d.description}</p>}
                    {d.format && <span className="text-[10px] text-primary font-mono block mt-1">Format: {d.format}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 10: Risks & Mitigation Strategy */}
        {activeProposal?.risksAndMitigation && activeProposal.risksAndMitigation.length > 0 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>10. Risks &amp; Mitigation Strategy ({activeProposal.risksAndMitigation.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="space-y-2">
                {activeProposal.risksAndMitigation.map((r, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-card flex items-start gap-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <span className="font-bold text-foreground text-xs">{r.risk}</span>
                      <p className="text-muted-foreground text-[11px]">Mitigation: {r.mitigation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 11: Success Metrics */}
        {activeProposal?.successMetrics && activeProposal.successMetrics.length > 0 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-teal-600" />
                <span>11. Quantitative Success Metrics ({activeProposal.successMetrics.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeProposal.successMetrics.map((sm, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                    <span className="font-bold text-foreground text-xs block">{sm.metric}</span>
                    {sm.target && <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold block">Target: {sm.target}</span>}
                    {sm.measurement_method && <p className="text-muted-foreground text-[10px]">Method: {sm.measurement_method}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4. PROPOSAL VERSION HISTORY */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span>Version History ({proposals.length || 1})</span>
            </CardTitle>
            <span className="text-muted-foreground text-[11px]">
              Strict immutable snapshot auditing
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 divide-y divide-border/60">
          {proposals.length === 0 ? (
            <div className="py-2 text-muted-foreground text-xs italic">
              Initial version in progress.
            </div>
          ) : (
            proposals
              .slice()
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((prop) => {
                const isSelected = (activeProposal?.id === prop.id);
                return (
                  <div
                    key={prop.id}
                    className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors rounded-xl px-2 ${
                      isSelected ? "bg-primary/5 font-medium" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                          v{prop.versionNumber}
                        </Badge>
                        <Badge className={getProposalStatusBadgeClass(prop.status)}>
                          {getProposalStatusLabel(prop.status)}
                        </Badge>
                        {prop.isCurrent && (
                          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                            Active Version
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge className="bg-primary text-primary-foreground text-[9px]">
                            Viewing
                          </Badge>
                        )}
                      </div>

                      {prop.reviewFeedback && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 italic max-w-xl">
                          Feedback: &ldquo;{prop.reviewFeedback}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground text-[11px]">
                        {prop.submittedAt
                          ? new Date(prop.submittedAt).toLocaleDateString()
                          : "Draft"}
                      </span>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setSelectedVersionNumber(prop.versionNumber)}
                        className="h-7 text-xs px-2.5 gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isSelected ? "Viewing" : "View Version"}</span>
                      </Button>
                    </div>
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>

      {/* DIALOG: Request Revision */}
      {revisionDialogOpen && (
        <Dialog open={revisionDialogOpen} onClose={() => setRevisionDialogOpen(false)}>
          <form onSubmit={(e) => { void handleRequestRevision(e); }} className="p-6 space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Request Proposal Changes</h3>
                <p className="text-xs text-muted-foreground">Version {activeProposal?.versionNumber}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Specify concrete, actionable feedback for the {institution.institutionName} research team. The proposal status will transition to <strong>REQUESTED_REVISION</strong> and the Project Lead will be notified to submit revision v{((activeProposal?.versionNumber || 1) + 1)}.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Required Modifications &amp; Governance Feedback <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="e.g. Please clarify the hardware sensor telemetry calibration methodology and update the timeline to include field testing in Month 3."
                className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Minimum 10 characters required.</span>
                <span className={revisionFeedback.trim().length >= 10 ? "text-emerald-600 font-semibold" : ""}>
                  {revisionFeedback.trim().length} characters
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRevisionDialogOpen(false)} disabled={submittingAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction || revisionFeedback.trim().length < 10}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
              >
                <Send className="w-4 h-4" />
                {submittingAction ? "Submitting..." : "Send Revision Request"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* DIALOG: Reject Proposal */}
      {rejectDialogOpen && (
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
          <form onSubmit={(e) => { void handleReject(e); }} className="p-6 space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Reject Research Proposal</h3>
                <p className="text-xs text-muted-foreground">Version {activeProposal?.versionNumber}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Rejecting this proposal permanently marks it as rejected. Please explain the municipal or technical grounds for rejection clearly.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Rejection Grounds &amp; Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. The proposed methodology does not align with the municipal watershed regulations and lacks required field telemetry feasibility."
                className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Minimum 10 characters required.</span>
                <span className={rejectionReason.trim().length >= 10 ? "text-emerald-600 font-semibold" : ""}>
                  {rejectionReason.trim().length} characters
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRejectDialogOpen(false)} disabled={submittingAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction || rejectionReason.trim().length < 10}
                className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                {submittingAction ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* DIALOG: Approve Proposal */}
      {approveDialogOpen && (
        <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
          <div className="p-6 space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Approve Research Proposal</h3>
                <p className="text-xs text-muted-foreground">Version {activeProposal?.versionNumber}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to officially authorize and approve this technical research proposal from {institution.institutionName}?
            </p>

            <div className="p-3 bg-muted/60 rounded-xl border border-border text-xs space-y-1">
              <span className="font-semibold text-foreground block">Municipal Governance Impact:</span>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5 text-[11px]">
                <li>This version becomes the official authorized project baseline.</li>
                <li>Content is permanently locked against changes.</li>
                <li>University Project Lead will be notified immediately.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} disabled={submittingAction}>
                Cancel
              </Button>
              <Button
                onClick={() => { void handleApprove(); }}
                disabled={submittingAction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Check className="w-4 h-4" />
                {submittingAction ? "Approving..." : "Confirm Approval"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

