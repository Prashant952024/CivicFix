import { useMemo, useState } from "react";
import {
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UniversityCard } from "@/components/innovation/problem-control-center/universities/university-card";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityCollaborationsProps {
  institutions: InstitutionLifecycleTrack[];
  problemId?: string;
  onOpenWorkspace: (institutionId: string) => void;
  onInspectProfile?: (track: InstitutionLifecycleTrack) => void;
  onOpenRecommendationEngine: () => void;
}

export function UniversityCollaborations({
  institutions,
  onOpenWorkspace,
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

  return (
    <div className="space-y-4">
      {/* Header & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary shrink-0" />
            <span>University Collaborations ({institutions.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Dedicated research collaboration workspaces for participating universities on this problem
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

      {/* Search Filter input if multiple institutions exist */}
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

      {/* University Collaborations Cards Grid */}
      {institutions.length === 0 ? (
        <EmptyState
          title="No University Collaborations Yet"
          description="Use the Recommendation Engine to discover suitable research institutions and dispatch invitations."
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
              onOpenWorkspace={onOpenWorkspace}
              onInspectProfile={onInspectProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
