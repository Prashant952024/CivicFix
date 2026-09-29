import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  FileCheck2,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  History,
  Info,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatCitizenIssueDateTime,
  formatCitizenIssueDate,
  getCitizenIssueStatusLabel,
} from "@/lib/citizen-issues";
import {
  fetchCanonicalDistricts,
  type CanonicalDistrictOption,
} from "@/lib/infrastructure-context";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueStatus = Database["public"]["Enums"]["issue_status"];
type IssuePriority = Database["public"]["Enums"]["issue_priority"];
type IssueSeverity = Database["public"]["Enums"]["issue_severity"];

type InfraIssueRow = Database["public"]["Tables"]["issues"]["Row"] & {
  reporter_profile?: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name" | "email"
  > | null;
  decided_by_profile?: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name" | "email"
  > | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name"> | null;
  district?: {
    id: string;
    district_name: string;
    state_name: string;
  } | null;
};

type AssessmentSummary = {
  id: string;
  issue_id: string;
  assessment_version: number;
  data_completeness_score: number | null;
  feasibility_indicators: Record<string, unknown> | null;
  created_at: string;
};

type DecisionSummary = {
  id: string;
  issue_id: string;
  decision: "ACCEPTED" | "DEFERRED" | "REJECTED";
  citizen_safe_summary: string;
  decided_by: string;
  decided_at: string;
  decided_by_profile?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
};

type FilterStatusTab = "all" | "awaiting" | "passed" | "not_passed" | "missing_context";
type SortOption = "newest" | "oldest" | "completeness_desc" | "completeness_asc" | "urgency";

export function AdminInfrastructurePage() {
  const { profile } = useAppSession();

  const [issues, setIssues] = useState<InfraIssueRow[]>([]);
  const [assessmentsMap, setAssessmentsMap] = useState<Record<string, AssessmentSummary>>({});
  const [decisionsMap, setDecisionsMap] = useState<Record<string, DecisionSummary>>({});
  const [districtsList, setDistrictsList] = useState<CanonicalDistrictOption[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Filter & Search Controls
  const [statusTab, setStatusTab] = useState<FilterStatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStateFilter, setSelectedStateFilter] = useState("");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Load Reference Data (Districts & Departments)
  useEffect(() => {
    let active = true;
    async function loadReferences() {
      try {
        const [districts, { data: depts }] = await Promise.all([
          fetchCanonicalDistricts(supabase),
          supabase.from("departments").select("id, name").order("name"),
        ]);
        if (active) {
          setDistrictsList(districts);
          if (depts) setDepartmentsList(depts);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Error loading reference data:", err);
      }
    }
    void loadReferences();
    return () => {
      active = false;
    };
  }, []);

  // Load Infrastructure Issues and associated assessments/decisions
  useEffect(() => {
    let active = true;
    async function loadInfrastructureData() {
      setLoading(true);
      setError(null);

      try {
        // Query issues that have been classified as INFRASTRUCTURE, or are in infrastructure workflow statuses
        const { data: issuesData, error: issuesErr } = await supabase
          .from("issues")
          .select(`
            *,
            reporter_profile:reporter_profile_id(id, full_name, email),
            decided_by_profile:classification_decided_by(id, full_name, email),
            department:department_id(id, name),
            district:district_id(id, district_name, state_name)
          `)
          .or(
            "final_issue_type.eq.INFRASTRUCTURE,status.in.(CLASSIFIED_INFRASTRUCTURE,INFRASTRUCTURE_REVIEW,INFRASTRUCTURE_ACCEPTED,INFRASTRUCTURE_REJECTED)"
          )
          .order("created_at", { ascending: false });

        if (issuesErr) throw issuesErr;

        const infraIssues = (issuesData || []) as InfraIssueRow[];

        if (infraIssues.length > 0) {
          const issueIds = infraIssues.map((i) => i.id);

          // Batch fetch latest assessment snapshots
          const [assessmentsRes, decisionsRes] = await Promise.all([
            supabase
              .from("infrastructure_assessments")
              .select("id, issue_id, assessment_version, data_completeness_score, feasibility_indicators, created_at")
              .in("issue_id", issueIds)
              .eq("is_latest", true),
            supabase
              .from("infrastructure_decisions")
              .select(`
                id,
                issue_id,
                decision,
                citizen_safe_summary,
                decided_by,
                decided_at,
                decided_by_profile:decided_by(id, full_name, email)
              `)
              .in("issue_id", issueIds)
              .order("decided_at", { ascending: false }),
          ]);

          const aMap: Record<string, AssessmentSummary> = {};
          const rawAssessments = (assessmentsRes.data || []) as unknown as AssessmentSummary[];
          for (const item of rawAssessments) {
            aMap[item.issue_id] = item;
          }

          const dMap: Record<string, DecisionSummary> = {};
          const rawDecisions = (decisionsRes.data || []) as unknown as DecisionSummary[];
          for (const item of rawDecisions) {
            if (!dMap[item.issue_id]) {
              dMap[item.issue_id] = item;
            }
          }

          if (active) {
            setIssues(infraIssues);
            setAssessmentsMap(aMap);
            setDecisionsMap(dMap);
          }
        } else {
          if (active) {
            setIssues([]);
            setAssessmentsMap({});
            setDecisionsMap({});
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Error loading infrastructure issues:", err);
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load infrastructure issues.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadInfrastructureData();
    return () => {
      active = false;
    };
  }, [refreshNonce]);

  // Unique States list for filter
  const uniqueStates = useMemo(() => {
    const states = Array.from(new Set(districtsList.map((d) => d.state_name))).filter(Boolean);
    return states.sort((a, b) => a.localeCompare(b));
  }, [districtsList]);

  // Filtered districts for district dropdown
  const filteredDistrictOptions = useMemo(() => {
    if (!selectedStateFilter) return districtsList;
    return districtsList.filter((d) => d.state_name === selectedStateFilter);
  }, [districtsList, selectedStateFilter]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = issues.length;
    const awaitingDecision = issues.filter(
      (i) => i.status === "CLASSIFIED_INFRASTRUCTURE" || i.status === "INFRASTRUCTURE_REVIEW"
    ).length;
    const passed = issues.filter((i) => i.status === "INFRASTRUCTURE_ACCEPTED").length;
    const notPassed = issues.filter((i) => i.status === "INFRASTRUCTURE_REJECTED").length;
    const missingContext = issues.filter((i) => !i.district_id || !i.department_id).length;

    return {
      total,
      awaitingDecision,
      passed,
      notPassed,
      missingContext,
    };
  }, [issues]);

  // Filtered and Sorted Issues List
  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => {
        // Status filter
        if (statusTab === "awaiting") {
          if (issue.status !== "CLASSIFIED_INFRASTRUCTURE" && issue.status !== "INFRASTRUCTURE_REVIEW") {
            return false;
          }
        } else if (statusTab === "passed") {
          if (issue.status !== "INFRASTRUCTURE_ACCEPTED") return false;
        } else if (statusTab === "not_passed") {
          if (issue.status !== "INFRASTRUCTURE_REJECTED") return false;
        } else if (statusTab === "missing_context") {
          if (issue.district_id && issue.department_id) return false;
        }

        // State filter
        if (selectedStateFilter) {
          if (issue.district?.state_name !== selectedStateFilter) return false;
        }

        // District filter
        if (selectedDistrictFilter) {
          if (issue.district_id !== selectedDistrictFilter) return false;
        }

        // Department filter
        if (selectedDepartmentFilter) {
          if (issue.department_id !== selectedDepartmentFilter) return false;
        }

        // Text Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = issue.title.toLowerCase().includes(q);
          const matchDesc = issue.description.toLowerCase().includes(q);
          const matchId = issue.id.toLowerCase().includes(q);
          const matchDistrict = (issue.district?.district_name || "").toLowerCase().includes(q);
          const matchState = (issue.district?.state_name || "").toLowerCase().includes(q);
          const matchLocation = `${issue.location_text || ""} ${issue.address_text || ""}`
            .toLowerCase()
            .includes(q);
          const matchReporter = (issue.reporter_profile?.full_name || "").toLowerCase().includes(q);

          if (
            !matchTitle &&
            !matchDesc &&
            !matchId &&
            !matchDistrict &&
            !matchState &&
            !matchLocation &&
            !matchReporter
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const assessmentA = assessmentsMap[a.id];
        const assessmentB = assessmentsMap[b.id];

        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "completeness_desc") {
          const scoreA = assessmentA?.data_completeness_score ?? 0;
          const scoreB = assessmentB?.data_completeness_score ?? 0;
          return scoreB - scoreA;
        }
        if (sortBy === "completeness_asc") {
          const scoreA = assessmentA?.data_completeness_score ?? 0;
          const scoreB = assessmentB?.data_completeness_score ?? 0;
          return scoreA - scoreB;
        }
        if (sortBy === "urgency") {
          const priorityRank: Record<IssuePriority, number> = {
            URGENT: 3,
            HIGH: 2,
            MEDIUM: 1,
            LOW: 0,
          };
          return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
        }
        return 0;
      });
  }, [
    issues,
    statusTab,
    selectedStateFilter,
    selectedDistrictFilter,
    selectedDepartmentFilter,
    searchQuery,
    sortBy,
    assessmentsMap,
  ]);

  function handleRefresh() {
    setRefreshing(true);
    setRefreshNonce((n) => n + 1);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        tag="CAPITAL INFRASTRUCTURE TRACK"
        title="Infrastructure Decisions & Assessments"
        description="Review multi-dataset (D1–D7) planning context dossiers, evaluate district readiness, and record authoritative PASS / NOT PASSED capital project decisions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/admin/classification" className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Classification Triage</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card
          onClick={() => setStatusTab("all")}
          className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
            statusTab === "all" ? "ring-2 ring-primary/40 border-primary" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Total Cases</span>
            <Building2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{metrics.total}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">All infrastructure issues</p>
        </Card>

        <Card
          onClick={() => setStatusTab("awaiting")}
          className={`p-4 cursor-pointer transition-all hover:border-amber-500/50 ${
            statusTab === "awaiting" ? "ring-2 ring-amber-500/40 border-amber-500 bg-amber-50/20" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 uppercase">Awaiting Decision</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950">{metrics.awaitingDecision}</div>
          <p className="mt-1 text-[11px] text-amber-800/80">Pending Admin evaluation</p>
        </Card>

        <Card
          onClick={() => setStatusTab("passed")}
          className={`p-4 cursor-pointer transition-all hover:border-emerald-500/50 ${
            statusTab === "passed" ? "ring-2 ring-emerald-500/40 border-emerald-500 bg-emerald-50/20" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 uppercase">Passed (Approved)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-950">{metrics.passed}</div>
          <p className="mt-1 text-[11px] text-emerald-800/80">Capital scheme approved</p>
        </Card>

        <Card
          onClick={() => setStatusTab("not_passed")}
          className={`p-4 cursor-pointer transition-all hover:border-rose-500/50 ${
            statusTab === "not_passed" ? "ring-2 ring-rose-500/40 border-rose-500 bg-rose-50/20" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-900 uppercase">Not Passed</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-950">{metrics.notPassed}</div>
          <p className="mt-1 text-[11px] text-rose-800/80">Deferred or not feasible</p>
        </Card>

        <Card
          onClick={() => setStatusTab("missing_context")}
          className={`p-4 cursor-pointer transition-all hover:border-orange-500/50 col-span-2 sm:col-span-1 ${
            statusTab === "missing_context"
              ? "ring-2 ring-orange-500/40 border-orange-500 bg-orange-50/20"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-900 uppercase">Needs Context</span>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-orange-950">{metrics.missingContext}</div>
          <p className="mt-1 text-[11px] text-orange-800/80">Missing district or dept</p>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card className="p-4 sm:p-5 space-y-4">
        {/* Status Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              statusTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            All Issues ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("awaiting")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusTab === "awaiting"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100"
            }`}
          >
            <Clock className="h-3 w-3" />
            Awaiting Decision ({metrics.awaitingDecision})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("passed")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusTab === "passed"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Passed / Approved ({metrics.passed})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("not_passed")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusTab === "not_passed"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-50 text-rose-900 hover:bg-rose-100"
            }`}
          >
            <XCircle className="h-3 w-3" />
            Not Passed ({metrics.notPassed})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("missing_context")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusTab === "missing_context"
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-orange-50 text-orange-900 hover:bg-orange-100"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Needs District / Dept ({metrics.missingContext})
          </button>
        </div>

        {/* Multi-criteria filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, ref ID, district, reporter, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-border/80 bg-background text-xs sm:text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <div>
            <select
              value={selectedStateFilter}
              onChange={(e) => {
                setSelectedStateFilter(e.target.value);
                setSelectedDistrictFilter("");
              }}
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All States / UTs ({uniqueStates.length})</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <select
              value={selectedDistrictFilter}
              onChange={(e) => setSelectedDistrictFilter(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Districts ({filteredDistrictOptions.length})</option>
              {filteredDistrictOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.district_name} {d.state_name ? `(${d.state_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="completeness_desc">Completeness: Highest First</option>
              <option value="completeness_asc">Completeness: Lowest First</option>
              <option value="urgency">Priority: Highest Urgency</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/90 px-6 py-4 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Loading infrastructure dossiers and assessment records...
            </span>
          </div>
        </div>
      ) : error ? (
        <Card className="border-red-300 bg-red-50 p-6 text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Failed to Load Infrastructure Issues</h3>
              <p className="mt-1 text-xs">{error}</p>
              <Button size="sm" variant="outline" onClick={handleRefresh} className="mt-3">
                Retry
              </Button>
            </div>
          </div>
        </Card>
      ) : filteredIssues.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Infrastructure Issues Found"
          description={
            searchQuery || selectedStateFilter || selectedDistrictFilter || statusTab !== "all"
              ? "No infrastructure cases match your current filters. Try resetting the filters."
              : "No issues are currently classified under the Infrastructure Development track."
          }
          action={
            searchQuery || selectedStateFilter || selectedDistrictFilter || statusTab !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusTab("all");
                  setSearchQuery("");
                  setSelectedStateFilter("");
                  setSelectedDistrictFilter("");
                  setSelectedDepartmentFilter("");
                }}
              >
                Reset All Filters
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/app/admin/classification">Go to Classification Triage</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong>{filteredIssues.length}</strong> of {issues.length} infrastructure cases
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredIssues.map((issue) => {
              const assessment = assessmentsMap[issue.id];
              const decision = decisionsMap[issue.id];

              const isDecided = issue.status === "INFRASTRUCTURE_ACCEPTED" || issue.status === "INFRASTRUCTURE_REJECTED";
              const isPassed = issue.status === "INFRASTRUCTURE_ACCEPTED";
              const isRejected = issue.status === "INFRASTRUCTURE_REJECTED";
              const isAwaitingDecision = !isDecided;
              const hasDistrict = Boolean(issue.district_id);
              const hasDepartment = Boolean(issue.department_id);

              return (
                <Card
                  key={issue.id}
                  className="overflow-hidden border border-border/80 hover:border-border transition shadow-sm hover:shadow-md"
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Top Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            #{issue.id.slice(0, 8).toUpperCase()}
                          </span>

                          {/* Workflow Status Badge */}
                          {isPassed ? (
                            <Badge variant="emerald" size="sm" className="font-bold gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              PASSED / APPROVED
                            </Badge>
                          ) : isRejected ? (
                            <Badge variant="rose" size="sm" className="font-bold gap-1">
                              <XCircle className="h-3 w-3" />
                              NOT PASSED / REJECTED
                            </Badge>
                          ) : (
                            <Badge variant="amber" size="sm" className="font-bold gap-1">
                              <Clock className="h-3 w-3" />
                              AWAITING ADMIN DECISION
                            </Badge>
                          )}

                          {/* Severity & Priority */}
                          <Badge variant="outline" size="sm" className="text-[11px]">
                            {issue.category || "Infrastructure"}
                          </Badge>
                          {issue.priority === "URGENT" && (
                            <Badge variant="rose" size="sm" className="text-[10px]">
                              URGENT
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                          {issue.title}
                        </h3>
                      </div>

                      {/* Primary CTA */}
                      <div className="shrink-0 flex items-center gap-2">
                        <Button asChild size="sm" className="gap-2 font-semibold">
                          <Link to={`/app/admin/infrastructure/${issue.id}`}>
                            <FileCheck2 className="h-4 w-4" />
                            <span>
                              {isDecided ? "View Dossier & Decision" : "Review Assessment & Decide"}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Description excerpt */}
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {issue.description}
                    </p>

                    {/* Metadata Strip: District, Department, Location, Reporter */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/60 text-xs">
                      {/* District Context */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-indigo-600" />
                          Canonical District
                        </span>
                        {issue.district ? (
                          <div className="font-semibold text-foreground">
                            {issue.district.district_name}, {issue.district.state_name}
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              ({issue.district.id}) • {issue.district_resolution_method || "CITIZEN_SELECTED"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-amber-800 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            <span>District Not Assigned</span>
                          </div>
                        )}
                      </div>

                      {/* Department Context */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-primary" />
                          Department
                        </span>
                        {issue.department ? (
                          <div className="font-semibold text-foreground truncate">
                            {issue.department.name}
                          </div>
                        ) : (
                          <div className="text-amber-800 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            <span>Department Unassigned</span>
                          </div>
                        )}
                      </div>

                      {/* Assessment Readiness */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <BarChart3 className="h-3 w-3 text-emerald-600" />
                          D1–D7 Context Snapshot
                        </span>
                        {assessment ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="teal" size="sm" className="font-mono text-[10px]">
                                v{assessment.assessment_version}
                              </Badge>
                              <span className="font-bold text-foreground">
                                {assessment.data_completeness_score ?? 0}% completeness
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            <span>Snapshot not initialized</span>
                          </div>
                        )}
                      </div>

                      {/* Reporter & Date */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Reported
                        </span>
                        <div className="font-medium text-foreground">
                          {formatCitizenIssueDate(issue.created_at)}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          By: {issue.reporter_profile?.full_name || issue.reporter_profile?.email || "Citizen"}
                        </div>
                      </div>
                    </div>

                    {/* Decision Summary Footer (if decided) */}
                    {decision ? (
                      <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isPassed
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                          : "bg-rose-50/70 border-rose-200 text-rose-950"
                      }`}>
                        <div className="space-y-0.5">
                          <span className="font-bold flex items-center gap-1.5">
                            {isPassed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                            )}
                            Admin Decision: {isPassed ? "PASSED (Capital Scheme Approved)" : "NOT PASSED (Deferred / Not Feasible)"}
                          </span>
                          <p className="text-[11px] opacity-90 line-clamp-1">
                            {decision.citizen_safe_summary}
                          </p>
                        </div>
                        <div className="text-[10px] opacity-80 shrink-0 text-right">
                          Decided: {formatCitizenIssueDate(decision.decided_at)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminInfrastructurePage;
