import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  PilotValidationWithDetails,
  PilotValidationInput,
  PilotDeviationItem,
  PilotKPIAchievementStatus,
} from "@/lib/pilot-validation";

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

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
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

interface ValidationFormProps {
  validation: PilotValidationWithDetails;
  evidenceList?: any[];
  onSaveDraft: (data: Partial<PilotValidationInput>) => Promise<void>;
  onSubmit: (data: PilotValidationInput) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  submitting?: boolean;
}

export function ValidationForm({
  validation,
  evidenceList = [],
  onSaveDraft,
  onSubmit,
  onCancel,
  saving = false,
  submitting = false,
}: ValidationFormProps) {
  // Narrative states
  const [overallSummary, setOverallSummary] = useState(validation.overall_summary || "");
  const [observedOutcomes, setObservedOutcomes] = useState(validation.observed_outcomes || "");
  const [lessonsLearned, setLessonsLearned] = useState(validation.lessons_learned || "");
  const [limitations, setLimitations] = useState(validation.limitations || "");
  const [recommendations, setRecommendations] = useState(validation.recommendations || "");
  const [universityInterpretation, setUniversityInterpretation] = useState(
    validation.university_interpretation || ""
  );

  // Deviations list
  const [deviations, setDeviations] = useState<PilotDeviationItem[]>(
    Array.isArray(validation.deviations) && validation.deviations.length > 0
      ? (validation.deviations as unknown as PilotDeviationItem[])
      : []
  );

  // Structured KPIs state
  const [kpis, setKpis] = useState<
    Array<{
      kpi_id: string;
      kpi_name: string;
      description?: string;
      unit?: string;
      baseline_value: string;
      target_value: string;
      observed_value: string;
      measurement_method?: string;
      measurement_period?: string;
      achievement_status: PilotKPIAchievementStatus;
      evidence_ids?: string[];
      notes?: string;
    }>
  >(
    validation.kpis.map((k) => ({
      kpi_id: k.kpi_id,
      kpi_name: k.kpi_name,
      description: k.description || undefined,
      unit: k.unit || undefined,
      baseline_value: k.baseline_value,
      target_value: k.target_value,
      observed_value: k.observed_value || "",
      measurement_method: k.measurement_method || undefined,
      measurement_period: k.measurement_period || undefined,
      achievement_status: (k.achievement_status as PilotKPIAchievementStatus) || "INCONCLUSIVE",
      evidence_ids: Array.isArray(k.evidence_ids) ? (k.evidence_ids as string[]) : [],
      notes: k.notes || undefined,
    }))
  );

  const [formError, setFormError] = useState<string | null>(null);

  const handleKpiChange = (idx: number, field: string, value: any) => {
    setKpis((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleAddDeviation = () => {
    setDeviations((prev) => [
      ...prev,
      {
        id: `dev-${Date.now()}`,
        deviation: "",
        reason: "",
        impact: "",
        mitigation: "",
      },
    ]);
  };

  const handleUpdateDeviation = (idx: number, field: keyof PilotDeviationItem, value: string) => {
    setDeviations((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleRemoveDeviation = (idx: number) => {
    setDeviations((prev) => prev.filter((_, i) => i !== idx));
  };

  const getFormData = (): PilotValidationInput => ({
    overall_summary: overallSummary.trim(),
    observed_outcomes: observedOutcomes.trim(),
    deviations: deviations.filter((d) => d.deviation.trim().length > 0),
    lessons_learned: lessonsLearned.trim(),
    limitations: limitations.trim() || undefined,
    recommendations: recommendations.trim() || undefined,
    university_interpretation: universityInterpretation.trim() || undefined,
    kpi_results: kpis,
  });

  const handleDraft = async () => {
    setFormError(null);
    try {
      await onSaveDraft(getFormData());
    } catch (err: any) {
      setFormError(err.message || "Failed to save validation draft.");
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!overallSummary || overallSummary.trim().length < 20) {
      setFormError("Overall pilot validation summary must be at least 20 characters.");
      return;
    }
    if (!observedOutcomes || observedOutcomes.trim().length < 20) {
      setFormError("Observed pilot outcomes description must be at least 20 characters.");
      return;
    }
    if (!lessonsLearned || lessonsLearned.trim().length < 20) {
      setFormError("Lessons learned must be at least 20 characters.");
      return;
    }

    // Check all KPIs have observed values
    const missingKpis = kpis.filter((k) => !k.observed_value || k.observed_value.trim().length === 0);
    if (missingKpis.length > 0) {
      setFormError(`Please enter observed results for all approved KPIs (missing: ${missingKpis[0].kpi_name}).`);
      return;
    }

    try {
      await onSubmit(getFormData());
    } catch (err: any) {
      setFormError(err.message || "Failed to submit validation results.");
    }
  };

  return (
    <form onSubmit={handleFinalSubmit} className="space-y-6">
      {formError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. KPI Results Formulation */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Approved KPI Targets & Measured Results ({kpis.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            The baseline and target metrics below are permanently locked from your approved pilot plan.
            Enter the actual observed measurements from your field testing below.
          </p>

          <div className="space-y-4">
            {kpis.map((kpi, idx) => (
              <div
                key={kpi.kpi_id}
                className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      {kpi.kpi_name}
                    </h4>
                    {kpi.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-muted-foreground">
                      Baseline: <strong className="text-foreground">{kpi.baseline_value}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Target: <strong className="text-primary">{kpi.target_value}</strong>
                    </span>
                    {kpi.unit && (
                      <Badge variant="outline" className="text-[10px]">
                        {kpi.unit}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Actual Observed Result *</Label>
                    <Input
                      placeholder="e.g. 96.4% or 11.2s"
                      value={kpi.observed_value}
                      onChange={(e) => handleKpiChange(idx, "observed_value", e.target.value)}
                      className="font-mono text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Factual Result Status *</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={kpi.achievement_status}
                      onChange={(e) => handleKpiChange(idx, "achievement_status", e.target.value)}
                    >
                      <option value="ACHIEVED">Achieved Target</option>
                      <option value="PARTIALLY_ACHIEVED">Partially Achieved</option>
                      <option value="NOT_ACHIEVED">Not Achieved</option>
                      <option value="INCONCLUSIVE">Inconclusive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Measurement Period / Dates</Label>
                    <Input
                      placeholder="e.g. Days 1-30 continuous"
                      value={kpi.measurement_period || ""}
                      onChange={(e) => handleKpiChange(idx, "measurement_period", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Measurement Methodology / Instrumentation</Label>
                    <Input
                      placeholder="e.g. 10Hz calibrated edge flow sensors vs ground reference"
                      value={kpi.measurement_method || ""}
                      onChange={(e) => handleKpiChange(idx, "measurement_method", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Measurement Context Notes</Label>
                    <Input
                      placeholder="e.g. Observed 2 transient noise spikes during monsoon peak"
                      value={kpi.notes || ""}
                      onChange={(e) => handleKpiChange(idx, "notes", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Evidence Linker */}
                {evidenceList.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-[11px]">Link Supporting Field Evidence</Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {evidenceList.map((ev) => {
                        const isSelected = (kpi.evidence_ids || []).includes(ev.id);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              const curr = kpi.evidence_ids || [];
                              const updated = isSelected
                                ? curr.filter((id) => id !== ev.id)
                                : [...curr, ev.id];
                              handleKpiChange(idx, "evidence_ids", updated);
                            }}
                            className={cn(
                              "text-[10px] px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:bg-muted/40"
                            )}
                          >
                            <Target className="h-2.5 w-2.5" />
                            <span>{ev.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Executive Validation Summary */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Executive Summary & Observed Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Overall Pilot Validation Summary *</Label>
            <Textarea
              placeholder="Provide a comprehensive executive summary of the real-world pilot execution, testbed performance, and core empirical findings..."
              value={overallSummary}
              onChange={(e) => setOverallSummary(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observed Empirical Outcomes & Findings *</Label>
            <Textarea
              placeholder="Describe the detailed technical and scientific findings, sensor accuracy, environmental resilience, and quantitative results..."
              value={observedOutcomes}
              onChange={(e) => setObservedOutcomes(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>University's Self-Interpretation (Optional)</Label>
            <Textarea
              placeholder="Provide the university research team's interpretation of findings and operational readiness..."
              value={universityInterpretation}
              onChange={(e) => setUniversityInterpretation(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Operational Deviations */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Execution Deviations & Environmental Changes ({deviations.length})
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddDeviation}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Deviation
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Document any variations between the approved pilot plan and actual field execution (e.g. adjusted sample sizes, weather conditions, sensor relocations). Deviations provide essential context for governance review.
          </p>

          {deviations.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
              No operational deviations recorded. Click "Add Deviation" if any field parameters varied from the plan.
            </div>
          ) : (
            <div className="space-y-3">
              {deviations.map((dev, idx) => (
                <div key={dev.id} className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Deviation #{idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDeviation(idx)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Deviation Description *</Label>
                      <Input
                        placeholder="e.g. Relocated Sensor Node 4 by 50 meters"
                        value={dev.deviation}
                        onChange={(e) => handleUpdateDeviation(idx, "deviation", e.target.value)}
                        className="text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Reason *</Label>
                      <Input
                        placeholder="e.g. Tree canopy obstructed solar array"
                        value={dev.reason}
                        onChange={(e) => handleUpdateDeviation(idx, "reason", e.target.value)}
                        className="text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Impact on Measurement</Label>
                      <Input
                        placeholder="e.g. Telemetry signal improved by +8dBm"
                        value={dev.impact}
                        onChange={(e) => handleUpdateDeviation(idx, "impact", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Mitigation / Safeguards Applied</Label>
                      <Input
                        placeholder="e.g. Recalibrated baseline coordinates"
                        value={dev.mitigation}
                        onChange={(e) => handleUpdateDeviation(idx, "mitigation", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Lessons Learned, Limitations & Recommendations */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lessons Learned, Limitations & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Key Lessons Learned (Technical & Operational) *</Label>
            <Textarea
              placeholder="What worked effectively? What unexpected hurdles occurred? What technical lessons were discovered regarding sensor endurance, edge ML, or civic deployment?"
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Research & Testbed Limitations</Label>
              <Textarea
                placeholder="Identify boundary conditions, seasonal constraints, or hardware limitations encountered..."
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Recommendations for Future Scaling / Testing</Label>
              <Textarea
                placeholder="Provide recommendations for future validation trials, algorithm improvements, or testbed expansions..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving || submitting}
          className="text-xs"
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDraft}
            disabled={saving || submitting}
            className="text-xs gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </Button>

          <Button
            type="submit"
            disabled={saving || submitting}
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {validation.status === "REQUESTED_REVISION"
              ? "Resubmit Validation Results"
              : "Submit for Governance Review"}
          </Button>
        </div>
      </div>
    </form>
  );
}
