import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  MapPin,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatOfficerAssignmentSummary,
  formatOfficerIssueDateTime,
  formatOfficerIssueCoordinates,
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
    setMobileFiltersOpen(false);
  }

  if (sessionProblem || error) {
    return (
      <Card className="page-container-standard p-6 sm:p-8">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Unable to load officer issues</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="page-container-standard space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-8 w-full max-w-xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-lg animate-pulse rounded-full bg-muted/40" />
          </div>
        </Card>
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-standard space-y-6 sm:space-y-8">
      <PageHeader
        tag="Operations Queue"
        title="Municipal Work Queue"
        description="Review, triage, prioritize, and assign live citizen complaints across all municipal departments."
        actions={
          <Button asChild size="default" variant="outline">
            <Link to="/app/officer">Back to Dashboard</Link>
          </Button>
        }
      />

      {/* Quick Status Metrics Row */}
      <section aria-label="Queue metrics">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Card className="p-4 border-l-4 border-l-teal-500">
            <p className="text-xs font-semibold text-muted-foreground">Total In Queue</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalCount}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-xs font-semibold text-muted-foreground">Pending Verification</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {issues.filter((issue) => getOfficerIssueStatusFilterBucket(issue.status) === "pending").length}
            </p>
          </Card>
          <Card className="p-4 border-l-4 border-l-sky-500">
            <p className="text-xs font-semibold text-muted-foreground">Assigned to Workers</p>
            <p className="mt-1 text-2xl font-bold text-sky-700">
              {issues.filter((issue) => issue.status === "ASSIGNED").length}
            </p>
          </Card>
          <Card className="p-4 border-l-4 border-l-orange-500">
            <p className="text-xs font-semibold text-muted-foreground">In Progress / Field Work</p>
            <p className="mt-1 text-2xl font-bold text-orange-700">
              {issues.filter((issue) => getOfficerIssueStatusFilterBucket(issue.status) === "inProgress").length}
            </p>
          </Card>
        </div>
      </section>

      {/* Search & Filters Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              className="w-full rounded-xl border border-border/80 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, location, citizen, department, or worker..."
              value={search}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {/* Desktop Selects */}
          <div className="hidden xl:flex items-center gap-2.5 shrink-0">
            <select
              className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              onChange={(event) => setPriorityFilter(event.target.value as "all" | OfficerIssuePriority)}
              value={priorityFilter}
              aria-label="Filter by priority"
            >
              {["all", "LOW", "MEDIUM", "HIGH", "URGENT"].map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All priorities" : `Priority: ${option}`}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
              aria-label="Filter by category"
            >
              {categories.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              value={sortOrder}
              aria-label="Sort issues"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority first</option>
              <option value="severity">Severity first</option>
            </select>
          </div>

          {/* Mobile Filter Button */}
          <div className="flex items-center gap-2 xl:hidden">
            <Button
              type="button"
              variant={hasFiltersActive ? "default" : "outline"}
              size="sm"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex-1 min-h-[44px]"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" aria-hidden="true" />
              <span>Filters & Sort</span>
              {hasFiltersActive ? (
                <Badge variant="outline" size="sm" className="ml-1.5 bg-white/20 text-white border-white/40">
                  Active
                </Badge>
              ) : null}
            </Button>
            {hasFiltersActive ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="min-h-[44px]">
                <X className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
            ) : null}
          </div>

          {/* Clear Filters (Desktop) */}
          {hasFiltersActive ? (
            <Button
              disabled={!hasFiltersActive}
              onClick={clearFilters}
              type="button"
              variant="ghost"
              size="sm"
              className="hidden xl:inline-flex shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Reset filters
            </Button>
          ) : null}
        </div>

        {/* Status Pills Carousel / Row */}
        <div className="mt-4 pt-3.5 border-t border-border/60 flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.key;
            const count =
              filter.key === "all"
                ? issues.length
                : issues.filter((issue) => getOfficerIssueStatusFilterBucket(issue.status) === filter.key).length;

            return (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                type="button"
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 min-h-[36px]",
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-teal-950/15"
                    : "bg-surface-elevated text-muted-foreground hover:bg-teal-50 hover:text-foreground border border-border/70",
                ].join(" ")}
              >
                <span>{filter.label}</span>
                <span
                  className={[
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-white/25 text-white" : "bg-background/80 text-muted-foreground",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Mobile Filter Dialog / Sheet */}
      <Dialog
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filter & Sort Queue"
        description="Refine your work queue view by status, priority, category, and urgency."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-3 text-sm font-medium text-foreground outline-none"
              onChange={(event) => setStatusFilter(event.target.value as "all" | ReturnType<typeof getOfficerIssueStatusFilterBucket>)}
              value={statusFilter}
            >
              {statusFilters.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Priority
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-3 text-sm font-medium text-foreground outline-none"
              onChange={(event) => setPriorityFilter(event.target.value as "all" | OfficerIssuePriority)}
              value={priorityFilter}
            >
              {["all", "LOW", "MEDIUM", "HIGH", "URGENT"].map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All priorities" : option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Category
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-3 text-sm font-medium text-foreground outline-none"
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
            >
              {categories.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Sort Order
            </label>
            <select
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-3 text-sm font-medium text-foreground outline-none"
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              value={sortOrder}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority first</option>
              <option value="severity">Severity first</option>
            </select>
          </div>

          <div className="pt-3 flex gap-3">
            <Button
              className="flex-1"
              onClick={() => setMobileFiltersOpen(false)}
              type="button"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={clearFilters}
              type="button"
            >
              Reset
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Work Queue Cards List */}
      {filteredIssues.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground px-1">
            <p>
              Showing <span className="font-bold text-foreground">{filteredIssues.length}</span> of{" "}
              <span className="font-bold text-foreground">{totalCount}</span> issues in queue
            </p>
            <span className="font-medium">
              Sorted by: {sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}
            </span>
          </div>

          <div className="grid gap-4">
            {filteredIssues.map((issue) => {
              const assignment = issue.issue_assignments?.find((entry) => entry.unassigned_at === null) ?? issue.issue_assignments?.[0] ?? null;
              const assignmentSummary = formatOfficerAssignmentSummary(assignment);
              const thumb = pickOfficerIssueThumbnail(issue);
              const location = formatOfficerIssueCoordinates(issue.latitude, issue.longitude);
              const locationText = issue.address_text?.trim() || issue.location_text?.trim();
              const aiAnalysis = issue.issue_ai_analysis?.[0] ?? null;
              const statusTone = getOfficerIssueStatusTone(issue.status);
              const statusLabel = getOfficerIssueStatusLabel(issue.status);
              const severityTone = getOfficerIssueSeverityTone(issue.severity);
              const severityLabel = getOfficerIssueSeverityLabel(issue.severity);

              return (
                <Card
                  key={issue.id}
                  className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-col md:flex-row min-w-0">
                    {/* Thumbnail Frame */}
                    <div className="md:w-52 lg:w-60 shrink-0 overflow-hidden border-b md:border-b-0 md:border-r border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(2,132,199,0.08)_100%)]">
                      {thumb ? (
                        <IssueImage
                          alt={issue.title}
                          className="h-44 md:h-full w-full object-cover"
                          src={thumb}
                          variant="card"
                        />
                      ) : (
                        <div className="flex h-44 md:h-full items-center justify-center p-4 text-center">
                          <p className="text-xs font-semibold text-muted-foreground">No photo attached</p>
                        </div>
                      )}
                    </div>

                    {/* Content & Metadata Panel */}
                    <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 lg:p-6 min-w-0 space-y-4">
                      <div className="space-y-2.5">
                        {/* Status, Priority, Severity & Category Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <Badge variant={statusTone} size="sm">
                            {statusLabel}
                          </Badge>
                          <Badge
                            variant={issue.priority === "URGENT" ? "danger" : issue.priority === "HIGH" ? "warning" : "default"}
                            size="sm"
                          >
                            Priority {issue.priority}
                          </Badge>
                          <Badge variant={severityTone} size="sm">
                            Severity {severityLabel}
                          </Badge>
                          <Badge variant="outline" size="sm" className="bg-white/80">
                            {issue.category}
                          </Badge>
                          {aiAnalysis ? (
                            <Badge variant="violet" size="sm" className="inline-flex items-center gap-1">
                              <Bot className="h-3 w-3" aria-hidden="true" />
                              <span>AI Analyzed</span>
                            </Badge>
                          ) : null}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <Link
                            to={`/app/officer/issues/${issue.id}`}
                            className="block group-hover:text-primary transition-colors"
                          >
                            <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-1">
                              {issue.title}
                            </h3>
                          </Link>
                          <p className="line-clamp-2 text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            {issue.description}
                          </p>
                        </div>

                        {/* Structured Metadata Grid */}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1 text-xs text-muted-foreground">
                          {/* Location */}
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <span className="truncate">{locationText || location || "No location text"}</span>
                          </div>

                          {/* Department & Worker */}
                          <div className="flex items-center gap-1.5 truncate">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="truncate">
                              {assignmentSummary.departmentLabel}
                              {assignment?.worker ? ` (${assignment.worker.full_name?.split(" ")[0] || "Worker"})` : ""}
                            </span>
                          </div>

                          {/* Citizen Reporter */}
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="truncate">
                              {issue.reporter_profile?.full_name?.trim() || issue.reporter_profile?.email || "Citizen"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Bar: Date & Actions */}
                      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{formatOfficerIssueDateTime(issue.created_at)}</span>
                        </div>

                        <Button asChild size="sm" className="shadow-sm group-hover:border-teal-300">
                          <Link to={`/app/officer/issues/${issue.id}`}>
                            <span>Manage Issue</span>
                            <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={SlidersHorizontal}
          title={totalCount === 0 ? "No issues in queue" : "No matching issues"}
          description={
            totalCount === 0
              ? "The municipal work queue is currently empty. Incoming reports will appear here."
              : "No issues match your current filter and search criteria."
          }
          action={
            hasFiltersActive ? (
              <Button onClick={clearFilters} type="button">
                Clear Filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/app/officer">Back to Dashboard</Link>
              </Button>
            )
          }
        />
      )}
    </div>
  );
}

