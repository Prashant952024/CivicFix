import { useState, useEffect } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Repeat,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ComplexSolutionCatalog } from "@/components/knowledge/complex-solution-catalog";
import { ComplexSolutionDetailDialog } from "@/components/knowledge/complex-solution-detail-dialog";
import { SimpleSolutionCatalog } from "@/components/preventive/simple-solution-catalog";
import {
  fetchComplexSolutions,
  fetchSimpleSolutions,
  fetchRecurrencePatterns,
  fetchPreventiveRecommendations,
} from "@/lib/solution-knowledge";
import type {
  ComplexSolutionKnowledgeBaseRow,
  SimpleSolutionKnowledgeBaseRow,
  SimpleIssueRecurrencePatternRow,
  PreventiveRecommendationRow,
} from "@/types/database";

type KnowledgeTab = "complex" | "simple" | "patterns" | "preventive";

export function InnovationKnowledgePage() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("complex");
  const [complexSolutions, setComplexSolutions] = useState<ComplexSolutionKnowledgeBaseRow[]>([]);
  const [simpleSolutions, setSimpleSolutions] = useState<SimpleSolutionKnowledgeBaseRow[]>([]);
  const [recurrencePatterns, setRecurrencePatterns] = useState<SimpleIssueRecurrencePatternRow[]>([]);
  const [preventiveRecs, setPreventiveRecs] = useState<PreventiveRecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [selectedComplexSol, setSelectedComplexSol] = useState<ComplexSolutionKnowledgeBaseRow | null>(null);
  const [complexDetailOpen, setComplexDetailOpen] = useState(false);

  async function loadAllData() {
    setLoading(true);
    try {
      const [cRes, sRes, pRes, prRes] = await Promise.all([
        fetchComplexSolutions(),
        fetchSimpleSolutions(),
        fetchRecurrencePatterns(),
        fetchPreventiveRecommendations(),
      ]);
      setComplexSolutions(cRes);
      setSimpleSolutions(sRes);
      setRecurrencePatterns(pRes);
      setPreventiveRecs(prRes);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error loading knowledge hub data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAllData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Civic Solution Knowledge & Preventive Intelligence"
        description="Persistent intelligence repository capturing validated solutions, recurring issue patterns, and reuse opportunities across the civic ecosystem."
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => { void loadAllData(); }}
          className="gap-1.5 text-xs rounded-xl"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Repository
        </Button>
      </PageHeader>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-surface/90 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Complex Solutions
            </span>
            <BrainCircuit className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{complexSolutions.length}</div>
          <div className="text-[11px] text-muted-foreground">Validated university innovations</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface/90 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Simple Solutions
            </span>
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{simpleSolutions.length}</div>
          <div className="text-[11px] text-muted-foreground">Citizen-verified municipal resolutions</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface/90 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recurrence Clusters
            </span>
            <Repeat className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{recurrencePatterns.length}</div>
          <div className="text-[11px] text-muted-foreground">Detected spatial-temporal patterns</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface/90 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Preventive Actions
            </span>
            <ShieldAlert className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{preventiveRecs.length}</div>
          <div className="text-[11px] text-muted-foreground">Proactive recommendations generated</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70 bg-surface-elevated/40 px-2 rounded-2xl overflow-x-auto">
        {[
          { id: "complex", label: `Complex Solutions (${complexSolutions.length})`, icon: BrainCircuit },
          { id: "simple", label: `Simple Solutions (${simpleSolutions.length})`, icon: CheckCircle2 },
          { id: "patterns", label: `Recurrence Patterns (${recurrencePatterns.length})`, icon: Repeat },
          { id: "preventive", label: `Preventive Actions (${preventiveRecs.length})`, icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as KnowledgeTab)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "border-emerald-600 text-emerald-700 bg-background/50 rounded-t-xl"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === "complex" && (
        <ComplexSolutionCatalog
          solutions={complexSolutions}
          loading={loading}
          onSelectSolution={(sol) => {
            setSelectedComplexSol(sol);
            setComplexDetailOpen(true);
          }}
        />
      )}

      {activeTab === "simple" && (
        <SimpleSolutionCatalog
          solutions={simpleSolutions}
          loading={loading}
        />
      )}

      {activeTab === "patterns" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-900 leading-relaxed">
            Recurrence patterns are automatically detected by clustering closed and citizen-verified simple civic issues by locality and category over time.
          </div>

          {recurrencePatterns.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border border-dashed border-border/80">
              <Repeat className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">No Recurrence Patterns Detected</h4>
              <p className="text-xs text-muted-foreground">
                Patterns require at least 2 verified issue occurrences in the same ward and category.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recurrencePatterns.map((pat) => (
                <Card key={pat.id} className="p-5 rounded-2xl border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                      {pat.category}
                    </Badge>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                      {pat.occurrence_count} Occurrences
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" /> {pat.area_name}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">{pat.pattern_description}</p>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center justify-between pt-2 border-t border-border/50">
                    <span>First: {new Date(pat.first_observed_at).toLocaleDateString()}</span>
                    <span>Last: {new Date(pat.last_observed_at).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-[10px]">
                      Confidence: {pat.confidence}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "preventive" && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {preventiveRecs.map((rec) => (
              <Card key={rec.id} className="p-5 rounded-2xl border border-border/70 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{rec.category}</Badge>
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" /> {rec.area_name}
                    </span>
                  </div>
                  <Badge
                    variant={
                      rec.status === "ACTIONED"
                        ? "success"
                        : rec.status === "DISMISSED"
                          ? "outline"
                          : "warning"
                    }
                  >
                    {rec.status}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{rec.recommended_action}</p>
                </div>

                <div className="rounded-xl bg-surface-elevated/50 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Justification: </span>
                  {rec.justification}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Complex Detail Modal */}
      <ComplexSolutionDetailDialog
        solution={selectedComplexSol}
        open={complexDetailOpen}
        onClose={() => setComplexDetailOpen(false)}
      />
    </div>
  );
}
