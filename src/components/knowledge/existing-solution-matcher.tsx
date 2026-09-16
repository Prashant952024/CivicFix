import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Loader2,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Sparkles,
  Wrench,
  AlertCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ComplexSolutionDetailDialog } from "@/components/knowledge/complex-solution-detail-dialog";
import { SolutionReuseDecisionModal } from "@/components/knowledge/solution-reuse-decision-modal";
import {
  findExistingSolutionMatches,
  fetchSolutionReuseReviewsForChallenge,
  recordSolutionReuseReview,
  type SolutionMatchResult,
} from "@/lib/solution-knowledge";
import type {
  ComplexSolutionKnowledgeBaseRow,
  ComplexSolutionReuseReviewRow,
  ComplexSolutionReuseDecision,
} from "@/types/database";

interface ExistingSolutionMatcherProps {
  challengeId: string;
  challengeTitle?: string;
  currentUserProfileId?: string;
  onProceedToNewResearch?: () => void;
}

export function ExistingSolutionMatcher({
  challengeId,
  challengeTitle,
  currentUserProfileId,
  onProceedToNewResearch,
}: ExistingSolutionMatcherProps) {
  const [matches, setMatches] = useState<SolutionMatchResult[]>([]);
  const [pastReviews, setPastReviews] = useState<ComplexSolutionReuseReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [selectedSolution, setSelectedSolution] = useState<ComplexSolutionKnowledgeBaseRow | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [activeMatchForDecision, setActiveMatchForDecision] = useState<SolutionMatchResult | null>(null);

  const loadData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const [matchesRes, reviewsRes] = await Promise.all([
        findExistingSolutionMatches(challengeId),
        fetchSolutionReuseReviewsForChallenge(challengeId),
      ]);
      setMatches(matchesRes);
      setPastReviews(reviewsRes);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error("Failed to load existing solution matches:", err);
      setError(err instanceof Error ? err.message : "Unable to analyze existing solutions.");
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (mounted) {
        await loadData();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  async function handleDecisionSubmit(
    decision: ComplexSolutionReuseDecision,
    reviewNotes: string
  ) {
    if (!activeMatchForDecision || !currentUserProfileId) return;

    await recordSolutionReuseReview({
      challengeId,
      solutionKbId: activeMatchForDecision.solution.id,
      decision,
      matchScores: activeMatchForDecision.scorecard,
      reviewNotes,
      decisionByProfileId: currentUserProfileId,
    });

    await loadData();
  }

  function getScoreBadge(score: "HIGH" | "MEDIUM" | "LOW") {
    switch (score) {
      case "HIGH":
        return <Badge variant="success">High</Badge>;
      case "MEDIUM":
        return <Badge variant="warning">Medium</Badge>;
      case "LOW":
        return <Badge variant="outline">Low</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-foreground">
          Checking CivicFix Knowledge Base for Verified Solutions...
        </p>
        <p className="text-xs text-muted-foreground">
          Comparing problem root causes, technology requirements, and historical deployment outcomes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold">Existing Solution Intelligence</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void loadData();
            }}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-scan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
          CivicFix checks whether previously validated and deployed civic solutions can be reused or adapted
          before initiating a new open research solicitation. AI similarity scores serve as explainable decision-support signals;
          final governance decisions belong strictly to the Innovation Manager.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Past Reviews Banner if any */}
      {pastReviews.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-surface-elevated/60 p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Previous Manager Governance Evaluations
          </div>
          <div className="space-y-2">
            {pastReviews.map((rev) => (
              <div
                key={rev.id}
                className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/60 bg-background/50 text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    Outcome: <Badge variant="outline" className="font-bold">{rev.decision}</Badge>
                  </span>
                  <p className="mt-1 text-muted-foreground">{rev.review_notes}</p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(rev.decided_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Results or Empty State */}
      {matches.length === 0 ? (
        <Card className="p-8 text-center rounded-2xl border border-dashed border-border/80 space-y-4">
          <BrainCircuit className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">No Direct Existing Solution Matches Found</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              This problem appears to require novel research or specialized technological discovery. You can proceed directly to the Recommendation Engine.
            </p>
          </div>
          {onProceedToNewResearch && (
            <Button
              onClick={onProceedToNewResearch}
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              Proceed to University Matching <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Matched Candidate Solutions ({matches.length})
          </div>

          <div className="grid gap-5">
            {matches.map(({ solution, scorecard }) => (
              <Card
                key={solution.id}
                className="overflow-hidden rounded-3xl border border-border/70 bg-surface/95 p-6 shadow-sm hover:border-emerald-500/40 transition-all space-y-5"
              >
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300/40">
                        {solution.problem_category}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                        {solution.university_name}
                      </span>
                      {solution.reuse_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">
                          <Repeat className="h-3 w-3" /> {solution.reuse_count} Reuses
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-foreground">{solution.solution_title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{solution.solution_summary}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Applicability
                    </span>
                    {getScoreBadge(scorecard.overall_applicability)}
                  </div>
                </div>

                {/* Compatibility Dimension Scorecard */}
                <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Compatibility Breakdown (Decision-Support Signal)
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                    <div className="space-y-1 p-2 rounded-xl bg-background/60 border border-border/40">
                      <div className="text-[11px] text-muted-foreground">Semantic Match</div>
                      <div>{getScoreBadge(scorecard.semantic_relevance)}</div>
                    </div>
                    <div className="space-y-1 p-2 rounded-xl bg-background/60 border border-border/40">
                      <div className="text-[11px] text-muted-foreground">Root Cause Fit</div>
                      <div>{getScoreBadge(scorecard.root_cause_compatibility)}</div>
                    </div>
                    <div className="space-y-1 p-2 rounded-xl bg-background/60 border border-border/40">
                      <div className="text-[11px] text-muted-foreground">Tech Stack Fit</div>
                      <div>{getScoreBadge(scorecard.technology_compatibility)}</div>
                    </div>
                    <div className="space-y-1 p-2 rounded-xl bg-background/60 border border-border/40">
                      <div className="text-[11px] text-muted-foreground">Deployment Fit</div>
                      <div>{getScoreBadge(scorecard.deployment_compatibility)}</div>
                    </div>
                  </div>
                </div>

                {/* Key Strengths & Adaptation Needs */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                    <div className="font-semibold text-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Strengths & Validated Assets
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-emerald-950/80 text-[11px]">
                      {scorecard.key_strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                    <div className="font-semibold text-amber-900 flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5 text-amber-600" /> Adaptation Requirements
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-amber-950/80 text-[11px]">
                      {scorecard.adaptation_requirements.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSolution(solution);
                      setInspectOpen(true);
                    }}
                    className="w-full sm:w-auto gap-1.5 text-xs rounded-xl"
                  >
                    Inspect Full Solution Evidence <ExternalLink className="h-3.5 w-3.5" />
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveMatchForDecision({ solution, scorecard });
                        setDecisionModalOpen(true);
                      }}
                      className="w-full sm:w-auto gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    >
                      <Repeat className="h-3.5 w-3.5" /> Governance Review
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inspect Dialog */}
      <ComplexSolutionDetailDialog
        solution={selectedSolution}
        open={inspectOpen}
        onClose={() => setInspectOpen(false)}
        onSelectForReuse={(sol) => {
          setInspectOpen(false);
          const matched = matches.find((m) => m.solution.id === sol.id);
          if (matched) {
            setActiveMatchForDecision(matched);
            setDecisionModalOpen(true);
          }
        }}
      />

      {/* Governance Review Modal */}
      <SolutionReuseDecisionModal
        solution={activeMatchForDecision?.solution ?? null}
        scorecard={activeMatchForDecision?.scorecard ?? null}
        challengeId={challengeId}
        challengeTitle={challengeTitle}
        open={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onSubmitDecision={handleDecisionSubmit}
      />
    </div>
  );
}
