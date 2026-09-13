import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Filter,
  Grid3X3,
  LayoutList,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatElapsedWaitingTime,
  getProposalStatusBadgeClass,
  getProposalStatusLabel,
  type InstitutionLifecycleTrack,
  type ProblemControlCenterData,
} from "@/lib/innovation";

interface UniversitiesTabProps {
  institutions: InstitutionLifecycleTrack[];
  stats: ProblemControlCenterData["stats"];
  challenge?: ProblemControlCenterData["challenge"];
  initialFilter?: "ALL" | "ACCEPTED" | "INVITED" | "PROPOSALS" | "APPROVED";
  onInspectInstitution: (track: InstitutionLifecycleTrack) => void;
  onNavigateToMatching: () => void;
}

export function UniversitiesTab({
  institutions,
  stats,
  initialFilter = "ALL",
  onInspectInstitution,
  onNavigateToMatching,
}: UniversitiesTabProps) {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<
    "ALL" | "ACCEPTED" | "INVITED" | "PROPOSALS" | "APPROVED"
  >(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Filtered & Searched institutions
  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      // 1. Status Filter
      if (filter === "ACCEPTED" && inst.invitationStatus !== "ACCEPTED") return false;
      if (
        filter === "INVITED" &&
        inst.invitationStatus !== "SENT" &&
        inst.invitationStatus !== "PENDING"
      )
        return false;
      if (filter === "PROPOSALS" && !inst.proposalId) return false;
      if (filter === "APPROVED" && inst.proposalStatus !== "APPROVED") return false;

      // 2. Search Query Filter
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

  return (
    <div className="space-y-5">
      {/* 1. TOP CONTROLS & FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          <Button
            size="sm"
            variant={filter === "ALL" ? "default" : "outline"}
            onClick={() => setFilter("ALL")}
            className="text-xs h-8 px-3"
          >
            All ({institutions.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "ACCEPTED" ? "default" : "outline"}
            onClick={() => setFilter("ACCEPTED")}
            className="text-xs h-8 px-3"
          >
            Accepted ({stats.institutionsAcceptedCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "INVITED" ? "default" : "outline"}
            onClick={() => setFilter("INVITED")}
            className="text-xs h-8 px-3"
          >
            Invited ({stats.invitationsSentCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "PROPOSALS" ? "default" : "outline"}
            onClick={() => setFilter("PROPOSALS")}
            className="text-xs h-8 px-3"
          >
            Proposals ({stats.proposalsCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "APPROVED" ? "default" : "outline"}
            onClick={() => setFilter("APPROVED")}
            className="text-xs h-8 px-3"
          >
            Approved ({stats.proposalsApprovedCount})
          </Button>
        </div>

        {/* Right: Search & View Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search university, PI, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/30 rounded-xl border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center border border-border rounded-xl p-0.5 bg-muted/20">
            <Button
              size="icon"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => setViewMode("table")}
              className="h-7 w-7 rounded-lg"
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              className="h-7 w-7 rounded-lg"
              title="Grid View"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT DISPLAY */}
      {institutions.length === 0 ? (
        <EmptyState
          title="No Institutions Engaged Yet"
          description="Screen accredited universities against this challenge using the AI Matching Engine, or invite institutes from the registry."
          action={
            <Button
              onClick={onNavigateToMatching}
              className="bg-primary text-primary-foreground text-xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Matching Engine</span>
            </Button>
          }
        />
      ) : filteredInstitutions.length === 0 ? (
        <EmptyState
          title="No Institutions Match Criteria"
          description="No participating institutions match your search or filter options."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilter("ALL");
                setSearchQuery("");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">University / Institute</th>
                  <th className="py-3.5 px-3">Outreach Status</th>
                  <th className="py-3.5 px-3">Project Workspace</th>
                  <th className="py-3.5 px-3">Research Team</th>
                  <th className="py-3.5 px-3">Proposal Status</th>
                  <th className="py-3.5 px-3">Latest Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInstitutions.map((track) => {
                  const isAccepted = track.invitationStatus === "ACCEPTED";
                  const needsReview =
                    track.proposalStatus === "SUBMITTED" ||
                    track.proposalStatus === "RESUBMITTED";

                  return (
                    <tr
                      key={track.institutionId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {/* 1. University Name & Location */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground hover:text-primary cursor-pointer transition" onClick={() => onInspectInstitution(track)}>
                              {track.institutionName}
                            </span>
                            {track.institutionAcronym && (
                              <Badge variant="outline" className="text-[9px] font-bold">
                                {track.institutionAcronym}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {track.city ? `${track.city}, ${track.state}` : "Accredited National Institute"}
                          </p>
                        </div>
                      </td>

                      {/* 2. Outreach / Invitation Status */}
                      <td className="py-3.5 px-3">
                        <Badge
                          className={
                            isAccepted
                              ? "bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold"
                              : track.invitationStatus === "DECLINED"
                              ? "bg-rose-100 text-rose-900 border-rose-300 text-[10px]"
                              : "bg-amber-100 text-amber-900 border-amber-300 text-[10px]"
                          }
                        >
                          {track.invitationStatus ? track.invitationStatus : "Selected"}
                        </Badge>
                        {track.invitedAt && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Invited {new Date(track.invitedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      {/* 3. Project Workspace */}
                      <td className="py-3.5 px-3">
                        {track.projectId ? (
                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => void navigate(`/app/innovation/projects/${track.projectId}`)}
                              className="font-semibold text-primary hover:underline truncate block max-w-[180px] text-left"
                            >
                              {track.projectTitle || "Active Project"}
                            </button>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              PI: {track.projectLeadName || "Assigned"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">
                            Not created
                          </span>
                        )}
                      </td>

                      {/* 4. Research Team */}
                      <td className="py-3.5 px-3">
                        {track.teamMembersCount > 0 ? (
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>{track.teamMembersCount} members</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">
                            Pending setup
                          </span>
                        )}
                      </td>

                      {/* 5. Proposal Status */}
                      <td className="py-3.5 px-3">
                        {track.proposalId ? (
                          <div className="space-y-0.5">
                            <Badge className={getProposalStatusBadgeClass(track.proposalStatus || "")}>
                              {getProposalStatusLabel(track.proposalStatus || "")} v{track.proposalVersion}
                            </Badge>
                            {track.proposalSubmittedAt && (
                              <span className="text-[10px] text-muted-foreground block">
                                {formatElapsedWaitingTime(track.proposalSubmittedAt)} ago
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">
                            No proposal
                          </span>
                        )}
                      </td>

                      {/* 6. Latest Activity */}
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-muted-foreground block truncate max-w-[160px]">
                          {track.lastActivityDescription || "Selection recorded"}
                        </span>
                        <span className="text-[9px] text-muted-foreground/80 font-mono block">
                          {track.lastActivityAt ? new Date(track.lastActivityAt).toLocaleDateString() : ""}
                        </span>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onInspectInstitution(track)}
                            className="h-8 px-2 text-primary font-bold hover:bg-primary/10 text-xs gap-1"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </Button>

                          {track.projectId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void navigate(`/app/innovation/projects/${track.projectId}`)}
                              className="h-8 px-2 text-xs"
                              title="Open Project Workspace"
                            >
                              <span>Project</span>
                            </Button>
                          )}

                          {track.proposalId && (
                            <Button
                              size="sm"
                              onClick={() => void navigate(`/app/innovation/proposals/${track.proposalId}`)}
                              className={`h-8 px-2.5 text-xs font-bold gap-1 shadow-xs ${
                                needsReview
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <span>{needsReview ? "Review" : "View"}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInstitutions.map((track) => {
            const isAccepted = track.invitationStatus === "ACCEPTED";
            const isApproved = track.proposalStatus === "APPROVED";
            const hasProposal = Boolean(track.proposalId);
            const needsReview =
              track.proposalStatus === "SUBMITTED" ||
              track.proposalStatus === "RESUBMITTED";

            return (
              <Card
                key={track.institutionId}
                className={`rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isApproved
                    ? "border-emerald-300 bg-gradient-to-br from-emerald-50/20 via-background to-background"
                    : needsReview
                    ? "border-sky-300 bg-gradient-to-br from-sky-50/30 via-background to-background"
                    : isAccepted
                    ? "border-border/90 bg-card"
                    : "border-border/70 bg-muted/10"
                }`}
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Header: Institution Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground truncate">
                          {track.institutionName}
                        </h3>
                        {track.institutionAcronym && (
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {track.institutionAcronym}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.city ? `${track.city}, ${track.state}` : "Accredited National Research Institution"}
                      </p>
                    </div>

                    <Badge
                      className={
                        isApproved
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold shrink-0"
                          : needsReview
                          ? "bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-bold shrink-0 animate-pulse"
                          : isAccepted
                          ? "bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold shrink-0"
                          : "bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold shrink-0"
                      }
                    >
                      {track.lifecycleLabel}
                    </Badge>
                  </div>

                  {/* Progress Step Mini-Bar */}
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                      <span>Milestone Pipeline</span>
                      <span className="text-primary">{track.lifecycleStage}</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 text-center text-[9px] font-semibold">
                      <div className="p-1 rounded bg-emerald-100 text-emerald-900">
                        ✓ Invited
                      </div>
                      <div
                        className={`p-1 rounded ${
                          isAccepted
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isAccepted ? "✓ Accepted" : "Pending"}
                      </div>
                      <div
                        className={`p-1 rounded ${
                          track.projectId
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {track.projectId ? "✓ Project" : "Workspace"}
                      </div>
                      <div
                        className={`p-1 rounded ${
                          track.teamMembersCount >= 2
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {track.teamMembersCount >= 2 ? `✓ Team (${track.teamMembersCount})` : "Team"}
                      </div>
                      <div
                        className={`p-1 rounded ${
                          isApproved
                            ? "bg-emerald-600 text-white font-bold"
                            : hasProposal
                            ? "bg-sky-100 text-sky-900 font-bold"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isApproved ? "Approved ✓" : hasProposal ? `v${track.proposalVersion}` : "Proposal"}
                      </div>
                    </div>
                  </div>

                  {/* Project & Proposal Context */}
                  {track.projectId ? (
                    <div className="space-y-2 text-xs bg-muted/20 p-3 rounded-xl border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Research Project Workspace
                        </span>
                        <span className="text-[10px] font-semibold text-primary">
                          Lead: {track.projectLeadName || "Assigned Coordinator"}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground truncate">
                        {track.projectTitle || "Civic Research Project"}
                      </p>

                      {track.proposalId && (
                        <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                          <span className="text-muted-foreground">
                            Proposal v{track.proposalVersion} ({track.proposalStatus})
                          </span>
                          {track.proposalSubmittedAt && (
                            <span className="text-muted-foreground">
                              {formatElapsedWaitingTime(track.proposalSubmittedAt)} ago
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground flex items-center justify-between">
                      <span>Project workspace pending acceptance &amp; team setup</span>
                      <span className="text-[10px] font-mono font-semibold">
                        Invited {track.invitedAt ? new Date(track.invitedAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onInspectInstitution(track)}
                      className="text-xs text-primary hover:bg-primary/10 h-8 px-2.5 gap-1"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Inspect Profile</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {track.projectId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigate(`/app/innovation/projects/${track.projectId}`);
                          }}
                          className="text-xs h-8 px-2.5"
                        >
                          <span>Open Project</span>
                        </Button>
                      )}

                      {track.proposalId && (
                        <Button
                          size="sm"
                          onClick={() => {
                            void navigate(`/app/innovation/proposals/${track.proposalId}`);
                          }}
                          className={`text-xs font-bold gap-1 h-8 px-3 shadow-xs ${
                            needsReview
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          }`}
                        >
                          <span>{needsReview ? "Review Proposal" : "View Proposal"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
