import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchComplexProblemsList,
  type ComplexProblemListItem,
} from "@/lib/innovation";

export function InnovationProblemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [problems, setProblems] = useState<ComplexProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [userStageFilter, setUserStageFilter] = useState<string | null>(null);
  const stageFilter = userStageFilter ?? (searchParams.get("stage") || "ALL");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "ALL");
  const [actionOnly, setActionOnly] = useState(searchParams.get("action") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "ACTION_REQUIRED");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchComplexProblemsList();
        if (cancelled) return;
        setProblems(data);
      } catch (err: unknown) {
        if (!cancelled) {
          if (import.meta.env.DEV) console.error("Error loading complex problems:", err);
          setError(err instanceof Error ? err.message : "Unable to load complex problems catalog.");
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

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [problems]);

  // High-level aggregate metrics
  const summaryMetrics = useMemo(() => {
    const total = problems.length;
    const actionRequiredCount = problems.filter((p) => p.needsAction).length;
    const totalInstitutions = problems.reduce((acc, p) => acc + p.institutionsSelectedCount, 0);
    const totalProjects = problems.reduce((acc, p) => acc + p.projectsCount, 0);
    const totalProposalsAwaiting = problems.reduce((acc, p) => acc + p.proposalsAwaitingReviewCount, 0);
    const totalApprovedProposals = problems.reduce((acc, p) => acc + p.proposalsApprovedCount, 0);

    return {
      total,
      actionRequiredCount,
      totalInstitutions,
      totalProjects,
      totalProposalsAwaiting,
      totalApprovedProposals,
    };
  }, [problems]);

  // Filter and sort problems
  const filteredProblems = useMemo(() => {
    return problems
      .filter((p) => {
        // Action filter
        if (actionOnly && !p.needsAction) return false;

        // Stage filter
        if (stageFilter !== "ALL") {
          if (stageFilter === "UNCLASSIFIED") {
            if (p.stage !== "UNFORMULATED") return false;
          } else if (stageFilter === "FORMULATION") {
            if (p.stage !== "CHALLENGE_FORMULATED" && p.stage !== "UNFORMULATED") return false;
          } else if (stageFilter === "MATCHING") {
            if (p.stage !== "MATCHING_ACTIVE") return false;
          } else if (stageFilter === "INVITATIONS") {
            if (p.stage !== "OUTREACH") return false;
          } else if (stageFilter === "RESEARCH") {
            if (!["PROJECT_ACTIVE", "TEAM_FORMED", "PROPOSALS_UNDERWAY"].includes(p.stage)) return false;
          } else if (stageFilter === "COMPLETED") {
            if (p.stage !== "APPROVED_SOLUTIONS") return false;
          } else if (p.stage !== stageFilter) {
            return false;
          }
        }

        // Category filter
        if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;

        // Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchChal = p.challengeTitle ? p.challengeTitle.toLowerCase().includes(q) : false;
          const matchScope = p.geographicScope.toLowerCase().includes(q);
          const matchId = p.id.toLowerCase().includes(q) || (p.challengeId ? p.challengeId.toLowerCase().includes(q) : false);

          if (!matchTitle && !matchDesc && !matchChal && !matchScope && !matchId) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "ACTION_REQUIRED": {
            if (a.needsAction && !b.needsAction) return -1;
            if (!a.needsAction && b.needsAction) return 1;
            if (b.proposalsAwaitingReviewCount !== a.proposalsAwaitingReviewCount) {
              return b.proposalsAwaitingReviewCount - a.proposalsAwaitingReviewCount;
            }
            return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
          }
          case "RECENT_ACTIVITY":
            return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
          case "HIGHEST_COMPLEXITY":
            return b.complexityScore - a.complexityScore;
          case "MOST_INSTITUTIONS":
            return b.institutionsSelectedCount - a.institutionsSelectedCount;
          case "MOST_PROJECTS":
            return b.projectsCount - a.projectsCount;
          case "OLDEST_FIRST":
            return new Date(a.sourceCreatedAt).getTime() - new Date(b.sourceCreatedAt).getTime();
          default:
            return 0;
        }
      });
  }, [problems, actionOnly, stageFilter, categoryFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Complex Civic Problems"
        description="Primary operational console for managing complex civic challenges, multi-institutional research partnerships, and proposal governance."
        backHref="/app/innovation"
        backLabel="Innovation Hub"
        tag="Innovation Lifecycle"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshNonce((v) => v + 1)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRefreshNonce((v) => v + 1)} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Complex Problems
          </span>
          <p className="text-2xl font-black text-foreground mt-1">
            {loading ? "..." : summaryMetrics.total}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            In innovation pipeline
          </span>
        </div>

        <div
          onClick={() => setActionOnly(!actionOnly)}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            actionOnly
              ? "border-amber-400 bg-amber-50/80"
              : summaryMetrics.actionRequiredCount > 0
              ? "border-amber-300/80 bg-amber-50/40 hover:bg-amber-50/70"
              : "border-border bg-card hover:bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider block">
              Action Required
            </span>
            {summaryMetrics.actionRequiredCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {loading ? "..." : summaryMetrics.actionRequiredCount}
          </p>
          <span className="text-[11px] font-semibold text-amber-800 mt-0.5 block">
            {actionOnly ? "Filtering active (Click to clear)" : "Needs manager review"}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Participating Institutions
          </span>
          <p className="text-2xl font-black text-foreground mt-1">
            {loading ? "..." : summaryMetrics.totalInstitutions}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Engaged across problems
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Active Projects
          </span>
          <p className="text-2xl font-black text-foreground mt-1">
            {loading ? "..." : summaryMetrics.totalProjects}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Collaborative workspaces
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-sky-300/80 bg-sky-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-sky-950 uppercase tracking-wider block">
            Proposals Review
          </span>
          <p className="text-2xl font-black text-sky-900 mt-1">
            {loading ? "..." : summaryMetrics.totalProposalsAwaiting}
          </p>
          <span className="text-[11px] font-semibold text-sky-800 mt-0.5 block">
            {summaryMetrics.totalApprovedProposals} approved solutions
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/90 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search problem title, challenge, category, scope, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={stageFilter}
                onChange={(e) => setUserStageFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Stages</option>
                <option value="UNFORMULATED">Unformulated Challenge</option>
                <option value="CHALLENGE_FORMULATED">Challenge Formulated</option>
                <option value="MATCHING_ACTIVE">Matching Active</option>
                <option value="OUTREACH">Invitations Dispatched</option>
                <option value="PROJECT_ACTIVE">Project Workspaces Active</option>
                <option value="TEAM_FORMED">Research Teams Formed</option>
                <option value="PROPOSALS_UNDERWAY">Proposals Underway</option>
                <option value="APPROVED_SOLUTIONS">Approved Solutions</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ACTION_REQUIRED">Sort: Needs Action First</option>
                <option value="RECENT_ACTIVITY">Sort: Most Recent Activity</option>
                <option value="HIGHEST_COMPLEXITY">Sort: Highest Complexity</option>
                <option value="MOST_INSTITUTIONS">Sort: Most Institutions</option>
                <option value="MOST_PROJECTS">Sort: Most Projects</option>
                <option value="OLDEST_FIRST">Sort: Oldest First</option>
              </select>

              {/* Toggle Action Only */}
              <Button
                size="sm"
                variant={actionOnly ? "default" : "outline"}
                onClick={() => setActionOnly(!actionOnly)}
                className={`text-xs gap-1.5 h-9 ${
                  actionOnly
                    ? "bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    : "text-muted-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Needs My Action ({summaryMetrics.actionRequiredCount})</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          <div className="h-56 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          <div className="h-56 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          <div className="h-56 rounded-2xl border border-border bg-muted/20 animate-pulse" />
        </div>
      ) : filteredProblems.length === 0 ? (
        <EmptyState
          title="No Complex Problems Found"
          description={
            searchQuery || stageFilter !== "ALL" || categoryFilter !== "ALL" || actionOnly
              ? "No complex civic problems match your current search and filter criteria. Try clearing some filters."
              : "No complex societal challenges are currently registered in the system."
          }
          action={
            (searchQuery || stageFilter !== "ALL" || categoryFilter !== "ALL" || actionOnly) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setUserStageFilter("ALL");
                  setCategoryFilter("ALL");
                  setActionOnly(false);
                }}
              >
                Reset Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProblems.map((problem) => (
            <Card
              key={problem.id}
              className={`rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                problem.needsAction
                  ? "border-amber-300 bg-gradient-to-br from-amber-50/20 via-background to-background"
                  : "border-border/90 bg-card hover:border-primary/40"
              }`}
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Header: Category, Scope, Complexity Score */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {problem.category}
                    </Badge>
                    <Badge variant="info" className="text-[10px]">
                      {problem.geographicScope}
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                      COMPLEX • {problem.complexityScore}/100
                    </Badge>
                  </div>

                  {problem.needsAction && (
                    <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold animate-pulse">
                      Action Required
                    </Badge>
                  )}
                </div>

                {/* Problem Title & Grievance */}
                <div>
                  <h3
                    onClick={() => {
                      void navigate(`/app/innovation/problems/${problem.id}`);
                    }}
                    className="text-lg font-bold text-foreground leading-snug tracking-tight cursor-pointer hover:text-primary transition-colors"
                  >
                    {problem.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                    {problem.description}
                  </p>
                </div>

                {/* Formulated Challenge Link if available */}
                <div
                  onClick={() => {
                    void navigate(`/app/innovation/problems/${problem.id}`);
                  }}
                  className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-1.5 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                    <span>Innovation Challenge Formulation</span>
                    {problem.challengeStatus ? (
                      <span className="text-primary font-semibold">{problem.challengeStatus}</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Pending Formulation</span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-foreground truncate">
                    {problem.challengeTitle || "Challenge statement not yet formulated for this problem."}
                  </p>
                </div>

                {/* KPI Metrics Mini-strip */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs py-2 px-3 bg-muted/20 rounded-xl border border-border/60">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Institutions
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {problem.institutionsSelectedCount}
                    </span>
                    <span className="text-[9px] text-muted-foreground block">
                      {problem.institutionsAcceptedCount} accepted
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Projects
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {problem.projectsCount}
                    </span>
                    <span className="text-[9px] text-muted-foreground block">
                      {problem.teamsFormedCount} staffed
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Proposals
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {problem.proposalsCount}
                    </span>
                    <span className="text-[9px] text-muted-foreground block">
                      {problem.proposalsApprovedCount} approved
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Stage
                    </span>
                    <span className="font-bold text-foreground text-xs truncate block mt-0.5">
                      {problem.stageLabel.split("—")[0].trim()}
                    </span>
                    <span className="text-[9px] text-primary block truncate">
                      Step {problem.stage.includes("APPROVED") ? 10 : problem.stage.includes("PROPOSAL") ? 8 : 4} of 10
                    </span>
                  </div>
                </div>

                {/* Needs action reason if applicable */}
                {problem.needsActionReason && (
                  <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="font-semibold">{problem.needsActionReason}</span>
                    </div>
                    {problem.proposalsAwaitingReviewCount > 0 && (
                      <span
                        onClick={() => {
                          void navigate(`/app/innovation/problems/${problem.id}`);
                        }}
                        className="text-[10px] font-bold text-amber-800 underline cursor-pointer hover:text-amber-950"
                      >
                        Review Now
                      </span>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {problem.lastActivityDescription}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        void navigate(`/app/innovation/problems/${problem.id}`);
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-sm h-8 px-3"
                    >
                      <span>Open Problem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
