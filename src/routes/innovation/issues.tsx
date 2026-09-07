import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Loader2,
  RefreshCw,
  Rocket,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { CitizenIssueImageRow } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ComplexIssueRow = Database["public"]["Tables"]["issues"]["Row"] & {
  issue_images?: CitizenIssueImageRow[] | null;
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  decided_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  innovation_challenges?: Database["public"]["Tables"]["innovation_challenges"]["Row"][] | null;
};

export function InnovationIssuesPage() {
  const [issues, setIssues] = useState<ComplexIssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadIssues() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("issues")
        .select(`
          *,
          issue_images(id, storage_bucket, storage_path, image_type, created_at),
          reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email),
          decided_by_profile:profiles!issues_classification_decided_by_fkey(id, full_name, email),
          innovation_challenges(id, status, title)
        `)
        .or("final_issue_type.eq.COMPLEX,status.eq.CLASSIFIED_COMPLEX,ai_issue_type.eq.COMPLEX")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (err) {
        if (import.meta.env.DEV) console.error("Complex issues load error:", err);
        setError("Unable to load complex issues.");
        setLoading(false);
        return;
      }

      setIssues((data ?? []) as ComplexIssueRow[]);
      setLoading(false);
    }

    void loadIssues();

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = i.title.toLowerCase().includes(q);
        const matchDesc = i.description.toLowerCase().includes(q);
        const matchLoc = (i.address_text || i.location_text || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc) return false;
      }
      return true;
    });
  }, [issues, categoryFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complex Societal Challenges"
        description="Catalog of civic grievances classified by Admin for open innovation and inter-disciplinary collaboration."
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
              placeholder="Search complex issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Domains & Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Issues Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          Loading complex societal challenges...
        </div>
      ) : filteredIssues.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <EmptyState
              icon={BrainCircuit}
              title="No complex issues matched"
              description="Either no grievances are currently classified as complex, or no records matched your search."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredIssues.map((issue) => {
            const hasChallenge = issue.innovation_challenges && issue.innovation_challenges.length > 0;
            const score = issue.ai_complexity_score ?? 75;

            return (
              <Card key={issue.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="danger" size="sm" className="bg-purple-600 text-[10px]">
                          COMPLEX
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ID: {issue.id.slice(0, 8)}...
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold line-clamp-1 text-foreground">
                        <Link to={`/app/innovation/issues/${issue.id}`} className="hover:underline">
                          {issue.title}
                        </Link>
                      </CardTitle>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block">Score</span>
                      <Badge variant="outline" className="font-mono text-purple-700 dark:text-purple-300 font-bold">
                        {score}/100
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {issue.description}
                    </p>

                    {issue.ai_required_expertise && issue.ai_required_expertise.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {issue.ai_required_expertise.map((exp, idx) => (
                          <Badge key={idx} variant="outline" size="sm" className="bg-muted/40 text-[10px]">
                            {exp}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {hasChallenge ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Rocket className="h-3.5 w-3.5" />
                          Challenge Formulated
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold">Awaiting Formulation</span>
                      )}
                    </span>

                    <Button size="sm" asChild variant="outline" className="gap-1 text-xs">
                      <Link to={`/app/innovation/issues/${issue.id}`}>
                        Review Problem
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
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
