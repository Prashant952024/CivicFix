import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  FileCheck,
  FileText,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Tag,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchInstitutionById,
  getVerificationStatusBadge,
} from "@/lib/institutions";
import {
  fetchInstitutionInvitations,
  respondToInvitation,
  type InstitutionReceivedInvitation,
} from "@/lib/outreach";
import {
  fetchInstitutionChallengeProjects,
  createProjectWorkspace,
  type ChallengeProjectWithDetails,
} from "@/lib/projects";
import { supabase } from "@/lib/supabase";
import type { Database, InstitutionRow } from "@/types/database";

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];

export function UniversityChallengesPage() {
  const { profile } = useAppSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Main Tab ("invitations" | "discover")
  const paramTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"invitations" | "discover">(
    paramTab === "discover" || paramTab === "all" ? "discover" : "invitations"
  );

  // Core Data States
  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [invitations, setInvitations] = useState<InstitutionReceivedInvitation[]>([]);
  const [projects, setProjects] = useState<ChallengeProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Invitations Filtering & Search
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<
    "ALL" | "ACTION_REQUIRED" | "ACCEPTED" | "REJECTED" | "CANCELLED"
  >("ALL");
  const [invitationSearch, setInvitationSearch] = useState("");
  const [invitationSort, setInvitationSort] = useState<"NEWEST" | "MATCH_SCORE" | "CATEGORY">("NEWEST");

  // Discovery Filtering & Search
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [discoveryCategory, setDiscoveryCategory] = useState<string>("ALL");
  const [onlyDomainMatches, setOnlyDomainMatches] = useState(false);
  const [discoveryStatusFilter, setDiscoveryStatusFilter] = useState<string>("ALL");

  // Inspection & Workflow Modals
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeRow | null>(null);
  const [selectedInvitation, setSelectedInvitation] =
    useState<InstitutionReceivedInvitation | null>(null);
  const [decisionMode, setDecisionMode] = useState<"VIEW" | "ACCEPT" | "REJECT">("VIEW");
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Project Workspace Creation Modal
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [invitationForProject, setInvitationForProject] =
    useState<InstitutionReceivedInvitation | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Mappings
  const projectsByInvitationId = useMemo(
    () =>
      new Map(
        projects
          .filter((p): p is ChallengeProjectWithDetails & { invitation_id: string } => Boolean(p.invitation_id))
          .map((p) => [p.invitation_id, p])
      ),
    [projects]
  );

  const projectsByChallengeId = useMemo(
    () => new Map(projects.map((p) => [p.challenge_id, p])),
    [projects]
  );

  const invitationsByChallengeId = useMemo(
    () => new Map(invitations.map((i) => [i.challenge_id, i])),
    [invitations]
  );

  const institutionDomains = useMemo(() => {
    return new Set(institution?.research_domains?.map((d) => d.toLowerCase()) || []);
  }, [institution]);

  // Load Data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        let instId = profile?.institution_id;
        if (!instId && profile?.id) {
          const { data: memberRecord } = await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          if (memberRecord?.institution_id) instId = memberRecord.institution_id;
        }

        if (!instId) {
          const { data: fallbackInst } = await supabase
            .from("institutions")
            .select("id")
            .eq("name", "IIT Bombay")
            .maybeSingle();
          if (fallbackInst) instId = fallbackInst.id;
        }

        if (instId) {
          const [inst, invs, projs] = await Promise.all([
            fetchInstitutionById(instId),
            fetchInstitutionInvitations(instId).catch((err) => {
              console.warn("Could not fetch institution invitations:", err);
              return [] as InstitutionReceivedInvitation[];
            }),
            fetchInstitutionChallengeProjects(instId).catch((err) => {
              console.warn("Could not fetch institution projects:", err);
              return [] as ChallengeProjectWithDetails[];
            }),
          ]);

          if (!cancelled) {
            setInstitution(inst);
            setInvitations(invs);
            setProjects(projs);
            setLastRefreshed(new Date().toLocaleTimeString());

            // Handle URL params for direct opening
            const urlInvId = searchParams.get("invitationId");
            if (urlInvId) {
              const matched = invs.find((i) => i.id === urlInvId);
              if (matched) {
                setSelectedInvitation(matched);
                setDecisionMode("VIEW");
                setActiveTab("invitations");
              }
            }

            const urlChId = searchParams.get("challengeId");
            if (urlChId) {
              // will open after challenges loaded
            }
          }
        }

        // Fetch network-wide approved and active challenges
        const { data: challengeData, error: challengeErr } = await supabase
          .from("innovation_challenges")
          .select("*")
          .neq("status", "DRAFT")
          .order("created_at", { ascending: false });

        if (challengeErr) throw challengeErr;

        if (!cancelled) {
          setChallenges(challengeData ?? []);

          const urlChId = searchParams.get("challengeId");
          if (urlChId && challengeData) {
            const matchedCh = challengeData.find((c) => c.id === urlChId);
            if (matchedCh) {
              setSelectedChallenge(matchedCh);
              setActiveTab("discover");
            }
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load challenges & invitations data:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load innovation challenges data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [profile?.institution_id, profile?.id, refreshNonce, searchParams]);

  // Keep active tab synced if URL changes
  const switchTab = (tab: "invitations" | "discover") => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // Derived Categories
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    challenges.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    invitations.forEach((inv) => {
      if (inv.challenge?.category) cats.add(inv.challenge.category);
    });
    return Array.from(cats).sort();
  }, [challenges, invitations]);

  // Derived Metrics
  const pendingInvitationsCount = useMemo(
    () => invitations.filter((i) => i.status === "SENT" || i.status === "PENDING").length,
    [invitations]
  );
  const acceptedInvitationsCount = useMemo(
    () => invitations.filter((i) => i.status === "ACCEPTED").length,
    [invitations]
  );
  const declinedInvitationsCount = useMemo(
    () => invitations.filter((i) => i.status === "REJECTED").length,
    [invitations]
  );

  // Filtered Invitations
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      // Status Filter
      if (invitationStatusFilter === "ACTION_REQUIRED") {
        if (inv.status !== "SENT" && inv.status !== "PENDING") return false;
      } else if (invitationStatusFilter !== "ALL") {
        if (inv.status !== invitationStatusFilter) return false;
      }

      // Search
      if (invitationSearch.trim()) {
        const term = invitationSearch.toLowerCase().trim();
        const matchesTitle = inv.challenge?.title?.toLowerCase().includes(term);
        const matchesCategory = inv.challenge?.category?.toLowerCase().includes(term);
        const matchesProblem = inv.challenge?.problem_statement?.toLowerCase().includes(term);
        const matchesMessage = inv.invitation_message?.toLowerCase().includes(term);
        const matchesScope = inv.challenge?.geographic_scope?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesCategory && !matchesProblem && !matchesMessage && !matchesScope) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (invitationSort === "MATCH_SCORE") {
        const scoreA = a.match_evidence?.overall_score ?? 0;
        const scoreB = b.match_evidence?.overall_score ?? 0;
        return scoreB - scoreA;
      }
      if (invitationSort === "CATEGORY") {
        return (a.challenge?.category || "").localeCompare(b.challenge?.category || "");
      }
      // NEWEST
      return new Date(b.invited_at).getTime() - new Date(a.invited_at).getTime();
    });
  }, [invitations, invitationStatusFilter, invitationSearch, invitationSort]);

  // Filtered Discovery Challenges
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      // Category filter
      if (discoveryCategory !== "ALL" && c.category !== discoveryCategory) return false;

      // Status filter
      if (discoveryStatusFilter !== "ALL" && c.status !== discoveryStatusFilter) return false;

      // Domain overlap filter
      if (onlyDomainMatches) {
        const hasOverlap = c.required_domains?.some((d) =>
          institutionDomains.has(d.toLowerCase())
        );
        if (!hasOverlap) return false;
      }

      // Search
      if (discoverySearch.trim()) {
        const term = discoverySearch.toLowerCase().trim();
        const matchesTitle = c.title.toLowerCase().includes(term);
        const matchesStatement = c.problem_statement.toLowerCase().includes(term);
        const matchesCategory = c.category.toLowerCase().includes(term);
        const matchesDomains = c.required_domains.some((d) => d.toLowerCase().includes(term));
        const matchesScope = c.geographic_scope?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesStatement && !matchesCategory && !matchesDomains && !matchesScope) {
          return false;
        }
      }

      return true;
    });
  }, [challenges, discoveryCategory, discoveryStatusFilter, onlyDomainMatches, discoverySearch, institutionDomains]);

  // Action: Accept Invitation
  async function handleAcceptInvitation() {
    if (!selectedInvitation) return;
    setResponding(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await respondToInvitation({
        invitationId: selectedInvitation.id,
        decision: "ACCEPTED",
        note: acceptanceNote.trim() || undefined,
        clerkUserId: profile?.id,
      });

      if (institution) {
        const updated = await fetchInstitutionInvitations(institution.id);
        setInvitations(updated);
        const updatedCurrent = updated.find((i) => i.id === selectedInvitation.id);
        if (updatedCurrent) setSelectedInvitation(updatedCurrent);

        // Also reload projects
        const updatedProjects = await fetchInstitutionChallengeProjects(institution.id);
        setProjects(updatedProjects);
      }

      setDecisionMode("VIEW");
      setAcceptanceNote("");
      setActionSuccess("Challenge invitation accepted! Municipal officers and Innovation Managers have been notified.");
    } catch (err: unknown) {
      console.error("Error accepting invitation:", err);
      setActionError(err instanceof Error ? err.message : "Failed to accept challenge invitation.");
    } finally {
      setResponding(false);
    }
  }

  // Action: Reject Invitation
  async function handleRejectInvitation() {
    if (!selectedInvitation) return;
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 10) {
      setRejectionError("A meaningful justification of at least 10 characters is required to decline this invitation.");
      return;
    }

    setResponding(true);
    setActionError(null);
    setActionSuccess(null);
    setRejectionError(null);

    try {
      await respondToInvitation({
        invitationId: selectedInvitation.id,
        decision: "REJECTED",
        reason: trimmed,
        clerkUserId: profile?.id,
      });

      if (institution) {
        const updated = await fetchInstitutionInvitations(institution.id);
        setInvitations(updated);
        const updatedCurrent = updated.find((i) => i.id === selectedInvitation.id);
        if (updatedCurrent) setSelectedInvitation(updatedCurrent);
      }

      setDecisionMode("VIEW");
      setRejectionReason("");
      setActionSuccess("Your decision to decline this invitation has been officially recorded with your justification.");
    } catch (err: unknown) {
      console.error("Error declining invitation:", err);
      setActionError(err instanceof Error ? err.message : "Failed to decline invitation.");
    } finally {
      setResponding(false);
    }
  }

  // Open Create Project Workspace Dialog
  const handleOpenCreateProjectModal = (inv: InstitutionReceivedInvitation) => {
    setInvitationForProject(inv);
    setProjectTitle(`${inv.challenge.title} — Initiative`);
    setProjectSummary("");
    setCreateProjectModalOpen(true);
  };

  // Action: Create Project Workspace
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationForProject || !institution) return;
    setCreatingProject(true);
    setActionError(null);

    try {
      const created = await createProjectWorkspace({
        challengeId: invitationForProject.challenge.id,
        institutionId: institution.id,
        invitationId: invitationForProject.id,
        projectTitle: projectTitle.trim(),
        projectSummary: projectSummary.trim() || undefined,
      });

      setCreateProjectModalOpen(false);
      void navigate(`/app/university/projects/${created.id}`);
    } catch (err: unknown) {
      console.error("Failed to create project workspace:", err);
      setActionError(err instanceof Error ? err.message : "Failed to initialize project workspace.");
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Institutional Banner */}
      <PageHeader
        variant="research"
        tag="Municipal Outreach & Civic Matching"
        title="Municipal Invitations & Civic Discovery"
        description="Review targeted municipal challenge invitations dispatched to your institution and explore open civic research problems across the network."
        backHref="/app/university"
        backLabel="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="border-border text-foreground hover:bg-surface-elevated text-xs font-semibold"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-surface-elevated text-xs font-semibold"
            >
              <Link to="/app/university/projects">
                <Rocket className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Portfolio ({projects.length})
              </Link>
            </Button>
          </div>
        }
      />

      {/* Institution Banner Card */}
      {institution && (
        <Card className="border border-border/80 bg-surface/90 shadow-xs">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{institution.name}</h3>
                    {(() => {
                      const statusBadge = getVerificationStatusBadge(institution.verification_status);
                      return (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {institution.city}, {institution.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {institution.institution_type?.replace(/_/g, " ")}
                    </span>
                    {institution.research_domains && institution.research_domains.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                        <Sparkles className="h-3 w-3" />
                        {institution.research_domains.length} Research Domains
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Updated: {lastRefreshed}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          className={`border transition-all cursor-pointer rounded-xl ${
            activeTab === "invitations" && invitationStatusFilter === "ACTION_REQUIRED"
              ? "border-amber-500/80 bg-amber-500/10 dark:bg-amber-950/40 shadow-xs"
              : "border-border/80 bg-surface hover:border-amber-400"
          }`}
          onClick={() => {
            switchTab("invitations");
            setInvitationStatusFilter("ACTION_REQUIRED");
          }}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Action Required
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Mail className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {pendingInvitationsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {pendingInvitationsCount === 1 ? "1 invitation pending" : `${pendingInvitationsCount} invitations pending`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border transition-all cursor-pointer rounded-xl ${
            activeTab === "invitations" && invitationStatusFilter === "ALL"
              ? "border-teal-500/80 bg-teal-500/10 dark:bg-teal-950/40 shadow-xs"
              : "border-border/80 bg-surface hover:border-teal-400"
          }`}
          onClick={() => {
            switchTab("invitations");
            setInvitationStatusFilter("ALL");
          }}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Invitations
              </span>
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <FileCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {invitations.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {acceptedInvitationsCount} accepted by institution
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border border-border/80 bg-surface hover:border-emerald-400 transition-all cursor-pointer rounded-xl"
          onClick={() => void navigate("/app/university/projects")}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Projects
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Rocket className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {projects.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Active research workspaces
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border transition-all cursor-pointer rounded-xl ${
            activeTab === "discover"
              ? "border-sky-500/80 bg-sky-500/10 dark:bg-sky-950/40 shadow-xs"
              : "border-border/80 bg-surface hover:border-sky-400"
          }`}
          onClick={() => switchTab("discover")}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Network Challenges
              </span>
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <Compass className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {challenges.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Open civic problems
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications / Feedback */}
      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950">Action Completed</h4>
              <p className="text-xs font-medium text-emerald-900 mt-0.5 leading-relaxed">
                {actionSuccess}
              </p>
            </div>
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
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-950 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-red-950">Error</h4>
              <p className="text-xs font-medium text-red-900 mt-0.5 leading-relaxed">
                {actionError}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-xs font-medium">{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefreshNonce((v) => v + 1)}
            className="text-xs text-red-700 border-red-300"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          onClick={() => switchTab("invitations")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "invitations"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Municipal Invitations</span>
          <Badge
            variant={activeTab === "invitations" ? "outline" : "default"}
            size="sm"
            className={
              activeTab === "invitations"
                ? "bg-white/20 text-white border-white/30 font-mono"
                : "font-mono"
            }
          >
            {invitations.length}
          </Badge>
          {pendingInvitationsCount > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => switchTab("discover")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "discover"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>Open Civic Challenge Discovery</span>
          <Badge
            variant={activeTab === "discover" ? "outline" : "default"}
            size="sm"
            className={
              activeTab === "discover"
                ? "bg-white/20 text-white border-white/30 font-mono"
                : "font-mono"
            }
          >
            {challenges.length}
          </Badge>
        </button>
      </div>

      {/* TAB 1: MUNICIPAL INVITATIONS */}
      {activeTab === "invitations" && (
        <div className="space-y-4">
          {/* Sub-filters & Search Bar */}
          <Card className="border border-border/80 bg-surface/90 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Status Sub-filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={invitationStatusFilter === "ALL" ? "default" : "outline"}
                    onClick={() => setInvitationStatusFilter("ALL")}
                    className="h-8 text-xs font-semibold"
                  >
                    All ({invitations.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={invitationStatusFilter === "ACTION_REQUIRED" ? "default" : "outline"}
                    onClick={() => setInvitationStatusFilter("ACTION_REQUIRED")}
                    className={`h-8 text-xs font-semibold ${
                      invitationStatusFilter === "ACTION_REQUIRED"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : pendingInvitationsCount > 0
                        ? "border-amber-300 text-amber-800 hover:bg-amber-50"
                        : ""
                    }`}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Action Required ({pendingInvitationsCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={invitationStatusFilter === "ACCEPTED" ? "default" : "outline"}
                    onClick={() => setInvitationStatusFilter("ACCEPTED")}
                    className={`h-8 text-xs font-semibold ${
                      invitationStatusFilter === "ACCEPTED"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "text-emerald-800 hover:bg-emerald-50"
                    }`}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Accepted ({acceptedInvitationsCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={invitationStatusFilter === "REJECTED" ? "default" : "outline"}
                    onClick={() => setInvitationStatusFilter("REJECTED")}
                    className={`h-8 text-xs font-semibold ${
                      invitationStatusFilter === "REJECTED"
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "text-rose-800 hover:bg-rose-50"
                    }`}
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Declined ({declinedInvitationsCount})
                  </Button>
                </div>

                {/* Search & Sort Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search invitations..."
                      value={invitationSearch}
                      onChange={(e) => setInvitationSearch(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    {invitationSearch && (
                      <button
                        type="button"
                        onClick={() => setInvitationSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={invitationSort}
                    onChange={(e) =>
                      setInvitationSort(e.target.value as "NEWEST" | "MATCH_SCORE" | "CATEGORY")
                    }
                    aria-label="Sort invitations"
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="NEWEST">Newest Dispatched</option>
                    <option value="MATCH_SCORE">Highest Match Score</option>
                    <option value="CATEGORY">Category</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitations Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-72 animate-pulse border border-border/60 bg-muted/20" />
              ))}
            </div>
          ) : filteredInvitations.length === 0 ? (
            <Card className="border border-dashed border-border/80 bg-surface/50 p-12 text-center">
              <EmptyState
                icon={Mail}
                title={
                  invitationStatusFilter === "ACTION_REQUIRED"
                    ? "No Pending Invitations Needing Review"
                    : invitationSearch
                    ? "No Invitations Match Your Search Query"
                    : "No Municipal Invitations Dispatched Yet"
                }
                description={
                  invitationStatusFilter === "ACTION_REQUIRED"
                    ? "All municipal challenge invitations have been reviewed and acted upon by your institution."
                    : invitationSearch
                    ? "Try adjusting your search terms or clearing the filter."
                    : "When municipal Innovation Managers analyze complex challenges and select your institution based on algorithmic capability matching, official invitation dossiers will appear here."
                }
                action={
                  invitationSearch || invitationStatusFilter !== "ALL" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInvitationSearch("");
                        setInvitationStatusFilter("ALL");
                      }}
                      className="mt-2 text-xs"
                    >
                      Clear Filters
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInvitations.map((inv) => {
                const isPending = inv.status === "SENT" || inv.status === "PENDING";
                const isAccepted = inv.status === "ACCEPTED";
                const isRejected = inv.status === "REJECTED";
                const isCancelled = inv.status === "CANCELLED";
                const existingProject = projectsByInvitationId.get(inv.id);

                return (
                  <Card
                    key={inv.id}
                    className={`group flex flex-col justify-between border transition-all ${
                      isPending
                        ? "border-teal-300 bg-teal-50/20 shadow-xs hover:border-teal-400 hover:shadow-md"
                        : isAccepted
                        ? "border-emerald-200 bg-surface/90 hover:border-emerald-300"
                        : "border-border/80 bg-surface/90 hover:border-border"
                    }`}
                  >
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/20 bg-primary/5 text-primary"
                          >
                            {inv.challenge.category}
                          </Badge>
                          <div>
                            {isPending && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <Clock className="h-2.5 w-2.5" />
                                Action Required
                              </span>
                            )}
                            {isAccepted && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Accepted
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                <XCircle className="h-2.5 w-2.5" />
                                Declined
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-[10px] font-medium text-gray-700 border border-gray-200">
                                <Ban className="h-2.5 w-2.5" />
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="mt-2 line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {inv.challenge.title}
                        </h3>

                        {/* Match Evidence Preview */}
                        {inv.match_evidence && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge variant="teal" size="sm" className="font-mono text-[10px]">
                              Match: {inv.match_evidence.overall_score.toFixed(0)}%
                            </Badge>
                            {inv.match_evidence.recommended_role && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                Role: {inv.match_evidence.recommended_role}
                              </span>
                            )}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3 pb-3">
                        {/* Innovation Manager Briefing Snippet */}
                        {inv.invitation_message && (
                          <div className="rounded-lg border border-border/70 bg-background/70 p-2.5 space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5 text-teal-600" />
                              Manager Briefing:
                            </span>
                            <p className="text-xs text-foreground italic leading-relaxed line-clamp-2">
                              &ldquo;{inv.invitation_message}&rdquo;
                            </p>
                          </div>
                        )}

                        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {inv.challenge.problem_statement}
                        </p>

                        {/* Metadata Footer */}
                        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {inv.challenge.geographic_scope || "City-wide"}
                          </span>
                          <span>Invited: {new Date(inv.invited_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </div>

                    {/* Action Bar */}
                    <div className="border-t border-border/80 bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedInvitation(inv);
                          setDecisionMode("VIEW");
                          setActionError(null);
                          setActionSuccess(null);
                        }}
                        className={
                          isPending
                            ? "text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1"
                            : "text-xs font-semibold gap-1"
                        }
                        variant={isPending ? "default" : "outline"}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {isPending ? "Review & Decide" : "View Dossier"}
                      </Button>

                      {isAccepted && (
                        existingProject ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              void navigate(`/app/university/projects/${existingProject.id}`);
                            }}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            Workspace
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenCreateProjectModal(inv)}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            Start Workspace
                          </Button>
                        )
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPEN CIVIC CHALLENGE DISCOVERY */}
      {activeTab === "discover" && (
        <div className="space-y-4">
          {/* Discovery Filter Controls */}
          <Card className="border border-border/80 bg-surface/90 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search challenges by title, domain, technology, or problem statement..."
                    value={discoverySearch}
                    onChange={(e) => setDiscoverySearch(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  {discoverySearch && (
                    <button
                      type="button"
                      onClick={() => setDiscoverySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdowns & Domain Toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={discoveryCategory}
                    onChange={(e) => setDiscoveryCategory(e.target.value)}
                    aria-label="Filter challenges by category"
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">All Categories ({challenges.length})</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={discoveryStatusFilter}
                    onChange={(e) => setDiscoveryStatusFilter(e.target.value)}
                    aria-label="Filter challenges by status"
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="READY_FOR_MATCHING">Ready for Matching</option>
                    <option value="MATCHING_COMPLETED">Matching Completed</option>
                    <option value="INSTITUTIONS_SELECTED">Institutions Selected</option>
                    <option value="READY_FOR_INVITATION">Ready for Invitation</option>
                    <option value="INVITATIONS_SENT">Invitations Sent</option>
                    <option value="OPEN_FOR_PROPOSALS">Open for Proposals</option>
                    <option value="PILOT_ACTIVE">Pilot Active</option>
                    <option value="SOLVED">Solved</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setOnlyDomainMatches((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      onlyDomainMatches
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Domain Matches Only</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discovery Challenges Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-72 animate-pulse border border-border/60 bg-muted/20" />
              ))}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <Card className="border border-dashed border-border/80 bg-surface/50 p-12 text-center">
              <EmptyState
                icon={Compass}
                title="No Innovation Challenges Found"
                description={
                  onlyDomainMatches
                    ? "No approved innovation challenges match your institution's cataloged research domains. Try disabling the 'Domain Matches Only' filter."
                    : discoverySearch || discoveryCategory !== "ALL"
                    ? "No challenges match your active search filters. Try adjusting your query."
                    : "There are currently no open municipal challenges formulated across the network."
                }
                action={
                  discoverySearch || discoveryCategory !== "ALL" || onlyDomainMatches ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDiscoverySearch("");
                        setDiscoveryCategory("ALL");
                        setOnlyDomainMatches(false);
                        setDiscoveryStatusFilter("ALL");
                      }}
                      className="mt-2 text-xs"
                    >
                      Clear Discovery Filters
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredChallenges.map((challenge) => {
                const hasDomainOverlap = challenge.required_domains?.some((d) =>
                  institutionDomains.has(d.toLowerCase())
                );
                const linkedInvitation = invitationsByChallengeId.get(challenge.id);
                const linkedProject = projectsByChallengeId.get(challenge.id);

                return (
                  <Card
                    key={challenge.id}
                    className="group flex flex-col justify-between border border-border/80 bg-surface/90 transition-all hover:border-teal-400/60 hover:shadow-md"
                  >
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/20 bg-primary/5 text-primary"
                          >
                            {challenge.category}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            {hasDomainOverlap && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                <Sparkles className="h-2.5 w-2.5" />
                                Domain Match
                              </span>
                            )}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {challenge.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>

                        <h3 className="mt-2 line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {challenge.title}
                        </h3>

                        {/* Participation State Pill */}
                        <div className="mt-1.5">
                          {linkedProject ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <Rocket className="h-2.5 w-2.5" />
                              Project Active ({linkedProject.status})
                            </span>
                          ) : linkedInvitation ? (
                            linkedInvitation.status === "SENT" || linkedInvitation.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <Mail className="h-2.5 w-2.5" />
                                Invited · Action Required
                              </span>
                            ) : linkedInvitation.status === "ACCEPTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Invited · Accepted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                <XCircle className="h-2.5 w-2.5" />
                                Invited · Declined
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Compass className="h-2.5 w-2.5" />
                              Open Discovery
                            </span>
                          )}
                        </div>

                        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                          {challenge.problem_statement}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-3 pb-3">
                        {challenge.required_domains && challenge.required_domains.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              Target Domains:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {challenge.required_domains.map((d, i) => {
                                const isMatch = institutionDomains.has(d.toLowerCase());
                                return (
                                  <span
                                    key={i}
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                                      isMatch
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-sky-50 text-sky-700 border-sky-200/60"
                                    }`}
                                  >
                                    {d}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {challenge.geographic_scope || "City-wide"}
                          </span>
                          {challenge.complexity_score && (
                            <span className="font-mono">
                              Complexity: {challenge.complexity_score}/100
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </div>

                    <div className="border-t border-border/80 bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedChallenge(challenge)}
                        className="text-xs font-semibold text-primary gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Details
                      </Button>

                      {linkedProject ? (
                        <Button
                          size="sm"
                          onClick={() => void navigate(`/app/university/projects/${linkedProject.id}`)}
                          className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <Rocket className="h-3.5 w-3.5" />
                          Workspace
                        </Button>
                      ) : linkedInvitation ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedInvitation(linkedInvitation);
                            setDecisionMode("VIEW");
                            switchTab("invitations");
                          }}
                          className={
                            linkedInvitation.status === "SENT" || linkedInvitation.status === "PENDING"
                              ? "text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1"
                              : "text-xs font-semibold gap-1"
                          }
                          variant={
                            linkedInvitation.status === "SENT" || linkedInvitation.status === "PENDING"
                              ? "default"
                              : "outline"
                          }
                        >
                          <Mail className="h-3.5 w-3.5" />
                          View Invitation
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DIALOG 1: OFFICIAL CHALLENGE INVITATION & DOSSIER MODAL */}
      <Dialog
        open={Boolean(selectedInvitation)}
        onClose={() => {
          setSelectedInvitation(null);
          setDecisionMode("VIEW");
          setActionError(null);
        }}
        title="Official Challenge Invitation & Dossier"
        maxWidth="xl"
      >
        {selectedInvitation && (
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Top Challenge Header Card */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="teal" size="sm">
                    {selectedInvitation.challenge.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Scope: {selectedInvitation.challenge.geographic_scope || "City-wide"}
                  </span>
                </div>
                <div>
                  {(selectedInvitation.status === "SENT" || selectedInvitation.status === "PENDING") && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      Pending Decision
                    </span>
                  )}
                  {selectedInvitation.status === "ACCEPTED" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Accepted
                    </span>
                  )}
                  {selectedInvitation.status === "REJECTED" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-900">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      Declined
                    </span>
                  )}
                  {selectedInvitation.status === "CANCELLED" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      <Ban className="h-3.5 w-3.5 text-gray-500" />
                      Cancelled
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-base font-bold text-foreground">
                {selectedInvitation.challenge.title}
              </h2>

              <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                <Clock className="h-3 w-3" />
                <span>Dispatched: {new Date(selectedInvitation.invited_at).toLocaleString()}</span>
                {selectedInvitation.invited_by_profile && (
                  <span>· Invited by: {selectedInvitation.invited_by_profile.full_name}</span>
                )}
              </div>
            </div>

            {/* Innovation Manager Briefing Note */}
            {selectedInvitation.invitation_message && (
              <div className="rounded-xl border border-border/80 bg-surface/70 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3 text-teal-600" />
                  Innovation Manager Briefing
                </span>
                <p className="text-xs text-foreground leading-relaxed italic bg-background p-3 rounded-lg border border-border/70">
                  &ldquo;{selectedInvitation.invitation_message}&rdquo;
                </p>
              </div>
            )}

            {/* Why Your Institution Was Selected (Algorithmic Capability Intelligence) */}
            {selectedInvitation.match_evidence && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-700" />
                    <span className="font-bold text-xs text-teal-950">
                      Why Your Institution Was Selected (AI Capability Intelligence)
                    </span>
                  </div>
                  <Badge variant="teal" size="default" className="font-mono font-bold">
                    {selectedInvitation.match_evidence.overall_score.toFixed(0)}% Capability Match
                  </Badge>
                </div>

                {selectedInvitation.match_evidence.recommended_role && (
                  <div className="text-xs text-teal-950 font-medium">
                    <span className="font-bold">Recommended Partnership Role:</span>{" "}
                    {selectedInvitation.match_evidence.recommended_role}
                  </div>
                )}

                {selectedInvitation.match_evidence.match_explanation && (
                  <p className="text-xs text-teal-900 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-teal-200/80">
                    {selectedInvitation.match_evidence.match_explanation}
                  </p>
                )}

                {selectedInvitation.match_evidence.strengths &&
                  selectedInvitation.match_evidence.strengths.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-800">
                        Cataloged Institutional Strengths
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-xs text-teal-950">
                        {selectedInvitation.match_evidence.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Complete Challenge Problem Statement & Objectives */}
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                  Problem Statement
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/70">
                  {selectedInvitation.challenge.problem_statement}
                </p>
              </div>

              {selectedInvitation.challenge.objectives &&
                selectedInvitation.challenge.objectives.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                      Challenge Objectives
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      {selectedInvitation.challenge.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {selectedInvitation.challenge.potential_technology_areas &&
                selectedInvitation.challenge.potential_technology_areas.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                      Potential Technology Areas
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedInvitation.challenge.potential_technology_areas.map((tech, i) => (
                        <span
                          key={i}
                          className="rounded bg-purple-50 px-2 py-0.5 text-purple-700 border border-purple-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {selectedInvitation.challenge.expected_outcomes &&
                selectedInvitation.challenge.expected_outcomes.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                      Expected Outcomes
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      {selectedInvitation.challenge.expected_outcomes.map((out, i) => (
                        <li key={i}>{out}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* DECISION / RESPONSE WORKFLOW SECTION */}
            <div className="pt-3 border-t border-border/80">
              {/* If already accepted */}
              {selectedInvitation.status === "ACCEPTED" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Invitation Accepted
                    {selectedInvitation.responded_at && (
                      <span className="font-normal text-emerald-800 text-[11px]">
                        on {new Date(selectedInvitation.responded_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {selectedInvitation.response_note ? (
                    <div className="bg-white/70 rounded-lg p-2.5 border border-emerald-200 text-emerald-950 text-xs">
                      <span className="font-semibold block text-[10px] uppercase text-emerald-800">
                        Submitted Collaboration Note:
                      </span>
                      &ldquo;{selectedInvitation.response_note}&rdquo;
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-800">
                      Your institution has agreed to participate in this innovation initiative.
                    </p>
                  )}

                  <div className="pt-2">
                    {projectsByInvitationId.get(selectedInvitation.id) ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const p = projectsByInvitationId.get(selectedInvitation.id)!;
                          setSelectedInvitation(null);
                          void navigate(`/app/university/projects/${p.id}`);
                        }}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        Open Project Workspace ({projectsByInvitationId.get(selectedInvitation.id)?.status})
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          const targetInv = selectedInvitation;
                          setSelectedInvitation(null);
                          handleOpenCreateProjectModal(targetInv);
                        }}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        Start Project Workspace &amp; Form Team
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* If already declined */}
              {selectedInvitation.status === "REJECTED" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-950 text-xs">
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Invitation Declined
                    {selectedInvitation.responded_at && (
                      <span className="font-normal text-rose-800 text-[11px]">
                        on {new Date(selectedInvitation.responded_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/70 rounded-lg p-2.5 border border-rose-200 text-rose-950 text-xs">
                    <span className="font-semibold block text-[10px] uppercase text-rose-800">
                      Decline Justification Recorded:
                    </span>
                    &ldquo;{selectedInvitation.rejection_reason}&rdquo;
                  </div>
                </div>
              )}

              {/* If cancelled */}
              {selectedInvitation.status === "CANCELLED" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-700 text-xs">
                  This invitation was recalled by the municipal Innovation Manager. No further action is required.
                </div>
              )}

              {/* Action Buttons if Pending */}
              {(selectedInvitation.status === "SENT" || selectedInvitation.status === "PENDING") && (
                <div>
                  {decisionMode === "VIEW" && (
                    <div className="rounded-xl border border-border/80 bg-surface/60 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <UserCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-foreground">
                            Institution Decision Required
                          </h4>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Please confirm whether your institution wishes to accept this challenge invitation to participate in solution co-development or decline with a recorded reason.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDecisionMode("REJECT")}
                          className="text-xs text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Decline Invitation
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setDecisionMode("ACCEPT")}
                          className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Accept Challenge Invitation
                        </Button>
                      </div>
                    </div>
                  )}

                  {decisionMode === "ACCEPT" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <Check className="h-4 w-4 text-emerald-600" />
                        Accept Invitation &amp; Confirm Participation
                      </div>
                      <p className="text-[11px] text-emerald-900 leading-relaxed">
                        You are accepting the invitation on behalf of your institution. You can optionally include collaboration notes or specify leading faculty/labs below.
                      </p>

                      <div className="space-y-1">
                        <label htmlFor="challenges-acceptance-note" className="text-[11px] font-semibold text-emerald-950">
                          Optional Collaboration / Partnership Note
                        </label>
                        <textarea
                          id="challenges-acceptance-note"
                          name="acceptanceNote"
                          rows={3}
                          placeholder="e.g. Our Department of Environmental Engineering and Water Technology Lab will lead this initiative..."
                          value={acceptanceNote}
                          onChange={(e) => setAcceptanceNote(e.target.value)}
                          className="w-full rounded-xl border border-emerald-200 bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDecisionMode("VIEW")}
                          disabled={responding}
                          className="text-xs"
                        >
                          Back
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void handleAcceptInvitation()}
                          disabled={responding}
                          className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          {responding ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Submitting Acceptance...
                            </>
                          ) : (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Confirm Acceptance
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {decisionMode === "REJECT" && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        Decline Challenge Invitation
                      </div>
                      <div className="rounded-lg border border-rose-200 bg-rose-100/50 p-2.5 text-[11px] text-rose-950">
                        <strong>Governance Requirement:</strong> Declining an invitation requires a meaningful justification (minimum 10 characters) for city audit and innovation tracking records.
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="challenges-rejection-reason" className="flex items-center justify-between text-[11px] font-semibold text-rose-950">
                          <span>Reason for Declining (Min 10 chars)</span>
                          <span className="font-mono text-muted-foreground">
                            {rejectionReason.trim().length} / 10 chars
                          </span>
                        </label>
                        <textarea
                          id="challenges-rejection-reason"
                          name="rejectionReason"
                          rows={3}
                          placeholder="e.g. Existing laboratory capacity is currently allocated to national flood monitoring pilots..."
                          value={rejectionReason}
                          onChange={(e) => {
                            setRejectionReason(e.target.value);
                            if (rejectionError) setRejectionError(null);
                          }}
                          className="w-full rounded-xl border border-rose-200 bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        {rejectionError && (
                          <p className="text-[11px] text-destructive font-medium">{rejectionError}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDecisionMode("VIEW")}
                          disabled={responding}
                          className="text-xs"
                        >
                          Back
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void handleRejectInvitation()}
                          disabled={responding || rejectionReason.trim().length < 10}
                          className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                        >
                          {responding ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Submitting Decision...
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                              Confirm Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedInvitation(null);
                  setDecisionMode("VIEW");
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* DIALOG 2: CHALLENGE INSPECTOR DIALOG (DISCOVERY) */}
      <Dialog
        open={Boolean(selectedChallenge)}
        onClose={() => setSelectedChallenge(null)}
        title={selectedChallenge?.title || "Challenge Details"}
        description={`${selectedChallenge?.category || ""} · Approved Civic Innovation Challenge`}
        maxWidth="lg"
      >
        {selectedChallenge && (
          <div className="space-y-4 pt-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-3 rounded-xl border border-border/80">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-primary font-semibold">
                  {selectedChallenge.category}
                </Badge>
                <span className="text-muted-foreground font-mono">
                  Scope: {selectedChallenge.geographic_scope || "City-wide"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Status: {selectedChallenge.status.replace(/_/g, " ")}
                </span>
                {selectedChallenge.complexity_score && (
                  <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-mono">
                    Complexity: {selectedChallenge.complexity_score}/100
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Problem Statement
              </div>
              <p className="text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/80">
                {selectedChallenge.problem_statement}
              </p>
            </div>

            {selectedChallenge.root_cause && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Root Cause Analysis
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedChallenge.root_cause}
                </p>
              </div>
            )}

            {selectedChallenge.current_limitations && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Limitations of Existing Municipal Approach
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedChallenge.current_limitations}
                </p>
              </div>
            )}

            {selectedChallenge.objectives && selectedChallenge.objectives.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Key Objectives
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {selectedChallenge.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedChallenge.potential_technology_areas &&
              selectedChallenge.potential_technology_areas.length > 0 && (
                <div className="space-y-1">
                  <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    Potential Technology Solutions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedChallenge.potential_technology_areas.map((t, i) => (
                      <span
                        key={i}
                        className="rounded bg-purple-50 px-2 py-0.5 text-purple-700 border border-purple-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {selectedChallenge.expected_outcomes && selectedChallenge.expected_outcomes.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Expected Outcomes
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {selectedChallenge.expected_outcomes.map((out, i) => (
                    <li key={i}>{out}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedChallenge.research_requirements && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Research &amp; Methodology Requirements
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedChallenge.research_requirements}
                </p>
              </div>
            )}

            {/* Read-Only Governance Notice */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 flex items-start gap-2.5 text-sky-950 text-[11px]">
              <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong>Civic Innovation Challenge Protocol:</strong> Challenge definitions are authored by municipal officers and innovation managers. Institutions can participate through targeted municipal invitations or open initiative formation.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              {invitationsByChallengeId.get(selectedChallenge.id) ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const inv = invitationsByChallengeId.get(selectedChallenge.id)!;
                    setSelectedChallenge(null);
                    setSelectedInvitation(inv);
                    setDecisionMode("VIEW");
                    switchTab("invitations");
                  }}
                  className="text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white gap-1"
                >
                  <Mail className="h-3.5 w-3.5" />
                  View Invitation Dossier
                </Button>
              ) : (
                <div />
              )}
              <Button size="sm" variant="outline" onClick={() => setSelectedChallenge(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* DIALOG 3: CREATE PROJECT WORKSPACE MODAL */}
      <Dialog
        open={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        title="Initialize Project Workspace"
        description="Set up your collaborative research workspace container and institutional project team for this innovation challenge."
      >
        <form onSubmit={(e) => void handleCreateProject(e)} className="space-y-4 pt-2">
          {invitationForProject && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/80 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Target Innovation Challenge
              </span>
              <p className="font-bold text-foreground mt-0.5">
                {invitationForProject.challenge.title}
              </p>
              <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-2">
                {invitationForProject.challenge.problem_statement}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="workspace-project-title"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Project Title *
            </label>
            <input
              id="workspace-project-title"
              name="workspaceProjectTitle"
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              required
              placeholder="e.g. AI Flood Detection & Rapid Response System"
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="workspace-project-summary"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Project Summary / Research Scope (Optional)
            </label>
            <textarea
              id="workspace-project-summary"
              name="workspaceProjectSummary"
              rows={4}
              value={projectSummary}
              onChange={(e) => setProjectSummary(e.target.value)}
              placeholder="Outline high-level methodology, participating departments, or key research milestones..."
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
            <p className="font-semibold mb-0.5">Workspace Setup Invariant:</p>
            <p className="text-[11px] leading-relaxed">
              Upon workspace initialization, you will be designated as the initial Project Lead and can immediately recruit faculty, researchers, and students from your institution.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={creatingProject || !projectTitle.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {creatingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Create &amp; Enter Workspace
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
