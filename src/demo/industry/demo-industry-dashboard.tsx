import { useState } from "react";
import {
  Award,
  Building2,
  CheckCircle2,
  DollarSign,
  Gift,
  HardHat,
  Microscope,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoIndustryDashboardPage() {
  const { pilots, pledgeCoFunding, currentPersona } = useDemo();

  const [pledgePilotId, setPledgePilotId] = useState<string | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState(0.25);
  const [hardwareNotes, setHardwareNotes] = useState("Supplying 5 automated sensor skids and telemetry logger.");

  const handlePledgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pledgePilotId) return;

    pledgeCoFunding(
      pledgePilotId,
      currentPersona.organization || currentPersona.fullName,
      Number(pledgeAmount),
      hardwareNotes
    );
    setPledgePilotId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        tag="Commercial & Technology Co-Funding"
        title={currentPersona.organization || "Tata Cleantech Infra"}
        description={`Logged in as ${currentPersona.fullName} · Co-fund academic research pilots, pledge specialized hardware, and scale municipal solutions`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/industry/pilots">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Your Sponsored Pilots
            </Link>
          </Button>
        }
      />

      {/* Available Pilots for Co-Funding */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base font-bold">Active Academic Pilots Seeking Industry Co-Funding</CardTitle>
            <p className="text-xs text-muted-foreground">Pledge grants or hardware resources to accelerate real-world municipal deployment.</p>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {pilots.map((pilot) => {
            const hasPartner = Boolean(pilot.partner_name);

            return (
              <div
                key={pilot.id}
                className="p-4 rounded-xl border border-border/80 bg-background hover:border-teal-400 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded">
                      {pilot.id}
                    </span>
                    <h3 className="text-sm font-bold text-foreground mt-1">{pilot.challenge_title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Lead Institution: <strong>{pilot.institution_name}</strong>
                    </p>
                  </div>
                  <div className="shrink-0">
                    {hasPartner ? (
                      <Badge variant="default" className="text-xs bg-emerald-600 font-bold">
                        Co-Funded by {pilot.partner_name}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setPledgePilotId(pilot.id)}
                        className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white font-bold text-xs"
                      >
                        <DollarSign className="mr-1 h-3.5 w-3.5" />
                        Pledge Co-Funding
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress & Milestone Overview */}
                <div className="text-xs bg-muted/40 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 border">
                  <div>
                    <span className="text-muted-foreground">Current Stage:</span>
                    <p className="font-semibold text-foreground">{pilot.current_milestone}</p>
                  </div>
                  {pilot.partner_contribution_crore && (
                    <div>
                      <span className="text-muted-foreground">Pledged Contribution:</span>
                      <p className="font-bold text-emerald-700">₹{pilot.partner_contribution_crore} Cr</p>
                    </div>
                  )}
                  {pilot.partner_hardware_notes && (
                    <div className="w-full text-[11px] text-muted-foreground border-t pt-1.5">
                      Hardware Commitment: <em>{pilot.partner_hardware_notes}</em>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pledge Co-Funding Modal */}
      {pledgePilotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-teal-300 bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Gift className="h-5 w-5 text-teal-600" />
              Pledge Industry Co-Funding & Hardware
            </h3>
            <p className="text-xs text-muted-foreground">
              Support academic field trials with corporate CSR grants or specialized laboratory equipment.
            </p>

            <form onSubmit={handlePledgeSubmit} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Co-Funding Grant (₹ Crores) *</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="10"
                  required
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Hardware / Materials Commitment *</label>
                <textarea
                  rows={3}
                  required
                  value={hardwareNotes}
                  onChange={(e) => setHardwareNotes(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" type="button" onClick={() => setPledgePilotId(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                >
                  Confirm Co-Funding Pledge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
