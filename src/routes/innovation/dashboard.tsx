import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Lightbulb,
  Loader2,
  MapPin,
  RefreshCw,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

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

export function InnovationDashboardPage() {
  const [complexIssues, setComplexIssues] = useState<ComplexIssueRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

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
      } catch (err) {
        if (import.meta.env.DEV) console.error("Innovation dashboard fetch error:", err);
        setError("Unable to load innovation data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const stats = useMemo(() => {
    const unformulated = complexIssues.filter(
      (i) => !i.innovation_challenges || i.innovation_challenges.length === 0,
    ).length;
    const activeChallenges = challenges.filter((c) => c.status !== "ARCHIVED").length;
    const openProposals = challenges.filter((c) => c.status === "OPEN_FOR_PROPOSALS").length;
    const activePilots = challenges.filter((c) => c.status === "PILOT_ACTIVE").length;

    return {
      totalComplex: complexIssues.length,
      unformulated,
      activeChallenges,
      openProposals,
      activePilots,
    };
  }, [complexIssues, challenges]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Innovation Command Center"
        description="Manage complex societal challenges, problem statements, and academic & startup collaboration pipelines."
        tag="Innovation Portal"
        actions={
          <div className="flex items-center gap-2">
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
            <Button asChild size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
              <Link to="/app/innovation/issues">
                <BrainCircuit className="h-4 w-4" />
                View All Complex Problems
              </Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-purple-200/80 bg-purple-50/20 dark:bg-purple-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
              Total Complex Problems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {stats.totalComplex}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Admin-approved societal challenges</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
              Pending Challenge Formulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.unformulated}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting problem specification</p>
          </CardContent>
        </Card>

        <Card className="border-sky-200/80 bg-sky-50/20 dark:bg-sky-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
              Open For Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
              {stats.openProposals}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Ready for researchers & startups</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
              Active Innovation Pilots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.activePilots}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Field sandboxes & prototypes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Complex Issues */}
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  Admin-Approved Complex Problems
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Grievances authoritatively routed to the innovation pipeline by Platform Admins.
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                <Link to="/app/innovation/issues">
                  View all ({complexIssues.length})
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-0 divide-y">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading complex problems...
                </div>
              ) : complexIssues.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    icon={ShieldCheck}
                    title="No Complex Issues Routed Yet"
                    description="When Admin reviews citizen complaints and routes them as COMPLEX, they will appear in this command center for challenge formulation."
                  />
                </div>
              ) : (
                complexIssues.slice(0, 6).map((issue) => {
                  const score = issue.ai_complexity_score ?? 75;
                  const hasChallenge = issue.innovation_challenges && issue.innovation_challenges.length > 0;

                  return (
                    <div key={issue.id} className="p-4 hover:bg-muted/40 transition flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground hover:underline">
                              <Link to={`/app/innovation/issues/${issue.id}`}>{issue.title}</Link>
                            </span>
                            <Badge variant="danger" size="sm" className="bg-purple-600 text-[10px]">
                              Admin Approved: COMPLEX
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Category: <strong className="text-foreground">{issue.category}</strong></span>
                            {issue.address_text || issue.location_text ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {issue.address_text || issue.location_text}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase block font-mono">Complexity</span>
                            <Badge variant="outline" className="font-mono text-purple-700 dark:text-purple-300 font-bold">
                              {score}/100
                            </Badge>
                          </div>

                          <Button size="sm" asChild variant="outline" className="gap-1 text-xs">
                            <Link to={`/app/innovation/issues/${issue.id}`}>
                              {hasChallenge ? "View Details" : "Formulate Challenge"}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/20 p-2.5 rounded border">
                        {issue.description}
                      </p>

                      {/* Required Expertise Tags */}
                      {issue.ai_required_expertise && issue.ai_required_expertise.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="text-muted-foreground mr-1">Domains:</span>
                          {issue.ai_required_expertise.map((exp, idx) => (
                            <Badge key={idx} variant="outline" size="sm" className="bg-background text-[10px]">
                              {exp}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Challenges Pipeline & Info */}
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Active Challenges
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to="/app/innovation/challenges">View All</Link>
              </Button>
            </CardHeader>

            <CardContent className="p-0 divide-y">
              {challenges.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <p>No active challenges yet.</p>
                  <p className="mt-1">Open a complex issue on the left to formulate a challenge statement.</p>
                </div>
              ) : (
                challenges.slice(0, 4).map((c) => (
                  <div key={c.id} className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-foreground line-clamp-1">{c.title}</h4>
                      <Badge variant="outline" size="sm" className="text-[10px]">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{c.problem_statement}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>{c.category}</span>
                      <span>{formatCitizenIssueDateTime(c.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Governance Notice Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200/60 dark:border-purple-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                Dual-Track Governance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                CivicFix enforces a strict operational separation:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li><strong>Municipal Track</strong> handles routine street maintenance, pothole repairs, and field fixes.</li>
                <li><strong>Innovation Track</strong> transforms systemic, research-grade civic challenges into structured collaborative problems for academia and startups.</li>
                <li><strong>Admin</strong> holds sole authority to classify and route grievances.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
