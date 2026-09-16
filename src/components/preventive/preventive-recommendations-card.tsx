import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Layers,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PreventiveRecommendationDetailDialog } from "@/components/preventive/preventive-recommendation-detail-dialog";
import {
  fetchPreventiveRecommendations,
  reviewPreventiveRecommendation,
} from "@/lib/solution-knowledge";
import type {
  PreventiveRecommendationRow,
  PreventiveRecommendationStatus,
} from "@/types/database";

interface PreventiveRecommendationsCardProps {
  departmentId?: string;
  currentUserProfileId?: string;
  compact?: boolean;
}

export function PreventiveRecommendationsCard({
  departmentId,
  currentUserProfileId,
  compact = false,
}: PreventiveRecommendationsCardProps) {
  const [recommendations, setRecommendations] = useState<PreventiveRecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<PreventiveRecommendationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const data = await fetchPreventiveRecommendations({
        departmentId,
        status: "ALL",
      });
      setRecommendations(data);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load preventive recommendations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecommendations();
  }, [departmentId]);

  async function handleReview(status: PreventiveRecommendationStatus, notes?: string) {
    if (!selectedRec || !currentUserProfileId) return;

    await reviewPreventiveRecommendation({
      recommendationId: selectedRec.id,
      status,
      reviewerProfileId: currentUserProfileId,
      reviewNotes: notes,
    });

    await loadRecommendations();
    setDialogOpen(false);
  }

  const activeRecs = recommendations.filter(
    (r) => r.status === "NEW" || r.status === "UNDER_REVIEW" || r.status === "ACKNOWLEDGED"
  );

  if (loading) {
    return (
      <Card className="p-6 rounded-3xl border border-border/70 animate-pulse bg-surface/50">
        <div className="h-6 w-48 bg-muted rounded-lg mb-3" />
        <div className="h-20 bg-muted/50 rounded-2xl" />
      </Card>
    );
  }

  if (activeRecs.length === 0) {
    if (compact) return null;
    return (
      <Card className="p-6 rounded-3xl border border-border/70 bg-surface/90 text-center space-y-2">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <h4 className="text-sm font-semibold text-foreground">No Recurring Issue Patterns Detected</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          As citizen-verified simple resolutions accumulate across your wards, recurring seasonal patterns and preventive maintenance recommendations will appear here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface/90 to-surface p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-2xl bg-amber-500/20 p-2 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              Preventive Maintenance Intelligence
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {activeRecs.length} Active
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Proactive maintenance signals generated from verified historical issue clusters.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => loadRecommendations()}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Recommendations Feed */}
      <div className="grid gap-3">
        {(compact ? activeRecs.slice(0, 2) : activeRecs).map((rec) => (
          <div
            key={rec.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-background/80 p-4 transition-all hover:border-amber-500/40"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {rec.category}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-rose-500" /> {rec.area_name}
                </span>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-full">
                  {rec.occurrence_count} Occurrences
                </span>
                {rec.seasonal_timing && (
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" /> {rec.seasonal_timing}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-foreground truncate">{rec.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{rec.recommended_action}</p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedRec(rec);
                setDialogOpen(true);
              }}
              className="shrink-0 gap-1.5 text-xs rounded-xl border-amber-300/50 hover:bg-amber-50 text-amber-900"
            >
              <Eye className="h-3.5 w-3.5" /> Review Pattern
            </Button>
          </div>
        ))}
      </div>

      {/* Dialog */}
      <PreventiveRecommendationDetailDialog
        recommendation={selectedRec}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onReview={handleReview}
      />
    </Card>
  );
}
