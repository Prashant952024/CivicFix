import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Eye,
  Lightbulb,
  Loader2,
  MapPin,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { formatCitizenIssueDateTime, formatCitizenIssueImageUrl, type CitizenIssueImageRow } from "@/lib/citizen-issues";
import {
  formatOfficerIssuePriority,
  getOfficerIssuePriorityTone,
  getOfficerIssueSeverityLabel,
  getOfficerIssueSeverityTone,
} from "@/lib/officer-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ComplexIssueDetail = Database["public"]["Tables"]["issues"]["Row"] & {
  issue_images?: CitizenIssueImageRow[] | null;
  reporter_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  decided_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
  issue_ai_analysis?: Database["public"]["Tables"]["issue_ai_analysis"]["Row"][] | null;
  innovation_challenges?: Database["public"]["Tables"]["innovation_challenges"]["Row"][] | null;
};

export function InnovationIssueDetailsPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const { profile } = useAppSession();
  const [issue, setIssue] = useState<ComplexIssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Formulate Challenge State
  const [formulateModalOpen, setFormulateModalOpen] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [affectedPopulation, setAffectedPopulation] = useState("");
  const [geographicScope, setGeographicScope] = useState("");
  const [requiredExpertiseInput, setRequiredExpertiseInput] = useState("");
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!issueId) return;
    const currentIssueId = issueId;

    let cancelled = false;

    async function loadIssue() {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from("issues")
        .select(`
          *,
          issue_images(id, storage_bucket, storage_path, image_type, created_at),
          reporter_profile:profiles!issues_reporter_profile_id_fkey(id, full_name, email),
          decided_by_profile:profiles!issues_classification_decided_by_fkey(id, full_name, email),
          issue_ai_analysis(*),
          innovation_challenges(*)
        `)
        .eq("id", currentIssueId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchErr || !data) {
        if (import.meta.env.DEV) console.error("Complex issue details load error:", fetchErr);
        setError("Unable to find or access this complex issue.");
        setLoading(false);
        return;
      }

      setIssue(data as ComplexIssueDetail);

      // Pre-fill challenge creation form
      setChallengeTitle(`Innovation Challenge: ${data.title}`);
      setProblemStatement(
        `${data.description}\n\nSystemic Complexity: ${data.ai_complexity_reasoning || "Requires interdisciplinary solution."}`,
      );
      setAffectedPopulation("Local civic community and municipal zone");
      setGeographicScope(data.address_text || data.location_text || "Municipal Jurisdiction");
      setRequiredExpertiseInput((data.ai_required_expertise || []).join(", "));

      setLoading(false);
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [issueId, refreshNonce]);

  async function handleCreateChallenge() {
    if (!issue || !profile?.id) return;

    if (!challengeTitle.trim() || !problemStatement.trim()) {
      setChallengeError("Title and Problem Statement are mandatory.");
      return;
    }

    setSubmittingChallenge(true);
    setChallengeError(null);

    const expertiseList = requiredExpertiseInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const { error: insertErr } = await supabase.from("innovation_challenges").insert({
        source_issue_id: issue.id,
        title: challengeTitle.trim(),
        problem_statement: problemStatement.trim(),
        category: issue.category,
        complexity_score: issue.ai_complexity_score ?? 75,
        required_expertise: expertiseList,
        affected_population: affectedPopulation.trim() || null,
        geographic_scope: geographicScope.trim() || null,
        status: "OPEN_FOR_PROPOSALS",
        created_by: profile.id,
      });

      if (insertErr) throw insertErr;

      setChallengeSuccess("Innovation challenge formulated successfully!");
      setFormulateModalOpen(false);
      setRefreshNonce((prev) => prev + 1);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Challenge creation error:", err);
      setChallengeError(err instanceof Error ? err.message : "Failed to create challenge.");
    } finally {
      setSubmittingChallenge(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
        Loading complex challenge details...
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <p className="font-semibold text-foreground">{error ?? "Issue not found."}</p>
        <Button asChild variant="outline">
          <Link to="/app/innovation/issues">Back to Complex Issues</Link>
        </Button>
      </div>
    );
  }

  const latestAi = issue.issue_ai_analysis?.[0];
  const complexityScore = issue.ai_complexity_score ?? latestAi?.complexity_score ?? 75;
  const challenges = issue.innovation_challenges ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={issue.title}
        description="Complex societal problem statement under Innovation Management."
        backHref="/app/innovation/issues"
        backLabel="Complex Issues"
        tag="Innovation Portal"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setFormulateModalOpen(true)}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Rocket className="h-4 w-4" />
              Formulate Challenge
            </Button>
          </div>
        }
      />

      {challengeSuccess ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold">{challengeSuccess}</p>
            <p className="mt-0.5 text-muted-foreground">
              This challenge statement is now registered in the innovation pipeline.
            </p>
          </div>
        </div>
      ) : null}

      {/* Authoritative Admin Decision Banner */}
      <Card className="border-purple-300 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  Admin Approved as COMPLEX
                </span>
                <Badge variant="danger" size="sm" className="bg-purple-600 text-[10px]">
                  Authoritative
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Decided by:{" "}
                <strong className="text-foreground">
                  {issue.decided_by_profile?.full_name || "Platform Admin"}
                </strong>{" "}
                {issue.classification_decided_at
                  ? `on ${formatCitizenIssueDateTime(issue.classification_decided_at)}`
                  : null}
              </p>
              {issue.classification_override_reason ? (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 italic">
                  &ldquo;Override Reason: {issue.classification_override_reason}&rdquo;
                </p>
              ) : null}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-muted-foreground block uppercase font-mono">
              Complexity Rating
            </span>
            <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-400">
              {complexityScore} / 100
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Complaint & Visual Evidence */}
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Grievance Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Citizen Problem Description
                </h4>
                <p className="text-sm leading-relaxed text-foreground bg-muted/30 p-3 rounded-lg border">
                  {issue.description}
                </p>
              </div>

              {/* Photos */}
              {issue.issue_images && issue.issue_images.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Visual Evidence ({issue.issue_images.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {issue.issue_images.map((img) => {
                      const url = formatCitizenIssueImageUrl(img);
                      if (!url) return null;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          className="relative group overflow-hidden rounded-lg border aspect-video bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <img
                            src={url}
                            alt="Evidence"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="h-4 w-4" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3 border-t">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Domain Category</span>
                  <span className="font-medium text-foreground">{issue.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Severity</span>
                  <Badge variant={getOfficerIssueSeverityTone(issue.severity)} size="sm">
                    {getOfficerIssueSeverityLabel(issue.severity)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Priority</span>
                  <Badge variant={getOfficerIssuePriorityTone(issue.priority)} size="sm">
                    {formatOfficerIssuePriority(issue.priority)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Reported</span>
                  <span className="font-medium text-foreground">{formatCitizenIssueDateTime(issue.created_at)}</span>
                </div>
              </div>

              {issue.address_text || issue.location_text ? (
                <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{issue.address_text || issue.location_text}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Formulated Challenges for this Issue */}
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Rocket className="h-4 w-4 text-purple-600" />
                Formulated Innovation Challenges ({challenges.length})
              </CardTitle>
              <Button size="sm" onClick={() => setFormulateModalOpen(true)} className="gap-1 text-xs">
                + New Challenge
              </Button>
            </CardHeader>

            <CardContent className="p-0 divide-y">
              {challenges.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <p>No innovation challenges formulated for this issue yet.</p>
                  <p className="mt-1">
                    Click &ldquo;Formulate Challenge&rdquo; to structure this problem statement for research labs and startups.
                  </p>
                </div>
              ) : (
                challenges.map((c) => (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                      <Badge variant="outline" size="sm">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.problem_statement}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.required_expertise.map((exp, idx) => (
                        <Badge key={idx} variant="outline" size="sm" className="text-[10px]">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                      <span>Scope: {c.geographic_scope || "General"}</span>
                      <span>Created {formatCitizenIssueDateTime(c.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Complexity Diagnostic & Domain Tags */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="border-indigo-200/80 bg-indigo-50/20 dark:bg-indigo-950/10">
            <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-600" />
                AI Complexity Diagnostic
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {/* Score Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Complexity Score:</span>
                  <span className="font-mono font-bold text-sm text-purple-700 dark:text-purple-400">
                    {complexityScore} / 100
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-600"
                    style={{ width: `${Math.min(100, complexityScore)}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Systemic Nature & Reasoning:</span>
                <p className="italic text-foreground bg-background/80 p-3 rounded-lg border leading-relaxed mt-1">
                  &ldquo;{issue.ai_complexity_reasoning || latestAi?.complexity_reasoning || "Identified as multi-domain challenge requiring cross-organization innovation."}&rdquo;
                </p>
              </div>

              {issue.ai_required_expertise && issue.ai_required_expertise.length > 0 ? (
                <div>
                  <span className="text-muted-foreground block text-[11px] mb-1.5">
                    Recommended Disciplines & Expertises:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {issue.ai_required_expertise.map((exp, idx) => (
                      <Badge key={idx} variant="outline" size="sm" className="bg-background text-foreground text-[11px]">
                        {exp}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Model: {latestAi?.model || "Google Gemini"}</span>
                <span>Confidence: {Math.round((issue.ai_classification_confidence ?? 0.9) * 100)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Guidance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Innovation Manager Role
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                As Innovation Manager, you translate citizen grievance signals into well-formed research and pilot challenge statements.
              </p>
              <p>
                In subsequent phases, these challenges will be browsable by university faculty, researchers, student capstone teams, and civic tech startups for funded pilot interventions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage ? (
        <Dialog
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title="Evidence Preview"
          maxWidth="2xl"
        >
          <div className="flex items-center justify-center p-2">
            <img
              src={previewImage}
              alt="Evidence"
              className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
            />
          </div>
        </Dialog>
      ) : null}

      {/* Formulate Challenge Modal */}
      {formulateModalOpen ? (
        <Dialog
          open={formulateModalOpen}
          onClose={() => setFormulateModalOpen(false)}
          title="Formulate Innovation Challenge"
          description="Convert this complex issue into a structured ecosystem challenge."
          maxWidth="lg"
        >
          <div className="space-y-4 pt-2 text-xs">
            {challengeError ? (
              <div className="p-2.5 rounded border border-rose-200 bg-rose-50 text-rose-800 text-xs">
                {challengeError}
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="font-semibold text-foreground block">
                Challenge Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Distributed Runoff Sensor Network for Ward 4"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground block">
                Problem Statement & Scope <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={4}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Detailed description of the systemic failure, required research, and pilot objectives..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  Affected Population
                </label>
                <input
                  type="text"
                  value={affectedPopulation}
                  onChange={(e) => setAffectedPopulation(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. ~12,000 residents"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  Geographic Scope
                </label>
                <input
                  type="text"
                  value={geographicScope}
                  onChange={(e) => setGeographicScope(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Sector 5 Drainage Basin"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground block">
                Required Expertises (comma-separated)
              </label>
              <input
                type="text"
                value={requiredExpertiseInput}
                onChange={(e) => setRequiredExpertiseInput(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Hydrology, IoT, Civil Engineering"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormulateModalOpen(false)}
                disabled={submittingChallenge}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void handleCreateChallenge();
                }}
                disabled={submittingChallenge}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {submittingChallenge ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Rocket className="h-3.5 w-3.5" />
                )}
                Register Challenge
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
