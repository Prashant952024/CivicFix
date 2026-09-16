import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Layers,
  MessageSquare,
  ShieldCheck,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PilotPlanRevisionRow } from "@/types/database";

interface PilotReviewHistoryProps {
  revisions: PilotPlanRevisionRow[];
}

export function PilotReviewHistory({ revisions }: PilotReviewHistoryProps) {
  const [expandedVer, setExpandedVer] = useState<number | null>(null);

  if (!revisions || revisions.length === 0) return null;

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border/40">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <History className="h-4 w-4 text-primary" />
          Pilot Plan Governance & Revision History ({revisions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {revisions.map((rev) => {
          const isExpanded = expandedVer === rev.version;
          return (
            <div
              key={rev.id || rev.version}
              className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2 transition-colors"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedVer(isExpanded ? null : rev.version)}
              >
                <div className="flex items-center gap-2.5">
                  <Badge variant="outline" className="font-mono text-xs font-bold">
                    v{rev.version}
                  </Badge>
                  <div>
                    <span className="text-xs font-bold text-foreground block">{rev.title}</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Submitted: {new Date(rev.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {rev.status}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="pt-2 border-t border-border/40 space-y-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Objective:</span>
                    <p className="whitespace-pre-wrap">{rev.objective}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Testbed:</span>
                    <p>{rev.location_description} ({rev.test_environment_type})</p>
                  </div>
                  {rev.feedback && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-foreground">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">
                        Manager Feedback on this Version:
                      </span>
                      <p className="whitespace-pre-wrap">{rev.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
