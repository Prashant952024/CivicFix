import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getProposalStatusBadgeClass,
  getProposalStatusLabel,
  type InstitutionLifecycleTrack,
} from "@/lib/innovation";

interface UniversityProposalProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityProposal({ institution }: UniversityProposalProps) {
  const navigate = useNavigate();
  const proposals = institution.proposals || [];
  const currentProposal = proposals.find((p) => p.isCurrent) || proposals[0] || null;

  if (!currentProposal && !institution.proposalId) {
    return (
      <EmptyState
        title="No Research Proposal Submitted Yet"
        description={`${institution.institutionName}'s research team has not submitted a formal technical proposal for this civic problem yet.`}
      />
    );
  }

  const isApproved = currentProposal?.status === "APPROVED" || institution.proposalStatus === "APPROVED";
  const needsReview =
    currentProposal?.status === "SUBMITTED" ||
    currentProposal?.status === "RESUBMITTED" ||
    institution.proposalStatus === "SUBMITTED" ||
    institution.proposalStatus === "RESUBMITTED";
  const isRevisionRequested =
    currentProposal?.status === "REQUESTED_REVISION" ||
    institution.proposalStatus === "REQUESTED_REVISION";

  const targetProposalId = currentProposal?.id || institution.proposalId;

  return (
    <div className="space-y-6 text-xs">
      {/* 1. TOP STATUS & REVIEW CTA CARD */}
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
                <Badge
                  className={getProposalStatusBadgeClass(
                    currentProposal?.status || institution.proposalStatus || ""
                  )}
                >
                  {getProposalStatusLabel(
                    currentProposal?.status || institution.proposalStatus || ""
                  )}
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

            {targetProposalId && (
              <Button
                size="sm"
                onClick={() => {
                  void navigate(`/app/innovation/proposals/${targetProposalId}`);
                }}
                className={`h-9 px-4 text-xs font-bold gap-1.5 shadow-sm shrink-0 ${
                  needsReview
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : isApproved
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {isApproved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>View Approved Solution</span>
                  </>
                ) : needsReview ? (
                  <>
                    <span>Review Proposal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Inspect Proposal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>

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

      {/* 3. TECHNICAL OBJECTIVES & APPROACH */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Technical Scope &amp; Methodology</span>
          </h4>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Core Technical Objective
            </span>
            <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70">
              {currentProposal?.projectObjective ||
                "Co-develop scientific IoT hardware telemetry and machine-learning remediation pilots."}
            </p>
          </div>

          {currentProposal?.proposedMethodology && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Proposed Methodology
              </span>
              <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70">
                {currentProposal.proposedMethodology}
              </p>
            </div>
          )}

          {currentProposal?.expectedPrototype && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Target Deliverable / Prototype
              </span>
              <p className="text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70">
                {currentProposal.expectedPrototype}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
