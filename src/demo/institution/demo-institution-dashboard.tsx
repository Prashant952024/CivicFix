import { useMemo } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  FilePlus2,
  FileText,
  Lightbulb,
  Microscope,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoInstitutionDashboardPage() {
  const { challenges, proposals, pilots, currentPersona } = useDemo();

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Academic R&D Portal"
        title={currentPersona.organization || "IIT Ranchi Innovation Lab"}
        description={`Logged in as ${currentPersona.fullName} · Discover municipal challenges, author 11-section research proposals, and report pilot telemetry`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/demo/institution/pilots">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                Active Pilots ({pilots.length})
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold">
              <Link to="/demo/institution/proposals/new">
                <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                Submit 11-Sec Proposal
              </Link>
            </Button>
          </div>
        }
      />

      {/* Available Challenges for Bidding */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base font-bold">Open Municipal Challenges (Eligible for Grant Bidding)</CardTitle>
            <p className="text-xs text-muted-foreground">Select a challenge to submit your 11-section academic research proposal.</p>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {challenges.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:border-cyan-400 transition space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-900 bg-cyan-100 px-2 py-0.5 rounded">
                    {c.id}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                </div>
                <Button asChild size="sm" className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shrink-0">
                  <Link to="/demo/institution/proposals/new">Submit Proposal &rarr;</Link>
                </Button>
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
                <span className="font-semibold text-[11px]">
                  Grant Budget Cap: <strong className="text-foreground">₹{c.budget_cap_crore} Cr</strong>
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submitted Proposals */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base font-bold">Your Submitted Research Proposals ({proposals.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {proposals.map((p) => (
            <div key={p.id} className="p-3.5 rounded-xl border bg-card text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded">
                    {p.id}
                  </span>
                  <h4 className="font-bold text-foreground">{p.challenge_title}</h4>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Lead PI: {p.lead_researcher} · Budget: ₹{p.proposed_budget_crore} Cr · Timeline: {p.timeline_months} Months · 11 Sections Validated
                </p>
              </div>
              <Badge
                variant={p.status === "APPROVED" ? "default" : "outline"}
                className={`text-[10px] uppercase font-bold shrink-0 ${p.status === "APPROVED" ? "bg-emerald-600" : ""}`}
              >
                {p.status.replace(/_/g, " ")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
