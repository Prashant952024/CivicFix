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
  const [showAiDiagnostics, setShowAiDiagnostics] = useState(false);

  return (
    <Card className="border-border/90 bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Problem Overview &amp; Multi-Disciplinary Scope</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Citizen grievance details, approved root cause, and multi-disciplinary diagnostic analysis
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAiDiagnostics(!showAiDiagnostics)}
          className="text-xs gap-1 text-primary"
        >
          <span>{showAiDiagnostics ? "Collapse AI Analysis" : "View AI Analysis"}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              showAiDiagnostics ? "rotate-180" : ""
            }`}
          />
        </Button>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Problem Statement & Citizen Background */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Citizen Grievance &amp; Field Problem Statement
          </span>
          <p className="text-xs sm:text-sm text-foreground leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/70 whitespace-pre-line">
            {problem.description}
          </p>
        </div>

        {/* Evidence Photos */}
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

        {/* 3-Column Root Cause & Scope Details */}
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

        {/* AI Analysis (Explicitly Identified as Advisory Recommendation) */}
        {showAiDiagnostics && (
          <div className="mt-4 pt-4 border-t border-border/70 space-y-3 animate-in fade-in-50 duration-200">
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-950">
                    AI Diagnostic Classification Analysis
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold">
                    Advisory Recommendation
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Admin Final Authority</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-teal-900 leading-relaxed">
                {problem.aiSummary ||
                  "This issue has been evaluated as high-complexity because conventional departmental routines cannot remediate systemic underlying causes. Multi-disciplinary research and university innovation co-development are advised."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="bg-white/85 p-2.5 rounded-lg border border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-900 uppercase block">
                    Complexity Score
                  </span>
                  <span className="text-base font-black text-teal-950">
                    {stats.complexityScore}/100
                  </span>
                </div>

                <div className="bg-white/85 p-2.5 rounded-lg border border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-900 uppercase block">
                    Confidence
                  </span>
                  <span className="text-sm font-bold text-teal-950 font-mono">
                    {problem.complexityConfidence !== null
                      ? `${Math.round(problem.complexityConfidence * 100)}%`
                      : "85%"}
                  </span>
                </div>

                <div className="bg-white/85 p-2.5 rounded-lg border border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-900 uppercase block">
                    Standard SOP
                  </span>
                  <span className="text-sm font-bold text-rose-700">
                    Unavailable
                  </span>
                </div>

                <div className="bg-white/85 p-2.5 rounded-lg border border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-900 uppercase block">
                    Approach
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
  );
}
