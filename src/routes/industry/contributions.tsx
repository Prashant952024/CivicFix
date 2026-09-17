import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock,
  Coins,
  Cpu,
  Database,
  Eye,
  Grid,
  Handshake,
  Layers,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Store,
  Table as TableIcon,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IndustryContributionDetailDialog } from "@/components/marketplace/industry-contribution-detail-dialog";
import {
  fetchIndustryActiveContributionsData,
  PARTNER_STATUS_META,
  RESEARCH_STAGE_META,
  SUPPORT_CATEGORY_META,
  type IndustryActiveContributionItem,
  type IndustryActiveContributionsData,
} from "@/lib/marketplace";
import type {
  SupportRequestCategory,
} from "@/types/database";

type ViewMode = "cards" | "table";
type SortOption = "newest" | "oldest" | "title" | "institution" | "stage";

function getCategoryIcon(category: SupportRequestCategory) {
  switch (category) {
    case "FUNDING":
      return <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    case "HARDWARE":
      return <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    case "TECHNOLOGY":
      return <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
    case "EXPERTISE":
      return <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    case "INFRASTRUCTURE":
      return <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    case "DATA":
      return <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
    case "MANUFACTURING":
      return <Wrench className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
    default:
      return <Layers className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

export function IndustryContributionsPage() {
  const navigate = useNavigate();
  const { profile } = useAppSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [data, setData] = useState<IndustryActiveContributionsData | null>(null);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SupportRequestCategory | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [institutionFilter, setInstitutionFilter] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Detail Modal State
  const [selectedContribution, setSelectedContribution] = useState<IndustryActiveContributionItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchIndustryActiveContributionsData(profile);
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      console.error("Failed to load industry active contributions:", err);
      setError(err instanceof Error ? err.message : "Failed to load active contributions.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetchIndustryActiveContributionsData(profile);
        if (isMounted) {
          setData(res);
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to load industry active contributions:", err);
          setError(err instanceof Error ? err.message : "Failed to load active contributions.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    void init();
    return () => {
      isMounted = false;
    };
  }, [profile]);

  const organization = data?.organization;
  const metrics = data?.metrics ?? {
    activePartnershipsCount: 0,
    supportedProjectsCount: 0,
    supportedInstitutionsCount: 0,
    distinctCategoriesCount: 0,
    attentionRequiredCount: 0,
    categoryCounts: {
      ALL: 0,
      FUNDING: 0,
      HARDWARE: 0,
      TECHNOLOGY: 0,
      EXPERTISE: 0,
      INFRASTRUCTURE: 0,
      DATA: 0,
      MANUFACTURING: 0,
    },
  };

  const contributions = useMemo(() => data?.contributions ?? [], [data?.contributions]);

  // Distinct institutions for filtering
  const distinctInstitutions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contributions) {
      if (c.project?.institution?.id && c.project?.institution?.name) {
        map.set(c.project.institution.id, c.project.institution.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [contributions]);

  // Distinct research stages for filtering
  const distinctStages = useMemo(() => {
    const set = new Set<string>();
    for (const c of contributions) {
      if (c.project?.research_stage) {
        set.add(c.project.research_stage);
      }
    }
    return Array.from(set);
  }, [contributions]);

  // Distinct partnership statuses for filtering
  const distinctStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const c of contributions) {
      if (c.status) {
        set.add(c.status);
      }
    }
    return Array.from(set);
  }, [contributions]);

  // Filtered and Sorted Contributions
  const filteredContributions = useMemo(() => {
    return contributions
      .filter((item) => {
        // Category filter
        if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== "ALL" && item.status !== statusFilter) {
          return false;
        }

        // Stage filter
        if (stageFilter !== "ALL" && item.project?.research_stage !== stageFilter) {
          return false;
        }

        // Institution filter
        if (institutionFilter !== "ALL" && item.project?.institution?.id !== institutionFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const titleMatch = item.project?.project_title?.toLowerCase().includes(q) ?? false;
          const summaryMatch = item.project?.project_summary?.toLowerCase().includes(q) ?? false;
          const instMatch = item.project?.institution?.name?.toLowerCase().includes(q) ?? false;
          const challengeMatch = item.project?.challenge?.title?.toLowerCase().includes(q) ?? false;
          const contribMatch = item.contribution_summary?.toLowerCase().includes(q) ?? false;
          const notesMatch = item.notes?.toLowerCase().includes(q) ?? false;

          if (!titleMatch && !summaryMatch && !instMatch && !challengeMatch && !contribMatch && !notesMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "newest") {
          return new Date(b.started_at || b.created_at).getTime() - new Date(a.started_at || a.created_at).getTime();
        }
        if (sortOption === "oldest") {
          return new Date(a.started_at || a.created_at).getTime() - new Date(b.started_at || b.created_at).getTime();
        }
        if (sortOption === "title") {
          return (a.project?.project_title ?? "").localeCompare(b.project?.project_title ?? "");
        }
        if (sortOption === "institution") {
          return (a.project?.institution?.name ?? "").localeCompare(b.project?.institution?.name ?? "");
        }
        if (sortOption === "stage") {
          const stepA = a.project?.research_stage ? RESEARCH_STAGE_META[a.project.research_stage]?.step ?? 0 : 0;
          const stepB = b.project?.research_stage ? RESEARCH_STAGE_META[b.project.research_stage]?.step ?? 0 : 0;
          return stepB - stepA;
        }
        return 0;
      });
  }, [contributions, categoryFilter, statusFilter, stageFilter, institutionFilter, searchQuery, sortOption]);

  // Items requiring attention (e.g. status is ONBOARDING, or project is PAUSED, or has urgent update cadence)
  const attentionItems = useMemo(() => {
    return contributions.filter(
      (c) =>
        c.status === "ONBOARDING" ||
        c.project?.status === "PAUSED" ||
        c.project?.status === "FORMING_TEAM"
    );
  }, [contributions]);

  const handleOpenDetail = (contribution: IndustryActiveContributionItem) => {
    setSelectedContribution(contribution);
    setIsDetailOpen(true);
  };

  // Unlinked organization state
  if (!organization && !loading) {
    return (
      <div className="space-y-6 pb-16 max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] font-bold uppercase tracking-wider">
            Industry Partner Workspace
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Active Contributions
          </h1>
          <p className="text-sm text-muted-foreground">
            Research projects your organization is currently supporting across the CivicFix innovation ecosystem.
          </p>
        </div>

        <Card className="border-border bg-card shadow-sm max-w-lg mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <span className="p-3.5 rounded-2xl bg-muted text-muted-foreground inline-flex">
              <Building2 className="w-7 h-7" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">No Organization Linked</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your authenticated profile is not linked to an accredited Industry Partner organization. Please contact your civic platform administrator to associate your company profile.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void navigate("/app/industry/marketplace")}>
                Browse Marketplace
              </Button>
              <Button size="sm" onClick={() => void loadData()}>
                Retry Sync
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* ========================================================================= */}
      {/* SECTION A: HEADER & ORGANIZATION CONTEXT                                 */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5"
            >
              <Handshake className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
              Active Partner Collaborations
            </Badge>

            {organization && (
              <Badge
                variant={
                  organization.verification_status === "VERIFIED"
                    ? "success"
                    : organization.verification_status === "PENDING"
                    ? "warning"
                    : "outline"
                }
                className="text-[11px] font-semibold"
              >
                {organization.verification_status === "VERIFIED" && <ShieldCheck className="w-3 h-3 mr-1" />}
                {organization.verification_status}
              </Badge>
            )}

            <span className="text-xs text-muted-foreground hidden sm:inline">
              Live Sync: {lastRefreshed}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Link to="/app/industry/marketplace">
              <Button size="sm" variant="default" className="text-xs h-8 gap-1.5 font-semibold">
                <Store className="w-3.5 h-3.5" />
                <span>Explore Opportunities</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Active Contributions
            </h1>
            <p className="text-sm text-muted-foreground">
              Research projects your organization is currently supporting across the CivicFix innovation ecosystem.
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
            <Link to="/app/industry/applications">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                <Send className="w-3 h-3 mr-1" />
                My Applications
              </Button>
            </Link>
            <span className="text-border text-xs">•</span>
            <Link to="/app/industry/listings">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                <Layers className="w-3 h-3 mr-1" />
                My Support Listings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void loadData()} className="text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: REAL OVERVIEW METRICS                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Partnerships
              </span>
              <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? "…" : metrics.activePartnershipsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Formal active agreements</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Supported Projects
              </span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {loading ? "…" : metrics.supportedProjectsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Distinct research workspaces</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Partner Institutions
              </span>
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {loading ? "…" : metrics.supportedInstitutionsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Universities &amp; Labs</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Support Domains
              </span>
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {loading ? "…" : metrics.distinctCategoriesCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Categories contributed</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Attention Queue
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {loading ? "…" : metrics.attentionRequiredCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Onboarding or paused</p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: ACTIONABLE ATTENTION AREA                                      */}
      {/* ========================================================================= */}
      {attentionItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Collaboration Highlights &amp; Attention Queue ({attentionItems.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionItems.slice(0, 4).map((c) => {
              const catMeta = SUPPORT_CATEGORY_META[c.category];
              const partMeta = PARTNER_STATUS_META[c.status];
              const stageMeta = c.project?.research_stage ? RESEARCH_STAGE_META[c.project.research_stage] : null;

              return (
                <div
                  key={`att-item-${c.id}`}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {catMeta && (
                          <Badge variant={catMeta.badgeTone} className="text-[10px] font-semibold py-0">
                            {catMeta.label}
                          </Badge>
                        )}
                        {partMeta && (
                          <Badge variant={partMeta.badgeTone} className="text-[10px] font-bold py-0">
                            {partMeta.label}
                          </Badge>
                        )}
                      </div>

                      {stageMeta && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {stageMeta.shortLabel}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground line-clamp-1">
                      {c.project?.project_title ?? "Research Project"}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {c.contribution_summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {c.project?.institution?.name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetail(c)}
                      className="text-xs h-7 gap-1 font-semibold"
                    >
                      <span>Review Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: SEARCH, FILTERS, AND VIEW CONTROLS                             */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project, university, challenge, contribution..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Controls: Sorting & View Mode */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Project Title (A-Z)</option>
              <option value="institution">Institution (A-Z)</option>
              <option value="stage">Research Stage</option>
            </select>

            {/* View Switcher */}
            <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/30">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === "cards"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Card View"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dense Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              categoryFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
            }`}
          >
            All Categories ({contributions.length})
          </button>

          {(
            [
              "FUNDING",
              "HARDWARE",
              "TECHNOLOGY",
              "EXPERTISE",
              "INFRASTRUCTURE",
              "DATA",
              "MANUFACTURING",
            ] as SupportRequestCategory[]
          ).map((cat) => {
            const count = metrics.categoryCounts[cat] || 0;
            const isSelected = categoryFilter === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                }`}
              >
                {getCategoryIcon(cat)}
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Dropdowns (Status, Stage, Institution) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {distinctStatuses.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1 px-2 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="ALL">All Statuses</option>
                {distinctStatuses.map((st) => (
                  <option key={st} value={st}>
                    {PARTNER_STATUS_META[st]?.label || st}
                  </option>
                ))}
              </select>
            </div>
          )}

          {distinctStages.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium">Stage:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="py-1 px-2 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="ALL">All Stages</option>
                {distinctStages.map((stg) => (
                  <option key={stg} value={stg}>
                    {RESEARCH_STAGE_META[stg]?.shortLabel || stg}
                  </option>
                ))}
              </select>
            </div>
          )}

          {distinctInstitutions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium">Institution:</span>
              <select
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                className="py-1 px-2 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="ALL">All Institutions</option>
                {distinctInstitutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(categoryFilter !== "ALL" || statusFilter !== "ALL" || stageFilter !== "ALL" || institutionFilter !== "ALL" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter("ALL");
                setStatusFilter("ALL");
                setStageFilter("ALL");
                setInstitutionFilter("ALL");
                setSearchQuery("");
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-3 h-3" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION E: LISTINGS VIEWS (CARD GRID / DENSE TABLE)                       */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Card key={idx} className="border-border bg-card shadow-xs animate-pulse">
              <CardContent className="p-5 space-y-4">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-16 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContributions.length === 0 ? (
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-12 text-center space-y-3">
            <Handshake className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {contributions.length === 0
                  ? "No Active Contributions Yet"
                  : "No contributions match the selected filters"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                {contributions.length === 0
                  ? "When university research teams accept your support applications, your formal collaboration partnerships will appear here."
                  : "Try adjusting your search criteria or resetting your filters to see more supported projects."}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              {contributions.length === 0 ? (
                <Link to="/app/industry/marketplace">
                  <Button size="sm" className="text-xs font-semibold gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    <span>Discover Research Opportunities</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCategoryFilter("ALL");
                    setStatusFilter("ALL");
                    setStageFilter("ALL");
                    setInstitutionFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="text-xs"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContributions.map((c) => {
            const catMeta = SUPPORT_CATEGORY_META[c.category];
            const partMeta = PARTNER_STATUS_META[c.status] ?? {
              label: c.status,
              badgeTone: "info" as const,
            };
            const stageMeta = c.project?.research_stage
              ? RESEARCH_STAGE_META[c.project.research_stage]
              : null;

            return (
              <Card
                key={c.id}
                className="border-border bg-card shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-muted/40 border border-border inline-flex">
                        {getCategoryIcon(c.category)}
                      </span>
                      {catMeta && (
                        <Badge variant={catMeta.badgeTone} className="text-[10px] font-semibold py-0">
                          {catMeta.label}
                        </Badge>
                      )}
                    </div>

                    <Badge variant={partMeta.badgeTone} className="text-[10px] font-bold py-0">
                      {partMeta.label}
                    </Badge>
                  </div>

                  {/* Project Title & Context */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {c.project?.project_title ?? "Supported Research Project"}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{c.project?.institution?.name ?? "Partner Institution"}</span>
                    </p>
                    {c.project?.challenge?.title && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Challenge: <strong>{c.project.challenge.title}</strong>
                      </p>
                    )}
                  </div>

                  {/* Contribution Summary Block */}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Agreed Contribution:
                    </span>
                    <p className="text-foreground/90 font-medium line-clamp-2 leading-relaxed">
                      {c.contribution_summary}
                    </p>
                  </div>

                  {/* Research Stage Tracker */}
                  {stageMeta && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Research Stage:</span>
                        <Badge variant={stageMeta.badgeTone} className="text-[10px] py-0 font-bold">
                          {stageMeta.shortLabel}
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300 rounded-full"
                          style={{ width: `${Math.round((stageMeta.step / 11) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Onboarded: {new Date(c.started_at).toLocaleDateString()}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetail(c)}
                      className="text-xs h-7.5 gap-1 font-semibold"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Details</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Dense Table View */
        <Card className="border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Research Project</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Civic Challenge</th>
                  <th className="py-3 px-4">Contribution Scope</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Onboarded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredContributions.map((c) => {
                  const catMeta = SUPPORT_CATEGORY_META[c.category];
                  const partMeta = PARTNER_STATUS_META[c.status] ?? {
                    label: c.status,
                    badgeTone: "info" as const,
                  };
                  const stageMeta = c.project?.research_stage
                    ? RESEARCH_STAGE_META[c.project.research_stage]
                    : null;

                  return (
                    <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground max-w-[220px]">
                        <div className="line-clamp-1">{c.project?.project_title ?? "Project"}</div>
                      </td>
                      <td className="py-3 px-4 text-foreground/90 max-w-[160px]">
                        <div className="line-clamp-1">{c.project?.institution?.name ?? "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[180px]">
                        <div className="line-clamp-1">{c.project?.challenge?.title ?? "—"}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {catMeta && (
                            <Badge variant={catMeta.badgeTone} className="text-[10px] py-0">
                              {c.category}
                            </Badge>
                          )}
                          <span className="truncate text-foreground/90">{c.contribution_summary}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {stageMeta ? (
                          <Badge variant={stageMeta.badgeTone} className="text-[10px] py-0 font-bold">
                            {stageMeta.shortLabel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={partMeta.badgeTone} className="text-[10px] py-0 font-bold">
                          {partMeta.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {new Date(c.started_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(c)}
                          className="h-7 text-xs gap-1 font-semibold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SECTION F: DEEP-DIVE DETAIL DIALOG                                        */}
      {/* ========================================================================= */}
      <IndustryContributionDetailDialog
        contribution={selectedContribution}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
