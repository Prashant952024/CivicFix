import {
  Bell,
  Clock,
  FileText,
  Layers,
  Send,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatElapsedWaitingTime, type InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityUpdatesProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityUpdates({ institution }: UniversityUpdatesProps) {
  const updates = institution.scopedUpdates || [];

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case "PROPOSAL":
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case "TEAM":
        return <Users className="w-3.5 h-3.5 text-sky-600" />;
      case "PROJECT":
        return <Layers className="w-3.5 h-3.5 text-purple-600" />;
      case "INVITATION":
        return <Send className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span>Collaboration Communication &amp; Milestone Updates</span>
          </h4>
          <p className="text-muted-foreground">
            Activity, deliverable revisions, and milestone progress submitted by {institution.institutionName}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {updates.length} Updates Recorded
        </Badge>
      </div>

      {updates.length === 0 ? (
        <EmptyState
          title="No Updates Recorded Yet"
          description={`As ${institution.institutionName}'s research team updates deliverables, registers team members, or submits proposals, chronological updates will appear here.`}
        />
      ) : (
        <div className="space-y-3">
          {updates.map((upd) => (
            <Card key={upd.id} className="border-border/80 shadow-xs hover:border-border transition">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="h-8 w-8 rounded-xl bg-muted/40 border border-border flex items-center justify-center shrink-0 mt-0.5">
                  {getUpdateIcon(upd.type)}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-xs">
                      {upd.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(upd.timestamp).toLocaleString()} ({formatElapsedWaitingTime(upd.timestamp)} ago)
                    </span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {upd.description}
                  </p>

                  {upd.actorName && (
                    <span className="text-[10px] text-primary/80 font-semibold block pt-0.5">
                      Updated by: {upd.actorName}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
