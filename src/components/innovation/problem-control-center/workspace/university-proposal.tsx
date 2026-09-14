import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  MessageSquare,
  Send,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getProposalStatusBadgeClass,
  getProposalStatusLabel,
  type InstitutionLifecycleTrack,
} from "@/lib/innovation";
import { approveProposal, requestProposalRevision } from "@/lib/proposals";

interface UniversityProposalProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityProposal({ institution }: UniversityProposalProps) {
  const proposals = institution.proposals || [];
  const currentProposal = proposals.find((p) => p.isCurrent) || proposals[0] || null;

  const targetProposalId = currentProposal?.id || institution.proposalId;
  const initialStatus = currentProposal?.status || institution.proposalStatus || "DRAFT";

  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);
  const localStatus = overrideStatus ?? initialStatus;
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!currentProposal && !institution.proposalId) {
    return (
      <EmptyState
        title="No Research Proposal Submitted Yet"
        description={`${institution.institutionName}'s research team has not submitted a formal technical proposal for this civic problem yet.`}
      />
    );
  }

  const isApproved = localStatus === "APPROVED";
  const needsReview = localStatus === "SUBMITTED" || localStatus === "RESUBMITTED" || localStatus === "UNDER_REVIEW";
  const isRevisionRequested = localStatus === "REQUESTED_REVISION";

  const handleApprove = async () => {
    if (!targetProposalId) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      await approveProposal(targetProposalId);
      setOverrideStatus("APPROVED");
      setActionSuccess(`Research Proposal for ${institution.institutionName} successfully approved.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to approve proposal.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProposalId || !revisionFeedback.trim()) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      await requestProposalRevision(targetProposalId, revisionFeedback.trim());
      setOverrideStatus("REQUESTED_REVISION");
      setShowRevisionForm(false);
      setActionSuccess(`Revision requested from ${institution.institutionName} with formal feedback.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to request revision.");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* 1. TOP STATUS & REVIEW ACTIONS CARD */}
      <Card
        className={`rounded-2xl border transition-all ${
          isApproved
            ? "border-emerald-300 bg-emerald-50/20"
            : needsReview
            ? "border-sky-300 bg-sky-50/20"
            : "border-border bg-card"
        }`}
      >
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getProposalStatusBadgeClass(localStatus)}>
                  {getProposalStatusLabel(localStatus)}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono font-bold">
                  Version {currentProposal?.versionNumber || institution.proposalVersion || 1}
                </Badge>
                {isApproved && (
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                    Authorized Solution
                  </Badge>
                )}
              </div>

              <h4 className="text-base sm:text-lg font-bold text-foreground">
                Technical Co-Development Proposal
              </h4>
            </div>

            {/* Inline Governance Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {needsReview && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRevisionForm((v) => !v)}
                    disabled={submittingAction}
                    className="h-8 px-3 text-xs font-bold text-amber-900 border-amber-300 hover:bg-amber-100/60"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    <span>Request Revision</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => { void handleApprove(); }}
                    disabled={submittingAction}
                    className="h-8 px-4 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>{submittingAction ? "Approving..." : "Approve Proposal"}</span>
                  </Button>
                </>
              )}

              {isApproved && (
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100/60 px-3 py-1.5 rounded-xl border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Proposal Approved</span>
                </div>
              )}
            </div>
          </div>

          {/* Feedback alerts */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-semibold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 font-semibold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Inline Revision Form */}
          {showRevisionForm && (
            <form onSubmit={(e) => { void handleRequestRevision(e); }} className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50 space-y-3">
              <div className="space-y-1">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  <span>Request Revisions from {institution.institutionName}</span>
                </span>
                <p className="text-[11px] text-amber-900">
                  Specify clearly what technical sections, sensor methodologies, budget estimates, or deliverable timelines require revision.
                </p>
              </div>

              <textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="Enter detailed feedback for the university research team (e.g. please clarify the sample size and hardware testbed requirements)..."
                rows={3}
                className="w-full text-xs p-3 bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder:text-muted-foreground resize-none"
              />

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRevisionForm(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingAction || revisionFeedback.trim().length < 10}
                  className="h-8 px-4 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingAction ? "Submitting..." : "Send Revision Request"}</span>
                </Button>
              </div>
            </form>
          )}

          {/* Submission & Review Timestamps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60 text-muted-foreground">
            <div>
              <span className="text-[10px] uppercase font-bold block text-muted-foreground">
                Submitted Date
              </span>
              <span className="font-semibold text-foreground block">
                {currentProposal?.submittedAt || institution.proposalSubmittedAt
                  ? new Date(
                      currentProposal?.submittedAt || institution.proposalSubmittedAt!
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
                  : needsReview
                  ? "Awaiting Manager Review"
                  : isRevisionRequested
                  ? "Revision Requested"
                  : "Under Governance"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold block text-muted-foreground">
                Evaluated Date
              </span>
              <span className="font-semibold text-foreground block">
                {currentProposal?.reviewedAt || institution.proposalReviewedAt
                  ? new Date(
                      currentProposal?.reviewedAt || institution.proposalReviewedAt!
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

      {/* 2. REVISION FEEDBACK IF REQUESTED */}
      {isRevisionRequested && (
        <Card className="border-orange-300 bg-orange-50/40 shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-orange-950 font-bold">
              <MessageSquare className="w-4 h-4 text-orange-600" />
              <span>Revision Feedback Provided to University Team</span>
            </div>
            <p className="text-orange-900 bg-white/80 p-3 rounded-xl border border-orange-200 leading-relaxed">
              {currentProposal?.reviewFeedback ||
                institution.proposalReviewFeedback ||
                "Please clarify the sensor placement methodology and deployment budget."}
            </p>
            <span className="text-[11px] text-orange-800 italic block">
              Waiting for {institution.institutionName}'s research team to revise and resubmit.
            </span>
          </CardContent>
        </Card>
      )}

      {/* 3. STRUCTURED PROPOSAL SECTIONS */}
      <div className="space-y-4">
        {/* Core Objective */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span>1. Core Project Objective</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/70">
              {currentProposal?.projectObjective ||
                "Co-develop scientific IoT hardware telemetry and machine-learning remediation pilots."}
            </p>
          </CardContent>
        </Card>

        {/* Research Questions */}
        {currentProposal?.researchQuestions && currentProposal.researchQuestions.length > 0 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>2. Research Questions ({currentProposal.researchQuestions.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <ul className="list-disc list-inside space-y-1 text-foreground bg-muted/20 p-3 rounded-xl border border-border/70">
                {currentProposal.researchQuestions.map((q, idx) => (
                  <li key={idx} className="leading-relaxed">{q}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Proposed Methodology & Technical Approach */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>3. Proposed Methodology</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/70 min-h-[90px]">
                {currentProposal?.proposedMethodology || "Applied field methodology specified in formal proposal submission."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-teal-600" />
                <span>4. Technical Approach</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/70 min-h-[90px]">
                {currentProposal?.technicalApproach || "Hardware, software, and data processing specifications."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expected Prototype & Team Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>5. Expected Prototype / Solution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/70 min-h-[80px]">
                {currentProposal?.expectedPrototype || "Functional prototype delivered for municipal validation."}
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
              <p className="text-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/70 min-h-[80px]">
                {currentProposal?.teamCapabilitySummary || `${institution.institutionName} laboratory facilities and multidisciplinary research expertise.`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Deliverables */}
        {(currentProposal?.deliverables && currentProposal.deliverables.length > 0) && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>7. Deliverables &amp; Artifacts ({currentProposal.deliverables.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentProposal.deliverables.map((d, idx) => (
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

        {/* Risks & Mitigation */}
        {(currentProposal?.risksAndMitigation && currentProposal.risksAndMitigation.length > 0) && (
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>8. Risks &amp; Mitigation Strategy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="space-y-2">
                {currentProposal.risksAndMitigation.map((r, idx) => (
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
      </div>

      {/* 4. PROPOSAL VERSION HISTORY IF MULTIPLE */}
      {proposals.length > 1 && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground">
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-border/60">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono font-bold">
                    v{prop.versionNumber}
                  </Badge>
                  <Badge className={getProposalStatusBadgeClass(prop.status)}>
                    {prop.status}
                  </Badge>
                  {prop.isCurrent && (
                    <Badge variant="info" className="text-[9px]">
                      Current
                    </Badge>
                  )}
                </div>

                <span className="text-muted-foreground">
                  {prop.submittedAt ? new Date(prop.submittedAt).toLocaleDateString() : "Draft"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
