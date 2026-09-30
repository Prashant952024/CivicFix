import { useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, HardHat, Microscope, Sparkles, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoInstitutionPilotsPage() {
  const { pilots, updatePilotMilestone, currentPersona } = useDemo();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        tag="Academic Field Pilots Workspace"
        title="Live Research Pilots & Milestone Telemetry"
        description="Submit milestone validation evidence, update achieved KPIs, and track industry co-funding."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/institution">Back to Hub</Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {pilots.map((pilot) => (
          <Card key={pilot.id} className="border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-900 bg-cyan-100 px-2 py-0.5 rounded">
                      {pilot.id}
                    </span>
                    <CardTitle className="text-base font-bold">{pilot.challenge_title}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Institution: <strong>{pilot.institution_name}</strong>
                    {pilot.partner_name && (
                      <span> · Industry Co-Funder: <strong className="text-teal-800">{pilot.partner_name}</strong> (₹{pilot.partner_contribution_crore} Cr)</span>
                    )}
                  </p>
                </div>
                <Badge
                  variant={pilot.status === "COMPLETED" ? "success" : "info"}
                  className={`text-xs uppercase font-bold shrink-0 ${pilot.status === "COMPLETED" ? "bg-emerald-600" : ""}`}
                >
                  {pilot.status} ({pilot.progress_percent}%)
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Trial Completion Progress</span>
                  <span>{pilot.progress_percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-teal-600 transition-all duration-300"
                    style={{ width: `${pilot.progress_percent}%` }}
                  />
                </div>
              </div>

              {/* Milestones List */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Trial Milestones & KPI Telemetry
                </p>

                {pilot.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-border/80 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{m.title}</span>
                        <Badge
                          variant={m.status === "COMPLETED" ? "success" : m.status === "IN_PROGRESS" ? "info" : "outline"}
                          className={`text-[9px] font-bold ${m.status === "COMPLETED" ? "bg-emerald-600" : ""}`}
                        >
                          {m.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>Target: <strong>{m.kpi_target}</strong></span>
                        {m.kpi_achieved && (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Achieved: {m.kpi_achieved}
                          </span>
                        )}
                        {m.evidence_notes && <span>· Note: {m.evidence_notes}</span>}
                      </div>
                    </div>

                    {m.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updatePilotMilestone(
                            pilot.id,
                            m.id,
                            "COMPLETED",
                            "Exceeded Target (Field Validated)",
                            "Telemetry verified by testing rig."
                          )
                        }
                        className="h-7 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-bold shrink-0"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Mark Milestone Complete
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
