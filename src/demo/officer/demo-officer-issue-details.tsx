import { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  History,
  Send,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useDemo } from "../demo-context";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin";

export function DemoOfficerIssueDetailPage() {
  const { issueId } = useParams();
  const { getIssue, departments, workers, verifyIssue, assignIssue, reviewResolution } = useDemo();

  const issue = getIssue(issueId ?? "");

  // Interactive Form States
  const [selectedPriority, setSelectedPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(
    issue?.priority ?? "MEDIUM"
  );
  const [selectedSeverity, setSelectedSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(
    issue?.severity ?? "MEDIUM"
  );
  const [selectedDeptId, setSelectedDeptId] = useState<string>(issue?.department_id ?? "dept-1");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("worker-1");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!issue) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Demo Issue Not Found"
        description="The requested sample report could not be found."
        action={
          <Button asChild variant="outline">
            <Link to="/demo/officer/issues">Return to Queue</Link>
          </Button>
        }
      />
    );
  }

  const initialImage = issue.images.find((img) => img.image_type === "INITIAL_REPORT");
  const resolutionImage = issue.images.find((img) => img.image_type === "RESOLUTION_EVIDENCE");
  const assignedWorker = workers.find((w) => issue.assignments[0]?.worker_id === w.id);
  const department = departments.find((d) => d.id === issue.department_id);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verifyIssue(issue.id, selectedPriority, selectedSeverity, selectedDeptId);
    setActionSuccessMessage("Report verified! You can now dispatch a worker.");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    assignIssue(issue.id, selectedDeptId, selectedWorkerId, assignmentNote);
    setActionSuccessMessage("Issue successfully assigned to field team.");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleReviewDecision = (approved: boolean) => {
    reviewResolution(issue.id, approved, reviewNote);
    setActionSuccessMessage(
      approved ? "Resolution approved and issue marked as RESOLVED!" : "Issue returned to field worker for rework."
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        backHref="/demo/officer/issues"
        backLabel="Issue Queue"
        tag="Officer Triage & Dispatch"
        title={issue.title}
        description={`Category: ${issue.category} · Reported ${formatAdminDate(issue.created_at)} · ID: ${issue.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
              size="default"
            >
              {issue.status.replace("_", " ")}
            </Badge>
            <Badge
              variant={
                issue.priority === "CRITICAL" || issue.priority === "HIGH" ? "danger" : "default"
              }
              size="default"
            >
              Priority: {issue.priority}
            </Badge>
          </div>
        }
      />

      {/* Action Notification Alert */}
      {actionSuccessMessage && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-2 shadow-sm animate-in fade-in-0 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* 2. Main Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] items-start">
        {/* Left Column: Evidence, Description, Timeline */}
        <div className="space-y-6">
          {/* Issue Overview & Evidence */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground">Issue Description & Evidence</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {initialImage && (
                <div className="overflow-hidden rounded-2xl border border-border/70 max-h-80 bg-muted/30 flex items-center justify-center">
                  <IssueImage
                    alt={issue.title}
                    className="w-full max-h-80 object-cover"
                    src={initialImage.url}
                    variant="hero"
                  />
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Citizen Report Details
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">{issue.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-border/60 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">Reported:</span>
                  <p className="font-medium text-foreground">{formatAdminDateTime(issue.created_at)}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Location:</span>
                  <p className="font-medium text-foreground">{issue.location_text}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Evidence Review Card (If Under Review or Resolved) */}
          {(issue.status === "UNDER_REVIEW" || issue.status === "RESOLVED") && (
            <Card className="border-2 border-amber-300 bg-amber-50/40 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-700" />
                  <CardTitle className="text-base font-bold text-amber-950">
                    Field Worker Resolution Review
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {resolutionImage && (
                  <div className="overflow-hidden rounded-2xl border border-amber-200 max-h-72 bg-muted/20">
                    <IssueImage
                      alt="Resolution evidence proof"
                      className="w-full max-h-72 object-cover"
                      src={resolutionImage.url}
                      variant="hero"
                    />
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <span className="font-bold text-foreground block">Worker Submission Note:</span>
                  <p className="italic text-foreground">
                    "{issue.status_history.find((h) => h.new_status === "UNDER_REVIEW")?.notes || "Work completed."}"
                  </p>
                </div>

                {issue.status === "UNDER_REVIEW" && (
                  <div className="space-y-3 pt-3 border-t border-amber-200">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Supervisor Decision Notes (Optional)
                    </label>
                    <input
                      className="w-full h-10 rounded-xl border border-amber-300 bg-white px-3 text-sm"
                      placeholder="Add inspection feedback or sign-off comment..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                    />

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={() => handleReviewDecision(true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Approve & Mark Resolved
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleReviewDecision(false)}
                        variant="outline"
                        className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        Reject & Request Rework
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Audit History Timeline */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base font-bold text-foreground">Lifecycle Audit Trail</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              {issue.status_history.map((hist, idx) => (
                <div key={hist.id} className="relative flex items-start gap-3">
                  {idx !== issue.status_history.length - 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border/70" />
                  )}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 rounded-xl border border-border/60 bg-background/50 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground">{hist.new_status.replace("_", " ")}</p>
                      <span className="text-muted-foreground">{formatAdminDateTime(hist.created_at)}</span>
                    </div>
                    <p className="text-muted-foreground">{hist.notes}</p>
                    <p className="text-[10px] text-muted-foreground/80 font-medium">By: {hist.changed_by_name}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Dispatch & Officer Controls */}
        <div className="space-y-6">
          {/* Action Form 1: Verify & Prioritize (For SUBMITTED / AI_ANALYZED) */}
          {(issue.status === "SUBMITTED" || issue.status === "AI_ANALYZED") && (
            <Card className="border-2 border-sky-300 bg-sky-50/30 shadow-md">
              <CardHeader className="pb-3 border-b border-sky-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-sky-700" />
                  <CardTitle className="text-base font-bold text-sky-950">Step 1: Verify Report</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleVerify} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Assigned Priority
                    </label>
                    <select
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Assigned Severity
                    </label>
                    <select
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Routing Department
                    </label>
                    <select
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Confirm Verification
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Action Form 2: Dispatch to Field Worker (For VERIFIED) */}
          {issue.status === "VERIFIED" && (
            <Card className="border-2 border-teal-300 bg-teal-50/30 shadow-md">
              <CardHeader className="pb-3 border-b border-teal-200">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-teal-700" />
                  <CardTitle className="text-base font-bold text-teal-950">Step 2: Assign Field Worker</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleAssign} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Department
                    </label>
                    <select
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Assigned Field Worker
                    </label>
                    <select
                      className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground"
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                    >
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.full_name} ({departments.find((d) => d.id === w.department_id)?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Dispatch Instructions
                    </label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-border/80 bg-background p-2.5 text-sm"
                      placeholder="e.g. Inspect site immediately and bring asphalt pack..."
                      value={assignmentNote}
                      onChange={(e) => setAssignmentNote(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                    <Send className="mr-2 h-4 w-4" />
                    Dispatch Field Worker
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Current Assignment Summary Card */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base font-bold text-foreground">Assignment Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground block uppercase text-[10px]">Department</span>
                <p className="font-bold text-foreground">{department?.name ?? "Unassigned"}</p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground block uppercase text-[10px]">Field Worker</span>
                <p className="font-medium text-foreground">{assignedWorker?.full_name ?? "No worker assigned yet"}</p>
                {assignedWorker?.phone && <p className="text-muted-foreground">{assignedWorker.phone}</p>}
              </div>

              <div>
                <span className="font-semibold text-muted-foreground block uppercase text-[10px]">Citizen Reporter</span>
                <p className="font-medium text-foreground">{issue.reporter_name}</p>
                <p className="text-muted-foreground">{issue.reporter_email}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
