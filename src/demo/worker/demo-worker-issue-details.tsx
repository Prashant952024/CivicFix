import { useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock3,
  HardHat,
  History,
  MapPin,
  Play,
  Send,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useDemo } from "../demo-context";
import type { DemoSampleImageKey } from "../demo-data";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDateTime } from "@/lib/admin";

export function DemoWorkerIssueDetailPage() {
  const { issueId } = useParams();
  const { getIssue, currentUser, startWork, submitResolution } = useDemo();

  const issue = getIssue(issueId ?? "");

  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedProofKey, setSelectedProofKey] = useState<DemoSampleImageKey>("pothole_fixed");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!issue) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Task Not Found"
        description="The requested field task could not be located in your demo assignments."
        action={
          <Button asChild variant="outline">
            <Link to="/demo/worker/assigned-issues">Return to Tasks</Link>
          </Button>
        }
      />
    );
  }

  const initialImage = issue.images.find((img) => img.image_type === "INITIAL_REPORT");
  const resolutionImage = issue.images.find((img) => img.image_type === "RESOLUTION_EVIDENCE");

  const handleStartWork = () => {
    startWork(issue.id);
    setActionSuccessMessage("Task marked as IN PROGRESS. You can now complete the field work and upload evidence.");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleSubmitResolution = (e: React.FormEvent) => {
    e.preventDefault();
    submitResolution(issue.id, resolutionNote || "Field repair completed successfully.", selectedProofKey);
    setActionSuccessMessage("Resolution proof submitted! Status is now UNDER REVIEW by the Municipal Officer.");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        backHref="/demo/worker/assigned-issues"
        backLabel="Assigned Tasks"
        tag="Field Operations"
        title={issue.title}
        description={`Category: ${issue.category} · Assigned to ${currentUser.full_name} · Priority: ${issue.priority}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
              size="default"
            >
              {issue.status.replace("_", " ")}
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

      {/* 2. Main Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] items-start">
        {/* Left Column: Report Inspection & Resolution Form */}
        <div className="space-y-6">
          {/* Issue Overview & Evidence */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground">Task Overview & Initial Evidence</CardTitle>
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
                  Citizen Problem Description
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">{issue.description}</p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{issue.location_text}</span>
                </div>
                <p className="text-muted-foreground pl-6">Address: {issue.address_text}</p>
                <p className="text-muted-foreground pl-6 font-mono text-[11px]">
                  GPS: {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Step 1: Start Work (When ASSIGNED or REOPENED) */}
          {(issue.status === "ASSIGNED" || issue.status === "REOPENED") && (
            <Card className="border-2 border-amber-300 bg-amber-50/40 shadow-md">
              <CardHeader className="pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-amber-700" />
                  <CardTitle className="text-base font-bold text-amber-950">
                    Step 1: Acknowledge & Start Work
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-amber-900 leading-relaxed">
                  Mark this task as active when arriving on site. This alerts the dispatch supervisor that repair work has commenced.
                </p>
                <Button onClick={handleStartWork} size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                  <Play className="mr-2 h-4 w-4" />
                  Start Field Work
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Action Step 2: Upload Evidence & Submit (When IN_PROGRESS) */}
          {issue.status === "IN_PROGRESS" && (
            <Card className="border-2 border-teal-300 bg-teal-50/40 shadow-md">
              <CardHeader className="pb-3 border-b border-teal-200">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-teal-700" />
                  <CardTitle className="text-base font-bold text-teal-950">
                    Step 2: Submit Resolution Proof
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleSubmitResolution} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Select Demo Resolution Evidence Asset
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "pothole_fixed" as const, label: "Repaved Asphalt Proof" },
                        { key: "streetlight_fixed" as const, label: "Fixed Luminaire Light Proof" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedProofKey(item.key)}
                          className={`rounded-xl border p-3 text-left transition ${
                            selectedProofKey === item.key
                              ? "border-teal-500 bg-teal-100/70 shadow-xs font-bold text-teal-950"
                              : "border-border/80 bg-white hover:bg-teal-50/40 text-muted-foreground"
                          }`}
                        >
                          <Camera className="h-4 w-4 text-teal-600 mb-1" />
                          <p className="text-xs">{item.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Work Completion Summary
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-border/80 bg-white p-3 text-sm text-foreground shadow-xs outline-none"
                      placeholder="e.g. Cleared debris, laid hot asphalt patch, compacted surface level..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-md">
                    <Send className="mr-2 h-4 w-4" />
                    Submit Resolution for Officer Review
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Under Review or Resolved Banner */}
          {issue.status === "UNDER_REVIEW" && (
            <Card className="border border-sky-200 bg-sky-50/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-sky-900 font-bold">
                <Clock3 className="h-5 w-5 text-sky-600" />
                <span>Resolution Submitted · Awaiting Officer Review</span>
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                You have uploaded proof of completion. The Municipal Officer will inspect your evidence and approve or return the task.
              </p>
              {resolutionImage && (
                <div className="overflow-hidden rounded-xl border border-sky-200 max-h-60 bg-white">
                  <IssueImage
                    alt="Resolution preview"
                    className="w-full max-h-60 object-cover"
                    src={resolutionImage.url}
                    variant="hero"
                  />
                </div>
              )}
            </Card>
          )}

          {issue.status === "RESOLVED" && (
            <Card className="border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Job Complete & Officially Resolved</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                The Municipal Officer has signed off on this repair. Excellent work!
              </p>
            </Card>
          )}

          {/* Audit History Timeline */}
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base font-bold text-foreground">Task History Trail</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              {issue.status_history.map((hist, idx) => (
                <div key={hist.id} className="relative flex items-start gap-3">
                  {idx !== issue.status_history.length - 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border/70" />
                  )}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
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

        {/* Right Column: Worker Quick Reference */}
        <div className="space-y-6">
          <Card className="border border-border/80 bg-surface/95 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base font-bold text-foreground">Field Checklist</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Verify exact GPS pin & safety perimeter</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Wear high-visibility PPE in active roadway</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Capture well-lit photo of finished work</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-amber-100 bg-amber-50/50 shadow-sm p-4 text-xs text-amber-950 space-y-2">
            <p className="font-bold">💡 Field Worker Sandbox Guide</p>
            <p className="text-muted-foreground leading-relaxed">
              In this sandbox, you can simulate starting work and submitting resolution evidence with instant local updates.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
