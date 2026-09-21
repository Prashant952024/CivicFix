import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Lightbulb,
  MapPin,
  Maximize2,
  Megaphone,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
  TrendingUp,
  Globe,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { InstitutionProfileDialog } from "@/components/institutions/institution-profile-dialog";
import { ActivityTab } from "@/components/innovation/problem-control-center/activity/activity-tab";
import { ProblemFormulationSection } from "@/components/innovation/problem-control-center/formulation/problem-formulation-section";
import { RecommendationEngine } from "@/components/innovation/problem-control-center/recommendation/recommendation-engine";
import { ExistingSolutionMatcher } from "@/components/knowledge/existing-solution-matcher";
import { UniversityCollaborations } from "@/components/innovation/problem-control-center/universities/university-collaborations";
import type { UniversityWorkspaceTab } from "@/components/innovation/problem-control-center/workspace/university-workspace";
import { formatCitizenIssueImageUrl } from "@/lib/citizen-issues";
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

const CANONICAL_STAGE_STEPS = [
  { step: 1, key: "CLASSIFIED", label: "1. Classified Complex" },
  { step: 2, key: "CHALLENGE_FORMULATED", label: "2. Challenge Formulated" },
  { step: 3, key: "MATCHING", label: "3. Matching Active" },
  { step: 4, key: "INSTITUTIONS_SELECTED", label: "4. Institutions Selected" },
  { step: 5, key: "OUTREACH", label: "5. Invitations Sent" },
  { step: 6, key: "INSTITUTION_ACCEPTED", label: "6. Institution Accepted" },
  { step: 7, key: "PROJECT_CREATED", label: "7. Project Created" },
  { step: 8, key: "TEAM_FORMATION", label: "8. Team Formed" },
  { step: 9, key: "RESEARCH_PROPOSAL", label: "9. Proposal Underway" },
  { step: 10, key: "PROPOSAL_APPROVED", label: "10. Proposal Approved" },
];

export function InnovationProblemControlCenterPage() {
  const { profile, roleCode } = useAppSession();
  const isAdmin = roleCode === "ADMIN";
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

  // React 19 safe computed active primary tab
  const activePrimaryTab: PrimaryProblemView = useMemo(() => {
    if (
      rawView &&
      ["overview", "formulation", "existing-solutions", "recommendation", "collaborations", "activity"].includes(
        rawView
      )
    ) {
      return rawView;
    }
    if (selectedUniversityId) {
      return "collaborations";
    }
    return "overview";
  }, [rawView, selectedUniversityId]);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted/25 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 bg-muted/20 rounded-2xl" />
          <div className="lg:col-span-4 h-80 bg-muted/20 rounded-2xl" />
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
        <div className="p-6 bg-destructive/10 border border-destructive/25 rounded-2xl text-xs text-destructive space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <span>Problem Inaccessible or Not Found</span>
          </div>
          <p>{error || "Could not locate this complex civic problem."}</p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="text-xs rounded-xl"
            >
              Retry
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void navigate("/app/innovation/problems");
              }}
              className="text-xs rounded-xl"
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
    issue,
    challenge,
    actionRequired,
    stats,
    institutions,
    matching,
    currentPipelineStage,
    timeline,
  } = data;

  const currentStep = currentPipelineStage.stepNumber || 1;

  // Authoritative operational blockers (proposals requiring revision, rejected proposals, or declined outreach)
  const blockersList = institutions.filter((inst) => {
    return (
      inst.proposalStatus === "REQUESTED_REVISION" ||
      inst.proposalStatus === "REJECTED" ||
      inst.invitationStatus === "DECLINED"
    );
  });

  // Dynamically determine primary action
  const primaryActionConfig = (() => {
    if (!challenge) {
      return {
        label: "Formulate Challenge",
        icon: Sparkles,
        description: "Formulate technical challenge statement from citizen ground truth.",
        onClick: handleOpenFormulation,
        variant: "innovation" as const,
      };
    }
    if (challenge.status === "DRAFT") {
      return {
        label: "Finalize Challenge",
        icon: Sparkles,
        description: "Review and approve draft challenge statement.",
        onClick: handleOpenFormulation,
        variant: "innovation" as const,
      };
    }
    if (actionRequired.proposalsAwaitingReviewList.length > 0) {
      const firstProp = actionRequired.proposalsAwaitingReviewList[0];
      return {
        label: "Review University Proposal",
        icon: Megaphone,
        description: `${actionRequired.proposalsAwaitingReviewCount} research proposal awaiting review.`,
        onClick: () => handleOpenProposalReview(firstProp.institutionId),
        variant: "default" as const,
      };
    }
    if (institutions.length === 0 || matching.matchesCount === 0) {
      return {
        label: "Match Institutions",
        icon: GraduationCap,
        description: "Identify and match university research faculties.",
        onClick: handleOpenRecommendationEngine,
        variant: "innovation" as const,
      };
    }
    if (stats.proposalsApprovedCount > 0) {
      return {
        label: "View Solution Blueprint",
        icon: CheckCircle2,
        description: "Technical proposal approved and ready for pilot scaling.",
        onClick: () => handlePrimaryTabChange("collaborations"),
        variant: "outline" as const,
      };
    }
    return {
      label: "Open University Collaborations",
      icon: Building2,
      description: "Manage active research faculties and teams.",
      onClick: () => handlePrimaryTabChange("collaborations"),
      variant: "outline" as const,
    };
  })();

  const primaryTabs: {
    id: PrimaryProblemView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeVariant?: "default" | "success" | "warning";
  }[] = [
    {
      id: "overview",
      label: "Problem Control Surface",
      icon: Layers,
    },
    {
      id: "formulation",
      label: "Challenge Formulation",
      icon: Sparkles,
      badge: challenge ? (challenge.status === "APPROVED" ? "Approved" : "Draft") : "Required",
      badgeVariant: challenge?.status === "APPROVED" ? "success" : "warning",
    },
    {
      id: "existing-solutions",
      label: "Solution Matcher",
      icon: BrainCircuit,
    },
    {
      id: "recommendation",
      label: "Institution Matching",
      icon: GraduationCap,
      badge: matching.matchesCount > 0 ? matching.matchesCount : undefined,
    },
    {
      id: "collaborations",
      label: "University Collaborations",
      icon: Building2,
      badge: institutions.length > 0 ? institutions.length : undefined,
    },
    {
      id: "activity",
      label: "Timeline & Audit",
      icon: Clock,
      badge: timeline.length > 0 ? timeline.length : undefined,
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOP BREADCRUMB & UTILITY HEADER */}
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate("/app/innovation/problems")}
            className="h-8 px-2.5 text-xs text-primary font-bold hover:bg-primary/10 gap-1.5 rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Complex Problems</span>
          </Button>
          <span className="text-border">|</span>
          <nav aria-label="Breadcrumb navigation" className="flex items-center gap-1.5">
            <Link to="/app/innovation" className="hover:text-primary font-medium transition-colors">
              Innovation Hub
            </Link>
            <span>/</span>
            <Link to="/app/innovation/problems" className="hover:text-primary font-medium transition-colors">
              Complex Problems
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold max-w-[220px] sm:max-w-xs truncate">
              {problem.title}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshNonce((v) => v + 1)}
            disabled={refreshing}
            className="text-xs gap-1.5 h-8 bg-card shadow-xs rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* 2. CANONICAL PROBLEM COMMAND HERO */}
      <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-indigo-600 to-sky-600" />
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2.5 flex-1 min-w-0">
              {/* Category, Scope, Human Decision & Pipeline Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" size="sm" className="font-semibold">
                  {problem.category}
                </Badge>
                <Badge variant="research" size="sm" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {problem.geographicScope}
                </Badge>
                <Badge variant="attention" size="sm" className="font-bold gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  COMPLEX — Human Approved
                </Badge>
                <Badge variant="outline" size="sm" className="font-mono text-muted-foreground">
                  AI Advisory • Score: {stats.complexityScore}/100
                </Badge>
                {actionRequired.needsAction && (
                  <Badge variant="critical" size="sm" className="animate-pulse">
                    Action Required
                  </Badge>
                )}
              </div>

              {/* Problem Title & ID */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug break-words">
                {problem.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="font-mono text-[11px] bg-muted/40 px-2 py-0.5 rounded-md border border-border/60">
                  ID: {problem.id}
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{problem.addressText || problem.locationText || "Municipal Area"}</span>
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Reported by: {problem.reporterName || "Citizen"}</span>
                </span>
              </div>
            </div>

            {/* Dynamic Primary CTA */}
            {!isAdmin ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-1 lg:pt-0">
                <Button
                  size="sm"
                  variant={primaryActionConfig.variant}
                  onClick={primaryActionConfig.onClick}
                  className="text-xs font-bold gap-2 h-9 px-4 rounded-xl shadow-xs"
                >
                  <primaryActionConfig.icon className="w-4 h-4 shrink-0" />
                  <span>{primaryActionConfig.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0 pt-1 lg:pt-0">
                <Badge variant="outline" className="text-xs font-medium border-primary/30 bg-primary/5 text-primary py-1.5 px-3 rounded-xl gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Ecosystem Oversight (Read-Only)</span>
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. EXECUTIVE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Clustered Citizen Reports */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <span className="text-stat-label block">Citizen Reports</span>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground font-mono">
              {problem.linkedReportsCount || (problem.linkedReports?.length ? problem.linkedReports.length + 1 : 1)}
            </p>
            <span className="text-meta text-muted-foreground block truncate">
              {problem.linkedReports?.length ? `${problem.linkedReports.length} clustered` : "Single canonical"}
            </span>
          </div>
        </div>

        {/* AI Complexity Score */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <span className="text-stat-label block">AI Complexity</span>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground font-mono">
              {stats.complexityScore}/100
            </p>
            <span className="text-meta text-muted-foreground block truncate">
              {problem.complexityConfidence !== null
                ? `${Math.round(problem.complexityConfidence * 100)}% confidence`
                : "High confidence"}
            </span>
          </div>
        </div>

        {/* Participating Institutions */}
        <div
          onClick={() => handlePrimaryTabChange("collaborations")}
          className="p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
        >
          <span className="text-stat-label block">Institutions</span>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground font-mono">
              {stats.institutionsAcceptedCount}
            </p>
            <span className="text-meta text-muted-foreground block truncate">
              {stats.institutionsSelectedCount} matched / invited
            </span>
          </div>
        </div>

        {/* Active Projects & Teams */}
        <div
          onClick={() => handlePrimaryTabChange("collaborations")}
          className="p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
        >
          <span className="text-stat-label block">Active Projects</span>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground font-mono">
              {stats.projectsActiveCount}
            </p>
            <span className="text-meta text-muted-foreground block truncate">
              {stats.teamsFormedCount} staffed teams
            </span>
          </div>
        </div>

        {/* Research Proposals */}
        <div
          onClick={() => handlePrimaryTabChange("collaborations")}
          className="p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/20 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
        >
          <span className="text-stat-label block">Proposals</span>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground font-mono">
              {stats.proposalsApprovedCount > 0 ? `${stats.proposalsApprovedCount} Approved` : stats.proposalsCount}
            </p>
            <span className="text-meta text-muted-foreground block truncate">
              {stats.proposalsAwaitingReviewCount > 0
                ? `${stats.proposalsAwaitingReviewCount} await review`
                : "All reviewed"}
            </span>
          </div>
        </div>

        {/* Pipeline Progress Step */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <span className="text-stat-label block">Pipeline Stage</span>
          <div className="mt-2">
            <p className="text-xl font-bold text-primary font-mono">
              Step {currentStep}/10
            </p>
            <span className="text-meta text-muted-foreground block truncate font-medium">
              {currentPipelineStage.label.split("—")[0].trim()}
            </span>
          </div>
        </div>
      </div>

      {/* 4. PRIMARY NAVIGATION TABS */}
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
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
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : tab.badgeVariant === "warning"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
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

      {/* 5. ACTIVE TAB VIEW CONTENT */}
      {activePrimaryTab === "overview" && (
        <div className="space-y-6">
          {/* A. GOVERNANCE & ACTION ATTENTION CENTER */}
          {actionRequired.needsAction ? (
            <Card className="border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-card to-card shadow-xs">
              <CardHeader className="pb-3 border-b border-amber-500/20">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Action Required: Innovation Governance Queue</span>
                    </CardTitle>
                  </div>
                  <Badge variant="critical" size="sm">
                    {actionRequired.proposalsAwaitingReviewCount > 0
                      ? `${actionRequired.proposalsAwaitingReviewCount} Proposals Awaiting Review`
                      : !challenge
                      ? "Formulation Required"
                      : "Action Required"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Proposals Awaiting Review */}
                {actionRequired.proposalsAwaitingReviewList.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                      Research Proposals Awaiting Human Review
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {actionRequired.proposalsAwaitingReviewList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-amber-300/60 bg-card flex items-center justify-between gap-3 text-xs shadow-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">
                                {item.institutionName}
                              </span>
                              <Badge variant="outline" className="text-[9px] font-mono py-0">
                                v{item.versionNumber}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.projectTitle || "Technical Research Proposal"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleOpenProposalReview(item.institutionId)}
                            className="text-xs font-bold gap-1 h-7 px-3 rounded-lg shrink-0"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Challenge Formulation Attention */}
                {!challenge && (
                  <div className="p-3.5 rounded-xl border border-amber-300/60 bg-card flex items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-bold text-foreground">
                        Innovation Challenge Statement Not Formulated
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Transform this complex citizen problem into a multi-disciplinary challenge for university researchers.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="innovation"
                      onClick={handleOpenFormulation}
                      className="text-xs font-bold gap-1 h-8 px-3 rounded-lg shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Formulate</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-3.5 rounded-2xl border border-border/80 bg-card/60 flex items-center justify-between gap-3 text-xs text-muted-foreground shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-foreground">
                  Governance On Track: No immediate actions required on this complex problem.
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                Pipeline: {currentPipelineStage.label}
              </span>
            </div>
          )}

          {/* B. 10-STEP COLLABORATION & PROPOSAL PROGRESS MAP */}
          <Card className="border-border/80 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Research Collaboration &amp; Proposal Pipeline</span>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Collaboration &amp; proposal governance track (preceding Pilot, Deployment, and Knowledge Hub)
                  </p>
                </div>
                <Badge variant="outline" size="sm" className="font-mono text-xs shrink-0">
                  Step {currentStep} of 10
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {CANONICAL_STAGE_STEPS.map((stepItem) => {
                  const isCompleted = stepItem.step < currentStep;
                  const isCurrent = stepItem.step === currentStep;
                  return (
                    <div
                      key={stepItem.key}
                      className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                        isCurrent
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : isCompleted
                          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                          : "border-border/60 bg-muted/15 text-muted-foreground opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isCurrent ? (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {stepItem.step}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold block truncate leading-tight">
                        {stepItem.label.split(".")[1]?.trim() || stepItem.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* C. 2-COLUMN GROUND TRUTH & AI ADVISORY GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT (7 cols): Ground Truth & Clustered Reports */}
            <div className="lg:col-span-7 space-y-6">
              {/* Field Grievance & Evidence */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/70">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Civic Ground Truth &amp; Field Observation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-stat-label block">Original Citizen Statement</span>
                    <div className="text-prose-body bg-muted/20 p-4 rounded-xl border border-border/70 whitespace-pre-line text-xs leading-relaxed text-foreground">
                      {problem.description}
                    </div>
                  </div>

                  {/* Evidence Gallery */}
                  {problem.images && problem.images.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-stat-label block">
                        Citizen Evidence Photos ({problem.images.length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {problem.images.map((img) => {
                          const imgUrl = formatCitizenIssueImageUrl(img);
                          if (!imgUrl) return null;
                          return (
                            <button
                              type="button"
                              key={img.id}
                              onClick={() => setPreviewImage(imgUrl)}
                              className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/80 cursor-pointer group shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label="Enlarge citizen evidence photo"
                            >
                              <img
                                src={imgUrl}
                                alt="Citizen ground evidence"
                                className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                              />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-4 h-4" aria-hidden="true" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Clustered Citizen Grievances */}
              {problem.linkedReports && problem.linkedReports.length > 0 && (
                <Card className="border-sky-300/80 bg-sky-500/5 shadow-xs">
                  <CardHeader className="pb-3 border-b border-sky-300/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="research" size="sm">
                          {problem.linkedReports.length} Clustered Reports
                        </Badge>
                        <CardTitle className="text-sm font-bold text-foreground">
                          Canonical Duplicate Reports
                        </CardTitle>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Grouped under Canonical Issue
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {problem.linkedReports.map((child, cIdx) => (
                        <div
                          key={child.id}
                          className="rounded-xl border border-sky-200/60 bg-card p-3 text-xs space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate max-w-[150px]">
                              {child.reporterName || `Citizen #${cIdx + 1}`}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #{child.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">
                            {child.description || child.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT (5 cols): AI Advisory vs Human Governance Diagnostics */}
            <div className="lg:col-span-5 space-y-6">
              {/* Human Governance Decision */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/70">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Human Governance &amp; Administrative Scope</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-stat-label block">Classification Decision</span>
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-1">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>COMPLEX (Societal / Multi-Disciplinary)</span>
                        <Badge variant="success" size="sm">
                          Approved
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Classified by: {issue.classificationDecidedBy || "Innovation Manager / Admin"}
                      </p>
                    </div>
                  </div>

                  {issue.aiRootCause && (
                    <div className="space-y-1">
                      <span className="text-stat-label block">Approved Root Cause</span>
                      <p className="text-xs text-foreground bg-muted/15 p-3 rounded-xl border border-border/60">
                        {issue.aiRootCause}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Advisory Decision Support */}
              <Card className="border-indigo-300/80 bg-indigo-500/5 shadow-xs">
                <CardHeader className="pb-3 border-b border-indigo-300/40">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-indigo-600" />
                      <span>AI Decision Support (Advisory)</span>
                    </CardTitle>
                    <Badge variant="outline" size="sm" className="text-indigo-700 dark:text-indigo-300 font-mono">
                      Score: {stats.complexityScore}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  {issue.aiComplexityReasoning && (
                    <div className="space-y-1">
                      <span className="text-stat-label block">Complexity Reasoning</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {issue.aiComplexityReasoning}
                      </p>
                    </div>
                  )}

                  {issue.aiComplexityFactors && issue.aiComplexityFactors.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-stat-label block">Identified Complexity Factors</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {issue.aiComplexityFactors.map((factor) => (
                          <Badge key={factor} variant="outline" size="sm" className="text-[10px]">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {issue.aiRequiredExpertise && issue.aiRequiredExpertise.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-stat-label block">Recommended Research Domains</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {issue.aiRequiredExpertise.map((domain) => (
                          <Badge key={domain} variant="research" size="sm" className="text-[10px]">
                            {domain}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* D. FORMULATED CHALLENGE & UNIVERSITY COLLABORATIONS SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Formulated Challenge Summary */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/70">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Formulated Innovation Challenge</span>
                    </CardTitle>
                    {challenge ? (
                      <Badge variant="success" size="sm">
                        {challenge.status}
                      </Badge>
                    ) : (
                      <Badge variant="attention" size="sm">
                        Pending Formulation
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5 text-xs">
                  {challenge ? (
                    <>
                      <div className="space-y-1">
                        <span className="text-stat-label block">Challenge Statement</span>
                        <h4 className="font-bold text-foreground text-sm leading-snug">
                          {challenge.title}
                        </h4>
                        <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                          {challenge.problemStatement}
                        </p>
                      </div>

                      {challenge.objectives && challenge.objectives.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-stat-label block">Key Objectives</span>
                          <ul className="list-disc list-inside text-muted-foreground space-y-0.5 text-xs">
                            {challenge.objectives.slice(0, 3).map((obj, i) => (
                              <li key={i} className="truncate">
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenFormulation}
                          className="text-xs font-semibold gap-1.5 h-8 rounded-xl"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Open Challenge Editor</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="Challenge Not Yet Formulated"
                      description="Create the multi-disciplinary challenge statement to enable university faculty matching."
                      action={
                        <Button
                          size="sm"
                          variant="innovation"
                          onClick={handleOpenFormulation}
                          className="text-xs font-bold gap-1.5 rounded-xl"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Formulate Challenge</span>
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* University Collaborations Summary */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/70">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      <span>Participating Universities &amp; Research Labs</span>
                    </CardTitle>
                    <Badge variant="outline" size="sm" className="font-mono">
                      {institutions.length} Engaged
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs">
                  {institutions.length > 0 ? (
                    <div className="space-y-2.5">
                      {institutions.slice(0, 3).map((inst) => (
                        <div
                          key={inst.institutionId}
                          className="p-3.5 rounded-xl border border-border/70 bg-muted/15 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">
                                {inst.institutionName}
                              </span>
                              <Badge variant="sky" size="sm" className="text-[9px] py-0">
                                {inst.invitationStatus || "Invited"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {inst.projectTitle ? `Project: ${inst.projectTitle}` : "Faculty evaluating invitation"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSelectUniversity(inst.institutionId)}
                            className="text-xs font-semibold gap-1 h-7 px-2.5 rounded-lg shrink-0 hover:bg-muted"
                          >
                            <span>Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}

                      <div className="pt-2 flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrimaryTabChange("collaborations")}
                          className="text-xs font-semibold gap-1.5 h-8 rounded-xl"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>View All ({institutions.length}) Collaborations</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No University Partners Yet"
                      description="Use the Recommendation Engine to match and invite accredited university research faculties."
                      action={
                        <Button
                          size="sm"
                          variant="innovation"
                          onClick={handleOpenRecommendationEngine}
                          className="text-xs font-bold gap-1.5 rounded-xl"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Run Recommendation Engine</span>
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* E. BLOCKERS & OPERATIONAL RISKS */}
          <Card className="border-border/80 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Blockers &amp; Operational Risks</span>
                </CardTitle>
                <Badge
                  variant={blockersList.length > 0 ? "critical" : "outline"}
                  size="sm"
                  className="font-mono"
                >
                  {blockersList.length > 0 ? `${blockersList.length} Active` : "Clear"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 text-xs">
              {blockersList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {blockersList.map((inst) => (
                    <div
                      key={inst.institutionId}
                      className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-destructive">
                        <span>{inst.institutionName}</span>
                        <Badge variant="critical" size="sm">
                          {inst.proposalStatus === "REQUESTED_REVISION"
                            ? "Revision Pending"
                            : inst.proposalStatus === "REJECTED"
                            ? "Proposal Rejected"
                            : "Outreach Declined"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {inst.proposalStatus === "REQUESTED_REVISION"
                          ? "Faculty must address feedback from Innovation Manager review."
                          : inst.proposalStatus === "REJECTED"
                          ? "Proposal rejected. Faculty may resubmit or a new partner selected."
                          : "Institution declined challenge invitation. Alternate partner required."}
                      </p>
                      <div className="pt-1 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectUniversity(inst.institutionId)}
                          className="h-6 text-[10px] px-2 rounded-lg"
                        >
                          Resolve in Workspace →
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-foreground">
                    No active blockers or operational delays reported across research teams.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* F. DOWNSTREAM LINEAGE & QUICK LAUNCH */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-stat-label flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-primary" />
                  <span>Pilot Workspace</span>
                </span>
                <p className="text-xs text-muted-foreground">
                  {stats.proposalsApprovedCount > 0
                    ? "Solution approved — Pilot planning active"
                    : "Awaiting approved proposal blueprint"}
                </p>
              </div>
              <div className="pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void navigate("/app/innovation/pilots")}
                  className="w-full text-xs font-semibold h-7 rounded-xl justify-between"
                >
                  <span>Open Pilots Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-stat-label flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Deployment &amp; Impact</span>
                </span>
                <p className="text-xs text-muted-foreground">
                  Track field rollout KPIs and citizen resolution telemetry.
                </p>
              </div>
              <div className="pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void navigate("/app/innovation/collaborations")}
                  className="w-full text-xs font-semibold h-7 rounded-xl justify-between"
                >
                  <span>Deployment Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-stat-label flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Knowledge Hub</span>
                </span>
                <p className="text-xs text-muted-foreground">
                  Explore verified municipal solutions and reuse patterns.
                </p>
              </div>
              <div className="pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void navigate("/app/innovation/knowledge")}
                  className="w-full text-xs font-semibold h-7 rounded-xl justify-between"
                >
                  <span>Knowledge Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-WORKSPACES / TABS */}
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
          <ActivityTab timeline={timeline} />
        </div>
      )}

      {/* 7. REUSABLE INSTITUTION PROFILE DIALOG */}
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

      {/* 8. EVIDENCE LIGHTBOX DIALOG */}
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
