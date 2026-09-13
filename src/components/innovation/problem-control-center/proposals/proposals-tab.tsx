import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatElapsedWaitingTime,
  getProposalStatusBadgeClass,
  getProposalStatusLabel,
  type ProblemControlCenterData,
} from "@/lib/innovation";

interface ProposalsTabProps {
  proposals: ProblemControlCenterData["proposals"];
  stats: ProblemControlCenterData["stats"];
  problemId: string;
}

export function ProposalsTab({
  proposals,
  stats,
}: ProposalsTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* 1. HEADER SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Research Proposals on This Problem ({proposals.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Formulated technical approaches, methodologies, and budgets submitted by university teams
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {stats.proposalsAwaitingReviewCount > 0 && (
            <Badge className="bg-sky-100 text-sky-950 border-sky-300 font-bold text-xs animate-pulse">
              {stats.proposalsAwaitingReviewCount} Awaiting Innovation Manager Review
            </Badge>
          )}
          {stats.proposalsApprovedCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-950 border-emerald-300 font-bold text-xs">
              {stats.proposalsApprovedCount} Solution(s) Approved
            </Badge>
          )}
        </div>
      </div>

      {/* 2. PROPOSALS LIST OR EMPTY STATE */}
      {proposals.length === 0 ? (
        <EmptyState
          title="No Research Proposals Submitted Yet"
          description="When participating university research teams submit formal technical proposals, they will appear here ready for evaluation, revision feedback, and administrative authorization."
          action={
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Universities must accept invitations and form project teams before submitting proposals.</span>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((prop) => {
            const isApproved = prop.status === "APPROVED";
            const needsReview =
              prop.status === "SUBMITTED" || prop.status === "RESUBMITTED";
            const isUnderReview = prop.status === "UNDER_REVIEW";

            return (
              <Card
                key={prop.id}
                className={`rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isApproved
                    ? "border-emerald-300 bg-gradient-to-br from-emerald-50/20 via-background to-background"
                    : needsReview
                    ? "border-sky-300 bg-gradient-to-br from-sky-50/25 via-background to-background"
                    : "border-border/90 bg-card"
                }`}
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Status & Version Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getProposalStatusBadgeClass(prop.status)}>
                        {getProposalStatusLabel(prop.status)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold">
                        v{prop.versionNumber}
                      </Badge>
                      {prop.isCurrent && (
                        <Badge variant="info" className="text-[9px]">
                          Current Active
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {prop.submittedAt
                        ? `Submitted ${formatElapsedWaitingTime(prop.submittedAt)} ago`
                        : "Draft Proposal"}
                    </span>
                  </div>

                  {/* Proposal & Institution Title */}
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground leading-snug">
                      {prop.projectTitle}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Submitting Institution:{" "}
                      <span className="font-semibold text-foreground">
                        {prop.institutionName}
                      </span>
                    </p>
                  </div>

                  {/* Objective Summary */}
                  {prop.objectiveSummary && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Core Technical Objective
                      </span>
                      <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/20 p-3 rounded-xl border border-border/60 leading-relaxed">
                        {prop.objectiveSummary}
                      </p>
                    </div>
                  )}

                  {/* Footer & Review CTA */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>PI: {prop.projectLeadName || "Assigned Coordinator"}</span>
                    </span>

                    <Button
                      size="sm"
                      onClick={() => {
                        void navigate(`/app/innovation/proposals/${prop.id}`);
                      }}
                      className={`h-8 px-3.5 text-xs font-bold gap-1.5 shadow-xs shrink-0 ${
                        needsReview
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : isApproved
                          ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                          : isUnderReview
                          ? "bg-purple-700 hover:bg-purple-800 text-white"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>View Approved Solution</span>
                        </>
                      ) : (
                        <>
                          <span>{needsReview ? "Review Proposal" : "Inspect Proposal"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
