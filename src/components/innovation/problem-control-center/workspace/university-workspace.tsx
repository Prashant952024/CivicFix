import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UniversityActivity } from "@/components/innovation/problem-control-center/workspace/university-activity";
import { UniversityHelpRequests } from "@/components/innovation/problem-control-center/workspace/university-help-requests";
import { UniversityOverview } from "@/components/innovation/problem-control-center/workspace/university-overview";
import { UniversityProject } from "@/components/innovation/problem-control-center/workspace/university-project";
import { UniversityProposal } from "@/components/innovation/problem-control-center/workspace/university-proposal";
import { UniversityTeam } from "@/components/innovation/problem-control-center/workspace/university-team";
import { UniversityUpdates } from "@/components/innovation/problem-control-center/workspace/university-updates";
import type { InstitutionLifecycleTrack, ProblemControlCenterData } from "@/lib/innovation";

export type UniversityWorkspaceTab =
  | "overview"
  | "updates"
  | "team"
  | "proposal"
  | "help"
  | "project"
  | "activity";

interface UniversityWorkspaceProps {
  problem: ProblemControlCenterData["problem"];
  challenge?: ProblemControlCenterData["challenge"];
  institution: InstitutionLifecycleTrack;
  initialTab?: UniversityWorkspaceTab;
  onBackToProblem?: () => void;
}

export function UniversityWorkspace({
  problem,
  institution,
  initialTab = "overview",
  onBackToProblem,
}: UniversityWorkspaceProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<UniversityWorkspaceTab>(initialTab);

  const isAccepted = institution.invitationStatus === "ACCEPTED";
  const isApproved = institution.proposalStatus === "APPROVED";
  const needsReview =
    institution.proposalStatus === "SUBMITTED" ||
    institution.proposalStatus === "RESUBMITTED";

  const handleBack = () => {
    if (onBackToProblem) {
      onBackToProblem();
    } else {
      void navigate(`/app/innovation/problems/${problem.id}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. BREADCRUMB & BACK BUTTON */}
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 px-2.5 text-xs text-primary font-bold hover:bg-primary/10 gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to {problem.title}</span>
          </Button>
          <span className="text-border">|</span>
          <nav aria-label="Breadcrumb navigation" className="flex items-center gap-1.5">
            <Link to="/app/innovation" className="hover:text-primary font-medium transition-colors">
              Innovation
            </Link>
            <span>/</span>
            <Link to="/app/innovation/problems" className="hover:text-primary font-medium transition-colors">
              Complex Problems
            </Link>
            <span>/</span>
            <Link to={`/app/innovation/problems/${problem.id}`} className="hover:text-primary font-medium transition-colors truncate max-w-[180px]">
              {problem.title}
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold truncate max-w-[200px]">
              {institution.institutionName}
            </span>
          </nav>
        </div>
      </div>

      {/* 2. DEDICATED UNIVERSITY WORKSPACE HERO HEADER */}
      <Card className="border-border/90 bg-card shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-teal-600 via-sky-600 to-indigo-600" />
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Problem Context & Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-semibold bg-muted/30">
                  {institution.city ? `${institution.city}, ${institution.state}` : "National Research Center"}
                </Badge>
                {institution.institutionAcronym && (
                  <Badge variant="outline" className="text-xs font-bold font-mono">
                    {institution.institutionAcronym}
                  </Badge>
                )}
                <Badge
                  className={
                    isApproved
                      ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold text-xs"
                      : needsReview
                      ? "bg-sky-100 text-sky-950 border-sky-300 font-bold text-xs animate-pulse"
                      : isAccepted
                      ? "bg-teal-100 text-teal-950 border-teal-300 font-bold text-xs"
                      : "bg-amber-100 text-amber-950 border-amber-300 font-semibold text-xs"
                  }
                >
                  Stage: {institution.lifecycleLabel}
                </Badge>
              </div>

              {/* University Title */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-snug">
                {institution.institutionName}
              </h1>

              {/* Scoped Problem Subtitle */}
              <p className="text-xs sm:text-sm font-semibold text-primary flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                <span>University Collaboration Workspace · Participating in "{problem.title}"</span>
              </p>
            </div>

            {/* Quick Status Pill Bar */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-xl border border-border text-xs">
                <div className="px-2.5 py-1 rounded-lg bg-card border border-border/80">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                    Invitation
                  </span>
                  <span className="font-bold text-foreground block">
                    {institution.invitationStatus || "Selected"}
                  </span>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-card border border-border/80">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                    Project
                  </span>
                  <span className="font-bold text-foreground block">
                    {institution.projectId ? (institution.projectStatus || "Active") : "—"}
                  </span>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-card border border-border/80">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                    Team
                  </span>
                  <span className="font-bold text-foreground block">
                    {institution.teamMembersCount} Staffed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. ACTION REQUIRED BANNER (SPECIFIC TO THIS UNIVERSITY) */}
      {needsReview && institution.proposalId && (
        <div className="p-4 rounded-2xl border-2 border-sky-400 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-background shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
            </span>
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-sky-950 block">
                Action Required on {institution.institutionName}'s Deliverable
              </span>
              <p className="text-xs text-sky-900">
                Research Proposal v{institution.proposalVersion || 1} has been submitted for administrative evaluation.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              void navigate(`/app/innovation/proposals/${institution.proposalId}`);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs shrink-0 h-8 px-4"
          >
            <span>Review Proposal Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* 4. UNIVERSITY WORKSPACE TAB NAVIGATION */}
      <div className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-2.5 bg-background/90 backdrop-blur-md border-b border-border/80">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* TAB 1: OVERVIEW */}
          <Button
            size="sm"
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition ${
              activeTab === "overview" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Button>

          {/* TAB 2: UPDATES */}
          <Button
            size="sm"
            variant={activeTab === "updates" ? "default" : "ghost"}
            onClick={() => setActiveTab("updates")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition ${
              activeTab === "updates" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Updates</span>
            {institution.scopedUpdates && institution.scopedUpdates.length > 0 && (
              <Badge
                className={`text-[9px] ml-0.5 px-1.5 py-0 ${
                  activeTab === "updates"
                    ? "bg-white/20 text-primary-foreground border-transparent"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {institution.scopedUpdates.length}
              </Badge>
            )}
          </Button>

          {/* TAB 3: RESEARCH TEAM */}
          <Button
            size="sm"
            variant={activeTab === "team" ? "default" : "ghost"}
            onClick={() => setActiveTab("team")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition ${
              activeTab === "team" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Research Team</span>
            <Badge
              className={`text-[9px] ml-0.5 px-1.5 py-0 ${
                activeTab === "team"
                  ? "bg-white/20 text-primary-foreground border-transparent"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {institution.teamMembersCount}
            </Badge>
          </Button>

          {/* TAB 4: RESEARCH PROPOSAL */}
          <Button
            size="sm"
            variant={activeTab === "proposal" ? "default" : "ghost"}
            onClick={() => setActiveTab("proposal")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition ${
              activeTab === "proposal" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Research Proposal</span>
            {institution.proposalStatus && (
              <Badge
                className={`text-[9px] ml-0.5 px-1.5 py-0 ${
                  needsReview
                    ? "bg-sky-500 text-white font-bold animate-pulse border-transparent"
                    : activeTab === "proposal"
                    ? "bg-white/20 text-primary-foreground border-transparent"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {institution.proposalStatus}
              </Badge>
            )}
          </Button>

          {/* TAB 5: HELP REQUESTS */}
          <Button
            size="sm"
            variant={activeTab === "help" ? "default" : "ghost"}
            onClick={() => setActiveTab("help")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition ${
              activeTab === "help" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help Requests</span>
          </Button>

          {/* TAB 6: PROJECT */}
          <Button
            size="sm"
            variant={activeTab === "project" ? "default" : "ghost"}
            onClick={() => setActiveTab("project")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition ${
              activeTab === "project" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Project</span>
          </Button>

          {/* TAB 7: ACTIVITY */}
          <Button
            size="sm"
            variant={activeTab === "activity" ? "default" : "ghost"}
            onClick={() => setActiveTab("activity")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition ${
              activeTab === "activity" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Activity</span>
            {institution.scopedTimeline && (
              <Badge
                className={`text-[9px] ml-0.5 px-1.5 py-0 ${
                  activeTab === "activity"
                    ? "bg-white/20 text-primary-foreground border-transparent"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {institution.scopedTimeline.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* 5. ACTIVE TAB CONTENT */}
      <main>
        {activeTab === "overview" && (
          <UniversityOverview
            institution={institution}
            problemTitle={problem.title}
          />
        )}

        {activeTab === "updates" && (
          <UniversityUpdates institution={institution} />
        )}

        {activeTab === "team" && (
          <UniversityTeam institution={institution} />
        )}

        {activeTab === "proposal" && (
          <UniversityProposal institution={institution} />
        )}

        {activeTab === "help" && (
          <UniversityHelpRequests institution={institution} />
        )}

        {activeTab === "project" && (
          <UniversityProject institution={institution} />
        )}

        {activeTab === "activity" && (
          <UniversityActivity institution={institution} />
        )}
      </main>
    </div>
  );
}
