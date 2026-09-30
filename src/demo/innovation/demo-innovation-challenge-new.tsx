import { useState } from "react";
import { ArrowLeft, CheckCircle2, DollarSign, Lightbulb, PlusCircle, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoInnovationChallengeNewPage() {
  const { createChallenge } = useDemo();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [sector, setSector] = useState("Water & Sanitation");
  const [problemStatement, setProblemStatement] = useState("");
  const [budgetCap, setBudgetCap] = useState(0.5);
  const [kpi1, setKpi1] = useState("Efficiency > 95%");
  const [kpi2, setKpi2] = useState("Operating cost reduction > 40%");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problemStatement.trim()) return;

    createChallenge({
      title,
      sector,
      problem_statement: problemStatement,
      target_kpis: [kpi1, kpi2].filter(Boolean),
      budget_cap_crore: Number(budgetCap),
    });

    void navigate("/demo/innovation");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button asChild size="sm" variant="ghost" className="text-xs">
        <Link to="/demo/innovation">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Innovation Hub
        </Link>
      </Button>

      <PageHeader
        tag="R&D Problem Specification"
        title="Publish Municipal Innovation Challenge"
        description="Define a complex civic challenge to invite 11-section research proposals from academic institutions."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-violet-600" />
              Challenge Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Challenge Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. AI-Driven Flood Risk Telemetry and Dynamic Gate Actuation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Planning Sector *</label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="Water & Sanitation">Water & Sanitation</option>
                  <option value="Roads & Transport">Roads & Transport</option>
                  <option value="Public Health">Public Health</option>
                  <option value="Energy & Lighting">Energy & Lighting</option>
                  <option value="Waste Management">Waste Management</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Grant Budget Cap (₹ Crores) *</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10"
                  required
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Technical Problem Statement *</label>
              <textarea
                required
                rows={4}
                placeholder="Specify the scientific/engineering problem, current limitations, and geographic target..."
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-bold text-foreground">Target KPI Metrics *</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="KPI 1 (e.g. Accuracy > 95%)"
                  value={kpi1}
                  onChange={(e) => setKpi1(e.target.value)}
                  className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  placeholder="KPI 2 (e.g. Cost reduction > 40%)"
                  value={kpi2}
                  onChange={(e) => setKpi2(e.target.value)}
                  className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-700 text-white font-bold h-11 shadow-sm"
        >
          Publish Challenge & Dispatch to Institution Portals
        </Button>
      </form>
    </div>
  );
}
