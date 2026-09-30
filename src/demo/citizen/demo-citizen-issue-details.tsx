import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoCitizenIssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const { getIssue, citizenConfirmResolution } = useDemo();

  const [reopenReason, setReopenReason] = useState("");
  const [showReopenModal, setShowReopenModal] = useState(false);

  const issue = issueId ? getIssue(issueId) : undefined;

  if (!issue) {
    return (
      <div className="space-y-4 text-center py-12">
        <h2 className="text-xl font-bold">Issue Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested demo issue could not be found.</p>
        <Button asChild variant="outline">
          <Link to="/demo/citizen">Back to Grievances</Link>
        </Button>
      </div>
    );
  }

  const initialReportImage = issue.images.find((img) => img.image_type === "INITIAL_REPORT");
  const resolutionImage = issue.images.find((img) => img.image_type === "RESOLUTION_EVIDENCE");

  const isResolved = issue.status === "RESOLVED";
  const isVerified = issue.status === "CITIZEN_VERIFIED";
  const isReopened = issue.status === "REOPENED";

  const handleConfirm = () => {
    citizenConfirmResolution(issue.id, true, "Satisfied with completed repair.");
  };

  const handleReopen = () => {
    if (!reopenReason.trim()) return;
    citizenConfirmResolution(issue.id, false, reopenReason);
    setShowReopenModal(false);
    setReopenReason("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button asChild size="sm" variant="ghost" className="text-xs">
          <Link to="/demo/citizen">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to My Grievances
          </Link>
        </Button>
        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
          {issue.id}
        </span>
      </div>

      <PageHeader
        tag={`Grievance Tracking · ${issue.category}`}
        title={issue.title}
        description={`Reported on ${new Date(issue.created_at).toLocaleDateString()} at ${issue.location_text}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={
                issue.status === "CITIZEN_VERIFIED" || issue.status === "RESOLVED"
                  ? "success"
                  : "info"
              }
              className="text-xs uppercase font-bold px-3 py-1"
            >
              {issue.status.replace("_", " ")}
            </Badge>
          </div>
        }
      />

      {/* Verification Banner if Resolved */}
      {isResolved && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-950 font-bold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Field Repair Completed · Citizen Action Required</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The municipal department has marked this issue as resolved. Please review the resolution photo proof below.
            You can confirm satisfaction or reopen the issue if the repair was incomplete.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Confirm & Close Grievance
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReopenModal(true)}
              className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-bold"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reopen Grievance
            </Button>
          </div>
        </div>
      )}

      {isVerified && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center gap-3 text-emerald-900 text-xs font-bold">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>You confirmed satisfaction with this resolution. Grievance is officially closed.</span>
        </div>
      )}

      {/* Grid Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Description & Evidence Photos */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Description & Geocoded Location</CardTitle>
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
                  <span className="text-muted-foreground">District / Ward:</span>
                  <p className="font-semibold text-foreground mt-0.5">{issue.district_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Before & After Photo Comparison */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Camera className="h-4 w-4 text-teal-700" />
                Tamper-Evident Photo Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Initial Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground uppercase">1. Citizen Initial Report</span>
                    <Badge variant="outline" className="text-[10px]">INTAKE</Badge>
                  </div>
                  {initialReportImage ? (
                    <img
                      src={initialReportImage.url}
                      alt="Initial Report"
                      className="h-48 w-full object-cover rounded-xl border border-border/80 shadow-2xs"
                    />
                  ) : (
                    <div className="h-48 rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                      No initial photo
                    </div>
                  )}
                </div>

                {/* Resolution Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 uppercase">2. Field Worker Resolution Proof</span>
                    <Badge variant="default" className="text-[10px] bg-emerald-600">VERIFIED</Badge>
                  </div>
                  {resolutionImage ? (
                    <img
                      src={resolutionImage.url}
                      alt="Resolution Proof"
                      className="h-48 w-full object-cover rounded-xl border-2 border-emerald-300 shadow-2xs"
                    />
                  ) : (
                    <div className="h-48 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 flex flex-col items-center justify-center text-xs text-amber-800 p-4 text-center">
                      <Clock3 className="h-6 w-6 text-amber-600 mb-1" />
                      <span>Pending field worker repair and photo upload</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Status Timeline */}
        <div className="space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Clock3 className="h-4 w-4 text-teal-700" />
                Resolution Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="relative pl-5 border-l-2 border-teal-200 space-y-4">
                {issue.status_history.map((hist, idx) => (
                  <div key={hist.id || idx} className="relative space-y-1 text-xs">
                    <div className="absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full bg-teal-600 ring-4 ring-white" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{hist.new_status.replace("_", " ")}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(hist.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{hist.notes}</p>
                    <p className="text-[10px] font-semibold text-teal-800">{hist.changed_by_name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Reopen Grievance
            </h3>
            <p className="text-xs text-muted-foreground">
              Please specify why the resolution was unsatisfactory so the department can perform rework.
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Patching was uneven and loose gravel remains..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full rounded-lg border border-border/80 bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowReopenModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReopen}
                disabled={!reopenReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Submit Reopen Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
