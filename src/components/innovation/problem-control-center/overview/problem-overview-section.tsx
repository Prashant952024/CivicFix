import { useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  Lightbulb,
  Maximize2,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCitizenIssueImageUrl } from "@/lib/citizen-issues";
import type { ProblemControlCenterData } from "@/lib/innovation";

interface ProblemOverviewSectionProps {
  problem: ProblemControlCenterData["problem"];
  stats: ProblemControlCenterData["stats"];
  onPreviewImage: (url: string) => void;
}

export function ProblemOverviewSection({
  problem,
  stats,
  onPreviewImage,
}: ProblemOverviewSectionProps) {
  const [showAiDiagnostics, setShowAiDiagnostics] = useState(true);

  return (
    <div className="space-y-6">
      {/* 2-COLUMN MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): CIVIC GROUND TRUTH */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Ground Problem Grievance */}
          <Card className="border-border/90 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <span>Civic Ground Truth &amp; Field Problem Statement</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Original citizen grievance, location context, and field observations
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              {/* Problem Description in Prose */}
              <div className="space-y-1.5">
                <span className="text-stat-label block">
                  Field Grievance Statement
                </span>
                <div className="text-prose-body bg-muted/20 p-4 rounded-xl border border-border/70 whitespace-pre-line">
                  {problem.description}
                </div>
              </div>

              {/* Photos & Ground Evidence Gallery */}
              {problem.images.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-stat-label block">
                    Citizen Ground Evidence ({problem.images.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {problem.images.map((img) => {
                      const imgUrl = formatCitizenIssueImageUrl(img);
                      if (!imgUrl) return null;
                      return (
                        <button
                          type="button"
                          key={img.id}
                          onClick={() => onPreviewImage(imgUrl)}
                          className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/80 cursor-pointer group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Enlarge citizen evidence photo"
                        >
                          <img
                            src={imgUrl}
                            alt="Citizen ground evidence"
                            className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" aria-hidden="true" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Clustered Citizen Grievances (if present) */}
          {problem.linkedReports && problem.linkedReports.length > 0 && (
            <Card className="border-sky-200/90 bg-sky-50/30 shadow-xs">
              <CardHeader className="pb-3 border-b border-sky-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white text-[10px] font-bold">
                      {problem.linkedReports.length}
                    </span>
                    <CardTitle className="text-sm sm:text-base font-bold text-sky-950">
                      Clustered Citizen Grievance Reports
                    </CardTitle>
                  </div>
                  <Badge variant="research" size="sm">
                    {problem.linkedReports.length} Canonical Cluster
                  </Badge>
                </div>
                <p className="text-xs text-sky-900/80 mt-1">
                  Multiple citizens have independently reported this systemic issue across the municipal area.
                </p>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {problem.linkedReports.map((child, cIdx) => (
                    <div
                      key={child.id}
                      className="rounded-xl border border-sky-200/80 bg-white/95 p-3 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground truncate max-w-[150px]">
                          {child.reporterName || `Citizen #${cIdx + 1}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{child.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">
                        {child.description || child.title}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): AI & ADMINISTRATIVE SCOPE */}
        <div className="lg:col-span-5 space-y-6">
          {/* Diagnostic Root Cause & Multi-Disciplinary Scope */}
          <Card className="border-border/90 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-base font-bold text-foreground">
                Administrative Scope &amp; Complexity
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Approved root cause analysis and specialized domain requirements
              </p>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <span className="text-stat-label block">
                  Approved Root Cause
                </span>
                <p className="font-semibold text-foreground leading-relaxed">
                  {problem.approvedRootCause ||
                    "Multi-systemic failure requiring scientific and technological intervention."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                <span className="text-stat-label block">
                  Why Complex
                </span>
                <p className="font-semibold text-foreground leading-relaxed">
                  {problem.whyComplex ||
                    "Transfers across departmental jurisdictions; lacks standard municipal operational procedure."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                <span className="text-stat-label block">
                  Required Multi-Disciplinary Expertise
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {problem.requiredExpertise.length > 0 ? (
                    problem.requiredExpertise.map((exp, idx) => (
                      <Badge key={idx} variant="research" size="sm">
                        {exp}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Hydrology, Agronomy, IoT, AI</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Diagnostic Assessment Card */}
          <Card className="border-indigo-200/80 bg-indigo-50/25 shadow-xs">
            <CardHeader className="pb-3 border-b border-indigo-200/60 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-700" aria-hidden="true" />
                <CardTitle className="text-sm sm:text-base font-bold text-indigo-950">
                  AI Diagnostic Advisory
                </CardTitle>
              </div>

              <Badge variant="innovation" size="sm">
                Advisory Only
              </Badge>
            </CardHeader>

            <CardContent className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Human Admin Retains Authority</span>
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowAiDiagnostics(!showAiDiagnostics)}
                  className="text-indigo-700 hover:text-indigo-900 gap-1 h-6 px-2"
                >
                  <span>{showAiDiagnostics ? "Hide Details" : "Show Details"}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showAiDiagnostics ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </Button>
              </div>

              {showAiDiagnostics && (
                <div className="space-y-3 pt-1 animate-in fade-in-50 duration-200">
                  <p className="text-xs text-indigo-950/90 leading-relaxed bg-white/70 p-3 rounded-xl border border-indigo-200/60">
                    {problem.aiSummary ||
                      "This issue has been evaluated as high-complexity because conventional departmental routines cannot remediate systemic underlying causes. Multi-disciplinary research and university innovation co-development are advised."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                        Complexity Score
                      </span>
                      <span className="text-base font-black text-indigo-950 tabular-nums">
                        {stats.complexityScore}/100
                      </span>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                        AI Confidence
                      </span>
                      <span className="text-sm font-bold text-indigo-950 font-mono">
                        {problem.complexityConfidence !== null
                          ? `${Math.round(problem.complexityConfidence * 100)}%`
                          : "85%"}
                      </span>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                        Standard SOP
                      </span>
                      <span className="text-xs font-bold text-rose-700 block mt-0.5">
                        Unavailable
                      </span>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                        Methodology
                      </span>
                      <span className="text-xs font-bold text-indigo-950 block mt-0.5 truncate">
                        Open Innovation
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
