import { Award, CheckCircle2, DollarSign, Gift, HardHat, Microscope, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoIndustryPilotsPage() {
  const { pilots, currentPersona } = useDemo();

  const sponsoredPilots = pilots.filter((p) => p.partner_name);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        tag="Corporate Social Responsibility & Innovation"
        title="Sponsored Pilot Portfolio"
        description="Monitor field trial deliverables and impact metrics for pilots co-funded by your organization."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/industry">Back to Marketplace</Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {sponsoredPilots.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border p-8 space-y-3">
            <Gift className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold">No Sponsored Pilots Yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Explore open academic research pilots seeking corporate grants and hardware support.
            </p>
            <Button asChild size="sm">
              <Link to="/demo/industry">Browse Active Pilots</Link>
            </Button>
          </div>
        ) : (
          sponsoredPilots.map((pilot) => (
            <Card key={pilot.id} className="border-border/70 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded">
                      {pilot.id}
                    </span>
                    <CardTitle className="text-base font-bold mt-1">{pilot.challenge_title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Co-Funded by <strong>{pilot.partner_name}</strong> (₹{pilot.partner_contribution_crore} Cr) · Lead: {pilot.institution_name}
                    </p>
                  </div>
                  <Badge variant="default" className="text-xs bg-emerald-600 font-bold shrink-0">
                    {pilot.status} ({pilot.progress_percent}%)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                {pilot.partner_hardware_notes && (
                  <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200">
                    <span className="font-bold text-teal-950 uppercase text-[10px] tracking-wider block">
                      Hardware Commitment:
                    </span>
                    <p className="text-teal-900 mt-0.5">{pilot.partner_hardware_notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Field Trial Milestones:
                  </p>
                  <div className="grid gap-2">
                    {pilot.milestones.map((m) => (
                      <div key={m.id} className="p-3 rounded-lg border bg-background flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">{m.title}</p>
                          <p className="text-muted-foreground text-[11px]">
                            Target: {m.kpi_target} {m.kpi_achieved && `· Achieved: ${m.kpi_achieved}`}
                          </p>
                        </div>
                        <Badge
                          variant={m.status === "COMPLETED" ? "success" : "info"}
                          className={`text-[9px] font-bold ${m.status === "COMPLETED" ? "bg-emerald-600" : ""}`}
                        >
                          {m.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
