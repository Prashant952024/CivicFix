import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Clock,
  Cpu,
  FileText,
  Layers,
  Lightbulb,
  Loader2,
  MapPin,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatCitizenIssueDateTime, type CitizenIssueImageRow } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ComplexIssueRow = Database["public"]["Tables"]["issues"]["Row"] & {
  issue_images?: CitizenIssueImageRow[] | null;
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  decided_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  innovation_challenges?: Database["public"]["Tables"]["innovation_challenges"]["Row"][] | null;
};

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"] & {
  source_issue?: Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "title" | "category"> | null;
};

type FilterCategory = "all" | "unformulated" | "formulated" | "high_complexity";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function InnovationDashboardPage() {
  const { profile } = useAppSession();
  const [complexIssues, setComplexIssues] = useState<ComplexIssueRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>("all");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const navigate = useNavigate();
  const [generatingIssueId, setGeneratingIssueId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [issuesRes, challengesRes] = await Promise.all([
          supabase
            .from("issues")
            .select(`
              *,
              issue_images(id, storage_bucket, storage_path, image_type, created_at),
              reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email),
              decided_by_profile:profiles!issues_classification_decided_by_fkey(id, full_name, email),
              innovation_challenges(id, status, title)
            `)
            .or("final_issue_type.eq.COMPLEX,status.eq.CLASSIFIED_COMPLEX,ai_issue_type.eq.COMPLEX")
            .order("created_at", { ascending: false }),
          supabase
            .from("innovation_challenges")
            .select(`
              *,
              source_issue:issues(id, title, category)
            `)
            .order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        if (issuesRes.error) throw issuesRes.error;
        if (challengesRes.error) throw challengesRes.error;

        setComplexIssues((issuesRes.data ?? []) as ComplexIssueRow[]);
        setChallenges(challengesRes.data ?? []);
        setLastRefreshedAt(new Date().toISOString());
      } catch (err) {
        if (import.meta.env.DEV) console.error("Innovation dashboard fetch error:", err);
        setError("Unable to load innovation data. Please check connection and retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  // Derived KPIs & domain statistics
  const stats = useMemo(() => {
    const unformulated = complexIssues.filter(
      (i) => !i.innovation_challenges || i.innovation_challenges.length === 0,
    ).length;
    const formulated = complexIssues.length - unformulated;
    const draftChallenges = challenges.filter((c) => c.status === "DRAFT").length;
    const approvedChallenges = challenges.filter((c) => c.status === "APPROVED").length;
    const openProposals = challenges.filter((c) => c.status === "OPEN_FOR_PROPOSALS").length;
    const activePilots = challenges.filter((c) => c.status === "PILOT_ACTIVE").length;

    // Average complexity score
    const scores = complexIssues.map((i) => i.ai_complexity_score ?? 75);
    const avgComplexity =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Unique domains count and distribution
    const domainCounts: Record<string, number> = {};
    complexIssues.forEach((i) => {
      (i.ai_required_expertise || []).forEach((exp) => {
        const clean = exp.trim();
        if (clean) {
          domainCounts[clean] = (domainCounts[clean] || 0) + 1;
        }
      });
    });

    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalComplex: complexIssues.length,
      unformulated,
      formulated,
      draftChallenges,
      approvedChallenges,
      openProposals,
      activePilots,
      avgComplexity,
      topDomains,
    };
  }, [complexIssues, challenges]);

  // Filtered complex issues stream
  const filteredIssues = useMemo(() => {
    return complexIssues.filter((issue) => {
      // 1. Tab filter
      const hasChallenge = issue.innovation_challenges && issue.innovation_challenges.length > 0;
      if (selectedFilter === "unformulated" && hasChallenge) return false;
      if (selectedFilter === "formulated" && !hasChallenge) return false;
      if (selectedFilter === "high_complexity" && (issue.ai_complexity_score ?? 0) < 80) return false;

      // 2. Domain filter
      if (selectedDomain) {
        const hasDomain = (issue.ai_required_expertise || []).some(
          (d) => d.toLowerCase() === selectedDomain.toLowerCase(),
        );
        if (!hasDomain) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchDesc = issue.description.toLowerCase().includes(q);
        const matchCat = (issue.category || "").toLowerCase().includes(q);
        const matchLoc = (issue.address_text || issue.location_text || "").toLowerCase().includes(q);
        const matchDomain = (issue.ai_required_expertise || []).some((d) => d.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCat && !matchLoc && !matchDomain) return false;
      }

      return true;
    });
  }, [complexIssues, selectedFilter, selectedDomain, searchQuery]);

  async function handleStartChallengeFormulation(issue: ComplexIssueRow) {
    const existing = issue.innovation_challenges?.[0];
    if (existing?.id) {
      void navigate(`/app/innovation/challenges/${existing.id}`);
      return;
    }

    setGeneratingIssueId(issue.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          issue_id: issue.id,
          save_draft: true,
        }),
      });

      const resData = (await response.json()) as {
        success?: boolean;
        challenge?: { id: string };
        error?: string;
      };

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to generate challenge statement.");
      }

      if (resData.challenge?.id) {
        void navigate(`/app/innovation/challenges/${resData.challenge.id}`);
      } else {
        setRefreshNonce((prev) => prev + 1);
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error("Challenge formulation error:", err);
      void navigate(`/app/innovation/issues/${issue.id}`);
    } finally {
      setGeneratingIssueId(null);
    }
  }

  const greeting = getGreeting();
  const managerName = profile?.full_name?.split(" ")[0] || "Innovation Lead";

  return (
    <div className="space-y-6">
      {/* 1. Hero Header */}
      <PageHeader
        title={`${greeting}, ${managerName}`}
        description="Transforming systemic civic challenges into structured collaborative research, predictive prototypes, and startup pilots."
        tag="Civic Innovation & Research Command Hub"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="text-xs gap-1.5 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 shadow-sm">
              <Link to="/app/innovation/challenges">
                <Rocket className="h-3.5 w-3.5 text-primary" />
                All Challenges ({challenges.length})
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs gap-1.5 shadow-md">
              <Link to="/app/innovation/issues">
                <BrainCircuit className="h-3.5 w-3.5" />
                Explore Complex Problems
              </Link>
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-teal-200/80 bg-teal-50/70 px-3.5 py-1.5 font-bold text-teal-900 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600" />
            </span>
            <span>Innovation Track Operational</span>
          </div>

          {lastRefreshedAt && (
            <div className="rounded-2xl border border-border/80 bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm">
              Live Sync: <span className="font-semibold text-foreground">{formatCitizenIssueDateTime(lastRefreshedAt)}</span>
            </div>
          )}
        </div>
      </PageHeader>

      {error ? (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* 2. Top Metric Ribbon (5 Uniform Sleek KPI Cards) */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* Card 1: Total Complex Problems */}
        <Link to="/app/innovation/issues" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-teal-300/80 bg-teal-50/70 p-4 shadow-sm group-hover:shadow-md group-hover:border-teal-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-950">
                Total Complex
              </span>
              <div className="p-1.5 rounded-lg bg-teal-700 text-white shadow-xs">
                <BrainCircuit className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-black tracking-tight text-teal-950">
                {stats.totalComplex}
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-teal-900/80 font-medium">Admin Approved</span>
              <span className="font-bold text-teal-800">100%</span>
            </div>
          </div>
        </Link>

        {/* Card 2: Awaiting Formulation */}
        <div
          onClick={() => setSelectedFilter("unformulated")}
          className="cursor-pointer flex flex-col justify-between h-28 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4 shadow-sm hover:shadow-md hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950">
              Need Formulation
            </span>
            <div className="p-1.5 rounded-lg bg-amber-600 text-white shadow-xs">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto flex items-baseline gap-2">
            <p className="text-2xl font-black tracking-tight text-amber-950">
              {stats.unformulated}
            </p>
            {stats.unformulated > 0 && (
              <span className="text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full shadow-xs">
                Action needed
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-amber-900/80 font-medium">Awaiting challenge spec</span>
            <span className="font-bold text-amber-800">
              {stats.totalComplex > 0 ? Math.round((stats.unformulated / stats.totalComplex) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Card 3: Open for Proposals */}
        <Link to="/app/innovation/challenges" className="block group">
          <div className="flex flex-col justify-between h-28 rounded-2xl border border-sky-300/80 bg-sky-50/80 p-4 shadow-sm group-hover:shadow-md group-hover:border-sky-400 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-950">
                Open Proposals
              </span>
              <div className="p-1.5 rounded-lg bg-sky-600 text-white shadow-xs">
                <Rocket className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="my-auto">
              <p className="text-2xl font-black tracking-tight text-sky-950">
                {stats.openProposals}
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-sky-900/80 font-medium">Ready for startups</span>
              <span className="font-bold text-sky-800">Active</span>
            </div>
          </div>
        </Link>

        {/* Card 4: Active Innovation Pilots */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-emerald-300/80 bg-emerald-50/80 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950">
              Active Pilots
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-700 text-white shadow-xs">
              <Cpu className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto">
            <p className="text-2xl font-black tracking-tight text-emerald-950">
              {stats.activePilots}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-900/80 font-medium">Field sandboxes</span>
            <span className="font-bold text-emerald-800">Live</span>
          </div>
        </div>

        {/* Card 5: Average Complexity Index */}
        <div className="flex flex-col justify-between h-28 rounded-2xl border border-slate-300/80 bg-slate-50/90 p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
              Avg Complexity
            </span>
            <div className="p-1.5 rounded-lg bg-slate-700 text-white shadow-xs">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="my-auto flex items-baseline gap-1">
            <p className="text-2xl font-black tracking-tight text-slate-950">
              {stats.avgComplexity}
            </p>
            <span className="text-xs font-semibold text-slate-600">/ 100</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-700 font-medium">Systemic Index</span>
            <span className="font-bold text-teal-800">High Impact</span>
          </div>
        </div>
      </section>

      {/* 3. Interactive Innovation Lifecycle Progression Tracker */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" />
              Innovation Track Pipeline Lifecycle
            </span>
            <span className="text-xs text-muted-foreground">End-to-End Problem Formulation Flow</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className="p-3 rounded-xl border border-teal-200/80 bg-surface flex items-start gap-3 shadow-xs">
              <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                  <span>Admin Triage</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary inline" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Gemini AI detects systemic issues; Admin authoritatively routes to Innovation.
                </p>
                <span className="text-[10px] font-bold text-teal-800 mt-1 inline-block">
                  {stats.totalComplex} Issues Ingested
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-xl border border-amber-200/80 bg-surface flex items-start gap-3 shadow-xs">
              <div className="h-7 w-7 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                  <span>Challenge Formulation</span>
                  <FileText className="h-3.5 w-3.5 text-amber-600 inline" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Innovation Manager synthesizes root cause, affected scope & domain expertise.
                </p>
                <span className="text-[10px] font-bold text-amber-800 mt-1 inline-block">
                  {stats.unformulated} Awaiting Formulation
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-xl border border-sky-200/80 bg-surface flex items-start gap-3 shadow-xs">
              <div className="h-7 w-7 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                  <span>Proposal Window</span>
                  <Rocket className="h-3.5 w-3.5 text-sky-600 inline" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Universities, research labs & startups review open challenge statements.
                </p>
                <span className="text-[10px] font-bold text-sky-800 mt-1 inline-block">
                  {stats.openProposals} Challenges Open
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3 rounded-xl border border-emerald-200/80 bg-surface flex items-start gap-3 shadow-xs">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                4
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                  <span>Pilot Sandboxes</span>
                  <Cpu className="h-3.5 w-3.5 text-emerald-600 inline" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Field sensors, predictive algorithms & telemetry verified in civic sandboxes.
                </p>
                <span className="text-[10px] font-bold text-emerald-800 mt-1 inline-block">
                  {stats.activePilots} Active Field Pilots
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols) — Dynamic Complex Problems Stream */}
        <div className="space-y-4 lg:col-span-8">
          <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Admin-Approved Complex Problems
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Grievances authoritatively routed to the innovation track for research & prototyping.
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs gap-1 text-primary hover:text-primary/80">
                  <Link to="/app/innovation/issues">
                    View Catalog ({complexIssues.length})
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Search & Filter Controls */}
              <div className="pt-3 space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by title, root cause, category, landmark, or domain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant={selectedFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter("all")}
                    className={`text-xs h-7 rounded-lg ${selectedFilter === "all" ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : ""}`}
                  >
                    All ({complexIssues.length})
                  </Button>
                  <Button
                    variant={selectedFilter === "unformulated" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter("unformulated")}
                    className={`text-xs h-7 rounded-lg gap-1.5 ${
                      selectedFilter === "unformulated"
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                        : "text-amber-800 border-amber-200"
                    }`}
                  >
                    Needs Formulation ({stats.unformulated})
                  </Button>
                  <Button
                    variant={selectedFilter === "formulated" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter("formulated")}
                    className={`text-xs h-7 rounded-lg ${selectedFilter === "formulated" ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : ""}`}
                  >
                    Formulated ({stats.formulated})
                  </Button>
                  <Button
                    variant={selectedFilter === "high_complexity" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter("high_complexity")}
                    className={`text-xs h-7 rounded-lg ${selectedFilter === "high_complexity" ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : ""}`}
                  >
                    High Complexity (80+)
                  </Button>

                  {/* Active Domain Chip */}
                  {selectedDomain && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                      <span>Domain: {selectedDomain}</span>
                      <button
                        onClick={() => setSelectedDomain(null)}
                        className="hover:bg-teal-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y">
              {loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  Syncing live complex problems...
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    icon={BrainCircuit}
                    title="No Complex Grievances Found"
                    description={
                      searchQuery || selectedDomain || selectedFilter !== "all"
                        ? "No complex issues match your active search and filter criteria."
                        : "When Admin reviews citizen complaints and authoritatively routes them as COMPLEX, they appear here for challenge formulation."
                    }
                    action={
                      searchQuery || selectedDomain || selectedFilter !== "all" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedFilter("all");
                            setSelectedDomain(null);
                          }}
                        >
                          Clear Filters
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                filteredIssues.slice(0, 8).map((issue) => {
                  const score = issue.ai_complexity_score ?? 75;
                  const hasChallenge = issue.innovation_challenges && issue.innovation_challenges.length > 0;
                  const challenge = hasChallenge ? issue.innovation_challenges![0] : null;

                  return (
                    <div
                      key={issue.id}
                      className="p-4 sm:p-5 hover:bg-muted/30 transition-colors space-y-3"
                    >
                      {/* Top Bar: Category, Decided By Admin, and Complexity Score */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className="font-semibold text-foreground">
                            {issue.category}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatCitizenIssueDateTime(issue.created_at)}
                          </span>
                          {issue.decided_by_profile?.full_name ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 shadow-xs">
                              <ShieldCheck className="h-3 w-3 text-emerald-700" />
                              Approved by Admin: {issue.decided_by_profile.full_name}
                            </span>
                          ) : null}
                        </div>

                        {/* Complexity Badge */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">
                            Complexity Index
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono shadow-xs ${
                              score >= 80
                                ? "bg-teal-700 text-white"
                                : "bg-teal-50 text-teal-900 border border-teal-200"
                            }`}
                          >
                            {score} / 100
                          </span>
                        </div>
                      </div>

                      {/* Title & Location */}
                      <div>
                        <Link
                          to={`/app/innovation/issues/${issue.id}`}
                          className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition hover:underline"
                        >
                          {issue.title}
                        </Link>

                        {(issue.address_text || issue.location_text) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{issue.address_text || issue.location_text}</span>
                          </div>
                        )}
                      </div>

                      {/* Citizen Description Quote */}
                      <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-xl border border-border/70 bg-muted/20 line-clamp-2">
                        "{issue.description}"
                      </p>

                      {/* AI Root Cause / Systemic Diagnostic Box */}
                      {issue.ai_complexity_reasoning && (
                        <div className="p-2.5 rounded-xl border border-teal-200/80 bg-teal-50/40 flex items-start gap-2 text-xs">
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-[11px] text-teal-950 block">
                              AI Systemic Diagnostic:
                            </span>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                              {issue.ai_complexity_reasoning}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Domains & Action Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/40">
                        {/* Domain Tags */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-1">
                            Required Disciplines:
                          </span>
                          {(issue.ai_required_expertise || ["Interdisciplinary Engineering"]).map((exp, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedDomain(exp)}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition cursor-pointer ${
                                selectedDomain === exp
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground hover:bg-muted border-border"
                              }`}
                              title={`Filter by ${exp}`}
                            >
                              {exp}
                            </button>
                          ))}
                        </div>

                        {/* Status & Formulate Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {hasChallenge ? (
                            <Button
                              size="sm"
                              asChild
                              variant={challenge?.status === "APPROVED" ? "outline" : "default"}
                              className="text-xs h-8 gap-1.5 font-semibold shadow-xs"
                            >
                              <Link to={`/app/innovation/challenges/${challenge!.id}`}>
                                {challenge?.status === "APPROVED" ? (
                                  <>
                                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                    Approved
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3.5 w-3.5" />
                                    Review Draft
                                  </>
                                )}
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => void handleStartChallengeFormulation(issue)}
                              disabled={generatingIssueId === issue.id}
                              className="text-xs gap-1.5 shadow-xs h-8 bg-primary text-primary-foreground font-semibold"
                            >
                              {generatingIssueId === issue.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Synthesizing...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Synthesize Challenge
                                </>
                              )}
                            </Button>
                          )}

                          <Button size="sm" variant="outline" asChild className="text-xs h-8 gap-1">
                            <Link to={`/app/innovation/issues/${issue.id}`}>
                              Diagnostics
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4 cols) — Strategic Widgets */}
        <div className="space-y-4 lg:col-span-4">
          {/* Widget 1: Active Challenges Spotlight */}
          <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Active Challenges
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 text-primary hover:text-primary/80">
                <Link to="/app/innovation/challenges">
                  All ({challenges.length})
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-0 divide-y">
              {challenges.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                  <Rocket className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="font-semibold text-foreground">No Challenges Formulated Yet</p>
                  <p>Open a complex issue on the left to synthesize your first innovation challenge statement.</p>
                </div>
              ) : (
                challenges.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    to={`/app/innovation/challenges/${c.id}`}
                    className="block p-3.5 space-y-2 hover:bg-muted/20 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition line-clamp-1 leading-snug">
                        {c.title}
                      </h4>
                      <Badge
                        variant="outline"
                        size="sm"
                        className={`text-[9px] font-mono shrink-0 uppercase ${
                          c.status === "APPROVED"
                            ? "bg-teal-50 text-teal-800 border-teal-200 font-bold"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {c.status}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {c.problem_statement}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                      <span className="font-semibold text-foreground">{c.problem_category || c.category}</span>
                      <span>{formatCitizenIssueDateTime(c.created_at)}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Widget 2: Required Multi-Domain Research Matrix */}
          <Card className="rounded-2xl border border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                Required Research Disciplines
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              <p className="text-xs text-muted-foreground">
                Top scientific & engineering specializations requested across active civic problems. Click to filter:
              </p>

              <div className="flex flex-wrap gap-1.5">
                {stats.topDomains.slice(0, 10).map((d) => (
                  <button
                    key={d.domain}
                    onClick={() => setSelectedDomain(selectedDomain === d.domain ? null : d.domain)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                      selectedDomain === d.domain
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border/70"
                    }`}
                  >
                    <span>{d.domain}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedDomain === d.domain
                          ? "bg-white/20 text-white"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {d.count}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Widget 3: Dual-Track Governance Protocol */}
          <Card className="rounded-2xl bg-gradient-to-br from-[#0c2f29] via-[#113a33] to-slate-900 text-white shadow-md border-0 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-teal-400" />
                CivicFix Dual-Track Architecture
              </CardTitle>
            </CardHeader>

            <CardContent className="text-xs text-teal-100/90 space-y-2.5 leading-relaxed">
              <p className="text-[11px]">
                CivicFix strictly segregates routine operational complaints from complex societal challenges:
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="font-bold text-white block">Municipal Track</span>
                  Standard civil repairs, streetlights, potholes & sanitation SOPs.
                </div>
                <div className="p-2 rounded-lg bg-teal-900/50 border border-teal-400/30">
                  <span className="font-bold text-teal-300 block">Innovation Track</span>
                  Systemic, multi-stakeholder challenges requiring sensors, research & startup pilot sandboxes.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
