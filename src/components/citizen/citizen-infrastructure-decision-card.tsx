import { Building2, Calendar, CheckCircle2, Clock, Info, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCitizenIssueDateTime, getCitizenIssueStatusLabel, type CitizenIssueStatus } from "@/lib/citizen-issues";
import type { CitizenInfrastructureDecisionView } from "@/lib/infrastructure-decision";

export interface CitizenInfrastructureDecisionCardProps {
  status: CitizenIssueStatus;
  decision: CitizenInfrastructureDecisionView | null;
  loadingDecision?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function isInfrastructureStatus(status: CitizenIssueStatus): boolean {
  return (
    status === "CLASSIFIED_INFRASTRUCTURE" ||
    status === "INFRASTRUCTURE_REVIEW" ||
    status === "INFRASTRUCTURE_ACCEPTED" ||
    status === "INFRASTRUCTURE_REJECTED" ||
    status === "INFRASTRUCTURE_DEFERRED"
  );
}

export function CitizenInfrastructureDecisionCard({
  status,
  decision,
  loadingDecision = false,
  t,
}: CitizenInfrastructureDecisionCardProps) {
  if (!isInfrastructureStatus(status)) {
    return null;
  }

  // State 1: Under Review / Assessment In Progress
  if (status === "CLASSIFIED_INFRASTRUCTURE" || status === "INFRASTRUCTURE_REVIEW") {
    return (
      <Card className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-background to-sky-50/40 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                  {t("citizen.issueDetails.infrastructure.tag")}
                </span>
                <Badge variant="outline" size="sm" className="bg-amber-50 border-amber-300 text-amber-800 font-semibold">
                  <Clock className="h-3 w-3 mr-1" />
                  {getCitizenIssueStatusLabel(status, t)}
                </Badge>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {t("citizen.issueDetails.infrastructure.reviewTitle")}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("citizen.issueDetails.infrastructure.reviewDescription")}
            </p>

            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/90 p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-relaxed">
                {t("citizen.issueDetails.infrastructure.reviewNotice")}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // State 2: Passed (INFRASTRUCTURE_ACCEPTED)
  if (status === "INFRASTRUCTURE_ACCEPTED") {
    return (
      <Card className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-background to-teal-50/40 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="space-y-4 flex-1 min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {t("citizen.issueDetails.infrastructure.tag")}
                </span>
                <Badge variant="emerald" size="sm" className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("citizen.issueDetails.infrastructure.passedBadge")}
                </Badge>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {t("citizen.issueDetails.infrastructure.passedTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("citizen.issueDetails.infrastructure.passedSubtitle")}
              </p>
            </div>

            {/* Official Citizen-Safe Summary */}
            <div className="rounded-xl border border-emerald-200 bg-white/90 dark:bg-card p-4 space-y-2 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {t("citizen.issueDetails.infrastructure.officialSummaryLabel")}
              </span>
              <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed italic">
                "{decision?.citizen_safe_summary || t("citizen.issueDetails.infrastructure.passedExplanation")}"
              </p>
            </div>

            {/* Structured Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              {decision?.decided_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">
                      {t("citizen.issueDetails.infrastructure.decisionDateLabel")}:
                    </strong>{" "}
                    {formatCitizenIssueDateTime(decision.decided_at)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>
                  <strong className="text-foreground font-semibold">
                    {t("citizen.issueDetails.infrastructure.resultingStatusLabel")}:
                  </strong>{" "}
                  {getCitizenIssueStatusLabel(status, t)}
                </span>
              </div>
            </div>

            {/* Status Meaning Explanation */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground block mb-0.5">
                {t("citizen.issueDetails.infrastructure.statusExplanationLabel")}
              </strong>
              {t("citizen.issueDetails.infrastructure.passedExplanation")}
            </div>

            {/* Official Governance Disclaimer */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/90">
              <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{t("citizen.issueDetails.infrastructure.disclaimer")}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // State 3: Not Passed (INFRASTRUCTURE_REJECTED)
  if (status === "INFRASTRUCTURE_REJECTED") {
    return (
      <Card className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50/90 via-background to-orange-50/40 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="space-y-4 flex-1 min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                  {t("citizen.issueDetails.infrastructure.tag")}
                </span>
                <Badge variant="rose" size="sm" className="font-bold flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {t("citizen.issueDetails.infrastructure.notPassedBadge")}
                </Badge>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {t("citizen.issueDetails.infrastructure.notPassedTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("citizen.issueDetails.infrastructure.notPassedSubtitle")}
              </p>
            </div>

            {/* Official Citizen-Safe Summary */}
            <div className="rounded-xl border border-rose-200 bg-white/90 dark:bg-card p-4 space-y-2 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {t("citizen.issueDetails.infrastructure.officialSummaryLabel")}
              </span>
              <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed italic">
                "{decision?.citizen_safe_summary || t("citizen.issueDetails.infrastructure.notPassedExplanation")}"
              </p>
            </div>

            {/* Structured Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              {decision?.decided_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-rose-700 shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">
                      {t("citizen.issueDetails.infrastructure.decisionDateLabel")}:
                    </strong>{" "}
                    {formatCitizenIssueDateTime(decision.decided_at)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-700 shrink-0" />
                <span>
                  <strong className="text-foreground font-semibold">
                    {t("citizen.issueDetails.infrastructure.resultingStatusLabel")}:
                  </strong>{" "}
                  {getCitizenIssueStatusLabel(status, t)}
                </span>
              </div>
            </div>

            {/* Status Meaning Explanation */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground block mb-0.5">
                {t("citizen.issueDetails.infrastructure.statusExplanationLabel")}
              </strong>
              {t("citizen.issueDetails.infrastructure.notPassedExplanation")}
            </div>

            {/* Official Governance Disclaimer */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/90">
              <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{t("citizen.issueDetails.infrastructure.disclaimer")}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // State 4: Deferred (INFRASTRUCTURE_DEFERRED) fallback
  return (
    <Card className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
          <Clock className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-3 flex-1 min-w-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
              {t("citizen.issueDetails.infrastructure.tag")}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
              {getCitizenIssueStatusLabel(status, t)}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
            "{decision?.citizen_safe_summary || t("citizen.issueDetails.infrastructure.reviewDescription")}"
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 shrink-0" />
            <span>{t("citizen.issueDetails.infrastructure.disclaimer")}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
