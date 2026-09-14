import { useMemo, useState } from "react";
import {
  ChevronDown,
  GraduationCap,
  LayoutGrid,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UniversityCard } from "@/components/innovation/problem-control-center/universities/university-card";
import {
  UniversityWorkspace,
  type UniversityWorkspaceTab,
} from "@/components/innovation/problem-control-center/workspace/university-workspace";
import type { InstitutionLifecycleTrack, ProblemControlCenterData } from "@/lib/innovation";

interface UniversityCollaborationsProps {
  institutions: InstitutionLifecycleTrack[];
  problem: ProblemControlCenterData["problem"];
  challenge?: ProblemControlCenterData["challenge"];
  selectedInstitutionId?: string | null;
  onSelectInstitution: (institutionId: string | null) => void;
  activeTab?: UniversityWorkspaceTab;
  onTabChange?: (tab: UniversityWorkspaceTab) => void;
  onInspectProfile?: (track: InstitutionLifecycleTrack) => void;
  onOpenRecommendationEngine: () => void;
}

/**
 * Computes a compact status label for dropdown options based strictly on persisted database states:
 * e.g. "Accepted • Proposal Approved • 80%", "Invited • Awaiting Response", "Accepted • Team Formation Pending"
 */
function getCompactInstitutionStatus(inst: InstitutionLifecycleTrack): string {
  const proposalStatus = inst.proposalStatus;
  const isAccepted = inst.invitationStatus === "ACCEPTED";
  const hasProject = Boolean(inst.projectId);
  const teamCount = inst.teamMembersCount || 0;

  if (inst.projectStatus === "COMPLETED") {
    return "Completed • 100%";
  }
  if (proposalStatus === "APPROVED") {
    return "Accepted • Proposal Approved • 80%";
  }
  if (proposalStatus === "UNDER_REVIEW" || proposalStatus === "RESUBMITTED") {
    return "Accepted • Proposal Under Review • 70%";
  }
  if (proposalStatus === "SUBMITTED") {
    return "Accepted • Proposal Submitted • 65%";
  }
  if (proposalStatus === "REQUESTED_REVISION") {
    return "Accepted • Revision Requested • 55%";
  }
  if (teamCount > 0) {
    return `Accepted • Team Staffed (${teamCount}) • 50%`;
  }
  if (hasProject) {
    return "Accepted • Workspace Active • 35%";
  }
  if (isAccepted) {
    return "Accepted • Team Formation Pending";
  }
  if (inst.invitationStatus === "SENT" || inst.invitationStatus === "PENDING") {
    return "Invited • Awaiting Response";
  }
  if (inst.invitationStatus === "DECLINED") {
    return "Outreach Declined";
  }
  if (inst.isSelected) {
    return "Selected • Invitation Pending";
  }
  return "Not Started";
}

export function UniversityCollaborations({
  institutions,
  problem,
  challenge,
  selectedInstitutionId,
  onSelectInstitution,
  activeTab = "overview",
  onTabChange,
  onInspectProfile,
  onOpenRecommendationEngine,
}: UniversityCollaborationsProps) {
  const [filter, setFilter] = useState<
    "ALL" | "ACCEPTED" | "INVITED" | "PROPOSALS" | "APPROVED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const acceptedCount = useMemo(
    () => institutions.filter((i) => i.invitationStatus === "ACCEPTED").length,
    [institutions]
  );
  const invitedCount = useMemo(
    () =>
      institutions.filter(
        (i) => i.invitationStatus === "SENT" || i.invitationStatus === "PENDING"
      ).length,
    [institutions]
  );
  const proposalsCount = useMemo(
    () => institutions.filter((i) => Boolean(i.proposalId)).length,
    [institutions]
  );
  const approvedCount = useMemo(
    () => institutions.filter((i) => i.proposalStatus === "APPROVED").length,
    [institutions]
  );

  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      if (filter === "ACCEPTED" && inst.invitationStatus !== "ACCEPTED") return false;
      if (
        filter === "INVITED" &&
        inst.invitationStatus !== "SENT" &&
        inst.invitationStatus !== "PENDING"
      )
        return false;
      if (filter === "PROPOSALS" && !inst.proposalId) return false;
      if (filter === "APPROVED" && inst.proposalStatus !== "APPROVED") return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = inst.institutionName.toLowerCase().includes(query);
        const matchesAcronym = inst.institutionAcronym?.toLowerCase().includes(query) ?? false;
        const matchesCity = inst.city?.toLowerCase().includes(query) ?? false;
        const matchesState = inst.state?.toLowerCase().includes(query) ?? false;
        const matchesDomain = inst.researchDomains.some((d) => d.toLowerCase().includes(query));
        const matchesLead = inst.projectLeadName?.toLowerCase().includes(query) ?? false;

        return matchesName || matchesAcronym || matchesCity || matchesState || matchesDomain || matchesLead;
      }

      return true;
    });
  }, [institutions, filter, searchQuery]);

  // Resolve currently active selected institution track
  const currentSelectedTrack = useMemo(() => {
    if (selectedInstitutionId === "all" || selectedInstitutionId === "ALL") return null;
    if (selectedInstitutionId) {
      return institutions.find((i) => i.institutionId === selectedInstitutionId) || null;
    }
    // Default to the first accepted institution or first participating institution
    return (
      institutions.find((i) => i.invitationStatus === "ACCEPTED") ||
      institutions[0] ||
      null
    );
  }, [institutions, selectedInstitutionId]);

  return (
    <div className="space-y-6">
      {/* 1. PROMINENT UNIVERSITY COLLABORATION SELECTOR / DROPDOWN */}
      <div className="p-4 sm:p-5 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-sky-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="font-black text-sm uppercase tracking-wider text-foreground">
              University Collaboration
            </span>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
              {institutions.length} Participating
            </Badge>
            {currentSelectedTrack && (
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold">
                Active Workspace: {currentSelectedTrack.institutionName}
                {currentSelectedTrack.city ? ` (${currentSelectedTrack.city})` : ""}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Select a participating institution to inspect its dedicated research workspace directly within this problem
          </p>
        </div>

        {/* Dynamic Selector Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <select
              value={currentSelectedTrack ? currentSelectedTrack.institutionId : "all"}
              onChange={(e) => {
                const val = e.target.value;
                onSelectInstitution(val === "all" ? "all" : val);
              }}
              className="text-xs font-bold bg-background border-2 border-primary/40 hover:border-primary rounded-xl pl-3.5 pr-8 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-xs cursor-pointer appearance-none min-w-[260px] sm:min-w-[320px] max-w-full"
            >
              <option value="all">
                📂 All Collaborations Directory ({institutions.length} Institutions)
              </option>
              {institutions.map((inst) => (
                <option key={inst.institutionId} value={inst.institutionId}>
                  {inst.institutionName}{inst.city ? ` (${inst.city})` : ""} — {getCompactInstitutionStatus(inst)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {currentSelectedTrack && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectInstitution("all")}
              className="text-xs h-9 px-3 gap-1.5 font-semibold shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Directory</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. EMBEDDED SELECTED UNIVERSITY WORKSPACE */}
      {currentSelectedTrack ? (
        <div className="pt-2">
          <UniversityWorkspace
            problem={problem}
            challenge={challenge}
            institution={currentSelectedTrack}
            initialTab={activeTab}
            onTabChange={onTabChange}
            embedded={true}
            onBackToProblem={() => onSelectInstitution("all")}
          />
        </div>
      ) : (
        /* 3. ALL COLLABORATIONS DIRECTORY CARDS VIEW */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/80">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <span>Participating Universities Directory</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Overview of all invited, accepted, and active academic research partners for this civic challenge
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={filter === "ALL" ? "default" : "outline"}
                onClick={() => setFilter("ALL")}
                className="text-xs h-7 px-2.5"
              >
                All ({institutions.length})
              </Button>
              <Button
                size="sm"
                variant={filter === "ACCEPTED" ? "default" : "outline"}
                onClick={() => setFilter("ACCEPTED")}
                className="text-xs h-7 px-2.5"
              >
                Accepted ({acceptedCount})
              </Button>
              <Button
                size="sm"
                variant={filter === "INVITED" ? "default" : "outline"}
                onClick={() => setFilter("INVITED")}
                className="text-xs h-7 px-2.5"
              >
                Invited ({invitedCount})
              </Button>
              <Button
                size="sm"
                variant={filter === "PROPOSALS" ? "default" : "outline"}
                onClick={() => setFilter("PROPOSALS")}
                className="text-xs h-7 px-2.5"
              >
                Proposals ({proposalsCount})
              </Button>
              <Button
                size="sm"
                variant={filter === "APPROVED" ? "default" : "outline"}
                onClick={() => setFilter("APPROVED")}
                className="text-xs h-7 px-2.5"
              >
                Approved ({approvedCount})
              </Button>
            </div>
          </div>

          {/* Search Filter */}
          {institutions.length > 2 && (
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search university, PI, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/30 rounded-xl border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* Institutions Grid */}
          {institutions.length === 0 ? (
            <EmptyState
              title="No University Collaborations Dispatched Yet"
              description="Use the Recommendation Engine above to screen suitable institutions and send research collaboration invitations."
              action={
                <Button
                  onClick={onOpenRecommendationEngine}
                  className="bg-primary text-primary-foreground text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open Recommendation Engine</span>
                </Button>
              }
            />
          ) : filteredInstitutions.length === 0 ? (
            <EmptyState
              title="No Collaborations Match Filter"
              description="No participating institutions match your selected filter."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilter("ALL");
                    setSearchQuery("");
                  }}
                >
                  Show All Collaborations
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInstitutions.map((track) => (
                <UniversityCard
                  key={track.institutionId}
                  track={track}
                  onOpenWorkspace={(institutionId, tab) => {
                    onSelectInstitution(institutionId);
                    if (tab && onTabChange) {
                      onTabChange(tab);
                    }
                  }}
                  onInspectProfile={onInspectProfile}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
