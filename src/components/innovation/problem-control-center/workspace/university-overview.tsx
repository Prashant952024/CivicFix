import {
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  Layers,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";
import type { UniversityWorkspaceTab } from "@/components/innovation/problem-control-center/workspace/university-workspace";

interface UniversityOverviewProps {
  institution: InstitutionLifecycleTrack;
  problemTitle: string;
  onNavigateToTab?: (tab: UniversityWorkspaceTab) => void;
}

export function UniversityOverview({
  institution,
  problemTitle,
  onNavigateToTab,
}: UniversityOverviewProps) {
  const isAccepted = institution.invitationStatus === "ACCEPTED";
  const isApproved = institution.proposalStatus === "APPROVED";
  const currentProposal =
    institution.proposals?.find((p) => p.isCurrent) ||
    institution.proposals?.[0] ||
    null;
  const hasProposal = Boolean(institution.proposalId || currentProposal);

  return (
    <div className="space-y-6 text-xs">
      {/* 1. QUICK STATUS METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            Invitation
          </span>
          <p
            className={`text-base font-extrabold mt-1 ${
              isAccepted
                ? "text-emerald-700 dark:text-emerald-400"
                : institution.invitationStatus === "DECLINED"
                ? "text-rose-700 dark:text-rose-400"
                : "text-amber-800 dark:text-amber-400"
            }`}
          >
            {institution.invitationStatus || "Selected"}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {institution.invitedAt ? new Date(institution.invitedAt).toLocaleDateString() : "Pending"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            Project
          </span>
          <p className="text-base font-extrabold text-foreground mt-1">
            {institution.projectId ? (institution.projectStatus || "Active") : "Not Started"}
          </p>
          <span className="text-[10px] text-muted-foreground block truncate">
            {institution.projectTitle || "Workspace Pending"}
          </span>
        </div>

        <div
          onClick={() => {
            if (onNavigateToTab) {
              onNavigateToTab("team");
            }
          }}
          className={`p-3.5 rounded-2xl border bg-card shadow-xs transition ${
            onNavigateToTab
              ? "cursor-pointer hover:border-primary/60 hover:bg-primary/5 group"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Research Team
            </span>
            {onNavigateToTab && (
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            )}
          </div>
          <p className="text-base font-extrabold text-foreground mt-1">
            {institution.teamMembersCount} Members
          </p>
          <span className="text-[10px] text-muted-foreground block truncate">
            Lead: {institution.projectLeadName || "Assigned Coordinator"}
          </span>
        </div>

        <div
          onClick={() => {
            if (hasProposal && onNavigateToTab) {
              onNavigateToTab("proposal");
            }
          }}
          className={`p-3.5 rounded-2xl border bg-card shadow-xs transition ${
            hasProposal && onNavigateToTab
              ? "cursor-pointer hover:border-primary/60 hover:bg-primary/5 group"
              : "border-border"
          } ${
            isApproved
              ? "border-emerald-300/80 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20"
              : institution.proposalStatus === "SUBMITTED"
              ? "border-sky-300/80 dark:border-sky-800 bg-sky-50/20 dark:bg-sky-950/20"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Proposal
            </span>
            {hasProposal && onNavigateToTab && (
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            )}
          </div>
          <p
            className={`text-base font-extrabold mt-1 ${
              isApproved
                ? "text-emerald-700 dark:text-emerald-400"
                : institution.proposalStatus === "SUBMITTED"
                ? "text-sky-700 dark:text-sky-400"
                : "text-foreground"
            }`}
          >
            {institution.proposalStatus ? `v${institution.proposalVersion} (${institution.proposalStatus})` : "Not Submitted"}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {isApproved ? "Approved Solution ✓" : hasProposal ? "In Governance (View)" : "Awaiting Submission"}
          </span>
        </div>

        <div
          onClick={() => {
            if (onNavigateToTab) {
              onNavigateToTab("help");
            }
          }}
          className={`p-3.5 rounded-2xl border bg-card shadow-xs transition col-span-2 sm:col-span-1 ${
            onNavigateToTab
              ? "cursor-pointer hover:border-primary/60 hover:bg-primary/5 group"
              : "border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Help Requests
            </span>
            {onNavigateToTab && (
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            )}
          </div>
          <p className="text-base font-extrabold text-foreground mt-1">
            0 Open
          </p>
          <span className="text-[10px] text-muted-foreground block">
            No pending blocks
          </span>
        </div>
      </div>

      {/* DEDICATED RESEARCH PROPOSAL & TECHNICAL BLUEPRINT SHOWCASE */}
      {hasProposal && (
        <Card
          className={`border transition-all shadow-xs overflow-hidden ${
            isApproved
              ? "border-emerald-400/80 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/60 via-background to-background dark:from-emerald-950/30 dark:via-background dark:to-background"
              : institution.proposalStatus === "SUBMITTED"
              ? "border-sky-400/80 dark:border-sky-800 bg-gradient-to-br from-sky-50/60 via-background to-background dark:from-sky-950/30 dark:via-background dark:to-background"
              : "border-border bg-card"
          }`}
        >
          <div
            className={`h-1.5 ${
              isApproved
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600"
                : "bg-gradient-to-r from-sky-500 via-indigo-500 to-primary"
            }`}
          />
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-extrabold text-foreground tracking-tight">
                    Research Proposal &amp; Technical Blueprint
                  </h3>
                  <Badge
                    className={
                      isApproved
                        ? "bg-emerald-600 text-white font-bold text-[10px]"
                        : institution.proposalStatus === "SUBMITTED"
                        ? "bg-sky-600 text-white font-bold text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                    }
                  >
                    {isApproved
                      ? "✓ APPROVED RESEARCH SOLUTION"
                      : institution.proposalStatus === "SUBMITTED"
                      ? "SUBMITTED FOR EVALUATION"
                      : institution.proposalStatus || "PROPOSAL ACTIVE"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold bg-card">
                    Version {institution.proposalVersion || currentProposal?.versionNumber || 1}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {institution.institutionName}'s formal technical solution submitted for "{problemTitle}"
                </p>
              </div>

              {onNavigateToTab && (
                <Button
                  size="sm"
                  onClick={() => onNavigateToTab("proposal")}
                  className={`text-xs font-bold gap-1.5 shadow-xs shrink-0 h-9 px-4 ${
                    isApproved
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Full 11-Section Proposal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Project Objective Excerpt */}
            <div className="p-4 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span>Project Objective &amp; Research Solution Scope</span>
              </span>
              <p className="text-foreground font-medium leading-relaxed text-xs">
                {currentProposal?.projectObjective ||
                  "Formal municipal co-development and empirical research proposal tailored to this civic challenge."}
              </p>
            </div>

            {/* Technical Approach Excerpt if present */}
            {currentProposal?.technicalApproach && (
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Technical Approach &amp; Engineering Methodology
                </span>
                <p className="text-muted-foreground leading-relaxed text-xs line-clamp-2">
                  {currentProposal.technicalApproach}
                </p>
              </div>
            )}

            {/* Structured Deliverables and Milestones Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-card border border-border/80">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                  Milestones
                </span>
                <span className="text-xs font-bold text-foreground block mt-0.5">
                  {currentProposal?.milestones?.length || 0} Defined Phases
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card border border-border/80">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                  Deliverables
                </span>
                <span className="text-xs font-bold text-foreground block mt-0.5">
                  {currentProposal?.deliverables?.length || 0} Expected Items
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card border border-border/80">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                  Success Metrics
                </span>
                <span className="text-xs font-bold text-foreground block mt-0.5">
                  {currentProposal?.successMetrics?.length || 0} Target Metrics
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-card border border-border/80">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                  Submission Date
                </span>
                <span className="text-xs font-bold text-foreground block mt-0.5">
                  {institution.proposalSubmittedAt
                    ? new Date(institution.proposalSubmittedAt).toLocaleDateString()
                    : "Recorded"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. LIFECYCLE PROGRESS PIPELINE */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>University Collaboration Lifecycle Stage</span>
            </h4>
            <Badge variant="outline" className="text-[10px] font-bold text-primary">
              Current: {institution.lifecycleLabel}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-[10px] font-semibold">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              ✓ Selected
            </div>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              ✓ Invited
            </div>
            <div
              className={`p-2 rounded-xl border ${
                isAccepted
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {isAccepted ? "✓ Accepted" : "Acceptance Pending"}
            </div>
            <div
              className={`p-2 rounded-xl border ${
                institution.projectId
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {institution.projectId ? "✓ Project Active" : "Project Setup"}
            </div>
            <div
              className={`p-2 rounded-xl border ${
                institution.teamMembersCount >= 2
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {institution.teamMembersCount >= 2 ? `✓ Team (${institution.teamMembersCount})` : "Team Setup"}
            </div>
            <div
              className={`p-2 rounded-xl border ${
                isApproved
                  ? "bg-emerald-600 text-white font-bold border-emerald-700"
                  : hasProposal
                  ? "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-300 font-bold border-sky-300 dark:border-sky-800"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {isApproved ? "Proposal Approved ✓" : hasProposal ? "Proposal Review" : "Proposal Draft"}
            </div>
            <div className="p-2 rounded-xl border border-dashed border-border bg-muted/10 text-muted-foreground/60">
              Prototype — Upcoming
            </div>
            <div className="p-2 rounded-xl border border-dashed border-border bg-muted/10 text-muted-foreground/60">
              Field Pilot — Upcoming
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. MATCH EVIDENCE & WHY RECOMMENDED */}
      {institution.matchEvidence && (
        <Card className="border-border bg-gradient-to-br from-teal-50/30 via-background to-background dark:from-teal-950/20 dark:via-background dark:to-background shadow-xs">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h4 className="text-sm font-bold text-foreground">
                  AI Recommendation &amp; Match Alignment on This Problem
                </h4>
              </div>
              <Badge className="bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800 text-[10px] font-bold">
                Rank #{institution.matchEvidence.rank} · {Math.round(institution.matchEvidence.overallScore * 100)}% Match
              </Badge>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {institution.matchEvidence.whyRecommended ||
                `Strong domain and empirical field readiness match for "${problemTitle}".`}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Overall Score
                </span>
                <span className="text-sm font-black text-teal-900 dark:text-teal-300">
                  {Math.round(institution.matchEvidence.overallScore * 100)}%
                </span>
              </div>
              <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Structured Fit
                </span>
                <span className="text-sm font-black text-foreground">
                  {Math.round(institution.matchEvidence.structuredScore * 100)}%
                </span>
              </div>
              <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  AI Semantic Score
                </span>
                <span className="text-sm font-black text-foreground">
                  {Math.round(institution.matchEvidence.aiSemanticScore * 100)}%
                </span>
              </div>
              <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Recommended Role
                </span>
                <span className="text-xs font-bold text-primary truncate block mt-0.5">
                  {institution.matchEvidence.recommendedRole || "Primary Partner"}
                </span>
              </div>
            </div>

            {/* Strengths & Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                  Key Institutional Strengths
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {institution.matchEvidence.topStrengths.length > 0 ? (
                    institution.matchEvidence.topStrengths.map((str, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded-md bg-white/80 dark:bg-card border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold text-emerald-950 dark:text-emerald-300"
                      >
                        {str}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Accredited research infrastructure</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                  Identified Gaps / Co-Development Areas
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {institution.matchEvidence.gaps && institution.matchEvidence.gaps.length > 0 ? (
                    institution.matchEvidence.gaps.map((gap, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded-md bg-white/80 dark:bg-card border border-amber-200 dark:border-amber-800 text-[10px] font-medium text-amber-950 dark:text-amber-300"
                      >
                        {gap}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No significant capability deficiencies noted.</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. INSTITUTION PROFILE & CAPABILITIES */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Institutional Capabilities &amp; Infrastructure</span>
            </h4>
            {institution.websiteUrl && (
              <a
                href={institution.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Official Website</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Research Domains
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {institution.researchDomains.length > 0 ? (
                  institution.researchDomains.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-[9px]">
                      {d}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">Multi-disciplinary Engineering</span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Laboratories &amp; Facilities
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {institution.facilities.length > 0 ? (
                  institution.facilities.map((f, i) => (
                    <Badge key={i} variant="info" className="text-[9px]">
                      {f}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">Advanced Testing Laboratories</span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Specializations
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {institution.specializations.length > 0 ? (
                  institution.specializations.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[9px]">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">Empirical Field Validation</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
