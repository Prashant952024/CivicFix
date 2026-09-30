import { useMemo } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Mic,
  PlusCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoCitizenDashboardPage() {
  const { issues, currentPersona, citizenConfirmResolution } = useDemo();

  // Filter issues reported by citizen or relevant to citizen
  const myIssues = useMemo(() => {
    return issues.filter(
      (i) => i.reporter_name.includes("Priya") || i.reporter_email.includes("citizen") || i.id.startsWith("DEMO-CF-")
    );
  }, [issues]);

  const stats = useMemo(() => {
    const total = myIssues.length;
    const resolved = myIssues.filter(
      (i) => i.status === "RESOLVED" || i.status === "CITIZEN_VERIFIED"
    ).length;
    const inProgress = myIssues.filter(
      (i) => i.status === "IN_PROGRESS" || i.status === "ASSIGNED" || i.status === "UNDER_REVIEW"
    ).length;
    const submitted = myIssues.filter(
      (i) => i.status === "SUBMITTED" || i.status === "AI_ANALYZED" || i.status === "VERIFIED"
    ).length;

    return { total, resolved, inProgress, submitted };
  }, [myIssues]);

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Citizen Grievance Center"
        title="My Reported Grievances"
        description={`Logged in as ${currentPersona.fullName} · Real-time tracking of civic reports with photo evidence`}
        actions={
          <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold">
            <Link to="/demo/citizen/report">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Report New Issue
            </Link>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Reports</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <Clock3 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Under Triage</p>
              <p className="text-2xl font-bold text-sky-700 mt-1">{stats.submitted}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Progress / Review</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.inProgress}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolved & Verified</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Your Grievance Portfolio</CardTitle>
            <p className="text-xs text-muted-foreground">Click any issue to inspect status timeline, photo proof, or verify resolution.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/citizen/report">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              New Report
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 divide-y">
          {myIssues.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No issues reported yet. Click &quot;Report New Issue&quot; above to create one.
            </div>
          ) : (
            myIssues.map((issue) => {
              const hasResolutionProof = issue.images.some(
                (img) => img.image_type === "RESOLUTION_EVIDENCE"
              );
              const isResolved = issue.status === "RESOLVED";
              const isVerified = issue.status === "CITIZEN_VERIFIED";

              return (
                <div
                  key={issue.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {issue.id}
                      </span>
                      <h3 className="text-sm font-bold text-foreground hover:text-teal-700">
                        <Link to={`/demo/citizen/issues/${issue.id}`}>{issue.title}</Link>
                      </h3>
                      <Badge
                        variant={
                          issue.status === "CITIZEN_VERIFIED" || issue.status === "RESOLVED"
                            ? "success"
                            : issue.status === "IN_PROGRESS" || issue.status === "UNDER_REVIEW"
                              ? "info"
                              : "outline"
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {issue.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">{issue.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-red-500" />
                        {issue.location_text}
                      </span>
                      <span>·</span>
                      <span>Priority: <strong className="text-foreground">{issue.priority}</strong></span>
                      <span>·</span>
                      <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                      {hasResolutionProof && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <Camera className="h-3 w-3" />
                          Photo Proof Attached
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isResolved && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => citizenConfirmResolution(issue.id, true)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Confirm Resolution
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => citizenConfirmResolution(issue.id, false, "Incomplete repair")}
                          className="h-8 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                        >
                          Reopen
                        </Button>
                      </div>
                    )}

                    {isVerified && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Citizen Confirmed
                      </span>
                    )}

                    <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                      <Link to={`/demo/citizen/issues/${issue.id}`}>
                        Details & Timeline
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
