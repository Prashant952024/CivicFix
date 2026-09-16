import { useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Repeat,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  ComplexSolutionKnowledgeBaseRow,
  ComplexSolutionReuseDecision,
  SolutionMatchScorecard,
} from "@/types/database";

interface SolutionReuseDecisionModalProps {
  solution: ComplexSolutionKnowledgeBaseRow | null;
  scorecard?: SolutionMatchScorecard | null;
  challengeId: string;
  challengeTitle?: string;
  open: boolean;
  onClose: () => void;
  onSubmitDecision: (
    decision: ComplexSolutionReuseDecision,
    reviewNotes: string
  ) => Promise<void>;
}

export function SolutionReuseDecisionModal({
  solution,
  scorecard,
  challengeId,
  challengeTitle,
  open,
  onClose,
  onSubmitDecision,
}: SolutionReuseDecisionModalProps) {
  const [decision, setDecision] = useState<ComplexSolutionReuseDecision>("REUSE");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!solution) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reviewNotes.trim().length < 10) {
      setError("Please provide at least 10 characters explaining your governance rationale.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmitDecision(decision, reviewNotes.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record decision.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" className="max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1 pb-2 border-b border-border/60">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-3 w-3" /> Solution Reuse Governance
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Evaluate Solution Suitability
          </h2>
          <p className="text-xs text-muted-foreground">
            Target Problem: <span className="font-semibold text-foreground">{challengeTitle || challengeId.slice(0, 8)}</span>
          </p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-6"
        >
            {/* Candidate Solution Card */}
            <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Matched Historical Solution
                </span>
                <div className="flex items-center gap-2">
                  {scorecard && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      Applicability: {scorecard.overall_applicability}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {solution.problem_category}
                  </Badge>
                </div>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{solution.solution_title}</h4>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                {solution.university_name}
              </p>
            </div>

            {/* Decision Selection Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Select Authoritative Outcome
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                {/* 1. Reuse */}
                <button
                  type="button"
                  onClick={() => setDecision("REUSE")}
                  className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                    decision === "REUSE"
                      ? "border-emerald-600 bg-emerald-500/10 text-emerald-950 shadow-sm"
                      : "border-border/70 bg-surface-elevated/20 text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-700">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Direct Reuse</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Deploy validated solution with direct university collaboration.
                    </div>
                  </div>
                </button>

                {/* 2. Adapt */}
                <button
                  type="button"
                  onClick={() => setDecision("ADAPT")}
                  className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                    decision === "ADAPT"
                      ? "border-amber-600 bg-amber-500/10 text-amber-950 shadow-sm"
                      : "border-border/70 bg-surface-elevated/20 text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="rounded-xl bg-amber-500/20 p-2 text-amber-700">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Adapt Solution</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Scope localized engineering adjustments before pilot.
                    </div>
                  </div>
                </button>

                {/* 3. New Research */}
                <button
                  type="button"
                  onClick={() => setDecision("NEW_RESEARCH")}
                  className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                    decision === "NEW_RESEARCH"
                      ? "border-sky-600 bg-sky-500/10 text-sky-950 shadow-sm"
                      : "border-border/70 bg-surface-elevated/20 text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="rounded-xl bg-sky-500/20 p-2 text-sky-700">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">New Research</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Proceed to full recommendation engine and open invitations.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Governance Review Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Manager Governance Rationale & Notes *</span>
                <span className="text-[10px] text-muted-foreground font-normal">Min 10 characters</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Explain the technical, geographic, and operational reasons for your decision..."
                rows={3}
                required
                className="w-full rounded-2xl border border-border/80 bg-surface/90 p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Governance Decision
                  </>
                )}
              </Button>
            </div>
          </form>
      </div>
    </Dialog>
  );
}
