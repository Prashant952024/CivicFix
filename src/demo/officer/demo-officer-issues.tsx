import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Eye,
  Filter,
  MapPin,
  Search,
  User,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDate } from "@/lib/admin";

export function DemoOfficerIssuesPage() {
  const { issues, departments } = useDemo();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = issue.title.toLowerCase().includes(query);
        const matchesDesc = issue.description.toLowerCase().includes(query);
        const matchesLoc = (issue.location_text || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLoc) return false;
      }

      if (statusFilter !== "all" && issue.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && issue.priority !== priorityFilter) {
        return false;
      }

      if (departmentFilter !== "all" && issue.department_id !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [issues, search, statusFilter, priorityFilter, departmentFilter]);

  const activeFilterCount = [
    statusFilter !== "all",
    priorityFilter !== "all",
    departmentFilter !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDepartmentFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Municipal Queue"
        title="Issue Queue & Dispatch"
        description={`Displaying ${filteredIssues.length} of ${issues.length} municipal reports across all categories and districts.`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/demo/officer">Back to Dashboard</Link>
            </Button>
          </div>
        }
      />

      {/* 2. Responsive Search & Filter Bar */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full h-10 rounded-xl border border-border/80 bg-background pl-10 pr-4 text-sm text-foreground shadow-xs outline-none transition focus:ring-2 focus:ring-primary/20"
                placeholder="Search issues by title, description or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Mobile Filter Sheet Button */}
            <div className="md:hidden">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setMobileFilterOpen(true)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </Button>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex md:items-center md:gap-2">
              <select
                aria-label="Filter by Status"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="VERIFIED">Verified</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              <select
                aria-label="Filter by Priority"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <select
                aria-label="Filter by Department"
                className="h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {(activeFilterCount > 0 || search) && (
                <Button size="sm" variant="ghost" onClick={resetFilters} className="h-10 px-2 text-xs">
                  <X className="mr-1 h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Filters Modal */}
      <Dialog
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter Issue Queue"
        description="Refine displayed reports by status, priority or department."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Status</label>
            <select
              className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Priority</label>
            <select
              className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Department</label>
            <select
              className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              onClick={() => {
                resetFilters();
                setMobileFilterOpen(false);
              }}
              variant="outline"
              className="flex-1"
            >
              Reset
            </Button>
            <Button onClick={() => setMobileFilterOpen(false)} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 3. Issue List */}
      <div className="space-y-4">
        {filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => {
            const department = departments.find((d) => d.id === issue.department_id);
            const initialImage = issue.images.find((img) => img.image_type === "INITIAL_REPORT");

            return (
              <Card
                key={issue.id}
                className="border border-border/80 bg-surface/95 shadow-sm transition hover:border-sky-300 hover:shadow-md overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Thumbnail */}
                    <div className="w-full sm:w-40 sm:h-28 shrink-0 overflow-hidden rounded-xl bg-muted/40 border border-border/70">
                      <IssueImage
                        alt={issue.title}
                        src={initialImage?.url}
                        variant="card"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Metadata & Details */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{issue.id}</span>
                          <Badge
                            variant={
                              issue.status === "RESOLVED"
                                ? "success"
                                : issue.status === "UNDER_REVIEW"
                                  ? "amber"
                                  : issue.status === "IN_PROGRESS"
                                    ? "info"
                                    : "outline"
                            }
                            size="sm"
                          >
                            {issue.status.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={
                              issue.priority === "CRITICAL" || issue.priority === "HIGH"
                                ? "danger"
                                : "default"
                            }
                            size="sm"
                          >
                            {issue.priority}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatAdminDate(issue.created_at)}</span>
                      </div>

                      <div>
                        <Link
                          to={`/demo/officer/issues/${issue.id}`}
                          className="text-base font-bold text-foreground hover:text-primary transition"
                        >
                          {issue.title}
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{issue.description}</p>
                      </div>

                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{issue.location_text}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{department?.name ?? "Unassigned"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <span className="truncate">{issue.reporter_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                      <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700 text-white">
                        <Link to={`/demo/officer/issues/${issue.id}`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Inspect & Manage
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="No matching reports found"
            description="Try loosening your search terms or clearing status filters."
            action={
              <Button onClick={resetFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
