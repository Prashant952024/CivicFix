import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Crown,
  FileEdit,
  Flame,
  FlaskConical,
  Layers,
  LayoutGrid,
  List,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchInstitutionById,
  getVerificationStatusBadge,
} from "@/lib/institutions";
import {
  fetchInstitutionChallengeProjects,
  type ChallengeProjectWithDetails,
} from "@/lib/projects";
import { supabase } from "@/lib/supabase";
import type {
  InstitutionRow,
  ResearchProposalRow,
  ResearchProjectMilestoneRow,
  ResearchBlockerRiskRow,
  PilotPlanRow,
  DeploymentPlanRow,
} from "@/types/database";

export interface ProjectAttentionItem {
  projectId: string;
  projectTitle: string;
  issueType: "BLOCKER" | "RISK" | "MILESTONE" | "PROPOSAL" | "PILOT" | "DEPLOYMENT";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  description: string;
  researchStage: string;
}

export function UniversityProjectsPortfolioPage() {
  const { profile } = useAppSession();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [projects, setProjects] = useState<ChallengeProjectWithDetails[]>([]);
  const [proposals, setProposals] = useState<ResearchProposalRow[]>([]);
  const [milestones, setMilestones] = useState<ResearchProjectMilestoneRow[]>([]);
  const [blockersRisks, setBlockersRisks] = useState<ResearchBlockerRiskRow[]>([]);
  const [pilotPlans, setPilotPlans] = useState<PilotPlanRow[]>([]);
  const [deploymentPlans, setDeploymentPlans] = useState<DeploymentPlanRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Search, filter, sorting, view mode
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [healthFilter, setHealthFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"UPDATED" | "NEWEST" | "OLDEST" | "TITLE" | "PROGRESS">("UPDATED");
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolioData() {
      setLoading(true);
      setError(null);

      try {
        let instId = profile?.institution_id;

        // If user is institution role but institution_id is missing, find first linked membership
        if (!instId && profile?.id) {
          const { data: memberRecord } = await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          if (memberRecord?.institution_id) {
            instId = memberRecord.institution_id;
          }
        }

        // Fallback for development/demo viewing if no institution linked: pick premier institution
        if (!instId) {
          const { data: fallbackInst } = await supabase
            .from("institutions")
            .select("id")
            .eq("name", "IIT Bombay")
            .maybeSingle();

          if (fallbackInst) {
            instId = fallbackInst.id;
          }
        }

        if (!instId) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Parallel initial queries
        const [instData, projectsData, proposalsRes, pilotsRes, deploymentsRes] =
          await Promise.all([
            fetchInstitutionById(instId),
            fetchInstitutionChallengeProjects(instId).catch((err) => {
              console.warn("Could not fetch institution projects:", err);
              return [] as ChallengeProjectWithDetails[];
            }),
            supabase
              .from("research_proposals")
              .select("*")
              .eq("institution_id", instId)
              .order("updated_at", { ascending: false }),
            supabase
              .from("pilot_plans")
              .select("*")
              .eq("institution_id", instId)
              .order("updated_at", { ascending: false }),
            supabase
              .from("deployment_plans")
              .select("*")
              .eq("institution_id", instId)
              .order("updated_at", { ascending: false }),
          ]);

        if (cancelled) return;

        setInstitution(instData);
        setProjects(projectsData);
        setProposals(proposalsRes.data ?? []);
        setPilotPlans(pilotsRes.data ?? []);
        setDeploymentPlans(deploymentsRes.data ?? []);

        // Query project-dependent records if projects exist
        const projectIds = projectsData.map((p) => p.id);
        if (projectIds.length > 0) {
          const [milestonesRes, blockersRes] = await Promise.all([
            supabase
              .from("research_project_milestones")
              .select("*")
              .in("project_id", projectIds)
              .order("sequence_order", { ascending: true }),
            supabase
              .from("research_blockers_risks")
              .select("*")
              .in("project_id", projectIds)
              .order("created_at", { ascending: false }),
          ]);

          if (!cancelled) {
            setMilestones(milestonesRes.data ?? []);
            setBlockersRisks(blockersRes.data ?? []);
          }
        } else {
          if (!cancelled) {
            setMilestones([]);
            setBlockersRisks([]);
          }
        }

        setLastRefreshed(new Date().toLocaleTimeString());
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load portfolio data:", err);
          setError(err instanceof Error ? err.message : "Failed to load project portfolio.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPortfolioData();

    return () => {
      cancelled = true;
    };
  }, [profile?.institution_id, profile?.id, refreshNonce]);

  // Derived health & issues calculation per project
  const projectHealthMap = useMemo(() => {
    const map = new Map<
      string,
      {
        needsAttention: boolean;
        blockersCount: number;
        risksCount: number;
        criticalRisksCount: number;
        overdueMilestonesCount: number;
        hasProposalRevision: boolean;
        currentProposal?: ResearchProposalRow;
        completedMilestones: number;
        totalMilestones: number;
        progressPct: number;
      }
    >();

    const nowStr = new Date().toISOString();

    projects.forEach((proj) => {
      const projMilestones = milestones.filter((m) => m.project_id === proj.id);
      const totalMilestones = projMilestones.length;
      const completedMilestones = projMilestones.filter((m) => m.status === "COMPLETED").length;
      const progressPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

      const projBlockers = blockersRisks.filter(
        (b) => b.project_id === proj.id && (b.status === "OPEN" || b.status === "IN_PROGRESS") && b.item_type === "BLOCKER"
      );
      const projRisks = blockersRisks.filter(
        (r) => b_isRisk(r) && r.project_id === proj.id && (r.status === "OPEN" || r.status === "IN_PROGRESS")
      );
      const projCriticalRisks = projRisks.filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH");

      const overdueMilestones = projMilestones.filter((m) => {
        const isOverdue = m.status === "IN_PROGRESS" && m.planned_completion_date && m.planned_completion_date < nowStr;
        return m.status === "BLOCKED" || m.status === "DELAYED" || isOverdue;
      });

      const currentProposal = proposals.find((p) => p.project_id === proj.id && p.is_current);
      const hasProposalRevision = currentProposal?.status === "REQUESTED_REVISION";

      const needsAttention =
        projBlockers.length > 0 ||
        projCriticalRisks.length > 0 ||
        overdueMilestones.length > 0 ||
        hasProposalRevision;

      map.set(proj.id, {
        needsAttention,
        blockersCount: projBlockers.length,
        risksCount: projRisks.length,
        criticalRisksCount: projCriticalRisks.length,
        overdueMilestonesCount: overdueMilestones.length,
        hasProposalRevision,
        currentProposal,
        completedMilestones,
        totalMilestones,
        progressPct,
      });
    });

    return map;
  }, [projects, milestones, blockersRisks, proposals]);

  function b_isRisk(item: ResearchBlockerRiskRow) {
    return item.item_type === "RISK";
  }

  // Attention Queue items across the portfolio
  const portfolioAttentionItems = useMemo(() => {
    const items: ProjectAttentionItem[] = [];

    projects.forEach((proj) => {
      const health = projectHealthMap.get(proj.id);
      if (!health) return;

      if (health.hasProposalRevision) {
        items.push({
          projectId: proj.id,
          projectTitle: proj.project_title,
          issueType: "PROPOSAL",
          severity: "CRITICAL",
          title: `Proposal Revision Requested`,
          description: `Municipal innovation reviewer requested revisions on the active proposal.`,
          researchStage: proj.research_stage,
        });
      }

      if (health.blockersCount > 0) {
        items.push({
          projectId: proj.id,
          projectTitle: proj.project_title,
          issueType: "BLOCKER",
          severity: "CRITICAL",
          title: `${health.blockersCount} Open Execution Blocker${health.blockersCount > 1 ? "s" : ""}`,
          description: `Technical or resource constraint reported by research team.`,
          researchStage: proj.research_stage,
        });
      }

      if (health.criticalRisksCount > 0) {
        items.push({
          projectId: proj.id,
          projectTitle: proj.project_title,
          issueType: "RISK",
          severity: "HIGH",
          title: `${health.criticalRisksCount} High/Critical Risk${health.criticalRisksCount > 1 ? "s" : ""}`,
          description: `High severity project risk requiring faculty mitigation.`,
          researchStage: proj.research_stage,
        });
      }

      if (health.overdueMilestonesCount > 0) {
        items.push({
          projectId: proj.id,
          projectTitle: proj.project_title,
          issueType: "MILESTONE",
          severity: "MEDIUM",
          title: `${health.overdueMilestonesCount} Delayed / Overdue Milestone${health.overdueMilestonesCount > 1 ? "s" : ""}`,
          description: `Milestone schedule requires review and timeline update.`,
          researchStage: proj.research_stage,
        });
      }

      // Pilot revisions
      const projPilots = pilotPlans.filter(
        (p) => p.project_id === proj.id && p.status === "REQUESTED_REVISION"
      );
      projPilots.forEach((pilot) => {
        items.push({
          projectId: proj.id,
          projectTitle: proj.project_title,
          issueType: "PILOT",
          severity: "HIGH",
          title: `Pilot Protocol Revision: ${pilot.title}`,
          description: pilot.revision_feedback || `Pilot methodology revisions requested by city.`,
          researchStage: proj.research_stage,
        });
      });

      // Deployment revisions
      const projDeployments = deploymentPlans.filter(
        (d) => d.project_id === proj.id && (d.status === "REVISION_REQUESTED" || d.status === "REQUESTED_REVISION")
      );
      projDeployments.forEach((deploy) => {
        items.push({
          projectId: proj.id,
          projectTitle: proj.project_title,
          issueType: "DEPLOYMENT",
          severity: "HIGH",
          title: `Deployment Plan Revision: ${deploy.title}`,
          description: `Municipal scaling blueprint requires adjustments.`,
          researchStage: proj.research_stage,
        });
      });
    });

    return items;
  }, [projects, projectHealthMap, pilotPlans, deploymentPlans]);

  // Dynamic distinct categories in current portfolio
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.challenge?.category) {
        set.add(p.challenge.category);
      }
    });
    return Array.from(set).sort();
  }, [projects]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((proj) => {
        // Search filter
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = proj.project_title.toLowerCase().includes(q);
          const matchSummary = proj.project_summary?.toLowerCase().includes(q) ?? false;
          const matchChallenge = proj.challenge.title.toLowerCase().includes(q);
          const matchProblem = proj.challenge.problem_statement.toLowerCase().includes(q);
          const matchCategory = proj.challenge.category.toLowerCase().includes(q);
          const matchLead = proj.project_lead?.full_name.toLowerCase().includes(q) ?? false;
          if (!matchTitle && !matchSummary && !matchChallenge && !matchProblem && !matchCategory && !matchLead) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== "ALL" && proj.status !== statusFilter) {
          return false;
        }

        // Stage filter
        if (stageFilter !== "ALL") {
          if (stageFilter === "RESEARCH" && !["RESEARCH_STARTED", "PROTOTYPE_DEVELOPMENT", "PROTOTYPE_COMPLETED", "TESTING"].includes(proj.research_stage)) {
            return false;
          }
          if (stageFilter === "PILOT" && !["PILOT_READY", "PILOT_ACTIVE", "VALIDATION"].includes(proj.research_stage)) {
            return false;
          }
          if (stageFilter === "DEPLOYMENT" && !["DEPLOYMENT_READY", "DEPLOYMENT_ACTIVE", "IMPACT_MONITORING"].includes(proj.research_stage)) {
            return false;
          }
          if (stageFilter === "COMPLETED" && proj.research_stage !== "COMPLETED") {
            return false;
          }
        }

        // Category filter
        if (categoryFilter !== "ALL" && proj.challenge.category !== categoryFilter) {
          return false;
        }

        // Health filter
        if (healthFilter !== "ALL") {
          const health = projectHealthMap.get(proj.id);
          if (healthFilter === "ATTENTION" && !health?.needsAttention) {
            return false;
          }
          if (healthFilter === "ON_TRACK" && health?.needsAttention) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "NEWEST") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "OLDEST") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "TITLE") {
          return a.project_title.localeCompare(b.project_title);
        }
        if (sortBy === "PROGRESS") {
          const pA = projectHealthMap.get(a.id)?.progressPct || 0;
          const pB = projectHealthMap.get(b.id)?.progressPct || 0;
          return pB - pA;
        }
        // Default: UPDATED
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [projects, searchQuery, statusFilter, stageFilter, categoryFilter, healthFilter, sortBy, projectHealthMap]);

  // Overall Portfolio Metric Counts
  const totalProjectsCount = projects.length;
  const activeWorkspacesCount = projects.filter((p) => p.status === "ACTIVE" || p.status === "FORMING_TEAM").length;
  const researchStageCount = projects.filter((p) =>
    ["RESEARCH_STARTED", "PROTOTYPE_DEVELOPMENT", "PROTOTYPE_COMPLETED", "TESTING"].includes(p.research_stage)
  ).length;
  const pilotStageCount = projects.filter((p) =>
    ["PILOT_READY", "PILOT_ACTIVE", "VALIDATION"].includes(p.research_stage)
  ).length;
  const deploymentStageCount = projects.filter((p) =>
    ["DEPLOYMENT_READY", "DEPLOYMENT_ACTIVE", "IMPACT_MONITORING"].includes(p.research_stage)
  ).length;
  const attentionCount = projects.filter((p) => projectHealthMap.get(p.id)?.needsAttention).length;

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "ALL" ||
    stageFilter !== "ALL" ||
    healthFilter !== "ALL" ||
    categoryFilter !== "ALL";

  function clearAllFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setStageFilter("ALL");
    setHealthFilter("ALL");
    setCategoryFilter("ALL");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse border border-border/60 bg-muted/20" />
          ))}
        </div>
        <div className="h-12 w-full animate-pulse rounded-lg bg-muted/30" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-56 animate-pulse border border-border/60 bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          tag="University Portal"
          title="Institutional Research Projects"
          description="Portfolio overview"
          backHref="/app/university"
          backLabel="University Dashboard"
        />
        <Card className="border border-rose-300 bg-rose-50/30 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/20">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600 dark:text-rose-400" />
          <h3 className="mt-3 text-base font-bold text-foreground">Failed to Load Project Portfolio</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => setRefreshNonce((v) => v + 1)}
            variant="outline"
            className="mt-4 gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const statusBadge = institution
    ? getVerificationStatusBadge(institution.verification_status)
    : { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200" };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Context */}
      <PageHeader
        tag="University Portal"
        title="Institutional Research Projects"
        description="View and monitor all CivicFix research projects associated with your institution."
        variant="research"
        backHref="/app/university"
        backLabel="University Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="border-border text-foreground hover:bg-surface-elevated text-xs font-semibold gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
              <span className="text-[10px] text-muted-foreground font-normal">({lastRefreshed})</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void navigate("/app/university/challenges");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs text-xs font-semibold gap-1.5"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Explore Opportunities</span>
            </Button>
          </div>
        }
      >
        {institution && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sky-200/40 dark:border-sky-800/40 pt-3 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{institution.official_name || institution.name}</span>
            <span>·</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-semibold ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
            {institution.nirf_rank && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.2 text-[10px] font-medium text-amber-800">
                NIRF #{institution.nirf_rank}
              </span>
            )}
            <span>·</span>
            <span>{totalProjectsCount} Total Research Projects Cataloged</span>
          </div>
        )}
      </PageHeader>

      {/* 2. Portfolio Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border border-border/80 bg-surface/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Projects
            </CardTitle>
            <BookOpen className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{totalProjectsCount}</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Workspaces
            </CardTitle>
            <Rocket className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{activeWorkspacesCount}</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {projects.filter((p) => p.status === "FORMING_TEAM").length} forming team
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Research &amp; Prototype
            </CardTitle>
            <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{researchStageCount}</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Lab &amp; build phase
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pilot &amp; Validation
            </CardTitle>
            <FlaskConical className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{pilotStageCount}</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Field tests in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Deployment &amp; Scale
            </CardTitle>
            <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{deploymentStageCount}</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              City scaling rollout
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Needs Attention
            </CardTitle>
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{attentionCount}</span>
              {attentionCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Issues
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Blockers / revisions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Portfolio Attention Queue */}
      {portfolioAttentionItems.length > 0 && (
        <Card className="border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Portfolio Attention Queue ({portfolioAttentionItems.length})
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Actionable execution blockers, overdue milestones &amp; proposal revisions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {portfolioAttentionItems.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border/70 bg-surface shadow-2xs flex flex-col justify-between space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        item.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300"
                          : item.severity === "HIGH"
                          ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300"
                      }`}
                    >
                      {item.issueType}
                    </span>
                    <Badge variant="outline" size="sm" className="text-[9px]">
                      {item.researchStage.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <h5 className="text-xs font-bold text-foreground line-clamp-1">
                    {item.projectTitle}
                  </h5>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {item.title} — {item.description}
                  </p>
                </div>

                <div className="flex justify-end pt-1 border-t border-border/60">
                  <Link to={`/app/university/projects/${item.projectId}`}>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] font-semibold gap-1">
                      <span>Open Workspace</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Search + Multi-Dimensional Filters Toolbar */}
      <Card className="border border-border/80 bg-surface/90 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project title, challenge, category, or lead..."
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Mode & Sort Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-lg border border-border/80 bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                  viewMode === "CARDS"
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Cards view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                  viewMode === "TABLE"
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Table view"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
              aria-label="Sort projects"
            >
              <option value="UPDATED">Recently Updated</option>
              <option value="NEWEST">Newest Created</option>
              <option value="OLDEST">Oldest Created</option>
              <option value="TITLE">Title (A–Z)</option>
              <option value="PROGRESS">Milestone Progress (% High)</option>
            </select>
          </div>
        </div>

        {/* Filter Dropdowns Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground font-medium focus:outline-hidden"
            aria-label="Filter by project status"
          >
            <option value="ALL">All Statuses ({projects.length})</option>
            <option value="ACTIVE">Active ({projects.filter((p) => p.status === "ACTIVE").length})</option>
            <option value="FORMING_TEAM">Forming Team ({projects.filter((p) => p.status === "FORMING_TEAM").length})</option>
            <option value="PAUSED">Paused ({projects.filter((p) => p.status === "PAUSED").length})</option>
            <option value="COMPLETED">Completed ({projects.filter((p) => p.status === "COMPLETED").length})</option>
          </select>

          {/* Research Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground font-medium focus:outline-hidden"
            aria-label="Filter by research stage"
          >
            <option value="ALL">All Research Stages</option>
            <option value="RESEARCH">Research &amp; Prototype ({researchStageCount})</option>
            <option value="PILOT">Pilot &amp; Validation ({pilotStageCount})</option>
            <option value="DEPLOYMENT">Deployment &amp; Impact ({deploymentStageCount})</option>
            <option value="COMPLETED">Completed Stage ({projects.filter((p) => p.research_stage === "COMPLETED").length})</option>
          </select>

          {/* Health Filter */}
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground font-medium focus:outline-hidden"
            aria-label="Filter by project health"
          >
            <option value="ALL">All Health States</option>
            <option value="ATTENTION">Needs Attention ({attentionCount})</option>
            <option value="ON_TRACK">On Track ({projects.length - attentionCount})</option>
          </select>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground font-medium focus:outline-hidden"
              aria-label="Filter by challenge category"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 gap-1 ml-auto"
            >
              <X className="h-3 w-3" />
              <span>Clear Filters</span>
            </Button>
          )}
        </div>
      </Card>

      {/* 5. Project Portfolio (Cards View / Table View) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredProjects.length}</strong> of{" "}
            {totalProjectsCount} projects
          </span>
          {hasActiveFilters && (
            <span className="text-primary font-medium">Filtered Results</span>
          )}
        </div>

        {filteredProjects.length === 0 ? (
          <Card className="border border-border/80 bg-surface/90 p-8 text-center">
            {hasActiveFilters ? (
              <div className="space-y-3">
                <p className="text-sm font-bold text-foreground">No projects match your filter criteria</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting search keywords or resetting status, stage, or health filters.
                </p>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No research projects yet"
                description="When your institution accepts municipal challenge invitations or submits accepted proposals, active research project workspaces will appear here."
              />
            )}
          </Card>
        ) : viewMode === "CARDS" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((proj) => {
              const health = projectHealthMap.get(proj.id);
              const proposal = health?.currentProposal;
              const hasAttention = health?.needsAttention;

              return (
                <Card
                  key={proj.id}
                  className={`border transition-all flex flex-col justify-between shadow-xs ${
                    hasAttention
                      ? "border-amber-300/80 dark:border-amber-800/80 bg-surface/95 hover:border-amber-400"
                      : "border-border/80 bg-surface/90 hover:border-primary/40"
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">
                        {proj.challenge.category.replace(/_/g, " ")}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {hasAttention ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Needs Attention
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            On Track
                          </span>
                        )}
                        <Badge
                          variant={
                            proj.status === "ACTIVE"
                              ? "emerald"
                              : proj.status === "FORMING_TEAM"
                              ? "sky"
                              : proj.status === "PAUSED"
                              ? "amber"
                              : "default"
                          }
                          size="sm"
                          className="text-[9px]"
                        >
                          {proj.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>

                    <Link to={`/app/university/projects/${proj.id}`} className="block group">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mt-2 line-clamp-1">
                        {proj.project_title}
                      </h4>
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {proj.project_summary || proj.challenge.problem_statement}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3 p-4 pt-0">
                    {/* Research Stage Badge */}
                    <div className="p-2 rounded-md bg-muted/30 border border-border/60 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Stage:</span>
                      <Badge variant="indigo" size="sm" className="text-[10px]">
                        {proj.research_stage.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Milestones Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>Milestones</span>
                        <span>
                          {health?.completedMilestones || 0} / {health?.totalMilestones || 0} Completed ({health?.progressPct || 0}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${health?.progressPct || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Lead, Members & Issues Status */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 text-foreground/90 font-medium">
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
                        <span className="truncate text-[11px]">
                          {proj.project_lead?.full_name || "Lead Unassigned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {health && (health.blockersCount > 0 || health.criticalRisksCount > 0) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-300 font-bold text-[10px]">
                            <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                            {health.blockersCount + health.criticalRisksCount} Issues
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 font-semibold text-[11px] shrink-0">
                          <Users className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>{proj.members_count || 1}</span>
                        </span>
                      </div>
                    </div>

                    {/* Proposal Status Tag */}
                    {proposal && (
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>Proposal Status:</span>
                        <span
                          className={`font-semibold ${
                            proposal.status === "APPROVED"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : proposal.status === "REQUESTED_REVISION"
                              ? "text-rose-700 dark:text-rose-400"
                              : "text-sky-700 dark:text-sky-400"
                          }`}
                        >
                          v{proposal.version_number} · {proposal.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link to={`/app/university/projects/${proj.id}/proposal`}>
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-8 gap-1">
                          <FileEdit className="w-3 h-3 text-sky-600" />
                          <span>Proposal</span>
                        </Button>
                      </Link>
                      <Link to={`/app/university/projects/${proj.id}`}>
                        <Button size="sm" className="w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-8 gap-1">
                          <Rocket className="w-3 h-3" />
                          <span>Workspace</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Card className="border border-border/80 bg-surface/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3 pl-4">Project &amp; Challenge</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Research Stage</th>
                    <th className="p-3">Project Lead &amp; Team</th>
                    <th className="p-3">Milestone Progress</th>
                    <th className="p-3">Health &amp; Issues</th>
                    <th className="p-3">Proposal</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  {filteredProjects.map((proj) => {
                    const health = projectHealthMap.get(proj.id);
                    const proposal = health?.currentProposal;
                    const hasAttention = health?.needsAttention;

                    return (
                      <tr key={proj.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 pl-4 max-w-xs">
                          <Link
                            to={`/app/university/projects/${proj.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors block line-clamp-1"
                          >
                            {proj.project_title}
                          </Link>
                          <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {proj.challenge.title}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              proj.status === "ACTIVE"
                                ? "emerald"
                                : proj.status === "FORMING_TEAM"
                                ? "sky"
                                : proj.status === "PAUSED"
                                ? "amber"
                                : "default"
                            }
                            size="sm"
                            className="text-[9px]"
                          >
                            {proj.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="indigo" size="sm" className="text-[9px]">
                            {proj.research_stage.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-[11px]">
                            {proj.project_lead?.full_name || "Unassigned"}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {proj.members_count || 1} team members
                          </span>
                        </td>
                        <td className="p-3 min-w-[130px]">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{health?.completedMilestones || 0}/{health?.totalMilestones || 0}</span>
                            <span>{health?.progressPct || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${health?.progressPct || 0}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          {hasAttention ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Needs Attention
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              On Track
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px]">
                          {proposal ? (
                            <span
                              className={`font-semibold ${
                                proposal.status === "APPROVED"
                                  ? "text-emerald-700"
                                  : proposal.status === "REQUESTED_REVISION"
                                  ? "text-rose-700"
                                  : "text-sky-700"
                              }`}
                            >
                              v{proposal.version_number} ({proposal.status.replace(/_/g, " ")})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to={`/app/university/projects/${proj.id}/proposal`}>
                              <Button variant="outline" size="sm" className="h-7 text-[10px] font-semibold">
                                Proposal
                              </Button>
                            </Link>
                            <Link to={`/app/university/projects/${proj.id}`}>
                              <Button size="sm" className="h-7 text-[10px] font-bold bg-primary text-primary-foreground">
                                Workspace
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
