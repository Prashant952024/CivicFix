import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Filter, Search, SlidersHorizontal, SortAsc, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
import {
  formatAdminDate,
  formatAdminDateTime,
  formatAdminIssueStatusLabel,
  getAdminIssueStatusTone,
  getAdminInitials,
  getAdminPriorityTone,
  getAdminSeverityTone,
} from "@/lib/admin";
import { pickCitizenIssueThumbnail } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type AssignmentRow = Database["public"]["Tables"]["issue_assignments"]["Row"] & {
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name"> | null;
  worker?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  | "id"
  | "reporter_profile_id"
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
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "phone"> | null;
  issue_images?: Database["public"]["Tables"]["issue_images"]["Row"][] | null;
  issue_assignments?: AssignmentRow[] | null;
};

type SortOrder = "newest" | "oldest" | "priority" | "severity" | "updated";

const PAGE_SIZE = 8;

const STATUS_OPTIONS: Array<{ key: "all" | Database["public"]["Enums"]["issue_status"]; label: string }> = [
  { key: "all", label: "All statuses" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "AI_ANALYZED", label: "AI analyzed" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "VERIFIED", label: "Verified" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CITIZEN_VERIFIED", label: "Citizen verified" },
  { key: "REOPENED", label: "Reopened" },
];

function priorityRank(priority: Database["public"]["Enums"]["issue_priority"]) {
  return priority === "URGENT" ? 3 : priority === "HIGH" ? 2 : priority === "MEDIUM" ? 1 : 0;
}

function severityRank(severity: Database["public"]["Enums"]["issue_severity"]) {
  return severity === "CRITICAL" ? 3 : severity === "HIGH" ? 2 : severity === "MEDIUM" ? 1 : 0;
}

function getIssueAssignment(issue: IssueRow) {
  return issue.issue_assignments?.find((entry) => entry.unassigned_at === null) ?? issue.issue_assignments?.[0] ?? null;
}

function toneBadgeClass(tone: "default" | "success" | "warning" | "danger" | "info") {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "warning":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "danger":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "info":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "default":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function metricToneClass(tone: "default" | "success" | "warning" | "danger" | "info") {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "warning":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "danger":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "info":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "default":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function AdminIssuesPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Database["public"]["Enums"]["issue_status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Database["public"]["Enums"]["issue_priority"]>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
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
          reporter_profile_id,
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
          issue_images(id, issue_id, storage_bucket, storage_path, image_type, uploaded_by_profile_id, created_at),
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
          reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email, phone)
        `,
        )
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Admin issues load failed", loadError);
        }
        setError("Unable to load platform issues.");
        setLoading(false);
        return;
      }

      setIssues(data ?? []);
      setLoading(false);
    }

    void loadIssues();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshNonce, sessionStatus]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(issues.map((issue) => issue.category).filter(Boolean))).sort();
    return ["all", ...unique];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    const nextIssues = issues.filter((issue) => {
      const assignment = getIssueAssignment(issue);
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
        assignment?.worker?.email,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const matchesSearch = !query || searchFields.some((value) => value.includes(query));
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
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
        case "updated":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [categoryFilter, issues, priorityFilter, search, sortOrder, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleIssues = filteredIssues.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const issueStats = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter((issue) => ["SUBMITTED", "AI_ANALYZED"].includes(issue.status)).length;
    const active = issues.filter((issue) => ["ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(issue.status)).length;
    const underReview = issues.filter((issue) => issue.status === "UNDER_REVIEW").length;
    const resolved = issues.filter((issue) => ["RESOLVED", "CITIZEN_VERIFIED"].includes(issue.status)).length;
    const critical = issues.filter((issue) => issue.severity === "CRITICAL").length;
    return { total, pending, active, underReview, resolved, critical };
  }, [issues]);

  const hasFiltersActive =
    search.trim().length > 0 || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || sortOrder !== "newest";

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load issues</h2>
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
        <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.10)_50%,rgba(124,58,237,0.08)_100%)] p-6 shadow-lg shadow-teal-950/10">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-60 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.13)_0%,rgba(2,132,199,0.11)_45%,rgba(124,58,237,0.08)_100%)] shadow-2xl shadow-teal-950/12">
        <div className="pointer-events-none absolute -left-10 top-0 h-36 w-36 rounded-full bg-sky-400/18 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-12 h-44 w-44 rounded-full bg-rose-400/14 blur-3xl" aria-hidden="true" />
        <div className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.86)_0%,rgba(247,250,248,0.76)_100%)] px-6 py-6 backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                Platform issue monitoring
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">All civic issues</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Search and inspect every issue exposed to Admin, including image evidence, assignment context, and lifecycle metadata.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a href="#issue-grid">Jump to issues</a>
              </Button>
              <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button" variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Issues", value: issueStats.total, icon: Filter, tone: "info" as const },
          { label: "Pending", value: issueStats.pending, icon: Filter, tone: "warning" as const },
          { label: "Active", value: issueStats.active, icon: RefreshCw, tone: "danger" as const },
          { label: "Under Review", value: issueStats.underReview, icon: SlidersHorizontal, tone: "default" as const },
          { label: "Critical", value: issueStats.critical, icon: SortAsc, tone: "danger" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-teal-950/5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span
                className={["inline-flex h-9 w-9 items-center justify-center rounded-full ring-1", metricToneClass(tone)].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(239,246,244,0.9)_100%)] p-5 shadow-lg shadow-teal-950/10">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.75fr_auto]">
          <label className="relative">
            <span className="sr-only">Search issues</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-2xl border border-border/80 bg-white/80 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, description, category, reporter, location, worker, or department"
              value={search}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | Database["public"]["Enums"]["issue_status"]);
                setPage(1);
              }}
              value={statusFilter}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Priority</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setPriorityFilter(event.target.value as "all" | Database["public"]["Enums"]["issue_priority"]);
                setPage(1);
              }}
              value={priorityFilter}
            >
              <option value="all">All priorities</option>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              value={categoryFilter}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All categories" : category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sort</span>
            <select
              className="w-full rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => {
                setSortOrder(event.target.value as SortOrder);
                setPage(1);
              }}
              value={sortOrder}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="updated">Recently updated</option>
              <option value="priority">Priority first</option>
              <option value="severity">Severity first</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-elevated px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {filteredIssues.length} visible
          </div>
          {hasFiltersActive ? (
            <Button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setCategoryFilter("all");
                setSortOrder("newest");
              }}
              type="button"
              variant="outline"
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </section>

      <section id="issue-grid" className="space-y-4">
        {visibleIssues.length > 0 ? (
          visibleIssues.map((issue) => {
            const assignment = getIssueAssignment(issue);
            const thumbnail = pickCitizenIssueThumbnail(issue);
            return (
              <article
                key={issue.id}
                className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-teal-950/5"
              >
                <div className="h-1 bg-gradient-to-r from-teal-500 via-sky-400 to-violet-500" />
                <div className="grid gap-5 p-5 lg:grid-cols-[0.34fr_1fr]">
                  <div className="overflow-hidden rounded-2xl border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(2,132,199,0.08)_100%)]">
                    <IssueImage alt={issue.title} className="rounded-none" src={thumbnail} variant="card" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${toneBadgeClass(getAdminIssueStatusTone(issue.status))}`}>
                            {formatAdminIssueStatusLabel(issue.status)}
                          </span>
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${toneBadgeClass(getAdminPriorityTone(issue.priority))}`}>
                            Priority {issue.priority}
                          </span>
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${toneBadgeClass(getAdminSeverityTone(issue.severity))}`}>
                            Severity {issue.severity}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {issue.category}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-2xl font-semibold tracking-tight text-foreground">{issue.title}</h4>
                          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Citizen</p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Reporter unavailable"}
                        </p>
                        {issue.reporter_profile?.phone ? <p className="mt-1 text-sm text-muted-foreground">{issue.reporter_profile.phone}</p> : null}
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{issue.address_text?.trim() || issue.location_text?.trim() || "No location text"}</p>
                        {issue.latitude && issue.longitude ? <p className="mt-1 text-sm text-muted-foreground">{issue.latitude}, {issue.longitude}</p> : null}
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assignment</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{assignment?.department?.name || "No department"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{assignment?.worker?.full_name || assignment?.worker?.email || "No worker assigned"}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dates</p>
                        <p className="mt-2 text-sm font-medium text-foreground">Created {formatAdminDate(issue.created_at)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Updated {formatAdminDateTime(issue.updated_at)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Issue ID {issue.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{issue.issue_images?.length ?? 0} image attachment(s)</span>
                      <span>•</span>
                      <span>{getAdminInitials(issue.reporter_profile?.full_name || issue.reporter_profile?.email || "Citizen")}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/app/admin/issues/${issue.id}`}>Inspect issue</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-8 text-center">
            <p className="text-lg font-semibold text-foreground">No issues match the current filters.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {hasFiltersActive
                ? "Try clearing the search or narrowing fewer filters at once."
                : "No platform issues are available yet."}
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {visibleIssues.length} of {filteredIssues.length} issues
        </p>
        <div className="flex items-center gap-2">
          <Button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button" variant="outline">
            Previous
          </Button>
          <span className="rounded-full border border-border/70 bg-surface-elevated px-3 py-2 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button" variant="outline">
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
