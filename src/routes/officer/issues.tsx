import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Filter,
  Search,
  SlidersHorizontal,
  SquareArrowOutUpRight,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
import {
  formatOfficerAssignmentSummary,
  formatOfficerIssueDateTime,
  formatOfficerIssueCoordinates,
  getOfficerIssuePriorityTone,
  getOfficerIssueSeverityLabel,
  getOfficerIssueSeverityTone,
  getOfficerIssueStatusFilterBucket,
  getOfficerIssueStatusLabel,
  getOfficerIssueStatusOptions,
  getOfficerIssueStatusTone,
  pickOfficerIssueThumbnail,
  type OfficerIssueAiAnalysisRow,
  type OfficerIssueAssignmentRow,
  type OfficerIssueImageRow,
  type OfficerIssuePriority,
  type OfficerIssueSeverity,
} from "@/lib/officer-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type SortOrder = "newest" | "oldest" | "priority" | "severity";

type OfficerIssueListRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  | "id"
  | "title"
  | "description"
  | "category"
  | "severity"
  | "priority"
  | "status"
  | "latitude"
  | "longitude"
  | "location_text"
  | "address_text"
  | "created_at"
  | "updated_at"
> & {
  issue_images?: OfficerIssueImageRow[] | null;
  issue_assignments?: Array<
    OfficerIssueAssignmentRow & {
      department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name"> | null;
      worker?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
    }
  > | null;
  issue_ai_analysis?: OfficerIssueAiAnalysisRow[] | null;
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "phone"> | null;
};

type CategoryOption = { key: string; label: string };

function badgeToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
    : tone === "warning"
      ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
      : tone === "danger"
        ? "bg-red-500/10 text-red-300 ring-red-500/20"
        : tone === "info"
          ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
          : "bg-slate-500/10 text-slate-300 ring-slate-500/20";
}

function priorityRank(priority: OfficerIssuePriority) {
  return priority === "URGENT" ? 3 : priority === "HIGH" ? 2 : priority === "MEDIUM" ? 1 : 0;
}

function severityRank(severity: OfficerIssueSeverity) {
  return severity === "CRITICAL" ? 3 : severity === "HIGH" ? 2 : severity === "MEDIUM" ? 1 : 0;
}

export function OfficerIssuesPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<OfficerIssueListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReturnType<typeof getOfficerIssueStatusFilterBucket>>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | OfficerIssuePriority>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadIssues() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("issues")
        .select(
          `
          id,
          title,
          description,
          category,
          severity,
          priority,
          status,
          latitude,
          longitude,
          location_text,
          address_text,
          created_at,
          updated_at,
          issue_images(id, storage_bucket, storage_path, image_type, created_at),
          issue_assignments(
            id,
            issue_id,
            department_id,
            worker_id,
            assigned_by_profile_id,
            status,
            assigned_at,
            unassigned_at,
            department:departments(id, name),
            worker:profiles!issue_assignments_worker_id_fkey(id, full_name, email)
          ),
          issue_ai_analysis(id, provider, model, category_recommendation, severity_recommendation, priority_recommendation, department_recommendation, confidence_score, created_at),
          reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email, phone)
        `,
        )
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Officer issues load failed", loadError);
        }
        setError("Unable to load the officer queue right now.");
        setIssues([]);
        setLoading(false);
        return;
      }

      setIssues((data ?? []) as OfficerIssueListRow[]);
      setLoading(false);
    }

    void loadIssues();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const categories = useMemo<CategoryOption[]>(() => {
    const unique = new Set(issues.map((issue) => issue.category).filter(Boolean));
    return [{ key: "all", label: "All categories" }, ...Array.from(unique).sort().map((category) => ({ key: category, label: category }))];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    const nextIssues = issues.filter((issue) => {
      const assignment = issue.issue_assignments?.find((entry) => entry.unassigned_at === null) ?? issue.issue_assignments?.[0] ?? null;
      const searchFields = [
        issue.title,
        issue.description,
        issue.category,
        issue.location_text,
        issue.address_text,
        issue.reporter_profile?.full_name,
        issue.reporter_profile?.email,
        assignment?.department?.name,
        assignment?.worker?.full_name,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const matchesSearch = !query || searchFields.some((value) => value.includes(query));
      const matchesStatus = statusFilter === "all" || getOfficerIssueStatusFilterBucket(issue.status) === statusFilter;
      const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter;
      const matchesCategory = categoryFilter === "all" || issue.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    return nextIssues.sort((a, b) => {
      switch (sortOrder) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "priority":
          return priorityRank(b.priority) - priorityRank(a.priority) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "severity":
          return severityRank(b.severity) - severityRank(a.severity) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [categoryFilter, issues, priorityFilter, search, sortOrder, statusFilter]);

  const hasFiltersActive = search.trim().length > 0 || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || sortOrder !== "newest";
  const statusFilters = getOfficerIssueStatusOptions();
  const totalCount = issues.length;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setSortOrder("newest");
  }

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load officer issues</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
        <div className="border-b border-border/70 bg-gradient-to-r from-background/30 to-background/5 px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Municipal queue
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Issue Management</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Search, triage, and route live civic issues by status, priority, category, and assignment context.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-4 py-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" aria-hidden="true" />
                {filteredIssues.length} visible
              </div>
              <Button asChild>
                <Link to="/app/officer">
                  Back to dashboard
                  <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">Pending Verification</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {issues.filter((issue) => getOfficerIssueStatusFilterBucket(issue.status) === "pending").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">In Progress</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {issues.filter((issue) => getOfficerIssueStatusFilterBucket(issue.status) === "inProgress").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
          <p className="text-sm font-medium text-muted-foreground">High Priority</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {issues.filter((issue) => issue.priority === "HIGH" || issue.priority === "URGENT").length}
          </p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.75fr_0.75fr_auto]">
          <label className="relative">
            <span className="sr-only">Search issues</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border border-border/80 bg-background/50 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, location, reporter, department, or worker"
              value={search}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setStatusFilter(event.target.value as "all" | ReturnType<typeof getOfficerIssueStatusFilterBucket>)}
              value={statusFilter}
            >
              {statusFilters.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Priority</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setPriorityFilter(event.target.value as "all" | OfficerIssuePriority)}
              value={priorityFilter}
            >
              {["all", "LOW", "MEDIUM", "HIGH", "URGENT"].map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All priorities" : option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
            >
              {categories.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sort</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              value={sortOrder}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority first</option>
              <option value="severity">Severity first</option>
            </select>
          </label>

          <div className="flex items-end">
            <Button disabled={!hasFiltersActive} onClick={clearFilters} type="button" variant="outline">
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </div>
      </section>

      {filteredIssues.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Showing {filteredIssues.length} of {totalCount} issues
              </p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Municipal operations queue</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {sortOrder === "newest"
                ? "Newest first"
                : sortOrder === "oldest"
                  ? "Oldest first"
                  : sortOrder === "priority"
                    ? "Priority first"
                    : "Severity first"}
            </div>
          </div>

          <div className="grid gap-4">
            {filteredIssues.map((issue) => {
              const assignment = issue.issue_assignments?.find((entry) => entry.unassigned_at === null) ?? issue.issue_assignments?.[0] ?? null;
              const assignmentSummary = formatOfficerAssignmentSummary(assignment);
              const thumb = pickOfficerIssueThumbnail(issue);
              const location = formatOfficerIssueCoordinates(issue.latitude, issue.longitude);
              const aiAnalysis = issue.issue_ai_analysis?.[0] ?? null;

              return (
                <article key={issue.id} className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-5 shadow-lg shadow-black/20">
                  <div className="grid gap-5 lg:grid-cols-[0.22fr_1fr]">
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                      {thumb ? (
                        <IssueImage alt={issue.title} className="min-h-[10rem] rounded-none" src={thumb} variant="card" />
                      ) : (
                        <div className="flex min-h-[10rem] items-center justify-center px-4 py-6 text-center">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">No image</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">Citizen photo not attached.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getOfficerIssueStatusTone(issue.status))}`}>
                              {getOfficerIssueStatusLabel(issue.status)}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getOfficerIssuePriorityTone(issue.priority))}`}>
                              Priority {issue.priority}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(getOfficerIssueSeverityTone(issue.severity))}`}>
                              Severity {getOfficerIssueSeverityLabel(issue.severity)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {issue.category}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-2xl font-semibold tracking-tight text-foreground">{issue.title}</h4>
                            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
                          </div>
                        </div>

                        <Button asChild size="sm" variant="outline">
                          <Link to={`/app/officer/issues/${issue.id}`}>
                            Open issue
                            <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reported</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{formatOfficerIssueDateTime(issue.created_at)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{location ?? "No GPS captured"}</p>
                          {issue.location_text || issue.address_text ? (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.address_text?.trim() || issue.location_text?.trim()}</p>
                          ) : null}
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Department</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{assignmentSummary.departmentLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Worker</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{assignmentSummary.workerLabel}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Citizen / report</p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Reporter profile unavailable"}
                          </p>
                          {issue.reporter_profile?.phone ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.reporter_profile.phone}</p> : null}
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">AI recommendation</p>
                          {aiAnalysis ? (
                            <div className="mt-2 grid gap-2 text-sm">
                              <p className="text-foreground">
                                Category: <span className="text-muted-foreground">{aiAnalysis.category_recommendation || "Not provided"}</span>
                              </p>
                              <p className="text-foreground">
                                Severity: <span className="text-muted-foreground">{aiAnalysis.severity_recommendation || "Not provided"}</span>
                              </p>
                              <p className="text-foreground">
                                Priority: <span className="text-muted-foreground">{aiAnalysis.priority_recommendation || "Not provided"}</span>
                              </p>
                              <p className="text-foreground">
                                Department: <span className="text-muted-foreground">{aiAnalysis.department_recommendation || "Not provided"}</span>
                              </p>
                              <p className="text-foreground">
                                Confidence: <span className="text-muted-foreground">{aiAnalysis.confidence_score != null ? `${Math.round(aiAnalysis.confidence_score * 100)}%` : "Not provided"}</span>
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">AI analysis pending.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <CitizenEmptyState
          description={
            totalCount === 0
              ? "The municipal queue is empty right now. Once citizens submit reports, they will appear here for verification and routing."
              : hasFiltersActive
                ? "No issues match the current search or filter settings. Try clearing filters."
                : "No issues are available right now."
          }
          primaryActionHref="/app/officer"
          primaryActionLabel="Back to Dashboard"
          secondaryActionHref="/app/officer/issues"
          secondaryActionLabel="Refresh queue"
          title={totalCount === 0 ? "No issues yet" : hasFiltersActive ? "No issues match your filters" : "No issues available"}
        />
      )}
    </div>
  );
}
