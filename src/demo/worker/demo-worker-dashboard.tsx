import { useMemo } from "react";
import {
  CheckCircle2,
  Clock3,
  HardHat,
  Play,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoWorkerDashboardPage() {
  const { issues, currentUser, departments } = useDemo();

  const workerIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Matches worker's assigned issues or department issues
      const isAssigned = issue.assignments.some((a) => a.worker_id === currentUser.id);
      const isDept = issue.department_id === currentUser.department_id;
      return isAssigned || (isDept && issue.status !== "SUBMITTED");
    });
  }, [issues, currentUser]);

  const stats = useMemo(() => {
    const total = workerIssues.length;
    const assigned = workerIssues.filter((i) => i.status === "ASSIGNED").length;
    const inProgress = workerIssues.filter((i) => i.status === "IN_PROGRESS" || i.status === "REOPENED").length;
    const underReview = workerIssues.filter((i) => i.status === "UNDER_REVIEW").length;
    const resolved = workerIssues.filter((i) => i.status === "RESOLVED" || i.status === "CITIZEN_VERIFIED").length;

    return { total, assigned, inProgress, underReview, resolved };
  }, [workerIssues]);

  const department = departments.find((d) => d.id === currentUser.department_id);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Field Operations"
        title="Field Worker Dashboard"
        description={`Logged in as ${currentUser.full_name} (${department?.name ?? "Roads & Infrastructure"}) · Mobile Field Workbench`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              <Link to="/demo/worker/assigned-issues">
                <HardHat className="mr-1.5 h-4 w-4" />
                View Assigned Tasks ({workerIssues.length})
              </Link>
            </Button>
          </div>
        }
      />

      {/* 2. Top Metric Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Assigned Jobs", value: stats.total, icon: HardHat, tone: "info" as const },
          { label: "Ready to Start", value: stats.assigned, icon: Play, tone: "warning" as const },
          { label: "Work In Progress", value: stats.inProgress, icon: Wrench, tone: "warning" as const },
          { label: "Awaiting Review", value: stats.underReview, icon: Clock3, tone: "info" as const },
          { label: "Resolved by You", value: stats.resolved, icon: CheckCircle2, tone: "success" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border border-border/80 bg-surface/95 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Priority Work Queue */}
      <Card className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base font-bold text-foreground">Current Active Field Tasks</CardTitle>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs">
              <Link to="/demo/worker/assigned-issues">View All &rarr;</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {workerIssues.map((issue) => {
            const initialImage = issue.images.find((img) => img.image_type === "INITIAL_REPORT");

            return (
              <div
                key={issue.id}
                className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-3 transition hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted/40 border border-border/60">
                      <IssueImage
                        alt={issue.title}
                        src={initialImage?.url}
                        variant="thumbnail"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs font-semibold text-rose-600">
                          {issue.priority === "CRITICAL" ? "🔥 Critical Priority" : `${issue.priority} Priority`}
                        </span>
                      </div>
                      <Link
                        to={`/demo/worker/issues/${issue.id}`}
                        className="font-bold text-foreground hover:text-primary transition mt-1 block"
                      >
                        {issue.title}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    <span className="text-xs text-muted-foreground truncate">
                      📍 {issue.location_text}
                    </span>
                    <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                      <Link to={`/demo/worker/issues/${issue.id}`}>
                        Open Task &rarr;
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
