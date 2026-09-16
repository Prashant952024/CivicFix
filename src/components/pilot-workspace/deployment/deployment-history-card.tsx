import React from "react";
import {
  Clock,
  FileText,
  History,
  MessageSquare,
  Sparkles,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeploymentPlanRevisionRow } from "@/lib/deployment-impact";

interface DeploymentHistoryCardProps {
  revisions: DeploymentPlanRevisionRow[];
}

export function DeploymentHistoryCard({ revisions }: DeploymentHistoryCardProps) {
  if (!revisions || revisions.length === 0) {
    return (
      <Card className="border-border/60 bg-card">
        <CardContent className="py-12 px-6 flex flex-col items-center text-center max-w-md mx-auto space-y-3">
          <History className="h-8 w-8 text-muted-foreground/60" />
          <h3 className="text-sm font-bold text-foreground">No Previous Revisions</h3>
          <p className="text-xs text-muted-foreground">
            This deployment plan is currently on its initial version (v1). Any requested changes and resubmissions will be archived here as immutable snapshots.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Scale-up Plan Revision History ({revisions.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {revisions.map((rev) => (
          <div
            key={rev.id}
            className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono font-bold">
                  Version {rev.version}
                </Badge>
                <span className="font-bold text-foreground">{rev.title}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(rev.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {rev.summary}
            </p>

            {rev.review_feedback && (
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Manager Feedback (v{rev.version}):
                </div>
                <p>{rev.review_feedback}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
