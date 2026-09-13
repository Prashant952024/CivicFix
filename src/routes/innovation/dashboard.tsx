import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  RefreshCw,
  Rocket,
  Search,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchInnovationDashboardData,
  searchInnovationRecords,
  type InnovationDashboardData,
  type InnovationSearchResult,
} from "@/lib/innovation";

export function InnovationDashboardPage() {
  const navigate = useNavigate();
  const goTo = (path: string) => { void navigate(path); };

  const [data, setData] = useState<InnovationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

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
      searchResults.proposals.length > 0);

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* SECTION 1 — GLOBAL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Innovation Management
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-teal-50 text-teal-800 border-teal-200">
              Operations Center
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Manage complex civic challenges, institutional collaborations, research proposals and innovation projects.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {lastRefreshedAt && (
            <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">
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
            className="bg-primary text-primary-foreground text-xs gap-1.5 h-8.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Review Proposals</span>
          </Button>
        </div>
      </div>

      {/* GLOBAL SEARCH BAR */}
      <div className="relative">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search challenges, institutions, projects, proposals..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) {
                setSearchResults(null);
              }
            }}
            className="w-full pl-10 pr-10 py-3 text-sm rounded-2xl border border-border bg-card text-foreground shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/70"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  Search Results for &ldquo;{searchQuery}&rdquo;
                </span>
                <span className="text-[11px] text-muted-foreground">Press Escape or click outside to dismiss</span>
              </div>

              {isSearching ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Searching innovation registry...</div>
              ) : !hasSearchResults ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching challenges, institutions, projects, or proposals found.
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
                      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
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
                      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
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
                            <span className="text-[10px] font-semibold text-primary">Open Workspace →</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Institutions */}
                  {searchResults.institutions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
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
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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

      {/* SECTION 2 — "ACTION REQUIRED" (Prominent Top Priority Queue) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground uppercase">
              Action Required
            </h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Items requiring Innovation Manager decision or review
          </span>
        </div>

        {/* 4 Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Research Proposals Awaiting Review (Most Urgent!) */}
          <div
            onClick={() => goTo("/app/innovation/proposals?status=SUBMITTED")}
            className="p-5 rounded-2xl border-2 border-sky-400/90 bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-background shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  Research Proposals
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-sky-900 tracking-tight">
                  {loading ? "..." : data?.actionRequired.proposalsAwaitingReviewCount ?? 0}
                </span>
                <span className="text-xs font-bold text-sky-700">awaiting review</span>
              </div>
              {data && data.actionRequired.resubmittedCount > 0 && (
                <p className="text-[11px] font-semibold text-indigo-700 mt-1">
                  Includes {data.actionRequired.resubmittedCount} resubmitted revision
                </p>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-sky-200/80 flex items-center justify-between text-xs font-bold text-sky-700 group-hover:text-sky-900">
              <span>Review Proposals</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Complex Civic Problems Needing Formulation */}
          <div
            onClick={() => goTo("/app/innovation/problems?stage=UNFORMULATED")}
            className="p-5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-background to-background shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-amber-600" />
                Unformulated Problems
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-amber-900 tracking-tight">
                  {loading ? "..." : data?.actionRequired.unformulatedIssuesCount ?? 0}
                </span>
                <span className="text-xs font-bold text-amber-700">require attention</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Admin-approved complex civic issues awaiting challenge formulation
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-900">
              <span>Formulate Challenges</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Institution Responses Pending */}
          <div
            onClick={() => goTo("/app/innovation/challenges")}
            className="p-5 rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-background to-background shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-teal-600" />
                Institution Outreach
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-teal-900 tracking-tight">
                  {loading ? "..." : data?.actionRequired.pendingInvitationsCount ?? 0}
                </span>
                <span className="text-xs font-bold text-teal-700">pending responses</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Targeted municipal matching invitations awaiting institutional decision
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-teal-700 group-hover:text-teal-900">
              <span>Inspect Outreach</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Projects Requiring Attention */}
          <div
            onClick={() => goTo("/app/innovation/proposals")}
            className="p-5 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-background to-background shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Projects Needing Action
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-indigo-900 tracking-tight">
                  {loading ? "..." : data?.actionRequired.attentionProjectsCount ?? 0}
                </span>
                <span className="text-xs font-bold text-indigo-700">need follow-up</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Active workspaces forming teams or revising research plans
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:text-indigo-900">
              <span>View Projects</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Dedicated Research Proposal Governance Status Strip */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Research Proposal Governance Breakdown
              </h3>
            </div>
            <Link
              to="/app/innovation/proposals"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View Proposals Hub</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => goTo("/app/innovation/proposals?status=SUBMITTED")}
              className="p-3 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100/70 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-sky-900 uppercase">Awaiting Review</p>
                <p className="text-xl font-extrabold text-sky-700 mt-0.5">
                  {loading ? "..." : data?.proposalStatusCounts.SUBMITTED ?? 0}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-sky-400" />
            </button>

            <button
              type="button"
              onClick={() => goTo("/app/innovation/proposals?status=RESUBMITTED")}
              className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-indigo-900 uppercase">Resubmitted</p>
                <p className="text-xl font-extrabold text-indigo-700 mt-0.5">
                  {loading ? "..." : data?.proposalStatusCounts.RESUBMITTED ?? 0}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={() => goTo("/app/innovation/proposals?status=UNDER_REVIEW")}
              className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-purple-900 uppercase">Under Review</p>
                <p className="text-xl font-extrabold text-purple-700 mt-0.5">
                  {loading ? "..." : data?.proposalStatusCounts.UNDER_REVIEW ?? 0}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400" />
            </button>

            <button
              type="button"
              onClick={() => goTo("/app/innovation/proposals?status=REQUESTED_REVISION")}
              className="p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100/70 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-orange-900 uppercase">In Revision</p>
                <p className="text-xl font-extrabold text-orange-700 mt-0.5">
                  {loading ? "..." : data?.proposalStatusCounts.REQUESTED_REVISION ?? 0}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </button>

            <button
              type="button"
              onClick={() => goTo("/app/innovation/proposals?status=APPROVED")}
              className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-emerald-900 uppercase">Approved</p>
                <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                  {loading ? "..." : data?.proposalStatusCounts.APPROVED ?? 0}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION — RESEARCH PROPOSALS REQUIRING ATTENTION QUEUE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Research Proposals Requiring Attention
            </h2>
            <p className="text-xs text-muted-foreground">
              Submissions ready for Innovation Manager evaluation, feedback, or approval
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo("/app/innovation/proposals")}
            className="text-xs"
          >
            View All Proposals ({data?.proposalStatusCounts.TOTAL ?? 0})
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl border border-border bg-muted/20 animate-pulse" />
            <div className="h-44 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          </div>
        ) : !data?.proposalsAwaitingReview || data.proposalsAwaitingReview.length === 0 ? (
          <Card className="border-border/80 shadow-xs">
            <CardContent className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No Proposals Awaiting Review</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You&rsquo;re all caught up! New institutional research plans will appear here immediately when submitted or resubmitted by accredited universities.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => goTo("/app/innovation/proposals")}
                  className="text-xs"
                >
                  View All Historical Proposals
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.proposalsAwaitingReview.map((item) => (
              <Card
                key={item.id}
                className="border-sky-300 bg-gradient-to-br from-sky-50/40 via-background to-indigo-50/20 shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          item.status === "RESUBMITTED"
                            ? "bg-indigo-100 text-indigo-900 border-indigo-300 font-bold text-[10px]"
                            : item.status === "SUBMITTED"
                            ? "bg-sky-100 text-sky-900 border-sky-300 font-bold text-[10px]"
                            : "bg-purple-100 text-purple-900 border-purple-300 font-bold text-[10px]"
                        }
                      >
                        {item.statusLabel}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        Version {item.versionNumber}
                      </Badge>
                    </div>

                    <span className="text-xs font-semibold text-sky-800 bg-sky-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {item.elapsedWaiting}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {item.projectTitle}
                    </h3>
                    <p
                      onClick={() => goTo(`/app/innovation/problems/${item.challengeId}`)}
                      className="text-xs text-muted-foreground hover:text-primary mt-0.5 line-clamp-1 cursor-pointer transition-colors"
                    >
                      Challenge: {item.challengeTitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 bg-muted/20 rounded-xl border border-border/60">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        Institution
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {item.institutionName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        Project Lead
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {item.projectLeadName || "Assigned Coordinator"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{item.teamSize} team members</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goTo(`/app/innovation/problems/${item.challengeId}`)}
                        className="text-xs h-8 px-2.5"
                      >
                        <span>Problem Control Center</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => goTo(`/app/innovation/proposals/${item.id}`)}
                        className="bg-primary text-primary-foreground text-xs gap-1.5 shadow-xs h-8 px-3 font-semibold"
                      >
                        <span>Review Proposal</span>
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

      {/* SECTION — INNOVATION PIPELINE (Data-Driven, Clickable Stages) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Civic Innovation Pipeline
            </h2>
            <p className="text-xs text-muted-foreground">
              Live lifecycle state machine from complex citizen grievances to approved research solutions
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 overflow-x-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 min-w-[760px] lg:min-w-0">
            {/* Step 1: Complex Problems */}
            <div
              onClick={() => goTo("/app/innovation/problems")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                1. Complex Problems
              </span>
              <p className="text-2xl font-black text-foreground mt-2">
                {loading ? "..." : data?.pipeline.complexIssuesCount ?? 0}
              </p>
              <span className="text-[10px] text-primary font-semibold mt-1">Classified →</span>
            </div>

            {/* Step 2: Challenges Formulated */}
            <div
              onClick={() => goTo("/app/innovation/challenges")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                2. Challenges
              </span>
              <p className="text-2xl font-black text-foreground mt-2">
                {loading ? "..." : data?.pipeline.challengesCount ?? 0}
              </p>
              <span className="text-[10px] text-primary font-semibold mt-1">Formulated →</span>
            </div>

            {/* Step 3: Matching Active */}
            <div
              onClick={() => goTo("/app/innovation/challenges")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                3. Matching
              </span>
              <p className="text-2xl font-black text-foreground mt-2">
                {loading ? "..." : data?.pipeline.matchingActiveCount ?? 0}
              </p>
              <span className="text-[10px] text-teal-700 font-semibold mt-1">AI Matched →</span>
            </div>

            {/* Step 4: Invitations Pending */}
            <div
              onClick={() => goTo("/app/innovation/challenges")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                4. Invitations
              </span>
              <p className="text-2xl font-black text-foreground mt-2">
                {loading ? "..." : data?.pipeline.invitationsPendingCount ?? 0}
              </p>
              <span className="text-[10px] text-amber-700 font-semibold mt-1">Dispatched →</span>
            </div>

            {/* Step 5: Institutions Accepted */}
            <div
              onClick={() => goTo("/app/innovation/challenges")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                5. Accepted
              </span>
              <p className="text-2xl font-black text-foreground mt-2">
                {loading ? "..." : data?.pipeline.institutionsAcceptedCount ?? 0}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1">Confirmed →</span>
            </div>

            {/* Step 6: Projects Active */}
            <div
              onClick={() => goTo("/app/innovation/proposals")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                6. Workspaces
              </span>
              <p className="text-2xl font-black text-foreground mt-2">
                {loading ? "..." : data?.pipeline.projectsActiveCount ?? 0}
              </p>
              <span className="text-[10px] text-indigo-700 font-semibold mt-1">Active →</span>
            </div>

            {/* Step 7: Teams Formed */}
            <div
              onClick={() => goTo("/app/innovation/proposals")}
              className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                7. Teams
              </span>
              <p className="text-2xl font-black text-foreground mt-2">
                {loading ? "..." : data?.pipeline.teamsFormedCount ?? 0}
              </p>
              <span className="text-[10px] text-purple-700 font-semibold mt-1">Staffed →</span>
            </div>

            {/* Step 8: Proposals Awaiting Review (Prominent!) */}
            <div
              onClick={() => goTo("/app/innovation/proposals?status=SUBMITTED")}
              className="p-3 rounded-xl border-2 border-sky-400 bg-sky-50/80 hover:bg-sky-100 cursor-pointer transition flex flex-col justify-between shadow-xs"
            >
              <span className="text-[10px] font-bold text-sky-950 uppercase tracking-wider">
                8. Proposals
              </span>
              <p className="text-2xl font-black text-sky-900 mt-2">
                {loading ? "..." : data?.pipeline.proposalsAwaitingReviewCount ?? 0}
              </p>
              <span className="text-[10px] text-sky-700 font-bold mt-1">Awaiting Review ★</span>
            </div>

            {/* Step 9: Proposals Approved */}
            <div
              onClick={() => goTo("/app/innovation/proposals?status=APPROVED")}
              className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider">
                9. Approved
              </span>
              <p className="text-2xl font-black text-emerald-900 mt-2">
                {loading ? "..." : data?.pipeline.proposalsApprovedCount ?? 0}
              </p>
              <span className="text-[10px] text-emerald-700 font-bold mt-1">Approved ✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION — ACTIVE COMPLEX CIVIC CHALLENGES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Active Innovation Challenges ({data?.challenges.length ?? 0})
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
            View Complex Problems Catalog
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 rounded-2xl border border-border bg-muted/20 animate-pulse" />
            <div className="h-48 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          </div>
        ) : !data?.challenges || data.challenges.length === 0 ? (
          <Card className="border-border shadow-xs">
            <CardContent className="py-8 text-center text-xs text-muted-foreground">
              No innovation challenges have been formulated yet.
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
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                      Complexity {c.complexityScore}/100
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {c.problemStatement}
                    </p>
                  </div>

                  {/* Stage Progress Checklist */}
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                      <span>Research Progress</span>
                      <span className="text-primary font-mono text-[10px]">
                        {c.proposalsCount} proposals · {c.teamsCount} teams
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
                      <span className="text-emerald-600 font-medium">✓ Formulated</span>
                      <span>·</span>
                      <span className={c.institutionsSelectedCount > 0 ? "text-emerald-600 font-medium" : "opacity-60"}>
                        {c.institutionsSelectedCount > 0 ? `✓ ${c.institutionsSelectedCount} Selected` : "○ Selection"}
                      </span>
                      <span>·</span>
                      <span className={c.invitationsAcceptedCount > 0 ? "text-emerald-600 font-medium" : "opacity-60"}>
                        {c.invitationsAcceptedCount > 0 ? `✓ ${c.invitationsAcceptedCount} Accepted` : "○ Pending"}
                      </span>
                      <span>·</span>
                      <span className={c.teamsCount > 0 ? "text-emerald-600 font-medium" : "opacity-60"}>
                        {c.teamsCount > 0 ? `✓ Team Formed` : "○ Team"}
                      </span>
                      <span>·</span>
                      <span className={c.proposalsCount > 0 ? "text-sky-700 font-bold" : "opacity-60"}>
                        {c.proposalsCount > 0 ? `● ${c.proposalsCount} Proposal` : "○ Proposal"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">
                      Scope: {c.geographicScope}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => goTo(`/app/innovation/problems/${c.sourceIssueId || c.id}`)}
                        className="bg-primary text-primary-foreground text-xs gap-1 h-8 shadow-xs"
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
      </section>

      {/* SECTION — ACTIVE RESEARCH PROJECTS & WORKSPACES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Active Research Projects ({data?.projects.length ?? 0})
            </h2>
            <p className="text-xs text-muted-foreground">
              Institutional workspaces assembling research teams and authoring proposals
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo("/app/innovation/proposals")}
            className="text-xs"
          >
            View All Workspaces
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {p.institutionName}
                      </Badge>
                      {p.proposalStatus ? (
                        <Badge
                          className={
                            p.proposalStatus === "APPROVED"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]"
                              : p.proposalStatus === "SUBMITTED" || p.proposalStatus === "RESUBMITTED"
                              ? "bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-bold"
                              : "bg-amber-100 text-amber-900 border-amber-300 text-[10px]"
                          }
                        >
                          Proposal: {p.proposalStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] opacity-75">
                          Proposal Pending
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] text-muted-foreground font-mono">
                      {p.teamSize} members
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground leading-snug">
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
                          View Proposal
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goTo(`/app/innovation/projects/${p.id}`)}
                        className="text-xs gap-1 h-8"
                      >
                        <span>Open Workspace</span>
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

      {/* SECTION — INSTITUTIONAL COLLABORATIONS & RECENT ACTIVITY DUAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Institutional Collaborations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Institutional Collaborations
            </h2>
            <Link
              to="/app/innovation/institutions"
              className="text-xs font-semibold text-primary hover:underline"
            >
              All Accredited Institutions →
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
                    className="p-3.5 rounded-2xl border border-slate-200 bg-card hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
                          {inst.name} {inst.acronym ? `(${inst.acronym})` : ""}
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium truncate flex items-center gap-1.5 mt-0.5">
                          <span>{inst.city}, {inst.state}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-bold text-slate-900">
                            {inst.activeProjectsCount} active {inst.activeProjectsCount === 1 ? "project" : "projects"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {inst.proposalsAwaitingReviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                          {inst.proposalsAwaitingReviewCount} awaiting review
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-700 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300">
                          {inst.proposalsCount} proposals
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goTo(`/app/innovation/institutions?selected=${inst.id}`)}
                        className="text-xs font-bold h-8 border-primary/40 text-primary hover:bg-primary hover:text-white rounded-xl transition"
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

        {/* Recent Operations Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Operations Activity
            </h2>
            <span className="text-xs text-muted-foreground">Live state machine audit stream</span>
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
    </div>
  );
}
