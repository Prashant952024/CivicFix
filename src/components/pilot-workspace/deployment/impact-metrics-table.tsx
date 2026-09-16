import React, { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  HelpCircle,
  Loader2,
  Paperclip,
  Save,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  type DeploymentImpactMetricRow,
  type ImpactMetricStatus,
  IMPACT_METRIC_STATUS_META,
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

interface ImpactMetricsTableProps {
  metrics: DeploymentImpactMetricRow[];
  evidenceList?: ResearchEvidenceRow[];
  onUpdateMetric?: (metricId: string, updates: Partial<DeploymentImpactMetricRow>) => Promise<void>;
  isEditable?: boolean;
}

export function ImpactMetricsTable({
  metrics,
  evidenceList = [],
  onUpdateMetric,
  isEditable = false,
}: ImpactMetricsTableProps) {
  const [selectedMetric, setSelectedMetric] = useState<DeploymentImpactMetricRow | null>(null);
  const [observedValue, setObservedValue] = useState("");
  const [status, setStatus] = useState<ImpactMetricStatus>("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenEdit = (m: DeploymentImpactMetricRow) => {
    setSelectedMetric(m);
    setObservedValue(m.observed_value || "");
    setStatus(m.status as ImpactMetricStatus);
    setNotes(m.notes || "");
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedMetric || !onUpdateMetric) return;
    try {
      setSaving(true);
      setError(null);
      await onUpdateMetric(selectedMetric.id, {
        observed_value: observedValue.trim(),
        status,
        notes: notes.trim() || null,
      });
      setSelectedMetric(null);
    } catch (err: any) {
      setError(err.message || "Failed to update impact metric.");
    } finally {
      setSaving(false);
    }
  };

  if (!metrics || metrics.length === 0) {
    return (
      <Card className="border-border/60 bg-card">
        <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-md mx-auto space-y-3">
          <BarChart3 className="h-8 w-8 text-muted-foreground/60" />
          <h3 className="text-sm font-bold text-foreground">No Impact Metrics Defined</h3>
          <p className="text-xs text-muted-foreground">
            Configure long-term civic, environmental, or economic impact metrics in the scale-up plan to track outcomes post-deployment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/60 bg-card shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Large-Scale Impact Metrics & Telemetry ({metrics.length})
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              {metrics.filter((m) => m.status === "SURPASSED" || m.status === "ON_TRACK").length} On Track / Surpassed
            </span>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 px-4">Impact Metric</th>
                <th className="py-2.5 px-3">Baseline</th>
                <th className="py-2.5 px-3">Target (Scale-up)</th>
                <th className="py-2.5 px-3">Observed Impact</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Cadence & Method</th>
                {isEditable && onUpdateMetric && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-[11px]">
              {metrics.map((metric) => {
                const statusMeta =
                  IMPACT_METRIC_STATUS_META[metric.status as ImpactMetricStatus] ||
                  IMPACT_METRIC_STATUS_META.PENDING;

                return (
                  <tr key={metric.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-foreground text-xs">{metric.metric_name}</div>
                      {metric.description && (
                        <p className="text-[11px] text-muted-foreground font-sans line-clamp-1 mt-0.5">
                          {metric.description}
                        </p>
                      )}
                      {metric.unit && (
                        <Badge variant="outline" className="text-[9px] font-mono mt-1">
                          Unit: {metric.unit}
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-3 text-muted-foreground">
                      {metric.baseline_value}
                    </td>

                    <td className="py-3 px-3 font-bold text-foreground">
                      {metric.target_value}
                    </td>

                    <td className="py-3 px-3">
                      {metric.observed_value ? (
                        <span className="font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {metric.observed_value}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic text-[10px]">Awaiting telemetry</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <Badge
                        variant={
                          statusMeta.badgeTone === "emerald"
                            ? "success"
                            : statusMeta.badgeTone === "danger"
                            ? "danger"
                            : statusMeta.badgeTone === "warning"
                            ? "outline"
                            : "outline"
                        }
                        className={cn(
                          "text-[10px] font-bold",
                          statusMeta.badgeTone === "warning" && "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
                          statusMeta.badgeTone === "info" && "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                        )}
                      >
                        {statusMeta.label}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 font-sans text-muted-foreground text-[11px]">
                      <div>{metric.measurement_period || "Monthly"}</div>
                      {metric.measurement_method && (
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          {metric.measurement_method}
                        </div>
                      )}
                    </td>

                    {isEditable && onUpdateMetric && (
                      <td className="py-3 px-3 text-right font-sans">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(metric)}
                          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3 w-3" />
                          Update
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Metric Dialog */}
      <Dialog
        open={Boolean(selectedMetric)}
        onClose={() => setSelectedMetric(null)}
        title={`Update Impact Telemetry: ${selectedMetric?.metric_name}`}
        description="Record verified long-term impact measurement data and empirical outcome status."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/60 bg-muted/10">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Baseline
              </span>
              <p className="font-bold text-foreground font-mono">{selectedMetric?.baseline_value} {selectedMetric?.unit}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Target (Scale-up)
              </span>
              <p className="font-bold text-foreground font-mono">{selectedMetric?.target_value} {selectedMetric?.unit}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Observed Value <span className="text-destructive">*</span>
            </Label>
            <Input
              value={observedValue}
              onChange={(e) => setObservedValue(e.target.value)}
              placeholder="e.g. 78.4% or 8.5 mins"
              className="text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Impact Status <span className="text-destructive">*</span>
            </Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ImpactMetricStatus)}
              className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="PENDING">Baseline / Pending Measurement</option>
              <option value="ON_TRACK">On Track (Progressing as projected)</option>
              <option value="SURPASSED">Target Surpassed (Exceeded expectations)</option>
              <option value="BELOW_TARGET">Below Target (Lagging behind expectations)</option>
              <option value="INCONCLUSIVE">Inconclusive (Data insufficient / ongoing)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Telemetry Notes / Observations</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key observations on measurement anomalies, seasonality, or sensor data"
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedMetric(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEdit}
              disabled={saving || !observedValue.trim()}
              className="text-xs gap-1.5 font-bold"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Impact Telemetry
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
