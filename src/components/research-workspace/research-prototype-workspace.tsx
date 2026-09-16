import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  Layers,
  Link2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Store,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSession } from "@/auth/app-session";
import { SupportRequirementsCard } from "@/components/marketplace/support-requirements-card";
import { EvidenceAndResourcesCard } from "@/components/research-workspace/evidence-and-resources-card";
import { MilestonesTracker } from "@/components/research-workspace/milestones-tracker";
import { ProgressUpdatesLog } from "@/components/research-workspace/progress-updates-log";
import { ResearchOverviewStrip } from "@/components/research-workspace/research-overview-strip";
import { RisksAndBlockersCard } from "@/components/research-workspace/risks-and-blockers-card";
import { SubmitProgressDialog } from "@/components/research-workspace/submit-progress-dialog";
import type { ResearchWorkspaceSummary } from "@/lib/research-workspace";
import { fetchResearchWorkspaceData } from "@/lib/research-workspace";

interface ResearchPrototypeWorkspaceProps {
  projectId: string;
  isManager?: boolean;
  onNavigateToTab?: (tab: string) => void;
}

type WorkspaceSubTab =
  | "milestones"
  | "updates"
  | "evidence"
  | "risks"
  | "support";

export function ResearchPrototypeWorkspace({
  projectId,
  isManager = false,
  onNavigateToTab,
}: ResearchPrototypeWorkspaceProps) {
  const { profile } = useAppSession();
  const [summary, setSummary] = useState<ResearchWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<WorkspaceSubTab>("milestones");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await fetchResearchWorkspaceData(projectId);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load research workspace data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;
    void fetchResearchWorkspaceData(projectId)
      .then((data) => {
        if (active) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          console.error("Failed to load research workspace data:", err);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  if (loading && !summary) {
    return (
      <Card className="border-border/80 bg-card">
        <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">
            Loading Research &amp; Prototype Development Workspace...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="border-border/80 bg-card">
        <CardContent className="p-8 text-center space-y-2">
          <p className="text-sm font-bold text-foreground">Project Workspace Not Found</p>
          <p className="text-xs text-muted-foreground">
            Could not locate challenge project records.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 1. STRICT PROPOSAL GATING CHECK
  if (summary.isGated) {
    return (
      <Card className="border-2 border-amber-300/80 dark:border-amber-800 bg-gradient-to-br from-amber-50/60 via-card to-card dark:from-amber-950/20 shadow-xs overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shrink-0 self-start">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-950/50 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold text-xs">
                  Workspace Gated
                </Badge>
                {summary.proposalStatus && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    Proposal Status: {summary.proposalStatus}
                  </Badge>
                )}
              </div>

              <h3 className="text-xl font-black text-foreground tracking-tight">
                Research &amp; Prototype Development Workspace Locked
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                CivicFix governance requires formal municipal evaluation and authorization before active research and prototype development begins. This workspace becomes operational <strong className="text-foreground">only after the university research proposal has been approved</strong> by the Innovation Manager.
              </p>

              <div className="pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-amber-200/80 dark:border-amber-900/40 text-xs space-y-1.5 max-w-xl shadow-xs">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <span>Current Workflow Requirement:</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {summary.proposalStatus === "SUBMITTED" || summary.proposalStatus === "RESUBMITTED"
                      ? "The proposal is currently awaiting Innovation Manager evaluation. Once accepted, operational milestones, 5-day progress reporting, and evidence tracking will unlock."
                      : summary.proposalStatus === "REQUESTED_REVISION"
                      ? "The Innovation Manager requested revisions on the proposal. Submit the updated iteration to proceed."
                      : summary.proposalStatus === "REJECTED"
                      ? "The submitted proposal was rejected. Review the manager's feedback in the Research Proposal tab."
                      : "The research proposal has not been submitted yet. Complete and submit the 11-section blueprint in the Research Proposal tab."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
            {onNavigateToTab && (
              <Button
                onClick={() => onNavigateToTab("proposal")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 shadow-xs h-9 px-4"
              >
                <span>Go to Research Proposal Tab</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. ACTIVE RESEARCH & PROTOTYPE DEVELOPMENT WORKSPACE
  return (
    <div className="space-y-6">
      {/* 2A. TOP RESEARCH OVERVIEW STRIP */}
      <ResearchOverviewStrip
        summary={summary}
        isManager={isManager}
        onRefresh={handleRefresh}
      />

      {/* 2B. SUB-NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <Button
            size="sm"
            variant={activeSubTab === "milestones" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("milestones")}
            className={`text-xs font-semibold gap-1.5 h-8 px-3 rounded-xl shrink-0 ${
              activeSubTab === "milestones" ? "font-bold shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Milestones ({summary.milestones.length})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "updates" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("updates")}
            className={`text-xs font-semibold gap-1.5 h-8 px-3 rounded-xl shrink-0 ${
              activeSubTab === "updates" ? "font-bold shadow-xs" : "text-muted-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Progress Updates ({summary.progressUpdates.length})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "evidence" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("evidence")}
            className={`text-xs font-semibold gap-1.5 h-8 px-3 rounded-xl shrink-0 ${
              activeSubTab === "evidence" ? "font-bold shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Evidence &amp; Artifacts ({summary.evidence.length})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "risks" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("risks")}
            className={`text-xs font-semibold gap-1.5 h-8 px-3 rounded-xl shrink-0 ${
              activeSubTab === "risks" ? "font-bold shadow-xs" : "text-muted-foreground"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Blockers &amp; Risks</span>
            {summary.openBlockersCount > 0 && (
              <Badge variant="outline" className="text-[10px] ml-1 px-1.5 py-0 bg-rose-500 text-white font-bold border-transparent">
                {summary.openBlockersCount}
              </Badge>
            )}
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "support" ? "default" : "ghost"}
            onClick={() => setActiveSubTab("support")}
            className={`text-xs font-semibold gap-1.5 h-8 px-3 rounded-xl shrink-0 ${
              activeSubTab === "support" ? "font-bold shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Marketplace &amp; Support</span>
          </Button>
        </div>

        {!isManager && (
          <Button
            size="sm"
            onClick={() => setSubmitDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs h-8 px-3.5 shrink-0 self-end sm:self-auto"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Submit 5-Day Update</span>
          </Button>
        )}
      </div>

      {/* ACTIVE SUB-TAB CONTENT */}
      <div>
        {activeSubTab === "milestones" && (
          <MilestonesTracker
            projectId={projectId}
            milestones={summary.milestones}
            canEdit={!isManager}
            onRefresh={handleRefresh}
          />
        )}

        {activeSubTab === "updates" && (
          <ProgressUpdatesLog
            projectId={projectId}
            updates={summary.progressUpdates}
            isManager={isManager}
            onRefresh={handleRefresh}
            onOpenSubmitModal={() => setSubmitDialogOpen(true)}
            onNavigateToTab={onNavigateToTab}
          />
        )}

        {activeSubTab === "evidence" && (
          <EvidenceAndResourcesCard
            projectId={projectId}
            evidence={summary.evidence}
            canEdit={!isManager}
            onRefresh={handleRefresh}
          />
        )}

        {activeSubTab === "risks" && (
          <RisksAndBlockersCard
            projectId={projectId}
            items={summary.blockersAndRisks}
            canEdit={!isManager}
            onRefresh={handleRefresh}
          />
        )}

        {activeSubTab === "support" && (
          <SupportRequirementsCard
            projectId={summary.projectId}
            challengeId={summary.challengeId}
            institutionId={summary.institutionId}
            profileId={profile?.id ?? ""}
            isGated={summary.isGated}
            proposalStatus={summary.proposalStatus}
            milestones={summary.milestones}
          />
        )}
      </div>

      {/* SUBMIT PROGRESS UPDATE MODAL */}
      <SubmitProgressDialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        projectId={projectId}
        milestones={summary.milestones}
        lastUpdateAt={summary.lastUpdateAt}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
