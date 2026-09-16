import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  BrainCircuit,
  Building2,
  Clock,
  GraduationCap,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { InstitutionProfileDialog } from "@/components/institutions/institution-profile-dialog";
import { ActivityTab } from "@/components/innovation/problem-control-center/activity/activity-tab";
import { ChallengeSummarySection } from "@/components/innovation/problem-control-center/challenge/challenge-summary-section";
import { ProblemFormulationSection } from "@/components/innovation/problem-control-center/formulation/problem-formulation-section";
import { ProblemOverviewSection } from "@/components/innovation/problem-control-center/overview/problem-overview-section";
import { ProblemHeader } from "@/components/innovation/problem-control-center/problem-header";
import { RecommendationEngine } from "@/components/innovation/problem-control-center/recommendation/recommendation-engine";
import { ExistingSolutionMatcher } from "@/components/knowledge/existing-solution-matcher";
import { UniversityCollaborations } from "@/components/innovation/problem-control-center/universities/university-collaborations";
import type { UniversityWorkspaceTab } from "@/components/innovation/problem-control-center/workspace/university-workspace";
import {
  fetchProblemControlCenterData,
  type InstitutionLifecycleTrack,
  type ProblemControlCenterData,
} from "@/lib/innovation";

export type PrimaryProblemView =
  | "overview"
  | "formulation"
  | "existing-solutions"
  | "recommendation"
  | "collaborations"
  | "activity";

export function InnovationProblemControlCenterPage() {
  const { profile } = useAppSession();
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state for view, selected university and active level-2 workspace tab
  const rawView = searchParams.get("view") as PrimaryProblemView | null;
  const selectedUniversityId = searchParams.get("university");
  const activeWorkspaceTab = (searchParams.get("tab") as UniversityWorkspaceTab) || "overview";

  // Data fetching state
  const [data, setData] = useState<ProblemControlCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const dataLoadedRef = useRef(false);

  // Modals state
  const [selectedProfileInstitution, setSelectedProfileInstitution] =
    useState<InstitutionLifecycleTrack | null>(null);
  const [inspectInstitutionId, setInspectInstitutionId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!problemId) return;

    let cancelled = false;

    async function load() {
      if (dataLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetchProblemControlCenterData(problemId!);
        if (cancelled) return;
        dataLoadedRef.current = true;
        setData(result);
      } catch (err: unknown) {
        if (!cancelled) {
          if (import.meta.env.DEV) console.error("Error loading problem control center:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load complex civic problem data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [problemId, refreshNonce]);

  // React 19 safe computed active primary tab (never calling setState in an effect)
  const activePrimaryTab: PrimaryProblemView = (() => {
    if (
      rawView &&
      ["overview", "formulation", "recommendation", "collaborations", "activity"].includes(rawView)
    ) {
      return rawView;
    }
    if (selectedUniversityId) {
      return "collaborations";
    }
    if (data && data.institutions.length > 0) {
      return "collaborations";
    }
    if (data?.challenge?.status === "APPROVED") {
      return "recommendation";
    }
    if (!data?.challenge || data.challenge.status === "DRAFT") {
      return "formulation";
    }
    return "overview";
  })();

  const handlePrimaryTabChange = (view: PrimaryProblemView) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", view);
        return next;
      },
      { replace: true }
    );
  };

  const handleOpenRecommendationEngine = () => {
    handlePrimaryTabChange("recommendation");
  };

  const handleOpenFormulation = () => {
    handlePrimaryTabChange("formulation");
  };

  const handleOpenProposalReview = (institutionId?: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", "collaborations");
        if (institutionId) {
          next.set("university", institutionId);
        }
        next.set("tab", "proposal");
        return next;
      },
      { replace: true }
    );
  };

  const handleSelectUniversity = (institutionId: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", "collaborations");
        if (institutionId) {
          next.set("university", institutionId);
        } else {
          next.set("university", "all");
          next.delete("tab");
        }
        return next;
      },
      { replace: true }
    );
  };

  const handleTabChange = (tab: UniversityWorkspaceTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", "collaborations");
        next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  const handleInspectInstitutionById = (instId: string) => {
    const existingTrack = data?.institutions.find((i) => i.institutionId === instId);
    if (existingTrack) {
      setSelectedProfileInstitution(existingTrack);
    } else {
      setInspectInstitutionId(instId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-6 w-52 bg-muted/40 rounded-lg" />
        <div className="h-44 bg-muted/30 rounded-2xl" />
        <div className="h-12 bg-muted/20 rounded-2xl" />
        <div className="h-60 bg-muted/20 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-muted/20 rounded-2xl" />
          <div className="h-48 bg-muted/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Complex Problem"
          description="Operational workspace for this complex civic problem."
          backHref="/app/innovation/problems"
          backLabel="All Complex Problems"
          tag="Problem Management"
        />
        <div className="p-6 bg-rose-50 border border-rose-300 rounded-2xl text-sm text-rose-900 space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Problem Inaccessible or Not Found</span>
          </div>
          <p>{error || "Could not locate this complex civic problem."}</p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
            >
              Retry
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void navigate("/app/innovation/problems");
              }}
            >
              Back to Complex Problems
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const {
    problem,
    challenge,
    actionRequired,
    stats,
    institutions,
    matching,
  } = data;

  const primaryTabs: {
    id: PrimaryProblemView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeVariant?: "default" | "success" | "warning";
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: BookOpen,
    },
    {
      id: "formulation",
      label: "Formulation",
      icon: Sparkles,
      badge: challenge
        ? ["APPROVED", "READY_FOR_MATCHING", "MATCHING_IN_PROGRESS", "MATCHING_COMPLETED", "INSTITUTIONS_SELECTED", "READY_FOR_INVITATION", "INVITATIONS_SENT", "OPEN_FOR_PROPOSALS", "PILOT_ACTIVE", "SOLVED"].includes(challenge.status)
          ? "Finalized"
          : "Draft"
        : "Needs Formulation",
      badgeVariant: challenge && challenge.status !== "DRAFT" ? "success" : "warning",
    },
    {
      id: "existing-solutions",
      label: "Existing Solutions",
      icon: BrainCircuit,
    },
    {
      id: "recommendation",
      label: "Recommendation Engine",
      icon: GraduationCap,
      badge: matching.matchesCount > 0 ? matching.matchesCount : undefined,
    },
    {
      id: "collaborations",
      label: "University Collaborations",
      icon: Building2,
      badge: institutions.length > 0 ? institutions.length : undefined,
      badgeVariant: "default",
    },
    {
      id: "activity",
      label: "Problem Activity",
      icon: Clock,
      badge: data.timeline.length > 0 ? data.timeline.length : undefined,
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* 1. COMPLEX PROBLEM HEADER */}
      <ProblemHeader
        problem={problem}
        challenge={challenge}
        stats={stats}
        actionRequired={actionRequired}
        matchingRunAt={matching.lastRunAt}
        refreshing={refreshing}
        onRefresh={() => setRefreshNonce((v) => v + 1)}
        onOpenRecommendationEngine={handleOpenRecommendationEngine}
        onOpenFormulation={handleOpenFormulation}
        onOpenProposalReview={handleOpenProposalReview}
      />

      {/* 2. PRIMARY LEVEL-1 TAB NAVIGATION */}
      <div className="bg-card border border-border/80 rounded-2xl p-1.5 shadow-xs">
        <nav aria-label="Problem control center tabs" className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {primaryTabs.map((tab) => {
            const isActive = activePrimaryTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handlePrimaryTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : tab.badgeVariant === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : tab.badgeVariant === "warning"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. ACTIVE TAB VIEW CONTENT */}
      {activePrimaryTab === "overview" && (
        <div className="space-y-6">
          <ProblemOverviewSection
            problem={problem}
            stats={stats}
            onPreviewImage={(url) => setPreviewImage(url)}
          />
          <ChallengeSummarySection
            challenge={challenge}
            problemId={problem.id}
            onNavigateToFormulation={handleOpenFormulation}
            onNavigateToRecommendation={handleOpenRecommendationEngine}
          />
        </div>
      )}

      {activePrimaryTab === "formulation" && (
        <div>
          <ProblemFormulationSection
            challenge={challenge}
            problem={problem}
            onRefresh={() => setRefreshNonce((v) => v + 1)}
            onNavigateToRecommendation={handleOpenRecommendationEngine}
          />
        </div>
      )}

      {activePrimaryTab === "existing-solutions" && (
        <div>
          <ExistingSolutionMatcher
            challengeId={challenge?.id || problem.id}
            challengeTitle={challenge?.title || problem.title}
            currentUserProfileId={profile?.id}
            onProceedToNewResearch={() => handlePrimaryTabChange("recommendation")}
          />
        </div>
      )}

      {activePrimaryTab === "recommendation" && (
        <div>
          <RecommendationEngine
            problem={problem}
            challenge={challenge}
            matching={matching}
            onInspectInstitutionById={handleInspectInstitutionById}
            onRefresh={() => setRefreshNonce((v) => v + 1)}
            onNavigateToCollaborations={() => handlePrimaryTabChange("collaborations")}
          />
        </div>
      )}

      {activePrimaryTab === "collaborations" && (
        <div>
          <UniversityCollaborations
            institutions={institutions}
            problem={problem}
            challenge={challenge}
            selectedInstitutionId={selectedUniversityId}
            onSelectInstitution={handleSelectUniversity}
            activeTab={activeWorkspaceTab}
            onTabChange={handleTabChange}
            onInspectProfile={(track) => setSelectedProfileInstitution(track)}
            onOpenRecommendationEngine={handleOpenRecommendationEngine}
          />
        </div>
      )}

      {activePrimaryTab === "activity" && (
        <div>
          <ActivityTab timeline={data.timeline} />
        </div>
      )}

      {/* 4. REUSABLE INSTITUTION PROFILE DIALOG */}
      <InstitutionProfileDialog
        institutionId={
          selectedProfileInstitution?.institutionId || inspectInstitutionId || null
        }
        isOpen={Boolean(selectedProfileInstitution || inspectInstitutionId)}
        onClose={() => {
          setSelectedProfileInstitution(null);
          setInspectInstitutionId(null);
        }}
        contextualProblem={
          selectedProfileInstitution
            ? {
                problemId: data.issue.id,
                problemTitle: data.issue.title,
                invitationStatus: selectedProfileInstitution.invitationStatus,
                projectId: selectedProfileInstitution.projectId,
                projectTitle: selectedProfileInstitution.projectTitle,
                projectStatus: selectedProfileInstitution.projectStatus,
                projectLeadName: selectedProfileInstitution.projectLeadName,
                projectLeadEmail: selectedProfileInstitution.projectLeadEmail,
                teamMembersCount: selectedProfileInstitution.teamMembersCount,
                teamMembers: selectedProfileInstitution.teamMembers,
                proposalId: selectedProfileInstitution.proposalId,
                proposalVersion: selectedProfileInstitution.proposalVersion,
                proposalStatus: selectedProfileInstitution.proposalStatus,
                proposalSubmittedAt: selectedProfileInstitution.proposalSubmittedAt,
              }
            : undefined
        }
      />

      {/* 5. EVIDENCE LIGHTBOX DIALOG */}
      {previewImage && (
        <Dialog
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          maxWidth="xl"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-black">
            <img
              src={previewImage}
              alt="Enlarged citizen evidence"
              className="w-full h-full object-contain"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 h-8 w-8 text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
