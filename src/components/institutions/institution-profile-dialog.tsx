import { useEffect, useState } from "react";
import {
  Award,
  Building2,
  ExternalLink,
  FlaskConical,
  Mail,
  MapPin,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchInstitutionFullProfile,
  getVerificationStatusBadge,
  type InstitutionCivicFixEngagement,
  type InstitutionMemberWithProfile,
} from "@/lib/institutions";
import type { InstitutionProjectRow, InstitutionRow } from "@/types/database";

export interface ContextualProblemCollaboration {
  problemId?: string;
  problemTitle?: string;
  matchScore?: number;
  invitationStatus?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  projectStatus?: string | null;
  projectLeadName?: string | null;
  projectLeadEmail?: string | null;
  teamMembersCount?: number;
  teamMembers?: Array<{
    id: string;
    memberName: string;
    role: string;
    designation?: string | null;
  }>;
  proposalId?: string | null;
  proposalVersion?: number | null;
  proposalStatus?: string | null;
  proposalSubmittedAt?: string | null;
}

export interface InstitutionProfileDialogProps {
  institutionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  contextualProblem?: ContextualProblemCollaboration;
}

export function InstitutionProfileDialog({
  institutionId,
  isOpen,
  onClose,
  contextualProblem,
}: InstitutionProfileDialogProps) {
  const navigate = useNavigate();
  const { roleCode } = useAppSession();
  const isAdmin = roleCode === "ADMIN";

  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [projects, setProjects] = useState<InstitutionProjectRow[]>([]);
  const [members, setMembers] = useState<InstitutionMemberWithProfile[]>([]);
  const [engagements, setEngagements] = useState<InstitutionCivicFixEngagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "labs" | "engagements" | "faculty" | "portfolio">("overview");

  useEffect(() => {
    if (!isOpen || !institutionId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchInstitutionFullProfile(institutionId!);
        if (cancelled) return;
        setInstitution(data.institution);
        setProjects(data.projects);
        setMembers(data.members);
        setEngagements(data.engagements);
      } catch (err) {
        console.error("Failed to load institution profile:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, institutionId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !institutionId) return null;

  const statusBadge = institution ? getVerificationStatusBadge(institution.verification_status) : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl bg-card border-l border-border h-full overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* TOP HEADER */}
        <div className="p-6 border-b border-border sticky top-0 bg-card/95 backdrop-blur-md z-10 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs ring-2 ring-teal-600/20">
                {institution ? (institution.acronym || institution.name.slice(0, 2).toUpperCase()) : "IN"}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                    {institution?.institution_type || "Institution Profile"}
                  </span>
                  {statusBadge && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  )}
                  {institution?.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground border-border">
                      Inactive
                    </Badge>
                  )}
                </div>

                <h2 className="text-xl font-bold text-foreground truncate">
                  {institution?.name || "Institution Profile"}
                </h2>

                {institution?.official_name && institution.official_name !== institution.name && (
                  <p className="text-xs font-medium text-muted-foreground line-clamp-1">{institution.official_name}</p>
                )}

                <div className="flex items-center gap-3.5 text-xs text-muted-foreground flex-wrap pt-0.5 font-medium">
                  <span className="flex items-center gap-1 text-foreground font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {institution?.city}, {institution?.state}
                  </span>

                  {institution?.website && (
                    <a
                      href={
                        institution.website.startsWith("http")
                          ? institution.website
                          : `https://${institution.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary font-bold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Official Website
                    </a>
                  )}

                  {institution?.nirf_rank && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200 shadow-2xs">
                      <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> NIRF #{institution.nirf_rank}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-xl"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* TAB BAR */}
          <div className="flex items-center gap-1 border-b border-border -mb-4 pt-1 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
              }`}
            >
              Overview &amp; Capabilities
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("labs")}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "labs"
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
              }`}
            >
              Laboratories ({institution?.laboratories?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("engagements")}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "engagements"
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
              }`}
            >
              CivicFix Engagements ({engagements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("faculty")}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "faculty"
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
              }`}
            >
              Faculty &amp; Leads ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("portfolio")}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "portfolio"
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
              }`}
            >
              Past Projects ({projects.length})
            </button>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
              <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />
              <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            </div>
          ) : !institution ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm font-bold text-foreground">Institution not found</p>
              <p className="text-xs text-muted-foreground">The requested institution records could not be retrieved.</p>
            </div>
          ) : (
            <>
              {/* CONTEXTUAL PROBLEM COLLABORATION BANNER */}
              {contextualProblem && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-amber-950 dark:text-amber-200 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Current Problem Collaboration
                      </span>
                    </div>

                    {contextualProblem.matchScore !== undefined && (
                      <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        Match: {contextualProblem.matchScore}%
                      </span>
                    )}
                  </div>

                  {contextualProblem.problemTitle && (
                    <div>
                      <p className="text-xs text-amber-900 dark:text-amber-300 font-semibold">Assigned Complex Problem:</p>
                      <p className="text-sm font-bold text-foreground leading-snug mt-0.5">{contextualProblem.problemTitle}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Invitation Status</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 mt-1">
                        {contextualProblem.invitationStatus || "None"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Workspace</span>
                      <span className="font-bold text-foreground truncate block mt-1">
                        {contextualProblem.projectStatus || "Not Created"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Research Team</span>
                      <span className="font-bold text-foreground block mt-1">
                        {contextualProblem.teamMembersCount || 0} Members
                      </span>
                    </div>
                  </div>

                  {contextualProblem.proposalId && (
                    <div className="pt-2.5 border-t border-border flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Proposal v{contextualProblem.proposalVersion || 1}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Status: {contextualProblem.proposalStatus}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          onClose();
                          void navigate(`/app/innovation/proposals/${contextualProblem.proposalId}`);
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs h-8 px-3.5 rounded-xl shadow-xs"
                      >
                        Review Proposal →
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 1: OVERVIEW & CAPABILITIES */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Description */}
                  {institution.description && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About</h3>
                      <p className="text-xs leading-relaxed text-foreground font-normal whitespace-pre-line">
                        {institution.description}
                      </p>
                    </div>
                  )}

                  {/* Research Domains */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      Core Research Domains
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {institution.research_domains?.length > 0 ? (
                        institution.research_domains.map((dom, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 shadow-2xs"
                          >
                            {dom}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">General Science &amp; Technology</span>
                      )}
                    </div>
                  </div>

                  {/* Areas of Expertise */}
                  {institution.areas_of_expertise?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Areas of Technical Expertise
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {institution.areas_of_expertise.map((exp, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-muted px-3 py-1 text-xs font-semibold text-foreground border border-border shadow-2xs"
                          >
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technologies */}
                  {institution.technologies?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Technologies &amp; Methodologies
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {institution.technologies.map((tech, i) => (
                          <span
                            key={i}
                            className="text-xs px-3 py-1 rounded-lg bg-muted border border-border text-foreground font-semibold shadow-2xs"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Field & Collaboration Capabilities */}
                  {institution.field_capabilities?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Field Testing &amp; Pilot Capabilities
                      </h3>
                      <ul className="text-xs text-foreground space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                        {institution.field_capabilities.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Institutional Specs */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Accreditation &amp; Governance
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Established</span>
                        <span className="font-black text-foreground text-sm mt-0.5 block">
                          {institution.established_year || "N/A"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">NAAC Grade</span>
                        <span className="font-black text-foreground text-sm mt-0.5 block">
                          {institution.naac_grade || "N/A"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">NIRF Rank</span>
                        <span className="font-black text-foreground text-sm mt-0.5 block">
                          {institution.nirf_rank ? `#${institution.nirf_rank}` : "N/A"}
                        </span>
                      </div>
                      <div className="col-span-2 p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Official Email</span>
                        <span className="font-bold text-foreground text-xs truncate block mt-0.5">
                          {institution.official_email || "N/A"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Phone</span>
                        <span className="font-bold text-foreground text-xs truncate block mt-0.5">
                          {institution.phone || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LABORATORIES & INFRASTRUCTURE */}
              {activeTab === "labs" && (
                <div className="space-y-6">
                  {/* Laboratories */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      Specialized Laboratories ({institution.laboratories?.length || 0})
                    </h3>
                    {institution.laboratories?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {institution.laboratories.map((lab, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center gap-2.5"
                          >
                            <FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="text-xs font-bold text-foreground">{lab}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground font-medium">No specific laboratories registered.</p>
                    )}
                  </div>

                  {/* Facilities */}
                  {institution.facilities?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        Infrastructure &amp; Testing Facilities
                      </h3>
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border shadow-2xs">
                        <p className="text-xs text-foreground font-medium leading-relaxed">
                          {institution.facilities.join(" · ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {institution.equipment?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        Key Technical Equipment
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {institution.equipment.map((eq, i) => (
                          <span
                            key={i}
                            className="text-xs px-3 py-1 rounded-lg bg-muted border border-border text-foreground font-semibold shadow-2xs"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CIVICFIX ENGAGEMENTS */}
              {activeTab === "engagements" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Civic Problem Collaboration History ({engagements.length})
                    </h3>
                  </div>

                  {engagements.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-1.5">
                      <p className="text-xs font-bold text-foreground">No CivicFix Engagements Yet</p>
                      <p className="text-xs text-muted-foreground">
                        This institution has not yet been selected or invited to any complex civic innovation problems.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {engagements.map((eng) => (
                        <div
                          key={eng.challengeId}
                          className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground leading-snug">{eng.challengeTitle}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {eng.selectionSource && (
                                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                                    Source: {eng.selectionSource}
                                  </span>
                                )}
                                {eng.invitationStatus && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                      eng.invitationStatus === "ACCEPTED"
                                        ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                                        : "bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                                    }`}
                                  >
                                    Invite: {eng.invitationStatus}
                                  </span>
                                )}
                                {eng.projectStatus && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                    Project: {eng.projectStatus}
                                  </span>
                                )}
                                {eng.latestProposalStatus && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                      eng.latestProposalStatus === "APPROVED"
                                        ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                                        : "bg-sky-100 dark:bg-sky-950/70 text-sky-950 dark:text-sky-200 border-sky-300 dark:border-sky-800"
                                    }`}
                                  >
                                    Proposal: {eng.latestProposalStatus} v{eng.latestProposalVersion}
                                  </span>
                                )}
                              </div>
                            </div>

                            {eng.issueId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onClose();
                                  void navigate(`/app/innovation/problems/${eng.issueId}`);
                                }}
                                className="text-xs font-bold h-8 shrink-0 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl transition"
                              >
                                Problem Control Center →
                              </Button>
                            )}
                          </div>

                          {eng.projectTitle && (
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs space-y-0.5">
                              <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Project Workspace:</span>
                              <span className="font-bold text-foreground">{eng.projectTitle}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FACULTY & COORDINATORS */}
              {activeTab === "faculty" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Registered Faculty &amp; Nodal Coordinators ({members.length})
                  </h3>

                  {members.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-1">
                      <p className="text-xs font-bold text-foreground">No Registered Coordinators</p>
                      <p className="text-xs text-muted-foreground">
                        No faculty or nodal coordinators are currently registered for this institution.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-2xl border border-border bg-card shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-foreground truncate">
                                {m.profile?.full_name || "Faculty Member"}
                              </p>
                              {m.is_primary_contact && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                                  Primary Nodal
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              {m.role_title || m.profile?.designation || "Researcher"}
                            </p>
                            {m.profile?.email && (
                              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 pt-0.5">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {m.profile.email}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: PAST RESEARCH PORTFOLIO */}
              {activeTab === "portfolio" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Historical Research Projects ({projects.length})
                  </h3>

                  {projects.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-1">
                      <p className="text-xs font-bold text-foreground">No Projects Listed</p>
                      <p className="text-xs text-muted-foreground">
                        This institution has not cataloged prior external projects.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-foreground leading-snug">{p.title}</p>
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {p.domain || "Research Project"} {p.start_year ? `· ${p.start_year}` : ""}
                                {p.end_year ? ` - ${p.end_year}` : ""}
                              </span>
                            </div>
                          </div>

                          {p.description && (
                            <p className="text-xs text-foreground leading-relaxed font-normal">{p.description}</p>
                          )}

                          {p.technologies?.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {p.technologies.map((t, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-bold border-border text-foreground hover:bg-muted rounded-xl">
            Close
          </Button>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to={`/app/admin/institutions/${institutionId}`}
                className="text-xs font-bold text-primary hover:underline transition"
              >
                Admin Management Console →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
