import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Radio,
  Rocket,
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
  const needsReview = pilots.filter(
    (p) =>
      p.status === "SUBMITTED" ||
      p.status === "RESUBMITTED" ||
      p.status === "UNDER_REVIEW"
  ).length;
  const activePilots = pilots.filter(
    (p) => p.project?.research_stage === "PILOT_ACTIVE"
  ).length;
  const approvedReady = pilots.filter(
    (p) => p.status === "APPROVED" && p.project?.research_stage === "PILOT_READY"
  ).length;
  const inValidation = pilots.filter(
    (p) => p.project?.research_stage === "VALIDATION"
  ).length;
  const revisionRequested = pilots.filter(
    (p) => p.status === "REQUESTED_REVISION"
  ).length;

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
      id: "PILOT_ACTIVE",
      label: "Active Pilots",
      count: activePilots,
      icon: Radio,
      color: "text-emerald-500",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
    },
    {
      id: "VALIDATION",
      label: "In Validation",
      count: inValidation,
      icon: CheckCircle2,
      color: "text-purple-500",
      bg: "bg-purple-500/5",
      border: "border-purple-500/20",
    },
    {
      id: "PILOT_READY",
      label: "Approved (Ready)",
      count: approvedReady,
      icon: Rocket,
      color: "text-primary",
      bg: "bg-primary/5",
      border: "border-primary/20",
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
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {c.label}
                </p>
                <p className="text-xl font-bold tracking-tight text-foreground">
                  {c.count}
                </p>
              </div>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg} border ${c.border} ${c.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
