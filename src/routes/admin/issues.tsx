import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Clock3,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatAdminDate,
  formatAdminDateTime,
  formatAdminIssueStatusLabel,
  getAdminIssueStatusTone,
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
  { key: "all", label: "All Statuses" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "AI_ANALYZED", label: "AI Analyzed" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "VERIFIED", label: "Verified" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CITIZEN_VERIFIED", label: "Citizen Verified" },
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
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
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Issue Monitoring Unavailable"
        description={sessionProblem ?? error ?? "Unable to load platform issues."}
        action={
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Issue Monitoring"
        title="Platform Issues"
        description="Inspect all platform reports, filter by department lifecycle, and track operational progress."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="default" variant="outline">
              <Link to="/app/admin/analytics">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Analytics
              </Link>
            </Button>
            <Button onClick={() => setRefreshNonce((value) => value + 1)} size="sm" type="button" variant="ghost">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* 2. Issue Volume Summary Metrics */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Issues", value: issueStats.total, icon: Layers, tone: "info" as const },
          { label: "Pending", value: issueStats.pending, icon: Clock3, tone: "warning" as const },
          { label: "In Progress", value: issueStats.active, icon: RefreshCw, tone: "danger" as const },
          { label: "Under Review", value: issueStats.underReview, icon: ShieldCheck, tone: "default" as const },
          { label: "Critical Priority", value: issueStats.critical, icon: ShieldAlert, tone: "danger" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border border-border/80 bg-surface/95 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    tone === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : tone === "danger"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Search & Filter Bar */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-4 text-xs sm:text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search title, description, category, citizen, location, or worker..."
                  value={search}
                />
              </div>

              {/* Desktop Filters */}
              <div className="hidden lg:flex items-center gap-2">
                <select
                  className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50"
                  onChange={(event) => {
                    setStatusFilter(event.target.value as "all" | Database["public"]["Enums"]["issue_status"]);
                    setPage(1);
                  }}
                  value={statusFilter}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50"
                  onChange={(event) => {
                    setPriorityFilter(event.target.value as "all" | Database["public"]["Enums"]["issue_priority"]);
                    setPage(1);
                  }}
                  value={priorityFilter}
                >
                  <option value="all">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>

                <select
                  className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50"
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setPage(1);
                  }}
                  value={categoryFilter}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "all" ? "All Categories" : cat}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50"
                  onChange={(event) => {
                    setSortOrder(event.target.value as SortOrder);
                    setPage(1);
                  }}
                  value={sortOrder}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="updated">Recently Updated</option>
                  <option value="priority">Priority First</option>
                  <option value="severity">Severity First</option>
                </select>
              </div>

              {/* Mobile Filter Button */}
              <div className="flex lg:hidden items-center justify-between gap-2">
                <Button
                  onClick={() => setMobileFilterOpen(true)}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  Filters & Sorting
                  {hasFiltersActive && (
                    <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-primary-foreground font-bold">
                      Active
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Active Filter Counter & Clear */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
              <span>{filteredIssues.length} issues found</span>
              {hasFiltersActive && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setCategoryFilter("all");
                    setSortOrder("newest");
                    setPage(1);
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Mobile Filters Modal Dialog */}
      <Dialog
        description="Refine issues by status, priority, category, and sort order"
        onClose={() => setMobileFilterOpen(false)}
        open={mobileFilterOpen}
        title="Filter & Sort Issues"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | Database["public"]["Enums"]["issue_status"]);
                setPage(1);
              }}
              value={statusFilter}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Priority
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => {
                setPriorityFilter(event.target.value as "all" | Database["public"]["Enums"]["issue_priority"]);
                setPage(1);
              }}
              value={priorityFilter}
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Category
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              value={categoryFilter}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Sort Order
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => {
                setSortOrder(event.target.value as SortOrder);
                setPage(1);
              }}
              value={sortOrder}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="priority">Priority First</option>
              <option value="severity">Severity First</option>
            </select>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border/60">
            <Button
              className="flex-1"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setCategoryFilter("all");
                setSortOrder("newest");
                setPage(1);
                setMobileFilterOpen(false);
              }}
              type="button"
              variant="outline"
            >
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setMobileFilterOpen(false)} type="button">
              Apply
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 5. Issue Feed List */}
      <div className="space-y-4">
        {visibleIssues.length > 0 ? (
          visibleIssues.map((issue) => {
            const assignment = getIssueAssignment(issue);
            const thumbnail = pickCitizenIssueThumbnail(issue);
            const statusTone = getAdminIssueStatusTone(issue.status);
            const priorityTone = getAdminPriorityTone(issue.priority);
            const severityTone = getAdminSeverityTone(issue.severity);

            return (
              <Card key={issue.id} className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden hover:border-primary/40 transition">
                <div className="grid gap-5 p-5 md:grid-cols-[200px_1fr] items-start">
                  {/* Issue Image Thumbnail */}
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/40 aspect-[4/3] md:aspect-square flex items-center justify-center">
                    <IssueImage alt={issue.title} className="h-full w-full object-cover" src={thumbnail} variant="card" />
                  </div>

                  {/* Issue Content & Meta */}
                  <div className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={statusTone} size="sm">
                            {formatAdminIssueStatusLabel(issue.status)}
                          </Badge>
                          <Badge variant={priorityTone} size="sm">
                            Priority: {issue.priority}
                          </Badge>
                          <Badge variant={severityTone} size="sm">
                            Severity: {issue.severity}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {issue.category}
                          </Badge>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground mt-1.5">{issue.title}</h3>
                      </div>

                      <Button asChild size="sm" variant="default" className="shrink-0 text-xs">
                        <Link to={`/app/admin/issues/${issue.id}`}>
                          Inspect Issue
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {issue.description}
                    </p>

                    {/* Metadata 4-Grid */}
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-border/60 text-xs">
                      <div className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> Citizen
                        </p>
                        <p className="font-medium text-foreground truncate mt-0.5">
                          {issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Anonymous"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Location
                        </p>
                        <p className="font-medium text-foreground truncate mt-0.5">
                          {issue.address_text?.trim() || issue.location_text?.trim() || "Coordinates only"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Department
                        </p>
                        <p className="font-medium text-foreground truncate mt-0.5">
                          {assignment?.department?.name || "Unassigned"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Created
                        </p>
                        <p className="font-medium text-foreground truncate mt-0.5">
                          {formatAdminDate(issue.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span>ID: {issue.id.slice(0, 8)}</span>
                      <span>{issue.issue_images?.length ?? 0} attachment(s)</span>
                      <span>Updated {formatAdminDateTime(issue.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Layers}
            title="No Issues Found"
            description={hasFiltersActive ? "No platform issues match your current filters." : "No platform issues are logged yet."}
            action={
              hasFiltersActive ? (
                <Button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setCategoryFilter("all");
                    setSortOrder("newest");
                    setPage(1);
                  }}
                  size="sm"
                  type="button"
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* 6. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredIssues.length)} of {filteredIssues.length} issues
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Previous
            </Button>
            <span className="rounded-xl border border-border/70 bg-surface px-3 py-1.5 text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

