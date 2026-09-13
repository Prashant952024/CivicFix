import { useMemo, useState } from "react";
import {
  BrainCircuit,
  Clock,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProblemControlCenterData } from "@/lib/innovation";

interface ActivityTabProps {
  timeline: ProblemControlCenterData["timeline"];
}

type TimelineCategoryFilter =
  | "ALL"
  | "CLASSIFICATION"
  | "CHALLENGE"
  | "MATCHING"
  | "INVITATION"
  | "PROJECT"
  | "TEAM"
  | "PROPOSAL"
  | "SYSTEM";

export function ActivityTab({ timeline }: ActivityTabProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<TimelineCategoryFilter>("ALL");

  const filteredTimeline = useMemo(() => {
    if (selectedCategory === "ALL") return timeline;
    return timeline.filter((item) => item.category === selectedCategory);
  }, [timeline, selectedCategory]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "CLASSIFICATION":
        return <BrainCircuit className="w-3.5 h-3.5 text-amber-600" />;
      case "CHALLENGE":
        return <Sparkles className="w-3.5 h-3.5 text-teal-600" />;
      case "MATCHING":
        return <GraduationCap className="w-3.5 h-3.5 text-sky-600" />;
      case "INVITATION":
        return <Send className="w-3.5 h-3.5 text-indigo-600" />;
      case "PROJECT":
        return <Layers className="w-3.5 h-3.5 text-purple-600" />;
      case "TEAM":
        return <Users className="w-3.5 h-3.5 text-blue-600" />;
      case "PROPOSAL":
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </span>
          <Button
            size="sm"
            variant={selectedCategory === "ALL" ? "default" : "outline"}
            onClick={() => setSelectedCategory("ALL")}
            className="text-xs h-8 px-2.5"
          >
            All ({timeline.length})
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === "INVITATION" ? "default" : "outline"}
            onClick={() => setSelectedCategory("INVITATION")}
            className="text-xs h-8 px-2.5"
          >
            Invitations
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === "PROJECT" ? "default" : "outline"}
            onClick={() => setSelectedCategory("PROJECT")}
            className="text-xs h-8 px-2.5"
          >
            Projects
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === "TEAM" ? "default" : "outline"}
            onClick={() => setSelectedCategory("TEAM")}
            className="text-xs h-8 px-2.5"
          >
            Teams
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === "PROPOSAL" ? "default" : "outline"}
            onClick={() => setSelectedCategory("PROPOSAL")}
            className="text-xs h-8 px-2.5"
          >
            Proposals
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === "MATCHING" ? "default" : "outline"}
            onClick={() => setSelectedCategory("MATCHING")}
            className="text-xs h-8 px-2.5"
          >
            Matching
          </Button>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredTimeline.length} events
        </span>
      </div>

      {/* 2. CHRONOLOGICAL TIMELINE */}
      {timeline.length === 0 ? (
        <EmptyState
          title="No Activity Recorded Yet"
          description="Activity events such as matching runs, invitation responses, project creation, team member onboarding, and proposal submissions will be logged here."
        />
      ) : filteredTimeline.length === 0 ? (
        <EmptyState
          title="No Events In This Category"
          description="No lifecycle events match the selected category filter."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory("ALL")}
            >
              Show All Events
            </Button>
          }
        />
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
              {filteredTimeline.map((event) => (
                <div key={event.id} className="relative space-y-1.5 group">
                  {/* Category node icon */}
                  <div className="absolute -left-7 top-0.5 h-6 w-6 rounded-full border-2 border-background bg-card flex items-center justify-center shadow-xs">
                    {getCategoryIcon(event.category)}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {event.title}
                      </span>
                      <Badge variant="outline" className="text-[9px] font-mono uppercase">
                        {event.category}
                      </Badge>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>

                  {event.actorName && (
                    <span className="text-[11px] text-primary/85 font-medium block">
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
