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

  const stats = useMemo(() => {
    const total = challenges.length;
    const drafts = challenges.filter((c) => c.status === "DRAFT").length;
    const approved = challenges.filter((c) => c.status === "APPROVED").length;
    const open = challenges.filter((c) => c.status === "OPEN_FOR_PROPOSALS").length;
    return { total, drafts, approved, open };
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchStmt = c.problem_statement.toLowerCase().includes(q);
        const matchCat = (c.problem_category || c.category || "").toLowerCase().includes(q);
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
            className="gap-1.5 shadow-sm text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <option value="all">All Challenge Statuses ({stats.total})</option>
                <option value="DRAFT">Drafts ({stats.drafts})</option>
                <option value="APPROVED">Approved ({stats.approved})</option>
                <option value="OPEN_FOR_PROPOSALS">Open for Proposals ({stats.open})</option>
                <option value="PILOT_ACTIVE">Pilot Active</option>
                <option value="SOLVED">Solved</option>
              </select>
            </div>
          </div>

          {/* Status Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={`text-xs h-7 rounded-lg ${statusFilter === "all" ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs" : ""}`}
            >
              All ({stats.total})
            </Button>
            <Button
              variant={statusFilter === "DRAFT" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("DRAFT")}
              className={`text-xs h-7 rounded-lg gap-1.5 ${
                statusFilter === "DRAFT"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                  : "text-amber-800 border-amber-200 hover:bg-amber-50"
              }`}
            >
              Drafts ({stats.drafts})
            </Button>
            <Button
              variant={statusFilter === "APPROVED" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("APPROVED")}
              className={`text-xs h-7 rounded-lg gap-1.5 ${
                statusFilter === "APPROVED"
                  ? "bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                  : "text-teal-800 border-teal-200 hover:bg-teal-50"
              }`}
            >
              Approved ({stats.approved})
            </Button>
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
          {filteredChallenges.map((c) => {
            const domains = c.required_domains?.length ? c.required_domains : c.required_expertise || [];
            const isApproved = c.status === "APPROVED";
            const isDraft = c.status === "DRAFT";

            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="teal" size="sm" className="text-[10px]">
                          {c.problem_category || c.category}
                        </Badge>
                        <Badge
                          variant={isApproved ? "teal" : isDraft ? "amber" : "default"}
                          size="sm"
                          className="text-[10px] font-bold"
                        >
                          {isDraft ? "DRAFT (NEEDS APPROVAL)" : c.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                        {c.title}
                      </CardTitle>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block">Complexity</span>
                      <Badge variant="outline" className="font-mono text-teal-800 font-bold">
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

                    {domains.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {domains.map((exp, idx) => (
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

                  <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground text-[11px]">
                      Created {formatCitizenIssueDateTime(c.created_at)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {c.source_issue_id ? (
                        <Button size="sm" asChild variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground">
                          <Link to={`/app/innovation/issues/${c.source_issue_id}`}>
                            Grievance
                          </Link>
                        </Button>
                      ) : null}

                      <Button size="sm" asChild variant={isDraft ? "default" : "outline"} className="h-7 text-xs gap-1 font-semibold">
                        <Link to={`/app/innovation/challenges/${c.id}`}>
                          {isDraft ? "Review & Approve" : "Open Workspace"}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
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
