import { useState, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Image as ImageIcon,
  Info,
  Layers,
  MapPin,
  ShieldAlert,
  Sparkles,
  Tag,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { fetchHistoricalIssuesForRecommendation } from "@/lib/solution-knowledge";
import type {
  PreventiveRecommendationRow,
  PreventiveRecommendationStatus,
} from "@/types/database";

interface PreventiveRecommendationDetailDialogProps {
  recommendation: PreventiveRecommendationRow | null;
  open: boolean;
  onClose: () => void;
  onReview: (status: PreventiveRecommendationStatus, notes?: string) => Promise<void>;
}

export function PreventiveRecommendationDetailDialog({
  recommendation,
  open,
  onClose,
  onReview,
}: PreventiveRecommendationDetailDialogProps) {
  const [historicalIssues, setHistoricalIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (recommendation?.historical_issue_ids && recommendation.historical_issue_ids.length > 0) {
      setLoadingIssues(true);
      fetchHistoricalIssuesForRecommendation(recommendation.historical_issue_ids)
        .then((issues) => setHistoricalIssues(issues))
        .catch((err) => {
          if (import.meta.env.DEV) console.error("Error loading historical issues:", err);
        })
        .finally(() => setLoadingIssues(false));
    } else {
      setHistoricalIssues([]);
    }
  }, [recommendation]);

  if (!recommendation) return null;

  async function handleAction(status: PreventiveRecommendationStatus) {
    setActionError(null);
    setSubmitting(true);
    try {
      await onReview(status, notes);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to record review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl" className="max-w-3xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
              {recommendation.category}
            </Badge>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-rose-500" /> {recommendation.area_name}
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              {recommendation.occurrence_count} Recorded Occurrences
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {recommendation.title}
          </h2>
        </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Why am I seeing this? */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5">
              <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="h-4 w-4 text-emerald-600" /> Why am I seeing this?
              </h3>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                {recommendation.justification}
              </p>
            </div>

            {/* Recommended Action */}
            <div className="rounded-2xl border border-border/70 bg-surface-elevated/50 p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recommended Preventive Action
              </h3>
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {recommendation.recommended_action}
              </p>
              {recommendation.seasonal_timing && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Target Window: {recommendation.seasonal_timing}</span>
                </div>
              )}
            </div>

            {/* Underlying Traceable Issues */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="h-4 w-4 text-indigo-600" /> Underlying Closed & Verified Issues ({historicalIssues.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">100% Traceable to Citizen Reports</span>
              </div>

              {loadingIssues ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Loading verified issue evidence...
                </div>
              ) : historicalIssues.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-surface-elevated/30 rounded-xl">
                  No linked issue records available.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historicalIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/60 bg-surface-elevated/30 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{issue.title}</span>
                          <Badge variant="success" className="text-[10px] py-0">Verified Closed</Badge>
                        </div>
                        <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                          <span>Reported: {new Date(issue.created_at).toLocaleDateString()}</span>
                          {issue.resolved_at && (
                            <span>Resolved: {new Date(issue.resolved_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {issue.before_image && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border/60 rounded-md px-1.5 py-0.5">
                            <ImageIcon className="h-3 w-3" /> Before
                          </span>
                        )}
                        {issue.after_image && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 rounded-md px-1.5 py-0.5">
                            <CheckCircle2 className="h-3 w-3" /> After
                          </span>
                        )}
                        <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] px-2">
                          <Link to={`/app/officer/issues/${issue.id}`} target="_blank">
                            Inspect <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Officer Action Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Officer Review Notes / Scheduling Details (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes on scheduled maintenance crew, work orders, or justification if dismissing..."
                rows={2}
                className="w-full rounded-2xl border border-border/80 bg-surface/90 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {actionError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/70 bg-surface-elevated/60 p-4 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleAction("DISMISSED")}
              disabled={submitting}
              className="w-full sm:w-auto text-xs text-muted-foreground hover:text-red-700 gap-1.5"
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Dismiss Pattern
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAction("ACKNOWLEDGED")}
                disabled={submitting}
                className="w-full sm:w-auto text-xs rounded-xl"
              >
                Acknowledge
              </Button>
              <Button
                type="button"
                onClick={() => handleAction("ACTIONED")}
                disabled={submitting}
                className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Schedule Maintenance
              </Button>
            </div>
          </div>
      </div>
    </Dialog>
  );
}
