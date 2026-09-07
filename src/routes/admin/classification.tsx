import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  User,
  Wrench,
  X,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatCitizenIssueDateTime,
  formatCitizenIssueImageUrl,
  getCitizenIssueStatusLabel,
  type CitizenIssueImageRow,
} from "@/lib/citizen-issues";
import {
  formatOfficerIssuePriority,
  getOfficerIssuePriorityTone,
  getOfficerIssueSeverityLabel,
  getOfficerIssueSeverityTone,
} from "@/lib/officer-issues";
import { supabase } from "@/lib/supabase";
import type { ComplexityFactors, Database } from "@/types/database";

type IssueStatusHistoryItem = Database["public"]["Tables"]["issue_status_history"]["Row"] & {
  changed_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "email"> | null;
};

type IssueRow = Database["public"]["Tables"]["issues"]["Row"] & {
  issue_images?: CitizenIssueImageRow[] | null;
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  issue_ai_analysis?: Array<
    Database["public"]["Tables"]["issue_ai_analysis"]["Row"] & {
      complexity_factors?: ComplexityFactors | null;
      classification_note?: string | null;
    }
  > | null;
  decided_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  issue_status_history?: IssueStatusHistoryItem[] | null;
};

type FilterTabKey =
  | "all"
  | "awaiting"
  | "ai_simple"
  | "ai_complex"
  | "high_complexity"
  | "low_confidence"
  | "overridden";

type SortOption =
  | "attention"
  | "newest"
  | "oldest"
  | "score_desc"
  | "score_asc"
  | "confidence_desc"
  | "confidence_asc";

const FACTOR_DEFINITIONS: Array<{
  key: keyof ComplexityFactors;
  label: string;
  description: string;
  isFavorableForComplex: boolean;
}> = [
  {
    key: "systemic_problem",
    label: "Systemic / Root-Cause Problem",
    description: "Deep structural, environmental, or infrastructural defect rather than an isolated failure.",
    isFavorableForComplex: true,
  },
  {
    key: "recurring_problem",
    label: "Recurring / Chronic Pattern",
    description: "Seasonal or repeated yearly breakdown (e.g. chronic crop loss, recurrent monsoon flooding).",
    isFavorableForComplex: true,
  },
  {
    key: "multi_domain",
    label: "Cross-Disciplinary Needs",
    description: "Requires expertise spanning multiple fields (e.g. Agriculture + Hydrology + Data Science + IoT).",
    isFavorableForComplex: true,
  },
  {
    key: "research_required",
    label: "Scientific / Field Research",
    description: "Requires scientific inquiry, ecological modeling, aquifer analysis, or technical investigation.",
    isFavorableForComplex: true,
  },
  {
    key: "technology_potential",
    label: "IoT & Predictive Technology",
    description: "Benefits from sensor telemetry, AI predictive models, satellite GIS, or digital decision support.",
    isFavorableForComplex: true,
  },
  {
    key: "large_scale_impact",
    label: "Wide-Area / Community Scope",
    description: "Impacts an entire village, farming district, or broad multi-ward civic population.",
    isFavorableForComplex: true,
  },
  {
    key: "multiple_stakeholders",
    label: "Multi-Agency Coordination",
    description: "Requires coordination between citizens, researchers, startups, universities, and municipal bodies.",
    isFavorableForComplex: true,
  },
  {
    key: "existing_municipal_solution",
    label: "Standard Municipal Routine",
    description: "Established standard operating procedure exists for municipal field crews.",
    isFavorableForComplex: false,
  },
];

function getComplexityScale(score: number | null | undefined): {
  label: string;
  badgeBg: string;
  badgeText: string;
  progressColor: string;
  description: string;
} {
  const val = typeof score === "number" ? score : 0;
  if (val <= 30) {
    return {
      label: "Strongly Simple",
      badgeBg: "bg-emerald-500/15 border-emerald-500/30",
      badgeText: "text-emerald-700 dark:text-emerald-400",
      progressColor: "bg-emerald-500",
      description: "Routine localized defect; resolvable by a standard municipal field crew.",
    };
  }
  if (val <= 50) {
    return {
      label: "Likely Simple",
      badgeBg: "bg-sky-500/15 border-sky-500/30",
      badgeText: "text-sky-700 dark:text-sky-400",
      progressColor: "bg-sky-500",
      description: "Moderate civic defect; standard municipal department workflow applicable.",
    };
  }
  if (val <= 65) {
    return {
      label: "Borderline Review",
      badgeBg: "bg-amber-500/15 border-amber-500/30",
      badgeText: "text-amber-700 dark:text-amber-400",
      progressColor: "bg-amber-500",
      description: "Requires close human administrator review to determine operational feasibility.",
    };
  }
  if (val <= 80) {
    return {
      label: "Likely Complex",
      badgeBg: "bg-purple-500/15 border-purple-500/30",
      badgeText: "text-purple-700 dark:text-purple-400",
      progressColor: "bg-purple-500",
      description: "Multi-domain, chronic, or systemic factors require innovation management.",
    };
  }
  return {
    label: "Strongly Complex",
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    badgeText: "text-rose-700 dark:text-rose-400",
    progressColor: "bg-rose-500",
    description: "Deep systemic, research-driven, or predictive challenge requiring specialized pilot.",
  };
}

export function AdminClassificationPage() {
  const { profile } = useAppSession();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTabKey>("awaiting");
  const [sortBy, setSortBy] = useState<SortOption>("attention");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Admin decision state
  const [decisionType, setDecisionType] = useState<"SIMPLE" | "COMPLEX">("SIMPLE");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Load issues with full AI diagnostics and status history
  useEffect(() => {
    let cancelled = false;

    async function loadIssues() {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from("issues")
        .select(`
          *,
          issue_images(id, storage_bucket, storage_path, image_type, created_at),
          reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email),
          decided_by_profile:profiles!issues_classification_decided_by_fkey(id, full_name, email),
          issue_ai_analysis(
            id,
            provider,
            model,
            category_recommendation,
            severity_recommendation,
            priority_recommendation,
            department_recommendation,
            issue_type,
            complexity_score,
            complexity_reasoning,
            classification_note,
            complexity_factors,
            required_expertise,
            confidence_score,
            classification_confidence,
            structured_response,
            created_at
          ),
          issue_status_history(
            id,
            old_status,
            new_status,
            notes,
            created_at,
            changed_by_profile:profiles!issue_status_history_changed_by_profile_id_fkey(full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (fetchErr) {
        if (import.meta.env.DEV) console.error("Failed to load classification queue", fetchErr);
        setError("Unable to load the classification queue.");
        setLoading(false);
        return;
      }

      const loadedIssues = (data ?? []) as IssueRow[];
      setIssues(loadedIssues);

      // Auto-select first issue if none selected
      setSelectedIssueId((prev) => {
        if (prev && loadedIssues.some((i) => i.id === prev)) {
          return prev;
        }
        return loadedIssues.length > 0 ? loadedIssues[0].id : null;
      });

      setLoading(false);
    }

    void loadIssues();

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  // Derive the currently selected issue
  const selectedIssue = useMemo(() => {
    return issues.find((i) => i.id === selectedIssueId) ?? null;
  }, [issues, selectedIssueId]);

  function handleSelectIssue(issue: IssueRow) {
    setSelectedIssueId(issue.id);
    const defaultDecision = issue.final_issue_type || issue.ai_issue_type || "SIMPLE";
    setDecisionType(defaultDecision);
    setOverrideReason(issue.classification_override_reason || "");
    setActionSuccess(null);
    setActionError(null);
  }

  // Real-time KPI summary counts
  const stats = useMemo(() => {
    let awaitingReview = 0;
    let aiSimple = 0;
    let aiComplex = 0;
    let overrides = 0;

    for (const issue of issues) {
      const isAwaiting =
        issue.status === "AWAITING_ADMIN_CLASSIFICATION" ||
        (issue.status === "AI_ANALYZED" && !issue.final_issue_type);
      if (isAwaiting) awaitingReview += 1;

      if (issue.ai_issue_type === "SIMPLE") aiSimple += 1;
      else if (issue.ai_issue_type === "COMPLEX") aiComplex += 1;

      const hasOverride =
        (issue.classification_override_reason &&
          issue.classification_override_reason.trim().length > 0) ||
        (issue.final_issue_type &&
          issue.ai_issue_type &&
          issue.final_issue_type !== issue.ai_issue_type);
      if (hasOverride) overrides += 1;
    }

    return {
      awaitingReview,
      aiSimple,
      aiComplex,
      overrides,
      total: issues.length,
    };
  }, [issues]);

  // Filtered and sorted issues queue
  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();

    return issues
      .filter((issue) => {
        const isAwaiting =
          issue.status === "AWAITING_ADMIN_CLASSIFICATION" ||
          (issue.status === "AI_ANALYZED" && !issue.final_issue_type);
        const score = issue.ai_complexity_score ?? 0;
        const confidence = issue.ai_classification_confidence ?? 1;
        const isOverridden =
          Boolean(issue.classification_override_reason?.trim()) ||
          (Boolean(issue.final_issue_type) &&
            Boolean(issue.ai_issue_type) &&
            issue.final_issue_type !== issue.ai_issue_type);

        if (filterTab === "awaiting" && !isAwaiting) return false;
        if (filterTab === "ai_simple" && issue.ai_issue_type !== "SIMPLE") return false;
        if (filterTab === "ai_complex" && issue.ai_issue_type !== "COMPLEX") return false;
        if (filterTab === "high_complexity" && score < 66) return false;
        if (filterTab === "low_confidence" && confidence >= 0.7) return false;
        if (filterTab === "overridden" && !isOverridden) return false;

        if (q) {
          const matchId = issue.id.toLowerCase().includes(q);
          const matchTitle = issue.title.toLowerCase().includes(q);
          const matchDesc = issue.description.toLowerCase().includes(q);
          const matchCategory = (issue.category || "").toLowerCase().includes(q);
          const matchLocation = `${issue.location_text || ""} ${issue.address_text || ""}`
            .toLowerCase()
            .includes(q);

          if (!matchId && !matchTitle && !matchDesc && !matchCategory && !matchLocation) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "attention") {
          const aAwaiting =
            a.status === "AWAITING_ADMIN_CLASSIFICATION" ||
            (a.status === "AI_ANALYZED" && !a.final_issue_type);
          const bAwaiting =
            b.status === "AWAITING_ADMIN_CLASSIFICATION" ||
            (b.status === "AI_ANALYZED" && !b.final_issue_type);
          if (aAwaiting !== bAwaiting) return aAwaiting ? -1 : 1;

          const aLowConf = (a.ai_classification_confidence ?? 1) < 0.7;
          const bLowConf = (b.ai_classification_confidence ?? 1) < 0.7;
          if (aLowConf !== bLowConf) return aLowConf ? -1 : 1;

          const aScore = a.ai_complexity_score ?? 0;
          const bScore = b.ai_complexity_score ?? 0;
          if (aScore !== bScore) return bScore - aScore;

          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "score_desc") {
          return (b.ai_complexity_score ?? 0) - (a.ai_complexity_score ?? 0);
        }
        if (sortBy === "score_asc") {
          return (a.ai_complexity_score ?? 0) - (b.ai_complexity_score ?? 0);
        }
        if (sortBy === "confidence_desc") {
          return (b.ai_classification_confidence ?? 0) - (a.ai_classification_confidence ?? 0);
        }
        if (sortBy === "confidence_asc") {
          return (a.ai_classification_confidence ?? 0) - (b.ai_classification_confidence ?? 0);
        }

        return 0;
      });
  }, [issues, filterTab, search, sortBy]);

  // Selected issue AI analysis diagnostics
  const latestAi = selectedIssue?.issue_ai_analysis?.[0];
  const aiType = selectedIssue?.ai_issue_type || latestAi?.issue_type || "SIMPLE";
  const complexityScore = selectedIssue?.ai_complexity_score ?? latestAi?.complexity_score ?? 20;
  const confidenceScore =
    selectedIssue?.ai_classification_confidence ??
    latestAi?.classification_confidence ??
    latestAi?.confidence_score ??
    0.85;
  const complexityFactors: ComplexityFactors = useMemo(() => {
    return (
      selectedIssue?.ai_complexity_factors ||
      latestAi?.complexity_factors ||
      (latestAi?.structured_response as Record<string, unknown> | undefined)?.complexity_factors ||
      {}
    );
  }, [selectedIssue, latestAi]);

  const classificationNote: string | null =
    (typeof latestAi?.classification_note === "string" ? latestAi.classification_note : null) ||
    (typeof (latestAi?.structured_response as Record<string, unknown> | undefined)?.classification_note === "string"
      ? ((latestAi?.structured_response as Record<string, unknown>).classification_note as string)
      : null);

  const rootProblemSummary: string | null = useMemo(() => {
    const raw = (latestAi?.structured_response as Record<string, unknown> | undefined)?.root_problem_summary;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  }, [latestAi]);

  const operationalResolvability = useMemo(() => {
    const sr = latestAi?.structured_response as Record<string, unknown> | undefined;
    const op = sr?.operational_resolvability as Record<string, unknown> | undefined;
    if (!op && typeof sr?.operationally_resolvable !== "boolean") return null;
    return {
      isResolvable: typeof op?.is_operationally_resolvable === "boolean" ? op.is_operationally_resolvable : Boolean(sr?.operationally_resolvable),
      knownSop: typeof op?.known_sop_available === "boolean" ? op.known_sop_available : Boolean(sr?.existing_solution_available),
      notes: typeof op?.operational_assessment_notes === "string" ? op.operational_assessment_notes : null,
    };
  }, [latestAi]);

  const scoreScale = getComplexityScale(complexityScore);

  const isOverride = useMemo(() => {
    if (!selectedIssue) return false;
    const baseType = selectedIssue.ai_issue_type || latestAi?.issue_type || "SIMPLE";
    return decisionType !== baseType;
  }, [decisionType, selectedIssue, latestAi]);

  const canSubmitDecision = useMemo(() => {
    if (!selectedIssue || submitting) return false;
    if (isOverride && overrideReason.trim().length < 10) return false;
    return true;
  }, [selectedIssue, submitting, isOverride, overrideReason]);

  async function handleConfirmClassification() {
    if (!selectedIssue || !profile?.id) return;

    if (isOverride && overrideReason.trim().length < 10) {
      setActionError("An override justification of at least 10 characters is required.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const targetStatus = decisionType === "SIMPLE" ? "CLASSIFIED_SIMPLE" : "CLASSIFIED_COMPLEX";
    const nowIso = new Date().toISOString();

    try {
      // 1. Update issue record with authoritative decision
      const { error: updateError } = await supabase
        .from("issues")
        .update({
          final_issue_type: decisionType,
          classification_decided_by: profile.id,
          classification_decided_at: nowIso,
          classification_override_reason: isOverride ? overrideReason.trim() : null,
          status: targetStatus,
          updated_at: nowIso,
        })
        .eq("id", selectedIssue.id);

      if (updateError) throw updateError;

      // 2. Insert audit trail entry in issue_status_history
      const auditNote = isOverride
        ? `Admin Authoritative Override: Classified as ${decisionType} (AI Recommended ${aiType}). Reason: ${overrideReason.trim()}`
        : `Admin Authoritative Routing: Approved ${decisionType} classification following AI recommendation.`;

      const { error: historyError } = await supabase.from("issue_status_history").insert({
        issue_id: selectedIssue.id,
        old_status: selectedIssue.status,
        new_status: targetStatus,
        changed_by_profile_id: profile.id,
        notes: auditNote,
      });

      if (historyError) {
        console.warn("Could not insert status history audit note:", historyError);
      }

      // 3. Dispatch targeted notifications to responsible stakeholders
      if (decisionType === "COMPLEX") {
        const { data: managers } = await supabase
          .from("profiles")
          .select("id, role:roles!inner(code)")
          .eq("role.code", "INNOVATION_MANAGER")
          .eq("is_active", true);

        if (managers && managers.length > 0) {
          const notificationsPayload = managers.map((mgr) => ({
            recipient_profile_id: mgr.id,
            notification_type: "ASSIGNMENT" as const,
            title: "New Complex Challenge Routed",
            message: `Admin classified complex challenge "${selectedIssue.title}" for innovation management.`,
            related_issue_id: selectedIssue.id,
            is_read: false,
          }));

          await supabase.from("notifications").insert(notificationsPayload);
        }
      } else {
        const { data: officers } = await supabase
          .from("profiles")
          .select("id, role:roles!inner(code)")
          .eq("role.code", "MUNICIPAL_OFFICER")
          .eq("is_active", true);

        if (officers && officers.length > 0) {
          const notificationsPayload = officers.slice(0, 5).map((off) => ({
            recipient_profile_id: off.id,
            notification_type: "STATUS_CHANGE" as const,
            title: "Issue Verified for Municipal Triage",
            message: `Admin routed simple grievance "${selectedIssue.title}" to municipal triage.`,
            related_issue_id: selectedIssue.id,
            is_read: false,
          }));

          await supabase.from("notifications").insert(notificationsPayload);
        }
      }

      setActionSuccess(`Issue successfully classified as ${decisionType} and routed!`);
      setConfirmDialogOpen(false);
      setRefreshNonce((prev) => prev + 1);

      // Keep local state in sync
      setSelectedIssueId(selectedIssue.id);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Classification failed:", err);
      setActionError(err instanceof Error ? err.message : "Failed to classify issue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classification & Routing"
        description="Review AI recommendations and make the final routing decision for every newly analyzed civic issue."
        backHref="/app/admin"
        backLabel="Admin Console"
        tag="AI-Assisted Governance Center"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshNonce((v) => v + 1)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="p-4 bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </Card>
      ) : null}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Awaiting Review</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.awaitingReview}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Need Admin authoritative decision</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>AI Rec: Simple</span>
              <Wrench className="h-3.5 w-3.5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.aiSimple}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Routine municipal maintenance</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>AI Rec: Complex</span>
              <Rocket className="h-3.5 w-3.5 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.aiComplex}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Systemic societal challenges</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Admin Overrides</span>
              <ShieldAlert className="h-3.5 w-3.5 text-sky-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
              {stats.overrides}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Admin-supervised adjustments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterTab("awaiting")}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterTab === "awaiting"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Awaiting Review ({stats.awaitingReview})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterTab === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ai_simple")}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterTab === "ai_simple"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Simple ({stats.aiSimple})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ai_complex")}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterTab === "ai_complex"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Complex ({stats.aiComplex})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("high_complexity")}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterTab === "high_complexity"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              High Complexity (≥66)
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("low_confidence")}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterTab === "low_confidence"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Low Confidence (&lt;70%)
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("overridden")}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterTab === "overridden"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Overridden ({stats.overrides})
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, title, location, category..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs py-1.5 px-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="attention">Sort: Priority Attention</option>
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="score_desc">Complexity: High to Low</option>
                <option value="score_asc">Complexity: Low to High</option>
                <option value="confidence_desc">Confidence: High to Low</option>
                <option value="confidence_asc">Confidence: Low to High</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Governance Workspace: Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Issues Queue / Table */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="overflow-hidden border">
            <CardHeader className="py-3 px-4 bg-muted/40 border-b flex flex-row items-center justify-between">
              <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Classification Queue</span>
                <Badge variant="outline" size="sm" className="text-[10px]">
                  {filteredIssues.length}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">Select an issue to govern</span>
            </CardHeader>

            <div className="divide-y divide-border max-h-[700px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Loading classification queue...</span>
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    title="No grievances match your filter"
                    description="Try selecting a different filter tab or clearing your search term."
                  />
                </div>
              ) : (
                filteredIssues.map((issue) => {
                  const isSelected = selectedIssue?.id === issue.id;
                  const itemAi = issue.issue_ai_analysis?.[0];
                  const itemAiType = issue.ai_issue_type || itemAi?.issue_type || "SIMPLE";
                  const itemScore = issue.ai_complexity_score ?? itemAi?.complexity_score ?? 20;
                  const itemConfidence = Math.round(
                    (issue.ai_classification_confidence ?? itemAi?.confidence_score ?? 0.85) * 100,
                  );
                  const itemScale = getComplexityScale(itemScore);
                  const isAwaiting =
                    issue.status === "AWAITING_ADMIN_CLASSIFICATION" ||
                    (issue.status === "AI_ANALYZED" && !issue.final_issue_type);
                  const isOverridden =
                    Boolean(issue.classification_override_reason?.trim()) ||
                    (Boolean(issue.final_issue_type) &&
                      Boolean(issue.ai_issue_type) &&
                      issue.final_issue_type !== issue.ai_issue_type);

                  return (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => handleSelectIssue(issue)}
                      className={`w-full text-left p-3.5 transition-all flex flex-col gap-2 relative ${
                        isSelected
                          ? "bg-primary/5 border-l-4 border-l-primary shadow-sm"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Top row: ID, Status, AI Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                            #{issue.id.slice(0, 8)}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground truncate">
                            {issue.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isAwaiting ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="h-2.5 w-2.5" /> Awaiting
                            </span>
                          ) : isOverridden ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                              Override
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              Decided
                            </span>
                          )}

                          <Badge
                            variant={itemAiType === "COMPLEX" ? "danger" : "success"}
                            size="sm"
                            className="text-[10px] uppercase font-bold"
                          >
                            AI {itemAiType}
                          </Badge>
                        </div>
                      </div>

                      {/* Snippet / Description */}
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {issue.description}
                      </p>

                      {/* Footer row: Metrics & Badges */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{issue.category || "General"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="font-bold text-foreground">{itemScore}</span>
                            <span className="text-[9px]">/100</span>
                            <span className={`text-[10px] ml-0.5 ${itemScale.badgeText}`}>
                              ({itemScale.label})
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>Conf: {itemConfidence}%</span>
                          <span>•</span>
                          <span>{formatCitizenIssueDateTime(issue.created_at)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Active Issue Review & Governance Center */}
        <div className="lg:col-span-7 space-y-6">
          {!selectedIssue ? (
            <Card className="p-12 text-center">
              <EmptyState
                title="Select a civic complaint"
                description="Choose an issue from the queue on the left to inspect citizen details, analyze AI multi-factor reasoning, and issue an authoritative routing decision."
              />
            </Card>
          ) : (
            <>
              {/* Action Banners */}
              {actionSuccess ? (
                <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionSuccess(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              {actionError ? (
                <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionError(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              {/* 1. CITIZEN PROBLEM INSPECTION CARD */}
              <Card>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          ID: {selectedIssue.id}
                        </span>
                        <Badge
                          variant={
                            selectedIssue.status === "AWAITING_ADMIN_CLASSIFICATION"
                              ? "warning"
                              : selectedIssue.final_issue_type === "COMPLEX"
                              ? "danger"
                              : "success"
                          }
                          size="sm"
                        >
                          {getCitizenIssueStatusLabel(selectedIssue.status)}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground mt-1">
                        {selectedIssue.title}
                      </CardTitle>
                    </div>

                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <div>Submitted {formatCitizenIssueDateTime(selectedIssue.created_at)}</div>
                      {selectedIssue.reporter_profile ? (
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <User className="h-3 w-3" />
                          <span>{selectedIssue.reporter_profile.full_name || "Citizen"}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4 text-xs">
                  {/* Complaint Description */}
                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                      Original Citizen Problem Statement
                    </span>
                    <div className="p-3.5 rounded-xl bg-muted/40 border text-foreground leading-relaxed text-xs">
                      {selectedIssue.description}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2.5 rounded-lg border bg-card">
                      <span className="text-[10px] text-muted-foreground block">Category</span>
                      <span className="font-semibold text-foreground">{selectedIssue.category || "General"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card">
                      <span className="text-[10px] text-muted-foreground block">Physical Severity</span>
                      <Badge variant={getOfficerIssueSeverityTone(selectedIssue.severity)} size="sm" className="mt-0.5">
                        {getOfficerIssueSeverityLabel(selectedIssue.severity)}
                      </Badge>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card">
                      <span className="text-[10px] text-muted-foreground block">Dispatch Priority</span>
                      <Badge variant={getOfficerIssuePriorityTone(selectedIssue.priority)} size="sm" className="mt-0.5">
                        {formatOfficerIssuePriority(selectedIssue.priority)}
                      </Badge>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card">
                      <span className="text-[10px] text-muted-foreground block">Location</span>
                      <span className="font-medium text-foreground truncate block" title={selectedIssue.address_text || selectedIssue.location_text || ""}>
                        {selectedIssue.address_text || selectedIssue.location_text || "Geo Location"}
                      </span>
                    </div>
                  </div>

                  {/* Photographic Evidence */}
                  {selectedIssue.issue_images && selectedIssue.issue_images.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                        Attached Photographic Evidence ({selectedIssue.issue_images.length})
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedIssue.issue_images.map((img) => {
                          const url = formatCitizenIssueImageUrl(img);
                          if (!url) return null;
                          return (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => setPreviewImage(url)}
                              className="group relative h-20 w-28 overflow-hidden rounded-lg border border-border shadow-sm hover:ring-2 hover:ring-primary transition-all"
                            >
                              <img
                                src={url}
                                alt="Complaint evidence"
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="h-4 w-4" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* 2. AI CLASSIFICATION ADVISORY CARD */}
              <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
                <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/15 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                        AI Advisory Recommendation
                      </CardTitle>
                      <p className="text-[10px] text-muted-foreground">
                        Gemini 16-Factor Multi-Dimensional Diagnostic
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={aiType === "COMPLEX" ? "danger" : "success"}
                      size="default"
                      className="font-bold text-xs uppercase px-2.5 py-0.5"
                    >
                      {aiType}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4 text-xs">
                  {/* Score & Confidence Metric Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border bg-muted/20">
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Complexity Score
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-black text-foreground">{complexityScore}</span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${scoreScale.badgeBg} ${scoreScale.badgeText}`}>
                        {scoreScale.label}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                        AI Confidence
                      </div>
                      <div className="text-2xl font-black text-foreground mt-0.5">
                        {Math.round(confidenceScore * 100)}%
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {confidenceScore >= 0.85
                          ? "High semantic certainty"
                          : confidenceScore >= 0.7
                          ? "Moderate certainty"
                          : "Low certainty (review carefully)"}
                      </p>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Suggested Department
                      </div>
                      <div className="font-bold text-foreground text-sm mt-0.5 truncate">
                        {latestAi?.department_recommendation || "Municipal Operations"}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Primary municipal operational unit
                      </p>
                    </div>
                  </div>

                  {/* Borderline Case Advisory Note */}
                  {classificationNote ? (
                    <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-xs">Borderline Classification Note:</span>
                        <p className="text-[11px] leading-relaxed mt-0.5">{classificationNote}</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Two-Stage Assessment: Underlying Root Cause & Operational Resolvability */}
                  {rootProblemSummary || operationalResolvability ? (
                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5" /> Stage A: Operational Resolvability Assessment
                        </span>
                        {operationalResolvability && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              operationalResolvability.isResolvable
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                            }`}
                          >
                            {operationalResolvability.isResolvable
                              ? "Routine SOP Resolvable"
                              : "SOP Insufficient / Innovation Needed"}
                          </span>
                        )}
                      </div>

                      {rootProblemSummary && (
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            Identified Underlying Root Problem:
                          </span>
                          <p className="text-xs font-medium text-foreground mt-0.5 leading-snug">
                            {rootProblemSummary}
                          </p>
                        </div>
                      )}

                      {operationalResolvability?.notes && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                          {operationalResolvability.notes}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* AI Reasoning Text */}
                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> AI Diagnostic Reasoning
                    </span>
                    <p className="p-3 rounded-lg bg-card border text-foreground leading-relaxed text-xs">
                      {latestAi?.complexity_reasoning ||
                        selectedIssue.ai_complexity_reasoning ||
                        "Standard civic infrastructure maintenance resolvable through routine departmental procedures."}
                    </p>
                  </div>

                  {/* 8-Factor Structural Checklist */}
                  <div className="space-y-2 pt-1">
                    <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" /> Multi-Factor Assessment Signals
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        8 Systemic & Operational Indicators
                      </span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {FACTOR_DEFINITIONS.map((factor) => {
                        const isPresent = Boolean(complexityFactors[factor.key]);
                        // If factor indicates complexity and is present -> highlight purple
                        // If factor is routine fix and is present -> highlight emerald
                        const isComplexSignal = factor.isFavorableForComplex
                          ? isPresent
                          : !isPresent;

                        return (
                          <div
                            key={factor.key}
                            className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                              isComplexSignal
                                ? "border-purple-200 bg-purple-50/60 dark:bg-purple-950/20 dark:border-purple-900/40"
                                : "border-border bg-card"
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                                isPresent
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isPresent ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </div>

                            <div className="min-w-0">
                              <div className="font-semibold text-foreground text-[11px] leading-tight">
                                {factor.label}
                              </div>
                              <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                {factor.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Required Expertise Badges */}
                  {latestAi?.required_expertise && latestAi.required_expertise.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                        Required Multi-Domain Expertise
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {latestAi.required_expertise.map((exp) => (
                          <span
                            key={exp}
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          >
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* 3. FINAL ADMINISTRATIVE CLASSIFICATION & ROUTING WORKSPACE */}
              <Card className="border-2 border-amber-500/40 shadow-md">
                <CardHeader className="py-3.5 px-4 bg-amber-500/10 border-b border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                    <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span>Final Administrative Classification & Routing</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    AI recommendation is strictly advisory. The final classification and operational routing is determined solely by the authorized Administrator.
                  </p>
                </CardHeader>

                <CardContent className="space-y-5 pt-4 text-xs">
                  {/* Decision Radio Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* SIMPLE Track Card */}
                    <button
                      type="button"
                      onClick={() => setDecisionType("SIMPLE")}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                        decisionType === "SIMPLE"
                          ? "border-emerald-600 bg-emerald-500/10 shadow-sm"
                          : "border-border hover:border-muted-foreground/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-foreground flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-emerald-600" />
                          SIMPLE
                        </span>
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            decisionType === "SIMPLE"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {decisionType === "SIMPLE" && <Check className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Routine civic maintenance resolvable by an existing municipal department and field crew.
                      </p>
                    </button>

                    {/* COMPLEX Track Card */}
                    <button
                      type="button"
                      onClick={() => setDecisionType("COMPLEX")}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                        decisionType === "COMPLEX"
                          ? "border-purple-600 bg-purple-500/10 shadow-sm"
                          : "border-border hover:border-muted-foreground/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-foreground flex items-center gap-2">
                          <Rocket className="h-4 w-4 text-purple-600" />
                          COMPLEX
                        </span>
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            decisionType === "COMPLEX"
                              ? "border-purple-600 bg-purple-600 text-white"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {decisionType === "COMPLEX" && <Check className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Systemic, multi-domain, research, or sensor/data challenge requiring innovation intervention.
                      </p>
                    </button>
                  </div>

                  {/* Dynamic Decision Preview */}
                  <div className="p-3.5 rounded-xl border bg-muted/30 flex items-start gap-3">
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs text-foreground">
                        Next Destination: {decisionType === "SIMPLE" ? "Municipal Officer Triage Queue" : "Innovation Manager Command Center"}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {decisionType === "SIMPLE"
                          ? "This complaint will be routed to the Municipal Officer for department assignment, field repair dispatch, and resolution verification."
                          : "This complaint will be routed to the Innovation Manager to formulate strategic research challenges, engage academic/startup pilots, and oversee innovative solutions."}
                      </p>
                    </div>
                  </div>

                  {/* Override Warning & Required Justification */}
                  {isOverride ? (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-500/10 space-y-2.5 animate-in fade-in-50">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Administrative Override Detected (AI Recommended {aiType})</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        You are departing from the AI recommendation. Please provide a clear audit justification for this governance decision.
                      </p>

                      <div className="space-y-1">
                        <label className="font-semibold text-foreground text-[11px] block">
                          Override Justification <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="e.g. Existing municipal agricultural extension program has established workflow to resolve this localized issue without a new innovation project..."
                        />
                        {overrideReason.trim().length > 0 && overrideReason.trim().length < 10 ? (
                          <span className="text-[10px] text-rose-600 block">
                            Justification must be at least 10 characters ({overrideReason.trim().length}/10).
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {/* Current Audit Record (if previously decided) */}
                  {selectedIssue.final_issue_type ? (
                    <div className="p-3 rounded-lg border bg-muted/20 text-[11px] space-y-1">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Current Active Decision: {selectedIssue.final_issue_type}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {selectedIssue.classification_decided_at
                            ? formatCitizenIssueDateTime(selectedIssue.classification_decided_at)
                            : ""}
                        </span>
                      </div>
                      {selectedIssue.decided_by_profile ? (
                        <div className="text-muted-foreground">
                          Decided by: {selectedIssue.decided_by_profile.full_name || selectedIssue.decided_by_profile.email}
                        </div>
                      ) : null}
                      {selectedIssue.classification_override_reason ? (
                        <div className="text-amber-800 dark:text-amber-300 italic pt-0.5">
                          Override Note: {selectedIssue.classification_override_reason}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => setConfirmDialogOpen(true)}
                      disabled={!canSubmitDecision}
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Confirm & Route ({decisionType})</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 4. AUDIT TIMELINE (GOVERNANCE HISTORY) */}
              {selectedIssue.issue_status_history && selectedIssue.issue_status_history.length > 0 ? (
                <Card>
                  <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Governance Audit Trail</span>
                    </CardTitle>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedIssue.issue_status_history.length} lifecycle transitions
                    </span>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3 px-4">
                    <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {selectedIssue.issue_status_history.map((entry) => (
                        <div key={entry.id} className="relative text-xs space-y-0.5">
                          <div className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">
                              {getCitizenIssueStatusLabel(entry.new_status)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatCitizenIssueDateTime(entry.created_at)}
                            </span>
                          </div>
                          {entry.notes ? (
                            <p className="text-[11px] text-muted-foreground">{entry.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Enlarged Evidence Lightbox Modal */}
      {previewImage ? (
        <Dialog
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title="Evidence Preview"
          maxWidth="2xl"
        >
          <div className="flex items-center justify-center p-2">
            <img
              src={previewImage}
              alt="Enlarged Evidence"
              className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
            />
          </div>
        </Dialog>
      ) : null}

      {/* Confirmation & Routing Confirmation Modal */}
      {confirmDialogOpen && selectedIssue ? (
        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          title="Confirm Authoritative Classification"
          description="Confirm the final administrative routing decision for this civic grievance."
          maxWidth="md"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="font-semibold text-foreground">{selectedIssue.title}</p>
              <p className="text-muted-foreground font-mono text-[11px]">ID: {selectedIssue.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                  AI Recommendation
                </span>
                <Badge variant={aiType === "COMPLEX" ? "danger" : "success"} size="sm" className="mt-1">
                  {aiType} ({complexityScore}/100)
                </Badge>
              </div>
              <div className="p-2.5 border rounded-lg bg-primary/5">
                <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                  Admin Final Decision
                </span>
                <Badge variant={decisionType === "COMPLEX" ? "danger" : "success"} size="sm" className="mt-1">
                  {decisionType}
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Target Operational Route
              </span>
              <span className="font-semibold text-foreground text-xs mt-0.5 block">
                {decisionType === "SIMPLE" ? "Municipal Officer Triage Queue" : "Innovation Manager Command Center"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {decisionType === "SIMPLE"
                  ? "Assigned to the municipal workflow for department assignment and routine worker dispatch."
                  : "Assigned to the innovation pipeline for multi-disciplinary challenge formulation and pilot testing."}
              </p>
            </div>

            {isOverride ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-bold block text-xs">Administrative Override Justification:</span>
                <p className="text-[11px] italic leading-relaxed">{overrideReason.trim()}</p>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void handleConfirmClassification();
                }}
                disabled={submitting || (isOverride && overrideReason.trim().length < 10)}
                className="gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Confirm & Route
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
