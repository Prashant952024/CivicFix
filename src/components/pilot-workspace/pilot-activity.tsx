import React from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck,
  FilePlus,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChallengeProjectActivityWithActor } from "@/lib/projects";

interface PilotActivityProps {
  activity: ChallengeProjectActivityWithActor[];
}

export function PilotActivity({ activity }: PilotActivityProps) {
  // Filter for pilot-specific activity
  const pilotActivities = activity.filter((a) =>
    a.activity_type.startsWith("PILOT_")
  );

  if (pilotActivities.length === 0) {
    return (
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Pilot Governance Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs text-muted-foreground italic">
          No pilot governance events recorded yet.
        </CardContent>
      </Card>
    );
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case "PILOT_PLAN_CREATED":
        return <FilePlus className="h-3.5 w-3.5 text-blue-400" />;
      case "PILOT_PLAN_UPDATED":
        return <Edit3 className="h-3.5 w-3.5 text-indigo-400" />;
      case "PILOT_PLAN_SUBMITTED":
      case "PILOT_RESUBMITTED":
        return <Send className="h-3.5 w-3.5 text-amber-400" />;
      case "PILOT_REVIEW_STARTED":
        return <Clock className="h-3.5 w-3.5 text-purple-400" />;
      case "PILOT_REVISION_REQUESTED":
        return <MessageSquare className="h-3.5 w-3.5 text-amber-500" />;
      case "PILOT_APPROVED":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "PILOT_REJECTED":
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-primary" />;
    }
  };

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border/40">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Pilot Governance Timeline ({pilotActivities.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-border/60">
          {pilotActivities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 pl-1 text-xs relative">
              <div className="h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center shrink-0 z-10 shadow-xs">
                {renderIcon(act.activity_type)}
              </div>
              <div className="flex-1 min-w-0 bg-muted/20 p-2.5 rounded-md border border-border/40">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-foreground text-xs">{act.description}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
                {act.actor && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Actor: {act.actor.full_name || act.actor.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
