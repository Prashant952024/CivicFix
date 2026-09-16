import React, { useState } from "react";
import {
  AlertCircle,
  Cpu,
  Layers,
  Loader2,
  Package,
  Plus,
  Rocket,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DeploymentPlanWithDetails,
  DeploymentPlanInput,
  DeploymentPhaseItem,
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

interface ScaleUpPlanFormProps {
  deployment: DeploymentPlanWithDetails;
  onSaveDraft: (data: Partial<DeploymentPlanInput>) => Promise<void>;
  onSubmit: (data: DeploymentPlanInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isSaving?: boolean;
}

export function ScaleUpPlanForm({
  deployment,
  onSaveDraft,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isSaving = false,
}: ScaleUpPlanFormProps) {
  // Core Strategy states
  const [title, setTitle] = useState(
    deployment.title || `${deployment.project?.project_title || "Solution"} — Scale-up & Deployment Plan`
  );
  const [summary, setSummary] = useState(deployment.summary || "");
  const [deploymentScope, setDeploymentScope] = useState(deployment.deployment_scope || "");
  const [targetGeography, setTargetGeography] = useState(deployment.target_geography || "");
  const [targetPopulation, setTargetPopulation] = useState(deployment.target_population || "");
  const [scaleMultiplier, setScaleMultiplier] = useState(deployment.scale_multiplier || "10x scale rollout");

  // Timeline states
  const [plannedStartDate, setPlannedStartDate] = useState(() => {
    return deployment.planned_start_date || new Date().toISOString().split("T")[0];
  });
  const [plannedEndDate, setPlannedEndDate] = useState(() => {
    if (deployment.planned_end_date) return deployment.planned_end_date;
    const d = new Date();
    d.setDate(d.getDate() + 180);
    return d.toISOString().split("T")[0];
  });
  const [estimatedDurationDays, setEstimatedDurationDays] = useState<number>(
    deployment.estimated_duration_days || 180
  );

  // Readiness states
  const [technicalReadiness, setTechnicalReadiness] = useState(deployment.technical_readiness || "");
  const [operationalReadiness, setOperationalReadiness] = useState(deployment.operational_readiness || "");
  const [fundingRequirements, setFundingRequirements] = useState(deployment.funding_requirements || "");
  const [hardwareRequirements, setHardwareRequirements] = useState(deployment.hardware_requirements || "");
  const [technologyRequirements, setTechnologyRequirements] = useState(deployment.technology_requirements || "");
  const [humanResourceRequirements, setHumanResourceRequirements] = useState(
    deployment.human_resource_requirements || ""
  );
  const [infrastructureRequirements, setInfrastructureRequirements] = useState(
    deployment.infrastructure_requirements || ""
  );
  const [trainingPlan, setTrainingPlan] = useState(deployment.training_plan || "");
  const [maintenancePlan, setMaintenancePlan] = useState(deployment.maintenance_plan || "");
  const [riskManagementPlan, setRiskManagementPlan] = useState(deployment.risk_management_plan || "");

  // Phased Rollout states
  const [phases, setPhases] = useState<DeploymentPhaseItem[]>(
    Array.isArray(deployment.deployment_phases) && deployment.deployment_phases.length > 0
      ? deployment.deployment_phases
      : [
          {
            id: "phase-1",
            phase_name: "Phase 1: Controlled Multi-Site Expansion",
            target_timeline: "Month 1 - 2",
            description: "Deploy in 3 core high-priority wards to calibrate load telemetry.",
            key_milestones: "Site surveys, hardware mounting, cellular gateway configuration.",
          },
        ]
  );

  // Long-term Impact Metrics state
  const [metrics, setMetrics] = useState<
    Array<{
      id?: string;
      metric_name: string;
      description?: string;
      unit?: string;
      baseline_value: string;
      target_value: string;
      observed_value?: string;
      measurement_period?: string;
      measurement_method?: string;
      data_source?: string;
      status?: ImpactMetricStatus;
      notes?: string;
    }>
  >(() => {
    if (deployment.impact_metrics && deployment.impact_metrics.length > 0) {
      return deployment.impact_metrics.map((m) => ({
        id: m.id,
        metric_name: m.metric_name,
        description: m.description || "",
        unit: m.unit || "",
        baseline_value: m.baseline_value || "0",
        target_value: m.target_value || "0",
        observed_value: m.observed_value || "",
        measurement_period: m.measurement_period || "",
        measurement_method: m.measurement_method || "",
        data_source: m.data_source || "",
        status: (m.status || "PENDING") as ImpactMetricStatus,
        notes: m.notes || "",
      }));
    }
    return [
      {
        metric_name: "Civic Service Latency Reduction",
        description: "Reduction in response and resolution turnaround for affected citizens.",
        unit: "%",
        baseline_value: "0%",
        target_value: "75%",
        observed_value: "",
        measurement_period: "Quarterly",
        measurement_method: "Municipal telemetry log comparison",
        status: "PENDING",
      },
    ];
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Phase operations
  const handleAddPhase = () => {
    setPhases([
      ...phases,
      {
        id: `phase-${Date.now()}`,
        phase_name: `Phase ${phases.length + 1}: Expansion Phase`,
        target_timeline: `Month ${(phases.length + 1) * 2 - 1} - ${(phases.length + 1) * 2}`,
        description: "",
        key_milestones: "",
      },
    ]);
  };

  const handleRemovePhase = (index: number) => {
    if (phases.length <= 1) return;
    setPhases(phases.filter((_, idx) => idx !== index));
  };

  const handleUpdatePhase = (index: number, field: keyof DeploymentPhaseItem, value: string) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], [field]: value };
    setPhases(updated);
  };

  // Metric operations
  const handleAddMetric = () => {
    setMetrics([
      ...metrics,
      {
        metric_name: "",
        description: "",
        unit: "",
        baseline_value: "0",
        target_value: "0",
        observed_value: "",
        measurement_period: "Monthly",
        measurement_method: "",
        status: "PENDING",
      },
    ]);
  };

  const handleRemoveMetric = (index: number) => {
    if (metrics.length <= 1) return;
    setMetrics(metrics.filter((_, idx) => idx !== index));
  };

  const handleUpdateMetric = (index: number, field: string, value: string) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: value };
    setMetrics(updated);
  };

  const validateAndBuildPayload = (): DeploymentPlanInput | null => {
    setFormError(null);

    if (!title.trim()) {
      setFormError("Plan title is required.");
      return null;
    }
    if (!summary.trim() || summary.trim().length < 20) {
      setFormError("Please provide an executive summary (at least 20 characters).");
      return null;
    }
    if (!deploymentScope.trim() || deploymentScope.trim().length < 20) {
      setFormError("Please detail the scale-up deployment scope (at least 20 characters).");
      return null;
    }
    if (!targetGeography.trim()) {
      setFormError("Target geography (e.g. wards, city zone) is required.");
      return null;
    }
    if (!targetPopulation.trim()) {
      setFormError("Target population demographics are required.");
      return null;
    }
    if (!technicalReadiness.trim() || technicalReadiness.trim().length < 20) {
      setFormError("Please document technical readiness assessment (at least 20 characters).");
      return null;
    }
    if (!operationalReadiness.trim() || operationalReadiness.trim().length < 20) {
      setFormError("Please document operational readiness assessment (at least 20 characters).");
      return null;
    }
    if (!riskManagementPlan.trim() || riskManagementPlan.trim().length < 20) {
      setFormError("Please provide a comprehensive risk management and safety plan (at least 20 characters).");
      return null;
    }
    if (metrics.some((m) => !m.metric_name.trim() || !m.target_value.trim())) {
      setFormError("All impact metrics must have a name and target value.");
      return null;
    }

    return {
      title: title.trim(),
      summary: summary.trim(),
      deployment_scope: deploymentScope.trim(),
      target_geography: targetGeography.trim(),
      target_population: targetPopulation.trim(),
      scale_multiplier: scaleMultiplier.trim(),
      deployment_phases: phases,
      technical_readiness: technicalReadiness.trim(),
      operational_readiness: operationalReadiness.trim(),
      funding_requirements: fundingRequirements.trim() || undefined,
      hardware_requirements: hardwareRequirements.trim() || undefined,
      technology_requirements: technologyRequirements.trim() || undefined,
      human_resource_requirements: humanResourceRequirements.trim() || undefined,
      infrastructure_requirements: infrastructureRequirements.trim() || undefined,
      training_plan: trainingPlan.trim() || undefined,
      maintenance_plan: maintenancePlan.trim() || undefined,
      risk_management_plan: riskManagementPlan.trim(),
      planned_start_date: plannedStartDate,
      planned_end_date: plannedEndDate,
      estimated_duration_days: estimatedDurationDays,
      impact_metrics: metrics.map((m) => ({
        metric_name: m.metric_name.trim(),
        description: m.description?.trim() || undefined,
        unit: m.unit?.trim() || undefined,
        baseline_value: m.baseline_value.trim(),
        target_value: m.target_value.trim(),
        observed_value: m.observed_value?.trim() || "",
        measurement_period: m.measurement_period?.trim() || undefined,
        measurement_method: m.measurement_method?.trim() || undefined,
        data_source: m.data_source?.trim() || undefined,
        status: m.status || "PENDING",
        notes: m.notes?.trim() || undefined,
      })),
    };
  };

  const handleSave = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) return;
    try {
      await onSaveDraft(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft.";
      setFormError(msg);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = validateAndBuildPayload();
    if (!payload) return;
    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit deployment plan.";
      setFormError(msg);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmitForm(e);
      }}
      className="space-y-6"
    >
      {formError && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{formError}</p>
        </div>
      )}

      {/* 1. Core Identity & Strategy */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Rocket className="h-3.5 w-3.5 text-primary" />
            1. Scale-up Strategy & Deployment Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Deployment Plan Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. City-wide Edge AI Traffic Sensing & Transit Optimization Scale-up"
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Executive Scale-up Summary <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize the deployment strategy, validated pilot achievements being scaled, and expected civic impact..."
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Deployment Scope Definition <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={deploymentScope}
              onChange={(e) => setDeploymentScope(e.target.value)}
              placeholder="Specify the full operational boundaries, installation volume, sensor count, server cluster configuration, or facility coverage..."
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Target Geography <span className="text-destructive">*</span>
              </Label>
              <Input
                value={targetGeography}
                onChange={(e) => setTargetGeography(e.target.value)}
                placeholder="e.g. Wards 4, 8, 12 & Downtown Metro"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Target Population <span className="text-destructive">*</span>
              </Label>
              <Input
                value={targetPopulation}
                onChange={(e) => setTargetPopulation(e.target.value)}
                placeholder="e.g. 250,000 daily commuters"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Scale Multiplier</Label>
              <Input
                value={scaleMultiplier}
                onChange={(e) => setScaleMultiplier(e.target.value)}
                placeholder="e.g. 10x pilot scope"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Planned Start Date</Label>
              <Input
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Planned End Date</Label>
              <Input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Estimated Duration (Days)</Label>
              <Input
                type="number"
                min={30}
                max={730}
                value={estimatedDurationDays}
                onChange={(e) => setEstimatedDurationDays(parseInt(e.target.value) || 180)}
                className="text-xs font-mono"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Rollout Phases */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            2. Phased Rollout Milestones ({phases.length})
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddPhase}
            className="text-xs h-7 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Phase
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {phases.map((phase, idx) => (
            <div
              key={phase.id || idx}
              className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-mono font-bold">
                  Phase {idx + 1}
                </Badge>
                {phases.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePhase(idx)}
                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Phase Name</Label>
                  <Input
                    value={phase.phase_name}
                    onChange={(e) => handleUpdatePhase(idx, "phase_name", e.target.value)}
                    placeholder="e.g. Phase 1: Core Ward Sensor Network"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Target Timeline</Label>
                  <Input
                    value={phase.target_timeline}
                    onChange={(e) => handleUpdatePhase(idx, "target_timeline", e.target.value)}
                    placeholder="e.g. Month 1 - 2"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Phase Description</Label>
                <Textarea
                  value={phase.description}
                  onChange={(e) => handleUpdatePhase(idx, "description", e.target.value)}
                  placeholder="Describe operational goals and target deliverables for this phase..."
                  rows={2}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Key Milestones & Deliverables</Label>
                <Input
                  value={phase.key_milestones}
                  onChange={(e) => handleUpdatePhase(idx, "key_milestones", e.target.value)}
                  placeholder="e.g. 50 hardware nodes mounted, calibration completed, initial baseline sync"
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Technical & Operational Readiness Assessments */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            3. Readiness Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Technical Readiness Assessment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={technicalReadiness}
              onChange={(e) => setTechnicalReadiness(e.target.value)}
              placeholder="Detail technical stability, software release version, edge firmware maturity, and known algorithmic boundaries..."
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Operational Readiness Assessment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={operationalReadiness}
              onChange={(e) => setOperationalReadiness(e.target.value)}
              placeholder="Detail site accessibility, municipal permits, utility power access, and field deployment logistics..."
              rows={3}
              className="text-xs"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Resource & Support Prerequisites */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-primary" />
            4. Resource Prerequisites & Maintenance Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Funding & Budget Plan</Label>
              <Textarea
                value={fundingRequirements}
                onChange={(e) => setFundingRequirements(e.target.value)}
                placeholder="Grant funding sources, municipal co-sponsorship, or partner funding allocations..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Hardware & Edge Specs</Label>
              <Textarea
                value={hardwareRequirements}
                onChange={(e) => setHardwareRequirements(e.target.value)}
                placeholder="Hardware bill of materials, edge processing units, sensors, and gateway modules..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Software Stack & Technology Specifications</Label>
              <Textarea
                value={technologyRequirements}
                onChange={(e) => setTechnologyRequirements(e.target.value)}
                placeholder="Cloud architecture, container images, API connectors, streaming message brokers..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Human Resources & Personnel</Label>
              <Textarea
                value={humanResourceRequirements}
                onChange={(e) => setHumanResourceRequirements(e.target.value)}
                placeholder="Field engineers, data scientists, research fellows, and municipal technician staffing..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Infrastructure Requirements</Label>
              <Textarea
                value={infrastructureRequirements}
                onChange={(e) => setInfrastructureRequirements(e.target.value)}
                placeholder="Mounting structures, cellular connectivity, cloud ingestion servers, and security firewalls..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Operator Training & Onboarding Plan</Label>
              <Textarea
                value={trainingPlan}
                onChange={(e) => setTrainingPlan(e.target.value)}
                placeholder="Training manuals, dashboard walkthroughs, and emergency procedures for city operators..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Maintenance & Long-Term SLA Plan</Label>
              <Textarea
                value={maintenancePlan}
                onChange={(e) => setMaintenancePlan(e.target.value)}
                placeholder="Periodic maintenance schedules, battery replacement intervals, sensor recalibration, and remote monitoring..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Risk Management & Safety */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            5. Large-Scale Risk Management & Safety Plan <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-xs">
          <Textarea
            value={riskManagementPlan}
            onChange={(e) => setRiskManagementPlan(e.target.value)}
            placeholder="Document known risks, failure modes, data privacy considerations, citizen safety protocols, and contingency procedures..."
            rows={4}
            className="text-xs"
            required
          />
        </CardContent>
      </Card>

      {/* 6. Long-term Impact Metrics Builder */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            6. Long-term Impact Metrics & Measurement Plan ({metrics.length})
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddMetric}
            className="text-xs h-7 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Impact Metric
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">
                  Impact Metric #{idx + 1}
                </span>
                {metrics.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMetric(idx)}
                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-foreground">
                    Metric Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={metric.metric_name}
                    onChange={(e) => handleUpdateMetric(idx, "metric_name", e.target.value)}
                    placeholder="e.g. Energy Consumption Reduction / Citizen Service Latency"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Unit</Label>
                  <Input
                    value={metric.unit || ""}
                    onChange={(e) => handleUpdateMetric(idx, "unit", e.target.value)}
                    placeholder="e.g. %, kWh, mins, kg"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">
                    Baseline Value <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={metric.baseline_value}
                    onChange={(e) => handleUpdateMetric(idx, "baseline_value", e.target.value)}
                    placeholder="e.g. 0% / 45 mins"
                    className="text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">
                    Target Value (Scale-up) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={metric.target_value}
                    onChange={(e) => handleUpdateMetric(idx, "target_value", e.target.value)}
                    placeholder="e.g. 75% / 10 mins"
                    className="text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Measurement Cadence</Label>
                  <Input
                    value={metric.measurement_period || ""}
                    onChange={(e) => handleUpdateMetric(idx, "measurement_period", e.target.value)}
                    placeholder="e.g. Monthly / Quarterly"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Measurement Methodology</Label>
                  <Input
                    value={metric.measurement_method || ""}
                    onChange={(e) => handleUpdateMetric(idx, "measurement_method", e.target.value)}
                    placeholder="e.g. Automated server telemetry & ground surveys"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Description / Notes</Label>
                  <Input
                    value={metric.description || ""}
                    onChange={(e) => handleUpdateMetric(idx, "description", e.target.value)}
                    placeholder="Key impact context and calculation formula"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-card border border-border/60">
        <div>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-xs"
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving || isSubmitting}
            className="text-xs gap-1.5"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSaving || isSubmitting}
            className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Submit Scale-up Plan for Authorization
          </Button>
        </div>
      </div>
    </form>
  );
}
