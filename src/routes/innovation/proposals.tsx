import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  Clock,
  Users,
} from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchAllProposals,
  type ResearchProposalWithDetails,
} from "@/lib/proposals";
import { formatElapsedWaitingTime } from "@/lib/innovation";
import type { ProposalStatus } from "@/types/database";

type FilterStatus = ProposalStatus | "ALL";

export function InnovationProposalsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const statusFilter = (searchParams.get("status") as FilterStatus) || "ALL";
  const challengeParam = searchParams.get("challenge") || "";
  const institutionParam = searchParams.get("institution") || "";
  const searchParam = searchParams.get("search") || "";

  const [allProposals, setAllProposals] = useState<ResearchProposalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active filters
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "status" | "waiting">("newest");

  const setStatusFilter = (newStatus: FilterStatus) => {
    const newParams = new URLSearchParams(searchParams);
    if (newStatus === "ALL") {
      newParams.delete("status");
    } else {
      newParams.set("status", newStatus);
    }
    setSearchParams(newParams);
  };

  // Load all proposals (unfiltered at DB query level so counts are always 100% accurate!)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchAllProposals({
          status: "ALL",
          challengeId: challengeParam || undefined,
          institutionId: institutionParam || undefined,
        });

        if (cancelled) return;
        setAllProposals(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load research proposals.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [challengeParam, institutionParam]);

  // Handle status tab change with URL update
  function handleStatusChange(newStatus: FilterStatus) {
    setStatusFilter(newStatus);
    const newParams = new URLSearchParams(searchParams);
    if (newStatus === "ALL") {
      newParams.delete("status");
    } else {
      newParams.set("status", newStatus);
    }
    setSearchParams(newParams);
  }

  // Handle search query change
  function handleSearchChange(query: string) {
    setSearchQuery(query);
    const newParams = new URLSearchParams(searchParams);
    if (!query.trim()) {
      newParams.delete("search");
    } else {
      newParams.set("search", query.trim());
    }
    setSearchParams(newParams);
  }

  // Global counts across all statuses
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      ALL: allProposals.length,
      SUBMITTED: 0,
      RESUBMITTED: 0,
      UNDER_REVIEW: 0,
      REQUESTED_REVISION: 0,
      APPROVED: 0,
      DRAFT: 0,
      AWAITING_REVIEW: 0,
    };
    allProposals.forEach((p) => {
      if (map[p.status] !== undefined) {
        map[p.status]++;
      }
      if (p.status === "SUBMITTED" || p.status === "RESUBMITTED") {
        map.AWAITING_REVIEW++;
      }
    });
    return map;
  }, [allProposals]);

  // Urgent action queue (SUBMITTED & RESUBMITTED)
  const urgentProposals = useMemo(() => {
    return allProposals.filter(
      (p) => p.status === "SUBMITTED" || p.status === "RESUBMITTED"
    );
  }, [allProposals]);

  // Filtered & sorted proposals for the main list
  const filteredProposals = useMemo(() => {
    let list = allProposals;

    // 1. Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.status === statusFilter);
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => {
        const projTitle = p.project?.project_title?.toLowerCase() ?? "";
        const chalTitle = p.challenge?.title?.toLowerCase() ?? "";
        const instName = p.institution?.name?.toLowerCase() ?? "";
        const instAcronym = p.institution?.acronym?.toLowerCase() ?? "";
        const leadName = p.project_lead?.full_name?.toLowerCase() ?? "";
        const obj = p.project_objective?.toLowerCase() ?? "";
        return (
          projTitle.includes(q) ||
          chalTitle.includes(q) ||
          instName.includes(q) ||
          instAcronym.includes(q) ||
          leadName.includes(q) ||
          obj.includes(q)
        );
      });
    }

    // 3. Sort
    return [...list].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "waiting") {
        const dateA = new Date(a.submitted_at || a.created_at).getTime();
        const dateB = new Date(b.submitted_at || b.created_at).getTime();
        return dateA - dateB; // Oldest waiting first
      }
      return a.status.localeCompare(b.status);
    });
  }, [allProposals, statusFilter, searchQuery, sortBy]);

  function getStatusBadge(status: ProposalStatus) {
    switch (status) {
      case "DRAFT":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Draft (In Progress)</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-sky-100 text-sky-800 border-sky-300">Awaiting Review</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Under Review</Badge>;
      case "REQUESTED_REVISION":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Waiting for Institution</Badge>;
      case "RESUBMITTED":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Review Again (Resubmitted)</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Approved ✓</Badge>;
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Research Proposals & Governance"
        description="Review, evaluate, request revisions, and officially approve institutional research proposals submitted by accredited partner institutions."
        backHref="/app/innovation"
      />

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => handleStatusChange("ALL")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "ALL"
              ? "border-teal-500 bg-teal-50/70 shadow-sm ring-1 ring-teal-500"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">All Proposals</p>
          <p className="text-2xl font-bold text-foreground mt-1">{counts.ALL}</p>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("SUBMITTED")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "SUBMITTED"
              ? "border-sky-500 bg-sky-50/70 shadow-sm ring-1 ring-sky-500"
              : "border-sky-200/80 bg-sky-50/30 hover:bg-sky-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">Awaiting Review</p>
            {counts.SUBMITTED > 0 && <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />}
          </div>
          <p className="text-2xl font-extrabold text-sky-700 mt-1">{counts.SUBMITTED}</p>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("RESUBMITTED")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "RESUBMITTED"
              ? "border-indigo-500 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500"
              : "border-indigo-200/80 bg-indigo-50/30 hover:bg-indigo-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Resubmitted</p>
            {counts.RESUBMITTED > 0 && <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
          </div>
          <p className="text-2xl font-extrabold text-indigo-700 mt-1">{counts.RESUBMITTED}</p>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("UNDER_REVIEW")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "UNDER_REVIEW"
              ? "border-purple-500 bg-purple-50/70 shadow-sm ring-1 ring-purple-500"
              : "border-purple-200/80 bg-purple-50/30 hover:bg-purple-50/50"
          }`}
        >
          <p className="text-[11px] font-semibold text-purple-900 uppercase tracking-wider">Under Review</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{counts.UNDER_REVIEW}</p>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("REQUESTED_REVISION")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "REQUESTED_REVISION"
              ? "border-orange-500 bg-orange-50/70 shadow-sm ring-1 ring-orange-500"
              : "border-orange-200/80 bg-orange-50/30 hover:bg-orange-50/50"
          }`}
        >
          <p className="text-[11px] font-semibold text-orange-900 uppercase tracking-wider">In Revision</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{counts.REQUESTED_REVISION}</p>
        </button>

        <button
          type="button"
          onClick={() => handleStatusChange("APPROVED")}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === "APPROVED"
              ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500"
              : "border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/50"
          }`}
        >
          <p className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.APPROVED}</p>
        </button>
      </div>

      {/* SECTION: Needs Your Attention (Actionable Queue Pinned at Top) */}
      {statusFilter === "ALL" && urgentProposals.length > 0 && !searchQuery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Needs Your Attention ({urgentProposals.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">Actionable institutional submissions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {urgentProposals.map((proposal) => {
              const elapsed = formatElapsedWaitingTime(proposal.submitted_at || proposal.created_at);
              return (
                <Card
                  key={`urgent-${proposal.id}`}
                  className="border-sky-300/80 bg-gradient-to-br from-sky-50/60 via-background to-indigo-50/30 shadow-md hover:shadow-lg transition-all"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(proposal.status)}
                        <Badge variant="outline" className="text-[10px] font-bold">
                          v{proposal.version_number}
                        </Badge>
                      </div>
                      <span className="text-xs font-semibold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {elapsed}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {proposal.project?.project_title || "Research Proposal"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Challenge: {proposal.challenge?.title || "Innovation Challenge"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Institution</span>
                        <span className="font-semibold text-foreground truncate block">
                          {proposal.institution?.name || "Institution"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Project Lead</span>
                        <span className="font-semibold text-foreground truncate block">
                          {proposal.project_lead?.full_name || "Assigned Lead"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{proposal.team_members_count || 0} team members</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => { void navigate(`/app/innovation/proposals/${proposal.id}`); }}
                        className="bg-primary text-primary-foreground text-xs gap-1.5 shadow-xs"
                      >
                        <span>Review Proposal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
            {[
              { id: "ALL", label: "All Proposals", count: counts.ALL },
              { id: "SUBMITTED", label: "Awaiting Review", count: counts.SUBMITTED },
              { id: "RESUBMITTED", label: "Resubmitted", count: counts.RESUBMITTED },
              { id: "UNDER_REVIEW", label: "Under Review", count: counts.UNDER_REVIEW },
              { id: "REQUESTED_REVISION", label: "Revision Requested", count: counts.REQUESTED_REVISION },
              { id: "APPROVED", label: "Approved", count: counts.APPROVED },
              { id: "DRAFT", label: "Drafts (In Progress)", count: counts.DRAFT },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleStatusChange(tab.id as FilterStatus)}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by project, challenge, institution, lead..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-muted-foreground font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "status" | "waiting")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-input bg-background text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="waiting">Oldest Waiting First</option>
                <option value="oldest">Oldest Created</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RotateCcw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Loading research proposals...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredProposals.length === 0 && (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="py-12">
            <EmptyState
              title={
                statusFilter === "SUBMITTED" || statusFilter === "RESUBMITTED"
                  ? "No Proposals Awaiting Review"
                  : "No Research Proposals Found"
              }
              description={
                statusFilter === "SUBMITTED" || statusFilter === "RESUBMITTED"
                  ? "You're all caught up! New institutional research proposals will appear here when submitted."
                  : searchQuery
                  ? "No proposals matched your search query. Try clearing filters."
                  : "No proposals currently exist for this status filter."
              }
              action={
                statusFilter !== "ALL" || searchQuery ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSearchQuery("");
                      setSearchParams({});
                    }}
                    className="text-xs"
                  >
                    View All Proposals
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Proposals Grid */}
      {!loading && !error && filteredProposals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProposals.map((proposal) => {
            const isApproved = proposal.status === "APPROVED";
            const elapsed = formatElapsedWaitingTime(proposal.submitted_at || proposal.created_at);

            return (
              <Card
                key={proposal.id}
                className="border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between bg-card"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Badges & Waiting Time */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(proposal.status)}
                      <Badge variant="outline" className="text-[11px] font-semibold">
                        v{proposal.version_number}
                        {proposal.is_current && <span className="ml-1 text-[9px] opacity-75">(Active)</span>}
                      </Badge>
                    </div>

                    <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {elapsed}
                    </span>
                  </div>

                  {/* Project & Challenge Titles */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground leading-snug line-clamp-1">
                      {proposal.project?.project_title || "Untitled Project Workspace"}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      Challenge: {proposal.challenge?.title || "Innovation Challenge"}
                    </p>
                  </div>

                  {/* Institution & Team Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2.5 px-3 bg-muted/20 rounded-xl border border-border/50">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Institution
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {proposal.institution?.name || "Institution"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Project Lead
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {proposal.project_lead?.full_name || "Lead Assigned"}
                      </span>
                    </div>
                  </div>

                  {/* Objective Excerpt */}
                  {proposal.project_objective && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed">
                      &ldquo;{proposal.project_objective}&rdquo;
                    </p>
                  )}

                  {/* Footer & Cross-Navigation Links */}
                  <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {proposal.team_members_count || 0} members
                      </span>
                      {proposal.challenge?.id && (
                        <Link
                          to={`/app/innovation/challenges/${proposal.challenge.id}`}
                          className="hover:text-primary underline-offset-2 hover:underline text-[11px]"
                        >
                          View Challenge
                        </Link>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => { void navigate(`/app/innovation/proposals/${proposal.id}`); }}
                      className={
                        proposal.status === "SUBMITTED" || proposal.status === "RESUBMITTED"
                          ? "bg-primary text-primary-foreground text-xs gap-1 shadow-xs"
                          : "text-xs gap-1"
                      }
                      variant={
                        proposal.status === "SUBMITTED" || proposal.status === "RESUBMITTED"
                          ? "default"
                          : "outline"
                      }
                    >
                      <span>
                        {proposal.status === "SUBMITTED" || proposal.status === "RESUBMITTED"
                          ? "Review Proposal"
                          : isApproved
                          ? "View Approval Dossier"
                          : "Inspect Proposal"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
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
