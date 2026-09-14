import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  ExternalLink,
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
  const { profile } = useAppSession();

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
  const [geographicScope, setGeographicScope] = useState(challenge?.geographicScope || problem.geographicScope || "Citywide");
  const [objectives, setObjectives] = useState<string[]>(challenge?.objectives || []);
  const [newObjective, setNewObjective] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState<string[]>(challenge?.expectedOutcomes || []);
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

      setActionSuccess("AI Formulation successfully generated and saved as draft.");
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
        }, 1200);
      }
    } catch (err: unknown) {
      console.error("Error approving formulation:", err);
      setActionError(err instanceof Error ? err.message : "Failed to approve formulation.");
    } finally {
      setApproving(false);
    }
  };

  // Tag list helper
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
      <Card className="border border-amber-300/80 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Step 2: AI Problem Formulation Required
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Formulate Municipal Innovation Challenge
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Transform this citizen grievance into a rigorous municipal innovation challenge with clear root-cause hypotheses, research objectives, expected deliverables, and academic domain requirements.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => { void handleGenerateWithAi(); }}
              disabled={generating}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold gap-2 text-xs h-10 px-4 shadow-sm shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              <span>{generating ? "Synthesizing with AI..." : "Formulate with AI"}</span>
            </Button>
          </div>

          {generationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Quick preview of Citizen Context */}
          <div className="p-4 bg-white/80 rounded-xl border border-amber-200/60 text-xs space-y-2">
            <div className="font-semibold text-slate-800">Source Grievance Dossier:</div>
            <div className="text-slate-600 italic">"{problem.description}"</div>
            {problem.approvedRootCause && (
              <div className="text-slate-700 pt-1">
                <span className="font-semibold text-slate-900">Classified Root Cause: </span>
                {problem.approvedRootCause}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isApproved = challenge.status === "APPROVED";

  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs">
      {/* Header */}
      <CardHeader className="pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Rocket className="w-4.5 h-4.5 text-teal-700 shrink-0" />
            <CardTitle className="text-base font-bold text-slate-900">
              Problem Formulation: {isEditing ? "Editing Formulation" : challenge.title}
            </CardTitle>
            {isApproved ? (
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs font-bold gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                Formulation Approved
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                Draft Formulation
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] text-slate-500">
              {challenge.category}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Authoritative municipal scope and specifications for academic university collaboration.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEditing}
                disabled={saving}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => { void handleSaveDraft(); }}
                disabled={saving}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold gap-1.5 h-8"
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
                className="text-xs font-semibold gap-1.5 h-8"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Formulation</span>
              </Button>

              {!isApproved ? (
                <Button
                  size="sm"
                  onClick={() => setConfirmApproveOpen(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 h-8"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Approve Formulation</span>
                </Button>
              ) : onNavigateToRecommendation ? (
                <Button
                  size="sm"
                  onClick={onNavigateToRecommendation}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold gap-1.5 h-8 px-3"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Recommendation Engine &rarr;</span>
                </Button>
              ) : null}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => void navigate(`/app/innovation/challenges/${challenge.id}`)}
                className="text-xs font-medium gap-1 text-slate-600 hover:text-slate-900 h-8"
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
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)}>
            <X className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)}>
            <X className="w-3.5 h-3.5 text-rose-600" />
          </button>
        </div>
      )}

      <CardContent className="p-6 space-y-5 text-xs">
        {isEditing ? (
          /* EDIT MODE FORM */
          <div className="space-y-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Challenge Title</label>
              <input
                type="text"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="e.g. Predictive Urban Hydrology Modeling..."
                className="w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Problem Statement</label>
                <textarea
                  rows={4}
                  value={problemStatement}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProblemStatement(e.target.value)}
                  placeholder="Comprehensive technical statement of the municipal challenge..."
                  className="w-full rounded-xl border border-slate-200 bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Root Cause Hypothesis</label>
                <textarea
                  rows={4}
                  value={rootCause}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRootCause(e.target.value)}
                  placeholder="Systemic, infrastructural, or hydrological root cause..."
                  className="w-full rounded-xl border border-slate-200 bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Affected Population</label>
                <input
                  type="text"
                  value={affectedPopulation}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAffectedPopulation(e.target.value)}
                  placeholder="e.g. 85,000 residents in flood-prone wards..."
                  className="w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Geographic Scope</label>
                <input
                  type="text"
                  value={geographicScope}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGeographicScope(e.target.value)}
                  placeholder="e.g. Citywide / Zone 4"
                  className="w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>

            {/* Objectives */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 block">Challenge Objectives</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewObjective(e.target.value)}
                  placeholder="Add specific research objective..."
                  className="flex-1 rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
                </Button>
              </div>
              <div className="space-y-1 mt-1">
                {objectives.map((obj, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span>{obj}</span>
                    <button type="button" onClick={() => removeTag(i, objectives, setObjectives)}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Domains & Technologies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Required Academic Domains</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDomain(e.target.value)}
                    placeholder="e.g. Hydrology, Remote Sensing..."
                    className="flex-1 rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
                      <button type="button" onClick={() => removeTag(i, requiredDomains, setRequiredDomains)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Potential Technologies</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTech}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTech(e.target.value)}
                    placeholder="e.g. IoT Flow Sensors, GIS Mapping..."
                    className="flex-1 rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
                      <button type="button" onClick={() => removeTag(i, potentialTech, setPotentialTech)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW MODE */
          <div className="space-y-5">
            {/* Statement & Root Cause */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Problem Statement
                </span>
                <p className="text-slate-800 leading-relaxed">{challenge.problemStatement}</p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Root Cause Hypothesis
                </span>
                <p className="text-slate-800 leading-relaxed">
                  {challenge.rootCause || problem.approvedRootCause || "Root cause identified through municipal GIS and engineering analysis."}
                </p>
              </div>
            </div>

            {/* Scope & Population */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">Geographic Scope</span>
                <span className="font-semibold text-slate-900 text-xs block mt-0.5">{challenge.geographicScope}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">Complexity Score</span>
                <span className="font-bold text-teal-800 text-xs block mt-0.5">{challenge.complexityScore}/100</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">Affected Population</span>
                <span className="font-semibold text-slate-900 text-xs block mt-0.5">{challenge.affectedPopulation || "Civic Commuters & Residents"}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block">Formulation State</span>
                <span className="font-bold text-emerald-800 text-xs block mt-0.5">{challenge.status}</span>
              </div>
            </div>

            {/* Objectives */}
            {challenge.objectives && challenge.objectives.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-teal-700" />
                  <span>Research & Engineering Objectives</span>
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/80">
                  {challenge.objectives.map((obj, i) => (
                    <li key={i} className="leading-relaxed">{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expected Outcomes */}
            {challenge.expectedOutcomes && challenge.expectedOutcomes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Expected Pilot Deliverables & Outcomes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {challenge.expectedOutcomes.map((out, i) => (
                    <div key={i} className="p-2.5 bg-teal-50/50 rounded-lg border border-teal-200/60 text-teal-900 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                      <span>{out}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Academic Domains & Technologies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Required Academic Domains
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {challenge.requiredDomains.map((dom, i) => (
                    <Badge key={i} className="bg-slate-100 text-slate-800 border-slate-300 font-semibold text-xs">
                      {dom}
                    </Badge>
                  ))}
                </div>
              </div>

              {challenge.potentialTechnologies && challenge.potentialTechnologies.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Potential Technologies & Tools
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {challenge.potentialTechnologies.map((tech, i) => (
                      <Badge key={i} variant="outline" className="text-slate-700 text-xs">
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
              <h3 className="font-bold text-slate-900 text-base">Approve Problem Formulation</h3>
              <p className="text-xs text-slate-500">Authoritative sign-off as Innovation Manager</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            By approving this formulation, you certify that the problem statement, objectives, and academic criteria are sound. This will activate the <strong>Recommendation Engine</strong> to screen and match accredited universities against these specific domains.
          </p>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
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
    </Card>
  );
}
