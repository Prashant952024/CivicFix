import { useMemo } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  HardHat,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoManagerDashboardPage() {
  const { issues, workers, currentPersona, reviewResolution } = useDemo();

  // Filter issues belonging to Manager's department or assigned to them
  const deptIssues = useMemo(() => {
    return issues.filter((i) => i.department_id === currentPersona.departmentId || !i.department_id || i.department_id === "dept-1");
  }, [issues, currentPersona.departmentId]);

  const stats = useMemo(() => {
    const total = deptIssues.length;
    const unassigned = deptIssues.filter((i) => i.status === "VERIFIED" || i.status === "SUBMITTED").length;
    const inProgress = deptIssues.filter((i) => i.status === "ASSIGNED" || i.status === "IN_PROGRESS").length;
    const underReview = deptIssues.filter((i) => i.status === "UNDER_REVIEW").length;
    const resolved = deptIssues.filter((i) => i.status === "RESOLVED" || i.status === "CITIZEN_VERIFIED").length;

    return { total, unassigned, inProgress, underReview, resolved };
  }, [deptIssues]);

  const pendingReviewIssues = useMemo(() => {
    return deptIssues.filter((i) => i.status === "UNDER_REVIEW");
  }, [deptIssues]);

  return (
    <div className="space-y-6">
      <PageHeader
        tag={`${currentPersona.departmentName || "Roads & Infrastructure"} · Department Queue`}
        title="Department Manager Board"
        description={`Active supervisor session for ${currentPersona.fullName} · Work order dispatch & resolution evidence inspection`}
        actions={
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/demo/manager/workers">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Manage Field Workers ({workers.length})
            </Link>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dept Work Orders</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Awaiting Dispatch</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.unassigned}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock3 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evidence Under Review</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats.underReview}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolved Work Orders</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Required: Pending Evidence Approval */}
      {pendingReviewIssues.length > 0 && (
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white shadow-sm">
          <CardHeader className="pb-3 border-b border-purple-100">
            <CardTitle className="text-sm font-bold text-purple-950 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-700" />
              Action Required: Field Evidence Pending Manager Approval ({pendingReviewIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-purple-100">
            {pendingReviewIssues.map((issue) => (
              <div key={issue.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded">
                      {issue.id}
                    </span>
                    <h4 className="text-xs font-bold text-foreground">{issue.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{issue.location_text}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => reviewResolution(issue.id, true, "Approved by Manager Amit Verma.")}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewResolution(issue.id, false, "Patch requires smoothing and clean-up.")}
                    className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                  >
                    Request Rework
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                    <Link to={`/demo/manager/issues/${issue.id}`}>Inspect Photos &rarr;</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Work Order Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base font-bold">Department Work Order Queue</CardTitle>
            <p className="text-xs text-muted-foreground">Assign technicians, monitor execution status, and review photo deliverables.</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Issue ID</th>
                  <th className="px-4 py-3">Title & Location</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Worker</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deptIssues.map((issue) => {
                  const assignment = issue.assignments[0];
                  const assignedWorker = assignment ? workers.find((w) => w.id === assignment.worker_id) : null;

                  return (
                    <tr key={issue.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-mono font-bold text-teal-800">
                        {issue.id}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <Link to={`/demo/manager/issues/${issue.id}`} className="font-bold text-foreground hover:text-teal-700 block truncate">
                          {issue.title}
                        </Link>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                          {issue.location_text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={issue.priority === "CRITICAL" ? "danger" : "outline"}
                          className="text-[10px] font-bold"
                        >
                          {issue.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            issue.status === "RESOLVED" || issue.status === "CITIZEN_VERIFIED"
                              ? "success"
                              : issue.status === "UNDER_REVIEW"
                                ? "info"
                                : "outline"
                          }
                          className="text-[10px] font-bold uppercase"
                        >
                          {issue.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {assignedWorker ? (
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <HardHat className="h-3 w-3 text-amber-600" />
                            {assignedWorker.full_name}
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs font-semibold">
                          <Link to={`/demo/manager/issues/${issue.id}`}>
                            Manage
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
