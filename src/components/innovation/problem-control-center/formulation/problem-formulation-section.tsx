import { useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Lightbulb,
  MapPin,
  Plus,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import type { ProblemControlCenterData } from "@/lib/innovation";
import { supabase } from "@/lib/supabase";

interface ProblemFormulationSectionProps {
  challenge: ProblemControlCenterData["challenge"];
  problem: ProblemControlCenterData["problem"];
  onRefresh: () => void;
  onNavigateToRecommendation?: () => void;
}

export function ProblemFormulationSection({
  challenge,
  problem,
  onRefresh,
  onNavigateToRecommendation,
}: ProblemFormulationSectionProps) {
  const navigate = useNavigate();
  const { profile, roleCode } = useAppSession();
  const isAdmin = roleCode === "ADMIN";

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  // Form states initialized from challenge
  const [title, setTitle] = useState(challenge?.title || "");
  const [problemStatement, setProblemStatement] = useState(challenge?.problemStatement || "");
  const [rootCause, setRootCause] = useState(challenge?.rootCause || problem.approvedRootCause || "");
  const [affectedPopulation, setAffectedPopulation] = useState(challenge?.affectedPopulation || "");
  const [geographicScope, setGeographicScope] = useState(
    challenge?.geographicScope || problem.geographicScope || "Citywide"
  );
  const [objectives, setObjectives] = useState<string[]>(challenge?.objectives || []);
  const [newObjective, setNewObjective] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState<string[]>(challenge?.expectedOutcomes || []);
  const [newOutcome, setNewOutcome] = useState("");
  const [requiredDomains, setRequiredDomains] = useState<string[]>(challenge?.requiredDomains || []);
  const [newDomain, setNewDomain] = useState("");
  const [potentialTech, setPotentialTech] = useState<string[]>(challenge?.potentialTechnologies || []);
  const [newTech, setNewTech] = useState("");
  const [constraints, setConstraints] = useState<string[]>(challenge?.constraints || []);
  const [successCriteria, setSuccessCriteria] = useState<string[]>(challenge?.successCriteria || []);

  const handleStartEditing = () => {
    if (!challenge) return;
    setTitle(challenge.title);
    setProblemStatement(challenge.problemStatement);
    setRootCause(challenge.rootCause || problem.approvedRootCause || "");
    setAffectedPopulation(challenge.affectedPopulation || "");
    setGeographicScope(challenge.geographicScope);
    setObjectives(challenge.objectives || []);
    setExpectedOutcomes(challenge.expectedOutcomes || []);
    setRequiredDomains(challenge.requiredDomains || []);
    setPotentialTech(challenge.potentialTechnologies || []);
    setConstraints(challenge.constraints || []);
    setSuccessCriteria(challenge.successCriteria || []);
    setActionError(null);
    setActionSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setActionError(null);
  };

  // AI Formulation Synthesis
  const handleGenerateWithAi = async () => {
    setGenerating(true);
    setGenerationError(null);
    setActionSuccess(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          issue_id: problem.id,
          save_draft: true,
        }),
      });

      const resData = (await response.json()) as {
        success?: boolean;
        challenge?: { id: string };
        error?: string;
      };

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to formulate challenge with AI.");
      }

      setActionSuccess("AI Formulation successfully synthesized and saved as draft.");
      onRefresh();
    } catch (err: unknown) {
      console.error("Error generating challenge formulation:", err);
      setGenerationError(err instanceof Error ? err.message : "Failed to synthesize formulation with AI.");
    } finally {
      setGenerating(false);
    }
  };

  // Save Formulation Draft
  const handleSaveDraft = async () => {
    if (!challenge) return;
    if (!title.trim()) {
      setActionError("Challenge title cannot be blank.");
      return;
    }
    if (!problemStatement.trim()) {
      setActionError("Problem statement cannot be blank.");
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const { error } = await supabase
        .from("innovation_challenges")
        .update({
          title: title.trim(),
          problem_statement: problemStatement.trim(),
          root_cause: rootCause.trim() || null,
          affected_population: affectedPopulation.trim() || null,
          geographic_scope: geographicScope.trim(),
          objectives,
          expected_outcomes: expectedOutcomes,
          required_domains: requiredDomains,
          potential_technology_areas: potentialTech,
          constraints,
          success_criteria: successCriteria,
          updated_at: new Date().toISOString(),
        })
        .eq("id", challenge.id);

      if (error) throw error;

      setActionSuccess("Formulation draft successfully saved.");
      setIsEditing(false);
      onRefresh();
    } catch (err: unknown) {
      console.error("Error saving formulation draft:", err);
      setActionError(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // Approve Formulation
  const handleApproveFormulation = async () => {
    if (!challenge) return;
    setApproving(true);
    setActionError(null);

    try {
      const { error } = await supabase
        .from("innovation_challenges")
        .update({
          status: "APPROVED",
          approved_at: new Date().toISOString(),
          approved_by: profile?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", challenge.id);

      if (error) throw error;

      setConfirmApproveOpen(false);
      setActionSuccess("Formulation authoritatively approved. Recommendation engine and matching are now unlocked!");
      onRefresh();
      if (onNavigateToRecommendation) {
        setTimeout(() => {
          onNavigateToRecommendation();
        }, 1000);
      }
    } catch (err: unknown) {
      console.error("Error approving formulation:", err);
      setActionError(err instanceof Error ? err.message : "Failed to approve formulation.");
    } finally {
      setApproving(false);
    }
  };

  // Tag list helpers
  const addTag = (val: string, list: string[], setList: (l: string[]) => void, clear: () => void) => {
    const trimmed = val.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      clear();
    }
  };

  const removeTag = (index: number, list: string[], setList: (l: string[]) => void) => {
    setList(list.filter((_, i) => i !== index));
  };

  // 1. UNFORMULATED STATE
  if (!challenge) {
    return (
      <div className="space-y-6">
        {/* Source Problem Dossier Strip */}
        <Card className="border-border/90 bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/70">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <span>Source Civic Problem Dossier</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  {problem.category}
                </Badge>
                <Badge variant="attention" size="sm">
                  {problem.aiComplexityScore !== null ? `Complexity: ${problem.aiComplexityScore}/100` : "Complexity: Evaluation Pending"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {problem.addressText || problem.locationText || "Municipal Area"}
              </span>
              <span>•</span>
              <span>Reported {new Date(problem.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 text-foreground whitespace-pre-line leading-relaxed">
              {problem.description}
            </div>
          </CardContent>
        </Card>

        {/* AI Formulation Call to Action Banner */}
        <Card className="border-indigo-300/80 bg-gradient-to-br from-indigo-50/70 via-background to-teal-50/40 shadow-xs">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                  <Badge variant="innovation" size="sm">
                    Step 2: Innovation Challenge Formulation Required
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Formulate Structured Innovation Challenge
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  Synthesize citizen field grievances into a rigorous municipal challenge with testable root causes, 
                  research objectives, expected pilot outcomes, and multidisciplinary domain criteria.
                </p>
              </div>

              {!isAdmin ? (
                <Button
                  size="sm"
                  onClick={() => { void handleGenerateWithAi(); }}
                  disabled={generating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 text-xs h-10 px-5 shadow-xs shrink-0"
                >
                  <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                  <span>{generating ? "Synthesizing with AI..." : "Formulate with AI"}</span>
                </Button>
              ) : (
                <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5 text-primary py-2 px-3.5 rounded-xl shrink-0 gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>Awaiting Innovation Manager Formulation</span>
                </Badge>
              )}
            </div>

            {generationError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{generationError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApproved = challenge.status === "APPROVED";

  return (
    <div className="space-y-6">
      {/* 1. CHALLENGE FORMULATION CARD */}
      <Card className="border-border/90 bg-card shadow-xs overflow-hidden">
        {/* Header */}
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Rocket className="w-4.5 h-4.5 text-primary shrink-0" />
              <CardTitle className="text-lg font-extrabold text-foreground tracking-tight">
                {isEditing ? "Editing Challenge Formulation" : challenge.title}
              </CardTitle>
              {isApproved ? (
                <Badge variant="civic" size="sm" className="gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Formulation Approved</span>
                </Badge>
              ) : (
                <Badge variant="attention" size="sm" className="gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                  <span>Draft Formulation</span>
                </Badge>
              )}
              <Badge variant="outline" size="sm">
                {challenge.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Official municipal scope and technical specifications for university research partnerships.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isAdmin ? (
              <Badge variant="outline" className="text-xs font-medium border-primary/30 bg-primary/5 text-primary py-1 px-2.5 rounded-xl gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Read-Only Oversight</span>
              </Badge>
            ) : isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEditing}
                  disabled={saving}
                  className="text-xs h-8.5"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => { void handleSaveDraft(); }}
                  disabled={saving}
                  className="bg-primary text-primary-foreground text-xs font-bold gap-1.5 h-8.5 px-4"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Draft"}</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartEditing}
                  className="text-xs font-bold gap-1.5 h-8.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Formulation</span>
                </Button>

                {!isApproved ? (
                  <Button
                    size="sm"
                    onClick={() => setConfirmApproveOpen(true)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 h-8.5 px-3.5 shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve Formulation</span>
                  </Button>
                ) : onNavigateToRecommendation ? (
                  <Button
                    size="sm"
                    variant="innovation"
                    onClick={onNavigateToRecommendation}
                    className="text-xs font-bold gap-1.5 h-8.5 px-4"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Recommendation Engine &rarr;</span>
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void navigate(`/app/innovation/challenges/${challenge.id}`)}
                  className="text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground h-8.5"
                >
                  <span>Full Console</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        {/* Action alerts */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
            <button type="button" onClick={() => setActionSuccess(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5 text-emerald-700" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{actionError}</span>
            </div>
            <button type="button" onClick={() => setActionError(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5 text-rose-700" />
            </button>
          </div>
        )}

        {/* AI Advisory & Governance Banner when in Draft mode */}
        {!isApproved && !isEditing && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl border border-indigo-200/90 bg-indigo-50/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="w-4.5 h-4.5 text-indigo-700 shrink-0" />
              <div>
                <span className="font-bold text-indigo-950 block">
                  AI-Generated Formulation Draft • Human Review Required
                </span>
                <span className="text-indigo-900/80 text-[11px]">
                  AI proposes problem parameters and objectives; Innovation Manager review and approval are authoritative.
                </span>
              </div>
            </div>
            <Badge variant="innovation" size="sm" className="shrink-0">
              Advisory Draft
            </Badge>
          </div>
        )}

        <CardContent className="p-6 space-y-6 text-xs">
          {isEditing ? (
            /* ========================================================================= */
            /* EDIT MODE FORM                                                            */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Group 1: Problem Scope */}
              <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/10">
                <span className="text-section-header block">1. Problem Scope &amp; Target Context</span>

                <div>
                  <label className="font-bold text-foreground block mb-1">Challenge Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Predictive Urban Hydrology & Drain Congestion Modeling..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Problem Statement *</label>
                    <textarea
                      rows={4}
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      placeholder="Comprehensive technical statement of the civic challenge..."
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">Root Cause Hypothesis</label>
                    <textarea
                      rows={4}
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="Systemic, infrastructural, or hydrological root cause..."
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-foreground block mb-1">Affected Population</label>
                    <input
                      type="text"
                      value={affectedPopulation}
                      onChange={(e) => setAffectedPopulation(e.target.value)}
                      placeholder="e.g. 85,000 residents in flood-prone wards..."
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-foreground block mb-1">Geographic Scope</label>
                    <input
                      type="text"
                      value={geographicScope}
                      onChange={(e) => setGeographicScope(e.target.value)}
                      placeholder="e.g. Citywide / Zone 4 Ward Cluster"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Research Objectives & Expected Outcomes */}
              <div className="space-y-4 p-4 rounded-xl border border-border/80 bg-muted/10">
                <span className="text-section-header block">2. Research Objectives &amp; Pilot Deliverables</span>

                {/* Objectives */}
                <div className="space-y-2">
                  <label className="font-bold text-foreground block">Research &amp; Engineering Objectives</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      placeholder="Add specific research objective..."
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newObjective, objectives, setObjectives, () => setNewObjective(""));
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => addTag(newObjective, objectives, setObjectives, () => setNewObjective(""))}
                      className="text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </Button>
                  </div>
                  <div className="space-y-1 mt-1">
                    {objectives.map((obj, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-background rounded-lg border border-border text-xs">
                        <span>{obj}</span>
                        <button type="button" onClick={() => removeTag(i, objectives, setObjectives)} className="cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expected Outcomes */}
                <div className="space-y-2">
                  <label className="font-bold text-foreground block">Expected Pilot Deliverables</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      placeholder="Add expected outcome / deliverable..."
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newOutcome, expectedOutcomes, setExpectedOutcomes, () => setNewOutcome(""));
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => addTag(newOutcome, expectedOutcomes, setExpectedOutcomes, () => setNewOutcome(""))}
                      className="text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </Button>
                  </div>
                  <div className="space-y-1 mt-1">
                    {expectedOutcomes.map((out, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-background rounded-lg border border-border text-xs">
                        <span>{out}</span>
                        <button type="button" onClick={() => removeTag(i, expectedOutcomes, setExpectedOutcomes)} className="cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Group 3: Academic Domains & Technologies */}
              <div className="space-y-4 p-4 rounded-xl border border-border/80 bg-muted/10">
                <span className="text-section-header block">3. Multi-Disciplinary Domain &amp; Technical Criteria</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Domains */}
                  <div className="space-y-2">
                    <label className="font-bold text-foreground block">Required Academic Domains</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="e.g. Hydrology, Remote Sensing..."
                        className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag(newDomain, requiredDomains, setRequiredDomains, () => setNewDomain(""));
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => addTag(newDomain, requiredDomains, setRequiredDomains, () => setNewDomain(""))}
                        className="text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {requiredDomains.map((dom, i) => (
                        <Badge key={i} variant="default" className="gap-1 text-xs">
                          {dom}
                          <button type="button" onClick={() => removeTag(i, requiredDomains, setRequiredDomains)} className="cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Technologies */}
                  <div className="space-y-2">
                    <label className="font-bold text-foreground block">Potential Technologies</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTech}
                        onChange={(e) => setNewTech(e.target.value)}
                        placeholder="e.g. IoT Flow Sensors, GIS Mapping..."
                        className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag(newTech, potentialTech, setPotentialTech, () => setNewTech(""));
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => addTag(newTech, potentialTech, setPotentialTech, () => setNewTech(""))}
                        className="text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {potentialTech.map((tech, i) => (
                        <Badge key={i} variant="outline" className="gap-1 text-xs">
                          {tech}
                          <button type="button" onClick={() => removeTag(i, potentialTech, setPotentialTech)} className="cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW MODE                                                                 */
            /* ========================================================================= */
            <div className="space-y-5">
              {/* Problem Statement & Root Cause */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/20 rounded-xl border border-border/80 space-y-1.5">
                  <span className="text-stat-label block">
                    Problem Statement
                  </span>
                  <p className="text-body text-foreground leading-relaxed">{challenge.problemStatement}</p>
                </div>

                <div className="p-4 bg-muted/20 rounded-xl border border-border/80 space-y-1.5">
                  <span className="text-stat-label block">
                    Root Cause Hypothesis
                  </span>
                  <p className="text-body text-foreground leading-relaxed">
                    {challenge.rootCause || problem.approvedRootCause || "Root cause identified through municipal GIS and engineering analysis."}
                  </p>
                </div>
              </div>

              {/* 4-KPI Overview Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-stat-label block">Geographic Scope</span>
                  <span className="font-semibold text-foreground text-xs block mt-0.5">{challenge.geographicScope}</span>
                </div>
                <div className="p-3.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-stat-label block">Complexity Score</span>
                  <span className="font-bold text-teal-800 text-xs block mt-0.5">{challenge.complexityScore}/100</span>
                </div>
                <div className="p-3.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-stat-label block">Affected Population</span>
                  <span className="font-semibold text-foreground text-xs block mt-0.5">{challenge.affectedPopulation || "Civic Commuters & Residents"}</span>
                </div>
                <div className="p-3.5 bg-card rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-stat-label block">Formulation State</span>
                  <span className="font-bold text-emerald-800 text-xs block mt-0.5">{challenge.status}</span>
                </div>
              </div>

              {/* Research Objectives */}
              {challenge.objectives && challenge.objectives.length > 0 && (
                <div className="space-y-2">
                  <span className="text-stat-label flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span>Research &amp; Engineering Objectives</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1.5 text-foreground bg-muted/20 p-4 rounded-xl border border-border/80 leading-relaxed">
                    {challenge.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expected Pilot Deliverables */}
              {challenge.expectedOutcomes && challenge.expectedOutcomes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-stat-label block">
                    Expected Pilot Deliverables &amp; Outcomes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {challenge.expectedOutcomes.map((out, i) => (
                      <div key={i} className="p-3 bg-teal-50/50 rounded-xl border border-teal-200/80 text-teal-950 text-xs flex items-start gap-2.5 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{out}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Academic Domains & Technologies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <span className="text-stat-label block">
                    Required Academic Domains
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {challenge.requiredDomains.map((dom, i) => (
                      <Badge key={i} variant="research" size="sm">
                        {dom}
                      </Badge>
                    ))}
                  </div>
                </div>

                {challenge.potentialTechnologies && challenge.potentialTechnologies.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-stat-label block">
                      Potential Technologies &amp; Tools
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {challenge.potentialTechnologies.map((tech, i) => (
                        <Badge key={i} variant="outline" size="sm">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* APPROVE CONFIRMATION MODAL */}
      <Dialog
        open={confirmApproveOpen}
        onClose={() => setConfirmApproveOpen(false)}
        maxWidth="md"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Approve Problem Formulation</h3>
              <p className="text-xs text-muted-foreground">Authoritative sign-off as Innovation Manager</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            By approving this formulation, you certify that the problem statement, objectives, and academic criteria are sound. 
            This will activate the <strong>Recommendation Engine</strong> to screen and match accredited universities against these specific domains.
          </p>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold">
            Challenge: {challenge.title}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmApproveOpen(false)}
              disabled={approving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => { void handleApproveFormulation(); }}
              disabled={approving}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              {approving ? "Approving..." : "Confirm & Approve"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
