import React from "react";
import { History, GitCommit, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PilotValidationRevisionRow } from "@/lib/pilot-validation";

interface ValidationHistoryCardProps {
  revisions: PilotValidationRevisionRow[];
}

export function ValidationHistoryCard({ revisions }: ValidationHistoryCardProps) {
  if (revisions.length === 0) {
    return (
      <Card className="border-border/60 bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Validation Version Audit History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No previous revision snapshots recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Validation Version Audit History ({revisions.length} Snapshot{revisions.length > 1 ? "s" : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {revisions.map((rev, idx) => (
          <div
            key={rev.id || idx}
            className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                  Version {rev.version}
                </Badge>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                  {rev.status}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {rev.submitted_at
                  ? new Date(rev.submitted_at).toLocaleString()
                  : new Date(rev.created_at).toLocaleString()}
              </span>
            </div>

            <div className="text-xs text-foreground space-y-1">
              <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                Summary Snapshot:
              </p>
              <p className="text-muted-foreground leading-relaxed line-clamp-3">{rev.overall_summary}</p>
            </div>

            {rev.review_feedback && (
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <MessageSquare className="h-3 w-3" />
                  <span>Innovation Manager Feedback:</span>
                </div>
                <p className="leading-relaxed">{rev.review_feedback}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
