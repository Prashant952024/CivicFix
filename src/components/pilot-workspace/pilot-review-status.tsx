import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PILOT_STATUS_META, type PilotPlanWithDetails } from "@/lib/pilot-planning";

interface PilotReviewStatusProps {
  plan: PilotPlanWithDetails;
}

export function PilotReviewStatus({ plan }: PilotReviewStatusProps) {
  const status = plan.status;
  const meta = PILOT_STATUS_META[status];

  if (status === "DRAFT") return null;

  return (
    <div className="space-y-3">
      {status === "REQUESTED_REVISION" && (
        <Card className="border-amber-500/30 bg-amber-500/10 shadow-sm">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Changes Requested by Innovation Manager</span>
              </div>
              <Badge variant="warning" className="text-[11px]">
                Revision Required
              </Badge>
            </div>
            <div className="p-3 rounded-md bg-background/80 border border-amber-500/20 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.revision_feedback || "Please review the pilot parameters and update the requested sections."}
            </div>
            {plan.revision_requested_at && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Requested on: {new Date(plan.revision_requested_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {status === "APPROVED" && (
        <Card className="border-emerald-500/30 bg-emerald-500/10 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Pilot Plan Formally Approved</span>
              </div>
              <Badge variant="success" className="text-[11px] uppercase tracking-wide">
                Pilot Ready
              </Badge>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              This pilot plan has received formal governance approval. The project research stage is now set to{" "}
              <strong className="font-semibold text-primary">PILOT_READY</strong> and can proceed to execution in the designated testbed.
            </p>
            {plan.approval_notes && (
              <div className="p-2.5 rounded-md bg-background/80 border border-emerald-500/20 text-xs text-foreground mt-2">
                <span className="font-semibold text-muted-foreground block text-[11px] mb-1">Approval Notes:</span>
                {plan.approval_notes}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
              {plan.approved_at && (
                <span>Approved on: {new Date(plan.approved_at).toLocaleString()}</span>
              )}
              {plan.approved_by_profile && (
                <span>Reviewer: {plan.approved_by_profile.full_name || plan.approved_by_profile.email}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {status === "REJECTED" && (
        <Card className="border-destructive/30 bg-destructive/10 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>Pilot Plan Rejected</span>
              </div>
              <Badge variant="danger" className="text-[11px]">
                Rejected
              </Badge>
            </div>
            <div className="p-3 rounded-md bg-background/80 border border-destructive/20 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {plan.rejection_reason || "Pilot plan did not satisfy safety or governance requirements."}
            </div>
            {plan.rejected_at && (
              <p className="text-[11px] text-muted-foreground">
                Rejected on: {new Date(plan.rejected_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(status === "SUBMITTED" || status === "RESUBMITTED" || status === "UNDER_REVIEW") && (
        <Card className="border-blue-500/30 bg-blue-500/10 shadow-sm">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{status === "UNDER_REVIEW" ? "Under Governance Review" : "Submitted for Review"}</span>
              </div>
              <Badge variant="info" className="text-[11px]">
                {meta.label}
              </Badge>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              The pilot plan is currently in review with the Innovation Manager. You will be notified once a decision or feedback is issued. Content is locked during review.
            </p>
            {plan.submitted_at && (
              <p className="text-[11px] text-muted-foreground">
                Submitted: {new Date(plan.submitted_at).toLocaleString()} (Version {plan.version})
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
