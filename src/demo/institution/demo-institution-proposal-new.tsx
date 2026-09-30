import { useState } from "react";
import { ArrowLeft, CheckCircle2, FilePlus2, FileText, Microscope, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const MANDATORY_SECTIONS: { number: number; title: string; content: string }[] = [
  { number: 1, title: "Executive Summary", content: "Nanocomposite membrane module tailored for high-salinity and heavy-metal remediation." },
  { number: 2, title: "Literature Review & Prior Art", content: "Comparative performance against traditional RO systems showing 60% energy reduction." },
  { number: 3, title: "Methodology & Lab Validation", content: "Batch adsorption isotherms, column breakthrough spectrometry, and ICP-MS analysis." },
  { number: 4, title: "Equipment & Lab Specifications", content: "IIT Ranchi Advanced Characterization Rig + 500L/day continuous flow testbed." },
  { number: 5, title: "Unauthenticated Research Team", content: "Prof. Aris Thorne (PI), Dr. Sneha Roy (Co-PI), Rahul Verma (MTech Scholar)." },
  { number: 6, title: "Milestone Schedule & Deliverables", content: "M1: Lab benchmark (Mo 2). M2: Field trial (Mo 4). M3: Scale-up model (Mo 6)." },
  { number: 7, title: "Itemized Budget Breakdown", content: "Consumables ₹12L, Fabrication ₹10L, Field sensors ₹8L, Research stipends ₹5L." },
  { number: 8, title: "Environmental & Safety Compliance", content: "Zero hazardous byproduct generation; spent media encapsulation protocols." },
  { number: 9, title: "Expected KPIs & Evaluation Targets", content: "Removal rate > 98.5%, operational life > 180 days, unit cost < ₹0.04/L." },
  { number: 10, title: "Risk Mitigation & Failure Modes", content: "Dual backwash pre-filter to prevent biofouling from high turbidity inflows." },
  { number: 11, title: "Municipal Scaling & Commercialization", content: "Modular skid architecture deployable in municipal water treatment stations." },
];

export function DemoInstitutionProposalNewPage() {
  const { challenges, submitProposal, currentPersona: _currentPersona } = useDemo();
  const navigate = useNavigate();

  const [challengeId, setChallengeId] = useState(challenges[0]?.id || "DEMO-CH-201");
  const [budget, setBudget] = useState(0.35);
  const [timeline, setTimeline] = useState(6);
  const [sections, setSections] = useState(MANDATORY_SECTIONS);

  const handleSectionChange = (idx: number, content: string) => {
    setSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], content };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitProposal({
      challenge_id: challengeId,
      proposed_budget_crore: Number(budget),
      timeline_months: Number(timeline),
      sections,
    });

    void navigate("/demo/institution");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button asChild size="sm" variant="ghost" className="text-xs">
        <Link to="/demo/institution">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Research Hub
        </Link>
      </Button>

      <PageHeader
        tag="11-Section Proposal Standard"
        title="Author Academic Research Proposal"
        description="Comprehensive 11-section research proposal adhering to the CivicFix academic validation standard."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Metadata */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Proposal Scope & Budget</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Target Innovation Challenge *</label>
              <select
                value={challengeId}
                onChange={(e) => setChallengeId(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}: {c.title} (Cap: ₹{c.budget_cap_crore} Cr)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Proposed Budget (₹ Crores) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  max="10"
                  required
                  value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Timeline (Months) *</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  required
                  value={timeline}
                  onChange={(e) => setTimeline(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 11 Mandatory Sections */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-700" />
                The 11 Mandatory Academic Sections
              </span>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                11 / 11 Complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {sections.map((sec, idx) => (
              <div key={sec.number} className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/20">
                <label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-700 text-white text-[10px]">
                    {sec.number}
                  </span>
                  Section {sec.number}: {sec.title}
                </label>
                <textarea
                  rows={2}
                  required
                  value={sec.content}
                  onChange={(e) => handleSectionChange(idx, e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold h-11 shadow-sm"
        >
          Submit 11-Section Proposal for Review
        </Button>
      </form>
    </div>
  );
}
