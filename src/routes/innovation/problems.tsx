import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Layers,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Sparkles,
  X,
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

type QuickTabKey = "ALL" | "NEEDS_ACTION" | "FORMULATION" | "MATCHING_OUTREACH" | "RESEARCH" | "APPROVED";
type ViewMode = "grid" | "list";

const STAGE_STEP_MAP: Record<string, number> = {
  CLASSIFIED: 1,
  CHALLENGE_FORMULATED: 2,
  MATCHING: 3,
  INSTITUTIONS_SELECTED: 4,
  OUTREACH: 5,
  INSTITUTION_ACCEPTED: 6,
  PROJECT_CREATED: 7,
  TEAM_FORMATION: 8,
  RESEARCH_PROPOSAL: 9,
  PROPOSAL_APPROVED: 10,
};

export function InnovationProblemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [problems, setProblems] = useState<ComplexProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [quickTab, setQuickTab] = useState<QuickTabKey>(
    searchParams.get("action") === "true"
      ? "NEEDS_ACTION"
      : (searchParams.get("tab") as QuickTabKey) || "ALL"
  );
  const [stageFilter, setStageFilter] = useState(searchParams.get("stage") || "ALL");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "ALL");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "ACTION_REQUIRED");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
    const inFormulationCount = problems.filter(
      (p) => p.stage === "CLASSIFIED" || p.stage === "CHALLENGE_FORMULATED"
    ).length;
    const matchingOutreachCount = problems.filter(
      (p) => ["MATCHING", "INSTITUTIONS_SELECTED", "OUTREACH", "INSTITUTION_ACCEPTED"].includes(p.stage)
    ).length;
    const activeResearchCount = problems.filter(
      (p) => ["PROJECT_CREATED", "TEAM_FORMATION", "RESEARCH_PROPOSAL"].includes(p.stage)
    ).length;
    const totalApprovedProposals = problems.filter(
      (p) => p.stage === "PROPOSAL_APPROVED" || p.proposalsApprovedCount > 0
    ).length;
    const totalInstitutions = problems.reduce((acc, p) => acc + p.institutionsSelectedCount, 0);
    const totalProjects = problems.reduce((acc, p) => acc + p.projectsCount, 0);

    return {
      total,
      actionRequiredCount,
      inFormulationCount,
      matchingOutreachCount,
      activeResearchCount,
      totalApprovedProposals,
      totalInstitutions,
      totalProjects,
    };
  }, [problems]);

  // Filter and sort problems
  const filteredProblems = useMemo(() => {
    return problems
      .filter((p) => {
        // Quick Tab filtering
        if (quickTab === "NEEDS_ACTION" && !p.needsAction) return false;
        if (quickTab === "FORMULATION" && p.stage !== "CLASSIFIED" && p.stage !== "CHALLENGE_FORMULATED") return false;
        if (
          quickTab === "MATCHING_OUTREACH" &&
          !["MATCHING", "INSTITUTIONS_SELECTED", "OUTREACH", "INSTITUTION_ACCEPTED"].includes(p.stage)
        )
          return false;
        if (
          quickTab === "RESEARCH" &&
          !["PROJECT_CREATED", "TEAM_FORMATION", "RESEARCH_PROPOSAL"].includes(p.stage)
        )
          return false;
        if (quickTab === "APPROVED" && p.stage !== "PROPOSAL_APPROVED" && p.proposalsApprovedCount === 0)
          return false;

        // Stage Dropdown filter
        if (stageFilter !== "ALL" && p.stage !== stageFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;

        // Text search across Title, Description, Challenge, Geographic Scope, Category, ID
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchChal = p.challengeTitle ? p.challengeTitle.toLowerCase().includes(q) : false;
          const matchScope = p.geographicScope.toLowerCase().includes(q);
          const matchCategory = p.category ? p.category.toLowerCase().includes(q) : false;
          const matchId =
            p.id.toLowerCase().includes(q) || (p.challengeId ? p.challengeId.toLowerCase().includes(q) : false);

          if (!matchTitle && !matchDesc && !matchChal && !matchScope && !matchCategory && !matchId) {
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
  }, [problems, quickTab, stageFilter, categoryFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    quickTab !== "ALL" ||
    stageFilter !== "ALL" ||
    categoryFilter !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setQuickTab("ALL");
    setStageFilter("ALL");
    setCategoryFilter("ALL");
  };

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case "PROPOSAL_APPROVED":
        return "success";
      case "RESEARCH_PROPOSAL":
      case "PROJECT_CREATED":
      case "TEAM_FORMATION":
        return "research";
      case "OUTREACH":
      case "MATCHING":
      case "INSTITUTIONS_SELECTED":
      case "INSTITUTION_ACCEPTED":
        return "sky";
      case "CHALLENGE_FORMULATED":
        return "innovation";
      case "CLASSIFIED":
      default:
        return "attention";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        variant="innovation"
        title="Complex Civic Problems"
        description="Primary operational directory for managing complex municipal challenges, multi-institutional university research partnerships, and proposal governance."
        backHref="/app/innovation"
        backLabel="Innovation Hub"
        tag="Innovation Directory"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="gap-1.5 text-xs rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Pipeline</span>
            </Button>
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-xs text-destructive flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefreshNonce((v) => v + 1)}
            className="text-xs h-8 shrink-0 rounded-xl border-destructive/30 hover:bg-destructive/10"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 2. Global Pipeline Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Complex Problems */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-stat-label block">Total Problems</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-foreground font-mono">
              {loading ? "—" : summaryMetrics.total}
            </p>
            <span className="text-meta mt-0.5 block text-muted-foreground">In active pipeline</span>
          </div>
        </div>

        {/* Needs Attention */}
        <div
          onClick={() => setQuickTab(quickTab === "NEEDS_ACTION" ? "ALL" : "NEEDS_ACTION")}
          className={`p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer shadow-xs select-none flex flex-col justify-between ${
            quickTab === "NEEDS_ACTION"
              ? "border-amber-400 bg-amber-500/10 ring-2 ring-amber-500/30"
              : summaryMetrics.actionRequiredCount > 0
              ? "border-amber-400/80 bg-amber-500/5 hover:border-amber-400 hover:bg-amber-500/10"
              : "border-border/80 bg-card hover:bg-muted/20"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setQuickTab(quickTab === "NEEDS_ACTION" ? "ALL" : "NEEDS_ACTION");
            }
          }}
          aria-pressed={quickTab === "NEEDS_ACTION"}
          aria-label="Filter problems requiring action"
        >
          <div className="flex items-center justify-between">
            <span className="text-stat-label text-amber-700 dark:text-amber-400 font-bold block">
              Needs Attention
            </span>
            {summaryMetrics.actionRequiredCount > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 font-mono">
              {loading ? "—" : summaryMetrics.actionRequiredCount}
            </p>
            <span className="text-meta font-medium text-amber-600 dark:text-amber-500 mt-0.5 block">
              {quickTab === "NEEDS_ACTION" ? "Filtered view active" : "Governance decision required"}
            </span>
          </div>
        </div>

        {/* In Formulation */}
        <div
          onClick={() => setQuickTab(quickTab === "FORMULATION" ? "ALL" : "FORMULATION")}
          className={`p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer shadow-xs select-none flex flex-col justify-between ${
            quickTab === "FORMULATION"
              ? "border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-500/30"
              : "border-border/80 bg-card hover:bg-muted/20"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setQuickTab(quickTab === "FORMULATION" ? "ALL" : "FORMULATION");
            }
          }}
          aria-label="Filter problems in formulation"
        >
          <div className="flex items-center justify-between">
            <span className="text-stat-label block">In Formulation</span>
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-foreground font-mono">
              {loading ? "—" : summaryMetrics.inFormulationCount}
            </p>
            <span className="text-meta mt-0.5 block text-muted-foreground">Scoping challenge statements</span>
          </div>
        </div>

        {/* Active Research Projects */}
        <div
          onClick={() => setQuickTab(quickTab === "RESEARCH" ? "ALL" : "RESEARCH")}
          className={`p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer shadow-xs select-none flex flex-col justify-between ${
            quickTab === "RESEARCH"
              ? "border-sky-400 bg-sky-500/10 ring-2 ring-sky-500/30"
              : "border-border/80 bg-card hover:bg-muted/20"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setQuickTab(quickTab === "RESEARCH" ? "ALL" : "RESEARCH");
            }
          }}
          aria-label="Filter problems in research"
        >
          <div className="flex items-center justify-between">
            <span className="text-stat-label block">Active Projects</span>
            <Building2 className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-foreground font-mono">
              {loading ? "—" : summaryMetrics.totalProjects}
            </p>
            <span className="text-meta mt-0.5 block text-muted-foreground">
              {summaryMetrics.totalInstitutions} institutions participating
            </span>
          </div>
        </div>

        {/* Approved Solutions */}
        <div
          onClick={() => setQuickTab(quickTab === "APPROVED" ? "ALL" : "APPROVED")}
          className={`p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer shadow-xs select-none flex flex-col justify-between ${
            quickTab === "APPROVED"
              ? "border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-500/30"
              : "border-border/80 bg-card hover:bg-muted/20"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setQuickTab(quickTab === "APPROVED" ? "ALL" : "APPROVED");
            }
          }}
          aria-label="Filter problems with approved solutions"
        >
          <div className="flex items-center justify-between">
            <span className="text-stat-label text-emerald-700 dark:text-emerald-400 font-bold block">
              Approved Solutions
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {loading ? "—" : summaryMetrics.totalApprovedProposals}
            </p>
            <span className="text-meta font-medium text-emerald-600 dark:text-emerald-500 mt-0.5 block">
              Ready for pilot & scale-up
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter, Search & View Toolbar */}
      <Card className="border-border/80 bg-card/90 shadow-xs backdrop-blur-sm">
        <CardContent className="p-4 space-y-3.5">
          {/* Top Row: Search Input, Stage Dropdown, Category Dropdown, Sort, View Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search problem title, challenge, category, scope, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-9 text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                aria-label="Search complex problems"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search query"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
                aria-label="Filter by category"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Exact Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
                aria-label="Filter by workflow stage"
              >
                <option value="ALL">All Pipeline Stages</option>
                <option value="CLASSIFIED">1. Classified Complex</option>
                <option value="CHALLENGE_FORMULATED">2. Challenge Formulated</option>
                <option value="MATCHING">3. Matching Active</option>
                <option value="INSTITUTIONS_SELECTED">4. Institutions Selected</option>
                <option value="OUTREACH">5. Invitations Dispatched</option>
                <option value="INSTITUTION_ACCEPTED">6. Institution Accepted</option>
                <option value="PROJECT_CREATED">7. Project Created</option>
                <option value="TEAM_FORMATION">8. Research Team Formed</option>
                <option value="RESEARCH_PROPOSAL">9. Proposal Underway</option>
                <option value="PROPOSAL_APPROVED">10. Proposal Approved</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
                aria-label="Sort problems"
              >
                <option value="ACTION_REQUIRED">Sort: Needs Action First</option>
                <option value="RECENT_ACTIVITY">Sort: Most Recent Activity</option>
                <option value="HIGHEST_COMPLEXITY">Sort: Highest Complexity</option>
                <option value="MOST_INSTITUTIONS">Sort: Most Institutions</option>
                <option value="MOST_PROJECTS">Sort: Most Projects</option>
                <option value="OLDEST_FIRST">Sort: Oldest First</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center rounded-xl border border-input bg-background p-0.5 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "hover:text-foreground"
                  }`}
                  aria-label="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "hover:text-foreground"
                  }`}
                  aria-label="List View"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Quick Filter Tabs & Active Filter Reset */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { id: "ALL", label: `All Problems (${summaryMetrics.total})` },
                {
                  id: "NEEDS_ACTION",
                  label: `Needs Action (${summaryMetrics.actionRequiredCount})`,
                  urgent: summaryMetrics.actionRequiredCount > 0,
                },
                { id: "FORMULATION", label: `Formulation (${summaryMetrics.inFormulationCount})` },
                { id: "MATCHING_OUTREACH", label: `Outreach (${summaryMetrics.matchingOutreachCount})` },
                { id: "RESEARCH", label: `Research (${summaryMetrics.activeResearchCount})` },
                { id: "APPROVED", label: `Approved (${summaryMetrics.totalApprovedProposals})` },
              ].map((tab) => {
                const isActive = quickTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQuickTab(tab.id as QuickTabKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : tab.urgent
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                        : "bg-surface/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-surface"
                    }`}
                  >
                    {tab.urgent && !isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 shrink-0"
              >
                <X className="h-3.5 w-3.5" /> Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Problem Directory Views */}
      {loading ? (
        /* Loading Skeleton */
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-border/70 bg-card p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 bg-muted rounded-md" />
                  <div className="h-5 w-28 bg-muted rounded-md" />
                </div>
                <div className="h-6 w-3/4 bg-muted rounded-md" />
                <div className="h-12 w-full bg-muted/60 rounded-md" />
                <div className="h-16 w-full bg-muted/40 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 w-full bg-muted/40 rounded-xl" />
            ))}
          </div>
        )
      ) : filteredProblems.length === 0 ? (
        /* Empty State */
        <EmptyState
          title={hasActiveFilters ? "No Complex Problems Match Your Filters" : "No Complex Problems Registered"}
          description={
            hasActiveFilters
              ? "Try adjusting your search criteria, selecting a different pipeline tab, or resetting all filters."
              : "As municipal citizen grievances are classified as complex societal challenges, they will populate this operational directory."
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="rounded-xl text-xs">
                Reset All Filters
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "grid" ? (
        /* Grid View: Aligned Problem Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProblems.map((problem) => (
            <Card
              key={problem.id}
              className={`rounded-2xl border transition-all duration-200 ease-out shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                problem.needsAction
                  ? "border-amber-400/70 bg-gradient-to-br from-amber-500/5 via-card to-card"
                  : "border-border/80 bg-card hover:border-primary/50"
              }`}
            >
              <CardContent className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Level 1: Category, Scope, AI Advisory Complexity, Stage Badge */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" size="sm" className="font-semibold">
                        {problem.category}
                      </Badge>
                      <Badge variant="research" size="sm" className="gap-1">
                        <Globe className="h-3 w-3" />
                        {problem.geographicScope}
                      </Badge>
                      <Badge variant="outline" size="sm" className="text-muted-foreground font-mono">
                        AI Advisory • Score: {problem.complexityScore}/100
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant={getStageBadgeVariant(problem.stage)} size="sm">
                        {problem.stageLabel}
                      </Badge>
                      {problem.needsAction && (
                        <Badge variant="critical" size="sm" className="animate-pulse">
                          Action Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Level 2: Problem Title & Description */}
                  <div className="space-y-1">
                    <h3
                      onClick={() => {
                        void navigate(`/app/innovation/problems/${problem.id}`);
                      }}
                      className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {problem.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>

                  {/* Level 3: Formulated Challenge Statement Block */}
                  <div
                    onClick={() => {
                      void navigate(`/app/innovation/problems/${problem.id}`);
                    }}
                    className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                      <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                        Innovation Challenge Statement
                      </span>
                      {problem.challengeStatus ? (
                        <Badge variant="outline" className="text-[9px] font-mono py-0">
                          {problem.challengeStatus}
                        </Badge>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                          Pending Formulation
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-foreground truncate">
                      {problem.challengeTitle || "Challenge statement not yet formulated for this civic problem."}
                    </p>
                  </div>

                  {/* Level 4: Collaboration & Proposal Metrics Strip */}
                  <div className="grid grid-cols-4 gap-2 text-center py-2.5 px-3 bg-muted/15 rounded-xl border border-border/50">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Institutions
                      </span>
                      <span className="font-bold text-foreground text-sm font-mono block">
                        {problem.institutionsSelectedCount}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {problem.institutionsAcceptedCount} accepted
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Projects
                      </span>
                      <span className="font-bold text-foreground text-sm font-mono block">
                        {problem.projectsCount}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {problem.teamsFormedCount} staffed
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Proposals
                      </span>
                      <span className="font-bold text-foreground text-sm font-mono block">
                        {problem.proposalsCount}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {problem.proposalsApprovedCount} approved
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Pipeline
                      </span>
                      <span className="font-bold text-foreground text-xs block truncate mt-0.5">
                        Step {STAGE_STEP_MAP[problem.stage] ?? 1}/10
                      </span>
                      <span className="text-[10px] text-primary block truncate font-semibold">
                        {problem.stageLabel.split("—")[0].trim()}
                      </span>
                    </div>
                  </div>

                  {/* Needs Action Reason Alert Banner */}
                  {problem.needsActionReason && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                        <span className="font-semibold truncate">{problem.needsActionReason}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigate(`/app/innovation/problems/${problem.id}`);
                        }}
                        className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 shrink-0 cursor-pointer"
                      >
                        Action →
                      </button>
                    </div>
                  )}
                </div>

                {/* Level 5: Footer Actions & Last Activity */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                  <span className="text-meta text-muted-foreground flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{problem.lastActivityDescription}</span>
                  </span>

                  <Button
                    size="sm"
                    onClick={() => {
                      void navigate(`/app/innovation/problems/${problem.id}`);
                    }}
                    className="text-xs font-bold gap-1.5 shadow-xs h-8 px-3 rounded-xl shrink-0"
                  >
                    <span>Open Control Center</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List / Table View: High-Density Rapid Scanning */
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Problem Statement & Scope</th>
                  <th className="py-3 px-3">Challenge Formulation</th>
                  <th className="py-3 px-3">Pipeline Stage</th>
                  <th className="py-3 px-3 text-center">Partners & Stats</th>
                  <th className="py-3 px-3">Attention State</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-sans">
                {filteredProblems.map((problem) => (
                  <tr
                    key={problem.id}
                    className={`hover:bg-muted/10 transition-colors ${
                      problem.needsAction ? "bg-amber-500/5" : ""
                    }`}
                  >
                    {/* Problem Statement & Scope */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="outline" size="sm" className="text-[9px] py-0">
                          {problem.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Globe className="h-2.5 w-2.5" />
                          {problem.geographicScope}
                        </span>
                      </div>
                      <h4
                        onClick={() => void navigate(`/app/innovation/problems/${problem.id}`)}
                        className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-xs truncate"
                      >
                        {problem.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {problem.description}
                      </p>
                    </td>

                    {/* Challenge Formulation */}
                    <td className="py-3.5 px-3 max-w-[220px]">
                      <div className="font-medium text-foreground text-xs truncate">
                        {problem.challengeTitle || "Pending Formulation"}
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        AI Complexity: {problem.complexityScore}/100
                      </span>
                    </td>

                    {/* Pipeline Stage */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Badge variant={getStageBadgeVariant(problem.stage)} size="sm">
                        {problem.stageLabel}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        {problem.lastActivityDescription.split("•")[1]?.trim() || "Active"}
                      </span>
                    </td>

                    {/* Partners & Stats */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-3 text-xs font-mono">
                        <div>
                          <span className="font-bold text-foreground">{problem.institutionsSelectedCount}</span>
                          <span className="text-[10px] text-muted-foreground block">Inst</span>
                        </div>
                        <div>
                          <span className="font-bold text-foreground">{problem.projectsCount}</span>
                          <span className="text-[10px] text-muted-foreground block">Proj</span>
                        </div>
                        <div>
                          <span className="font-bold text-foreground">{problem.proposalsCount}</span>
                          <span className="text-[10px] text-muted-foreground block">Prop</span>
                        </div>
                      </div>
                    </td>

                    {/* Attention State */}
                    <td className="py-3.5 px-3 max-w-[180px]">
                      {problem.needsAction ? (
                        <div className="space-y-0.5">
                          <Badge variant="critical" size="sm">
                            Action Required
                          </Badge>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                            {problem.needsActionReason}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">On Track</span>
                      )}
                    </td>

                    {/* Primary Action Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        onClick={() => void navigate(`/app/innovation/problems/${problem.id}`)}
                        className="text-xs h-7 px-2.5 rounded-lg font-bold gap-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
