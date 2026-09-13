import {
  ArrowRight,
  Clock,
  HelpCircle,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatElapsedWaitingTime,
  type ProblemControlCenterData,
} from "@/lib/innovation";

interface UpdatesTabProps {
  actionRequired: ProblemControlCenterData["actionRequired"];
  stats: ProblemControlCenterData["stats"];
  challenge?: ProblemControlCenterData["challenge"];
  onSelectTab: (tabKey: string, filter?: string) => void;
}

export function UpdatesTab({
  actionRequired,
  stats,
  onSelectTab,
}: UpdatesTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* 1. MANAGER ACTION REQUIRED QUEUE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-sky-600" />
              <span>Manager Action Queue</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Direct actionable items requiring Innovation Manager review, evaluation, or intervention
            </p>
          </div>
          {actionRequired.needsAction && (
            <Badge className="bg-sky-600 text-white font-bold text-[10px]">
              {actionRequired.proposalsAwaitingReviewCount} Item(s) Pending
            </Badge>
          )}
        </div>

        {actionRequired.needsAction ? (
          <div className="p-5 rounded-2xl border-2 border-sky-400 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-background shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
              </span>
              <h4 className="text-sm font-black uppercase tracking-wider text-sky-950">
                Proposals Awaiting Administrative Evaluation
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionRequired.proposalsAwaitingReviewList.map((prop) => (
                <div
                  key={prop.id}
                  className="p-4 rounded-xl border border-sky-300 bg-white/95 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-sky-100 text-sky-950 border-sky-300 text-[10px] font-bold">
                        {prop.status}
                      </Badge>
                      <span className="text-xs font-bold text-foreground truncate">
                        {prop.institutionName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {prop.projectTitle} (Version {prop.versionNumber})
                    </p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Submitted {formatElapsedWaitingTime(prop.submittedAt)} ago
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      void navigate(`/app/innovation/proposals/${prop.id}`);
                    }}
                    className="bg-primary text-primary-foreground text-xs font-bold gap-1 shrink-0 h-8 px-3 shadow-xs"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-border/80 bg-muted/10 shadow-xs">
            <CardContent className="py-8 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-foreground">
                All Manager Actions Caught Up
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No research proposals are currently pending evaluation. You will receive real-time notifications here as soon as participating university teams submit deliverables.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 2. OUTREACH & PARTICIPATION UPDATES */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">
          Outreach &amp; Collaboration In-Flight Updates
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">Invitation Dispatches</span>
              <Badge variant="outline" className="text-[10px]">
                {stats.invitationsSentCount} Dispatched
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {stats.institutionsAcceptedCount} of {stats.invitationsSentCount} invited institutions have formally accepted and provisioned faculty project teams.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectTab("universities", "INVITED")}
              className="text-xs h-7 px-2 text-primary"
            >
              <span>View Invited Institutions</span>
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">Project Workspace Staffing</span>
              <Badge variant="outline" className="text-[10px]">
                {stats.teamsFormedCount} Staffed
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {stats.projectsActiveCount} project workspaces are active with accredited researchers conducting empirical investigations.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectTab("universities", "ACCEPTED")}
              className="text-xs h-7 px-2 text-primary"
            >
              <span>View Active Workspaces</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 3. FUTURE RESEARCH & INNOVATION MARKETPLACE PLACEHOLDER */}
      <section className="space-y-3 pt-2">
        <Card className="border-dashed border-border/90 bg-muted/10 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-bold text-foreground">
                  Research &amp; Innovation Marketplace
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Future Lifecycle Phase · Informational
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              When research proposals advance to empirical field trials, participating university labs will be able to post targeted resource and co-funding requests directly into the CivicFix Research &amp; Innovation Marketplace.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-lg border border-border/60 bg-background/60">
                <span className="font-bold text-foreground block mb-0.5">
                  Corporate CSR Co-Funding
                </span>
                <span className="text-[11px]">
                  Matching grants from industry partners for scalable civic tech pilots.
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border/60 bg-background/60">
                <span className="font-bold text-foreground block mb-0.5">
                  Municipal Testbeds &amp; Sensors
                </span>
                <span className="text-[11px]">
                  Access to municipal IoT infrastructure, water treatment stations, and road sensors.
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border/60 bg-background/60">
                <span className="font-bold text-foreground block mb-0.5">
                  Inter-University Lab Sharing
                </span>
                <span className="text-[11px]">
                  Cross-institutional access to advanced spectroscopy, spectrometry, and supercomputing.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
