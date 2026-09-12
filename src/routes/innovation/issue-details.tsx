import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Eye,
  Lightbulb,
  Loader2,
  MapPin,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

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
  const navigate = useNavigate();
  const [issue, setIssue] = useState<ComplexIssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Challenge Generation State
  const [generatingChallenge, setGeneratingChallenge] = useState(false);
  const [challengeActionError, setChallengeActionError] = useState<string | null>(null);

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

      setLoading(false);
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [issueId, refreshNonce]);

  async function handleGenerateOrOpenChallenge() {
    if (!issue) return;

    // If an innovation challenge already exists for this issue, navigate directly to it
    const existing = issue.innovation_challenges?.[0];
    if (existing?.id) {
      void navigate(`/app/innovation/challenges/${existing.id}`);
      return;
    }

    // Otherwise, invoke the Edge Function to synthesize an AI draft and initialize the challenge
    setGeneratingChallenge(true);
    setChallengeActionError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          issue_id: issue.id,
          save_draft: true,
        }),
      });

      const resData = (await response.json()) as {
        success?: boolean;
        challenge?: { id: string };
        error?: string;
      };

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to generate challenge statement.");
      }

      if (resData.challenge?.id) {
        void navigate(`/app/innovation/challenges/${resData.challenge.id}`);
      } else {
        setRefreshNonce((prev) => prev + 1);
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error("Challenge generation error:", err);
      setChallengeActionError(err instanceof Error ? err.message : "Failed to formulate innovation challenge.");
    } finally {
      setGeneratingChallenge(false);
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

  const primaryChallenge = challenges[0];

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
            {primaryChallenge ? (
              <Button
                size="sm"
                asChild
                className="gap-1.5 shadow-sm"
              >
                <Link to={`/app/innovation/challenges/${primaryChallenge.id}`}>
                  <Rocket className="h-4 w-4" />
                  Open Challenge Workspace
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => void handleGenerateOrOpenChallenge()}
                disabled={generatingChallenge}
                className="gap-1.5 shadow-sm bg-primary text-primary-foreground font-semibold"
              >
                {generatingChallenge ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Synthesizing with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Formulate Innovation Challenge
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      {/* Challenge Generation Error Banner */}
      {challengeActionError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">Challenge Generation Failed</p>
            <p className="mt-0.5 text-muted-foreground">{challengeActionError}</p>
          </div>
        </div>
      ) : null}

      {/* Authoritative Admin Decision Banner */}
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50/70 via-surface to-transparent shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  Admin Approved as COMPLEX
                </span>
                <Badge variant="teal" size="sm" className="text-[10px]">
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
                <p className="text-xs text-amber-900 mt-1 italic font-medium">
                  &ldquo;Override Reason: {issue.classification_override_reason}&rdquo;
                </p>
              ) : null}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-muted-foreground block uppercase font-mono">
              Complexity Rating
            </span>
            <div className="text-2xl font-black font-mono text-teal-800">
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
                <Rocket className="h-4 w-4 text-primary" />
                Formulated Innovation Challenges ({challenges.length})
              </CardTitle>
              {!primaryChallenge && (
                <Button
                  size="sm"
                  onClick={() => void handleGenerateOrOpenChallenge()}
                  disabled={generatingChallenge}
                  className="gap-1 text-xs"
                >
                  {generatingChallenge ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Synthesize Challenge
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0 divide-y">
              {challenges.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-3">
                  <p className="font-semibold text-foreground">No Innovation Challenge Drafted Yet</p>
                  <p className="leading-relaxed">
                    Convert this complex grievance into a 14-point structured challenge for universities, researchers, and startups using Gemini AI.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => void handleGenerateOrOpenChallenge()}
                    disabled={generatingChallenge}
                    className="gap-1.5 shadow-sm"
                  >
                    {generatingChallenge ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating AI Problem Statement...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate AI Challenge Statement
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                challenges.map((c) => (
                  <div key={c.id} className="p-4 space-y-3 hover:bg-muted/20 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                        <span className="text-[11px] text-muted-foreground">
                          Category: {c.problem_category || c.category}
                        </span>
                      </div>
                      <Badge
                        variant={c.status === "APPROVED" ? "teal" : "amber"}
                        size="sm"
                        className="font-bold"
                      >
                        {c.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {c.problem_statement}
                    </p>

                    {(c.required_domains?.length || c.required_expertise?.length) ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(c.required_domains?.length ? c.required_domains : c.required_expertise || []).map((exp, idx) => (
                          <Badge key={idx} variant="outline" size="sm" className="text-[10px] bg-background">
                            {exp}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t">
                      <span>Scope: {c.geographic_scope || "Regional"}</span>
                      <Button size="sm" asChild variant="outline" className="h-7 text-xs gap-1">
                        <Link to={`/app/innovation/challenges/${c.id}`}>
                          <span>Open Workspace</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Complexity Diagnostic & Domain Tags */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="border-teal-200/80 bg-teal-50/20">
            <CardHeader className="pb-3 border-b border-teal-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-teal-950 flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                AI Complexity Diagnostic
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {/* Score Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">Complexity Score:</span>
                  <span className="font-mono font-bold text-sm text-teal-800">
                    {complexityScore} / 100
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
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
    </div>
  );
}
