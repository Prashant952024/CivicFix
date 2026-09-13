import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Filter,
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
  fetchAllEligibleInstitutions,
  fetchChallengeSelections,
  fetchLatestMatchRun,
  fetchMatchesForRun,
  runInstitutionMatching,
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
  // Registry Search & All Institutions
  const [allInstitutions, setAllInstitutions] = useState<InstitutionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"ALL" | "SELECTED" | "UNSELECTED">("ALL");
  const [overrideCandidate, setOverrideCandidate] = useState<InstitutionRow | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Navigation & Discovery Tabs
  const [activeTab, setActiveTab] = useState<"RECOMMENDED" | "REGISTRY" | "SELECTED" | "OUTREACH">("RECOMMENDED");

  // Quick-Add in Selection Ribbon
  const [quickAddSearch, setQuickAddSearch] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Replace / Change Institution
  const [replacingInstitution, setReplacingInstitution] = useState<SelectedItem | null>(null);
  const [replaceSearchQuery, setReplaceSearchQuery] = useState("");
  const [replaceTypeFilter, setReplaceTypeFilter] = useState<string>("ALL");
  const [selectedReplacementTarget, setSelectedReplacementTarget] = useState<InstitutionRow | null>(null);
  const [replaceOverrideReason, setReplaceOverrideReason] = useState("");
  const [replaceOverrideError, setReplaceOverrideError] = useState<string | null>(null);

  // Edit Note / Update Rationale
  const [editingNoteItem, setEditingNoteItem] = useState<SelectedItem | null>(null);
  const [editNoteReason, setEditNoteReason] = useState("");
  const [editNoteError, setEditNoteError] = useState<string | null>(null);

  // Load all challenge, match run, matches, registry, and selection data
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

        // 2. Fetch all registry institutions, latest run, selections, invitations, projects
        const [allInsts, latestRun, currentSelections, invList, projList] = await Promise.all([
          fetchAllEligibleInstitutions().catch((err) => {
            console.warn("Could not fetch all institutions:", err);
            return [] as InstitutionRow[];
          }),
          fetchLatestMatchRun(challengeId!),
          fetchChallengeSelections(challengeId!),
          fetchChallengeInvitations(challengeId!),
          fetchChallengeProjects(challengeId!).catch((err) => {
            console.warn("Could not fetch challenge projects:", err);
            return [] as ChallengeProjectWithDetails[];
          }),
        ]);
        if (isCancelled) return;

        setAllInstitutions(allInsts);
        setMatchRun(latestRun);

        // 3. If match run exists, fetch matches
        if (latestRun) {
          const runMatches = await fetchMatchesForRun(latestRun.id);
          if (isCancelled) return;
          setMatches(runMatches);
        }

        // 4. Fetch existing selections
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

        // 5. Invitations & Projects
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

  // Multi-field filtered institutions across entire registry
  const filteredInstitutions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allInstitutions.filter((inst) => {
      if (selectedTypeFilter !== "ALL" && inst.institution_type !== selectedTypeFilter) {
        return false;
      }
      if (selectedStatusFilter === "SELECTED") {
        if (!selectedInstitutions.some((s) => s.institution.id === inst.id)) return false;
      } else if (selectedStatusFilter === "UNSELECTED") {
        if (selectedInstitutions.some((s) => s.institution.id === inst.id)) return false;
      }
      if (!q) return true;

      if (inst.name?.toLowerCase().includes(q)) return true;
      if (inst.official_name?.toLowerCase().includes(q)) return true;
      if (inst.acronym?.toLowerCase().includes(q)) return true;
      if (inst.institution_type?.toLowerCase().includes(q)) return true;
      if (inst.city?.toLowerCase().includes(q)) return true;
      if (inst.state?.toLowerCase().includes(q)) return true;
      if (inst.district?.toLowerCase().includes(q)) return true;
      if (inst.research_domains?.some((d) => d.toLowerCase().includes(q))) return true;
      if (inst.areas_of_expertise?.some((e) => e.toLowerCase().includes(q))) return true;
      if (inst.technologies?.some((t) => t.toLowerCase().includes(q))) return true;
      if (inst.facilities?.some((f) => f.toLowerCase().includes(q))) return true;
      if (inst.laboratories?.some((l) => l.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [allInstitutions, searchQuery, selectedTypeFilter, selectedStatusFilter, selectedInstitutions]);

  // Filtered Top 10 recommendations
  const filteredMatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return matches.filter((m) => {
      const inst = m.institution;
      if (selectedTypeFilter !== "ALL" && inst.institution_type !== selectedTypeFilter) {
        return false;
      }
      if (selectedStatusFilter === "SELECTED") {
        if (!selectedInstitutions.some((s) => s.institution.id === inst.id)) return false;
      } else if (selectedStatusFilter === "UNSELECTED") {
        if (selectedInstitutions.some((s) => s.institution.id === inst.id)) return false;
      }
      if (!q) return true;
      if (inst.name?.toLowerCase().includes(q)) return true;
      if (inst.official_name?.toLowerCase().includes(q)) return true;
      if (inst.acronym?.toLowerCase().includes(q)) return true;
      if (inst.city?.toLowerCase().includes(q)) return true;
      if (inst.state?.toLowerCase().includes(q)) return true;
      if (m.recommended_role?.toLowerCase().includes(q)) return true;
      if (m.strengths?.some((s) => s.toLowerCase().includes(q))) return true;
      if (inst.research_domains?.some((d) => d.toLowerCase().includes(q))) return true;
      if (inst.technologies?.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [matches, searchQuery, selectedTypeFilter, selectedStatusFilter, selectedInstitutions]);

  // Filtered selected institutions
  const filteredSelected = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return selectedInstitutions.filter((s) => {
      const inst = s.institution;
      if (selectedTypeFilter !== "ALL" && inst.institution_type !== selectedTypeFilter) {
        return false;
      }
      if (!q) return true;
      if (inst.name?.toLowerCase().includes(q)) return true;
      if (inst.official_name?.toLowerCase().includes(q)) return true;
      if (inst.acronym?.toLowerCase().includes(q)) return true;
      if (inst.city?.toLowerCase().includes(q)) return true;
      if (inst.state?.toLowerCase().includes(q)) return true;
      if (s.overrideReason?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [selectedInstitutions, searchQuery, selectedTypeFilter]);

  // Quick-Add typeahead candidates
  const quickAddResults = useMemo(() => {
    const q = quickAddSearch.toLowerCase().trim();
    if (!q) return [];
    return allInstitutions
      .filter((inst) => {
        if (inst.name?.toLowerCase().includes(q)) return true;
        if (inst.acronym?.toLowerCase().includes(q)) return true;
        if (inst.city?.toLowerCase().includes(q)) return true;
        if (inst.state?.toLowerCase().includes(q)) return true;
        if (inst.institution_type?.toLowerCase().includes(q)) return true;
        if (inst.research_domains?.some((d) => d.toLowerCase().includes(q))) return true;
        if (inst.technologies?.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 8);
  }, [allInstitutions, quickAddSearch]);

  // Filtered candidates for replacement
  const filteredReplacementCandidates = useMemo(() => {
    if (!replacingInstitution) return [];
    const q = replaceSearchQuery.toLowerCase().trim();
    const currentSelectedIds = new Set(
      selectedInstitutions
        .filter((s) => s.institution.id !== replacingInstitution.institution.id)
        .map((s) => s.institution.id)
    );

    return allInstitutions
      .filter((inst) => {
        if (currentSelectedIds.has(inst.id)) return false;
        if (inst.id === replacingInstitution.institution.id) return false;

        if (replaceTypeFilter !== "ALL" && inst.institution_type !== replaceTypeFilter) {
          return false;
        }
        if (!q) return true;

        if (inst.name?.toLowerCase().includes(q)) return true;
        if (inst.official_name?.toLowerCase().includes(q)) return true;
        if (inst.acronym?.toLowerCase().includes(q)) return true;
        if (inst.city?.toLowerCase().includes(q)) return true;
        if (inst.state?.toLowerCase().includes(q)) return true;
        if (inst.research_domains?.some((d) => d.toLowerCase().includes(q))) return true;
        if (inst.technologies?.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 30);
  }, [allInstitutions, replacingInstitution, replaceSearchQuery, replaceTypeFilter, selectedInstitutions]);

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

  // Toggle selection for any institution from the registry search
  function handleToggleInstitutionSelection(inst: InstitutionRow) {
    const isSelected = selectedInstitutions.some(
      (s) => s.institution.id === inst.id
    );

    if (isSelected) {
      setSelectedInstitutions((prev) =>
        prev.filter((s) => s.institution.id !== inst.id)
      );
    } else {
      const match = matches.find((m) => m.institution_id === inst.id);
      if (!match && matchRun) {
        // Require override justification for non-top-10 candidates
        setOverrideCandidate(inst);
        setOverrideReason("");
        setOverrideError(null);
        return;
      }
      setSelectedInstitutions((prev) => [
        ...prev,
        {
          institution: inst,
          isManualOverride: !match && Boolean(matchRun),
          overrideReason: null,
          selectionRank: match ? match.rank : null,
          matchRunId: match ? match.match_run_id : matchRun?.id ?? null,
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
  }

  // Execute replacement of one selected institution with another
  function handleExecuteReplacement() {
    if (!replacingInstitution || !selectedReplacementTarget) return;

    const targetMatch = matches.find((m) => m.institution_id === selectedReplacementTarget.id);
    const isOverride = !targetMatch && Boolean(matchRun);

    if (isOverride) {
      if (!replaceOverrideReason || replaceOverrideReason.trim().length < 10) {
        setReplaceOverrideError(
          "A justification reason of at least 10 characters is required for manual override."
        );
        return;
      }
    }

    const oldName = replacingInstitution.institution.name;
    const newName = selectedReplacementTarget.name;

    setSelectedInstitutions((prev) =>
      prev.map((item) => {
        if (item.institution.id === replacingInstitution.institution.id) {
          return {
            institution: selectedReplacementTarget,
            isManualOverride: isOverride,
            overrideReason: isOverride ? replaceOverrideReason.trim() : null,
            selectionRank: targetMatch ? targetMatch.rank : null,
            matchRunId: targetMatch ? targetMatch.match_run_id : matchRun?.id ?? null,
          };
        }
        return item;
      })
    );

    setActionSuccess(
      `Successfully replaced "${oldName}" with "${newName}". Click "Update Selection" to commit changes.`
    );

    setReplacingInstitution(null);
    setSelectedReplacementTarget(null);
    setReplaceSearchQuery("");
    setReplaceOverrideReason("");
    setReplaceOverrideError(null);
  }

  // Save updated rationale note for an existing selection
  function handleSaveNoteUpdate() {
    if (!editingNoteItem) return;

    if (editingNoteItem.isManualOverride) {
      if (!editNoteReason || editNoteReason.trim().length < 10) {
        setEditNoteError(
          "A justification reason of at least 10 characters is required for manual override."
        );
        return;
      }
    }

    const instName = editingNoteItem.institution.name;
    setSelectedInstitutions((prev) =>
      prev.map((item) => {
        if (item.institution.id === editingNoteItem.institution.id) {
          return {
            ...item,
            overrideReason: editNoteReason.trim() || null,
          };
        }
        return item;
      })
    );

    setActionSuccess(
      `Updated rationale for "${instName}". Click "Update Selection" to commit changes.`
    );
    setEditingNoteItem(null);
    setEditNoteReason("");
    setEditNoteError(null);
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

      await confirmInstitutionSelections(challengeId, payload, profile?.id);

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
      await confirmInstitutionSelections(challengeId, payload, profile?.id);

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
        <div className="py-3 px-5 border-b border-border/70 bg-surface/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Institutions Selected for Outreach
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Select, change, or update partner institutions for Phase 3D outreach
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick-Add Search Bar */}
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Quick add institution..."
                  value={quickAddSearch}
                  onChange={(e) => {
                    setQuickAddSearch(e.target.value);
                    setQuickAddOpen(true);
                  }}
                  onFocus={() => setQuickAddOpen(true)}
                  className="text-xs bg-transparent border-none outline-none w-36 sm:w-48 text-foreground placeholder:text-muted-foreground"
                />
                {quickAddSearch && (
                  <button
                    onClick={() => {
                      setQuickAddSearch("");
                      setQuickAddOpen(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Quick Add Autocomplete Dropdown */}
              {quickAddOpen && quickAddSearch.trim() && (
                <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl z-50 p-2 space-y-1 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/50">
                    <span>Quick Add ({quickAddResults.length} matches)</span>
                    <button
                      onClick={() => setQuickAddOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {quickAddResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No institutions found matching &ldquo;{quickAddSearch}&rdquo;
                    </div>
                  ) : (
                    quickAddResults.map((inst) => {
                      const isSel = selectedInstitutions.some((s) => s.institution.id === inst.id);
                      const topM = matches.find((m) => m.institution_id === inst.id);

                      return (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-elevated text-xs transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground truncate">{inst.name}</span>
                              {inst.acronym && (
                                <span className="text-[10px] font-mono bg-muted px-1 rounded text-muted-foreground shrink-0">
                                  {inst.acronym}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span>{inst.city}, {inst.state}</span>
                              {topM && <span className="text-teal-700 font-semibold">• Top 10 (#{topM.rank})</span>}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant={isSel ? "default" : "outline"}
                            onClick={() => {
                              handleToggleInstitutionSelection(inst);
                            }}
                            className={`h-7 text-[11px] px-2.5 shrink-0 ${
                              isSel ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
                            }`}
                          >
                            {isSel ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Selected
                              </>
                            ) : (
                              "+ Add"
                            )}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <Badge variant="teal" size="default" className="font-mono font-bold">
              Selected: {selectedInstitutions.length}
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
                selectedInstitutions.length === 0
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
          {selectedInstitutions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-surface/30 space-y-2">
              <UserCheck className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <h4 className="text-xs font-bold text-foreground">
                No Institutions Selected Yet
              </h4>
              <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                Use the quick search box above, or browse the AI Top 10 recommendations and complete 105-institution registry below to add institutions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {selectedInstitutions.map((sel, idx) => (
                <div
                  key={sel.institution.id}
                  className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 flex flex-col justify-between space-y-2 relative shadow-2xs hover:border-teal-300 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100/70 rounded px-1.5 py-0.5">
                        #{idx + 1}
                      </span>
                      {sel.isManualOverride ? (
                        <Badge variant="amber" size="sm">
                          OVERRIDE
                        </Badge>
                      ) : sel.selectionRank ? (
                        <Badge variant="outline" size="sm" className="font-mono text-teal-800 font-bold">
                          #{sel.selectionRank}
                        </Badge>
                      ) : (
                        <Badge variant="teal" size="sm" className="text-[10px]">
                          REGISTRY
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

                    {/* Override Rationale or Notes */}
                    <div className="pt-1">
                      {sel.isManualOverride && sel.overrideReason ? (
                        <div className="group relative rounded-md border border-amber-200 bg-amber-50/80 p-1.5">
                          <p className="text-[10px] text-amber-900 line-clamp-2 italic">
                            &ldquo;{sel.overrideReason}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteItem(sel);
                              setEditNoteReason(sel.overrideReason || "");
                              setEditNoteError(null);
                            }}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                          >
                            <Edit3 className="h-2.5 w-2.5" />
                            <span>Edit Note</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteItem(sel);
                            setEditNoteReason(sel.overrideReason || "");
                            setEditNoteError(null);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          <span>{sel.overrideReason ? "Edit Note" : "+ Add Note"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1">
                    <button
                      onClick={() => {
                        setProfileModalInstitution(sel.institution);
                        setProfileModalMatch(null);
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>Dossier</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplacingInstitution(sel);
                        setSelectedReplacementTarget(null);
                        setReplaceSearchQuery("");
                        setReplaceOverrideReason("");
                        setReplaceOverrideError(null);
                      }}
                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1"
                      title="Change / Replace this institution with another"
                    >
                      <ArrowLeftRight className="h-2.5 w-2.5" />
                      <span>Replace</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Outreach Notice (When on discovery tabs) */}
      {invitations.length > 0 && activeTab !== "OUTREACH" && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-teal-950">
            <Mail className="h-4 w-4 text-teal-700 shrink-0" />
            <span>
              Phase 3D-1 Outreach Active: <strong>{invitations.length}</strong> official invitations dispatched (
              {invitations.filter((i) => i.status === "ACCEPTED").length} accepted,{" "}
              {invitations.filter((i) => i.status === "SENT" || i.status === "PENDING").length} pending).
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("OUTREACH")}
            className="h-7 text-[11px] font-semibold border-teal-300 text-teal-900 hover:bg-teal-100 self-start sm:self-auto shrink-0"
          >
            View Outreach Tracking →
          </Button>
        </div>
      )}

      {/* INSTITUTION NAVIGATOR & SEARCH HUB */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 space-y-4">
          {/* Navigation Tabs Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("RECOMMENDED")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "RECOMMENDED"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground border border-border/70"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Recommendations</span>
                <Badge
                  variant={activeTab === "RECOMMENDED" ? "outline" : "teal"}
                  size="sm"
                  className={`font-mono text-[10px] ${
                    activeTab === "RECOMMENDED" ? "text-primary-foreground border-primary-foreground/30" : ""
                  }`}
                >
                  {matches.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("REGISTRY")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "REGISTRY"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground border border-border/70"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>All Registry Institutions</span>
                <Badge
                  variant={activeTab === "REGISTRY" ? "outline" : "teal"}
                  size="sm"
                  className={`font-mono text-[10px] ${
                    activeTab === "REGISTRY" ? "text-primary-foreground border-primary-foreground/30" : ""
                  }`}
                >
                  {allInstitutions.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("SELECTED")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "SELECTED"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground border border-border/70"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Currently Selected</span>
                <Badge
                  variant={activeTab === "SELECTED" ? "outline" : "emerald"}
                  size="sm"
                  className={`font-mono text-[10px] ${
                    activeTab === "SELECTED" ? "text-primary-foreground border-primary-foreground/30" : ""
                  }`}
                >
                  {selectedInstitutions.length}
                </Badge>
              </button>

              {invitations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("OUTREACH")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    activeTab === "OUTREACH"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground border border-border/70"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Outreach Tracking</span>
                  <Badge
                    variant={activeTab === "OUTREACH" ? "outline" : "info"}
                    size="sm"
                    className={`font-mono text-[10px] ${
                      activeTab === "OUTREACH" ? "text-primary-foreground border-primary-foreground/30" : ""
                    }`}
                  >
                    {invitations.length}
                  </Badge>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground self-end md:self-auto">
              <span className="font-mono">
                {activeTab === "RECOMMENDED"
                  ? `${filteredMatches.length} of ${matches.length} Matches`
                  : activeTab === "REGISTRY"
                  ? `${filteredInstitutions.length} of ${allInstitutions.length} Registry`
                  : activeTab === "SELECTED"
                  ? `${filteredSelected.length} of ${selectedInstitutions.length} Selected`
                  : `${invitations.length} Dispatched`}
              </span>
            </div>
          </div>

          {/* Search Box & Quick Type Filters (Visible in Discovery Tabs) */}
          {activeTab !== "OUTREACH" && (
            <div className="space-y-3">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search institutions by name, acronym, city, state, domain (e.g. Water, AI, IoT), technology, facility..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface pl-10 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Row: Type Pills & Selection Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Type:
                  </span>
                  {[
                    { label: "All", value: "ALL" },
                    { label: "IITs", value: "IIT" },
                    { label: "NITs", value: "NIT" },
                    { label: "Central Univ", value: "CENTRAL_UNIVERSITY" },
                    { label: "State Univ", value: "STATE_UNIVERSITY" },
                    { label: "Research Inst", value: "RESEARCH_INSTITUTE" },
                    { label: "Private/Deemed", value: "PRIVATE_DEEMED" },
                  ].map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => setSelectedTypeFilter(pill.value)}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors shrink-0 ${
                        selectedTypeFilter === pill.value
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-surface border border-border/70 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                    Selection:
                  </span>
                  {[
                    { label: "All", value: "ALL" },
                    { label: "Selected", value: "SELECTED" },
                    { label: "Unselected", value: "UNSELECTED" },
                  ].map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => setSelectedStatusFilter(pill.value as "ALL" | "SELECTED" | "UNSELECTED")}
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-colors shrink-0 ${
                        selectedStatusFilter === pill.value
                          ? "bg-teal-700 text-white font-semibold"
                          : "bg-surface border border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* TAB 1: AI RECOMMENDATIONS WORKSPACE */}
      {activeTab === "RECOMMENDED" && (
        <>
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
            <div className="space-y-4">
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

              {/* Section Header */}
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
                  {filteredMatches.length} of {matches.length} Candidates
                </Badge>
              </div>

              {/* Helper notice if search query is active */}
              {searchQuery.trim() && (
                <>
                  {filteredMatches.length > 0 && filteredInstitutions.length > filteredMatches.length && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-teal-950">
                        <Sparkles className="h-4 w-4 text-teal-700 shrink-0" />
                        <span>
                          Showing {filteredMatches.length} AI recommendation matches for &ldquo;{searchQuery}&rdquo;.
                          There are <strong>{filteredInstitutions.length}</strong> matching institutions in the complete registry.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("REGISTRY")}
                        className="text-[11px] h-7 border-teal-300 text-teal-900 hover:bg-teal-100 shrink-0"
                      >
                        View All in Registry ({filteredInstitutions.length}) →
                      </Button>
                    </div>
                  )}

                  {filteredMatches.length === 0 && (
                    <div className="py-10 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border/70 bg-surface/30 space-y-2">
                      <Search className="h-7 w-7 text-muted-foreground/40 mx-auto" />
                      <p className="font-semibold text-foreground">
                        No Top 10 recommendations match &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="text-[11px]">
                        {filteredInstitutions.length > 0
                          ? `Found ${filteredInstitutions.length} matching institutions in the complete registry.`
                          : "Try searching with broader terms or clearing filters."}
                      </p>
                      {filteredInstitutions.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("REGISTRY")}
                          className="text-xs mt-2 gap-1.5"
                        >
                          Browse All {filteredInstitutions.length} Matching Registry Institutions →
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Recommendations Cards */}
              <div className="space-y-4">
                {filteredMatches.map((match) => {
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
                                  ? "bg-amber-100 text-amber-900 border border-amber-300 font-black"
                                  : match.rank === 2
                                  ? "bg-slate-200 text-slate-800 border border-slate-300 font-bold"
                                  : match.rank === 3
                                  ? "bg-amber-700/20 text-amber-900 border border-amber-700/40 font-bold"
                                  : "bg-surface border border-border text-foreground font-semibold"
                              }`}
                            >
                              #{match.rank}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-foreground">
                                  {match.institution.name}
                                </h4>
                                {match.institution.acronym && (
                                  <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                    {match.institution.acronym}
                                  </span>
                                )}
                                <Badge variant="outline" size="sm" className="text-[10px]">
                                  {match.institution.institution_type.replace(/_/g, " ")}
                                </Badge>
                                {renderRoleBadge(match.recommended_role)}
                                {match.institution.nirf_rank && (
                                  <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    NIRF #{match.institution.nirf_rank}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {match.institution.city}, {match.institution.state}
                                {match.institution.district ? ` (${match.institution.district})` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Score Gauge & Selection CTA */}
                          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                            <div className="text-right">
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                                  {match.overall_score.toFixed(1)}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                                Capability Match
                              </span>
                            </div>

                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => handleToggleMatchSelection(match)}
                              className={`text-xs font-bold gap-1.5 transition-all shadow-xs h-9 px-3.5 ${
                                isSelected
                                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                                  : "hover:border-teal-500 hover:text-teal-800"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="h-4 w-4 stroke-[3]" />
                                  Selected
                                </>
                              ) : (
                                "+ Select for Outreach"
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Middle Row: AI Semantic Rationale */}
                        {(match.match_explanation || match.ai_reasoning) && (
                          <div className="rounded-xl border border-border/80 bg-surface/80 p-3.5 text-xs text-foreground/90 space-y-1.5 leading-relaxed">
                            <div className="flex items-center gap-1.5 font-bold text-teal-950 text-[11px]">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              Gemini Semantic Evaluation &amp; Strategic Fit:
                            </div>
                            <p className="text-xs text-muted-foreground pl-5">
                              {match.match_explanation || match.ai_reasoning}
                            </p>
                          </div>
                        )}

                        {/* Strengths & Potential Concerns Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                          {match.strengths && match.strengths.length > 0 && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1.5">
                              <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wider">
                                Key Demonstrated Strengths
                              </span>
                              <ul className="space-y-1 text-emerald-950 text-xs">
                                {match.strengths.map((str, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                                    <span>{str}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {match.concerns && match.concerns.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-1.5">
                              <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wider">
                                Considerations &amp; Potential Gaps
                              </span>
                              <ul className="space-y-1 text-amber-950 text-xs">
                                {match.concerns.map((con, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                    <span>{con}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Expandable 10 Structured Capability Dimensions breakdown */}
                        <div className="pt-2 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMatchId(isExpanded ? null : match.id)
                            }
                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            {isExpanded
                              ? "Hide Capability Dimension Scores"
                              : "Inspect 10 Structured Capability Dimensions"}
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setProfileModalInstitution(match.institution);
                                setProfileModalMatch(match);
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1"
                            >
                              <span>Full Institution Profile</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && scores && (
                          <div className="mt-3 rounded-xl border border-border bg-surface p-4 text-xs animate-in fade-in-50 duration-150">
                            <h5 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">
                              Structured 10-Dimension Capability Audit Breakdown
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">1. Research Domains</span>
                                  <span className="font-mono text-muted-foreground">{scores.research_domains} / 20</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.research_domains / 20) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">2. Technical Expertise</span>
                                  <span className="font-mono text-muted-foreground">{scores.technical_expertise} / 15</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.technical_expertise / 15) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">3. Technologies</span>
                                  <span className="font-mono text-muted-foreground">{scores.technologies} / 10</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.technologies / 10) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">4. Facilities &amp; Labs</span>
                                  <span className="font-mono text-muted-foreground">{scores.facilities_and_labs} / 10</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.facilities_and_labs / 10) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">5. Previous Projects</span>
                                  <span className="font-mono text-muted-foreground">{scores.previous_projects} / 10</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.previous_projects / 10) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">6. Research Requirements</span>
                                  <span className="font-mono text-muted-foreground">{scores.research_requirements} / 10</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.research_requirements / 10) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">7. Field Capabilities</span>
                                  <span className="font-mono text-muted-foreground">{scores.field_capabilities} / 10</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.field_capabilities / 10) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">8. Multidisciplinary Fit</span>
                                  <span className="font-mono text-muted-foreground">{scores.multidisciplinary_fit} / 5</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.multidisciplinary_fit / 5) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span className="font-semibold text-foreground">9. Geographic Scope</span>
                                  <span className="font-mono text-muted-foreground">{scores.geographic_scope} / 5</span>
                                </div>
                                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min((scores.geographic_scope / 5) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
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
          )}
        </>
      )}

      {/* TAB 2: ALL REGISTRY INSTITUTIONS DIRECTORY */}
      {activeTab === "REGISTRY" && (
        <Card className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Verified Institution Registry ({filteredInstitutions.length})
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Browse and select from all verified institutions. 1-click select for outreach or add managerial rationale note.
              </p>
            </div>

            <Badge variant="outline" size="sm" className="font-mono self-start sm:self-auto shrink-0">
              Showing {Math.min(filteredInstitutions.length, 60)} of {filteredInstitutions.length}
            </Badge>
          </div>

          {filteredInstitutions.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border/70 bg-surface/30 space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground">No institutions match your search criteria</p>
              <p className="text-[11px]">Try adjusting your search terms or clearing the type filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTypeFilter("ALL");
                  setSelectedStatusFilter("ALL");
                }}
                className="text-xs mt-2"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredInstitutions.slice(0, 60).map((inst) => {
                const isSelected = selectedInstitutions.some(
                  (s) => s.institution.id === inst.id
                );
                const topMatch = matches.find((m) => m.institution_id === inst.id);
                const selectedItem = selectedInstitutions.find((s) => s.institution.id === inst.id);

                return (
                  <div
                    key={inst.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                      isSelected
                        ? "border-teal-300 bg-teal-50/40 shadow-2xs"
                        : "border-border/70 bg-surface/70 hover:bg-surface-elevated hover:border-border"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {inst.name}
                        </span>
                        {inst.acronym && (
                          <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {inst.acronym}
                          </span>
                        )}
                        <Badge variant="outline" size="sm" className="text-[10px]">
                          {inst.institution_type.replace(/_/g, " ")}
                        </Badge>
                        {topMatch && (
                          <Badge variant="teal" size="sm" className="font-mono text-[10px]">
                            Top 10 Match (#{topMatch.rank})
                          </Badge>
                        )}
                        {inst.nirf_rank && (
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            NIRF #{inst.nirf_rank}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="h-3 w-3 stroke-[2.5]" />
                            In Outreach Pool
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {inst.city}, {inst.state}
                        {inst.district ? ` (${inst.district})` : ""}
                      </p>

                      {/* Research Domains / Tech Tags Preview */}
                      <div className="flex flex-wrap gap-1">
                        {(inst.research_domains ?? []).slice(0, 3).map((rd, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-background/80 text-muted-foreground px-1.5 py-0.5 rounded border border-border/50"
                          >
                            {rd}
                          </span>
                        ))}
                        {(inst.technologies ?? []).slice(0, 2).map((tech, i) => (
                          <span
                            key={`t-${i}`}
                            className="text-[10px] bg-sky-50/80 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200/50"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      {/* If selected and has override reason, show preview */}
                      {isSelected && selectedItem?.overrideReason && (
                        <p className="text-[10px] text-amber-900 bg-amber-50 rounded p-1.5 italic border border-amber-200 max-w-xl">
                          Note: &ldquo;{selectedItem.overrideReason}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProfileModalInstitution(inst);
                          setProfileModalMatch(topMatch ?? null);
                        }}
                        className="text-xs h-8"
                      >
                        Profile
                      </Button>

                      {isSelected ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (selectedItem) {
                              setEditingNoteItem(selectedItem);
                              setEditNoteReason(selectedItem.overrideReason || "");
                              setEditNoteError(null);
                            }
                          }}
                          className="text-[11px] h-8 text-amber-900 hover:bg-amber-50 hover:text-amber-950 inline-flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Note</span>
                        </Button>
                      ) : (
                        !topMatch && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setOverrideCandidate(inst);
                              setOverrideReason("");
                              setOverrideError(null);
                            }}
                            className="text-[11px] h-8 text-amber-900 hover:bg-amber-50 hover:text-amber-950"
                            title="Add managerial override rationale note"
                          >
                            Add Note
                          </Button>
                        )
                      )}

                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => handleToggleInstitutionSelection(inst)}
                        className={`text-xs h-8 font-semibold gap-1.5 transition-colors ${
                          isSelected
                            ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                            : "hover:border-teal-400 hover:text-teal-700"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            Selected
                          </>
                        ) : (
                          "+ Select"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: CURRENTLY SELECTED MANAGEMENT */}
      {activeTab === "SELECTED" && (
        <Card className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Institutions in Outreach Pool ({filteredSelected.length} of {selectedInstitutions.length})
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Review, change, edit notes, or update partner institutions before dispatching formal Phase 3D invitations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => void handleConfirmSelections()}
                disabled={savingSelections || matchingInProgress || selectedInstitutions.length === 0}
                className="text-xs font-semibold gap-1.5"
              >
                {savingSelections ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {isConfirmed ? "Update Selection" : "Confirm Selection (Commit)"}
              </Button>
              {selectedInstitutions.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setSendDialogOpen(true)}
                  disabled={savingSelections || matchingInProgress || sendingInvitations}
                  className="text-xs font-semibold gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  {invitations.length > 0 ? "Dispatch Outreach" : "Send Invitations"}
                </Button>
              )}
            </div>
          </div>

          {selectedInstitutions.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border/70 bg-surface/30 space-y-2">
              <UserCheck className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground">No institutions selected yet</p>
              <p className="text-[11px]">Browse AI Recommendations or the 105-Institution Registry to build your outreach cohort.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("RECOMMENDED")}
                className="text-xs mt-2 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Browse AI Recommendations
              </Button>
            </div>
          ) : filteredSelected.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border/70 bg-surface/30">
              No selected institutions match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSelected.map((sel, idx) => (
                <div
                  key={sel.institution.id}
                  className="rounded-xl border border-teal-200 bg-teal-50/30 p-4 flex flex-col justify-between space-y-3 relative shadow-2xs hover:border-teal-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-100 rounded px-1.5 py-0.5">
                          #{idx + 1}
                        </span>
                        {sel.isManualOverride ? (
                          <Badge variant="amber" size="sm">
                            OVERRIDE
                          </Badge>
                        ) : sel.selectionRank ? (
                          <Badge variant="outline" size="sm" className="font-mono text-teal-800 font-bold">
                            #{sel.selectionRank}
                          </Badge>
                        ) : (
                          <Badge variant="teal" size="sm" className="text-[10px]">
                            REGISTRY
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplacingInstitution(sel);
                            setSelectedReplacementTarget(null);
                            setReplaceSearchQuery("");
                            setReplaceOverrideReason("");
                            setReplaceOverrideError(null);
                          }}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          title="Change / Replace with another institution"
                        >
                          <ArrowLeftRight className="h-3 w-3" />
                          <span>Replace</span>
                        </Button>
                        <button
                          onClick={() => handleRemoveSelection(sel.institution.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-700 transition-colors"
                          title="Remove from selections"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {sel.institution.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sel.institution.city}, {sel.institution.state} · {sel.institution.institution_type.replace(/_/g, " ")}
                      </p>
                    </div>

                    {/* Rationale / Note */}
                    <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {sel.isManualOverride ? "Override Justification" : "Outreach Rationale"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteItem(sel);
                            setEditNoteReason(sel.overrideReason || "");
                            setEditNoteError(null);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          <span>{sel.overrideReason ? "Edit Note" : "+ Add Note"}</span>
                        </button>
                      </div>
                      {sel.overrideReason ? (
                        <p className="text-xs text-foreground italic leading-relaxed">
                          &ldquo;{sel.overrideReason}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          No special note added.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setProfileModalInstitution(sel.institution);
                        setProfileModalMatch(null);
                      }}
                      className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>View Full Profile Dossier</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: PHASE 3D-1 OUTREACH & INVITATIONS MANAGEMENT */}
      {activeTab === "OUTREACH" && (
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
                  Once you select verified institutions, click &ldquo;Send Invitations&rdquo; to dispatch formal challenge dossiers to their institution portals.
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
      )}

      {/* Floating Sticky Bottom Selection Dock (Visible when selections are active) */}
      {selectedInstitutions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="rounded-2xl border border-teal-200/90 bg-card/95 backdrop-blur-md shadow-xl p-3.5 flex items-center justify-between gap-4 text-foreground">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground whitespace-nowrap">
                    {selectedInstitutions.length} {selectedInstitutions.length === 1 ? "Institution" : "Institutions"} Selected
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 overflow-x-auto max-w-md no-scrollbar">
                  {selectedInstitutions.map((s) => (
                    <span
                      key={s.institution.id}
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded border border-border/60 shrink-0"
                    >
                      <span>{s.institution.acronym || s.institution.name.split(" ")[0]}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelection(s.institution.id)}
                        className="hover:text-destructive"
                        title="Remove"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => void handleConfirmSelections()}
                disabled={
                  savingSelections ||
                  matchingInProgress ||
                  selectedInstitutions.length === 0
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
              Recipient Institutions ({selectedInstitutions.length}):
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

      {/* Change / Replace Partner Institution Dialog */}
      <Dialog
        open={Boolean(replacingInstitution)}
        onClose={() => {
          setReplacingInstitution(null);
          setSelectedReplacementTarget(null);
          setReplaceSearchQuery("");
          setReplaceOverrideReason("");
          setReplaceOverrideError(null);
        }}
        title="Change / Replace Partner Institution"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-surface/80 p-3.5 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Currently Selected (To Be Replaced)
              </span>
              <p className="text-sm font-bold text-foreground">
                {replacingInstitution?.institution.name}
              </p>
              <p className="text-muted-foreground">
                {replacingInstitution?.institution.city}, {replacingInstitution?.institution.state} ·{" "}
                {replacingInstitution?.institution.institution_type.replace(/_/g, " ")}
              </p>
            </div>
            <ArrowLeftRight className="h-6 w-6 text-primary shrink-0 opacity-80" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Step 1: Search &amp; Select Replacement Candidate
            </span>
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search replacement by name, city, state, domain, technology..."
                value={replaceSearchQuery}
                onChange={(e) => setReplaceSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-background pl-10 pr-10 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {replaceSearchQuery && (
                <button
                  type="button"
                  onClick={() => setReplaceSearchQuery("")}
                  className="absolute right-3 top-2.5 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Type Filter for Replacement */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
              {[
                { label: "All", value: "ALL" },
                { label: "IITs", value: "IIT" },
                { label: "NITs", value: "NIT" },
                { label: "Central Univ", value: "CENTRAL_UNIVERSITY" },
                { label: "State Univ", value: "STATE_UNIVERSITY" },
                { label: "Research Inst", value: "RESEARCH_INSTITUTE" },
                { label: "Private/Deemed", value: "PRIVATE_DEEMED" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setReplaceTypeFilter(pill.value)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors shrink-0 ${
                    replaceTypeFilter === pill.value
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-surface border border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Candidate List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 border border-border/70 rounded-xl p-2 bg-surface/40">
              {filteredReplacementCandidates.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No eligible replacement candidates found.
                </div>
              ) : (
                filteredReplacementCandidates.map((cand) => {
                  const isTarget = selectedReplacementTarget?.id === cand.id;
                  const isTopMatch = matches.find((m) => m.institution_id === cand.id);

                  return (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedReplacementTarget(cand)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isTarget
                          ? "border-primary bg-primary/10"
                          : "border-border/70 bg-card hover:bg-surface-elevated"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {cand.name}
                          </span>
                          {cand.acronym && (
                            <span className="text-[10px] font-mono bg-muted px-1 rounded text-muted-foreground shrink-0">
                              {cand.acronym}
                            </span>
                          )}
                          {isTopMatch && (
                            <Badge variant="teal" size="sm" className="text-[10px] font-mono">
                              Top 10 (#{isTopMatch.rank})
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{cand.city}, {cand.state}</span>
                          <span>• {cand.institution_type.replace(/_/g, " ")}</span>
                          {cand.nirf_rank && <span>• NIRF #{cand.nirf_rank}</span>}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isTarget ? "default" : "outline"}
                        className={`h-7 text-xs px-2.5 shrink-0 ${isTarget ? "bg-primary text-primary-foreground" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReplacementTarget(cand);
                        }}
                      >
                        {isTarget ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </>
                        ) : (
                          "Choose"
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* If target selected and is manual override (not top 10), prompt for justification */}
          {selectedReplacementTarget &&
            !matches.some((m) => m.institution_id === selectedReplacementTarget.id) &&
            matchRun && (
              <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs">
                <div className="font-semibold text-amber-950 flex items-center justify-between">
                  <span>Manual Override Justification (Min 10 characters)</span>
                  <span className="text-[10px] text-amber-800 font-mono">
                    {replaceOverrideReason.trim().length} chars
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  {selectedReplacementTarget.name} is not among the AI Top 10 recommendations. Please state the rationale for replacement.
                </p>
                <textarea
                  rows={2}
                  placeholder="e.g. Regional expertise in urban drainage and direct municipal sensor infrastructure..."
                  value={replaceOverrideReason}
                  onChange={(e) => {
                    setReplaceOverrideReason(e.target.value);
                    if (replaceOverrideError) setReplaceOverrideError(null);
                  }}
                  className="w-full rounded-lg border border-amber-300 bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {replaceOverrideError && (
                  <p className="text-xs text-destructive font-medium">{replaceOverrideError}</p>
                )}
              </div>
            )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReplacingInstitution(null);
                setSelectedReplacementTarget(null);
                setReplaceSearchQuery("");
                setReplaceOverrideReason("");
                setReplaceOverrideError(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteReplacement}
              disabled={
                !selectedReplacementTarget ||
                Boolean(
                  !matches.some((m) => m.institution_id === selectedReplacementTarget.id) &&
                    matchRun &&
                    replaceOverrideReason.trim().length < 10
                )
              }
              className="text-xs font-semibold gap-1.5"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Confirm &amp; Swap Institution
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Update Rationale / Override Note Dialog */}
      <Dialog
        open={Boolean(editingNoteItem)}
        onClose={() => {
          setEditingNoteItem(null);
          setEditNoteReason("");
          setEditNoteError(null);
        }}
        title="Update Outreach Rationale / Note"
        maxWidth="md"
      >
        <div className="space-y-4">
          {editingNoteItem && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Selected Institution:</span>
              <p className="text-sm font-bold text-foreground">
                {editingNoteItem.institution.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {editingNoteItem.institution.city}, {editingNoteItem.institution.state} ·{" "}
                {editingNoteItem.institution.institution_type.replace(/_/g, " ")}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>
                {editingNoteItem?.isManualOverride
                  ? "Manual Override Justification (Min 10 chars)"
                  : "Outreach & Collaboration Rationale"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {editNoteReason.trim().length} chars
              </span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Selected for high capability alignment in distributed hydrological sensor networks..."
              value={editNoteReason}
              onChange={(e) => {
                setEditNoteReason(e.target.value);
                if (editNoteError) setEditNoteError(null);
              }}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {editNoteError && (
              <p className="text-xs text-destructive font-medium">{editNoteError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingNoteItem(null);
                setEditNoteReason("");
                setEditNoteError(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNoteUpdate}
              disabled={
                Boolean(editingNoteItem?.isManualOverride) &&
                editNoteReason.trim().length < 10
              }
              className="text-xs font-semibold"
            >
              Save Rationale
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
