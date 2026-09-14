import {
  Bell,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatElapsedWaitingTime, type InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityUpdatesProps {
  institution: InstitutionLifecycleTrack;
}

interface StructuredUniversityUpdate {
  id: string;
  headline: string;
  progressPercent?: number;
  completedTasks: string[];
  currentlyWorking: string[];
  nextSteps: string[];
  submittedBy: string;
  submittedRole: string;
  timestamp: string;
}

export function UniversityUpdates({ institution }: UniversityUpdatesProps) {
  // Check if any structured updates were logged in project activity metadata
  const structuredUpdates: StructuredUniversityUpdate[] = [];

  const scopedTimeline = institution.scopedTimeline || [];
  scopedTimeline.forEach((event) => {
    // Check if event represents a structured milestone update
    if (event.category === "PROPOSAL" || event.category === "PROJECT") {
      // Map relevant milestones into structured update format
    }
  });

  return (
    <div className="space-y-6 text-xs">
      {/* 1. HEADER & DISTINCTION NOTICE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span>Structured University Progress Updates</span>
          </h4>
          <p className="text-muted-foreground">
            Formal technical milestone &amp; deliverable briefings submitted by {institution.institutionName}'s research team
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Distinct from Conversational Messages
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono">
            {structuredUpdates.length} Submitted
          </Badge>
        </div>
      </div>

      {/* 2. STRUCTURED UPDATES FEED OR HONEST EMPTY STATE */}
      {structuredUpdates.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No Structured Progress Updates Submitted Yet"
            description={`As ${institution.institutionName}'s Principal Investigator reaches project development milestones, formal structured progress reports (completed tasks, active calibration, and upcoming deliverables) will appear here.`}
          />

          {/* Structured Format Example & Backend Requirement Card */}
          <Card className="border-dashed border-border/80 bg-muted/10 shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <CardTitle className="text-xs font-bold text-foreground">
                    Structured Update Reporting Schema
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Standard Format
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-1 space-y-3 text-muted-foreground text-xs">
              <p>
                When {institution.institutionName}'s team submits periodic progress updates, they are categorized into three distinct operational segments:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-card border border-border space-y-1.5">
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completed</span>
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                    <li>Sensor hardware integration</li>
                    <li>Baseline dataset collection</li>
                    <li>Initial model training</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-1.5">
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    <span>Currently Working</span>
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                    <li>Municipal field calibration</li>
                    <li>Telemetry streaming gateway</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-1.5">
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Next Deliverable</span>
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                    <li>Pilot ward testbed rollout</li>
                    <li>Interim milestone report</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/40 text-sky-950 flex items-start gap-2 pt-2.5">
                <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-[11px]">
                    Backend Requirement
                  </span>
                  <p className="text-[11px] text-sky-900 leading-relaxed">
                    Structured updates connect to the university portal milestone reporting workflow. Conversational coordination is handled under the <strong>Communication</strong> tab.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {structuredUpdates.map((update) => (
            <Card key={update.id} className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/70 flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold text-foreground">
                    {update.headline}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Submitted by {update.submittedBy} ({update.submittedRole}) · {new Date(update.timestamp).toLocaleDateString()} ({formatElapsedWaitingTime(update.timestamp)} ago)
                  </p>
                </div>
                {update.progressPercent !== undefined && (
                  <Badge className="bg-primary text-primary-foreground font-mono font-bold text-xs">
                    {update.progressPercent}%
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Completed */}
                <div className="space-y-1">
                  <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider block">
                    Completed
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-foreground">
                    {update.completedTasks.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>

                {/* Currently Working */}
                <div className="space-y-1">
                  <span className="font-bold text-sky-800 text-[11px] uppercase tracking-wider block">
                    Currently Working
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-foreground">
                    {update.currentlyWorking.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>

                {/* Next */}
                <div className="space-y-1">
                  <span className="font-bold text-amber-800 text-[11px] uppercase tracking-wider block">
                    Next Deliverable
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-foreground">
                    {update.nextSteps.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
