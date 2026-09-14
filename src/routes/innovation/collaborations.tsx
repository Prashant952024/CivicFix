import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileClock,
  GraduationCap,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchUniversityCollaborationsList,
  type UniversityCollaborationItem,
} from "@/lib/innovation";

type FilterStatus = "ALL" | "IN_REVIEW" | "ACTIVE" | "FORMING_TEAM" | "INVITED" | "APPROVED";

export function InnovationCollaborationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UniversityCollaborationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUniversityCollaborationsList();
        if (cancelled) return;
        setItems(data);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Error loading collaborations:", err);
          setError(err instanceof Error ? err.message : "Failed to load university collaborations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.collaborationStatus === "ACTIVE" || i.collaborationStatus === "PROPOSAL_APPROVED").length;
    const inReview = items.filter((i) => i.proposalStatus === "SUBMITTED" || i.proposalStatus === "RESUBMITTED").length;
    const approved = items.filter((i) => i.proposalStatus === "APPROVED").length;
    const totalTeamMembers = items.reduce((acc, i) => acc + i.teamSize, 0);

    return { total, active, inReview, approved, totalTeamMembers };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = item.institutionName.toLowerCase().includes(q);
        const matchTitle = item.challengeTitle.toLowerCase().includes(q);
        const matchLead = (item.projectLeadName || "").toLowerCase().includes(q);
        const matchCity = (item.city || "").toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchLead && !matchCity) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "IN_REVIEW") {
        return item.proposalStatus === "SUBMITTED" || item.proposalStatus === "RESUBMITTED";
      }
      if (statusFilter === "ACTIVE") {
        return item.collaborationStatus === "ACTIVE" || item.collaborationStatus === "PROPOSAL_APPROVED";
      }
      if (statusFilter === "FORMING_TEAM") {
        return item.collaborationStatus === "FORMING_TEAM" || (item.invitationStatus === "ACCEPTED" && !item.projectId);
      }
      if (statusFilter === "INVITED") {
        return item.invitationStatus === "SENT" || item.invitationStatus === "PENDING";
      }
      if (statusFilter === "APPROVED") {
        return item.proposalStatus === "APPROVED";
      }

      return true;
    });
  }, [items, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="University Collaborations"
        tag="Academic Partnerships & Workspaces"
        description="Global directory of university partnerships, active research teams, submitted proposals, and dedicated collaboration workspaces across all complex problems."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => void navigate("/app/innovation/problems")}
              className="gap-1.5 text-xs bg-teal-700 hover:bg-teal-800 text-white"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View Complex Problems
            </Button>
          </div>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-teal-600" />
            <span>Collaborations</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.total}</div>
          <p className="mt-0.5 text-[11px] text-slate-500">Across all civic problems</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Active Research</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{metrics.active}</div>
          <p className="mt-0.5 text-[11px] text-blue-600 font-medium">Workspaces underway</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <FileClock className="w-4 h-4 text-amber-600" />
            <span>Review Queue</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{metrics.inReview}</div>
          <p className="mt-0.5 text-[11px] text-amber-700 font-medium">Proposals awaiting review</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Approved Plans</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{metrics.approved}</div>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">Formally sanctioned</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Users className="w-4 h-4 text-violet-600" />
            <span>Research Personnel</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-violet-900">{metrics.totalTeamMembers}</div>
          <p className="mt-0.5 text-[11px] text-slate-500">Active university faculty & staff</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search institution, problem, lead..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700 h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {(
              [
                { key: "ALL", label: "All Collaborations" },
                { key: "IN_REVIEW", label: `In Review (${metrics.inReview})` },
                { key: "ACTIVE", label: `Active Research (${metrics.active})` },
                { key: "APPROVED", label: `Approved (${metrics.approved})` },
                { key: "FORMING_TEAM", label: "Forming Team" },
                { key: "INVITED", label: "Invited" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === filter.key
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No University Collaborations Found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search keywords or active status filter."
              : "No university collaborations have been initiated yet. Invite accredited institutions from any complex civic problem."}
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => void navigate("/app/innovation/problems")}
              className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
            >
              Browse Complex Problems
            </Button>
          </div>
        </div>
      ) : (
        /* Grid of Collaborations */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isAwaitingReview = item.proposalStatus === "SUBMITTED" || item.proposalStatus === "RESUBMITTED";
            const isApproved = item.proposalStatus === "APPROVED";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-teal-300 transition-all shadow-xs hover:shadow-md p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Meta: Institution & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-700/20 border border-teal-200 flex items-center justify-center shrink-0 text-teal-700">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                          {item.institutionName}
                          {isApproved && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />
                          )}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {item.institutionType}
                          </span>
                          {item.city && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {item.city}
                                {item.state ? `, ${item.state}` : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isAwaitingReview ? (
                        <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 animate-pulse">
                          Review Needed
                        </Badge>
                      ) : isApproved ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5">
                          Plan Approved
                        </Badge>
                      ) : item.collaborationStatus === "ACTIVE" ? (
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-semibold px-2 py-0.5">
                          Active Research
                        </Badge>
                      ) : item.collaborationStatus === "FORMING_TEAM" ? (
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-semibold px-2 py-0.5">
                          Forming Team
                        </Badge>
                      ) : (
                        <Badge className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold px-2 py-0.5">
                          Invited
                        </Badge>
                      )}

                      {item.proposalStatus && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Proposal {item.proposalVersion ? `v${item.proposalVersion}` : ""}: {item.proposalStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Problem Parent Context */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3 space-y-1">
                    <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider block">
                      Civic Problem
                    </span>
                    <Link
                      to={`/app/innovation/problems/${item.challengeId}`}
                      className="text-xs font-semibold text-slate-800 hover:text-teal-700 transition-colors line-clamp-1 block"
                    >
                      {item.challengeTitle}
                    </Link>
                    <span className="text-[11px] text-slate-500 block truncate">
                      Category: {item.challengeCategory}
                    </span>
                  </div>

                  {/* Team & Activity Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.teamSize > 0 ? `${item.teamSize} Researchers` : "Lead only"}</span>
                    </div>
                    {item.projectLeadName && (
                      <div className="text-right truncate font-medium text-slate-700 text-[11px]">
                        Lead: {item.projectLeadName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400">
                    Activity: {new Date(item.lastActivityAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        void navigate(
                          `/app/innovation/problems/${item.challengeId}/universities/${item.institutionId}`
                        )
                      }
                      className={`text-xs gap-1 font-semibold ${
                        isAwaitingReview
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-teal-700 hover:bg-teal-800 text-white"
                      }`}
                    >
                      {isAwaitingReview ? (
                        <>
                          <span>Review Proposal</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
