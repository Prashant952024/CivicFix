import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  GraduationCap,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { confirmInstitutionSelections, runInstitutionMatching } from "@/lib/matching";
import { sendInstitutionInvitations } from "@/lib/outreach";
import type { ProblemControlCenterData } from "@/lib/innovation";

interface RecommendationEngineProps {
  problem: ProblemControlCenterData["problem"];
  challenge: ProblemControlCenterData["challenge"];
  matching: ProblemControlCenterData["matching"];
  onInspectInstitutionById: (institutionId: string) => void;
  onRefresh: () => void;
  onNavigateToCollaborations?: () => void;
}

export function RecommendationEngine({
  problem,
  challenge,
  matching,
  onInspectInstitutionById,
  onRefresh,
  onNavigateToCollaborations,
}: RecommendationEngineProps) {
  const navigate = useNavigate();
  const { profile, roleCode } = useAppSession();
  const isAdmin = roleCode === "ADMIN";

  // Selection state for unlimited institutions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    matching.topMatches.forEach((m) => {
      if (m.isSelected) initial.add(m.institutionId);
    });
    return initial;
  });

  // Re-run matching state
  const [reRunning, setReRunning] = useState(false);
  const [reRunError, setReRunError] = useState<string | null>(null);

  // Send Invitations dialog state
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState(
    `We invite your institution to co-develop a research solution for the complex civic problem "${problem.title}".`
  );
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [invitationSuccess, setInvitationSuccess] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(matching.topMatches.map((m) => m.institutionId)));
  };

  const handleSelectTop5 = () => {
    const top5 = matching.topMatches.slice(0, 5).map((m) => m.institutionId);
    setSelectedIds(new Set(top5));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Trigger matching engine run
  const handleRunMatching = async () => {
    if (!challenge) return;
    setReRunning(true);
    setReRunError(null);

    try {
      await runInstitutionMatching(challenge.id, Boolean(matching.lastRunAt));
      onRefresh();
    } catch (err: unknown) {
      setReRunError(
        err instanceof Error ? err.message : "Failed to run institution matching."
      );
    } finally {
      setReRunning(false);
    }
  };

  // Dispatch invitations for all selected institutions
  const handleDispatchInvitations = async () => {
    if (!challenge) return;
    if (selectedIds.size === 0) {
      setInvitationError("Please select at least one institution for outreach.");
      return;
    }

    setSendingInvitations(true);
    setInvitationError(null);

    try {
      // 1. Save selections with unlimited selection support
      const selectionItems = Array.from(selectedIds).map((instId, idx) => ({
        institutionId: instId,
        isManualOverride: false,
        selectionRank: idx + 1,
      }));

      await confirmInstitutionSelections(challenge.id, selectionItems, profile?.id);

      // 2. Dispatch invitations using existing outreach service
      const result = await sendInstitutionInvitations({
        challengeId: challenge.id,
        message: invitationMessage.trim(),
        clerkUserId: profile?.id,
      });

      setInvitationSuccess(
        `Successfully dispatched invitations to ${result.createdCount} institution(s)!`
      );

      setTimeout(() => {
        setInvitationDialogOpen(false);
        setInvitationSuccess(null);
        onRefresh();
        if (onNavigateToCollaborations) {
          onNavigateToCollaborations();
        }
      }, 1000);
    } catch (err: unknown) {
      setInvitationError(
        err instanceof Error ? err.message : "Failed to dispatch invitations."
      );
    } finally {
      setSendingInvitations(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SECTION TITLE & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary shrink-0" />
            <span>Institution Recommendation &amp; Matching Engine</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Multi-vector screening of accredited universities, research institutes, and specialized laboratories across India
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToCollaborations && (
            <Button
              size="sm"
              variant="outline"
              onClick={onNavigateToCollaborations}
              className="text-xs font-semibold gap-1.5 h-8.5"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>University Collaborations &rarr;</span>
            </Button>
          )}

          {challenge && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigate(`/app/innovation/challenges/${challenge.id}/matching`);
              }}
              className="text-xs font-semibold gap-1.5 h-8.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Matching Console</span>
            </Button>
          )}

          {isAdmin ? (
            <Badge variant="outline" className="text-xs font-medium border-primary/30 bg-primary/5 text-primary py-1 px-2.5 rounded-xl gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Matching Oversight (Read-Only)</span>
            </Badge>
          ) : challenge ? (
            <Button
              size="sm"
              variant="innovation"
              onClick={() => {
                void handleRunMatching();
              }}
              disabled={reRunning}
              className="text-xs font-bold gap-1.5 shadow-xs h-8.5 px-3.5"
            >
              {reRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Registry...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{matching.lastRunAt ? "Re-run Recommendations" : "Run Recommendations"}</span>
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {reRunError && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800">
          {reRunError}
        </div>
      )}

      {/* 2. LATEST RECOMMENDATION RUN METADATA BANNER */}
      <Card className="border-border/90 bg-gradient-to-r from-teal-50/40 via-sky-50/20 to-background shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-stat-label block">
                Evaluated Registry Pool
              </span>
              <span className="text-stat-number text-foreground block mt-0.5">
                {matching.eligibleCount}
              </span>
              <span className="text-meta text-muted-foreground block truncate">
                Candidate institutions screened
              </span>
            </div>

            <div>
              <span className="text-stat-label block">
                Qualified Matches
              </span>
              <span className="text-stat-number text-teal-800 block mt-0.5">
                {matching.matchesCount}
              </span>
              <span className="text-meta text-teal-900 font-semibold block truncate">
                Ranked recommendations
              </span>
            </div>

            <div>
              <span className="text-stat-label block">
                Evaluation Algorithm
              </span>
              <span className="text-xs font-bold text-foreground block mt-1.5 truncate">
                {matching.modelUsed || "CivicFix 10D Multi-Vector Engine"}
              </span>
              <span className="text-meta text-muted-foreground block truncate">
                Domain, labs, &amp; publications
              </span>
            </div>

            <div>
              <span className="text-stat-label block">
                Screening Timestamp
              </span>
              <span className="text-xs font-bold text-foreground block mt-1.5 truncate">
                {matching.lastRunAt ? new Date(matching.lastRunAt).toLocaleString() : "Awaiting Initial Run"}
              </span>
              <span className="text-meta text-muted-foreground block truncate">
                Live screening cache
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. RECOMMENDATIONS LIST & UNLIMITED SELECTION */}
      {matching.topMatches.length === 0 ? (
        <EmptyState
          title="No Recommendations Generated Yet"
          description="Screen accredited universities against this complex problem using the 10-dimensional evaluation framework."
          action={
            challenge ? (
              <Button
                onClick={() => {
                  void handleRunMatching();
                }}
                disabled={reRunning}
                className="bg-primary text-primary-foreground text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Recommendations</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Top Selection Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/80 shadow-xs text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              {!isAdmin && (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectTop5}
                      className="h-7.5 px-2.5 text-xs text-teal-800 border-teal-300 bg-teal-50/60 hover:bg-teal-100 font-semibold gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      <span>Select Top 5</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSelectAll}
                      className="h-7.5 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      <span>Select All ({matching.topMatches.length})</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDeselectAll}
                      className="h-7.5 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Deselect All</span>
                    </Button>
                  </div>
                  <span className="text-border">|</span>
                </>
              )}

              <span className="font-semibold text-foreground">
                {isAdmin ? (
                  <span>Showing <strong className="text-teal-700">{matching.topMatches.length}</strong> evaluated institution(s)</span>
                ) : (
                  <span>Selected: <span className="font-bold text-teal-700">{selectedIds.size}</span> institution(s)</span>
                )}
              </span>
            </div>

            {!isAdmin && challenge && (
              <Button
                size="sm"
                onClick={() => setInvitationDialogOpen(true)}
                disabled={selectedIds.size === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 h-8 px-4 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Invitations ({selectedIds.size})</span>
              </Button>
            )}
          </div>

          {/* Top 5 Recommended Spotlight Header */}
          <div className="pt-2 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground text-sm">
                Top Recommended Institutions
              </h3>
              <Badge variant="research" size="sm" className="font-bold text-[10px]">
                AI Multi-Vector Rank #1–#5
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Evaluated across 10-dimensional domain and capability criteria
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {matching.topMatches.map((m, idx) => {
              const isChecked = selectedIds.has(m.institutionId);
              const isTop5 = idx < 5;

              return (
                <div key={m.institutionId} className="space-y-3">
                  {idx === 5 && (
                    <div className="pt-4 pb-1 border-t border-border flex items-center justify-between">
                      <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
                        Additional Qualified Candidates ({matching.topMatches.length - 5})
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        Eligible for selection and outreach
                      </span>
                    </div>
                  )}

                  <Card
                    className={`border transition-all duration-150 ${
                      isChecked
                        ? "border-teal-400 bg-teal-50/20 shadow-xs ring-1 ring-teal-400/40"
                        : isTop5
                        ? "border-teal-200/90 bg-card hover:border-teal-300 shadow-2xs"
                        : "border-border/80 bg-card hover:bg-muted/10"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        {/* Left: Checkbox, Rank, Name, Badges */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSelect(m.institutionId)}
                            className="mt-0.5 text-muted-foreground hover:text-primary transition shrink-0 cursor-pointer"
                            title={isChecked ? "Deselect" : "Select"}
                            aria-label={isChecked ? `Deselect ${m.institutionName}` : `Select ${m.institutionName}`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-teal-700" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-muted-foreground text-xs">
                                #{m.rank}
                              </span>
                              <span
                                onClick={() => onInspectInstitutionById(m.institutionId)}
                                className="font-bold text-foreground text-sm hover:text-primary cursor-pointer transition truncate"
                              >
                                {m.institutionName}
                              </span>
                              {isTop5 && (
                                <Badge variant="research" size="sm" className="font-bold text-[10px] px-2 py-0.5">
                                  Top 5 Spotlight
                                </Badge>
                              )}
                              {m.institutionAcronym && (
                                <Badge variant="outline" size="sm" className="font-semibold">
                                  {m.institutionAcronym}
                                </Badge>
                              )}
                              {m.recommendedRole && (
                                <Badge variant="info" size="sm" className="text-[10px]">
                                  {m.recommendedRole}
                                </Badge>
                              )}
                              {m.isSelected && (
                                <Badge variant="civic" size="sm" className="text-[10px] font-bold">
                                  Selected
                                </Badge>
                              )}
                              {m.invitationStatus && (
                                <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                                  Invite: {m.invitationStatus}
                                </Badge>
                              )}
                            </div>

                            {/* Strengths */}
                            {m.topStrengths && m.topStrengths.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                  Strengths:
                                </span>
                                {m.topStrengths.map((str, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="inline-block px-2 py-0.5 rounded-md bg-muted/50 border border-border/70 text-[10px] text-foreground font-medium"
                                  >
                                    {str}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Scores & Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                          {/* Overall Score */}
                          <div className="text-center md:text-right">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                              Overall Match
                            </span>
                            <span className="text-base font-black text-teal-800 block">
                              {Math.round(m.overallScore * 100)}%
                            </span>
                          </div>

                          {/* Semantic Fit */}
                          <div className="text-center md:text-right">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                              Semantic Fit
                            </span>
                            <span className="text-xs font-semibold text-foreground block">
                              {Math.round(m.aiSemanticScore * 100)}%
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onInspectInstitutionById(m.institutionId)}
                              className="h-8 px-2.5 text-xs text-primary font-bold hover:bg-primary/10 gap-1"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </Button>

                            {!isAdmin && (
                              <Button
                                size="sm"
                                variant={isChecked ? "outline" : "default"}
                                onClick={() => toggleSelect(m.institutionId)}
                                className={`h-8 px-3 text-xs font-bold gap-1 ${
                                  isChecked
                                    ? "text-muted-foreground border-border"
                                    : "bg-primary text-primary-foreground"
                                }`}
                              >
                                {isChecked ? "Remove" : "Select"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SEND INVITATIONS CONFIRMATION DIALOG */}
      <Dialog
        open={invitationDialogOpen}
        onClose={() => setInvitationDialogOpen(false)}
        maxWidth="md"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              <span>Dispatch Challenge Collaboration Invitations</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Send formal municipal outreach invitations to {selectedIds.size} selected research institution(s).
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-foreground block">
              Custom Outreach Message
            </label>
            <textarea
              rows={3}
              value={invitationMessage}
              onChange={(e) => setInvitationMessage(e.target.value)}
              className="w-full p-2.5 bg-muted/20 border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground resize-none"
            />
          </div>

          {invitationError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800">
              {invitationError}
            </div>
          )}

          {invitationSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{invitationSuccess}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInvitationDialogOpen(false)}
              disabled={sendingInvitations}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void handleDispatchInvitations();
              }}
              disabled={sendingInvitations || selectedIds.size === 0}
              className="bg-primary text-primary-foreground text-xs font-bold gap-1.5 px-4"
            >
              {sendingInvitations ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Invitations...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Send ({selectedIds.size})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
