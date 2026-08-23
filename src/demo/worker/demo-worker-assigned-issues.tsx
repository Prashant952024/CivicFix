import { useMemo, useState } from "react";
import {
  HardHat,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDate } from "@/lib/admin";

export function DemoWorkerAssignedIssuesPage() {
  const { issues, currentUser } = useDemo();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const workerIssues = useMemo(() => {
    return issues.filter((issue) => {
      const isAssigned = issue.assignments.some((a) => a.worker_id === currentUser.id);
      const isDept = issue.department_id === currentUser.department_id;
      const belongsToWorker = isAssigned || (isDept && issue.status !== "SUBMITTED");

      if (!belongsToWorker) return false;

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

      return true;
    });
  }, [issues, currentUser, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Field Assignments"
        title="Assigned Tasks Queue"
        description={`Displaying ${workerIssues.length} assigned field tasks for ${currentUser.full_name}.`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/worker">Back to Workbench</Link>
          </Button>
        }
      />

      {/* 2. Search & Status Filter */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full h-10 rounded-xl border border-border/80 bg-background pl-10 pr-4 text-sm text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Search assigned jobs by location or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              aria-label="Filter status"
              className="h-10 w-full sm:w-auto rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-foreground shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Task Statuses</option>
              <option value="ASSIGNED">Ready to Start (Assigned)</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {(search || statusFilter !== "all") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="h-10 px-2 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Task List */}
      <div className="space-y-4">
        {workerIssues.length > 0 ? (
          workerIssues.map((issue) => {
            const initialImage = issue.images.find((img) => img.image_type === "INITIAL_REPORT");

            return (
              <Card
                key={issue.id}
                className="border border-border/80 bg-surface/95 shadow-sm transition hover:border-amber-300 hover:shadow-md overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="w-full sm:w-40 sm:h-28 shrink-0 overflow-hidden rounded-xl bg-muted/40 border border-border/70">
                      <IssueImage
                        alt={issue.title}
                        src={initialImage?.url}
                        variant="card"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{issue.id}</span>
                          <Badge
                            variant={
                              issue.status === "IN_PROGRESS"
                                ? "amber"
                                : issue.status === "UNDER_REVIEW"
                                  ? "info"
                                  : issue.status === "RESOLVED"
                                    ? "success"
                                    : "outline"
                            }
                            size="sm"
                          >
                            {issue.status.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={
                              issue.priority === "CRITICAL" || issue.priority === "HIGH" ? "danger" : "default"
                            }
                            size="sm"
                          >
                            {issue.priority} Priority
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatAdminDate(issue.created_at)}</span>
                      </div>

                      <div>
                        <Link
                          to={`/demo/worker/issues/${issue.id}`}
                          className="text-base font-bold text-foreground hover:text-primary transition"
                        >
                          {issue.title}
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{issue.description}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="font-medium text-foreground">{issue.location_text}</span>
                        <span className="text-muted-foreground">({issue.address_text})</span>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                      <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Link to={`/demo/worker/issues/${issue.id}`}>
                          {issue.status === "ASSIGNED" ? "Start Task" : "View Work & Submit"} &rarr;
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
            icon={HardHat}
            title="No field tasks in this view"
            description="All assigned tasks are completed or filters are excluding results."
            action={
              <Button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
