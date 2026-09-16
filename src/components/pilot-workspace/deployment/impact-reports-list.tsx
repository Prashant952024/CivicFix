import React, { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  DeploymentImpactReportRow,
  DeploymentImpactMetricRow,
  DeploymentImpactReportInput,
  ImpactMetricStatus,
} from "@/lib/deployment-impact";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-xs font-semibold leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
import type { ResearchEvidenceRow } from "@/types/database";

interface ImpactReportsListProps {
  reports: DeploymentImpactReportRow[];
  metrics: DeploymentImpactMetricRow[];
  evidenceList?: ResearchEvidenceRow[];
  onSubmitReport?: (data: DeploymentImpactReportInput) => Promise<void>;
  onAcknowledgeReport?: (reportId: string, notes?: string) => Promise<void>;
  isManager?: boolean;
  canSubmit?: boolean;
}

export function ImpactReportsList({
  reports,
  metrics,
  evidenceList = [],
  onSubmitReport,
  onAcknowledgeReport,
  isManager = false,
  canSubmit = true,
}: ImpactReportsListProps) {
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [selectedReportForAck, setSelectedReportForAck] = useState<DeploymentImpactReportRow | null>(null);
  const [ackNotes, setAckNotes] = useState("");

  // Report Form States
  const [reportingPeriod, setReportingPeriod] = useState("Month 1-3 Post-Launch Impact");
  const [periodStartDate, setPeriodStartDate] = useState(
    new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]
  );
  const [periodEndDate, setPeriodEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [keyFindings, setKeyFindings] = useState("");
  const [deploymentProgressSummary, setDeploymentProgressSummary] = useState("");
  const [unexpectedEffects, setUnexpectedEffects] = useState("");
  const [emergingRisks, setEmergingRisks] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [metricMeasurements, setMetricMeasurements] = useState<
    Array<{
      metric_id?: string;
      metric_name: string;
      observed_value: string;
      status: ImpactMetricStatus;
      notes?: string;
    }>
  >(
    metrics.map((m) => ({
      metric_id: m.id,
      metric_name: m.metric_name,
      observed_value: m.observed_value || "",
      status: (m.status || "PENDING") as ImpactMetricStatus,
      notes: "",
    }))
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenSubmit = () => {
    setMetricMeasurements(
      metrics.map((m) => ({
        metric_id: m.id,
        metric_name: m.metric_name,
        observed_value: m.observed_value || "",
        status: (m.status || "PENDING") as ImpactMetricStatus,
        notes: "",
      }))
    );
    setActionError(null);
    setSubmitModalOpen(true);
  };

  const handleUpdateMetricVal = (index: number, field: string, value: any) => {
    const updated = [...metricMeasurements];
    updated[index] = { ...updated[index], [field]: value };
    setMetricMeasurements(updated);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitReport) return;

    if (!reportingPeriod.trim() || !keyFindings.trim() || !deploymentProgressSummary.trim()) {
      setActionError("Reporting period, key findings, and deployment progress are required.");
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await onSubmitReport({
        reporting_period: reportingPeriod.trim(),
        period_start_date: periodStartDate,
        period_end_date: periodEndDate,
        key_findings: keyFindings.trim(),
        deployment_progress_summary: deploymentProgressSummary.trim(),
        metric_measurements: metricMeasurements,
        unexpected_effects: unexpectedEffects.trim() || undefined,
        emerging_risks: emergingRisks.trim() || undefined,
        corrective_actions: correctiveActions.trim() || undefined,
        next_steps: nextSteps.trim() || undefined,
      });
      setSubmitModalOpen(false);
      setKeyFindings("");
      setDeploymentProgressSummary("");
      setUnexpectedEffects("");
      setEmergingRisks("");
      setCorrectiveActions("");
      setNextSteps("");
    } catch (err: any) {
      setActionError(err.message || "Failed to submit impact report.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAck = (r: DeploymentImpactReportRow) => {
    setSelectedReportForAck(r);
    setAckNotes("");
    setActionError(null);
    setAckModalOpen(true);
  };

  const handleConfirmAck = async () => {
    if (!selectedReportForAck || !onAcknowledgeReport) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await onAcknowledgeReport(selectedReportForAck.id, ackNotes);
      setAckModalOpen(false);
      setSelectedReportForAck(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to acknowledge impact report.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            Periodic Scale-up Impact Reports ({reports.length})
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Longitudinal measurement records documenting empirical real-world results post-deployment.
          </p>
        </div>

        {!isManager && canSubmit && onSubmitReport && (
          <Button
            size="sm"
            onClick={handleOpenSubmit}
            className="text-xs h-8 gap-1.5 font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            Submit Impact Report
          </Button>
        )}
      </div>

      {reports.length === 0 ? (
        <Card className="border-border/60 bg-card">
          <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-md mx-auto space-y-3">
            <Calendar className="h-8 w-8 text-muted-foreground/60" />
            <h4 className="text-sm font-bold text-foreground">No Impact Reports Submitted Yet</h4>
            <p className="text-xs text-muted-foreground">
              Once large-scale deployment is active, the university research team can submit periodic impact updates detailing observed metrics, unexpected effects, and next steps.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="border-border/60 bg-card shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold text-foreground">
                    {report.reporting_period}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {report.period_start_date} to {report.period_end_date}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {report.acknowledged_at ? (
                    <Badge variant="success" className="text-[10px] font-bold gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Acknowledged by Manager
                    </Badge>
                  ) : isManager && onAcknowledgeReport ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAck(report)}
                      className="text-xs h-7 gap-1 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Acknowledge Report
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                      Pending Manager Review
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Findings & Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Key Impact Findings
                    </span>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {report.key_findings}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Deployment Progress Summary
                    </span>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {report.deployment_progress_summary}
                    </p>
                  </div>
                </div>

                {/* Metric Measurements Snapshot */}
                {Array.isArray(report.metric_measurements) && report.metric_measurements.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Reported Metric Measurements
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {report.metric_measurements.map((m: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded border border-border/40 bg-muted/10 space-y-1"
                        >
                          <div className="font-semibold text-foreground text-[11px] truncate">
                            {m.metric_name}
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-primary">{m.observed_value}</span>
                            <Badge variant="outline" className="text-[9px] font-mono">
                              {m.status || "RECORDED"}
                            </Badge>
                          </div>
                          {m.notes && <p className="text-[10px] text-muted-foreground line-clamp-1">{m.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unexpected Effects & Actions */}
                {(report.unexpected_effects || report.corrective_actions || report.next_steps) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-[11px]">
                    {report.unexpected_effects && (
                      <div className="space-y-0.5">
                        <span className="font-semibold text-muted-foreground">Unexpected Effects:</span>
                        <p className="text-foreground">{report.unexpected_effects}</p>
                      </div>
                    )}
                    {report.corrective_actions && (
                      <div className="space-y-0.5">
                        <span className="font-semibold text-muted-foreground">Corrective Actions:</span>
                        <p className="text-foreground">{report.corrective_actions}</p>
                      </div>
                    )}
                    {report.next_steps && (
                      <div className="space-y-0.5">
                        <span className="font-semibold text-muted-foreground">Next Planned Steps:</span>
                        <p className="text-foreground">{report.next_steps}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Manager Acknowledgement Notes */}
                {report.acknowledgement_notes && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Innovation Manager Feedback / Acknowledgement:
                    </div>
                    <p className="leading-relaxed">{report.acknowledgement_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit Impact Report Modal */}
      <Dialog
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit Periodic Scale-up Impact Report"
        description="Document observed civic impact measurements, progress milestones, and unexpected field effects."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4 pt-2 text-xs">
          {actionError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{actionError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Reporting Period <span className="text-destructive">*</span>
              </Label>
              <Input
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                placeholder="e.g. Q1 2027 or Month 1-3"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Period Start</Label>
              <Input
                type="date"
                value={periodStartDate}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Period End</Label>
              <Input
                type="date"
                value={periodEndDate}
                onChange={(e) => setPeriodEndDate(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">
              Key Impact Findings <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={keyFindings}
              onChange={(e) => setKeyFindings(e.target.value)}
              placeholder="Highlight observed real-world results, data telemetry insights, and performance against baseline..."
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">
              Deployment Progress Summary <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={deploymentProgressSummary}
              onChange={(e) => setDeploymentProgressSummary(e.target.value)}
              placeholder="Detail installations completed, sites operational, hardware nodes online, or user onboarding..."
              rows={2}
              className="text-xs"
              required
            />
          </div>

          {/* Metric Measurement Inputs */}
          {metricMeasurements.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs font-semibold text-foreground">
                Impact Metric Measurements ({metricMeasurements.length})
              </Label>
              <div className="space-y-2.5">
                {metricMeasurements.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border/60 bg-muted/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center"
                  >
                    <div className="font-semibold text-foreground truncate">{m.metric_name}</div>
                    <div>
                      <Input
                        value={m.observed_value}
                        onChange={(e) => handleUpdateMetricVal(idx, "observed_value", e.target.value)}
                        placeholder="Observed Value (e.g. 82%)"
                        className="text-xs font-mono h-8"
                      />
                    </div>
                    <div>
                      <select
                        value={m.status}
                        onChange={(e) => handleUpdateMetricVal(idx, "status", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-hidden"
                      >
                        <option value="ON_TRACK">On Track</option>
                        <option value="SURPASSED">Surpassed Target</option>
                        <option value="BELOW_TARGET">Below Target</option>
                        <option value="INCONCLUSIVE">Inconclusive</option>
                        <option value="PENDING">Pending</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">Unexpected Effects</Label>
              <Textarea
                value={unexpectedEffects}
                onChange={(e) => setUnexpectedEffects(e.target.value)}
                placeholder="Unanticipated community or environmental side-effects..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">Emerging Risks</Label>
              <Textarea
                value={emergingRisks}
                onChange={(e) => setEmergingRisks(e.target.value)}
                placeholder="Risks observed at larger scale..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">Corrective / Next Steps</Label>
              <Textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="Operational adjustments planned for next period..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSubmitModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={actionLoading || !keyFindings.trim()}
              className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit Impact Report
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Acknowledge Report Modal (Manager) */}
      <Dialog
        open={ackModalOpen}
        onClose={() => setAckModalOpen(false)}
        title="Acknowledge Periodic Impact Report"
        description="Confirm inspection of periodic impact measurements and record feedback for the research team."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          {actionError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{actionError}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Acknowledgement Notes / Feedback (Optional)</Label>
            <Textarea
              value={ackNotes}
              onChange={(e) => setAckNotes(e.target.value)}
              placeholder="e.g. Findings inspected. Scale-up progress aligns with city infrastructure goals."
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAckModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmAck}
              disabled={actionLoading}
              className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Acknowledgement
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
