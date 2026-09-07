import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  MapPin,
  RefreshCw,
  Rocket,
  Search,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatCitizenIssueDateTime } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"] & {
  source_issue?: Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "title" | "category"> | null;
  creator_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

export function InnovationChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadChallenges() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("innovation_challenges")
        .select(`
          *,
          source_issue:issues(id, title, category),
          creator_profile:profiles!innovation_challenges_created_by_fkey(id, full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (err) {
        if (import.meta.env.DEV) console.error("Challenges load error:", err);
        setError("Unable to load innovation challenges.");
        setLoading(false);
        return;
      }

      setChallenges(data ?? []);
      setLoading(false);
    }

    void loadChallenges();

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchStmt = c.problem_statement.toLowerCase().includes(q);
        const matchCat = c.category.toLowerCase().includes(q);
        if (!matchTitle && !matchStmt && !matchCat) return false;
      }
      return true;
    });
  }, [challenges, statusFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Innovation Challenges"
        description="Structured research and startup problem statements formulated from complex civic grievances."
        backHref="/app/innovation"
        backLabel="Innovation Hub"
        tag="Innovation Portal"
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

      {error ? (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search challenges by title, scope, domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Challenge Statuses</option>
              <option value="OPEN_FOR_PROPOSALS">Open for Proposals</option>
              <option value="PILOT_ACTIVE">Pilot Active</option>
              <option value="SOLVED">Solved</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Challenges Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          Loading challenge statements...
        </div>
      ) : filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <EmptyState
              icon={Rocket}
              title="No Innovation Challenges Found"
              description="Formulate challenges from complex issues to build your open innovation portfolio."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredChallenges.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" size="sm" className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[10px]">
                        {c.category}
                      </Badge>
                      <Badge variant={c.status === "OPEN_FOR_PROPOSALS" ? "success" : "default"} size="sm" className="text-[10px]">
                        {c.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                      {c.title}
                    </CardTitle>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block">Complexity</span>
                    <Badge variant="outline" className="font-mono text-purple-700 dark:text-purple-300 font-bold">
                      {c.complexity_score ?? 75}/100
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-3 flex-1 flex flex-col justify-between text-xs">
                <div className="space-y-2">
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                    {c.problem_statement}
                  </p>

                  {c.required_expertise && c.required_expertise.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.required_expertise.map((exp, idx) => (
                        <Badge key={idx} variant="outline" size="sm" className="bg-muted/40 text-[10px]">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                    {c.affected_population ? (
                      <div className="flex items-center gap-1">
                        <UsersRound className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{c.affected_population}</span>
                      </div>
                    ) : null}

                    {c.geographic_scope ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{c.geographic_scope}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">
                    Created {formatCitizenIssueDateTime(c.created_at)}
                  </span>

                  {c.source_issue_id ? (
                    <Button size="sm" asChild variant="outline" className="gap-1 text-xs">
                      <Link to={`/app/innovation/issues/${c.source_issue_id}`}>
                        Source Issue
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
