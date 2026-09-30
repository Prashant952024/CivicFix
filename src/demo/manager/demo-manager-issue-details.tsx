import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  HardHat,
  MapPin,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoManagerIssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const { getIssue, workers, assignIssue, reviewResolution, currentPersona } = useDemo();

  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [reworkNotes, setReworkNotes] = useState("");
  const [showReworkModal, setShowReworkModal] = useState(false);

  const issue = issueId ? getIssue(issueId) : undefined;

  if (!issue) {
    return (
      <div className="space-y-4 text-center py-12">
        <h2 className="text-xl font-bold">Work Order Not Found</h2>
        <Button asChild variant="outline">
          <Link to="/demo/manager">Back to Department Board</Link>
        </Button>
      </div>
    );
  }

  const initialReportImage = issue.images.find((img) => img.image_type === "INITIAL_REPORT");
  const resolutionImage = issue.images.find((img) => img.image_type === "RESOLUTION_EVIDENCE");

  const currentAssignment = issue.assignments[0];
  const assignedWorker = currentAssignment
    ? workers.find((w) => w.id === currentAssignment.worker_id)
    : null;

  const isUnderReview = issue.status === "UNDER_REVIEW";

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;
    assignIssue(issue.id, issue.department_id || "dept-1", selectedWorkerId, assignmentNotes);
    setSelectedWorkerId("");
    setAssignmentNotes("");
  };

  const handleApprove = () => {
    reviewResolution(
      issue.id,
      true,
      `Work verified and photo evidence approved by Manager ${currentPersona.fullName}. Ready for final municipal sign-off.`
    );
  };

  const handleRework = () => {
    if (!reworkNotes.trim()) return;
    reviewResolution(issue.id, false, reworkNotes);
    setShowReworkModal(false);
    setReworkNotes("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button asChild size="sm" variant="ghost" className="text-xs">
          <Link to="/demo/manager">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Department Board
          </Link>
        </Button>
        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
          {issue.id}
        </span>
      </div>

      <PageHeader
        tag={`Work Order Management · ${issue.category}`}
        title={issue.title}
        description={`Reported by ${issue.reporter_name} at ${issue.location_text}`}
        actions={
          <Badge
            variant={
              issue.status === "RESOLVED" || issue.status === "CITIZEN_VERIFIED"
                ? "success"
                : issue.status === "UNDER_REVIEW"
                  ? "info"
                  : "outline"
            }
            className="text-xs uppercase font-bold px-3 py-1"
          >
            {issue.status.replace("_", " ")}
          </Badge>
        }
      />

      {/* Review Banner if Under Review */}
      {isUnderReview && (
        <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 via-indigo-50 to-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-purple-950 font-bold">
            <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0" />
            <span>Field Work Completed · Photo Deliverable Pending Manager Sign-off</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Worker {assignedWorker?.full_name || "Marcus Vance"} submitted resolution evidence.
            Verify the photo below before approving.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Approve Resolution Deliverable
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReworkModal(true)}
              className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-bold"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Request Rework from Field Worker
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Cols: Details & Photos */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Work Order Details</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm">
              <p className="text-muted-foreground leading-relaxed">{issue.description}</p>
              <div className="grid gap-2 sm:grid-cols-2 text-xs bg-muted/40 p-3 rounded-xl border">
                <div>
                  <span className="text-muted-foreground">Location Landmark:</span>
                  <p className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                    {issue.location_text}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority & Severity:</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    Priority: <strong>{issue.priority}</strong> · Severity: <strong>{issue.severity}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Deliverable Comparison */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Camera className="h-4 w-4 text-teal-700" />
                Before & After Evidence Inspection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">1. Citizen Report Photo</span>
                  {initialReportImage ? (
                    <img
                      src={initialReportImage.url}
                      alt="Initial Report"
                      className="h-44 w-full object-cover rounded-xl border border-border/80 shadow-2xs"
                    />
                  ) : (
                    <div className="h-44 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                      No initial photo
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase">2. Worker Resolution Deliverable</span>
                  {resolutionImage ? (
                    <img
                      src={resolutionImage.url}
                      alt="Resolution Proof"
                      className="h-44 w-full object-cover rounded-xl border-2 border-emerald-300 shadow-2xs"
                    />
                  ) : (
                    <div className="h-44 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 flex flex-col items-center justify-center text-xs text-amber-800 p-4 text-center">
                      <Clock3 className="h-6 w-6 text-amber-600 mb-1" />
                      <span>Pending field completion</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Dispatch & Worker Assignment */}
        <div className="space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-teal-700" />
                Field Worker Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {assignedWorker ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 space-y-1 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Currently Assigned
                  </span>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <HardHat className="h-4 w-4 text-teal-700" />
                    {assignedWorker.full_name}
                  </p>
                  <p className="text-muted-foreground">{assignedWorker.email}</p>
                  <p className="text-muted-foreground">{assignedWorker.phone}</p>
                </div>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  No field worker assigned yet. Select a technician below to dispatch.
                </div>
              )}

              {/* Re-assign / Assign Form */}
              <form onSubmit={handleAssign} className="space-y-3 pt-2 border-t">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    {assignedWorker ? "Re-assign Worker" : "Assign Technician"}
                  </label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select a field worker...</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.full_name} ({w.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Work Instructions / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Inspect drainage line first, use cold mix patch..."
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <Button type="submit" size="sm" className="w-full text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white">
                  Dispatch Work Order
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold">Execution History</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative pl-5 border-l-2 border-teal-200 space-y-3 text-xs">
                {issue.status_history.map((hist, idx) => (
                  <div key={hist.id || idx} className="relative space-y-0.5">
                    <div className="absolute -left-[27px] top-0.5 h-3 w-3 rounded-full bg-teal-600 ring-4 ring-white" />
                    <p className="font-bold text-foreground">{hist.new_status.replace("_", " ")}</p>
                    <p className="text-[11px] text-muted-foreground">{hist.notes}</p>
                    <p className="text-[10px] text-teal-800 font-semibold">{hist.changed_by_name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rework Modal */}
      {showReworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Request Field Rework
            </h3>
            <p className="text-xs text-muted-foreground">
              Provide specific instructions on what needs to be fixed before this work order can be approved.
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Patch edges require compaction; remove loose stone chips from road shoulder..."
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              className="w-full rounded-lg border border-border/80 bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowReworkModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRework}
                disabled={!reworkNotes.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Send for Rework
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
