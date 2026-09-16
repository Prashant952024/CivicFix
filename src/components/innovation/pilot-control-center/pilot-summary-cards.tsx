import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Layers,
  Sparkles,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { PilotPlanWithDetails } from "@/lib/pilot-planning";

interface PilotSummaryCardsProps {
  pilots: PilotPlanWithDetails[];
  selectedStatus?: string;
  onSelectStatus?: (status: string) => void;
}

export function PilotSummaryCards({
  pilots,
  selectedStatus = "ALL",
  onSelectStatus,
}: PilotSummaryCardsProps) {
  const total = pilots.length;
  const draft = pilots.filter((p) => p.status === "DRAFT").length;
  const needsReview = pilots.filter(
    (p) =>
      p.status === "SUBMITTED" ||
      p.status === "RESUBMITTED" ||
      p.status === "UNDER_REVIEW"
  ).length;
  const revisionRequested = pilots.filter(
    (p) => p.status === "REQUESTED_REVISION"
  ).length;
  const approved = pilots.filter((p) => p.status === "APPROVED").length;

  const cards = [
    {
      id: "ALL",
      label: "Total Pilots",
      count: total,
      icon: FlaskConical,
      color: "text-foreground",
      bg: "bg-card",
      border: "border-border/60",
    },
    {
      id: "NEEDS_REVIEW",
      label: "Awaiting Review",
      count: needsReview,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/5",
      border: "border-blue-500/20",
    },
    {
      id: "REQUESTED_REVISION",
      label: "Revision Requested",
      count: revisionRequested,
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
    },
    {
      id: "APPROVED",
      label: "Approved (Pilot Ready)",
      count: approved,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
    },
    {
      id: "DRAFT",
      label: "In Draft",
      count: draft,
      icon: FileText,
      color: "text-muted-foreground",
      bg: "bg-muted/10",
      border: "border-border/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedStatus === c.id;
        return (
          <Card
            key={c.id}
            onClick={() => onSelectStatus?.(c.id)}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${c.bg} ${c.border} ${
              isSelected ? "ring-2 ring-primary shadow-sm" : ""
            }`}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {c.label}
                </p>
                <p className="text-xl font-bold text-foreground">{c.count}</p>
              </div>
              <div className={`p-2 rounded-lg bg-background/80 border border-border/40 ${c.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
