import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResearchPrototypeWorkspace } from "@/components/research-workspace/research-prototype-workspace";
import { UniversityActivity } from "@/components/innovation/problem-control-center/workspace/university-activity";
import { UniversityCommunication } from "@/components/innovation/problem-control-center/workspace/university-communication";
import { UniversityHelpRequests } from "@/components/innovation/problem-control-center/workspace/university-help-requests";
import { UniversityOverview } from "@/components/innovation/problem-control-center/workspace/university-overview";
import { UniversityProgress } from "@/components/innovation/problem-control-center/workspace/university-progress";
import { UniversityProposal } from "@/components/innovation/problem-control-center/workspace/university-proposal";
import { UniversityTeam } from "@/components/innovation/problem-control-center/workspace/university-team";
import { UniversityUpdates } from "@/components/innovation/problem-control-center/workspace/university-updates";
import type { InstitutionLifecycleTrack, ProblemControlCenterData } from "@/lib/innovation";

export type UniversityWorkspaceTab =
  | "overview"
  | "progress"
  | "team"
  | "proposal"
  | "research"
  | "communication"
  | "updates"
  | "help"
  | "activity";

interface UniversityWorkspaceProps {
  problem: ProblemControlCenterData["problem"];
  challenge?: ProblemControlCenterData["challenge"];
  institution: InstitutionLifecycleTrack;
  initialTab?: UniversityWorkspaceTab;
  onBackToProblem?: () => void;
  onTabChange?: (tab: UniversityWorkspaceTab) => void;
  embedded?: boolean;
}

export function UniversityWorkspace({
  problem,
  institution,
  initialTab = "overview",
  onBackToProblem,
  onTabChange,
  embedded = false,
}: UniversityWorkspaceProps) {
  const navigate = useNavigate();
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [activeTab, setActiveTab] = useState<UniversityWorkspaceTab>(initialTab);

  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const handleTabChange = (tab: UniversityWorkspaceTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

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
    <div className="space-y-6">
      {/* 1. BREADCRUMB NAVIGATION (IF NOT EMBEDDED) */}
      {!embedded && (
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate("/app/innovation/collaborations")}
              className="h-8 px-2 text-xs text-slate-600 font-semibold hover:bg-slate-100 hover:text-slate-900"
            >
              All Collaborations
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
      )}

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

              {/* Exact Contextual Cross Title: [Problem Title] × [University Name] */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-primary flex-wrap">
                  <span className="truncate max-w-md">{problem.title}</span>
                  <span className="text-muted-foreground font-light">×</span>
                  <span className="text-foreground">
                    {institution.institutionName}
                    {institution.city ? ` (${institution.city})` : ""} Collaboration
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-snug">
                  {institution.institutionName}
                  {institution.city ? ` (${institution.city})` : ""}
                </h1>
              </div>

              {/* Scoped Subtitle */}
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                <span>Dedicated Research Collaboration Workspace</span>
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
            onClick={() => handleTabChange("proposal")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs shrink-0 h-8 px-4"
          >
            <span>Review Proposal in Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* 3b. APPROVED PROPOSAL SUCCESS BANNER */}
      {isApproved && institution.proposalId && (
        <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-background shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                Approved Solution Blueprint for {institution.institutionName}
              </span>
              <p className="text-xs text-emerald-900">
                Research Proposal v{institution.proposalVersion || 1} has been reviewed, approved, and authorized for municipal co-development.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => handleTabChange("proposal")}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 shadow-xs shrink-0 h-8 px-4"
          >
            <span>View Approved Proposal &amp; Specs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* 4. UNIVERSITY WORKSPACE 8-TAB NAVIGATION */}
      <div className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-2.5 bg-background/95 backdrop-blur-md border-b border-border/80">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* TAB 1: OVERVIEW */}
          <Button
            size="sm"
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => handleTabChange("overview")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
              activeTab === "overview" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Button>

          {/* TAB 2: PROGRESS */}
          <Button
            size="sm"
            variant={activeTab === "progress" ? "default" : "ghost"}
            onClick={() => handleTabChange("progress")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
              activeTab === "progress" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progress</span>
          </Button>

          {/* TAB 3: RESEARCH TEAM */}
          <Button
            size="sm"
            variant={activeTab === "team" ? "default" : "ghost"}
            onClick={() => handleTabChange("team")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
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
            onClick={() => handleTabChange("proposal")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
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

          {/* TAB 5: RESEARCH / PROTOTYPE */}
          <Button
            size="sm"
            variant={activeTab === "research" ? "default" : "ghost"}
            onClick={() => handleTabChange("research")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
              activeTab === "research" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Research / Prototype</span>
            {isApproved ? (
              <Badge
                className={`text-[9px] ml-0.5 px-1.5 py-0 ${
                  activeTab === "research"
                    ? "bg-white/20 text-primary-foreground border-transparent"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                }`}
              >
                Active
              </Badge>
            ) : (
              <Badge
                className={`text-[9px] ml-0.5 px-1.5 py-0 ${
                  activeTab === "research"
                    ? "bg-white/20 text-primary-foreground border-transparent"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Locked
              </Badge>
            )}
          </Button>

          {/* TAB 6: COMMUNICATION */}
          <Button
            size="sm"
            variant={activeTab === "communication" ? "default" : "ghost"}
            onClick={() => handleTabChange("communication")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
              activeTab === "communication" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communication</span>
          </Button>

          {/* TAB 6: UPDATES */}
          <Button
            size="sm"
            variant={activeTab === "updates" ? "default" : "ghost"}
            onClick={() => handleTabChange("updates")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
              activeTab === "updates" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Updates</span>
          </Button>

          {/* TAB 7: SUPPORT / HELP */}
          <Button
            size="sm"
            variant={activeTab === "help" ? "default" : "ghost"}
            onClick={() => handleTabChange("help")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
              activeTab === "help" ? "shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support / Help</span>
          </Button>

          {/* TAB 8: ACTIVITY */}
          <Button
            size="sm"
            variant={activeTab === "activity" ? "default" : "ghost"}
            onClick={() => handleTabChange("activity")}
            className={`text-xs font-semibold gap-1.5 h-8.5 px-3 rounded-xl transition shrink-0 ${
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
            onNavigateToTab={handleTabChange}
          />
        )}

        {activeTab === "progress" && (
          <UniversityProgress
            institution={institution}
            problem={problem}
          />
        )}

        {activeTab === "team" && (
          <UniversityTeam institution={institution} />
        )}

        {activeTab === "proposal" && (
          <UniversityProposal institution={institution} />
        )}

        {activeTab === "research" && institution.projectId && (
          <ResearchPrototypeWorkspace
            projectId={institution.projectId}
            isManager={true}
            onNavigateToTab={(t) => handleTabChange(t as UniversityWorkspaceTab)}
          />
        )}

        {activeTab === "communication" && (
          <UniversityCommunication
            institution={institution}
            problem={problem}
          />
        )}

        {activeTab === "updates" && (
          <UniversityUpdates institution={institution} />
        )}

        {activeTab === "help" && (
          <UniversityHelpRequests institution={institution} />
        )}

        {activeTab === "activity" && (
          <UniversityActivity institution={institution} />
        )}
      </main>
    </div>
  );
}
