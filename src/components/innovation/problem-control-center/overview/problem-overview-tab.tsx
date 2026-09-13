import { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Layers,
  Lightbulb,
  Maximize2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCitizenIssueImageUrl } from "@/lib/citizen-issues";
import type { ProblemControlCenterData } from "@/lib/innovation";

interface ProblemOverviewTabProps {
  problem: ProblemControlCenterData["problem"];
  stats: ProblemControlCenterData["stats"];
  pipeline: ProblemControlCenterData["pipeline"];
  onSelectTab: (tabKey: string, filter?: string) => void;
  onPreviewImage: (url: string) => void;
}

export function ProblemOverviewTab({
  problem,
  stats,
  pipeline,
  onSelectTab,
  onPreviewImage,
}: ProblemOverviewTabProps) {
  const [showAiDiagnostics, setShowAiDiagnostics] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. PROBLEM-LEVEL KPI METRICS STRIP */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Problem Impact &amp; Operational Metrics
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Click metric card to jump to section
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Complexity
            </span>
            <p className="text-xl font-black text-amber-900 mt-0.5">
              {stats.complexityScore}/100
            </p>
            <span className="text-[9px] text-muted-foreground block">Systemic</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab("universities", "ALL")}
            className="p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition shadow-xs text-center"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Selected
            </span>
            <p className="text-xl font-black text-foreground mt-0.5">
              {stats.institutionsSelectedCount}
            </p>
            <span className="text-[9px] text-muted-foreground block">Institutions</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("universities", "INVITED")}
            className="p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition shadow-xs text-center"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Invited
            </span>
            <p className="text-xl font-black text-foreground mt-0.5">
              {stats.invitationsSentCount}
            </p>
            <span className="text-[9px] text-muted-foreground block">Dispatched</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("universities", "ACCEPTED")}
            className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 cursor-pointer transition shadow-xs text-center"
          >
            <span className="text-[10px] font-bold text-emerald-950 uppercase block">
              Accepted
            </span>
            <p className="text-xl font-black text-emerald-900 mt-0.5">
              {stats.institutionsAcceptedCount}
            </p>
            <span className="text-[9px] text-emerald-700 font-semibold block">Confirmed</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("universities", "ALL")}
            className="p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition shadow-xs text-center"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Workspaces
            </span>
            <p className="text-xl font-black text-foreground mt-0.5">
              {stats.projectsActiveCount}
            </p>
            <span className="text-[9px] text-muted-foreground block">Projects</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("universities", "ALL")}
            className="p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/30 cursor-pointer transition shadow-xs text-center"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Teams
            </span>
            <p className="text-xl font-black text-foreground mt-0.5">
              {stats.teamsFormedCount}
            </p>
            <span className="text-[9px] text-muted-foreground block">Staffed</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("proposals")}
            className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-xs text-center ${
              stats.proposalsAwaitingReviewCount > 0
                ? "border-sky-400 bg-sky-50/80"
                : "border-border bg-card hover:bg-muted/30"
            }`}
          >
            <span className="text-[10px] font-bold text-sky-950 uppercase block">
              Proposals
            </span>
            <p className="text-xl font-black text-sky-900 mt-0.5">
              {stats.proposalsCount}
            </p>
            <span className="text-[9px] text-sky-800 font-semibold block">
              {stats.proposalsAwaitingReviewCount} review
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("proposals")}
            className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/60 cursor-pointer transition shadow-xs text-center"
          >
            <span className="text-[10px] font-bold text-emerald-950 uppercase block">
              Approved
            </span>
            <p className="text-xl font-black text-emerald-900 mt-0.5">
              {stats.proposalsApprovedCount}
            </p>
            <span className="text-[9px] text-emerald-700 font-bold block">Solutions</span>
          </button>
        </div>
      </section>

      {/* 2. 10-STAGE INNOVATION LIFECYCLE PROGRESS PIPELINE */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>10-Stage Pipeline Lifecycle Tracker</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            End-to-end municipal state machine from citizen grievance to approved institutional solution
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3 overflow-x-auto">
          <div className="grid grid-cols-5 lg:grid-cols-10 gap-2 min-w-[840px] lg:min-w-0">
            {pipeline.map((stage) => {
              const isCompleted = stage.status === "COMPLETED";
              const isInProgress = stage.status === "IN_PROGRESS";
              const isFuture = stage.status === "FUTURE";

              let borderClass = "border-border bg-muted/20 text-muted-foreground";

              if (isCompleted) {
                borderClass = "border-emerald-300 bg-emerald-50/60 text-emerald-900";
              } else if (isInProgress) {
                borderClass = "border-sky-400 bg-sky-50/80 text-sky-950 shadow-xs ring-1 ring-sky-300";
              } else if (isFuture) {
                borderClass = "border-dashed border-border/80 bg-muted/10 text-muted-foreground/60";
              }

              return (
                <div
                  key={stage.key}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${borderClass}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold">
                      #{stage.stepNumber}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : isInProgress ? (
                      <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping" />
                    ) : isFuture ? (
                      <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">
                        Future
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-bold leading-tight line-clamp-2">
                      {stage.label}
                    </p>
                    <p className="text-[9px] opacity-75 mt-0.5 line-clamp-2">
                      {stage.description}
                    </p>
                  </div>

                  <div className="mt-2 pt-1 border-t border-black/5 dark:border-white/5">
                    <span className="text-[9px] font-semibold block">
                      {isCompleted
                        ? "Completed ✓"
                        : isInProgress
                        ? "Active Stage ★"
                        : isFuture
                        ? "Future Phase"
                        : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SUMMARY & CITIZEN EVIDENCE */}
      <section className="space-y-3">
        <Card className="border-border/90 bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/70 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Problem Context &amp; Multi-Disciplinary Scope</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Grievance details, administrative root cause, and AI multi-disciplinary diagnostics
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAiDiagnostics(!showAiDiagnostics)}
              className="text-xs gap-1 text-primary"
            >
              <span>{showAiDiagnostics ? "Collapse AI Diagnostics" : "Expand AI Diagnostics"}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showAiDiagnostics ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-4">
            {/* Citizen Grievance Statement */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Citizen Grievance &amp; Background
              </span>
              <p className="text-xs sm:text-sm text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70 whitespace-pre-line">
                {problem.description}
              </p>
            </div>

            {/* Photos & Evidence Lightbox */}
            {problem.images.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Ground Evidence &amp; Citizen Photos ({problem.images.length})
                </span>
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  {problem.images.map((img) => {
                    const imgUrl = formatCitizenIssueImageUrl(img);
                    if (!imgUrl) return null;
                    return (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => onPreviewImage(imgUrl)}
                        className="relative w-28 h-20 rounded-xl overflow-hidden border border-border/80 cursor-pointer group shrink-0"
                      >
                        <img
                          src={imgUrl}
                          alt="Citizen ground evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Approved Root Cause & Scope Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Approved Root Cause
                </span>
                <p className="font-semibold text-foreground">
                  {problem.approvedRootCause ||
                    "Multi-systemic failure requiring scientific and technological intervention."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Why Complex
                </span>
                <p className="font-semibold text-foreground">
                  {problem.whyComplex ||
                    "Transfers across departmental jurisdictions; lacks standard municipal operational procedure."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Required Expertise
                </span>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {problem.requiredExpertise.length > 0 ? (
                    problem.requiredExpertise.map((exp, idx) => (
                      <Badge key={idx} variant="info" className="text-[9px]">
                        {exp}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Hydrology, Agronomy, IoT, AI</span>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible AI Diagnostics Body */}
            {showAiDiagnostics && (
              <div className="mt-4 pt-4 border-t border-border/70 space-y-4 animate-in fade-in-50 duration-200">
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-teal-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-950">
                        AI Diagnostic Complexity Assessment
                      </span>
                    </div>
                    <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-[10px]">
                      AI Recommendation (Advisory)
                    </Badge>
                  </div>

                  <p className="text-xs text-teal-900 leading-relaxed">
                    {problem.aiSummary ||
                      "This issue has been scored as high-complexity because conventional departmental routines cannot remediate the systemic underlying drivers. Inter-disciplinary engineering, data telemetry, and empirical pilots are required."}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-teal-200/80">
                      <span className="text-[10px] font-bold text-teal-900 uppercase block">
                        Complexity Score
                      </span>
                      <span className="text-base font-black text-teal-950">
                        {stats.complexityScore}/100
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-teal-200/80">
                      <span className="text-[10px] font-bold text-teal-900 uppercase block">
                        Affected Scope
                      </span>
                      <span className="text-sm font-bold text-teal-950">
                        {problem.geographicScope}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-teal-200/80">
                      <span className="text-[10px] font-bold text-teal-900 uppercase block">
                        Standard SOP
                      </span>
                      <span className="text-sm font-bold text-rose-700">
                        Unavailable
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-teal-200/80">
                      <span className="text-[10px] font-bold text-teal-900 uppercase block">
                        Solution Approach
                      </span>
                      <span className="text-sm font-bold text-teal-950">
                        Open Innovation
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
