import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  X,
  Clock,
  Send,
  Mail,
  FileText,
  CheckCheck,
  XCircle,
  Ban,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { InstitutionProfileModal } from "@/components/institutions/institution-profile-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  confirmInstitutionSelections,
  fetchChallengeSelections,
  fetchLatestMatchRun,
  fetchMatchesForRun,
  runInstitutionMatching,
  searchEligibleInstitutions,
  type MatchWithInstitution,
} from "@/lib/matching";
import {
  cancelInstitutionInvitation,
  fetchChallengeInvitations,
  sendInstitutionInvitations,
  type ChallengeInvitationWithDetails,
} from "@/lib/outreach";
import {
  fetchChallengeProjects,
  type ChallengeProjectWithDetails,
} from "@/lib/projects";
import { supabase } from "@/lib/supabase";
import type {
  Database,
  InstitutionMatchRunRow,
  InstitutionRow,
  MatchDimensionScores,
} from "@/types/database";

type ChallengeRecord = Database["public"]["Tables"]["innovation_challenges"]["Row"];

interface SelectedItem {
  institution: InstitutionRow;
  isManualOverride: boolean;
  overrideReason?: string | null;
  selectionRank?: number | null;
  matchRunId?: string | null;
}

export function ChallengeMatchingPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { profile } = useAppSession();

  const [challenge, setChallenge] = useState<ChallengeRecord | null>(null);
  const [matchRun, setMatchRun] = useState<InstitutionMatchRunRow | null>(null);
  const [matches, setMatches] = useState<MatchWithInstitution[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<SelectedItem[]>([]);

  // Phase 3D-1 Outreach states
  const [invitations, setInvitations] = useState<ChallengeInvitationWithDetails[]>([]);
  const [challengeProjects, setChallengeProjects] = useState<ChallengeProjectWithDetails[]>([]);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState(
    "We invite your institution to review this municipal innovation challenge and participate in co-developing a high-impact solution for our city."
  );
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedInvitationForDetail, setSelectedInvitationForDetail] =
    useState<ChallengeInvitationWithDetails | null>(null);

  const projectByInstitutionId = useMemo(
    () => new Map(challengeProjects.map((p) => [p.institution_id, p])),
    [challengeProjects]
  );

  // Loading states
  const [loading, setLoading] = useState(true);
  const [matchingInProgress, setMatchingInProgress] = useState(false);
  const [savingSelections, setSavingSelections] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // UI view toggles
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [confirmRerunOpen, setConfirmRerunOpen] = useState(false);
  const [showFullProblemStatement, setShowFullProblemStatement] = useState(false);

  // Profile Modal
  const [profileModalInstitution, setProfileModalInstitution] = useState<InstitutionRow | null>(null);
  const [profileModalMatch, setProfileModalMatch] = useState<MatchWithInstitution | null>(null);

  // Manual Override Search & Modal
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InstitutionRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [overrideCandidate, setOverrideCandidate] = useState<InstitutionRow | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Load all challenge, match run, matches, and selection data
  useEffect(() => {
    if (!challengeId) return;
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setActionError(null);
      try {
        // 1. Fetch challenge
        const { data: chData, error: chErr } = await supabase
          .from("innovation_challenges")
          .select("*")
          .eq("id", challengeId!)
          .single();

        if (chErr) throw chErr;
        if (isCancelled) return;
        setChallenge(chData);

        // 2. Fetch latest match run
        const latestRun = await fetchLatestMatchRun(challengeId!);
        if (isCancelled) return;
        setMatchRun(latestRun);

        // 3. If match run exists, fetch matches
        if (latestRun) {
          const runMatches = await fetchMatchesForRun(latestRun.id);
          if (isCancelled) return;
          setMatches(runMatches);
        }

        // 4. Fetch existing selections
        const currentSelections = await fetchChallengeSelections(challengeId!);
        if (isCancelled) return;

        if (currentSelections.length > 0) {
          setSelectedInstitutions(
            currentSelections.map((cs) => ({
              institution: cs.institution,
              isManualOverride: cs.is_manual_override,
              overrideReason: cs.override_reason,
              selectionRank: cs.selection_rank,
              matchRunId: cs.match_run_id,
            }))
          );
        }

        // 5. Fetch existing Phase 3D invitations & projects
        const [invList, projList] = await Promise.all([
          fetchChallengeInvitations(challengeId!),
          fetchChallengeProjects(challengeId!).catch((err) => {
            console.warn("Could not fetch challenge projects:", err);
            return [] as ChallengeProjectWithDetails[];
          }),
        ]);
        if (isCancelled) return;
        setInvitations(invList);
        setChallengeProjects(projList);
      } catch (err: unknown) {
        console.error("Error loading challenge matching data:", err);
        const msg = err instanceof Error ? err.message : "Failed to load matching data";
        if (!isCancelled) setActionError(msg);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [challengeId]);

  // Run or re-run matching
  async function handleRunMatching(rerun: boolean = false) {
    if (!challengeId) return;
    setMatchingInProgress(true);
    setActionError(null);
    setActionSuccess(null);
    setConfirmRerunOpen(false);

    try {
      const res = await runInstitutionMatching(challengeId, rerun);
      // Reload latest run and matches
      const updatedRun = await fetchLatestMatchRun(challengeId);
      setMatchRun(updatedRun);
      if (updatedRun) {
        const updatedMatches = await fetchMatchesForRun(updatedRun.id);
        setMatches(updatedMatches);
      }

      // Update local challenge status
      if (challenge) {
        setChallenge({ ...challenge, status: "MATCHING_COMPLETED" });
      }

      setActionSuccess(
        `Matching completed! Evaluated ${res.totalEvaluated} verified institutions. Top ${res.top10Count} candidates identified.`
      );
    } catch (err: unknown) {
      console.error("Matching error:", err);
      const msg = err instanceof Error ? err.message : "Failed to run institution matching";
      setActionError(msg);
    } finally {
      setMatchingInProgress(false);
    }
  }

  // Handle Search for Manual Override
  async function handleSearch(term: string) {
    setSearchQuery(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const excludeIds = selectedInstitutions.map((s) => s.institution.id);
      const results = await searchEligibleInstitutions(term, excludeIds);
      setSearchResults(results);
    } catch (err) {
      console.error("Failed to search institutions:", err);
    } finally {
      setSearching(false);
    }
  }

  // Toggle selection for a Top 10 match
  function handleToggleMatchSelection(match: MatchWithInstitution) {
    const isSelected = selectedInstitutions.some(
      (s) => s.institution.id === match.institution_id
    );

    if (isSelected) {
      setSelectedInstitutions((prev) =>
        prev.filter((s) => s.institution.id !== match.institution_id)
      );
    } else {
      if (selectedInstitutions.length >= 5) {
        setActionError("Maximum 5 institutions can be selected for outreach.");
        return;
      }
      setSelectedInstitutions((prev) => [
        ...prev,
        {
          institution: match.institution,
          isManualOverride: false,
          overrideReason: null,
          selectionRank: match.rank,
          matchRunId: match.match_run_id,
        },
      ]);
    }
  }

  // Confirm manual override selection
  function handleConfirmManualOverride() {
    if (!overrideCandidate) return;
    if (!overrideReason || overrideReason.trim().length < 10) {
      setOverrideError(
        "A justification reason of at least 10 characters is required for manual override."
      );
      return;
    }

    if (selectedInstitutions.length >= 5) {
      setOverrideError("Maximum 5 institutions can be selected for outreach.");
      return;
    }

    setSelectedInstitutions((prev) => [
      ...prev,
      {
        institution: overrideCandidate,
        isManualOverride: true,
        overrideReason: overrideReason.trim(),
        selectionRank: null,
        matchRunId: matchRun?.id ?? null,
      },
    ]);

    // Reset override modal
    setOverrideCandidate(null);
    setOverrideReason("");
    setOverrideError(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  // Remove a selected institution
  function handleRemoveSelection(institutionId: string) {
    setSelectedInstitutions((prev) =>
      prev.filter((s) => s.institution.id !== institutionId)
    );
  }

  // Save/Confirm selections to database
  async function handleConfirmSelections() {
    if (!challengeId) return;
    if (selectedInstitutions.length === 0) {
      setActionError("Please select at least 1 institution before confirming.");
      return;
    }
    if (selectedInstitutions.length > 5) {
      setActionError("You cannot select more than 5 institutions.");
      return;
    }

    setSavingSelections(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = selectedInstitutions.map((s) => ({
        institutionId: s.institution.id,
        matchRunId: s.matchRunId ?? matchRun?.id ?? null,
        selectionRank: s.selectionRank ?? null,
        isManualOverride: s.isManualOverride,
        overrideReason: s.overrideReason ?? null,
      }));

      await confirmInstitutionSelections(challengeId, payload);

      if (challenge) {
        setChallenge({ ...challenge, status: "INSTITUTIONS_SELECTED" });
      }

      setActionSuccess(
        `Successfully saved ${selectedInstitutions.length} institutions for outreach! Selections are locked and ready for Phase 3D invitation dispatch.`
      );
    } catch (err: unknown) {
      console.error("Save selections error:", err);
      const msg = err instanceof Error ? err.message : "Failed to confirm institution selections";
      setActionError(msg);
    } finally {
      setSavingSelections(false);
    }
  }

  // Dispatch Phase 3D-1 invitations to all confirmed selections
  async function handleSendInvitations() {
    if (!challengeId) return;
    if (selectedInstitutions.length === 0) {
      setActionError("Please select at least 1 institution before sending invitations.");
      return;
    }
    if (!invitationMessage.trim()) {
      setActionError("Please enter an invitation message.");
      return;
    }

    setSendingInvitations(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // First ensure current selections are committed
      const payload = selectedInstitutions.map((s) => ({
        institutionId: s.institution.id,
        matchRunId: s.matchRunId ?? matchRun?.id ?? null,
        selectionRank: s.selectionRank ?? null,
        isManualOverride: s.isManualOverride,
        overrideReason: s.overrideReason ?? null,
      }));
      await confirmInstitutionSelections(challengeId, payload);

      const res = await sendInstitutionInvitations({
        challengeId,
        message: invitationMessage.trim(),
        clerkUserId: profile?.id,
      });

      const updatedInvs = await fetchChallengeInvitations(challengeId);
      setInvitations(updatedInvs);

      if (challenge) {
        setChallenge({ ...challenge, status: "INVITATIONS_SENT" });
      }

      setSendDialogOpen(false);
      setActionSuccess(
        `Official invitations dispatched successfully! ${res.createdCount} institutions notified (${res.existingCount} already notified). Challenge status updated to INVITATIONS_SENT.`
      );
    } catch (err: unknown) {
      console.error("Send invitations error:", err);
      const msg = err instanceof Error ? err.message : "Failed to dispatch invitations";
      setActionError(msg);
    } finally {
      setSendingInvitations(false);
    }
  }

  // Cancel an active invitation
  async function handleCancelInvitation(invitationId: string) {
    if (!challengeId) return;
    setCancellingId(invitationId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await cancelInstitutionInvitation(invitationId);
      const updatedInvs = await fetchChallengeInvitations(challengeId);
      setInvitations(updatedInvs);
      setActionSuccess("Invitation has been successfully cancelled.");
    } catch (err: unknown) {
      console.error("Cancel invitation error:", err);
      const msg = err instanceof Error ? err.message : "Failed to cancel invitation";
      setActionError(msg);
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="h-12 w-12 rounded-2xl bg-teal-500/10 flex items-center justify-center animate-pulse">
            <Sparkles className="h-6 w-6 text-teal-600" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-teal-700 absolute inset-0 m-auto" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Loading challenge matching workspace...</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Challenge Not Found"
          backHref="/app/innovation/challenges"
          backLabel="Challenges"
        />
        <EmptyState
          title="Innovation Challenge Not Found"
          description="The requested challenge could not be found or has been deleted."
        />
      </div>
    );
  }

  const isConfirmed =
    challenge.status === "INSTITUTIONS_SELECTED" ||
    challenge.status === "READY_FOR_INVITATION" ||
    challenge.status === "INVITATIONS_SENT";

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <PageHeader
        title="AI Institution Matching & Selection"
        description="Intelligently identify, rank, and select verified institutions with demonstrated capabilities for this challenge."
        backHref={`/app/innovation/challenges/${challenge.id}`}
        backLabel="Challenge Details"
        tag="Phase 3C-Matching"
        actions={
          <div className="flex items-center gap-2">
            {matchRun && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRerunOpen(true)}
                disabled={matchingInProgress || savingSelections}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-run Matching
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link to={`/app/innovation/challenges/${challenge.id}`}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Review Challenge
              </Link>
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 flex items-start justify-between shadow-xs animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{actionSuccess}</p>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-950 flex items-start justify-between shadow-xs animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Challenge Context Summary Dossier */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="border-b border-border/70 bg-surface/70 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Challenge Dossier
            </span>
            <span className="text-xs text-muted-foreground">
              • Scope: {challenge.geographic_scope || "City / Regional"}
            </span>
          </div>
          <Badge
            variant={
              challenge.status === "INVITATIONS_SENT"
                ? "teal"
                : isConfirmed
                ? "teal"
                : matchRun
                ? "info"
                : "default"
            }
            size="sm"
            className="font-semibold"
          >
            {challenge.status === "INVITATIONS_SENT"
              ? "INVITATIONS SENT"
              : isConfirmed
              ? "INSTITUTIONS SELECTED"
              : matchRun
              ? "MATCHING COMPLETED"
              : "READY FOR MATCHING"}
          </Badge>
        </div>

        <CardContent className="p-5 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">{challenge.title}</h2>
              <button
                onClick={() => setShowFullProblemStatement(!showFullProblemStatement)}
                className="text-xs font-semibold text-primary hover:underline shrink-0 flex items-center gap-1"
              >
                {showFullProblemStatement ? (
                  <>
                    Hide Details <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Full Brief <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
            <p className={`text-xs text-muted-foreground leading-relaxed mt-1.5 ${showFullProblemStatement ? "" : "line-clamp-2"}`}>
              {challenge.problem_statement}
            </p>
            {showFullProblemStatement && challenge.root_cause && (
              <div className="mt-2.5 rounded-xl border border-border/70 bg-surface p-3 text-xs text-muted-foreground">
                <strong className="text-foreground block mb-0.5 font-semibold">Identified Root Cause:</strong>
                {challenge.root_cause}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-border/70 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                Problem Category
              </span>
              <Badge variant="outline" size="sm" className="font-semibold">
                {challenge.problem_category || challenge.category || "Cross-Cutting"}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                Required Capability Domains
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(challenge.required_domains ?? []).map((dom, i) => (
                  <Badge key={i} variant="teal" size="sm">
                    {dom}
                  </Badge>
                ))}
                {(!challenge.required_domains || challenge.required_domains.length === 0) && (
                  <span className="text-muted-foreground italic">None specified</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                Target Technologies
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(challenge.potential_technology_areas ?? []).map((tech, i) => (
                  <Badge key={i} variant="sky" size="sm">
                    {tech}
                  </Badge>
                ))}
                {(!challenge.potential_technology_areas ||
                  challenge.potential_technology_areas.length === 0) && (
                  <span className="text-muted-foreground italic">None specified</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance & Privacy Clean Boundary Banner */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950 flex items-start gap-3.5 shadow-xs">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-teal-950 text-xs">
            Managerial Selection &amp; Governance Boundary
          </span>
          <p className="leading-relaxed text-teal-900">
            AI capability matching and selections are internal decision-support artifacts for the Innovation Manager.
            No automated outreach, invitations, or notifications are dispatched. Selected institutions are committed for Phase 3D formal invitations.
          </p>
        </div>
      </div>

      {/* Primary Selection Ribbon Card (Top Workspace) */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="py-3 px-5 border-b border-border/70 bg-surface/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Institutions Selected for Outreach
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Select up to 5 verified institutions for formal Phase 3D invitations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="teal" size="default" className="font-mono font-bold">
              {selectedInstitutions.length} / 5 SELECTED
            </Badge>

            {isConfirmed && (
              <Badge variant="emerald" size="default" className="font-bold">
                <Lock className="h-3 w-3 mr-1" />
                LOCKED
              </Badge>
            )}

            <Button
              size="sm"
              onClick={() => void handleConfirmSelections()}
              disabled={
                savingSelections ||
                matchingInProgress ||
                selectedInstitutions.length === 0 ||
                selectedInstitutions.length > 5
              }
              className="text-xs font-semibold gap-1.5 shadow-xs"
            >
              {savingSelections ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isConfirmed ? "Update Selection" : "Confirm Selection (Commit)"}
            </Button>

            {selectedInstitutions.length > 0 && (
              <Button
                size="sm"
                onClick={() => setSendDialogOpen(true)}
                disabled={
                  savingSelections ||
                  matchingInProgress ||
                  sendingInvitations
                }
                className="text-xs font-semibold gap-1.5 shadow-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Send className="h-3.5 w-3.5" />
                {invitations.length > 0 ? "Dispatch Outreach" : "Send Invitations"}
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const sel = selectedInstitutions[slotIdx];

              if (sel) {
                return (
                  <div
                    key={sel.institution.id}
                    className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-teal-300 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100/70 rounded px-1.5 py-0.5">
                          SLOT {slotIdx + 1}
                        </span>
                        {sel.isManualOverride ? (
                          <Badge variant="amber" size="sm">
                            OVERRIDE
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm" className="font-mono text-teal-800 font-bold">
                            #{sel.selectionRank}
                          </Badge>
                        )}
                        <button
                          onClick={() => handleRemoveSelection(sel.institution.id)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-red-100 hover:text-red-700 transition-colors"
                          title="Remove selection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                        {sel.institution.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {sel.institution.city}, {sel.institution.state}
                      </p>

                      {sel.isManualOverride && sel.overrideReason && (
                        <p className="text-[10px] text-amber-900 bg-amber-50 rounded p-1.5 line-clamp-2 italic border border-amber-200">
                          &ldquo;{sel.overrideReason}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setProfileModalInstitution(sel.institution);
                          setProfileModalMatch(null);
                        }}
                        className="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <span>View Dossier</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`empty-slot-${slotIdx}`}
                  className="rounded-xl border border-dashed border-border/80 bg-surface/50 p-3 flex flex-col items-center justify-center text-center space-y-1.5 min-h-[120px]"
                >
                  <div className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground text-xs font-mono font-semibold">
                    {slotIdx + 1}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Empty Slot</span>
                  <span className="text-[10px] text-muted-foreground">Select candidate below</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PHASE 3D-1: OUTREACH & INVITATIONS MANAGEMENT SECTION */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="py-3 px-5 border-b border-border/70 bg-surface/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Phase 3D-1: Institution Outreach &amp; Invitation Tracking
                </h3>
                <Badge variant="teal" size="sm">
                  Phase 3D-1
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Formal outreach tracking and response management for selected partner institutions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setSendDialogOpen(true)}
              disabled={
                selectedInstitutions.length === 0 ||
                sendingInvitations ||
                savingSelections
              }
              className="text-xs font-semibold gap-1.5 shadow-xs bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Send className="h-3.5 w-3.5" />
              {invitations.length > 0 ? "Dispatch Outreach" : "Send Invitations"}
            </Button>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Status Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/70 bg-surface/40 p-3 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Invited
              </span>
              <span className="text-xl font-bold text-foreground mt-0.5">
                {invitations.length}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Of {selectedInstitutions.length} selected
              </span>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-800">
                Awaiting Response
              </span>
              <span className="text-xl font-bold text-sky-900 mt-0.5">
                {invitations.filter((i) => i.status === "SENT" || i.status === "PENDING").length}
              </span>
              <span className="text-[10px] text-sky-700">Pending review</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                Accepted
              </span>
              <span className="text-xl font-bold text-emerald-900 mt-0.5">
                {invitations.filter((i) => i.status === "ACCEPTED").length}
              </span>
              <span className="text-[10px] text-emerald-700">Ready for collaboration</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Declined / Recalled
              </span>
              <span className="text-xl font-bold text-amber-900 mt-0.5">
                {invitations.filter((i) => i.status === "REJECTED" || i.status === "CANCELLED").length}
              </span>
              <span className="text-[10px] text-amber-700">Audit logged</span>
            </div>
          </div>

          {/* Outreach Table / Empty State */}
          {invitations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-surface/30">
              <Mail className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <h4 className="mt-2 text-xs font-bold text-foreground">
                No Invitations Dispatched Yet
              </h4>
              <p className="mt-1 text-[11px] text-muted-foreground max-w-md mx-auto">
                Once you select up to 5 verified institutions, click &ldquo;Send Invitations&rdquo; to dispatch formal challenge dossiers to their institution portals.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70 bg-surface/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-3">Institution</th>
                    <th className="p-3">Selection Basis</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Dispatched</th>
                    <th className="p-3">Response &amp; Justification</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-card">
                  {invitations.map((inv) => {
                    const matchedProject = projectByInstitutionId.get(inv.institution_id);
                    return (
                      <tr key={inv.id} className="hover:bg-surface/50 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="font-bold text-foreground">{inv.institution.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {inv.institution.city}, {inv.institution.state} · {inv.institution.institution_type.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="p-3">
                          {inv.match_evidence ? (
                            <Badge variant="teal" size="sm" className="font-mono">
                              Match: {inv.match_evidence.overall_score.toFixed(0)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm" className="text-muted-foreground">
                              Selected
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {inv.status === "SENT" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping" />
                              Sent
                            </span>
                          )}
                          {inv.status === "ACCEPTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              <CheckCheck className="h-3 w-3" />
                              Accepted
                            </span>
                          )}
                          {inv.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
                              <XCircle className="h-3 w-3" />
                              Declined
                            </span>
                          )}
                          {inv.status === "CANCELLED" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                              <Ban className="h-3 w-3" />
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-muted-foreground font-mono">
                          {new Date(inv.invited_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 max-w-xs">
                          {inv.status === "ACCEPTED" && (
                            <div className="space-y-1.5">
                              <div className="text-[11px] text-emerald-950 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                                <span className="font-semibold block text-[10px] uppercase tracking-wider text-emerald-800">
                                  Accepted {inv.responded_at ? `on ${new Date(inv.responded_at).toLocaleDateString()}` : ""}
                                </span>
                                {inv.response_note ? (
                                  <p className="italic mt-0.5 line-clamp-2">&ldquo;{inv.response_note}&rdquo;</p>
                                ) : (
                                  <span className="text-emerald-700 italic">No note provided</span>
                                )}
                              </div>

                              {matchedProject ? (
                                <div className="text-[11px] bg-card p-2 rounded-lg border border-border/80 flex items-center justify-between gap-2 shadow-2xs">
                                  <div>
                                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                                      <span>Workspace:</span>
                                      <Badge variant="emerald" size="sm">
                                        {matchedProject.status}
                                      </Badge>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      Lead: {matchedProject.project_lead?.full_name || "Unassigned"} · {matchedProject.members_count || 1} members
                                    </div>
                                  </div>
                                  <Link to={`/app/innovation/projects/${matchedProject.id}`}>
                                    <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 text-primary font-bold">
                                      Workspace →
                                    </Button>
                                  </Link>
                                </div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground italic px-1">
                                  Workspace pending formation by university
                                </div>
                              )}
                            </div>
                          )}
                          {inv.status === "REJECTED" && (
                            <div className="text-[11px] text-rose-950 bg-rose-50/70 p-2 rounded-lg border border-rose-200">
                              <span className="font-semibold block text-[10px] uppercase tracking-wider text-rose-800">
                                Reason for Decline {inv.responded_at ? `(${new Date(inv.responded_at).toLocaleDateString()})` : ""}
                              </span>
                              <p className="italic mt-0.5 font-medium line-clamp-2">
                                &ldquo;{inv.rejection_reason}&rdquo;
                              </p>
                            </div>
                          )}
                          {(inv.status === "SENT" || inv.status === "PENDING") && (
                            <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              Awaiting response
                            </span>
                          )}
                          {inv.status === "CANCELLED" && (
                            <span className="text-[11px] text-muted-foreground italic">
                              Invitation cancelled
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvitationForDetail(inv)}
                              className="text-[11px] h-7 px-2"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Dossier
                            </Button>
                            {inv.status === "SENT" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleCancelInvitation(inv.id)}
                                disabled={cancellingId === inv.id}
                                className="text-[11px] h-7 px-2 text-rose-700 hover:bg-rose-50 hover:border-rose-200"
                              >
                                {cancellingId === inv.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Ban className="h-3 w-3 mr-1" />
                                )}
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MATCHING WORKSPACE */}
      {!matchRun ? (
        /* Empty State - No match run yet */
        <Card className="rounded-2xl border border-dashed border-teal-600/30 p-10 text-center bg-card shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-indigo-500/20 text-teal-700 shadow-inner">
            <Sparkles className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">
            Run AI-Assisted Institution Matching
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            The matching engine dynamically evaluates all 105 verified institutions across 10 structured capability dimensions and executes Gemini 3.6 Flash semantic reasoning to recommend the Top 10 institutions.
          </p>

          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => void handleRunMatching(false)}
              disabled={matchingInProgress}
              className="gap-2 text-xs font-semibold px-6 shadow-sm h-10"
            >
              {matchingInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluating Institution Capability Registry...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run Institution Matching Engine
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        /* Match Run Completed - Results & Manual Override */
        <div className="space-y-6">
          {/* Match Run Metadata Audit Card */}
          <div className="rounded-2xl border border-border/80 bg-surface/70 p-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="teal" size="sm">
                    <Sparkles className="h-3 w-3 mr-1 text-primary" />
                    Algorithm Run Audit
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Executed: {new Date(matchRun.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs text-emerald-800 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {matchRun.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-y-1 gap-x-5 text-xs text-muted-foreground pt-1">
                  <span>
                    Primary Model: <strong className="text-foreground font-mono">{matchRun.ai_model_version}</strong>
                  </span>
                  <span>
                    Algorithm: <strong className="text-foreground font-mono">{matchRun.algorithm_version}</strong>
                  </span>
                  <span>
                    Pool Evaluated:{" "}
                    <strong className="text-foreground">
                      {matchRun.eligible_candidates_count} verified institutions
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRerunOpen(true)}
                  disabled={matchingInProgress}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Re-run Algorithm
                </Button>
              </div>
            </div>
          </div>

          {/* Section: Top 10 Ranked Recommendations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top 10 Ranked Institutions
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ranked by hybrid capability score combining 10 structured dimensions with Gemini AI semantic evaluation.
                </p>
              </div>
              <Badge variant="outline" size="sm" className="font-mono">
                {matches.length} Candidates Ranked
              </Badge>
            </div>

            <div className="space-y-4">
              {matches.map((match) => {
                const isSelected = selectedInstitutions.some(
                  (s) => s.institution.id === match.institution_id
                );
                const isExpanded = expandedMatchId === match.id;
                const scores = match.dimension_scores as unknown as MatchDimensionScores | null;

                const renderRoleBadge = (role?: string | null) => {
                  if (!role) return null;
                  if (role.includes("Lead") || role.includes("R&D")) {
                    return <Badge variant="violet" size="sm">{role}</Badge>;
                  }
                  if (role.includes("Field") || role.includes("Deployment")) {
                    return <Badge variant="emerald" size="sm">{role}</Badge>;
                  }
                  if (role.includes("Prototyping") || role.includes("Tech")) {
                    return <Badge variant="sky" size="sm">{role}</Badge>;
                  }
                  return <Badge variant="amber" size="sm">{role}</Badge>;
                };

                return (
                  <Card
                    key={match.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? "border-primary bg-teal-50/25 shadow-md ring-1 ring-primary/40"
                        : "border-border/80 bg-card hover:border-border hover:shadow-xs"
                    }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Row: Rank, Institution Info, Score Gauge & Selection Button */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          {/* Podium Rank Badge */}
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm shadow-xs ${
                              match.rank === 1
                                ? "bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400"
                                : match.rank === 2
                                ? "bg-slate-200 text-slate-900 font-black ring-1 ring-slate-300"
                                : match.rank === 3
                                ? "bg-amber-800 text-amber-50 font-black ring-1 ring-amber-700"
                                : "bg-muted text-foreground border border-border font-bold"
                            }`}
                          >
                            #{match.rank}
                          </div>

                          {/* Details */}
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" size="sm" className="font-semibold">
                                {match.institution.institution_type.replace(/_/g, " ")}
                              </Badge>
                              {match.institution.nirf_rank && (
                                <Badge variant="outline" size="sm" className="font-mono">
                                  NIRF #{match.institution.nirf_rank}
                                </Badge>
                              )}
                              {match.institution.naac_grade && (
                                <Badge variant="outline" size="sm">
                                  NAAC {match.institution.naac_grade}
                                </Badge>
                              )}
                              {renderRoleBadge(match.recommended_role)}
                            </div>

                            <h4 className="text-base font-bold text-foreground tracking-tight">
                              {match.institution.name}
                            </h4>

                            <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {match.institution.city}, {match.institution.state}
                            </p>
                          </div>
                        </div>

                        {/* Dual Score Widget & Selection Toggle */}
                        <div className="flex items-center gap-4 self-end sm:self-start">
                          {/* Overall Score Meter Card */}
                          <div className="rounded-xl border border-border/80 bg-surface p-3 text-right min-w-[135px] shadow-2xs">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="text-2xl font-black text-foreground tracking-tight">
                                {match.overall_score}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-semibold">/100</span>
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  match.confidence === "HIGH"
                                    ? "bg-emerald-600"
                                    : match.confidence === "MEDIUM"
                                    ? "bg-sky-600"
                                    : "bg-amber-600"
                                }`}
                              />
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  match.confidence === "HIGH"
                                    ? "text-emerald-800"
                                    : match.confidence === "MEDIUM"
                                    ? "text-sky-800"
                                    : "text-amber-800"
                                }`}
                              >
                                {match.confidence} Confidence
                              </span>
                            </div>
                            <div className="mt-1.5 pt-1.5 border-t border-border/60 text-[10px] text-muted-foreground space-y-0.5 font-mono">
                              <div className="flex justify-between">
                                <span>Struct (55%):</span>
                                <strong className="text-foreground font-semibold">{match.structured_score}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>AI Sem (45%):</span>
                                <strong className="text-primary font-bold">{match.ai_score ?? "N/A"}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Select / Deselect Button */}
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleToggleMatchSelection(match)}
                            disabled={!isSelected && selectedInstitutions.length >= 5}
                            className={`text-xs font-semibold gap-1.5 h-10 px-4 transition-all shadow-xs ${
                              isSelected
                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                : "border-border/90 text-foreground hover:bg-surface-elevated"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                                Selected
                              </>
                            ) : (
                              <>Select Institution</>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* AI Reasoning Summary Box */}
                      <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-950">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span>Gemini AI Capability Assessment &amp; Grounded Evidence</span>
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed italic">
                          &ldquo;{match.match_explanation || match.ai_reasoning}&rdquo;
                        </p>
                      </div>

                      {/* Strengths & Considerations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                        <div className="space-y-1">
                          <span className="font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Verified Strengths &amp; Facilities
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(match.strengths ?? []).map((str, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium"
                              >
                                ✓ {str}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                            Potential Considerations / Gaps
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(match.concerns ?? []).map((gap: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-xs font-medium"
                              >
                                • {gap}
                              </span>
                            ))}
                            {(!match.concerns || match.concerns.length === 0) && (
                              <span className="text-[11px] text-muted-foreground italic">
                                No significant gaps identified in capability profile
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions: Expand Breakdown & Dossier */}
                      <div className="pt-2.5 border-t border-border/70 flex items-center justify-between">
                        <button
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              Hide 10-Dimension Score Breakdown
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              View 10-Dimension Score Breakdown
                            </>
                          )}
                        </button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProfileModalInstitution(match.institution);
                            setProfileModalMatch(match);
                          }}
                          className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground font-medium"
                        >
                          <span>Full Registry Dossier</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Expandable 10-Dimension Score Breakdown */}
                      {isExpanded && scores && (
                        <div className="mt-3 rounded-xl border border-border/80 bg-surface/70 p-4 space-y-3.5 animate-in fade-in-0 duration-200">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-primary" />
                              10-Dimension Capability Analysis (0–100 Normalized Scale)
                            </span>
                            <div className="flex items-center gap-4 text-xs font-mono">
                              <span>
                                Structured (55%): <strong className="text-foreground">{match.structured_score}</strong>
                              </span>
                              <span>
                                AI Semantic (45%): <strong className="text-primary font-bold">{match.ai_score ?? "N/A"}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                            {/* Dimension 1: Research Domains (max 20) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">1. Domains</span>
                                <span className="font-mono text-muted-foreground">{scores.research_domains} / 20</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.research_domains / 20) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 2: Technical Expertise (max 15) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">2. Expertise</span>
                                <span className="font-mono text-muted-foreground">{scores.technical_expertise} / 15</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.technical_expertise / 15) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 3: Technologies (max 10) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">3. Tech Stack</span>
                                <span className="font-mono text-muted-foreground">{scores.technologies} / 10</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.technologies / 10) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 4: Facilities & Labs (max 10) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">4. Labs & Facilities</span>
                                <span className="font-mono text-muted-foreground">{scores.facilities_and_labs} / 10</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.facilities_and_labs / 10) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 5: Previous Projects (max 10) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">5. Track Record</span>
                                <span className="font-mono text-muted-foreground">{scores.previous_projects} / 10</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.previous_projects / 10) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 6: Research Requirements (max 10) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">6. Research Fit</span>
                                <span className="font-mono text-muted-foreground">{scores.research_requirements} / 10</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.research_requirements / 10) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 7: Field Capabilities (max 10) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">7. Field Readiness</span>
                                <span className="font-mono text-muted-foreground">{scores.field_capabilities} / 10</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.field_capabilities / 10) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 8: Multidisciplinary Fit (max 5) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">8. Multidisciplinary</span>
                                <span className="font-mono text-muted-foreground">{scores.multidisciplinary_fit} / 5</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.multidisciplinary_fit / 5) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 9: Geographic Scope (max 5) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">9. Geo Scope</span>
                                <span className="font-mono text-muted-foreground">{scores.geographic_scope} / 5</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.geographic_scope / 5) * 100, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 10: Collab Readiness (max 5) */}
                            <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-foreground">10. Collab Readiness</span>
                                <span className="font-mono text-muted-foreground">{scores.collaboration_readiness} / 5</span>
                              </div>
                              <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min((scores.collaboration_readiness / 5) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Section: Manual Override / Search Institution Registry */}
          <Card className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Select Institution Outside Top 10 (Manual Override)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an unlisted or lower-ranked verified institution has specialized capabilities suited for this challenge, you may select them with mandatory managerial justification (minimum 10 characters).
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search verified institutions by name, city, state, or acronym..."
                value={searchQuery}
                onChange={(e) => void handleSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {searching && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-1 text-primary" />
                Searching verified institutions...
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {searchResults.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-surface/70 p-3 hover:bg-surface-elevated transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {inst.name}
                        </span>
                        <Badge variant="outline" size="sm">
                          {inst.institution_type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {inst.city}, {inst.state} {inst.nirf_rank ? `• NIRF #${inst.nirf_rank}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProfileModalInstitution(inst);
                          setProfileModalMatch(null);
                        }}
                        className="text-xs h-7"
                      >
                        Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOverrideCandidate(inst);
                          setOverrideReason("");
                          setOverrideError(null);
                        }}
                        disabled={selectedInstitutions.length >= 5}
                        className="text-xs h-7 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-medium"
                      >
                        Select (Override)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Floating Sticky Bottom Selection Dock (Visible when selections are active) */}
      {selectedInstitutions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="rounded-2xl border border-teal-200/90 bg-card/95 backdrop-blur-md shadow-xl p-3.5 flex items-center justify-between gap-4 text-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {selectedInstitutions.length} of 5 Institutions Selected
                  </span>
                  {selectedInstitutions.length === 5 && (
                    <Badge variant="amber" size="sm">
                      MAX REACHED
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 max-w-sm truncate">
                  {selectedInstitutions.map((s, i) => (
                    <span key={s.institution.id} className="text-[10px] text-muted-foreground">
                      {s.institution.name.split(" ")[0]}
                      {i < selectedInstitutions.length - 1 ? " • " : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => void handleConfirmSelections()}
                disabled={
                  savingSelections ||
                  matchingInProgress ||
                  selectedInstitutions.length === 0 ||
                  selectedInstitutions.length > 5
                }
                className="text-xs font-bold gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 px-4 h-9"
              >
                {savingSelections ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                )}
                {isConfirmed ? "Update Selection" : "Commit Selections"}
              </Button>

              <Button
                onClick={() => setSendDialogOpen(true)}
                disabled={
                  savingSelections ||
                  matchingInProgress ||
                  sendingInvitations ||
                  selectedInstitutions.length === 0
                }
                className="text-xs font-bold gap-1.5 shadow-sm bg-teal-600 hover:bg-teal-700 text-white shrink-0 px-4 h-9"
              >
                <Send className="h-3.5 w-3.5" />
                {invitations.length > 0 ? "Dispatch Outreach" : "Send Invitations"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <InstitutionProfileModal
        institution={profileModalInstitution}
        open={!!profileModalInstitution}
        onClose={() => {
          setProfileModalInstitution(null);
          setProfileModalMatch(null);
        }}
        matchScores={profileModalMatch?.dimension_scores as unknown as MatchDimensionScores | null}
        strengths={profileModalMatch?.strengths}
        potentialGaps={profileModalMatch?.concerns}
        rank={profileModalMatch?.rank}
      />

      {/* Manual Override Justification Modal */}
      <Dialog
        open={!!overrideCandidate}
        onClose={() => setOverrideCandidate(null)}
        title="Manual Override Justification"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <p className="font-bold">Managerial Governance Requirement</p>
            <p className="mt-0.5 leading-relaxed text-amber-900">
              You are selecting an institution that was not recommended in the AI Top 10. To maintain procedural integrity, please specify the technical or regional reason for this manual override.
            </p>
          </div>

          {overrideCandidate && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Selected Institution:</span>
              <p className="text-sm font-bold text-foreground">{overrideCandidate.name}</p>
              <p className="text-xs text-muted-foreground">
                {overrideCandidate.city}, {overrideCandidate.state} (
                {overrideCandidate.institution_type.replace(/_/g, " ")})
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Justification Reason (Minimum 10 characters)</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {overrideReason.trim().length} chars
              </span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Specialized regional water monitoring field station or direct municipal watershed collaboration..."
              value={overrideReason}
              onChange={(e) => {
                setOverrideReason(e.target.value);
                if (overrideError) setOverrideError(null);
              }}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {overrideError && (
              <p className="text-xs text-destructive font-medium">{overrideError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideCandidate(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmManualOverride}
              disabled={overrideReason.trim().length < 10}
              className="text-xs font-semibold"
            >
              Confirm Override Selection
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog for Re-running Matching */}
      <Dialog
        open={confirmRerunOpen}
        onClose={() => setConfirmRerunOpen(false)}
        title="Re-run Institution Matching Engine?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Re-running matching will execute a new evaluation run across all verified active institutions, applying the hybrid 10-dimension capability scoring and Gemini AI semantic reasoning against the current challenge statement.
          </p>
          <div className="rounded-xl border border-border/70 bg-surface p-3 text-xs text-muted-foreground">
            Existing confirmed selections will remain recorded until you choose to update them.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRerunOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleRunMatching(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-run Matching
            </Button>
          </div>
        </div>
      </Dialog>

      {/* PHASE 3D-1: Send Invitations Confirmation Dialog */}
      <Dialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        title="Dispatch Formal Challenge Invitations"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-950">
            <div className="font-bold flex items-center gap-1.5 text-teal-900">
              <Sparkles className="h-3.5 w-3.5 text-teal-700" />
              Phase 3D-1 Outreach Dispatch
            </div>
            <p className="mt-1 leading-relaxed text-teal-900">
              You are dispatching official invitations to the {selectedInstitutions.length} selected verified institutions.
              Each institution coordinator will receive an in-app notification and an invitation dossier in their University Portal.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground">
              Recipient Institutions ({selectedInstitutions.length}/5):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {selectedInstitutions.map((sel, idx) => (
                <div
                  key={sel.institution.id}
                  className="rounded-lg border border-border/80 bg-surface/60 p-2.5 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-xs text-foreground line-clamp-1">
                      {idx + 1}. {sel.institution.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {sel.institution.city}, {sel.institution.state}
                    </div>
                  </div>
                  {sel.isManualOverride ? (
                    <Badge variant="amber" size="sm">
                      OVERRIDE
                    </Badge>
                  ) : (
                    <Badge variant="teal" size="sm" className="font-mono">
                      #{sel.selectionRank}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Invitation Briefing Message</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {invitationMessage.trim().length} chars
              </span>
            </label>
            <textarea
              rows={4}
              placeholder="Enter briefing message or collaboration instructions for the selected institutions..."
              value={invitationMessage}
              onChange={(e) => setInvitationMessage(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              This message will be prominently displayed on the institution&apos;s invitation screen alongside the complete challenge dossier.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendDialogOpen(false)}
              disabled={sendingInvitations}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSendInvitations()}
              disabled={sendingInvitations || selectedInstitutions.length === 0 || !invitationMessage.trim()}
              className="text-xs font-semibold gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {sendingInvitations ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Dispatching Invitations...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Confirm &amp; Dispatch Invitations
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Invitation Detail / Dossier Dialog */}
      <Dialog
        open={Boolean(selectedInvitationForDetail)}
        onClose={() => setSelectedInvitationForDetail(null)}
        title="Institution Outreach Dossier"
        maxWidth="md"
      >
        {selectedInvitationForDetail && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-border/80 bg-surface/60 p-3 space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Target Institution
              </span>
              <h3 className="text-sm font-bold text-foreground">
                {selectedInvitationForDetail.institution.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedInvitationForDetail.institution.city}, {selectedInvitationForDetail.institution.state} ·{" "}
                {selectedInvitationForDetail.institution.institution_type.replace(/_/g, " ")}
              </p>
            </div>

            {selectedInvitationForDetail.match_evidence && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950">Capability Match Evidence</span>
                  <Badge variant="teal" size="sm" className="font-mono font-bold">
                    {selectedInvitationForDetail.match_evidence.overall_score.toFixed(0)}% Match
                  </Badge>
                </div>
                {selectedInvitationForDetail.match_evidence.recommended_role && (
                  <div className="text-[11px] text-teal-900">
                    <span className="font-semibold">Recommended Role:</span>{" "}
                    {selectedInvitationForDetail.match_evidence.recommended_role}
                  </div>
                )}
                {selectedInvitationForDetail.match_evidence.strengths.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800">
                      Demonstrated Strengths
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-teal-900">
                      {selectedInvitationForDetail.match_evidence.strengths.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Invitation Message Sent
              </span>
              <p className="rounded-lg border border-border/70 bg-background p-3 text-foreground leading-relaxed italic">
                &ldquo;{selectedInvitationForDetail.invitation_message}&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-border/60 bg-surface/40 p-2.5">
                <span className="text-muted-foreground block text-[10px] uppercase">Dispatched At</span>
                <span className="font-semibold text-foreground">
                  {new Date(selectedInvitationForDetail.invited_at).toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface/40 p-2.5">
                <span className="text-muted-foreground block text-[10px] uppercase">Status</span>
                <span className="font-bold text-foreground">
                  {selectedInvitationForDetail.status}
                </span>
              </div>
            </div>

            {selectedInvitationForDetail.status === "ACCEPTED" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                  Institution Acceptance Note ({selectedInvitationForDetail.responded_at ? new Date(selectedInvitationForDetail.responded_at).toLocaleString() : ""})
                </span>
                <p className="text-emerald-950 font-medium italic">
                  {selectedInvitationForDetail.response_note ? `“${selectedInvitationForDetail.response_note}”` : "No special notes provided."}
                </p>
              </div>
            )}

            {selectedInvitationForDetail.status === "REJECTED" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-800">
                  Institution Rejection Justification ({selectedInvitationForDetail.responded_at ? new Date(selectedInvitationForDetail.responded_at).toLocaleString() : ""})
                </span>
                <p className="text-rose-950 font-medium italic">
                  &ldquo;{selectedInvitationForDetail.rejection_reason}&rdquo;
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvitationForDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
