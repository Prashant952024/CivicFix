import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Clock,
  FileText,
  FlaskConical,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PilotReviewPanel } from "@/components/innovation/pilot-control-center/pilot-review-panel";
import {
  fetchPilotPlanByProjectId,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityPilotViewProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityPilotView({ institution }: UniversityPilotViewProps) {
  const projectId = institution.projectId;
  const [plan, setPlan] = useState<PilotPlanWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPilotPlanByProjectId(projectId);
      setPlan(data);
    } catch (err: any) {
      console.error("Failed to load pilot plan for university workspace:", err);
      setError(err.message || "Failed to load pilot plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlan();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading pilot governance dossier...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>{error}</p>
      </div>
    );
  }

  if (!projectId) {
    return (
      <Card className="border-border/60 bg-card">
        <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-md mx-auto space-y-3">
          <Lock className="h-8 w-8 text-muted-foreground/60" />
          <h3 className="text-sm font-bold text-foreground">Project Workspace Not Initialized</h3>
          <p className="text-xs text-muted-foreground">
            {institution.institutionName} has not yet initiated their research project workspace.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (institution.proposalStatus !== "APPROVED") {
    return (
      <Card className="border-border/60 bg-muted/10">
        <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-lg mx-auto space-y-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Pilot Governance Gate Active</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {institution.institutionName}'s research proposal must be formally reviewed and approved before a real-world pilot plan can be submitted for governance review.
          </p>
          <Badge variant="outline" className="text-[10px] font-mono">
            Proposal Status: {institution.proposalStatus || "NONE"}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card className="border-border/60 bg-card">
        <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-lg mx-auto space-y-3">
          <FlaskConical className="h-8 w-8 text-muted-foreground/60" />
          <h3 className="text-sm font-bold text-foreground">No Pilot Plan Submitted Yet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {institution.institutionName} has an approved research proposal and is eligible to submit a pilot plan. Once formulated and submitted, the pilot plan dossier will appear here for governance review.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadPlan()}
            className="text-xs h-8 gap-1.5 mt-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Check for Submissions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <PilotReviewPanel
      pilot={plan}
      onClose={() => {}}
      onRefresh={loadPlan}
    />
  );
}
