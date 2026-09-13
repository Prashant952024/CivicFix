import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Layers,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchAllProposals,
  type ResearchProposalWithDetails,
} from "@/lib/proposals";
import type { ProposalStatus } from "@/types/database";

type FilterStatus = ProposalStatus | "ALL";

export function InnovationProposalsPage() {
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<ResearchProposalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "status">("newest");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchAllProposals({
          status: statusFilter,
          search: searchQuery,
        });

        if (cancelled) return;
        setProposals(data);
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
  }, [statusFilter, searchQuery]);

  // Sort proposals
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return a.status.localeCompare(b.status);
    });
  }, [proposals, sortBy]);

  // Counts by status
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      ALL: proposals.length,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      REQUESTED_REVISION: 0,
      RESUBMITTED: 0,
      APPROVED: 0,
    };
    proposals.forEach((p) => {
      if (map[p.status] !== undefined) {
        map[p.status]++;
      }
    });
    return map;
  }, [proposals]);

  function getStatusBadge(status: ProposalStatus) {
    switch (status) {
      case "DRAFT":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Draft</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-sky-100 text-sky-800 border-sky-300">Submitted • Needs Review</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Under Review</Badge>;
      case "REQUESTED_REVISION":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Revision Requested</Badge>;
      case "RESUBMITTED":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Resubmitted</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Approved ✓</Badge>;
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Research Proposals &amp; Governance"
        description="Review, evaluate, request revisions, and officially approve institutional research proposals submitted by accredited partner institutions."
      />

      {/* Filter Tabs & Search Bar */}
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
            {[
              { id: "ALL", label: "All Proposals" },
              { id: "SUBMITTED", label: "Awaiting Review" },
              { id: "UNDER_REVIEW", label: "Under Review" },
              { id: "REQUESTED_REVISION", label: "Revision Requested" },
              { id: "RESUBMITTED", label: "Resubmitted" },
              { id: "APPROVED", label: "Approved" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as FilterStatus)}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {counts[tab.id] !== undefined && counts[tab.id] > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusFilter === tab.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {counts[tab.id]}
                  </span>
                )}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-muted-foreground font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "status")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-input bg-background text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
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
      {!loading && !error && sortedProposals.length === 0 && (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="py-12">
            <EmptyState
              title="No Research Proposals Found"
              description={
                searchQuery
                  ? "No proposals matched your search query. Try clearing the filter."
                  : "No proposals have been submitted for this status filter."
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Proposals Grid */}
      {!loading && !error && sortedProposals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedProposals.map((proposal) => {
            const isApproved = proposal.status === "APPROVED";
            const questions = Array.isArray(proposal.research_questions) ? proposal.research_questions : [];
            const milestones = Array.isArray(proposal.milestones) ? proposal.milestones : [];
            const deliverables = Array.isArray(proposal.deliverables) ? proposal.deliverables : [];

            return (
              <Card
                key={proposal.id}
                className="border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Badges & Version */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(proposal.status)}
                      <Badge variant="outline" className="text-[11px] font-semibold">
                        v{proposal.version_number}
                        {proposal.is_current && <span className="ml-1 text-[9px] opacity-75">(Active)</span>}
                      </Badge>
                    </div>

                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(proposal.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Project & Challenge Titles */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground leading-snug line-clamp-1">
                      {proposal.project?.project_title || "Untitled Project"}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
                      <Layers className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span>{proposal.challenge?.title || "Innovation Challenge"}</span>
                    </p>
                  </div>

                  {/* Institution Details */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-foreground truncate">
                        {proposal.institution?.official_name || proposal.institution?.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {proposal.institution?.city}, {proposal.institution?.state} • {proposal.institution?.institution_type}
                      </p>
                    </div>
                  </div>

                  {/* Proposal Summary Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-center border-y border-border/70 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Questions</span>
                      <span className="font-bold text-foreground">{questions.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Milestones</span>
                      <span className="font-bold text-foreground">{milestones.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Deliverables</span>
                      <span className="font-bold text-foreground">{deliverables.length}</span>
                    </div>
                  </div>

                  {/* Review Feedback snippet if revision was requested */}
                  {proposal.status === "REQUESTED_REVISION" && proposal.review_feedback && (
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-lg text-xs text-orange-900 dark:text-orange-200 space-y-0.5">
                      <span className="font-bold text-[11px] block text-orange-950 dark:text-orange-100">
                        Revision Feedback:
                      </span>
                      <p className="text-[11px] line-clamp-2 italic">"{proposal.review_feedback}"</p>
                    </div>
                  )}

                  {/* Submitter Info */}
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                    <span>
                      Submitted by:{" "}
                      <strong className="text-foreground">
                        {proposal.submitter?.full_name || "Project Lead"}
                      </strong>
                    </span>
                    {isApproved && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Approved
                      </span>
                    )}
                  </div>
                </CardContent>

                {/* Card Action Footer */}
                <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={() => { void navigate(`/app/innovation/proposals/${proposal.id}`); }}
                    className="gap-1.5 text-xs w-full sm:w-auto"
                  >
                    <span>{isApproved ? "View Approved Proposal" : "Review Proposal"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
