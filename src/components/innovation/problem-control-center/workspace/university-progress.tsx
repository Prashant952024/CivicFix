import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Layers,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstitutionLifecycleTrack, ProblemControlCenterData } from "@/lib/innovation";

interface UniversityProgressProps {
  institution: InstitutionLifecycleTrack;
  problem: ProblemControlCenterData["problem"];
}

interface MilestoneItem {
  name?: string;
  title?: string;
  description?: string;
  target_date?: string;
  timeline?: string;
  deliverable?: string;
  status?: string;
}

export function UniversityProgress({ institution, problem }: UniversityProgressProps) {
  const currentProposal = institution.proposals?.find((p) => p.isCurrent) || institution.proposals?.[0];
  const isAccepted = institution.invitationStatus === "ACCEPTED";
  const hasProject = Boolean(institution.projectId);
  const teamCount = institution.teamMembersCount || 0;
  const proposalStatus = currentProposal?.status || institution.proposalStatus;
  const hasSubmittedProposal =
    proposalStatus === "SUBMITTED" ||
    proposalStatus === "UNDER_REVIEW" ||
    proposalStatus === "REQUESTED_REVISION" ||
    proposalStatus === "RESUBMITTED" ||
    proposalStatus === "APPROVED";
  const isApproved = proposalStatus === "APPROVED";
  const isProjectActive = institution.projectStatus === "ACTIVE";
  const isCompleted = institution.projectStatus === "COMPLETED";

  // Calculate authentic progression percentage based strictly on persisted database states
  let progressPercent = 0;
  let progressStageLabel = "Not Started";

  if (isCompleted) {
    progressPercent = 100;
    progressStageLabel = "Completed";
  } else if (isApproved && isProjectActive) {
    progressPercent = 85;
    progressStageLabel = "Research & Prototyping Active";
  } else if (isApproved) {
    progressPercent = 80;
    progressStageLabel = "Proposal Approved";
  } else if (proposalStatus === "UNDER_REVIEW" || proposalStatus === "RESUBMITTED") {
    progressPercent = 70;
    progressStageLabel = "Proposal Under Evaluation";
  } else if (proposalStatus === "SUBMITTED") {
    progressPercent = 65;
    progressStageLabel = "Proposal Submitted";
  } else if (proposalStatus === "REQUESTED_REVISION") {
    progressPercent = 55;
    progressStageLabel = "Revision Requested";
  } else if (teamCount >= 3) {
    progressPercent = 50;
    progressStageLabel = "Team Fully Staffed";
  } else if (teamCount > 0) {
    progressPercent = 40;
    progressStageLabel = "Team Formation In Progress";
  } else if (hasProject) {
    progressPercent = 35;
    progressStageLabel = "Workspace Provisioned";
  } else if (isAccepted) {
    progressPercent = 30;
    progressStageLabel = "Invitation Accepted";
  } else if (institution.invitationStatus === "SENT" || institution.invitationStatus === "PENDING") {
    progressPercent = 15;
    progressStageLabel = "Awaiting Invitation Response";
  } else if (institution.isSelected) {
    progressPercent = 5;
    progressStageLabel = "Candidate Selected";
  }

  // Parse milestones from structured proposal if present
  let milestones: MilestoneItem[] = [];
  if (currentProposal && "milestones" in currentProposal && Array.isArray((currentProposal as unknown as { milestones?: unknown[] }).milestones)) {
    milestones = (currentProposal as unknown as { milestones: MilestoneItem[] }).milestones;
  }

  const stages = [
    {
      id: "invitation",
      name: "Outreach & Invitation",
      desc: "Municipal invitation dispatch & institutional acceptance",
      status: isAccepted
        ? "COMPLETED"
        : institution.invitationStatus === "SENT" || institution.invitationStatus === "PENDING"
        ? "IN_PROGRESS"
        : "PENDING",
      timestamp: isAccepted ? institution.respondedAt : institution.invitedAt,
      icon: Send,
    },
    {
      id: "team",
      name: "Research Team Formation",
      desc: "Principal Investigator onboarding and multidisciplinary staffing",
      status: teamCount >= 2
        ? "COMPLETED"
        : hasProject
        ? "IN_PROGRESS"
        : "PENDING",
      detail: `${teamCount} member${teamCount === 1 ? "" : "s"} provisioned`,
      icon: Users,
    },
    {
      id: "proposal",
      name: "Research Proposal Submission",
      desc: "11-section formal technical methodology & deliverable commitment",
      status: hasSubmittedProposal
        ? "COMPLETED"
        : hasProject
        ? "IN_PROGRESS"
        : "PENDING",
      detail: proposalStatus ? `Version ${currentProposal?.versionNumber || 1} (${proposalStatus})` : "Draft pending",
      icon: FileText,
    },
    {
      id: "review",
      name: "Innovation Manager Review",
      desc: "Administrative evaluation, revision review, and formal authorization",
      status: isApproved
        ? "COMPLETED"
        : proposalStatus === "UNDER_REVIEW" || proposalStatus === "SUBMITTED" || proposalStatus === "REQUESTED_REVISION"
        ? "IN_PROGRESS"
        : "PENDING",
      detail: isApproved ? "Approved Solution" : proposalStatus === "REQUESTED_REVISION" ? "Revision Required" : "Awaiting Review",
      icon: FileCheck,
    },
    {
      id: "execution",
      name: "Research & Prototype Development",
      desc: "Active research execution, testbed integration, and milestone delivery",
      status: isCompleted
        ? "COMPLETED"
        : isProjectActive
        ? "IN_PROGRESS"
        : "PENDING",
      detail: isProjectActive ? "Active Workspace" : "Activates upon proposal approval",
      icon: Layers,
    },
    {
      id: "deployment",
      name: "Field Pilot & Civic Deployment",
      desc: "Validation in municipal environment and handoff to city operations",
      status: isCompleted ? "COMPLETED" : "PENDING",
      detail: isCompleted ? "Fully Deployed" : "Future lifecycle milestone",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6 text-xs">
      {/* 1. OVERALL PROGRESS HERO CARD */}
      <Card className="border-border/90 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Lifecycle Progression
              </span>
              <h3 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                <span>{progressStageLabel}</span>
                <Badge
                  className={
                    progressPercent >= 80
                      ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold text-xs"
                      : progressPercent >= 50
                      ? "bg-sky-100 text-sky-950 border-sky-300 font-bold text-xs"
                      : "bg-amber-100 text-amber-950 border-amber-300 font-bold text-xs"
                  }
                >
                  {progressPercent}% Complete
                </Badge>
              </h3>
              <p className="text-muted-foreground text-xs">
                Tracking {institution.institutionName}'s research collaboration on "{problem.title}"
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Project Workspace
                </span>
                <span className="font-bold text-foreground block">
                  {institution.projectId ? institution.projectStatus || "Active" : "Not Provisioned"}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent >= 80
                    ? "bg-gradient-to-r from-teal-500 to-emerald-600"
                    : progressPercent >= 50
                    ? "bg-gradient-to-r from-sky-500 to-indigo-600"
                    : "bg-gradient-to-r from-amber-500 to-orange-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono font-medium">
              <span>0% Outreach</span>
              <span>30% Accepted</span>
              <span>50% Team Staffed</span>
              <span>70% Proposal Review</span>
              <span>100% Deployed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. AUTHENTIC LIFECYCLE STAGES TIMELINE */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/70">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>Collaboration Lifecycle Pipeline</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Linear progression gates for this university's participation in the civic solution
          </p>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              const isDone = stage.status === "COMPLETED";
              const isCurrent = stage.status === "IN_PROGRESS";

              return (
                <div key={stage.id} className="relative flex items-start gap-4">
                  {/* Vertical connector line */}
                  {idx < stages.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 -bottom-4 w-0.5 ${
                        isDone ? "bg-emerald-400" : "bg-border"
                      }`}
                    />
                  )}

                  {/* Stage Circle */}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition ${
                      isDone
                        ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                        : isCurrent
                        ? "bg-sky-100 border-sky-500 text-sky-700 animate-pulse"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="space-y-1 flex-1 min-w-0 pb-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-2">
                        <span>{stage.name}</span>
                        {isCurrent && (
                          <Badge className="bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-bold">
                            Current Stage
                          </Badge>
                        )}
                      </h4>

                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isDone
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                            : isCurrent
                            ? "bg-sky-50 text-sky-800 border-sky-300 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isDone ? "Completed ✓" : isCurrent ? "Active In Progress" : "Upcoming"}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-xs">{stage.desc}</p>

                    {(stage.detail || stage.timestamp) && (
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground flex-wrap">
                        {stage.detail && (
                          <span className="font-medium text-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border/60">
                            {stage.detail}
                          </span>
                        )}
                        {stage.timestamp && (
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Calendar className="w-3 h-3" />
                            {new Date(stage.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. STRUCTURED PROPOSAL MILESTONES (IF ENTERED BY UNIVERSITY) */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/70 flex flex-row items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Project Deliverable Milestones</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Milestones defined in {institution.institutionName}'s research proposal
            </p>
          </div>

          {institution.proposalId && (
            <Button
              size="sm"
              variant="outline"
              asChild
              className="text-xs h-7 gap-1 font-semibold"
            >
              <Link to={`/app/innovation/proposals/${institution.proposalId}`}>
                <span>View Full Proposal</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {milestones.length === 0 ? (
            <div className="p-5 rounded-xl border border-dashed border-border bg-muted/10 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-1">
                <span className="font-bold text-foreground text-xs block">
                  Detailed Milestones Pending Proposal Finalization
                </span>
                <p className="text-muted-foreground text-xs max-w-md mx-auto">
                  {hasSubmittedProposal
                    ? "The university proposal does not contain discrete milestone rows, or proposal approval is in progress."
                    : `As ${institution.institutionName}'s research team submits their technical co-development proposal, discrete milestones, timelines, and deliverables will appear here.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs">
                        Milestone {idx + 1}: {m.name || m.title || `Phase ${idx + 1}`}
                      </span>
                      {m.timeline && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {m.timeline}
                        </Badge>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-muted-foreground text-xs leading-relaxed">{m.description}</p>
                    )}
                    {m.deliverable && (
                      <span className="text-[11px] text-teal-800 font-medium block">
                        Deliverable: {m.deliverable}
                      </span>
                    )}
                  </div>

                  <Badge
                    className={
                      m.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]"
                        : "bg-muted text-muted-foreground text-[10px]"
                    }
                  >
                    {m.status || "Planned"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
