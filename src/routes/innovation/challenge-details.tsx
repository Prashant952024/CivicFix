import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Eye,
  FileText,
  LayoutGrid,
  ListChecks,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  Save,
  Scale,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { formatCitizenIssueDateTime, formatCitizenIssueImageUrl, type CitizenIssueImageRow } from "@/lib/citizen-issues";
import {
  formatOfficerIssuePriority,
  getOfficerIssuePriorityTone,
  getOfficerIssueSeverityLabel,
  getOfficerIssueSeverityTone,
} from "@/lib/officer-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

interface AiGeneratedDraftSnapshot {
  title?: string;
  problem_statement?: string;
  root_cause?: string;
  affected_population?: string;
  geographic_scope?: string;
  problem_category?: string;
  category?: string;
  required_domains?: string[];
  current_limitations?: string;
  objectives?: string[];
  expected_outcomes?: string[];
  constraints?: string[];
  potential_technology_areas?: string[];
  research_requirements?: string;
  success_criteria?: string[];
}

type ChallengeRecord = Database["public"]["Tables"]["innovation_challenges"]["Row"] & {
  source_issue?: Database["public"]["Tables"]["issues"]["Row"] & {
    issue_images?: CitizenIssueImageRow[] | null;
    reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
    decided_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
    issue_ai_analysis?: Database["public"]["Tables"]["issue_ai_analysis"]["Row"][] | null;
  };
  creator_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  approver_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

type FormulationTab = "scope" | "analysis" | "objectives" | "tech" | "governance";

export function InnovationChallengeDetailsPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { profile } = useAppSession();

  const [challenge, setChallenge] = useState<ChallengeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Layout & Navigation State
  const [showSourceDossier, setShowSourceDossier] = useState(true);
  const [activeTab, setActiveTab] = useState<FormulationTab>("scope");
  const [viewMode, setViewMode] = useState<"tabbed" | "full">("tabbed");

  // Form State for 14 Structured Fields
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [affectedPopulation, setAffectedPopulation] = useState("");
  const [geographicScope, setGeographicScope] = useState("");
  const [problemCategory, setProblemCategory] = useState("");
  const [requiredDomains, setRequiredDomains] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [currentLimitations, setCurrentLimitations] = useState("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjectiveInput, setNewObjectiveInput] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState<string[]>([]);
  const [newOutcomeInput, setNewOutcomeInput] = useState("");
  const [constraints, setConstraints] = useState<string[]>([]);
  const [newConstraintInput, setNewConstraintInput] = useState("");
  const [potentialTech, setPotentialTech] = useState<string[]>([]);
  const [newTechInput, setNewTechInput] = useState("");
  const [researchRequirements, setResearchRequirements] = useState("");
  const [successCriteria, setSuccessCriteria] = useState<string[]>([]);
  const [newCriterionInput, setNewCriterionInput] = useState("");

  // Action / State flags
  const [savingDraft, setSavingDraft] = useState(false);
  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [showAiDraftComparison, setShowAiDraftComparison] = useState(false);

  useEffect(() => {
    if (!challengeId) return;
    const currentId = challengeId;
    let cancelled = false;

    async function loadChallenge() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchErr } = await supabase
          .from("innovation_challenges")
          .select(`
            *,
            source_issue:issues (
              *,
              issue_images (id, storage_bucket, storage_path, image_type, created_at),
              reporter_profile:profiles!issues_reporter_profile_id_fkey (id, full_name, email),
              decided_by_profile:profiles!issues_classification_decided_by_fkey (id, full_name, email),
              issue_ai_analysis (*)
            ),
            creator_profile:profiles!innovation_challenges_created_by_fkey (id, full_name, email),
            approver_profile:profiles!innovation_challenges_approved_by_fkey (id, full_name, email)
          `)
          .eq("id", currentId)
          .maybeSingle();

        if (cancelled) return;

        if (fetchErr || !data) {
          if (import.meta.env.DEV) console.error("Challenge load error:", fetchErr);
          setError("Innovation challenge statement not found.");
          setLoading(false);
          return;
        }

        const rec = data as unknown as ChallengeRecord;
        setChallenge(rec);

        // Populate form fields
        setTitle(rec.title || "");
        setProblemStatement(rec.problem_statement || "");
        setRootCause(rec.root_cause || "");
        setAffectedPopulation(rec.affected_population || "");
        setGeographicScope(rec.geographic_scope || "");
        setProblemCategory(rec.problem_category || rec.category || "");
        setRequiredDomains(rec.required_domains || rec.required_expertise || []);
        setCurrentLimitations(rec.current_limitations || "");
        setObjectives(rec.objectives || []);
        setExpectedOutcomes(rec.expected_outcomes || []);
        setConstraints(rec.constraints || []);
        setPotentialTech(rec.potential_technology_areas || []);
        setResearchRequirements(rec.research_requirements || "");
        setSuccessCriteria(rec.success_criteria || []);
      } catch (err: unknown) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error("Challenge fetch exception:", err);
        setError("Failed to load innovation challenge details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadChallenge();

    return () => {
      cancelled = true;
    };
  }, [challengeId, refreshNonce]);

  // Field manipulation handlers
  function handleAddDomain() {
    const val = newDomainInput.trim();
    if (!val || requiredDomains.includes(val)) return;
    setRequiredDomains([...requiredDomains, val]);
    setNewDomainInput("");
  }

  function handleRemoveDomain(d: string) {
    setRequiredDomains(requiredDomains.filter((item) => item !== d));
  }

  function handleAddTech() {
    const val = newTechInput.trim();
    if (!val || potentialTech.includes(val)) return;
    setPotentialTech([...potentialTech, val]);
    setNewTechInput("");
  }

  function handleRemoveTech(t: string) {
    setPotentialTech(potentialTech.filter((item) => item !== t));
  }

  function handleAddObjective() {
    const val = newObjectiveInput.trim();
    if (!val) return;
    setObjectives([...objectives, val]);
    setNewObjectiveInput("");
  }

  function handleRemoveObjective(index: number) {
    setObjectives(objectives.filter((_, i) => i !== index));
  }

  function handleAddOutcome() {
    const val = newOutcomeInput.trim();
    if (!val) return;
    setExpectedOutcomes([...expectedOutcomes, val]);
    setNewOutcomeInput("");
  }

  function handleRemoveOutcome(index: number) {
    setExpectedOutcomes(expectedOutcomes.filter((_, i) => i !== index));
  }

  function handleAddConstraint() {
    const val = newConstraintInput.trim();
    if (!val) return;
    setConstraints([...constraints, val]);
    setNewConstraintInput("");
  }

  function handleRemoveConstraint(index: number) {
    setConstraints(constraints.filter((_, i) => i !== index));
  }

  function handleAddCriterion() {
    const val = newCriterionInput.trim();
    if (!val) return;
    setSuccessCriteria([...successCriteria, val]);
    setNewCriterionInput("");
  }

  function handleRemoveCriterion(index: number) {
    setSuccessCriteria(successCriteria.filter((_, i) => i !== index));
  }

  // Save Draft Action
  async function handleSaveDraft() {
    if (!challenge) return;
    setSavingDraft(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { error: updateErr } = await supabase
        .from("innovation_challenges")
        .update({
          title: title.trim(),
          problem_statement: problemStatement.trim(),
          root_cause: rootCause.trim() || null,
          affected_population: affectedPopulation.trim() || null,
          geographic_scope: geographicScope.trim() || null,
          problem_category: problemCategory.trim() || null,
          category: problemCategory.trim() || challenge.category,
          required_domains: requiredDomains,
          required_expertise: requiredDomains,
          current_limitations: currentLimitations.trim() || null,
          objectives,
          expected_outcomes: expectedOutcomes,
          constraints,
          potential_technology_areas: potentialTech,
          research_requirements: researchRequirements.trim() || null,
          success_criteria: successCriteria,
          status: "DRAFT",
          updated_at: new Date().toISOString(),
        })
        .eq("id", challenge.id);

      if (updateErr) throw updateErr;

      setActionSuccess("Challenge draft saved successfully!");
      setRefreshNonce((prev) => prev + 1);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error("Save draft error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to save challenge draft.");
    } finally {
      setSavingDraft(false);
    }
  }

  // Approve Challenge Action (Managerial Authoritative Decision)
  async function handleApproveChallenge() {
    if (!challenge || !profile?.id) return;

    // Validation
    if (!title.trim()) {
      setActionError("Title is required for approval.");
      return;
    }
    if (!problemStatement.trim()) {
      setActionError("Problem Statement is required for approval.");
      return;
    }
    if (!rootCause.trim()) {
      setActionError("Root Cause analysis is required for approval.");
      return;
    }
    if (objectives.length === 0) {
      setActionError("At least one objective is required for approval.");
      return;
    }
    if (requiredDomains.length === 0) {
      setActionError("At least one required domain/expertise is required for approval.");
      return;
    }
    if (expectedOutcomes.length === 0) {
      setActionError("At least one expected outcome is required for approval.");
      return;
    }
    if (successCriteria.length === 0) {
      setActionError("At least one success criterion is required for approval.");
      return;
    }

    setApproving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const nowIso = new Date().toISOString();
      const { error: approveErr } = await supabase
        .from("innovation_challenges")
        .update({
          title: title.trim(),
          problem_statement: problemStatement.trim(),
          root_cause: rootCause.trim(),
          affected_population: affectedPopulation.trim() || null,
          geographic_scope: geographicScope.trim() || null,
          problem_category: problemCategory.trim() || null,
          category: problemCategory.trim() || challenge.category,
          required_domains: requiredDomains,
          required_expertise: requiredDomains,
          current_limitations: currentLimitations.trim() || null,
          objectives,
          expected_outcomes: expectedOutcomes,
          constraints,
          potential_technology_areas: potentialTech,
          research_requirements: researchRequirements.trim() || null,
          success_criteria: successCriteria,
          status: "APPROVED",
          approved_by: profile.id,
          approved_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", challenge.id);

      if (approveErr) throw approveErr;

      setActionSuccess("Innovation Challenge approved and finalized for academic & institutional matching!");
      setConfirmApproveOpen(false);
      setRefreshNonce((prev) => prev + 1);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error("Approve challenge error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to approve innovation challenge.");
    } finally {
      setApproving(false);
    }
  }

  // Regenerate with AI Action
  async function handleRegenerateWithAi() {
    if (!challenge) return;
    setRegenerating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await supabase.functions.invoke<{
        success?: boolean;
        ai_draft?: AiGeneratedDraftSnapshot;
        error?: string;
      }>("generate-challenge", {
        body: {
          issue_id: challenge.source_issue_id,
          challenge_id: challenge.id,
          force_regenerate: true,
        },
      });

      if (response.error) {
        const errMsg =
          response.error instanceof Error
            ? response.error.message
            : "Failed to regenerate challenge with AI.";
        throw new Error(errMsg);
      }

      const resData = response.data;
      if (!resData?.success) {
        throw new Error(resData?.error || "Failed to regenerate challenge with AI.");
      }

      const draft = resData.ai_draft;
      if (draft) {
        setTitle(draft.title || "");
        setProblemStatement(draft.problem_statement || "");
        setRootCause(draft.root_cause || "");
        setAffectedPopulation(draft.affected_population || "");
        setGeographicScope(draft.geographic_scope || "");
        setProblemCategory(draft.problem_category || draft.category || "");
        setRequiredDomains(draft.required_domains || []);
        setCurrentLimitations(draft.current_limitations || "");
        setObjectives(draft.objectives || []);
        setExpectedOutcomes(draft.expected_outcomes || []);
        setConstraints(draft.constraints || []);
        setPotentialTech(draft.potential_technology_areas || []);
        setResearchRequirements(draft.research_requirements || "");
        setSuccessCriteria(draft.success_criteria || []);
      }

      setActionSuccess("Fresh AI draft synthesized and populated into workspace!");
      setConfirmRegenerateOpen(false);
      setRefreshNonce((prev) => prev + 1);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error("Regenerate challenge error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to regenerate challenge draft.");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
        Loading Innovation Challenge workspace...
      </div>
    );
  }

  if (error || !challenge || !challenge.source_issue) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <p className="font-semibold text-foreground">{error ?? "Challenge not found."}</p>
        <Button asChild variant="outline">
          <Link to="/app/innovation/challenges">Back to Innovation Challenges</Link>
        </Button>
      </div>
    );
  }

  const sourceIssue = challenge.source_issue;
  const isApproved = challenge.status === "APPROVED";
  const latestAi = sourceIssue?.issue_ai_analysis?.[0];
  const rawAiDraft = challenge.ai_generated_draft as unknown as AiGeneratedDraftSnapshot | null;

  // Evaluation & Validation Checklist for Managerial Governance
  const requiredFieldsChecklist = [
    { label: "1. Problem Title", met: Boolean(title.trim()) },
    { label: "2. Problem Statement & Scope", met: Boolean(problemStatement.trim()) },
    { label: "3. Root Cause Analysis", met: Boolean(rootCause.trim()) },
    { label: "7. Multidisciplinary Domains", met: requiredDomains.length > 0 },
    { label: "9. Challenge Objectives", met: objectives.length > 0 },
    { label: "10. Expected Outcomes", met: expectedOutcomes.length > 0 },
    { label: "14. Success Criteria", met: successCriteria.length > 0 },
  ];
  const completedRequiredCount = requiredFieldsChecklist.filter((f) => f.met).length;
  const isReadyForApproval = completedRequiredCount === 7;

  // Thematic Tab Definition
  const tabsList: {
    id: FormulationTab;
    label: string;
    icon: typeof Rocket;
    badgeCount?: number;
    badgeTone?: "default" | "teal" | "amber";
  }[] = [
    {
      id: "scope",
      label: "Scope & Context",
      icon: Target,
      badgeCount: [title, problemStatement, problemCategory, affectedPopulation, geographicScope].filter(Boolean).length,
    },
    {
      id: "analysis",
      label: "Root Cause & Gaps",
      icon: Search,
      badgeCount: [rootCause, currentLimitations].filter(Boolean).length,
    },
    {
      id: "objectives",
      label: "Objectives & Outcomes",
      icon: Rocket,
      badgeCount: objectives.length + expectedOutcomes.length,
      badgeTone: objectives.length > 0 && expectedOutcomes.length > 0 ? "teal" : "amber",
    },
    {
      id: "tech",
      label: "Disciplines & Tech",
      icon: Cpu,
      badgeCount: requiredDomains.length + potentialTech.length,
      badgeTone: requiredDomains.length > 0 ? "teal" : "amber",
    },
    {
      id: "governance",
      label: "Benchmarks & Sign-off",
      icon: Scale,
      badgeCount: successCriteria.length,
      badgeTone: successCriteria.length > 0 ? "teal" : "amber",
    },
  ];

  const tabSequence: FormulationTab[] = ["scope", "analysis", "objectives", "tech", "governance"];
  const currentTabIdx = tabSequence.indexOf(activeTab);
  const prevTab = currentTabIdx > 0 ? tabSequence[currentTabIdx - 1] : null;
  const nextTab = currentTabIdx < tabSequence.length - 1 ? tabSequence[currentTabIdx + 1] : null;

  // Sub-section Renderers
  const renderScopeSection = () => (
    <div className="space-y-4">
      {/* Field 1: Problem Title */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary font-mono text-[11px]">
              1
            </span>
            Problem Title <span className="text-destructive font-bold">*</span>
          </label>
          <span className="text-[10px] text-muted-foreground">Professional &amp; Innovation Oriented</span>
        </div>
        {isApproved ? (
          <p className="p-3 rounded-lg border border-border/70 bg-muted/20 font-bold text-sm text-foreground">
            {title}
          </p>
        ) : (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-input bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            placeholder="e.g. Predictive Water Availability Modeling and Precision Irrigation Decision Support"
          />
        )}
      </div>

      {/* Field 2: Problem Statement & Scope */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary font-mono text-[11px]">
              2
            </span>
            Problem Statement &amp; Scope <span className="text-destructive font-bold">*</span>
          </label>
          <span className="text-[10px] text-muted-foreground">Distinguish systemic causes from surface symptoms</span>
        </div>
        {isApproved ? (
          <p className="p-3.5 rounded-lg border border-border/70 bg-muted/20 leading-relaxed text-foreground whitespace-pre-line text-xs">
            {problemStatement}
          </p>
        ) : (
          <textarea
            rows={5}
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            className="w-full text-xs p-3 rounded-lg border border-input bg-background text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            placeholder="Detail what the problem is, who experiences it, where it occurs, why it matters, current consequences, and why routine municipal procedures fail..."
          />
        )}
      </div>

      {/* Row: 4. Population, 5. Geographic Scope, 6. Category (3-Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Field 4: Affected Population */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-xs space-y-1.5">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[10px] font-mono">
              4
            </span>
            Affected Population
          </label>
          {isApproved ? (
            <p className="p-2.5 rounded-lg border border-border/70 bg-muted/20 text-foreground text-xs">
              {affectedPopulation || "Not specified"}
            </p>
          ) : (
            <input
              type="text"
              value={affectedPopulation}
              onChange={(e) => setAffectedPopulation(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              placeholder="e.g. Smallholder farmers &amp; cooperatives"
            />
          )}
          <span className="text-[10px] text-muted-foreground block">Qualitative stakeholder scale</span>
        </div>

        {/* Field 5: Geographic Scope */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-xs space-y-1.5">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[10px] font-mono">
              5
            </span>
            Geographic Scope
          </label>
          {isApproved ? (
            <p className="p-2.5 rounded-lg border border-border/70 bg-muted/20 text-foreground text-xs">
              {geographicScope || "Municipal Jurisdiction"}
            </p>
          ) : (
            <input
              type="text"
              value={geographicScope}
              onChange={(e) => setGeographicScope(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              placeholder="e.g. Regional Drainage Basin, Ward 4"
            />
          )}
          <span className="text-[10px] text-muted-foreground block">Spatial catchment jurisdiction</span>
        </div>

        {/* Field 6: Problem Category */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-xs space-y-1.5">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[10px] font-mono">
              6
            </span>
            Problem Category
          </label>
          {isApproved ? (
            <p className="p-2.5 rounded-lg border border-border/70 bg-muted/20 text-foreground text-xs">
              {problemCategory || "Civic Infrastructure"}
            </p>
          ) : (
            <input
              type="text"
              value={problemCategory}
              onChange={(e) => setProblemCategory(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              placeholder="e.g. Agriculture / Water Management"
            />
          )}
          <span className="text-[10px] text-muted-foreground block">Innovation taxonomy classification</span>
        </div>
      </div>
    </div>
  );

  const renderAnalysisSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Field 3: Root Cause Analysis */}
      <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-900 font-mono text-[11px]">
              3
            </span>
            Root Cause Analysis <span className="text-destructive font-bold">*</span>
          </label>
          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">
            Systemic Driver
          </span>
        </div>
        {isApproved ? (
          <p className="p-3 rounded-lg border border-amber-200/70 bg-card leading-relaxed text-foreground whitespace-pre-line text-xs min-h-[160px]">
            {rootCause}
          </p>
        ) : (
          <textarea
            rows={7}
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            className="w-full text-xs p-3 rounded-lg border border-input bg-background text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            placeholder="Identify systemic, hydrological, infrastructural, analytical, or behavioral root causes that drive this recurring problem..."
          />
        )}
        <p className="text-[10px] text-muted-foreground">
          Focuses on underlying causal mechanics rather than visible symptoms.
        </p>
      </div>

      {/* Field 8: Current Limitations of Existing Methods */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-foreground font-mono text-[11px]">
              8
            </span>
            Current Municipal Limitations
          </label>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Methodological Gaps
          </span>
        </div>
        {isApproved ? (
          <p className="p-3 rounded-lg border border-border/70 bg-muted/20 leading-relaxed text-foreground whitespace-pre-line text-xs min-h-[160px]">
            {currentLimitations || "No specific limitations recorded."}
          </p>
        ) : (
          <textarea
            rows={7}
            value={currentLimitations}
            onChange={(e) => setCurrentLimitations(e.target.value)}
            className="w-full text-xs p-3 rounded-lg border border-input bg-background text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            placeholder="Explain why standard departmental tools, off-the-shelf equipment, or manual practices fall short and necessitate outside innovation..."
          />
        )}
        <p className="text-[10px] text-muted-foreground">
          Justifies why standard departmental routine resolution cannot fix this issue.
        </p>
      </div>
    </div>
  );

  const renderObjectivesSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Field 9: Key Challenge Objectives */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-900 font-mono text-[11px]">
              9
            </span>
            Key Challenge Objectives <span className="text-destructive font-bold">*</span>
          </label>
          <Badge variant="teal" size="sm">
            {objectives.length} {objectives.length === 1 ? "Objective" : "Objectives"}
          </Badge>
        </div>

        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {objectives.map((obj, i) => (
            <div
              key={i}
              className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-start justify-between gap-2 shadow-2xs hover:border-teal-300 transition-colors"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 shrink-0 mt-0.5">
                  #{i + 1}
                </span>
                <span className="text-foreground text-xs leading-snug">{obj}</span>
              </div>
              {!isApproved ? (
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(i)}
                  className="text-muted-foreground hover:text-rose-600 shrink-0 p-1 transition-colors"
                  title="Remove objective"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          {objectives.length === 0 ? (
            <div className="p-4 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
              No objectives added yet. Add at least one objective for approval.
            </div>
          ) : null}
        </div>

        {!isApproved ? (
          <div className="flex items-center gap-2 pt-1 border-t border-border/60">
            <input
              type="text"
              value={newObjectiveInput}
              onChange={(e) => setNewObjectiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddObjective();
                }
              }}
              placeholder="Add actionable research/pilot objective..."
              className="flex-1 text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="button" size="sm" variant="outline" onClick={handleAddObjective} className="text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        ) : null}
      </div>

      {/* Field 10: Expected Innovation Outcomes */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-900 font-mono text-[11px]">
              10
            </span>
            Expected Innovation Outcomes <span className="text-destructive font-bold">*</span>
          </label>
          <Badge variant="teal" size="sm">
            {expectedOutcomes.length} {expectedOutcomes.length === 1 ? "Outcome" : "Outcomes"}
          </Badge>
        </div>

        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {expectedOutcomes.map((out, i) => (
            <div
              key={i}
              className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-start justify-between gap-2 shadow-2xs hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-emerald-600 font-bold text-xs shrink-0 mt-0.5">•</span>
                <span className="text-foreground text-xs leading-snug">{out}</span>
              </div>
              {!isApproved ? (
                <button
                  type="button"
                  onClick={() => handleRemoveOutcome(i)}
                  className="text-muted-foreground hover:text-rose-600 shrink-0 p-1 transition-colors"
                  title="Remove outcome"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          {expectedOutcomes.length === 0 ? (
            <div className="p-4 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
              No expected outcomes added yet.
            </div>
          ) : null}
        </div>

        {!isApproved ? (
          <div className="flex items-center gap-2 pt-1 border-t border-border/60">
            <input
              type="text"
              value={newOutcomeInput}
              onChange={(e) => setNewOutcomeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddOutcome();
                }
              }}
              placeholder="Add expected outcome (e.g. 40% reduction in water losses)..."
              className="flex-1 text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="button" size="sm" variant="outline" onClick={handleAddOutcome} className="text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderTechSection = () => (
    <div className="space-y-4">
      {/* Paired Grid: 7. Disciplines & 12. Potential Technologies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Field 7: Required Multidisciplinary Domains */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-900 font-mono text-[11px]">
                7
              </span>
              Required Multidisciplinary Domains <span className="text-destructive font-bold">*</span>
            </label>
            <Badge variant="teal" size="sm">
              {requiredDomains.length} Required
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[50px] p-2.5 rounded-lg border border-border/70 bg-muted/20">
            {requiredDomains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs"
              >
                {d}
                {!isApproved ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(d)}
                    className="text-teal-700 hover:text-rose-600 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            ))}
            {requiredDomains.length === 0 ? (
              <span className="text-muted-foreground text-[11px] py-1">No domains added yet. Add at least one.</span>
            ) : null}
          </div>

          {!isApproved ? (
            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
              <input
                type="text"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
                placeholder="e.g. Hydrology, Agronomy, IoT..."
                className="flex-1 text-xs p-1.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddDomain} className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          ) : null}
        </div>

        {/* Field 12: Potential Technology Areas */}
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 text-sky-900 font-mono text-[11px]">
                12
              </span>
              Potential Technology Areas
            </label>
            <span className="text-[10px] text-muted-foreground">Non-Mandatory Suggestions</span>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[50px] p-2.5 rounded-lg border border-border/70 bg-muted/20">
            {potentialTech.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 text-sky-900 border border-sky-200 shadow-2xs"
              >
                {t}
                {!isApproved ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveTech(t)}
                    className="text-sky-700 hover:text-rose-600 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            ))}
            {potentialTech.length === 0 ? (
              <span className="text-muted-foreground text-[11px] py-1">No technologies specified yet.</span>
            ) : null}
          </div>

          {!isApproved ? (
            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
              <input
                type="text"
                value={newTechInput}
                onChange={(e) => setNewTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
                placeholder="e.g. Edge AI, Satellite Remote Sensing..."
                className="flex-1 text-xs p-1.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddTech} className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Field 13: Research & Methodological Requirements */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-foreground font-mono text-[11px]">
              13
            </span>
            Research &amp; Experimental Requirements
          </label>
          <span className="text-[10px] text-muted-foreground">Empirical, mathematical, or lab verification</span>
        </div>
        {isApproved ? (
          <p className="p-3 rounded-lg border border-border/70 bg-muted/20 leading-relaxed text-foreground whitespace-pre-line text-xs">
            {researchRequirements || "No specialized research requirements specified."}
          </p>
        ) : (
          <textarea
            rows={3}
            value={researchRequirements}
            onChange={(e) => setResearchRequirements(e.target.value)}
            className="w-full text-xs p-3 rounded-lg border border-input bg-background text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            placeholder="Outline open research questions, hydrological/climatic modeling techniques, or experimental field trials needed..."
          />
        )}
      </div>
    </div>
  );

  const renderGovernanceSection = () => (
    <div className="space-y-5">
      {/* 2-Column Grid: 11. Constraints & 14. Success Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Field 11: Known Operational & Environmental Constraints */}
        <div className="p-4 rounded-xl border border-amber-200/70 bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-900 font-mono text-[11px]">
                11
              </span>
              Known Constraints
            </label>
            <Badge variant="amber" size="sm">
              {constraints.length} Constraints
            </Badge>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {constraints.map((c, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-start justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="font-bold text-amber-600 text-xs shrink-0 mt-0.5">•</span>
                  <span className="text-foreground text-xs leading-snug">{c}</span>
                </div>
                {!isApproved ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(i)}
                    className="text-muted-foreground hover:text-rose-600 shrink-0 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            {constraints.length === 0 ? (
              <div className="p-3 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                No constraints specified.
              </div>
            ) : null}
          </div>

          {!isApproved ? (
            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
              <input
                type="text"
                value={newConstraintInput}
                onChange={(e) => setNewConstraintInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddConstraint();
                  }
                }}
                placeholder="Add operational or budget constraint..."
                className="flex-1 text-xs p-1.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddConstraint} className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          ) : null}
        </div>

        {/* Field 14: Success Criteria & Evaluation Benchmarks */}
        <div className="p-4 rounded-xl border border-emerald-200/70 bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-900 font-mono text-[11px]">
                14
              </span>
              Success Criteria &amp; Benchmarks <span className="text-destructive font-bold">*</span>
            </label>
            <Badge variant="teal" size="sm">
              {successCriteria.length} Criteria
            </Badge>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {successCriteria.map((crit, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-start justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="font-bold text-emerald-600 text-xs shrink-0 mt-0.5">✓</span>
                  <span className="text-foreground text-xs leading-snug">{crit}</span>
                </div>
                {!isApproved ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(i)}
                    className="text-muted-foreground hover:text-rose-600 shrink-0 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            {successCriteria.length === 0 ? (
              <div className="p-3 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                No success criteria specified yet. Add at least one for approval.
              </div>
            ) : null}
          </div>

          {!isApproved ? (
            <div className="flex items-center gap-2 pt-1 border-t border-border/60">
              <input
                type="text"
                value={newCriterionInput}
                onChange={(e) => setNewCriterionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCriterion();
                  }
                }}
                placeholder="Add benchmark (e.g. 90% forecast precision)..."
                className="flex-1 text-xs p-1.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddCriterion} className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Managerial Governance Sign-off & Audit Panel */}
      <div className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-700" />
            <h4 className="font-bold text-sm text-teal-950">
              Managerial Approval Readiness &amp; Governance
            </h4>
          </div>
          <Badge variant={isReadyForApproval ? "teal" : "amber"} size="sm" className="font-bold">
            {isReadyForApproval ? "Ready For Approval" : `${completedRequiredCount}/7 Required Complete`}
          </Badge>
        </div>

        {/* 7 Required Criteria Checklist Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {requiredFieldsChecklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border flex items-center gap-2 transition-colors ${
                item.met
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : "bg-muted/40 border-border/70 text-muted-foreground"
              }`}
            >
              {item.met ? (
                <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
              )}
              <span className="text-[11px] font-medium truncate" title={item.label}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Collapsible Original AI Draft Comparison Drawer */}
        {rawAiDraft ? (
          <div className="pt-2 border-t border-teal-200/60">
            <button
              type="button"
              onClick={() => setShowAiDraftComparison(!showAiDraftComparison)}
              className="flex items-center justify-between w-full p-2.5 rounded-lg border border-teal-200 bg-teal-100/40 hover:bg-teal-100/70 transition text-xs font-semibold text-teal-900"
            >
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-teal-700" />
                <span>Audit: Inspect Original AI Draft ({challenge.ai_model_version || "Gemini"})</span>
              </span>
              {showAiDraftComparison ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAiDraftComparison ? (
              <div className="mt-2 p-3.5 rounded-xl border border-teal-200 bg-card space-y-2.5 animate-in fade-in-50 text-xs">
                <span className="font-bold text-teal-950 block text-[11px]">
                  Original AI Output Snapshot ({challenge.ai_generated_at ? formatCitizenIssueDateTime(challenge.ai_generated_at) : "Synthesized"}):
                </span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 font-mono text-[11px]">
                  <div>
                    <strong className="text-foreground">AI Title:</strong> {rawAiDraft.title}
                  </div>
                  <div>
                    <strong className="text-foreground">AI Root Cause:</strong> {rawAiDraft.root_cause}
                  </div>
                  <div>
                    <strong className="text-foreground">AI Domains:</strong> {(rawAiDraft.required_domains || []).join(", ")}
                  </div>
                  <div>
                    <strong className="text-foreground">AI Limitations:</strong> {rawAiDraft.current_limitations}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Approval Action Bar */}
        {!isApproved ? (
          <div className="pt-3 border-t border-teal-200/60 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-teal-950/80">
              Only your authoritative manager approval makes this Challenge binding and eligible for institutional matching.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSaveDraft()}
                disabled={savingDraft || approving || regenerating}
                className="gap-1.5 text-xs"
              >
                {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmApproveOpen(true)}
                disabled={savingDraft || approving || regenerating || !isReadyForApproval}
                className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Confirm &amp; Approve Challenge
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={isApproved ? challenge.title : "Challenge Review & Approval"}
        description={
          isApproved
            ? "Authoritative Innovation Challenge formulated and locked for institutional matching."
            : "Review, refine, and approve the AI-synthesized challenge statement from the complex civic issue."
        }
        backHref="/app/innovation/challenges"
        backLabel="Innovation Challenges"
        tag="Innovation Challenge Center"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isApproved ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRegenerateOpen(true)}
                  disabled={regenerating || savingDraft || approving}
                  className="gap-1.5 text-xs"
                >
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  Regenerate with AI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSaveDraft()}
                  disabled={regenerating || savingDraft || approving}
                  className="gap-1.5 text-xs"
                >
                  {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => setConfirmApproveOpen(true)}
                  disabled={regenerating || savingDraft || approving || !isReadyForApproval}
                  className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approve Challenge
                </Button>
              </>
            ) : (
              <Badge variant="teal" size="default" className="gap-1.5 font-bold px-3 py-1">
                <ShieldCheck className="h-4 w-4" />
                APPROVED • READY FOR MATCHING
              </Badge>
            )}
          </div>
        }
      />

      {/* Action Notification Banners */}
      {actionSuccess ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">{actionSuccess}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">{actionError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Status & Governance Principle Banner */}
      {isApproved ? (
        <Card className="rounded-2xl border-2 border-teal-500/40 bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-background p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-100 text-teal-800 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-teal-950 block">
                  Authoritative Civic Innovation Challenge
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Approved by{" "}
                  <strong className="text-foreground">
                    {challenge.approver_profile?.full_name || "Authorized Innovation Manager"}
                  </strong>{" "}
                  on {formatCitizenIssueDateTime(challenge.approved_at || challenge.updated_at)}. This record is locked for Phase 3C institution matching.
                </p>
              </div>
            </div>
            <Badge variant="teal" size="sm" className="font-bold shrink-0 self-start sm:self-auto">
              Ready for Phase 3C
            </Badge>
          </div>
        </Card>
      ) : (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold block text-sm">Managerial Governance Notice: AI Draft Under Review</span>
              <span className="text-[11px] font-semibold text-amber-800">
                {completedRequiredCount}/7 Mandatory Specifications Complete
              </span>
            </div>
            <p className="mt-0.5 leading-relaxed text-amber-900/90">
              The formulation workspace synthesizes the citizen&apos;s grievance and multi-factor diagnostic data into 14 structured challenge fields.
              AI provides draft recommendations; only your authoritative approval makes this Innovation Challenge official.
            </p>
          </div>
        </div>
      )}

      {/* Main Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Source Issue Dossier & Multi-Factor AI Diagnostics */}
        {showSourceDossier ? (
          <div className="lg:col-span-4 space-y-4">
            {/* 1. Original Citizen Issue Statement Card */}
            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-4 bg-muted/40 border-b border-border/70 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Source Civic Grievance
                  </CardTitle>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Link to={`/app/innovation/issues/${sourceIssue.id}`}>
                    <span>Full View</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>

              <CardContent className="space-y-3.5 pt-4 text-xs">
                <div>
                  <span className="font-mono text-[10px] text-muted-foreground block">
                    Issue #{sourceIssue.id.slice(0, 8)} • Submitted {formatCitizenIssueDateTime(sourceIssue.created_at)}
                  </span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    {sourceIssue.title}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-foreground leading-relaxed">
                  <span className="font-semibold text-[10px] text-muted-foreground uppercase block mb-1">
                    Citizen Problem Statement:
                  </span>
                  &ldquo;{sourceIssue.description}&rdquo;
                </div>

                {/* Grievance Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-[10px] text-muted-foreground block">Category</span>
                    <span className="font-semibold text-foreground">{sourceIssue.category}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-[10px] text-muted-foreground block">Location</span>
                    <span className="font-medium text-foreground truncate block" title={sourceIssue.address_text || sourceIssue.location_text || ""}>
                      {sourceIssue.address_text || sourceIssue.location_text || "Municipal Jurisdiction"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-[10px] text-muted-foreground block">Severity</span>
                    <Badge variant={getOfficerIssueSeverityTone(sourceIssue.severity)} size="sm" className="mt-0.5">
                      {getOfficerIssueSeverityLabel(sourceIssue.severity)}
                    </Badge>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                    <span className="text-[10px] text-muted-foreground block">Priority</span>
                    <Badge variant={getOfficerIssuePriorityTone(sourceIssue.priority)} size="sm" className="mt-0.5">
                      {formatOfficerIssuePriority(sourceIssue.priority)}
                    </Badge>
                  </div>
                </div>

                {/* Photographic Evidence */}
                {sourceIssue.issue_images && sourceIssue.issue_images.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                      Attached Evidence ({sourceIssue.issue_images.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sourceIssue.issue_images.map((img) => {
                        const url = formatCitizenIssueImageUrl(img);
                        if (!url) return null;
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setPreviewImage(url)}
                            className="group relative h-16 w-24 overflow-hidden rounded-lg border border-border shadow-xs hover:ring-2 hover:ring-primary transition-all"
                          >
                            <img src={url} alt="Evidence" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="h-3.5 w-3.5" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* 2. Admin Authoritative Classification Banner */}
            <Card className="rounded-2xl border border-teal-200/80 bg-teal-50/40 p-4 shadow-sm text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  Admin Authoritative Classification
                </span>
                <Badge variant="teal" size="sm" className="font-bold">
                  COMPLEX
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Decided by: <strong className="text-foreground">{sourceIssue.decided_by_profile?.full_name || "Platform Administrator"}</strong>
                {sourceIssue.classification_decided_at ? ` on ${formatCitizenIssueDateTime(sourceIssue.classification_decided_at)}` : ""}
              </p>
              {sourceIssue.classification_override_reason ? (
                <p className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-950 italic">
                  Override Note: {sourceIssue.classification_override_reason}
                </p>
              ) : null}
            </Card>

            {/* 3. AI 16-Factor Diagnostic Summary */}
            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden text-xs">
              <CardHeader className="py-3 px-4 bg-muted/40 border-b border-border/70 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                    AI Multi-Factor Diagnostics
                  </CardTitle>
                </div>
                <span className="font-bold text-teal-800">
                  Score: {sourceIssue.ai_complexity_score ?? 75}/100
                </span>
              </CardHeader>
              <CardContent className="pt-3 pb-4 px-4 space-y-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Diagnostic Reasoning:
                  </span>
                  <p className="text-foreground leading-relaxed mt-0.5">
                    {sourceIssue.ai_complexity_reasoning || latestAi?.complexity_reasoning || "Systemic inter-disciplinary failure identified."}
                  </p>
                </div>

                {/* Initial Recommended Expertise Chips */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">
                    Initial Triage Disciplines:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(sourceIssue.ai_required_expertise || latestAi?.required_expertise || []).map((exp) => (
                      <span
                        key={exp}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 text-teal-900 border border-teal-200"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* RIGHT COLUMN: Modern Formulated Problem Statement Workspace */}
        <div className={showSourceDossier ? "lg:col-span-8 space-y-4" : "lg:col-span-12 space-y-4"}>
          <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            {/* Top Workspace Toolbar */}
            <CardHeader className="py-3 px-5 bg-gradient-to-r from-teal-50/60 via-muted/20 to-background border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <Rocket className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Structured Problem Statement Formulation
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground block">
                    14 Architectural Specifications for Academic &amp; Research Challenges
                  </span>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center rounded-lg border border-border/70 bg-card p-0.5 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("tabbed")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                      viewMode === "tabbed"
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    <span>Tabbed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("full")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                      viewMode === "full"
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Full Overview</span>
                  </button>
                </div>

                {/* Dossier Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSourceDossier(!showSourceDossier)}
                  className="h-7 text-xs gap-1"
                  title={showSourceDossier ? "Collapse Left Dossier" : "Expand Left Dossier"}
                >
                  {showSourceDossier ? (
                    <>
                      <PanelLeftClose className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Expanded</span>
                    </>
                  ) : (
                    <>
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Show Dossier</span>
                    </>
                  )}
                </Button>

                <Badge variant={isApproved ? "teal" : "amber"} size="sm" className="font-bold">
                  {isApproved ? "APPROVED" : "DRAFT"}
                </Badge>
              </div>
            </CardHeader>

            {/* Thematic Tabs Navigation Ribbon (In Tabbed Mode) */}
            {viewMode === "tabbed" ? (
              <div className="border-b border-border/70 bg-muted/20 px-3 pt-2 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max pb-2">
                  {tabsList.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-card text-foreground shadow-xs border border-border/80 ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span>{tab.label}</span>
                        {typeof tab.badgeCount === "number" ? (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                              tab.badgeTone === "teal"
                                ? "bg-teal-100 text-teal-800"
                                : tab.badgeTone === "amber"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {tab.badgeCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Tab Body or Full Overview Content */}
            <CardContent className="p-5 space-y-6">
              {viewMode === "tabbed" ? (
                <>
                  {/* Current Active Tab Content */}
                  <div className="space-y-4">
                    {activeTab === "scope" && renderScopeSection()}
                    {activeTab === "analysis" && renderAnalysisSection()}
                    {activeTab === "objectives" && renderObjectivesSection()}
                    {activeTab === "tech" && renderTechSection()}
                    {activeTab === "governance" && renderGovernanceSection()}
                  </div>

                  {/* Tab Navigation Steps Footer */}
                  <div className="pt-4 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      {prevTab ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab(prevTab)}
                          className="gap-1.5 text-xs"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Previous Step
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Step 1 of 5
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isApproved ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleSaveDraft()}
                          disabled={savingDraft || approving || regenerating}
                          className="gap-1.5 text-xs"
                        >
                          {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save Draft
                        </Button>
                      ) : null}

                      {nextTab ? (
                        <Button
                          size="sm"
                          onClick={() => setActiveTab(nextTab)}
                          className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
                        >
                          <span>Next Step</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : !isApproved ? (
                        <Button
                          size="sm"
                          onClick={() => setConfirmApproveOpen(true)}
                          disabled={savingDraft || approving || regenerating || !isReadyForApproval}
                          className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Approve Challenge
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                /* Full Overview Mode: All 5 Thematic Sections Rendered in Multi-Column Grids */
                <div className="space-y-8">
                  {/* 1. Scope & Context */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Target className="h-4 w-4 text-primary" />
                      <h3 className="font-bold text-sm text-foreground">
                        Section 1: Problem Definition, Category &amp; Scope
                      </h3>
                    </div>
                    {renderScopeSection()}
                  </div>

                  {/* 2. Root Cause & Gaps */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Search className="h-4 w-4 text-amber-600" />
                      <h3 className="font-bold text-sm text-foreground">
                        Section 2: Root Cause Analysis &amp; Current Municipal Gaps
                      </h3>
                    </div>
                    {renderAnalysisSection()}
                  </div>

                  {/* 3. Objectives & Outcomes */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Rocket className="h-4 w-4 text-teal-600" />
                      <h3 className="font-bold text-sm text-foreground">
                        Section 3: Key Objectives &amp; Expected Innovation Outcomes
                      </h3>
                    </div>
                    {renderObjectivesSection()}
                  </div>

                  {/* 4. Disciplines & Technology */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Cpu className="h-4 w-4 text-sky-600" />
                      <h3 className="font-bold text-sm text-foreground">
                        Section 4: Multidisciplinary Domains &amp; Technical Capabilities
                      </h3>
                    </div>
                    {renderTechSection()}
                  </div>

                  {/* 5. Benchmarks & Governance */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Scale className="h-4 w-4 text-teal-700" />
                      <h3 className="font-bold text-sm text-foreground">
                        Section 5: Benchmarks, Evaluation Criteria &amp; Governance
                      </h3>
                    </div>
                    {renderGovernanceSection()}
                  </div>

                  {/* Bottom Action Footer for Full Mode */}
                  {!isApproved ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/70">
                      <span className="text-[11px] text-muted-foreground">
                        Last saved: {formatCitizenIssueDateTime(challenge.updated_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleSaveDraft()}
                          disabled={savingDraft || approving || regenerating}
                          className="gap-1.5 text-xs"
                        >
                          {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save Draft
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setConfirmApproveOpen(true)}
                          disabled={savingDraft || approving || regenerating || !isReadyForApproval}
                          className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Approve Challenge
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enlarged Evidence Lightbox Modal */}
      {previewImage ? (
        <Dialog
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title="Grievance Photographic Evidence"
          maxWidth="2xl"
        >
          <div className="flex items-center justify-center p-2">
            <img
              src={previewImage}
              alt="Evidence"
              className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
            />
          </div>
        </Dialog>
      ) : null}

      {/* Confirmation Dialog: Regenerate with AI */}
      {confirmRegenerateOpen ? (
        <Dialog
          open={confirmRegenerateOpen}
          onClose={() => setConfirmRegenerateOpen(false)}
          title="Regenerate Challenge Draft with AI?"
          description="Synthesizes a fresh problem statement from the source issue using Gemini AI."
          maxWidth="md"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                Warning: Manual Edits May Be Overwritten
              </span>
              <p className="leading-relaxed text-amber-900/90">
                Regenerating will re-run the multi-factor Gemini analysis on the source issue and replace the current form fields with a fresh AI draft.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRegenerateOpen(false)}
                disabled={regenerating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void handleRegenerateWithAi();
                }}
                disabled={regenerating}
                className="gap-1.5 bg-primary text-primary-foreground font-semibold"
              >
                {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                Regenerate AI Draft
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {/* Confirmation Dialog: Approve Challenge */}
      {confirmApproveOpen ? (
        <Dialog
          open={confirmApproveOpen}
          onClose={() => setConfirmApproveOpen(false)}
          title="Approve Innovation Challenge?"
          description="Make this problem statement the authoritative CivicFix Innovation Challenge."
          maxWidth="md"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 border border-border/70 rounded-xl bg-muted/20 space-y-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Authoritative Title:
                </span>
                <span className="font-bold text-foreground text-sm block mt-0.5">
                  {title}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {requiredDomains.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-900 border border-teal-200"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 text-teal-950 space-y-1">
              <span className="font-bold block text-xs">Phase 3C Readiness:</span>
              <p className="text-[11px] leading-relaxed text-teal-900">
                Upon approval, this challenge will be locked as the binding operational problem statement and will be queued as eligible for university &amp; research institution matching.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmApproveOpen(false)}
                disabled={approving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void handleApproveChallenge();
                }}
                disabled={approving}
                className="gap-1.5 bg-primary text-primary-foreground font-semibold"
              >
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Confirm &amp; Approve Challenge
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
