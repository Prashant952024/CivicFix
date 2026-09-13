import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { fetchInstitutionById } from "@/lib/institutions";
import {
  fetchInstitutionInvitations,
  respondToInvitation,
  type InstitutionReceivedInvitation,
} from "@/lib/outreach";
import {
  fetchInstitutionProjects,
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

  const [activeTab, setActiveTab] = useState<"invitations" | "all">(
    searchParams.get("tab") === "invitations" ? "invitations" : "all"
  );
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [invitations, setInvitations] = useState<InstitutionReceivedInvitation[]>([]);
  const [projects, setProjects] = useState<ChallengeProjectWithDetails[]>([]);
  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeRow | null>(null);

  // Project Workspace creation modal states
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [invitationForProject, setInvitationForProject] =
    useState<InstitutionReceivedInvitation | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Invitation Decision modal states
  const [selectedInvitation, setSelectedInvitation] =
    useState<InstitutionReceivedInvitation | null>(null);
  const [decisionMode, setDecisionMode] = useState<"VIEW" | "ACCEPT" | "REJECT">("VIEW");
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [refreshNonce, setRefreshNonce] = useState(0);

  const projectsByInvitationId = useMemo(
    () => new Map(projects.map((p) => [p.invitation_id, p])),
    [projects]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
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
            fetchInstitutionProjects(instId).catch((err) => {
              console.warn("Could not fetch institution projects:", err);
              return [] as ChallengeProjectWithDetails[];
            }),
          ]);

          if (!cancelled) {
            setInstitution(inst);
            setInvitations(invs);
            setProjects(projs);

            // Auto-switch to invitations tab if URL specifies or if there are invitations
            const urlTab = searchParams.get("tab");
            if (urlTab === "invitations" || (invs.length > 0 && !urlTab)) {
              setActiveTab("invitations");
            }

            // Auto-open invitation if requested in URL
            const urlInvId = searchParams.get("invitationId");
            if (urlInvId) {
              const matched = invs.find((i) => i.id === urlInvId);
              if (matched) {
                setSelectedInvitation(matched);
                setDecisionMode("VIEW");
              }
            }
          }
        }

        const { data, error } = await supabase
          .from("innovation_challenges")
          .select("*")
          .in("status", ["APPROVED", "READY_FOR_MATCHING", "OPEN_FOR_PROPOSALS"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) setChallenges(data ?? []);
      } catch (err) {
        console.error("Failed to load challenges data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [profile?.institution_id, profile?.id, refreshNonce, searchParams]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    challenges.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (selectedCategory !== "ALL" && c.category !== selectedCategory) return false;
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matchesTitle = c.title.toLowerCase().includes(term);
        const matchesStatement = c.problem_statement.toLowerCase().includes(term);
        const matchesCategory = c.category.toLowerCase().includes(term);
        const matchesDomains = c.required_domains.some((d) => d.toLowerCase().includes(term));
        if (!matchesTitle && !matchesStatement && !matchesCategory && !matchesDomains) return false;
      }
      return true;
    });
  }, [challenges, selectedCategory, search]);

  const institutionDomains = useMemo(() => {
    return new Set(institution?.research_domains?.map((d) => d.toLowerCase()) || []);
  }, [institution]);

  // Handle invitation response
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

      // Reload invitations
      if (institution) {
        const updated = await fetchInstitutionInvitations(institution.id);
        setInvitations(updated);
        const updatedCurrent = updated.find((i) => i.id === selectedInvitation.id);
        if (updatedCurrent) setSelectedInvitation(updatedCurrent);
      }

      setDecisionMode("VIEW");
      setAcceptanceNote("");
      setActionSuccess("Challenge invitation accepted! Municipal officers and Innovation Managers have been notified.");
    } catch (err: unknown) {
      console.error("Error accepting invitation:", err);
      const msg = err instanceof Error ? err.message : "Failed to accept invitation";
      setActionError(msg);
    } finally {
      setResponding(false);
    }
  }

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

      // Reload invitations
      if (institution) {
        const updated = await fetchInstitutionInvitations(institution.id);
        setInvitations(updated);
        const updatedCurrent = updated.find((i) => i.id === selectedInvitation.id);
        if (updatedCurrent) setSelectedInvitation(updatedCurrent);
      }

      setDecisionMode("VIEW");
      setRejectionReason("");
      setActionSuccess("Your decision to decline this invitation has been recorded with your justification.");
    } catch (err: unknown) {
      console.error("Error declining invitation:", err);
      const msg = err instanceof Error ? err.message : "Failed to decline invitation";
      setActionError(msg);
    } finally {
      setResponding(false);
    }
  }

  const handleOpenCreateProjectModal = (inv: InstitutionReceivedInvitation) => {
    setInvitationForProject(inv);
    setProjectTitle(`${inv.challenge.title} — Initiative`);
    setProjectSummary("");
    setCreateProjectModalOpen(true);
  };

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
        projectTitle,
        projectSummary,
      });
      setCreateProjectModalOpen(false);
      void navigate(`/app/university/projects/${created.id}`);
    } catch (err) {
      console.error("Failed to create project workspace:", err);
      setActionError(err instanceof Error ? err.message : "Failed to create project workspace.");
    } finally {
      setCreatingProject(false);
    }
  };

  const pendingInvitationsCount = invitations.filter(
    (i) => i.status === "SENT" || i.status === "PENDING"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        tag="Innovation Challenges"
        title="Civic Innovation Challenges"
        description="Review targeted municipal challenge invitations dispatched to your institution and explore open civic research problems."
        backHref="/app/university"
        backLabel="Dashboard"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshNonce((v) => v + 1)}
            className="border-border text-foreground hover:bg-surface-elevated"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{actionSuccess}</p>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-950 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          onClick={() => {
            setActiveTab("invitations");
            setSearchParams({ tab: "invitations" });
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
            activeTab === "invitations"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Official Invitations</span>
          <Badge
            variant={activeTab === "invitations" ? "outline" : "default"}
            size="sm"
            className={
              activeTab === "invitations"
                ? "bg-white/20 text-white border-white/30"
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
          onClick={() => {
            setActiveTab("all");
            setSearchParams({ tab: "all" });
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
            activeTab === "all"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
          }`}
        >
          <Rocket className="h-4 w-4" />
          <span>All Open Challenges</span>
          <Badge
            variant={activeTab === "all" ? "outline" : "default"}
            size="sm"
            className={
              activeTab === "all"
                ? "bg-white/20 text-white border-white/30"
                : "font-mono"
            }
          >
            {challenges.length}
          </Badge>
        </button>
      </div>

      {/* TAB 1: OFFICIAL INVITATIONS (PHASE 3D) */}
      {activeTab === "invitations" && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-64 animate-pulse border border-border/60 bg-muted/20" />
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <Card className="border border-dashed border-border/80 bg-surface/50 p-12 text-center">
              <EmptyState
                icon={Mail}
                title="No Official Invitations Received Yet"
                description="When municipal Innovation Managers analyze complex challenges and select your institution based on algorithmic capability matching, official invitation dossiers will appear here."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {invitations.map((inv) => {
                const isPending = inv.status === "SENT" || inv.status === "PENDING";
                return (
                  <Card
                    key={inv.id}
                    className={`group flex flex-col justify-between border transition-all ${
                      isPending
                        ? "border-teal-300 bg-teal-50/20 shadow-xs hover:border-teal-400"
                        : "border-border/80 bg-surface/90 hover:border-border"
                    }`}
                  >
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">
                            {inv.challenge.category}
                          </Badge>
                          <div>
                            {isPending && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <Clock className="h-2.5 w-2.5" />
                                Action Required
                              </span>
                            )}
                            {inv.status === "ACCEPTED" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Accepted
                              </span>
                            )}
                            {inv.status === "REJECTED" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                <XCircle className="h-2.5 w-2.5" />
                                Declined
                              </span>
                            )}
                            {inv.status === "CANCELLED" && (
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

                        {inv.match_evidence && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="teal" size="sm" className="font-mono text-[10px]">
                              Match: {inv.match_evidence.overall_score.toFixed(0)}%
                            </Badge>
                            {inv.match_evidence.recommended_role && (
                              <span className="text-[11px] text-muted-foreground truncate">
                                Role: {inv.match_evidence.recommended_role}
                              </span>
                            )}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3 pb-3">
                        <div className="rounded-lg border border-border/70 bg-background/60 p-2.5 space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Manager Briefing Message:
                          </span>
                          <p className="text-xs text-foreground italic leading-relaxed line-clamp-2">
                            &ldquo;{inv.invitation_message}&rdquo;
                          </p>
                        </div>

                        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {inv.challenge.problem_statement}
                        </p>

                        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          <span>Scope: {inv.challenge.geographic_scope || "City-wide"}</span>
                          <span>Invited: {new Date(inv.invited_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </div>

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
                        {isPending ? "Review & Decide" : "Dossier"}
                      </Button>

                      {inv.status === "ACCEPTED" && (
                        projectsByInvitationId.get(inv.id) ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              void navigate(
                                `/app/university/projects/${projectsByInvitationId.get(inv.id)!.id}`
                              );
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

      {/* TAB 2: ALL OPEN CHALLENGES */}
      {activeTab === "all" && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <Card className="border border-border/80 bg-surface/90 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search challenges by title, domain, or technology..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Challenges Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-64 animate-pulse border border-border/60 bg-muted/20" />
              ))}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No innovation challenges found"
              description="There are currently no challenges matching your query. Check back when new municipal challenges are formulated."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredChallenges.map((challenge) => {
                const hasDomainOverlap = challenge.required_domains?.some((d) =>
                  institutionDomains.has(d.toLowerCase())
                );

                return (
                  <Card
                    key={challenge.id}
                    className="group flex flex-col justify-between border border-border/80 bg-surface/90 transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">
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

                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                          {challenge.problem_statement}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-3 pb-3">
                        {challenge.required_domains && challenge.required_domains.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground">Target Domains:</span>
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
                          <span>Scope: {challenge.geographic_scope || "City-wide"}</span>
                          {challenge.complexity_score && (
                            <span>Complexity: {challenge.complexity_score}/100</span>
                          )}
                        </div>
                      </CardContent>
                    </div>

                    <div className="border-t border-border/80 bg-muted/20 px-4 py-2.5 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedChallenge(challenge)}
                        className="text-xs font-semibold text-primary"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Inspect Details
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Challenge Inspector Dialog */}
      <Dialog
        open={Boolean(selectedChallenge)}
        onClose={() => setSelectedChallenge(null)}
        title={selectedChallenge?.title || "Challenge Details"}
        description={`${selectedChallenge?.category || ""} · Approved Civic Innovation Challenge`}
      >
        {selectedChallenge && (
          <div className="space-y-4 pt-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
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

            {selectedChallenge.potential_technology_areas && selectedChallenge.potential_technology_areas.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                  Potential Technology Solutions
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedChallenge.potential_technology_areas.map((t, i) => (
                    <span key={i} className="rounded bg-purple-50 px-2 py-0.5 text-purple-700 border border-purple-200">
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

            <div className="flex justify-end pt-2 border-t border-border">
              <Button size="sm" onClick={() => setSelectedChallenge(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL 2: PHASE 3D-1 INVITATION REVIEW & DECISION MODAL */}
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
                  {selectedInvitation.status === "SENT" && (
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
              </div>
            </div>

            {/* Innovation Manager Briefing Note */}
            <div className="rounded-xl border border-border/80 bg-surface/70 p-3.5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3 text-teal-600" />
                Innovation Manager Briefing
              </span>
              <p className="text-xs text-foreground leading-relaxed italic bg-background p-3 rounded-lg border border-border/70">
                &ldquo;{selectedInvitation.invitation_message}&rdquo;
              </p>
            </div>

            {/* Why Your Institution Was Selected (Algorithmic Capability Intelligence) */}
            {selectedInvitation.match_evidence && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-700" />
                    <span className="font-bold text-xs text-teal-950">
                      Why Your Institution Was Selected (AI Matching Intelligence)
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

                {selectedInvitation.match_evidence.strengths.length > 0 && (
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

            {/* Complete Challenge Problem Statement & Root Cause */}
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                  Problem Statement
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/70">
                  {selectedInvitation.challenge.problem_statement}
                </p>
              </div>

              {selectedInvitation.challenge.objectives && selectedInvitation.challenge.objectives.length > 0 && (
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
                        <span key={i} className="rounded bg-purple-50 px-2 py-0.5 text-purple-700 border border-purple-200">
                          {tech}
                        </span>
                      ))}
                    </div>
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
                        <label className="text-[11px] font-semibold text-emerald-950">
                          Optional Collaboration / Partnership Note
                        </label>
                        <textarea
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
                        <div className="flex items-center justify-between text-[11px] font-semibold text-rose-950">
                          <span>Reason for Declining (Min 10 chars)</span>
                          <span className="font-mono text-muted-foreground">
                            {rejectionReason.trim().length} / 10 chars
                          </span>
                        </div>
                        <textarea
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

      {/* Create Project Workspace Dialog */}
      <Dialog
        open={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        title="Initialize Project Workspace"
        description="Set up your collaborative research workspace container and institutional project team for this innovation challenge."
      >
        <form
          onSubmit={(e) => {
            void handleCreateProject(e);
          }}
          className="space-y-4 pt-2"
        >
          {invitationForProject && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/80 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Target Innovation Challenge
              </span>
              <p className="font-bold text-foreground mt-0.5">{invitationForProject.challenge.title}</p>
              <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-2">
                {invitationForProject.challenge.problem_statement}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              required
              placeholder="e.g. AI Flood Detection & Rapid Response System"
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Project Summary / Research Scope (Optional)
            </label>
            <textarea
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
