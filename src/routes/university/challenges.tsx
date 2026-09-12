import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { fetchInstitutionById } from "@/lib/institutions";
import { supabase } from "@/lib/supabase";
import type { Database, InstitutionRow } from "@/types/database";

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];

export function UniversityChallengesPage() {
  const { profile } = useAppSession();
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeRow | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        let instId = profile?.institution_id;
        if (!instId && profile?.id) {
          const { data: memberRecord } = await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          if (memberRecord?.institution_id) instId = memberRecord.institution_id;
        }
        if (!instId) {
          const { data: fallbackInst } = await supabase
            .from("institutions")
            .select("id")
            .eq("name", "IIT Bombay")
            .maybeSingle();
          if (fallbackInst) instId = fallbackInst.id;
        }

        if (instId) {
          const inst = await fetchInstitutionById(instId);
          if (!cancelled) setInstitution(inst);
        }

        const { data, error } = await supabase
          .from("innovation_challenges")
          .select("*")
          .in("status", ["APPROVED", "READY_FOR_MATCHING", "OPEN_FOR_PROPOSALS"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) setChallenges(data ?? []);
      } catch (err) {
        console.error("Failed to load challenges:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [profile?.institution_id, profile?.id, refreshNonce]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    challenges.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (selectedCategory !== "ALL" && c.category !== selectedCategory) return false;
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matchesTitle = c.title.toLowerCase().includes(term);
        const matchesStatement = c.problem_statement.toLowerCase().includes(term);
        const matchesCategory = c.category.toLowerCase().includes(term);
        const matchesDomains = c.required_domains.some((d) => d.toLowerCase().includes(term));
        if (!matchesTitle && !matchesStatement && !matchesCategory && !matchesDomains) return false;
      }
      return true;
    });
  }, [challenges, selectedCategory, search]);

  const institutionDomains = useMemo(() => {
    return new Set(institution?.research_domains?.map((d) => d.toLowerCase()) || []);
  }, [institution]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        tag="Innovation Challenges"
        title="Civic Innovation Challenges"
        description="Explore complex municipal problem statements approved for university research, prototyping, and pilot deployments."
        backHref="/app/university"
        backLabel="Dashboard"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshNonce((v) => v + 1)}
            className="border-border text-foreground hover:bg-surface-elevated"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Search & Filter */}
      <Card className="border border-border/80 bg-surface/90 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search challenges by title, domain, or technology..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenges Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse border border-border/60 bg-muted/20" />
          ))}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No innovation challenges found"
          description="There are currently no challenges matching your query. Check back when new municipal challenges are formulated."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChallenges.map((challenge) => {
            const hasDomainOverlap = challenge.required_domains?.some((d) =>
              institutionDomains.has(d.toLowerCase())
            );

            return (
              <Card
                key={challenge.id}
                className="group flex flex-col justify-between border border-border/80 bg-surface/90 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">
                        {challenge.category}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {hasDomainOverlap && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            <Sparkles className="h-2.5 w-2.5" />
                            Domain Match
                          </span>
                        )}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {challenge.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {challenge.title}
                    </h3>

                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                      {challenge.problem_statement}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3">
                    {/* Required Domains */}
                    {challenge.required_domains && challenge.required_domains.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">Target Domains:</span>
                        <div className="flex flex-wrap gap-1">
                          {challenge.required_domains.map((d, i) => {
                            const isMatch = institutionDomains.has(d.toLowerCase());
                            return (
                              <span
                                key={i}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                                  isMatch
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-sky-50 text-sky-700 border-sky-200/60"
                                }`}
                              >
                                {d}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Metadata strip */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <span>Scope: {challenge.geographic_scope || "City-wide"}</span>
                      {challenge.complexity_score && (
                        <span>Complexity: {challenge.complexity_score}/100</span>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="border-t border-border/80 bg-muted/20 px-4 py-2.5 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedChallenge(challenge)}
                    className="text-xs font-semibold text-primary"
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Inspect Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Challenge Inspector Dialog */}
      <Dialog
        open={Boolean(selectedChallenge)}
        onClose={() => setSelectedChallenge(null)}
        title={selectedChallenge?.title || "Challenge Details"}
        description={`${selectedChallenge?.category || ""} · Approved Civic Innovation Challenge`}
      >
        {selectedChallenge && (
          <div className="space-y-4 pt-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Problem Statement
              </div>
              <p className="text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/80">
                {selectedChallenge.problem_statement}
              </p>
            </div>

            {selectedChallenge.root_cause && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Root Cause Analysis
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedChallenge.root_cause}
                </p>
              </div>
            )}

            {selectedChallenge.current_limitations && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Limitations of Existing Municipal Approach
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedChallenge.current_limitations}
                </p>
              </div>
            )}

            {/* Objectives */}
            {selectedChallenge.objectives && selectedChallenge.objectives.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Key Objectives
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {selectedChallenge.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Potential Technologies */}
            {selectedChallenge.potential_technology_areas && selectedChallenge.potential_technology_areas.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Potential Technology Solutions
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedChallenge.potential_technology_areas.map((t, i) => (
                    <span key={i} className="rounded bg-purple-50 px-2 py-0.5 text-purple-700 border border-purple-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Outcomes */}
            {selectedChallenge.expected_outcomes && selectedChallenge.expected_outcomes.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Expected Outcomes
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {selectedChallenge.expected_outcomes.map((out, i) => (
                    <li key={i}>{out}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-primary text-[11px]">
              <div className="font-semibold">Future Phase 3C Matching Preview</div>
              <p className="mt-0.5 text-primary/80">
                In Phase 3C-Matching, institutions with matching capability intelligence will receive direct algorithmic invitations and proposal submission workflows.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button size="sm" onClick={() => setSelectedChallenge(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
