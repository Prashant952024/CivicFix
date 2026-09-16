import { useState } from "react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Cpu,
  FileCheck,
  GraduationCap,
  Layers,
  MapPin,
  Repeat,
  Rocket,
  ShieldCheck,
  Tag,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ComplexSolutionKnowledgeBaseRow } from "@/types/database";

interface ComplexSolutionDetailDialogProps {
  solution: ComplexSolutionKnowledgeBaseRow | null;
  open: boolean;
  onClose: () => void;
  onSelectForReuse?: (solution: ComplexSolutionKnowledgeBaseRow) => void;
}

type DetailTab = "overview" | "research" | "validation" | "deployment" | "reusability";

export function ComplexSolutionDetailDialog({
  solution,
  open,
  onClose,
  onSelectForReuse,
}: ComplexSolutionDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  if (!solution) return null;

  const kpiList = Array.isArray(solution.validation_kpis_summary)
    ? (solution.validation_kpis_summary as any[])
    : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl" className="max-w-4xl p-6">
      <div className="space-y-6">
        {/* Header Badges & Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300/40">
              {solution.problem_category}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
              {solution.university_name}
            </span>
            {solution.reuse_count > 0 && (
              <Badge variant="info" className="gap-1 text-[11px]">
                <Repeat className="h-3 w-3" /> {solution.reuse_count} Reuses Recorded
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            {solution.solution_title}
          </h2>
        </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border/60 bg-surface-elevated/40 px-6 overflow-x-auto">
            {[
              { id: "overview", label: "Solution & Prototype", icon: BrainCircuit },
              { id: "research", label: "Research & Methodology", icon: BookOpen },
              { id: "validation", label: "Pilot & Validation", icon: Award },
              { id: "deployment", label: "Deployment & Impact", icon: Rocket },
              { id: "reusability", label: "Reusability & Constraints", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DetailTab)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Problem Context */}
                <div className="rounded-2xl border border-border/70 bg-surface-elevated/50 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Original Problem Statement
                  </h3>
                  <h4 className="text-base font-semibold text-foreground">{solution.problem_title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {solution.problem_statement}
                  </p>
                  {solution.root_cause && (
                    <div className="pt-2 border-t border-border/50 text-xs">
                      <span className="font-semibold text-foreground">Identified Root Cause: </span>
                      <span className="text-muted-foreground">{solution.root_cause}</span>
                    </div>
                  )}
                </div>

                {/* Solution Summary */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Developed Solution & Architecture
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {solution.solution_summary}
                  </p>
                </div>

                {/* Tech Stack & Infrastructure */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 text-emerald-600" /> Technologies Used
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {solution.technologies_used && solution.technologies_used.length > 0 ? (
                        solution.technologies_used.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-lg bg-background px-2 py-0.5 text-xs font-medium text-foreground border border-border/60"
                          >
                            {tech}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">Standard municipal IoT/software stack</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-sky-600" /> Required Infrastructure
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {solution.required_infrastructure && solution.required_infrastructure.length > 0 ? (
                        solution.required_infrastructure.map((inf) => (
                          <span
                            key={inf}
                            className="rounded-lg bg-background px-2 py-0.5 text-xs font-medium text-foreground border border-border/60"
                          >
                            {inf}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">Standard municipal server and field gateways</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "research" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated/50 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <GraduationCap className="h-5 w-5" />
                    <span className="font-semibold text-sm">Institution: {solution.university_name}</span>
                  </div>
                  {solution.research_objective && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Research Objective
                      </h4>
                      <p className="text-sm text-foreground">{solution.research_objective}</p>
                    </div>
                  )}
                </div>

                {solution.methodology && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Methodology & Scientific Rigor
                    </h3>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {solution.methodology}
                    </p>
                  </div>
                )}

                {solution.technical_approach && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Technical Approach & Engineering Design
                    </h3>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {solution.technical_approach}
                    </p>
                  </div>
                )}

                {solution.required_expertise && solution.required_expertise.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Required Subject Matter Expertise
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {solution.required_expertise.map((exp) => (
                        <span
                          key={exp}
                          className="rounded-xl bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "validation" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="text-sm font-semibold text-emerald-950">
                        Final Validation Outcome: {solution.final_validation_outcome?.replace(/_/g, " ") || "Meets Criteria"}
                      </div>
                      <div className="text-xs text-emerald-800/80">
                        Rigorously verified in real-world municipal pilot conditions.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pilot Validation KPI Results
                  </h3>
                  {kpiList.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {kpiList.map((kpi: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-border/70 bg-surface-elevated/40 p-3.5 space-y-1"
                        >
                          <div className="text-xs font-semibold text-foreground">{kpi.metric_name || `KPI #${idx + 1}`}</div>
                          <div className="text-xs text-muted-foreground flex items-center justify-between">
                            <span>Baseline: {kpi.baseline_value || "—"}</span>
                            <span>Target: {kpi.target_value || "—"}</span>
                            <span className="font-semibold text-emerald-700">Observed: {kpi.observed_value || "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Validated in pilot execution with target performance benchmarks met.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "deployment" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated/50 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Large-Scale Deployment Scope & Impact
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {solution.deployment_impact_summary ||
                      "Deployed across target civic wards with longitudinal impact tracking active."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "reusability" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated/50 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-emerald-600" /> Applicable Categories
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {solution.applicable_categories && solution.applicable_categories.length > 0 ? (
                        solution.applicable_categories.map((c) => (
                          <span
                            key={c}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">{solution.problem_category}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-surface-elevated/50 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-amber-600" /> Adaptation Requirements
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {solution.adaptation_requirements ||
                        "Standard configuration and sensor calibration for target local conditions."}
                    </p>
                  </div>
                </div>

                {solution.known_limitations && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
                    <h4 className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" /> Known Limitations & Edge Cases
                    </h4>
                    <p className="text-xs text-amber-900/90 leading-relaxed">
                      {solution.known_limitations}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between border-t border-border/70 bg-surface-elevated/60 p-4 sm:px-6">
            <div className="text-xs text-muted-foreground">
              Knowledge ID: <span className="font-mono">{solution.id.slice(0, 8)}</span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl text-xs">
                Close
              </Button>
              {onSelectForReuse && (
                <Button
                  onClick={() => onSelectForReuse(solution)}
                  className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Repeat className="h-3.5 w-3.5" /> Consider for Reuse / Adaptation
                </Button>
              )}
            </div>
          </div>
        </div>
    </Dialog>
  );
}
