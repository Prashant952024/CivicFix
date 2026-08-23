import { useMemo } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Layers,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDate } from "@/lib/admin";

export function DemoOfficerDashboardPage() {
  const { issues, currentUser } = useDemo();

  const stats = useMemo(() => {
    const total = issues.length;
    const pendingVerification = issues.filter((i) => i.status === "SUBMITTED" || i.status === "AI_ANALYZED").length;
    const assigned = issues.filter((i) => i.status === "ASSIGNED").length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS" || i.status === "REOPENED").length;
    const underReview = issues.filter((i) => i.status === "UNDER_REVIEW").length;
    const resolved = issues.filter((i) => i.status === "RESOLVED" || i.status === "CITIZEN_VERIFIED").length;
    const critical = issues.filter((i) => i.priority === "CRITICAL" || i.severity === "CRITICAL").length;

    return {
      total,
      pendingVerification,
      assigned,
      inProgress,
      underReview,
      resolved,
      critical,
    };
  }, [issues]);

  const triageIssues = useMemo(() => {
    return issues.filter(
      (i) => i.status === "SUBMITTED" || i.status === "VERIFIED" || i.status === "UNDER_REVIEW"
    );
  }, [issues]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="Municipal Operations"
        title="Municipal Officer Dashboard"
        description={`Active supervisor session for ${currentUser.full_name} · Real-time municipal queue & verification center`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700 text-white">
              <Link to="/demo/officer/issues">
                <Layers className="mr-1.5 h-4 w-4" />
                View Full Queue ({issues.length})
              </Link>
            </Button>
          </div>
        }
      />

      {/* 2. Top Metric Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Total Reports", value: stats.total, icon: Layers, tone: "info" as const },
          { label: "Needs Verification", value: stats.pendingVerification, icon: AlertCircle, tone: "danger" as const },
          { label: "Assigned", value: stats.assigned, icon: UserCheck, tone: "warning" as const },
          { label: "In Progress", value: stats.inProgress, icon: Clock3, tone: "warning" as const },
          { label: "Under Review", value: stats.underReview, icon: ShieldAlert, tone: "warning" as const },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle2, tone: "success" as const },
          { label: "Critical Priority", value: stats.critical, icon: ShieldAlert, tone: "danger" as const },
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
                        : tone === "danger"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-2 truncate text-xl font-bold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Action Triage & Recent Queue */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-start">
        {/* Left Column: Issues Requiring Attention */}
        <Card className="border border-border/80 bg-surface/95 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-600" />
                <CardTitle className="text-base font-bold text-foreground">
                  Issues Awaiting Officer Action ({triageIssues.length})
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">Needs Verify, Assign or Review</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {triageIssues.map((issue) => {
              const needsVerify = issue.status === "SUBMITTED" || issue.status === "AI_ANALYZED";
              const needsReview = issue.status === "UNDER_REVIEW";
              const needsAssign = issue.status === "VERIFIED";

              return (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-border/70 bg-background/50 p-4 space-y-2 transition hover:border-sky-300 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{issue.id}</span>
                      <Badge
                        variant={
                          issue.status === "UNDER_REVIEW"
                            ? "amber"
                            : issue.status === "VERIFIED"
                              ? "teal"
                              : "outline"
                        }
                        size="sm"
                      >
                        {issue.status.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant={issue.priority === "CRITICAL" || issue.priority === "HIGH" ? "danger" : "default"}
                        size="sm"
                      >
                        {issue.priority} Priority
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatAdminDate(issue.created_at)}</span>
                  </div>

                  <div>
                    <Link
                      to={`/demo/officer/issues/${issue.id}`}
                      className="font-bold text-foreground hover:text-primary transition"
                    >
                      {issue.title}
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{issue.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground truncate">
                      📍 {issue.location_text}
                    </span>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to={`/demo/officer/issues/${issue.id}`}>
                        {needsVerify ? "Verify Report" : needsAssign ? "Assign Worker" : needsReview ? "Review Fix" : "Inspect"} &rarr;
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Column: Municipal Dispatch Overview */}
        <div className="space-y-6">
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base font-bold text-foreground">Department Dispatch</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-muted-foreground">
                Municipal departments ready for simulated issue assignment and routing:
              </p>
              <div className="space-y-2">
                {[
                  { name: "Roads & Infrastructure", workers: "Marcus Vance", load: "2 Active" },
                  { name: "Public Sanitation", workers: "Elena Rodriguez", load: "1 Active" },
                  { name: "Electrical & Lighting", workers: "Devon Chang", load: "1 Review" },
                  { name: "Water & Sewerage", workers: "Samira Patel", load: "Resolved" },
                ].map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between p-2.5 rounded-xl bg-background/60 border border-border/60">
                    <div>
                      <p className="font-bold text-foreground">{dept.name}</p>
                      <p className="text-muted-foreground text-[11px]">{dept.workers}</p>
                    </div>
                    <Badge variant="outline" size="sm">{dept.load}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-sky-100 bg-sky-50/50 shadow-sm p-4 text-xs text-sky-950 space-y-2">
            <p className="font-bold">💡 Officer Sandbox Quick Guide</p>
            <p className="text-muted-foreground leading-relaxed">
              You can test the entire lifecycle: Open an issue, update its severity or assign a worker, or approve resolution photos uploaded by field teams.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
