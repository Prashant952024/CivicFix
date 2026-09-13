import {
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

interface UniversityActivityProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityActivity({ institution }: UniversityActivityProps) {
  const events = institution.scopedTimeline || [];

  const getEventIcon = (category: string) => {
    switch (category) {
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
            <Clock className="w-4 h-4 text-primary" />
            <span>Collaboration Audit &amp; Activity History</span>
          </h4>
          <p className="text-muted-foreground">
            Chronological audit strictly scoped to {institution.institutionName}'s participation in this problem
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {events.length} Historical Events
        </Badge>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No Activity Events Recorded"
          description={`Events for ${institution.institutionName} will be logged here as outreach, team onboarding, and proposal milestones occur.`}
        />
      ) : (
        <Card className="border-border shadow-xs">
          <CardContent className="p-6">
            <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
              {events.map((event) => (
                <div key={event.id} className="relative space-y-1 group">
                  <div className="absolute -left-7 top-0.5 h-6 w-6 rounded-full border-2 border-background bg-card flex items-center justify-center shadow-xs">
                    {getEventIcon(event.category)}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-xs sm:text-sm">
                        {event.title}
                      </span>
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {event.category}
                      </Badge>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(event.timestamp).toLocaleString()} ({formatElapsedWaitingTime(event.timestamp)} ago)
                    </span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>

                  {event.actorName && (
                    <span className="text-[10px] text-primary/80 font-medium block">
                      Actor: {event.actorName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
