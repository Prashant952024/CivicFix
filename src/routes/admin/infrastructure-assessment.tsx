import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Compass,
  Database as DatabaseIcon,
  FileSpreadsheet,
  FileText,
  Globe,
  HelpCircle,
  History,
  Info,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
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
} from "@/lib/citizen-issues";
import {
  assignIssueDistrict,
  generateAndSaveInfrastructureAssessment,
  getLatestInfrastructureAssessment,
  listInfrastructureAssessmentsForIssue,
  type InfrastructureAssessmentRecord,
} from "@/lib/infrastructure-assessment";
import {
  listCanonicalDistricts,
  type CanonicalDistrict,
} from "@/lib/infrastructure-context";
import {
  getLatestInfrastructureDecisionForIssue,
  recordInfrastructureDecision,
  mapOutcomeToTargetStatus,
  type InfrastructureDecisionOutcome,
  type InfrastructureDecisionRecord,
} from "@/lib/infrastructure-decision";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type {
  AccessibilityContext,
  DemographicContext,
  DepartmentBudgetContext,
  GeographyContext,
  HistoricalProjectContext,
  HistoricalProjectsAggregateContext,
  InfrastructureAssetContext,
  SocioeconomicGapContext,
} from "@/types/infrastructure-context";

type IssueRecord = Database["public"]["Tables"]["issues"]["Row"] & {
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  decided_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  issue_images?: Array<{
    id: string;
    storage_bucket: string;
    storage_path: string;
    image_type: string;
    created_at: string;
  }> | null;
};

type AuthorProfile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email">;

export function AdminInfrastructureAssessmentReviewPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const { profile } = useAppSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [issue, setIssue] = useState<IssueRecord | null>(null);
  const [allAssessments, setAllAssessments] = useState<InfrastructureAssessmentRecord[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);

  // Decision State
  const [decision, setDecision] = useState<InfrastructureDecisionRecord | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<InfrastructureDecisionOutcome>("PASSED");
  const [decisionReason, setDecisionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionConfirmOpen, setDecisionConfirmOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // District Context Resolution State
  const [districts, setDistricts] = useState<CanonicalDistrict[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [generatingSnapshot, setGeneratingSnapshot] = useState(false);

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    d1: false,
    d2: false,
    d3: false,
    d4: false,
    d5: false,
    d6: false,
    d7: false,
  });

  function toggleSection(key: string) {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Load Issue, Assessment snapshot, existing Decision, and Reference Data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!issueId) {
        setError("Missing required Issue ID parameter.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Issue record
        const { data: issueData, error: issueError } = await supabase
          .from("issues")
          .select(`
            *,
            reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email),
            decided_by_profile:profiles!issues_classification_decided_by_fkey(id, full_name, email),
            issue_images(id, storage_bucket, storage_path, image_type, created_at)
          `)
          .eq("id", issueId.trim())
          .maybeSingle();

        if (issueError) throw issueError;
        if (!issueData) {
          if (!cancelled) {
            setError(`Issue with ID "${issueId}" was not found.`);
            setLoading(false);
          }
          return;
        }

        if (cancelled) return;
        setIssue(issueData as IssueRecord);
        if (issueData.district_id) setSelectedDistrictId(issueData.district_id);
        if (issueData.department_id) setSelectedDepartmentId(issueData.department_id);

        // 2. Fetch all assessments for this issue
        const assessments = await listInfrastructureAssessmentsForIssue(issueId.trim(), supabase);
        if (cancelled) return;

        setAllAssessments(assessments);

        // Default to latest version, or first in list
        const active = assessments.find((a) => a.is_latest) || assessments[0] || null;
        if (active) {
          setSelectedVersion(active.assessment_version);

          // If author exists, fetch profile
          if (active.generated_by) {
            const { data: profData } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", active.generated_by)
              .maybeSingle();

            if (!cancelled && profData) {
              setAuthorProfile(profData);
            }
          } else {
            setAuthorProfile(null);
          }
        }

        // 3. Fetch existing decision if present
        try {
          const latestDec = await getLatestInfrastructureDecisionForIssue(issueId.trim(), supabase);
          if (!cancelled) {
            setDecision(latestDec);
          }
        } catch {
          // No prior decision
          if (!cancelled) setDecision(null);
        }

        // 4. Fetch canonical districts & departments for context resolution
        try {
          const [loadedDistricts, deptsResult] = await Promise.all([
            listCanonicalDistricts(supabase),
            supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
          ]);
          if (!cancelled) {
            setDistricts(loadedDistricts);
            setDepartments((deptsResult.data ?? []) as Array<{ id: string; name: string }>);
          }
        } catch (refErr) {
          if (import.meta.env.DEV) console.warn("Failed to load reference districts/departments:", refErr);
        }
      } catch (err) {
        if (!cancelled) {
          if (import.meta.env.DEV) console.error("Failed to load infrastructure assessment dossier:", err);
          setError(err instanceof Error ? err.message : "Failed to load infrastructure assessment dossier.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [issueId, refreshNonce]);

  async function handleConfirmDecision() {
    if (!issue || !profile?.id || !currentAssessment) return;
    if (decisionReason.trim().length < 10) {
      setActionError("A decision justification of at least 10 characters is required.");
      return;
    }

    setSubmittingDecision(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const createdRecord = await recordInfrastructureDecision(
        {
          issueId: issue.id,
          outcome: decisionOutcome,
          reason: decisionReason.trim(),
          adminProfileId: profile.id,
          assessmentId: currentAssessment.id,
        },
        supabase
      );

      setDecision(createdRecord);
      setIssue((prev) =>
        prev
          ? {
              ...prev,
              status: mapOutcomeToTargetStatus(decisionOutcome),
              updated_at: new Date().toISOString(),
            }
          : prev
      );

      setActionSuccess(
        decisionOutcome === "PASSED"
          ? "Infrastructure project passed by Admin."
          : "Infrastructure project was not passed by Admin."
      );
      setDecisionConfirmOpen(false);
      setDecisionReason("");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to record infrastructure decision:", err);
      setActionError(
        err instanceof Error ? err.message : "Failed to record infrastructure decision."
      );
    } finally {
      setSubmittingDecision(false);
    }
  }

  // Handle district & department context saving + snapshot generation
  async function handleSaveDistrictAndGenerate() {
    if (!issue || !selectedDistrictId) {
      setActionError("Please select a canonical district.");
      return;
    }

    setGeneratingSnapshot(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // 1. Assign district (and department if selected)
      const method =
        issue.district_id === selectedDistrictId && issue.district_resolution_method
          ? issue.district_resolution_method
          : "ADMIN_MANUAL";

      await assignIssueDistrict(
        {
          issueId: issue.id,
          districtId: selectedDistrictId,
          method,
          departmentId: selectedDepartmentId || undefined,
        },
        supabase
      );

      // 2. Generate and persist baseline D1-D7 assessment snapshot
      const newAssessment = await generateAndSaveInfrastructureAssessment(
        {
          issueId: issue.id,
          generatedByProfileId: profile?.id ?? null,
        },
        supabase
      );

      setActionSuccess(
        `Canonical district successfully assigned and Infrastructure Assessment snapshot v${newAssessment.assessment_version} generated (Data Completeness: ${newAssessment.data_completeness_score}%).`
      );
      setRefreshNonce((prev) => prev + 1);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to generate infrastructure assessment snapshot:", err);
      setActionError(
        err instanceof Error ? err.message : "Failed to generate infrastructure assessment snapshot."
      );
    } finally {
      setGeneratingSnapshot(false);
    }
  }

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return districts;
    const q = districtSearch.toLowerCase().trim();
    const matches = districts.filter(
      (d) =>
        d.district_name.toLowerCase().includes(q) ||
        d.state_name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
    );
    if (selectedDistrictId && !matches.some((d) => d.id === selectedDistrictId)) {
      const selected = districts.find((d) => d.id === selectedDistrictId);
      if (selected) {
        return [selected, ...matches];
      }
    }
    return matches;
  }, [districts, districtSearch, selectedDistrictId]);

  // Derived current assessment
  const currentAssessment = useMemo(() => {
    if (!allAssessments.length) return null;
    if (selectedVersion === null) {
      return allAssessments.find((a) => a.is_latest) || allAssessments[0] || null;
    }
    return allAssessments.find((a) => a.assessment_version === selectedVersion) || allAssessments[0] || null;
  }, [allAssessments, selectedVersion]);

  // Handle version switcher
  function handleSelectVersion(version: number) {
    setSelectedVersion(version);
    const target = allAssessments.find((a) => a.assessment_version === version);
    if (target?.generated_by) {
      void supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", target.generated_by)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setAuthorProfile(data);
          else setAuthorProfile(null);
        });
    } else {
      setAuthorProfile(null);
    }
  }

  // Cast context objects safely
  const d1 = currentAssessment?.demographic_context as unknown as DemographicContext | undefined;
  const d2 = currentAssessment?.budget_context as unknown as DepartmentBudgetContext | undefined;
  const d3 = currentAssessment?.geography_context as unknown as GeographyContext | undefined;
  const d4Assets = (
    currentAssessment?.infrastructure_context &&
    Array.isArray((currentAssessment.infrastructure_context as Record<string, unknown>).assets)
      ? (currentAssessment.infrastructure_context as Record<string, unknown>).assets
      : []
  ) as InfrastructureAssetContext[];
  const d5 = currentAssessment?.accessibility_context as unknown as AccessibilityContext | undefined;
  const d6 = currentAssessment?.socioeconomic_context as unknown as SocioeconomicGapContext | undefined;
  const d7History = currentAssessment?.historical_cost_context as unknown as HistoricalProjectsAggregateContext | undefined;
  const d7Projects = (
    d7History?.projects && Array.isArray(d7History.projects) ? d7History.projects : []
  ) as HistoricalProjectContext[];

  // Completeness score styling
  const completeness = currentAssessment?.data_completeness_score ?? 0;
  const completenessBadgeVariant = completeness >= 75 ? "emerald" : completeness >= 50 ? "amber" : "rose";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading Infrastructure Assessment Dossier...
        </p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Infrastructure Assessment Dossier"
          description="Factual multi-dataset decision-support snapshot"
          backHref="/app/admin/classification"
          backLabel="Classification Queue"
          tag="Infrastructure Governance"
        />
        <EmptyState
          icon={AlertCircle}
          variant="error"
          title="Dossier Unavailable"
          description={error || "The requested issue or its infrastructure dossier could not be loaded."}
          action={
            <div className="flex gap-2">
              <Button onClick={() => setRefreshNonce((v) => v + 1)} variant="outline" size="sm">
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Retry
              </Button>
              <Button asChild size="sm">
                <Link to="/app/admin/classification">Return to Classification</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (!currentAssessment) {
    const isMissingDistrict = !issue.district_id && !selectedDistrictId;
    const isMissingDept = !issue.department_id && !selectedDepartmentId;

    return (
      <div className="space-y-6">
        <PageHeader
          title="Infrastructure Assessment Dossier"
          description={`Review multi-dataset context for issue "${issue.title}"`}
          backHref="/app/admin/classification"
          backLabel="Classification Queue"
          tag="Infrastructure Track"
        />

        {/* Action Banners */}
        {actionSuccess && (
          <Card className="p-4 bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActionSuccess(null)} className="h-6 w-6 p-0 text-emerald-800">
              <X className="h-3.5 w-3.5" />
            </Button>
          </Card>
        )}

        {actionError && (
          <Card className="p-4 bg-rose-50 border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{actionError}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActionError(null)} className="h-6 w-6 p-0 text-rose-800">
              <X className="h-3.5 w-3.5" />
            </Button>
          </Card>
        )}

        {/* Infrastructure Context Resolution Card */}
        <Card className="border-2 border-indigo-200 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="py-4 px-5 bg-gradient-to-r from-indigo-50/90 via-sky-50/40 to-indigo-50/90 border-b border-indigo-100">
            <div className="flex items-center gap-2.5 text-indigo-950 font-bold text-sm">
              <Compass className="h-5 w-5 text-indigo-600 shrink-0" />
              <span>Infrastructure Context Resolution & Dossier Generation</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              An Infrastructure Assessment requires a verified canonical district and an assigned municipal department with a primary planning sector baseline. Complete or verify the required context below to generate the D1–D7 evidence dossier.
            </p>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6 text-xs">
            {/* Issue summary strip */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">ID: #{issue.id.slice(0, 8)}</span>
                <Badge variant="outline" size="sm" className="font-bold">
                  {getCitizenIssueStatusLabel(issue.status)}
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-foreground break-words">{issue.title}</h4>
              <p className="text-muted-foreground text-xs break-words">{issue.description}</p>
              {issue.location_text && (
                <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground pt-1 text-[11px] min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="break-words">Reported Location: {issue.location_text}</span>
                  {issue.latitude && issue.longitude && (
                    <span className="font-mono text-[10px] text-muted-foreground">({issue.latitude}, {issue.longitude})</span>
                  )}
                </div>
              )}
            </div>

            {/* Context Status Diagnostics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className={`p-3.5 rounded-xl border min-w-0 overflow-hidden ${isMissingDistrict ? "border-amber-300 bg-amber-50/50" : "border-emerald-300 bg-emerald-50/50"}`}>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground truncate">Canonical District</span>
                  {isMissingDistrict ? (
                    <Badge variant="amber" size="sm" className="shrink-0">Missing</Badge>
                  ) : (
                    <Badge variant="emerald" size="sm" className="shrink-0">Configured</Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-foreground truncate" title={districts.find((d) => d.id === (selectedDistrictId || issue.district_id))?.district_name ?? (issue.district_id || "Not assigned")}>
                  {districts.find((d) => d.id === (selectedDistrictId || issue.district_id))?.district_name ?? (issue.district_id || "Not assigned")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Required for D1–D7 multi-dataset context aggregation</p>
              </div>

              <div className={`p-3.5 rounded-xl border min-w-0 overflow-hidden ${isMissingDept ? "border-amber-300 bg-amber-50/50" : "border-emerald-300 bg-emerald-50/50"}`}>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground truncate">Assigned Dept</span>
                  {isMissingDept ? (
                    <Badge variant="amber" size="sm" className="shrink-0">Missing</Badge>
                  ) : (
                    <Badge variant="emerald" size="sm" className="shrink-0">Configured</Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-foreground truncate" title={departments.find((d) => d.id === (selectedDepartmentId || issue.department_id))?.name ?? (issue.department_id ? "Assigned" : "Not assigned")}>
                  {departments.find((d) => d.id === (selectedDepartmentId || issue.department_id))?.name ?? (issue.department_id ? "Assigned" : "Not assigned")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Required to resolve primary planning sector</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-card min-w-0 overflow-hidden sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground truncate">Planning Sector</span>
                  <Badge variant="outline" size="sm" className="shrink-0 text-[10px]">Dynamic</Badge>
                </div>
                <p className="text-xs font-semibold text-foreground truncate">
                  Resolved via Department Mapping
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Evaluated from department_planning_sectors (is_primary)</p>
              </div>
            </div>

            {/* Selection Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* District Selector */}
              <div className="space-y-2 min-w-0">
                <label className="font-bold text-foreground block text-xs">
                  Select Canonical District <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Filter district or state (e.g. Ranchi, Jharkhand)..."
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-1.5"
                />
                <select
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-full"
                >
                  <option value="">-- Choose Canonical District ({districts.length} available) --</option>
                  {filteredDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}, {d.state_name} ({d.id})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  District identity maps to D1 Demographics, D2 Budgets, D3 Geography, D4 Assets, D5 Accessibility, D6 Gaps, and D7 History.
                </p>
              </div>

              {/* Department Selector */}
              <div className="space-y-2">
                <label className="font-bold text-foreground block text-xs">
                  Assigned Municipal Department <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer mt-7"
                >
                  <option value="">-- Choose Municipal Department ({departments.length} available) --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Department determines the primary planning sector code and capital budget envelopes.
                </p>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Assigning district will record method ADMIN_MANUAL in the audit trail.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
                  <Link to="/app/admin/classification">Back to Classification</Link>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDistrictAndGenerate}
                  disabled={!selectedDistrictId || !selectedDepartmentId || generatingSnapshot}
                  className="flex-1 sm:flex-initial gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  {generatingSnapshot ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Dossier...</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      <span>Save Context & Generate Snapshot</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Infrastructure Assessment Dossier"
        description="Authoritative read-only review of integrated D1–D7 district demographic, budgetary, geographic, accessibility, and historical precedents."
        backHref="/app/admin/classification"
        backLabel="Classification & Routing"
        tag="Administrative Evidence Dossier • Read-Only"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Version Switcher if multiple versions exist */}
            {allAssessments.length > 1 ? (
              <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 text-xs shadow-sm">
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground font-medium text-[11px]">Version:</span>
                <select
                  value={currentAssessment.assessment_version}
                  onChange={(e) => handleSelectVersion(Number(e.target.value))}
                  className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer text-xs"
                >
                  {allAssessments.map((a) => (
                    <option key={a.id} value={a.assessment_version}>
                      v{a.assessment_version} {a.is_latest ? "(Latest)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Dossier
            </Button>
          </div>
        }
      />

      {/* Action Notification Banners */}
      {actionSuccess ? (
        <Card className="p-4 bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionSuccess(null)}
            className="h-6 w-6 p-0 text-emerald-800 hover:bg-emerald-100"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Card>
      ) : null}

      {actionError ? (
        <Card className="p-4 bg-rose-50 border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionError(null)}
            className="h-6 w-6 p-0 text-rose-800 hover:bg-rose-100"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Card>
      ) : null}

      {/* GOVERNANCE STAGE NOTICE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-indigo-200/90 bg-indigo-50/70 text-indigo-950 text-xs shadow-sm">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <ShieldCheck className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5 sm:mt-0" />
          <div className="min-w-0">
            <span className="font-bold block sm:inline">Governance Stage: Infrastructure Screening & Decision</span>
            <p className="text-[11px] text-indigo-900/80 mt-0.5 leading-relaxed">
              Reviewing immutable D1–D7 baseline context snapshot for diagnostic assessment. Official screening decisions (Pass / Do Not Pass) are recorded authoritatively by the Administrator.
            </p>
          </div>
        </div>
        <Badge variant="indigo" size="sm" className="shrink-0 font-bold uppercase tracking-wider self-start sm:self-auto">
          Auditable Ledger
        </Badge>
      </div>

      {/* 2. ISSUE & ASSESSMENT METADATA STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Issue Identification Card */}
        <Card className="rounded-2xl border border-border/80 shadow-sm md:col-span-2 xl:col-span-2 overflow-hidden flex flex-col justify-between">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Civic Issue Profile
            </span>
            <Badge variant="indigo" size="sm" className="shrink-0">
              {getCitizenIssueStatusLabel(issue.status)}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="font-bold text-sm text-foreground break-words">{issue.title}</div>
            <p className="text-muted-foreground text-[11px] line-clamp-3 leading-relaxed break-words">
              {issue.description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[11px]">
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">Category</span>
                <span className="font-semibold text-foreground truncate block">{issue.category}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">Location</span>
                <span className="font-semibold text-foreground truncate block">
                  {issue.address_text || issue.location_text || "Geographic Coordinates"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Snapshot Identity Card */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col justify-between min-w-0">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Dossier Metadata
            </span>
            <Badge variant={currentAssessment.is_latest ? "emerald" : "outline"} size="sm" className="shrink-0">
              {currentAssessment.is_latest ? "Active Latest" : "Historical"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground text-[11px]">Snapshot Version</span>
              <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded">
                v{currentAssessment.assessment_version}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground text-[11px]">District ID</span>
              <span className="font-mono font-semibold text-foreground">
                {currentAssessment.district_id}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-muted-foreground text-[11px]">Planning Sector</span>
              <span className="font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                {currentAssessment.planning_sector_code}
              </span>
            </div>
            {issue.district_resolution_method ? (
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-muted-foreground text-[11px]">Resolution</span>
                <Badge variant="outline" size="sm" className="text-[10px] font-medium bg-muted/40 max-w-full truncate">
                  {issue.district_resolution_method === "CITIZEN_SELECTED"
                    ? "Citizen selected"
                    : issue.district_resolution_method === "ADMIN_MANUAL"
                      ? "Admin manual"
                      : "AI parsed"}
                </Badge>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-border/60 text-[10px] text-muted-foreground">
              <span>Generated At</span>
              <span className="truncate">{formatCitizenIssueDateTime(currentAssessment.created_at)}</span>
            </div>
            {authorProfile ? (
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
                <span>Author</span>
                <span className="font-medium text-foreground truncate max-w-[130px]" title={authorProfile.full_name || authorProfile.email || undefined}>
                  {authorProfile.full_name || authorProfile.email}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Data Completeness Score Card */}
        <Card className="rounded-2xl border border-border/80 shadow-sm bg-gradient-to-br from-background via-card to-muted/20 flex flex-col justify-between overflow-hidden min-w-0">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Data Completeness
            </span>
            <Badge variant={completenessBadgeVariant} size="sm" className="shrink-0">
              {completeness >= 75 ? "Comprehensive" : completeness >= 50 ? "Moderate" : "Low Data"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-foreground">{completeness}</span>
                <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">D1–D7 Index</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completeness >= 75
                    ? "bg-emerald-600"
                    : completeness >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, completeness))}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Deterministic index evaluating factual completeness across demographics, budget, spatial assets, and precedents.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. EXECUTIVE ASSESSMENT SUMMARY */}
      {currentAssessment.assessment_summary ? (
        <Card className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-background to-indigo-50/30 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-indigo-100/50 border-b border-indigo-200/80 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
              <FileText className="h-4 w-4 text-indigo-700 shrink-0" />
              <span>Executive Factual Summary</span>
            </div>
            <Badge variant="indigo" size="sm" className="font-mono text-[10px] shrink-0">
              D1–D7 Aggregation
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <p className="text-foreground text-xs leading-relaxed font-medium break-words">
              {currentAssessment.assessment_summary}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 min-w-0">
              <Info className="h-3 w-3 shrink-0 text-indigo-600" />
              <span className="leading-relaxed">
                Factual diagnostic compiled deterministically from canonical district datasets D1–D7. Does not constitute financial approval or project sanction.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 4. PRELIMINARY PROJECT ESTIMATES (UNCOMMITTED ESTIMATES) */}
      <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
              Preliminary Project Estimates (Uncommitted Reference)
            </CardTitle>
          </div>
          <span className="text-[10px] text-muted-foreground italic">
            Diagnostic reference only • Not sanctioned budget
          </span>
        </CardHeader>
        <CardContent className="p-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Cost Estimate */}
            <div className="p-3 rounded-xl border border-border/70 bg-card min-w-0 overflow-hidden">
              <span className="text-[10px] text-muted-foreground uppercase font-medium block truncate">
                Estimated Project Cost
              </span>
              <div className="text-base font-bold text-foreground mt-0.5 break-words">
                {currentAssessment.estimated_project_cost_crore !== null
                  ? `₹${currentAssessment.estimated_project_cost_crore} Cr`
                  : "Not estimated"}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5 leading-tight">
                {currentAssessment.estimated_project_cost_crore !== null
                  ? "Preliminary indicative capital outlay"
                  : "Requires detailed project report"}
              </span>
            </div>

            {/* Duration Estimate */}
            <div className="p-3 rounded-xl border border-border/70 bg-card min-w-0 overflow-hidden">
              <span className="text-[10px] text-muted-foreground uppercase font-medium block truncate">
                Estimated Duration
              </span>
              <div className="text-base font-bold text-foreground mt-0.5 break-words">
                {currentAssessment.estimated_project_duration_months !== null
                  ? `${currentAssessment.estimated_project_duration_months} Months`
                  : "Not estimated"}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5 leading-tight">
                {currentAssessment.estimated_project_duration_months !== null
                  ? "Execution timeframe estimate"
                  : "Scope pending formal engineering"}
              </span>
            </div>

            {/* Beneficiaries */}
            <div className="p-3 rounded-xl border border-border/70 bg-card min-w-0 overflow-hidden">
              <span className="text-[10px] text-muted-foreground uppercase font-medium block truncate">
                Estimated Beneficiaries
              </span>
              <div className="text-base font-bold text-foreground mt-0.5 break-words">
                {currentAssessment.estimated_beneficiaries !== null
                  ? `${currentAssessment.estimated_beneficiaries.toLocaleString()} Citizens`
                  : "Not estimated"}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5 leading-tight">
                Catchment population scope
              </span>
            </div>

            {/* Affected Households */}
            <div className="p-3 rounded-xl border border-border/70 bg-card min-w-0 overflow-hidden">
              <span className="text-[10px] text-muted-foreground uppercase font-medium block truncate">
                Affected Households
              </span>
              <div className="text-base font-bold text-foreground mt-0.5 break-words">
                {currentAssessment.affected_households !== null
                  ? `${currentAssessment.affected_households.toLocaleString()} Households`
                  : "Not estimated"}
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5 leading-tight">
                Direct service coverage
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. MULTI-DATASET (D1–D7) PERSISTED SNAPSHOT EXPLORER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4 text-indigo-700" />
            <h3 className="font-bold text-sm text-foreground">
              Multi-Dataset Context Breakdown (D1 to D7)
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Snapshot state captured at assessment creation
          </span>
        </div>

        {/* D1: Demographics */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader
            onClick={() => toggleSection("d1")}
            className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <Users className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="truncate">D1 — Demographic Profile & Population</span>
              {d1?.total_population ? (
                <Badge variant="blue" size="sm" className="font-mono text-[10px] shrink-0">
                  Pop: {d1.total_population.toLocaleString()}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {d1?.source_dataset || "Canonical D1"}
              </span>
              {collapsedSections.d1 ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.d1 ? (
            <CardContent className="p-4 text-xs space-y-3">
              {d1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Total Population</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d1.total_population?.toLocaleString() || "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Households: {d1.total_households?.toLocaleString() || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Urban / Rural Split</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d1.urban_population && d1.total_population
                        ? `${Math.round((d1.urban_population / d1.total_population) * 100)}% Urban`
                        : "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Rural: {d1.rural_population?.toLocaleString() || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Vulnerable Demographics</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      SC: {d1.sc_population?.toLocaleString() || "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      ST: {d1.st_population?.toLocaleString() || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Literacy & Access Index</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d1.literacy_rate_percentage !== null ? `${d1.literacy_rate_percentage}% Literacy` : "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Service Gap: {d1.overall_service_gap_score ?? "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Demographic context not recorded in snapshot.
                </p>
              )}
            </CardContent>
          ) : null}
        </Card>

        {/* D2: Department Budget */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader
            onClick={() => toggleSection("d2")}
            className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <Coins className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate">D2 — Departmental Budget Provisions & Outlay</span>
              {d2?.unspent_budget_crore !== undefined ? (
                <Badge variant="emerald" size="sm" className="font-mono text-[10px] shrink-0">
                  Unspent: ₹{d2.unspent_budget_crore} Cr
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {d2?.source_dataset || "Canonical D2"}
              </span>
              {collapsedSections.d2 ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.d2 ? (
            <CardContent className="p-4 text-xs space-y-3">
              {d2 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                      <span className="text-[10px] text-muted-foreground uppercase block truncate">Sector & FY</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block truncate" title={d2.planning_sector_name || d2.planning_sector_code}>
                        {d2.planning_sector_name || d2.planning_sector_code}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">FY {d2.financial_year}</span>
                    </div>

                    <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                      <span className="text-[10px] text-muted-foreground uppercase block truncate">Allocated Budget</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                        ₹{d2.allocated_budget_crore} Cr
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">Total Sanctioned Outlay</span>
                    </div>

                    <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                      <span className="text-[10px] text-muted-foreground uppercase block truncate">Spent Budget</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                        ₹{d2.spent_budget_crore} Cr
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        Utilization: {d2.budget_utilization_percentage ?? "N/A"}%
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                      <span className="text-[10px] text-muted-foreground uppercase block truncate">Available Headroom</span>
                      <span className="text-sm font-bold text-emerald-800 mt-0.5 block break-words">
                        ₹{d2.unspent_budget_crore} Cr
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">Uncommitted Balance</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-950 text-[11px] flex items-start gap-2 min-w-0">
                    <Info className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>Administrative Notice:</strong> Unspent departmental budget reflects aggregate sectoral provisions across the district. Availability of funds does not imply project sanctioning or approval.
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Budget context not recorded in snapshot.
                </p>
              )}
            </CardContent>
          ) : null}
        </Card>

        {/* D3: Geography & Terrain */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader
            onClick={() => toggleSection("d3")}
            className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <Compass className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="truncate">D3 — Geography, Terrain & Spatial Footprint</span>
              {d3?.area_sq_km ? (
                <Badge variant="teal" size="sm" className="font-mono text-[10px] shrink-0">
                  Area: {d3.area_sq_km} sq km
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {d3?.source_dataset || "Canonical D3"}
              </span>
              {collapsedSections.d3 ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.d3 ? (
            <CardContent className="p-4 text-xs space-y-3">
              {d3 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Area & Extent</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d3.area_sq_km ? `${d3.area_sq_km} sq km` : "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Region: {d3.geographic_region || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Centroid Coordinates</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block font-mono break-words">
                      {d3.centroid_latitude?.toFixed(4)}, {d3.centroid_longitude?.toFixed(4)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      HQ: {d3.district_headquarters || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Terrain Classification</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d3.terrain_type || "Mixed Plain/Plateau"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Character: {d3.rural_urban_character || "Rural-Centric"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Neighboring Districts</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d3.neighbor_count || (d3.neighboring_districts?.length ?? 0)} Connected
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block" title={d3.neighboring_districts?.join(", ") || "N/A"}>
                      {d3.neighboring_districts?.slice(0, 3).join(", ") || "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Geography context not recorded in snapshot.
                </p>
              )}
            </CardContent>
          ) : null}
        </Card>

        {/* D4: Existing Infrastructure Assets */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader
            onClick={() => toggleSection("d4")}
            className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="truncate">D4 — Existing Infrastructure Assets & Capacity</span>
              <Badge variant="indigo" size="sm" className="font-mono text-[10px] shrink-0">
                {d4Assets.length} Categories Cataloged
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">Canonical D4</span>
              {collapsedSections.d4 ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.d4 ? (
            <CardContent className="p-4 text-xs space-y-3">
              {d4Assets.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border/70 min-w-0 w-full">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground">
                        <th className="py-2.5 px-3 font-semibold">Infrastructure Category</th>
                        <th className="py-2.5 px-3 font-semibold">Asset Count</th>
                        <th className="py-2.5 px-3 font-semibold">Functional Count</th>
                        <th className="py-2.5 px-3 font-semibold">Utilization Rate</th>
                        <th className="py-2.5 px-3 font-semibold">Gap Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {d4Assets.map((asset, idx) => (
                        <tr key={asset.infrastructure_id || idx} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {asset.infrastructure_category || asset.infrastructure_type || asset.infrastructure_id}
                          </td>
                          <td className="py-2.5 px-3 font-mono">{asset.existing_asset_count ?? "N/A"}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-700">
                            {asset.functional_asset_count ?? "N/A"}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {asset.utilization_percentage !== null && asset.utilization_percentage !== undefined
                              ? `${asset.utilization_percentage}%`
                              : "N/A"}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                (asset.infrastructure_gap_score ?? 0) > 60
                                  ? "bg-rose-100 text-rose-800"
                                  : (asset.infrastructure_gap_score ?? 0) > 30
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {asset.infrastructure_gap_score ?? "N/A"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  No specific infrastructure asset entries cataloged in snapshot.
                </p>
              )}
            </CardContent>
          ) : null}
        </Card>

        {/* D5: Accessibility */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader
            onClick={() => toggleSection("d5")}
            className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <Globe className="h-4 w-4 text-sky-600 shrink-0" />
              <span className="truncate">D5 — Spatial Accessibility & Service Distance</span>
              {d5?.overall_accessibility_gap_score !== undefined ? (
                <Badge variant="sky" size="sm" className="font-mono text-[10px] shrink-0">
                  Gap: {d5.overall_accessibility_gap_score}/100
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {d5?.source_dataset || "Canonical D5"}
              </span>
              {collapsedSections.d5 ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.d5 ? (
            <CardContent className="p-4 text-xs space-y-3">
              {d5 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Road Connectivity</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d5.all_weather_access_percentage !== null && d5.all_weather_access_percentage !== undefined
                        ? `${d5.all_weather_access_percentage}% All-Weather`
                        : "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Paved Road: {d5.paved_road_coverage_percentage ?? "N/A"}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Avg Travel Time</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d5.average_travel_time_minutes ? `${d5.average_travel_time_minutes} mins` : "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">To Major Service Node</span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Distance to Center</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d5.average_distance_to_service_center_km ? `${d5.average_distance_to_service_center_km} km` : "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">Sector Radius</span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Remote Population</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      {d5.remote_population_percentage !== null && d5.remote_population_percentage !== undefined
                        ? `${d5.remote_population_percentage}% Remote`
                        : "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Transport Gap: {d5.transport_access_gap_score ?? "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Accessibility context not recorded in snapshot.
                </p>
              )}
            </CardContent>
          ) : null}
        </Card>

        {/* D6: Socioeconomic Context */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader
            onClick={() => toggleSection("d6")}
            className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <Scale className="h-4 w-4 text-violet-600 shrink-0" />
              <span className="truncate">D6 — Socioeconomic Need & Deprivation Indices</span>
              {d6?.overall_development_context_score !== undefined ? (
                <Badge variant="violet" size="sm" className="font-mono text-[10px] shrink-0">
                  Need Score: {d6.overall_development_context_score}/100
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {d6?.source_dataset || "Canonical D6"}
              </span>
              {collapsedSections.d6 ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.d6 ? (
            <CardContent className="p-4 text-xs space-y-3">
              {d6 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Economic Vulnerability</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      Score: {d6.economic_vulnerability_score ?? "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Low Income: {d6.estimated_low_income_population_percentage ?? "N/A"}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Healthcare Gap</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      Score: {d6.healthcare_service_gap_score ?? "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">Clinical Facility Index</span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Water & Sanitation Gap</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      Score: {d6.water_sanitation_service_gap_score ?? "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">WASH Deprivation</span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Overall Deprivation</span>
                    <span className="text-sm font-bold text-foreground mt-0.5 block break-words">
                      Score: {d6.overall_development_context_score ?? "N/A"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Pressure: {d6.socioeconomic_pressure_score ?? "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Socioeconomic gap context not recorded in snapshot.
                </p>
              )}
            </CardContent>
          ) : null}
        </Card>

        {/* D7: Historical Projects */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader
            onClick={() => toggleSection("d7")}
            className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <History className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="truncate">D7 — Historical Project Execution Precedents & Cost Benchmarks</span>
              <Badge variant="amber" size="sm" className="font-mono text-[10px] shrink-0">
                {d7Projects.length} Precedent Projects
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Canonical D7
              </span>
              {collapsedSections.d7 ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.d7 ? (
            <CardContent className="p-4 text-xs space-y-3">
              {d7History ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Precedents In Sector</span>
                    <span className="text-sm font-bold text-foreground block truncate">
                      {d7History.project_count ?? d7Projects.length} Projects
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Average Historical Cost</span>
                    <span className="text-sm font-bold text-foreground block truncate">
                      {d7History.average_actual_cost_crore !== null && d7History.average_actual_cost_crore !== undefined
                        ? `₹${d7History.average_actual_cost_crore} Cr`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card min-w-0 overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase block truncate">Cost Variance Rate</span>
                    <span className="text-sm font-bold text-foreground block truncate">
                      {d7History.average_cost_variance_percentage !== null && d7History.average_cost_variance_percentage !== undefined
                        ? `${d7History.average_cost_variance_percentage}%`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ) : null}

              {d7Projects.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border/70 min-w-0 w-full">
                  <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground">
                        <th className="py-2 px-3 font-semibold">Project Title / Type</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Approved Cost</th>
                        <th className="py-2 px-3 font-semibold">Actual Cost</th>
                        <th className="py-2 px-3 font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {d7Projects.map((proj, idx) => (
                        <tr key={proj.project_id || idx} className="hover:bg-muted/20">
                          <td className="py-2 px-3">
                            <span className="font-semibold text-foreground block truncate max-w-[220px]" title={proj.project_name || proj.project_type || "Historical Capital Project"}>
                              {proj.project_name || proj.project_type || "Historical Capital Project"}
                            </span>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {proj.planning_sector_name || proj.project_sector} • FY {proj.financial_year || "N/A"}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" size="sm" className="text-[10px]">
                              {proj.project_status || "COMPLETED"}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-mono">₹{proj.approved_cost_crore ?? "N/A"} Cr</td>
                          <td className="py-2 px-3 font-mono text-emerald-800">
                            ₹{proj.actual_cost_crore ?? "N/A"} Cr
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {proj.actual_duration_months ? `${proj.actual_duration_months} mo` : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  No historical project execution records found for this district and sector.
                </p>
              )}
            </CardContent>
          ) : null}
        </Card>
      </div>

      {/* 6. DATASET D8 ISOLATION & SIMILAR REQUESTS */}
      <Card className="rounded-2xl border border-border/80 shadow-sm bg-muted/10 overflow-hidden min-w-0">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">Similar Requests Context & Benchmark Safety Notice</span>
          </div>
          <Badge variant="default" size="sm" className="font-mono text-[10px] shrink-0">
            D8 Isolated
          </Badge>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-semibold text-foreground block">
                Synthetic Benchmark Isolation Enforced
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Dataset D8 synthetic benchmark data is strictly excluded from operational assessment calculations. No synthetic or simulated records were ingested into this assessment snapshot.
              </p>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono bg-muted/30 p-2 rounded-lg border border-border/60 break-all">
            synthetic_benchmark_used: false • D8 benchmark requests table isolated
          </div>
        </CardContent>
      </Card>

      {/* 7. FEASIBILITY & SUSTAINABILITY INDICATORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feasibility Indicators */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">Feasibility Indicators</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 text-xs">
            {currentAssessment.feasibility_indicators &&
            Object.keys(currentAssessment.feasibility_indicators).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(currentAssessment.feasibility_indicators).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1 border-b border-border/40 text-[11px] gap-2 min-w-0">
                    <span className="text-muted-foreground capitalize truncate">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-foreground shrink-0">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-xs italic">
                Not available • No custom feasibility indicators recorded in baseline snapshot.
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50 leading-relaxed">
              Zero algorithmic assumptions applied. Feasibility indicators must be empirically verified during formal technical vetting.
            </p>
          </CardContent>
        </Card>

        {/* Sustainability Indicators */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden min-w-0">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/70 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground min-w-0">
              <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">Sustainability Indicators</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 text-xs">
            {currentAssessment.sustainability_indicators &&
            Object.keys(currentAssessment.sustainability_indicators).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(currentAssessment.sustainability_indicators).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1 border-b border-border/40 text-[11px] gap-2 min-w-0">
                    <span className="text-muted-foreground capitalize truncate">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-foreground shrink-0">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-xs italic">
                Not available • No custom sustainability indicators recorded in baseline snapshot.
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50 leading-relaxed">
              Long-term maintenance and environmental impact indicators require field validation.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 8. RISKS AND MISSING INFORMATION */}
      <Card className="rounded-2xl border border-amber-200/90 bg-amber-50/30 shadow-sm overflow-hidden min-w-0">
        <CardHeader className="py-3 px-4 bg-amber-100/50 border-b border-amber-200/80 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span className="truncate">Identified Data Gaps & Information Needs</span>
          </div>
          <Badge variant="amber" size="sm" className="shrink-0">
            Audit Checklist
          </Badge>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-2">
          {Array.isArray(currentAssessment.risks_and_missing_info) &&
          currentAssessment.risks_and_missing_info.length > 0 ? (
            <ul className="space-y-1.5 list-disc list-inside text-[11px] text-amber-950 break-words">
              {currentAssessment.risks_and_missing_info.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>No critical data gaps or missing information flagged in this baseline snapshot.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 9. ADMIN INFRASTRUCTURE DECISION WORKSPACE */}
      {decision || issue.status === "INFRASTRUCTURE_ACCEPTED" || issue.status === "INFRASTRUCTURE_REJECTED" ? (
        <Card className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50/50 via-card to-indigo-50/30 shadow-md overflow-hidden min-w-0">
          <CardHeader className="py-3 px-4 bg-indigo-100/60 border-b border-indigo-200/80 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs min-w-0">
              <ShieldCheck className="h-4 w-4 text-indigo-700 shrink-0" />
              <span className="truncate">Official Administrative Decision Recorded</span>
            </div>
            <Badge
              variant={
                decision?.decision === "ACCEPTED" || issue.status === "INFRASTRUCTURE_ACCEPTED"
                  ? "emerald"
                  : "rose"
              }
              size="default"
              className="font-bold uppercase tracking-wider shrink-0"
            >
              {decision?.decision === "ACCEPTED" || issue.status === "INFRASTRUCTURE_ACCEPTED"
                ? "PASSED"
                : "NOT PASSED"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Administrative Rationale & Justification
              </span>
              <p className="text-foreground text-xs leading-relaxed font-medium bg-card p-3 rounded-lg border border-border/70 break-words">
                {decision?.internal_decision_reason ||
                  decision?.citizen_safe_summary ||
                  "Screening decision recorded by platform Administrator."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60 text-[11px]">
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">Decision Maker</span>
                <span className="font-semibold text-foreground truncate block">
                  {decision?.decided_by_profile?.full_name ||
                    decision?.decided_by_profile?.email ||
                    authorProfile?.full_name ||
                    "Administrator"}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">Decided Timestamp</span>
                <span className="font-semibold text-foreground truncate block">
                  {decision?.decided_at
                    ? formatCitizenIssueDateTime(decision.decided_at)
                    : formatCitizenIssueDateTime(issue.updated_at)}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground block text-[10px]">Resulting Status</span>
                <span className="font-semibold text-indigo-950 truncate block">
                  {getCitizenIssueStatusLabel(issue.status)}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-muted/40 text-[10px] text-muted-foreground flex items-start gap-1.5 min-w-0">
              <Info className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
              <span className="leading-relaxed">
                Official administrative screening decision has been recorded on the governance ledger. The dossier remains available for read-only audit.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-2 border-indigo-200/90 shadow-md overflow-hidden min-w-0">
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-indigo-50/90 via-sky-50/40 to-indigo-50/90 border-b border-indigo-200/80">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
              <Shield className="h-4 w-4 text-indigo-700 shrink-0" />
              <span>Admin Infrastructure Screening Decision</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              CivicFix presents the factual evidence. The final screening decision is determined solely by the authorized Administrator.
            </p>
          </CardHeader>

          <CardContent className="space-y-4 p-4 text-xs">
            {/* Option Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pass Option */}
              <button
                type="button"
                onClick={() => setDecisionOutcome("PASSED")}
                className={`p-4 rounded-xl border-2 text-left transition-all relative min-w-0 ${
                  decisionOutcome === "PASSED"
                    ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600/20"
                    : "border-border/80 hover:border-muted-foreground/40 bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="font-bold text-sm text-emerald-950 flex items-center gap-2 truncate">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    Pass Infrastructure Project
                  </span>
                  <div
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      decisionOutcome === "PASSED"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {decisionOutcome === "PASSED" && <Check className="h-2.5 w-2.5" />}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                  The Admin confirms that the infrastructure request passes the current CivicFix infrastructure screening/review stage.
                </p>
              </button>

              {/* Not Pass Option */}
              <button
                type="button"
                onClick={() => setDecisionOutcome("NOT_PASSED")}
                className={`p-4 rounded-xl border-2 text-left transition-all relative min-w-0 ${
                  decisionOutcome === "NOT_PASSED"
                    ? "border-rose-600 bg-rose-50/70 shadow-sm ring-1 ring-rose-600/20"
                    : "border-border/80 hover:border-muted-foreground/40 bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="font-bold text-sm text-rose-950 flex items-center gap-2 truncate">
                    <X className="h-4 w-4 text-rose-700 shrink-0" />
                    Do Not Pass
                  </span>
                  <div
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      decisionOutcome === "NOT_PASSED"
                        ? "border-rose-600 bg-rose-600 text-white"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {decisionOutcome === "NOT_PASSED" && <Check className="h-2.5 w-2.5" />}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                  The Admin does not pass the infrastructure request through the current infrastructure screening/review stage.
                </p>
              </button>
            </div>

            {/* Mandatory Reason Input */}
            <div className="space-y-1.5 pt-1">
              <label className="font-semibold text-foreground text-xs block">
                Administrative Decision Remarks & Justification <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                placeholder={
                  decisionOutcome === "PASSED"
                    ? "State the administrative justification for passing this project (e.g. Alignment with district road network connectivity gaps and sufficient departmental budget availability)..."
                    : "State the administrative rationale for not passing this project (e.g. Severe budget deficit in planning sector, insufficient population catchment, or conflicting master plan priorities)..."
                }
              />
              <div className="flex items-center justify-between text-[10px]">
                <span className={decisionReason.trim().length < 10 ? "text-rose-600" : "text-muted-foreground"}>
                  Minimum 10 characters required ({decisionReason.trim().length}/10).
                </span>
                <span className="text-muted-foreground">Auditable official governance entry</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                size="sm"
                onClick={() => setDecisionConfirmOpen(true)}
                disabled={submittingDecision || decisionReason.trim().length < 10}
                className={`gap-1.5 font-semibold px-5 ${
                  decisionOutcome === "PASSED"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {decisionOutcome === "PASSED" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span>Record Decision ({decisionOutcome === "PASSED" ? "Pass" : "Do Not Pass"})</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 10. BOTTOM NAVIGATION BAR (READ-ONLY) */}
      <div className="flex items-center justify-between pt-4 border-t border-border/70">
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link to="/app/admin/classification">
            <ArrowLeft className="h-4 w-4" />
            Back to Classification
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to={`/app/admin/issues/${issue.id}`}>
              View Operational Issue Card
            </Link>
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {decisionConfirmOpen && issue ? (
        <Dialog
          open={decisionConfirmOpen}
          onClose={() => setDecisionConfirmOpen(false)}
          title={decisionOutcome === "PASSED" ? "Pass Infrastructure Project?" : "Do Not Pass Infrastructure Project?"}
          description="Confirm recording this authoritative administrative screening decision."
          maxWidth="md"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 border border-border/70 rounded-xl bg-muted/20 space-y-1">
              <span className="font-mono text-[10px] text-muted-foreground block">
                ID: {issue.id}
              </span>
              <span className="font-bold text-foreground text-sm block">
                {issue.title}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                {issue.category} • {issue.address_text || issue.location_text || "Geographic Coordinates"}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium">Selected Outcome:</span>
                <Badge
                  variant={decisionOutcome === "PASSED" ? "emerald" : "rose"}
                  size="default"
                  className="font-bold uppercase tracking-wider"
                >
                  {decisionOutcome === "PASSED" ? "PASSED" : "NOT PASSED"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Resulting Status:</span>
                <span className="font-semibold font-mono text-foreground">
                  {mapOutcomeToTargetStatus(decisionOutcome)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-muted/30 border border-border/70 rounded-xl space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Decision Justification:
              </span>
              <p className="text-[11px] text-foreground italic leading-relaxed">
                "{decisionReason.trim()}"
              </p>
            </div>

            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-950 text-[11px] flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Important:</strong> This decision is made by the Admin. CivicFix does not automatically determine the outcome. Once submitted, this action is permanently recorded in the governance ledger.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDecisionConfirmOpen(false)}
                disabled={submittingDecision}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void handleConfirmDecision();
                }}
                disabled={submittingDecision || decisionReason.trim().length < 10}
                className={`gap-1.5 font-semibold ${
                  decisionOutcome === "PASSED"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {submittingDecision ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Confirm & Record Decision
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
