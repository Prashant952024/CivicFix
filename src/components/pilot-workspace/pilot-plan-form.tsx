import React, { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FlaskConical,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Save,
  Send,
  ShieldAlert,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PILOT_ENVIRONMENT_META,
  type PilotEnvironmentType,
  type PilotKPI,
  type PilotPlanInput,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";

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

interface PilotPlanFormProps {
  initialPlan?: PilotPlanWithDetails | null;
  isRevision?: boolean;
  onSaveDraft: (data: Partial<PilotPlanInput>) => Promise<void>;
  onSubmit: (data: PilotPlanInput) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  submitting?: boolean;
}

export function PilotPlanForm({
  initialPlan,
  isRevision = false,
  onSaveDraft,
  onSubmit,
  onCancel,
  saving = false,
  submitting = false,
}: PilotPlanFormProps) {
  // 1. Identity & Objective
  const [title, setTitle] = useState(initialPlan?.title || "");
  const [summary, setSummary] = useState(initialPlan?.summary || "");
  const [objective, setObjective] = useState(initialPlan?.objective || "");
  const [researchHypothesis, setResearchHypothesis] = useState(
    initialPlan?.research_hypothesis || ""
  );

  // 2. Test Environment
  const [testEnvType, setTestEnvType] = useState<PilotEnvironmentType>(
    initialPlan?.test_environment_type || "LAB"
  );
  const [testEnvDescription, setTestEnvDescription] = useState(
    initialPlan?.test_environment_description || ""
  );
  const [locationDescription, setLocationDescription] = useState(
    initialPlan?.location_description || ""
  );

  // 3. Timeline
  const [plannedStartDate, setPlannedStartDate] = useState(
    initialPlan?.planned_start_date || new Date().toISOString().split("T")[0]
  );
  const [plannedEndDate, setPlannedEndDate] = useState(
    initialPlan?.planned_end_date ||
      new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );

  // 4. Baseline & KPIs
  const [baselineDescription, setBaselineDescription] = useState(
    initialPlan?.baseline_description || ""
  );
  const [kpis, setKpis] = useState<PilotKPI[]>(
    Array.isArray(initialPlan?.kpis) && (initialPlan.kpis as any[]).length > 0
      ? (initialPlan.kpis as unknown as PilotKPI[])
      : [
          {
            id: "kpi-1",
            name: "Primary Performance Metric",
            description: "Target efficiency, accuracy, or reduction metric",
            baseline_value: "0%",
            target_value: "80%",
            unit: "%",
            measurement_method: "Direct sensor telemetry or verification test",
          },
        ]
  );
  const [successCriteria, setSuccessCriteria] = useState(
    initialPlan?.success_criteria || ""
  );

  // 5. Participants
  const [participantDescription, setParticipantDescription] = useState(
    initialPlan?.participant_description || ""
  );
  const [participantCount, setParticipantCount] = useState(
    initialPlan?.participant_count || 0
  );
  const [participantSelectionMethod, setParticipantSelectionMethod] = useState(
    initialPlan?.participant_selection_method || ""
  );

  // 6. Risks, Safety & Ethics
  const [riskAndSafety, setRiskAndSafety] = useState(
    initialPlan?.risk_and_safety_considerations || ""
  );
  const [riskMitigation, setRiskMitigation] = useState(
    initialPlan?.risk_mitigation_plan || ""
  );
  const [ethicalConsiderations, setEthicalConsiderations] = useState(
    initialPlan?.ethical_considerations || ""
  );

  const [formError, setFormError] = useState<string | null>(null);

  // Add KPI
  const handleAddKPI = () => {
    const newKpi: PilotKPI = {
      id: `kpi-${Date.now()}`,
      name: "",
      description: "",
      baseline_value: "",
      target_value: "",
      unit: "",
      measurement_method: "",
    };
    setKpis([...kpis, newKpi]);
  };

  // Remove KPI
  const handleRemoveKPI = (index: number) => {
    setKpis(kpis.filter((_, i) => i !== index));
  };

  // Update KPI
  const handleUpdateKPI = (index: number, field: keyof PilotKPI, value: string) => {
    const updated = [...kpis];
    updated[index] = { ...updated[index], [field]: value };
    setKpis(updated);
  };

  const getFormData = (): PilotPlanInput => ({
    title,
    summary,
    objective,
    research_hypothesis: researchHypothesis,
    test_environment_type: testEnvType,
    test_environment_description: testEnvDescription,
    location_description: locationDescription,
    planned_start_date: plannedStartDate,
    planned_end_date: plannedEndDate,
    baseline_description: baselineDescription,
    baseline_metrics: {},
    kpis,
    success_criteria: successCriteria,
    participant_description: participantDescription || undefined,
    participant_count: Number(participantCount) || 0,
    participant_selection_method: participantSelectionMethod || undefined,
    risk_and_safety_considerations: riskAndSafety,
    risk_mitigation_plan: riskMitigation,
    ethical_considerations: ethicalConsiderations || undefined,
  });

  const handleSave = async () => {
    setFormError(null);
    try {
      await onSaveDraft(getFormData());
    } catch (err: any) {
      setFormError(err.message || "Failed to save pilot plan draft.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!title.trim()) {
      setFormError("Pilot title is required.");
      return;
    }
    if (!summary.trim()) {
      setFormError("Pilot summary is required.");
      return;
    }
    if (!objective.trim()) {
      setFormError("Pilot objective is required.");
      return;
    }
    if (!researchHypothesis.trim()) {
      setFormError("Research hypothesis is required.");
      return;
    }
    if (!testEnvDescription.trim()) {
      setFormError("Testbed environment description is required.");
      return;
    }
    if (!locationDescription.trim()) {
      setFormError("Location description is required.");
      return;
    }
    if (!plannedStartDate || !plannedEndDate) {
      setFormError("Planned start and end dates are required.");
      return;
    }
    if (new Date(plannedEndDate) < new Date(plannedStartDate)) {
      setFormError("Planned end date cannot be earlier than start date.");
      return;
    }
    if (!baselineDescription.trim()) {
      setFormError("Baseline description is required.");
      return;
    }
    if (kpis.length === 0 || !kpis.some((k) => k.name.trim() && k.target_value.trim())) {
      setFormError("At least one valid KPI with name and target goal is required.");
      return;
    }
    if (!successCriteria.trim()) {
      setFormError("Success criteria definition is required.");
      return;
    }
    if (!riskAndSafety.trim()) {
      setFormError("Safety considerations are required.");
      return;
    }
    if (!riskMitigation.trim()) {
      setFormError("Risk mitigation plan is required.");
      return;
    }

    try {
      await onSubmit(getFormData());
    } catch (err: any) {
      setFormError(err.message || "Failed to submit pilot plan.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Validation Required</p>
            <p className="mt-0.5 leading-relaxed">{formError}</p>
          </div>
        </div>
      )}

      {/* 1. Core Identity & Objective */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Target className="h-4 w-4 text-primary" />
            1. Pilot Identity & Research Objective
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pilot-title" className="text-xs font-semibold text-foreground">
              Pilot Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pilot-title"
              placeholder="e.g., Real-World Field Validation of Edge-AI Water Quality Sensor"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pilot-summary" className="text-xs font-semibold text-foreground">
              Executive Summary / Overview <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="pilot-summary"
              placeholder="Provide a concise 2-3 sentence overview of this real-world pilot plan..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pilot-objective" className="text-xs font-semibold text-foreground">
              Pilot Objective <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="pilot-objective"
              placeholder="What specifically does this pilot aim to test or validate in the field?"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pilot-hypothesis" className="text-xs font-semibold text-foreground">
              Research Hypothesis <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="pilot-hypothesis"
              placeholder="What core scientific, engineering, or civic assumption is being evaluated?"
              value={researchHypothesis}
              onChange={(e) => setResearchHypothesis(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Testbed Environment & Location */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            2. Test Environment & Site Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="env-type" className="text-xs font-semibold text-foreground">
                Environment Classification <span className="text-destructive">*</span>
              </Label>
              <select
                id="env-type"
                value={testEnvType}
                onChange={(e) => setTestEnvType(e.target.value as PilotEnvironmentType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Object.entries(PILOT_ENVIRONMENT_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                {PILOT_ENVIRONMENT_META[testEnvType]?.description}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location-desc" className="text-xs font-semibold text-foreground">
                Location / Site Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location-desc"
                placeholder="e.g., IIT Powai Campus Lake Testing Zone"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="env-desc" className="text-xs font-semibold text-foreground">
              Testbed Environment & Conditions Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="env-desc"
              placeholder="Describe the physical/digital layout, equipment setup, operational conditions, and access arrangements..."
              value={testEnvDescription}
              onChange={(e) => setTestEnvDescription(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Timeline & Schedule */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            3. Timeline & Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs font-semibold text-foreground">
                Planned Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start-date"
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs font-semibold text-foreground">
                Planned End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end-date"
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Baseline & KPIs Builder */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            4. Baseline & Structured Evaluation KPIs
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddKPI}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add KPI
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="baseline-desc" className="text-xs font-semibold text-foreground">
              Current Baseline Condition (Pre-Prototype Status) <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="baseline-desc"
              placeholder="What is the current ground condition or measurement baseline against which the pilot will be evaluated?"
              value={baselineDescription}
              onChange={(e) => setBaselineDescription(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-semibold text-foreground">
              Key Performance Indicators (KPIs) <span className="text-destructive">*</span>
            </Label>
            {kpis.map((kpi, idx) => (
              <div
                key={kpi.id || idx}
                className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2.5 relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">KPI #{idx + 1}</span>
                  {kpis.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveKPI(idx)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Metric Name</Label>
                    <Input
                      placeholder="e.g. Turbidity Detection Latency"
                      value={kpi.name}
                      onChange={(e) => handleUpdateKPI(idx, "name", e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Measurement Unit</Label>
                    <Input
                      placeholder="e.g. seconds, %, NTU"
                      value={kpi.unit}
                      onChange={(e) => handleUpdateKPI(idx, "unit", e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Baseline Value</Label>
                    <Input
                      placeholder="e.g. 240 seconds"
                      value={kpi.baseline_value}
                      onChange={(e) => handleUpdateKPI(idx, "baseline_value", e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-primary font-semibold">Target Goal Value</Label>
                    <Input
                      placeholder="e.g. < 15 seconds"
                      value={kpi.target_value}
                      onChange={(e) => handleUpdateKPI(idx, "target_value", e.target.value)}
                      className="text-xs h-8 border-primary/40 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Measurement Method</Label>
                  <Input
                    placeholder="e.g. Automated timestamp log from telemetry node compared against bench standard"
                    value={kpi.measurement_method}
                    onChange={(e) => handleUpdateKPI(idx, "measurement_method", e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label htmlFor="success-criteria" className="text-xs font-semibold text-foreground">
              Overall Success Criteria <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="success-criteria"
              placeholder="What overall threshold of results must be achieved for this pilot to be deemed successful?"
              value={successCriteria}
              onChange={(e) => setSuccessCriteria(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Participants & Cohort (Optional) */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4 text-primary" />
            5. Participants & Cohort (Planning Information Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="part-count" className="text-xs font-semibold text-foreground">
                Estimated Participant / Subject Count
              </Label>
              <Input
                id="part-count"
                type="number"
                min={0}
                value={participantCount}
                onChange={(e) => setParticipantCount(Number(e.target.value))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="part-sel" className="text-xs font-semibold text-foreground">
                Participant Selection Method
              </Label>
              <Input
                id="part-sel"
                placeholder="e.g. Volunteer campus student cohort, community sampling"
                value={participantSelectionMethod}
                onChange={(e) => setParticipantSelectionMethod(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="part-desc" className="text-xs font-semibold text-foreground">
              Participant Scope Description
            </Label>
            <Textarea
              id="part-desc"
              placeholder="Describe participant involvement, feedback collection mechanism, and cohort demographics if applicable..."
              value={participantDescription}
              onChange={(e) => setParticipantDescription(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* 6. Risks, Safety & Ethics */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-4 w-4 text-primary" />
            6. Safety Protocols, Risk Mitigation & Ethics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="safety-desc" className="text-xs font-semibold text-foreground">
              Safety & Operational Considerations <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="safety-desc"
              placeholder="Detail safety considerations, field hazards, physical protections, and containment measures..."
              value={riskAndSafety}
              onChange={(e) => setRiskAndSafety(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mitigation-desc" className="text-xs font-semibold text-foreground">
              Risk Mitigation & Contingency Plan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="mitigation-desc"
              placeholder="What protocols will be followed if equipment fails, weather disrupts, or anomalous readings occur?"
              value={riskMitigation}
              onChange={(e) => setRiskMitigation(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ethics-desc" className="text-xs font-semibold text-foreground">
              Ethical & Environmental Considerations
            </Label>
            <Textarea
              id="ethics-desc"
              placeholder="Data privacy protections, environmental non-disturbance measures, and institutional research guidelines..."
              value={ethicalConsiderations}
              onChange={(e) => setEthicalConsiderations(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-card border border-border/60">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-xs"
              disabled={saving || submitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={saving || submitting}
            className="text-xs gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </Button>
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={saving || submitting}
          className="text-xs gap-1.5 font-bold"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {isRevision ? "Resubmit Revised Pilot Plan" : "Submit Pilot Plan for Governance Review"}
        </Button>
      </div>
    </form>
  );
}
