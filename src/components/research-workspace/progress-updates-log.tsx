import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { acknowledgeProgressUpdate } from "@/lib/research-workspace";
import type { ResearchWorkspaceSummary } from "@/lib/research-workspace";

interface ProgressUpdatesLogProps {
  projectId: string;
  updates: ResearchWorkspaceSummary["progressUpdates"];
  isManager?: boolean;
  onRefresh?: () => void;
  onOpenSubmitModal?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export function ProgressUpdatesLog({
  projectId,
  updates,
  isManager = false,
  onRefresh,
  onOpenSubmitModal,
  onNavigateToTab,
}: ProgressUpdatesLogProps) {
  const [acknowledgingUpdateId, setAcknowledgingUpdateId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  const handleOpenAcknowledge = (updateId: string) => {
    setAcknowledgingUpdateId(updateId);
    setFeedbackText("");
    setAckError(null);
  };

  const handleConfirmAcknowledge = async () => {
    if (!acknowledgingUpdateId) return;
    setIsSubmittingAck(true);
    setAckError(null);
    try {
      await acknowledgeProgressUpdate(acknowledgingUpdateId, projectId, feedbackText);
      setAcknowledgingUpdateId(null);
      onRefresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to acknowledge update";
      setAckError(msg);
    } finally {
      setIsSubmittingAck(false);
    }
  };

  if (updates.length === 0) {
    return (
      <Card className="border-border/80">
        <CardContent className="p-8">
          <EmptyState
            icon={FileText}
            title="No Progress Updates Submitted Yet"
            description="The university research team will submit periodic structured progress reports every 5 days to report completed work, findings, and support needs."
            action={
              !isManager && onOpenSubmitModal ? (
                <Button size="sm" onClick={onOpenSubmitModal}>
                  Submit First Progress Update
                </Button>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Periodic Progress Reports ({updates.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Auditable 5-day cadence reports tracking milestones, evidence, and roadblocks.
          </p>
        </div>

        {!isManager && onOpenSubmitModal && (
          <Button
            size="sm"
            onClick={onOpenSubmitModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs h-8 px-3"
          >
            <span>Submit Update</span>
          </Button>
        )}
      </div>

      {/* CHRONOLOGICAL UPDATES LIST */}
      <div className="space-y-4">
        {updates.map((u, idx) => {
          const isAcknowledged = Boolean(u.manager_acknowledged_at);

          return (
            <Card key={u.id} className="border-border/80 shadow-xs overflow-hidden">
              <div
                className={`h-1 ${
                  isAcknowledged
                    ? "bg-emerald-500"
                    : "bg-sky-500"
                }`}
              />
              <CardContent className="p-5 space-y-4">
                {/* Header: Period, Submitter, Sequence */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/70">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        Update #{updates.length - idx}
                      </span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        Reporting Period: {u.reporting_period_start} – {u.reporting_period_end}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Submitted by: <strong className="text-foreground">{u.submitterName || "Research Team"}</strong>
                      </span>
                      <span>•</span>
                      <span>{new Date(u.submitted_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Status / Acknowledge Action */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isAcknowledged ? (
                      <Badge className="bg-emerald-100 text-emerald-950 border-emerald-300 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3 mr-1 inline text-emerald-600" />
                        Manager Acknowledged
                      </Badge>
                    ) : (
                      <Badge className="bg-sky-100 text-sky-950 border-sky-300 text-[11px] font-semibold">
                        <Clock className="w-3 h-3 mr-1 inline text-sky-600" />
                        Awaiting Manager Review
                      </Badge>
                    )}

                    {isManager && !isAcknowledged && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenAcknowledge(u.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold h-7 px-3 shadow-xs"
                      >
                        Acknowledge
                      </Button>
                    )}

                    {isManager && onNavigateToTab && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateToTab("communication")}
                        className="h-7 px-2.5 text-xs font-semibold gap-1 text-slate-700 border-border/80 hover:bg-muted"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Clarify</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Body 1: What Was Completed */}
                <div className="space-y-1">
                  <h5 className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    Completed Research Activities
                  </h5>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">
                    {u.summary_completed}
                  </p>
                </div>

                {/* Body 2: Current Findings (if present) */}
                {u.current_findings && (
                  <div className="space-y-1">
                    <h5 className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Key Findings &amp; Technical Discoveries
                    </h5>
                    <p className="text-xs text-foreground whitespace-pre-line leading-relaxed bg-amber-50/20 p-3 rounded-xl border border-amber-200/50">
                      {u.current_findings}
                    </p>
                  </div>
                )}

                {/* Milestone Progression Tag (if linked) */}
                {u.milestone_id && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50/30 border border-sky-200/60 text-xs">
                    <Layers className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="text-muted-foreground">Milestone Progressed:</span>
                    <span className="font-bold text-foreground">
                      {u.milestone_progress_pct !== null ? `${u.milestone_progress_pct}% reached` : "Active"}
                    </span>
                  </div>
                )}

                {/* Body 3: Next Planned Work */}
                <div className="space-y-1">
                  <h5 className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    Next 5-Day Plan
                  </h5>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">
                    {u.next_planned_work}
                  </p>
                </div>

                {/* Body 4: Support Required (if present) */}
                {u.support_required && (
                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-amber-700" />
                        Municipal / Industry Support Required
                      </span>
                      {u.support_category && (
                        <Badge variant="outline" className="bg-white/80 text-amber-900 border-amber-300 font-bold text-[10px]">
                          Category: {u.support_category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-amber-950 leading-relaxed font-medium">
                      {u.support_required}
                    </p>
                  </div>
                )}

                {/* Body 5: Evidence & External Links Attached */}
                {u.evidenceItems && u.evidenceItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Attached Artifacts &amp; External Links:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {u.evidenceItems.map((ev) => (
                        <a
                          key={ev.id}
                          href={ev.url || "#"}
                          target={ev.url ? "_blank" : "_self"}
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-semibold hover:border-primary transition-colors text-foreground"
                        >
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            [{ev.evidence_type}]
                          </span>
                          <span>{ev.title}</span>
                          {ev.url && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Administrative Acknowledgement Note */}
                {isAcknowledged && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-1">
                    <div className="flex items-center justify-between text-xs text-emerald-950">
                      <span className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Acknowledged by {u.acknowledgingManagerName || "Innovation Manager"}
                      </span>
                      {u.manager_acknowledged_at && (
                        <span className="text-[10px] text-emerald-900 font-mono">
                          {new Date(u.manager_acknowledged_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {u.manager_feedback && (
                      <p className="text-xs text-emerald-950 italic pl-4.5 pt-1">
                        "{u.manager_feedback}"
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ACKNOWLEDGE UPDATE MODAL */}
      <Dialog
        open={Boolean(acknowledgingUpdateId)}
        onClose={() => setAcknowledgingUpdateId(null)}
        title="Acknowledge Research Progress Update"
        description="Verify this report and optionally record guidance, questions, or notes for the university team."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          {ackError && (
            <div className="p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg">
              {ackError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Manager Feedback / Advisory (Optional)
            </label>
            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Excellent progress on the sensor bus calibration. We are coordinating with the water department for canal telemetry access."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAcknowledgingUpdateId(null)}
              disabled={isSubmittingAck}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void handleConfirmAcknowledge();
              }}
              disabled={isSubmittingAck}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {isSubmittingAck ? "Acknowledging..." : "Confirm & Acknowledge"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
