import {
  Building2,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityOverviewProps {
  institution: InstitutionLifecycleTrack;
  problemTitle: string;
}

export function UniversityOverview({
  institution,
  problemTitle,
}: UniversityOverviewProps) {
  const isAccepted = institution.invitationStatus === "ACCEPTED";
  const isApproved = institution.proposalStatus === "APPROVED";
  const hasProposal = Boolean(institution.proposalId);

  return (
    <div className="space-y-6 text-xs">
      {/* 1. QUICK STATUS METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            Invitation
          </span>
          <p
            className={`text-base font-black mt-1 ${
              isAccepted
                ? "text-emerald-700"
                : institution.invitationStatus === "DECLINED"
                ? "text-rose-700"
                : "text-amber-800"
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
          <p className="text-base font-black text-foreground mt-1">
            {institution.projectId ? (institution.projectStatus || "Active") : "Not Started"}
          </p>
          <span className="text-[10px] text-muted-foreground block truncate">
            {institution.projectTitle || "Workspace Pending"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            Research Team
          </span>
          <p className="text-base font-black text-foreground mt-1">
            {institution.teamMembersCount} Members
          </p>
          <span className="text-[10px] text-muted-foreground block truncate">
            Lead: {institution.projectLeadName || "Assigned Coordinator"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            Proposal
          </span>
          <p
            className={`text-base font-black mt-1 ${
              isApproved
                ? "text-emerald-700"
                : institution.proposalStatus === "SUBMITTED"
                ? "text-sky-700"
                : "text-foreground"
            }`}
          >
            {institution.proposalStatus ? `v${institution.proposalVersion} (${institution.proposalStatus})` : "Not Submitted"}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {isApproved ? "Approved Solution" : hasProposal ? "In Governance" : "Awaiting Submission"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
            Help Requests
          </span>
          <p className="text-base font-black text-foreground mt-1">
            0 Open
          </p>
          <span className="text-[10px] text-muted-foreground block">
            No pending blocks
          </span>
        </div>
      </div>

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
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300">
              ✓ Selected
            </div>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300">
              ✓ Invited
            </div>
            <div
              className={`p-2 rounded-xl border ${
                isAccepted
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {isAccepted ? "✓ Accepted" : "Acceptance Pending"}
            </div>
            <div
              className={`p-2 rounded-xl border ${
                institution.projectId
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {institution.projectId ? "✓ Project Active" : "Project Setup"}
            </div>
            <div
              className={`p-2 rounded-xl border ${
                institution.teamMembersCount >= 2
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
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
                  ? "bg-sky-100 text-sky-950 font-bold border-sky-300"
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
        <Card className="border-border bg-gradient-to-br from-teal-50/30 via-background to-background shadow-xs">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700" />
                <h4 className="text-sm font-bold text-foreground">
                  AI Recommendation &amp; Match Alignment on This Problem
                </h4>
              </div>
              <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold">
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
                <span className="text-sm font-black text-teal-900">
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
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                  Key Institutional Strengths
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {institution.matchEvidence.topStrengths.length > 0 ? (
                    institution.matchEvidence.topStrengths.map((str, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded-md bg-white/80 border border-emerald-200 text-[10px] font-semibold text-emerald-950"
                      >
                        {str}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Accredited research infrastructure</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                  Identified Gaps / Co-Development Areas
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {institution.matchEvidence.gaps && institution.matchEvidence.gaps.length > 0 ? (
                    institution.matchEvidence.gaps.map((gap, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 rounded-md bg-white/80 border border-amber-200 text-[10px] font-medium text-amber-950"
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
