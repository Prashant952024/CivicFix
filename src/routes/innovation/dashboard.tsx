import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Filter,
  Flame,
  Globe,
  GraduationCap,
  Layers,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchInnovationDashboardData,
  searchInnovationRecords,
  type AttentionItem,
  type InnovationDashboardData,
  type InnovationSearchResult,
} from "@/lib/innovation";

type AttentionFilter = "ALL" | "CRITICAL" | "PROPOSALS" | "PILOTS_VALIDATIONS" | "BLOCKERS_MILESTONES" | "PROBLEMS";

function getAttentionToneBadge(tone: AttentionItem["badgeTone"]) {
  switch (tone) {
    case "danger":
      return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800";
    case "warning":
      return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800";
    case "purple":
      return "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800";
    case "teal":
      return "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-800";
    case "emerald":
      return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800";
    case "info":
    default:
      return "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800";
  }
}

export function InnovationDashboardPage() {
  const navigate = useNavigate();
  const goTo = (path: string) => { void navigate(path); };

  const [data, setData] = useState<InnovationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Attention Center Filter
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("ALL");

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<InnovationSearchResult | null>(null);

  // Load dashboard data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchInnovationDashboardData();
        if (cancelled) return;
        setData(result);
        setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch (err: unknown) {
        if (!cancelled) {
          if (import.meta.env.DEV) console.error("Innovation dashboard fetch error:", err);
          setError(err instanceof Error ? err.message : "Unable to load innovation operations data.");
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

  // Live global search debounce
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setIsSearching(true);
      void searchInnovationRecords(query)
        .then((results) => {
          if (!cancelled) {
            setSearchResults(results);
          }
        })
        .catch((err) => {
          if (import.meta.env.DEV) console.error("Search error:", err);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const hasSearchResults =
    searchResults &&
    (searchResults.challenges.length > 0 ||
      searchResults.institutions.length > 0 ||
      searchResults.projects.length > 0 ||
      searchResults.proposals.length > 0 ||
      (searchResults.knowledgeSolutions && searchResults.knowledgeSolutions.length > 0));

  // Filtered attention queue items
  const filteredAttentionItems = useMemo(() => {
    if (!data?.actionRequired.attentionItems) return [];
    const items = data.actionRequired.attentionItems;
    switch (attentionFilter) {
      case "CRITICAL":
        return items.filter((i) => i.urgency === "CRITICAL");
      case "PROPOSALS":
        return items.filter((i) => i.category === "PROPOSAL");
      case "PILOTS_VALIDATIONS":
        return items.filter((i) => i.category === "PILOT_PLAN" || i.category === "PILOT_VALIDATION" || i.category === "DEPLOYMENT_PLAN" || i.category === "IMPACT_REPORT");
      case "BLOCKERS_MILESTONES":
        return items.filter((i) => i.category === "BLOCKER" || i.category === "OVERDUE_MILESTONE");
      case "PROBLEMS":
        return items.filter((i) => i.category === "UNFORMULATED_PROBLEM" || i.category === "INVITATION" || i.category === "REUSE_REVIEW");
      case "ALL":
      default:
        return items;
    }
  }, [data?.actionRequired.attentionItems, attentionFilter]);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* ========================================================================= */}
      {/* SECTION A — GLOBAL HEADER, WELCOME & LIVE SEARCH */}
      {/* ========================================================================= */}
      <div className="space-y-4 border-b border-border/80 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Innovation Operations Center
              </h1>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-800">
                Live State Machine
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                Municipal Governance
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Authoritative municipal innovation command deck: oversee complex problem lifecycles, university partnerships, research milestones, pilot validations, and deployment rollouts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {lastRefreshedAt && (
              <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                Updated {lastRefreshedAt}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="text-xs gap-1.5 h-8.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => goTo("/app/innovation/proposals")}
              className="bg-primary text-primary-foreground text-xs gap-1.5 h-8.5 shadow-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Proposals Hub</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => goTo("/app/innovation/pilots")}
              className="text-xs gap-1.5 h-8.5 font-semibold"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Pilots Hub</span>
            </Button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search challenges, universities, projects, research proposals, solution knowledge..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setSearchResults(null);
                }
              }}
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl border border-border bg-card text-foreground shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown Overlay */}
          {searchQuery.trim().length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-border bg-card/95 backdrop-blur-md max-h-[70vh] overflow-y-auto">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Registry Matches for &ldquo;{searchQuery}&rdquo;
                  </span>
                  <span className="text-[11px] text-muted-foreground">Click item to navigate</span>
                </div>

                {isSearching ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching across innovation records...</span>
                  </div>
                ) : !hasSearchResults ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No matching challenges, institutions, projects, proposals, or solutions found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Matching Proposals */}
                    {searchResults.proposals.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Research Proposals ({searchResults.proposals.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.proposals.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSearchQuery("");
                                setSearchResults(null);
                                goTo(`/app/innovation/proposals/${p.id}`);
                              }}
                              className="p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{p.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{p.institutionName}</p>
                              </div>
                              <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                                v{p.versionNumber} • {p.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Challenges */}
                    {searchResults.challenges.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                          <Rocket className="w-3.5 h-3.5" /> Innovation Challenges ({searchResults.challenges.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.challenges.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSearchQuery("");
                                setSearchResults(null);
                                goTo(`/app/innovation/problems/${c.id}`);
                              }}
                              className="p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{c.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{c.category}</p>
                              </div>
                              <span className="text-[10px] font-semibold text-primary">Open →</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Projects */}
                    {searchResults.projects.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" /> Research Projects ({searchResults.projects.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.projects.map((proj) => (
                            <div
                              key={proj.id}
                              onClick={() => {
                                setSearchQuery("");
                                setSearchResults(null);
                                goTo(`/app/innovation/projects/${proj.id}`);
                              }}
                              className="p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{proj.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{proj.institutionName}</p>
                              </div>
                              <span className="text-[10px] font-semibold text-primary">Workspace →</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Institutions */}
                    {searchResults.institutions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5" /> Accredited Institutions ({searchResults.institutions.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.institutions.map((i) => (
                            <div
                              key={i.id}
                              onClick={() => {
                                setSearchQuery("");
                                setSearchResults(null);
                                goTo(`/app/innovation/institutions?selected=${i.id}`);
                              }}
                              className="p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{i.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {i.city}, {i.state} {i.acronym ? `(${i.acronym})` : ""}
                                </p>
                              </div>
                              <span className="text-[10px] font-semibold text-primary">View →</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Knowledge Base Solutions */}
                    {searchResults.knowledgeSolutions && searchResults.knowledgeSolutions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" /> Knowledge Base Solutions ({searchResults.knowledgeSolutions.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.knowledgeSolutions.map((k) => (
                            <div
                              key={k.id}
                              onClick={() => {
                                setSearchQuery("");
                                setSearchResults(null);
                                goTo("/app/innovation/knowledge");
                              }}
                              className="p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{k.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {k.category} • {k.universityName}
                                </p>
                              </div>
                              <span className="text-[10px] font-semibold text-primary">Knowledge Hub →</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-2 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRefreshNonce((v) => v + 1)} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B — NEEDS YOUR ATTENTION (THE ATTENTION CENTER) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground uppercase flex items-center gap-2">
              <span>Needs Your Attention</span>
              <Badge variant="outline" className="font-mono text-xs px-2 py-0">
                {data?.actionRequired.attentionItems.length ?? 0}
              </Badge>
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Authoritative Innovation Manager action items across all 10 stages
          </span>
        </div>

        {/* 4 Priority Headline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Research Proposals */}
          <div
            onClick={() => goTo("/app/innovation/proposals?status=SUBMITTED")}
            className="p-4.5 rounded-2xl border border-border bg-card shadow-xs hover:border-sky-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  Research Proposals
                </span>
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground tracking-tight">
                  {loading ? "..." : data?.actionRequired.proposalsAwaitingReviewCount ?? 0}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">awaiting review</span>
              </div>
              {data && data.actionRequired.resubmittedCount > 0 && (
                <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 mt-1">
                  ★ {data.actionRequired.resubmittedCount} resubmitted revision
                </p>
              )}
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs font-bold text-primary group-hover:text-primary/80">
              <span>Review Proposals</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Critical Blockers & Risks */}
          <div
            onClick={() => setAttentionFilter("BLOCKERS_MILESTONES")}
            className="p-4.5 rounded-2xl border border-border bg-card shadow-xs hover:border-rose-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  Execution Blockers
                </span>
                {(data?.actionRequired.criticalBlockersCount ?? 0) > 0 && (
                  <Flame className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground tracking-tight">
                  {loading ? "..." : data?.actionRequired.criticalBlockersCount ?? 0}
                </span>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">critical / high</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {data?.actionRequired.overdueMilestonesCount ?? 0} research milestones overdue
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-300">
              <span>Inspect Blockers</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Pilot Validations & Scale */}
          <div
            onClick={() => goTo("/app/innovation/pilots")}
            className="p-4.5 rounded-2xl border border-border bg-card shadow-xs hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  Pilot Validations
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground tracking-tight">
                  {loading ? "..." : data?.actionRequired.validationsAwaitingReviewCount ?? 0}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">signoffs pending</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {data?.actionRequired.deploymentsAwaitingReviewCount ?? 0} scale authorizations pending
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
              <span>Evaluate Pilots</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Unformulated Complex Problems */}
          <div
            onClick={() => goTo("/app/innovation/problems")}
            className="p-4.5 rounded-2xl border border-border bg-card shadow-xs hover:border-amber-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  Complex Problems
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground tracking-tight">
                  {loading ? "..." : data?.actionRequired.unformulatedIssuesCount ?? 0}
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">unformulated</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {data?.actionRequired.pendingInvitationsCount ?? 0} university match invitations pending
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300">
              <span>Formulate Challenges</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Detailed Action Item Stream with Filters */}
        <Card className="border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-muted/10">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Action Queue ({filteredAttentionItems.length})
              </CardTitle>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                size="sm"
                variant={attentionFilter === "ALL" ? "default" : "outline"}
                onClick={() => setAttentionFilter("ALL")}
                className="text-[11px] h-7 px-2.5 rounded-lg"
              >
                All ({data?.actionRequired.attentionItems.length ?? 0})
              </Button>
              <Button
                size="sm"
                variant={attentionFilter === "CRITICAL" ? "default" : "outline"}
                onClick={() => setAttentionFilter("CRITICAL")}
                className="text-[11px] h-7 px-2.5 rounded-lg text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
              >
                Urgent ({data?.actionRequired.attentionItems.filter((i) => i.urgency === "CRITICAL").length ?? 0})
              </Button>
              <Button
                size="sm"
                variant={attentionFilter === "PROPOSALS" ? "default" : "outline"}
                onClick={() => setAttentionFilter("PROPOSALS")}
                className="text-[11px] h-7 px-2.5 rounded-lg"
              >
                Proposals ({data?.actionRequired.proposalsAwaitingReviewCount ?? 0})
              </Button>
              <Button
                size="sm"
                variant={attentionFilter === "PILOTS_VALIDATIONS" ? "default" : "outline"}
                onClick={() => setAttentionFilter("PILOTS_VALIDATIONS")}
                className="text-[11px] h-7 px-2.5 rounded-lg"
              >
                Pilots & Scale
              </Button>
              <Button
                size="sm"
                variant={attentionFilter === "BLOCKERS_MILESTONES" ? "default" : "outline"}
                onClick={() => setAttentionFilter("BLOCKERS_MILESTONES")}
                className="text-[11px] h-7 px-2.5 rounded-lg"
              >
                Blockers & Milestones
              </Button>
              <Button
                size="sm"
                variant={attentionFilter === "PROBLEMS" ? "default" : "outline"}
                onClick={() => setAttentionFilter("PROBLEMS")}
                className="text-[11px] h-7 px-2.5 rounded-lg"
              >
                Problems & Outreach
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
                <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
              </div>
            ) : filteredAttentionItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-foreground">No Action Items Pending in this Filter</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  All active innovation tracks in this category are operating smoothly.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAttentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] font-bold ${getAttentionToneBadge(item.badgeTone)}`}>
                          {item.badgeLabel}
                        </Badge>
                        {item.urgency === "CRITICAL" && (
                          <Badge variant="danger" className="text-[9px] font-bold uppercase tracking-wider">
                            Urgent
                          </Badge>
                        )}
                        {item.elapsedTime && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {item.elapsedTime}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      </div>

                      {item.contextInfo && (
                        <p className="text-[10px] font-medium text-primary/90 dark:text-primary/80 line-clamp-1">
                          {item.contextInfo}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => goTo(item.route)}
                      className="text-xs font-semibold gap-1.5 h-8 shrink-0 self-end md:self-auto bg-primary text-primary-foreground shadow-2xs"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ========================================================================= */}
      {/* SECTION C — 10-STAGE CIVIC INNOVATION PIPELINE INTERACTIVE MAP */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>10-Stage Innovation Pipeline Overview</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              End-to-end municipal state machine from citizen problem discovery to institutional knowledge reuse
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 overflow-x-auto">
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 min-w-[900px] lg:min-w-0">
            {/* Stage 1: Complex Problems */}
            <div
              onClick={() => goTo("/app/innovation/problems")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                1. Problems
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.complexIssuesCount ?? 0}
              </p>
              <span className="text-[10px] text-primary font-semibold mt-1">Classified →</span>
            </div>

            {/* Stage 2: Challenges Formulated */}
            <div
              onClick={() => goTo("/app/innovation/problems")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                2. Challenges
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.challengesCount ?? 0}
              </p>
              <span className="text-[10px] text-primary font-semibold mt-1">Formulated →</span>
            </div>

            {/* Stage 3: Matching Active */}
            <div
              onClick={() => goTo("/app/innovation/problems")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                3. Matching
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.matchingActiveCount ?? 0}
              </p>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-1">Outreach →</span>
            </div>

            {/* Stage 4: Proposals Awaiting Review */}
            <div
              onClick={() => goTo("/app/innovation/proposals")}
              className="p-3 rounded-xl border-2 border-primary/50 bg-primary/5 dark:bg-primary/10 hover:bg-primary/15 cursor-pointer transition flex flex-col justify-between shadow-2xs"
            >
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                4. Proposals
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.proposalsAwaitingReviewCount ?? 0}
              </p>
              <span className="text-[10px] text-primary font-bold mt-1">Review ★</span>
            </div>

            {/* Stage 5: Research Execution */}
            <div
              onClick={() => goTo("/app/innovation/proposals")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                5. Research
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.projectsActiveCount ?? 0}
              </p>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold mt-1">Executing →</span>
            </div>

            {/* Stage 6: Pilot Planning */}
            <div
              onClick={() => goTo("/app/innovation/pilots")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                6. Pilot Plan
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.health.activePilotsCount ?? 0}
              </p>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">Planned →</span>
            </div>

            {/* Stage 7: Pilot Validation */}
            <div
              onClick={() => goTo("/app/innovation/pilots")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                7. Validation
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.validationsAwaitingReviewCount ?? 0}
              </p>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-1">Evidence →</span>
            </div>

            {/* Stage 8: Deployment Ready */}
            <div
              onClick={() => goTo("/app/innovation/pilots")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                8. Deployment
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.deploymentsActiveCount ?? 0}
              </p>
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold mt-1">Authorized →</span>
            </div>

            {/* Stage 9: Impact Monitoring */}
            <div
              onClick={() => goTo("/app/innovation/pilots")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                9. Impact
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.impactReportsPendingCount ?? 0}
              </p>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold mt-1">Telemetry →</span>
            </div>

            {/* Stage 10: Knowledge Hub */}
            <div
              onClick={() => goTo("/app/innovation/knowledge")}
              className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/30 hover:bg-emerald-500/10 cursor-pointer transition flex flex-col justify-between shadow-2xs"
            >
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                10. Knowledge
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {loading ? "..." : data?.pipeline.knowledgeSolutionsCount ?? 0}
              </p>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold mt-1">Published ✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION D — ACTIVE COMPLEX PROBLEMS CATALOG PREVIEW */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <span>Active Complex Civic Problems ({data?.challenges.length ?? 0})</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Formulated problem statements, matching outreach, and research progress
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo("/app/innovation/problems")}
            className="text-xs"
          >
            <span>Complex Problems Directory</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl border border-border bg-muted/20 animate-pulse" />
            <div className="h-44 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          </div>
        ) : !data?.challenges || data.challenges.length === 0 ? (
          <Card className="border-border shadow-xs">
            <CardContent className="py-8 text-center text-xs text-muted-foreground">
              No active innovation challenges have been formulated yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.challenges.slice(0, 4).map((c) => (
              <Card
                key={c.id}
                className="border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between bg-card"
              >
                <CardContent className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {c.category}
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800 text-[10px] font-bold">
                      Complexity {c.complexityScore}/100
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {c.problemStatement}
                    </p>
                  </div>

                  {/* Stage Progress Checklist */}
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                      <span>Research Progression</span>
                      <span className="text-primary font-mono text-[10px]">
                        {c.proposalsCount} proposals · {c.teamsCount} teams
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Formulated</span>
                      <span>·</span>
                      <span className={c.institutionsSelectedCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "opacity-60"}>
                        {c.institutionsSelectedCount > 0 ? `✓ ${c.institutionsSelectedCount} Selected` : "○ Selection"}
                      </span>
                      <span>·</span>
                      <span className={c.invitationsAcceptedCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "opacity-60"}>
                        {c.invitationsAcceptedCount > 0 ? `✓ ${c.invitationsAcceptedCount} Accepted` : "○ Pending"}
                      </span>
                      <span>·</span>
                      <span className={c.teamsCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "opacity-60"}>
                        {c.teamsCount > 0 ? `✓ Team Formed` : "○ Team"}
                      </span>
                      <span>·</span>
                      <span className={c.proposalsCount > 0 ? "text-sky-700 dark:text-sky-400 font-bold" : "opacity-60"}>
                        {c.proposalsCount > 0 ? `● ${c.proposalsCount} Proposal` : "○ Proposal"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">
                      Scope: {c.geographicScope}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => goTo(`/app/innovation/problems/${c.sourceIssueId || c.id}`)}
                      className="bg-primary text-primary-foreground text-xs gap-1 h-8 shadow-xs font-semibold"
                    >
                      <span>Problem Control Center</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION E — ACTIVE INNOVATION PROJECTS & WORKSPACES */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Active Innovation Workspaces ({data?.projects.length ?? 0})</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Institutional workspaces assembling research teams, executing milestones, and authoring proposals
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo("/app/innovation/proposals")}
            className="text-xs"
          >
            <span>All Workspaces</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 rounded-2xl border border-border bg-muted/20 animate-pulse" />
            <div className="h-40 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          </div>
        ) : !data?.projects || data.projects.length === 0 ? (
          <Card className="border-border shadow-xs">
            <CardContent className="py-8 text-center text-xs text-muted-foreground">
              No project workspaces have been initialized by participating universities yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.projects.slice(0, 4).map((p) => (
              <Card
                key={p.id}
                className="border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between bg-card"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {p.institutionName}
                      </Badge>
                      {p.proposalStatus ? (
                        <Badge
                          className={
                            p.proposalStatus === "APPROVED"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800 text-[10px]"
                              : p.proposalStatus === "SUBMITTED" || p.proposalStatus === "RESUBMITTED"
                              ? "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800 text-[10px] font-bold"
                              : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800 text-[10px]"
                          }
                        >
                          Proposal: {p.proposalStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] opacity-75">
                          Proposal Pending
                        </Badge>
                      )}
                      {(p.openBlockersCount ?? 0) > 0 && (
                        <Badge variant="danger" className="text-[9px] font-bold">
                          {p.openBlockersCount} blocker
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] text-muted-foreground font-mono">
                      {p.teamSize} members
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                      {p.projectTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      Challenge: {p.challengeTitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="text-muted-foreground truncate">
                      Lead: <strong className="text-foreground">{p.projectLeadName || "Assigned"}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {p.proposalId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => goTo(`/app/innovation/proposals/${p.proposalId}`)}
                          className="text-xs text-primary h-8"
                        >
                          Proposal
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goTo(`/app/innovation/projects/${p.id}`)}
                        className="text-xs gap-1 h-8 font-semibold"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION F — CONCRETE OPERATIONAL HEALTH & RISK PULSE */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Concrete Operational Health & Risk Pulse</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Fact-based operational metrics derived directly from real database states
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Panel 1: Research Execution */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Research Execution</span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Open Blockers</span>
                <span className="font-bold text-foreground">
                  {data?.health.openBlockersCount ?? 0} ({data?.health.criticalBlockersCount ?? 0} critical)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Overdue Milestones</span>
                <span className="font-bold text-foreground">{data?.health.overdueMilestonesCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Active Workspaces</span>
                <span className="font-bold text-foreground">{data?.pipeline.projectsActiveCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Panel 2: Pilot Operations */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Pilot Operations</span>
                <Rocket className="w-4 h-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Active Pilot Plans</span>
                <span className="font-bold text-foreground">{data?.health.activePilotsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Validations Pending Signoff</span>
                <span className="font-bold text-foreground">{data?.health.pendingValidationsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Validations Approved</span>
                <span className="font-bold text-foreground">{data?.pipeline.validationsAwaitingReviewCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Panel 3: Deployment Scale */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Deployment Fleet</span>
                <Globe className="w-4 h-4 text-teal-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Active Rollouts</span>
                <span className="font-bold text-foreground">{data?.health.activeDeploymentsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Telemetry Reports Pending</span>
                <span className="font-bold text-foreground">{data?.health.pendingImpactReportsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Authorizations Pending</span>
                <span className="font-bold text-foreground">{data?.actionRequired.deploymentsAwaitingReviewCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Panel 4: Knowledge Reusability */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Knowledge & Reuse</span>
                <BookOpen className="w-4 h-4 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Published Solutions</span>
                <span className="font-bold text-foreground">{data?.health.publishedKnowledgeSolutionsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground">Cross-City Reuse Reviews</span>
                <span className="font-bold text-foreground">{data?.health.pendingReuseReviewsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Partner Universities</span>
                <span className="font-bold text-foreground">{data?.institutions.length ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION G & INSTITUTIONAL PARTNERSHIPS DUAL GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Institutional Collaborations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span>Institutional Collaborations</span>
            </h2>
            <Link
              to="/app/innovation/institutions"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>All Universities</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="h-44 rounded-2xl border border-border bg-muted/20 animate-pulse" />
            ) : !data?.institutions || data.institutions.length === 0 ? (
              <div className="p-6 rounded-2xl border border-border text-center text-xs text-muted-foreground">
                No active institutional research collaborations found.
              </div>
            ) : (
              data.institutions.slice(0, 4).map((inst) => {
                const initials = inst.acronym || inst.name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={inst.id}
                    className="p-3.5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {inst.name} {inst.acronym ? `(${inst.acronym})` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium truncate flex items-center gap-1.5 mt-0.5">
                          <span>{inst.city}, {inst.state}</span>
                          <span>·</span>
                          <span className="font-semibold text-foreground">
                            {inst.activeProjectsCount} active {inst.activeProjectsCount === 1 ? "project" : "projects"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {inst.proposalsAwaitingReviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                          {inst.proposalsAwaitingReviewCount} review
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted/30">
                          {inst.proposalsCount} proposals
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goTo(`/app/innovation/institutions?selected=${inst.id}`)}
                        className="text-xs font-semibold h-8 rounded-xl"
                      >
                        Profile →
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION G — Recent Operations Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Recent Operations Activity</span>
            </h2>
            <span className="text-xs text-muted-foreground">Audit Stream</span>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="h-44 rounded-2xl border border-border bg-muted/20 animate-pulse" />
            ) : !data?.recentActivity || data.recentActivity.length === 0 ? (
              <div className="p-6 rounded-2xl border border-border text-center text-xs text-muted-foreground">
                No recent project activity events recorded yet.
              </div>
            ) : (
              data.recentActivity.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-foreground leading-snug">
                      {act.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Project: {act.projectTitle} {act.actorName ? `· by ${act.actorName}` : ""}
                    </p>
                  </div>

                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 whitespace-nowrap">
                    {act.elapsedTime}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION H — QUICK ACTIONS & NAVIGATION DOCK */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Quick Navigation Dock</span>
          </h2>
          <span className="text-xs text-muted-foreground">Fast shortcuts to dedicated workflow hubs</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => goTo("/app/innovation/problems")}
            className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xs transition text-left space-y-1.5 group"
          >
            <BrainCircuit className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Complex Problems</p>
            <p className="text-[10px] text-muted-foreground">Classify & formulate challenges</p>
          </button>

          <button
            type="button"
            onClick={() => goTo("/app/innovation/proposals")}
            className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xs transition text-left space-y-1.5 group"
          >
            <FileText className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Proposals Hub</p>
            <p className="text-[10px] text-muted-foreground">Review institutional research plans</p>
          </button>

          <button
            type="button"
            onClick={() => goTo("/app/innovation/pilots")}
            className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xs transition text-left space-y-1.5 group"
          >
            <Rocket className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Pilots & Validations</p>
            <p className="text-[10px] text-muted-foreground">Authorize field tests & evaluations</p>
          </button>

          <button
            type="button"
            onClick={() => goTo("/app/innovation/knowledge")}
            className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xs transition text-left space-y-1.5 group"
          >
            <BookOpen className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Knowledge Base</p>
            <p className="text-[10px] text-muted-foreground">Cross-city solution reuse</p>
          </button>

          <button
            type="button"
            onClick={() => goTo("/app/innovation/institutions")}
            className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xs transition text-left space-y-1.5 group"
          >
            <GraduationCap className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Universities Directory</p>
            <p className="text-[10px] text-muted-foreground">Accredited research partners</p>
          </button>
        </div>
      </section>
    </div>
  );
}

