import { useMemo } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  DollarSign,
  FileText,
  Lightbulb,
  Microscope,
  PlusCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoInnovationDashboardPage() {
  const { challenges, proposals, pilots, currentPersona, reviewProposal } = useDemo();

  const pendingProposals = useMemo(() => {
    return proposals.filter((p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW");
  }, [proposals]);

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Academic & Industry Collaboration"
        title="Innovation & R&D Hub"
        description={`Logged in as ${currentPersona.fullName} · Orchestrating municipal R&D challenges, 11-section proposals, and academic pilots`}
        actions={
          <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-700 text-white font-bold">
            <Link to="/demo/innovation/challenges/new">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Publish New Challenge
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Challenges</p>
              <p className="text-2xl font-bold text-foreground mt-1">{challenges.length}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center text-violet-700">
              <Lightbulb className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proposals Under Review</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{pendingProposals.length}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Field Pilots</p>
              <p className="text-2xl font-bold text-teal-700 mt-1">{pilots.length}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Required: Proposals to Review */}
      {pendingProposals.length > 0 && (
        <Card className="border-2 border-violet-200 bg-gradient-to-r from-violet-50/70 via-purple-50/50 to-white shadow-sm">
          <CardHeader className="pb-3 border-b border-violet-100">
            <CardTitle className="text-sm font-bold text-violet-950 flex items-center gap-2">
              <Microscope className="h-4 w-4 text-violet-700" />
              11-Section Research Proposals Awaiting Decision ({pendingProposals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-violet-100">
            {pendingProposals.map((prop) => (
              <div key={prop.id} className="py-3 first:pt-0 last:pb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-violet-900 bg-violet-100 px-2 py-0.5 rounded">
                      {prop.id}
                    </span>
                    <h4 className="text-xs font-bold text-foreground">{prop.challenge_title}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Submitted by <strong>{prop.institution_name}</strong> (PI: {prop.lead_researcher}) · Budget: ₹{prop.proposed_budget_crore} Cr · Timeline: {prop.timeline_months} Mo
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => reviewProposal(prop.id, true, "Approved for field pilot workspace.")}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Approve & Launch Pilot
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewProposal(prop.id, false, "Requested revisions on budget itemization.")}
                    className="h-8 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                  >
                    Request Revision
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Challenges List */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base font-bold">Published Municipal R&D Challenges</CardTitle>
            <p className="text-xs text-muted-foreground">Open problems matched with academic engineering labs and industry co-funders.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/innovation/challenges/new">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              New Challenge
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {challenges.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:border-violet-300 transition space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                    {c.id}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-violet-800 bg-violet-50">
                  {c.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{c.problem_statement}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t pt-2.5">
                <div className="flex flex-wrap gap-2">
                  {c.target_kpis.map((kpi, idx) => (
                    <span key={idx} className="bg-white px-2 py-0.5 rounded border text-[11px] font-medium text-foreground">
                      🎯 {kpi}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 font-semibold text-[11px]">
                  <span>Grant Cap: <strong className="text-foreground">₹{c.budget_cap_crore} Cr</strong></span>
                  <span>Proposals: <strong className="text-violet-700">{c.proposals_count}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
