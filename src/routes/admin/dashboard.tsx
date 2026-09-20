import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flame,
  FlaskConical,
  GraduationCap,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatAdminDateTime,
  getAdminInitials,
  getAdminIssueStatusTone,
  getAdminPriorityTone,
  getAdminRoleTone,
} from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & {
  role?: Pick<Database["public"]["Tables"]["roles"]["Row"], "code" | "name"> | null;
  department?: Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active"> | null;
  institution?: Pick<Database["public"]["Tables"]["institutions"]["Row"], "id" | "name"> | null;
  organization?: Pick<Database["public"]["Tables"]["industry_organizations"]["Row"], "id" | "name"> | null;
};

type IssueRow = Database["public"]["Tables"]["issues"]["Row"] & {
  department_assignments?: Array<{
    id: string;
    department_id: string;
    status: string;
    department?: { id: string; name: string } | null;
  }> | null;
};

type HistoryRow = Database["public"]["Tables"]["issue_status_history"]["Row"] & {
  issue?: Pick<Database["public"]["Tables"]["issues"]["Row"], "id" | "title" | "category"> | null;
  changed_by_profile?: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email"> | null;
};

type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
type InstitutionRow = Database["public"]["Tables"]["institutions"]["Row"];
type IndustryOrgRow = Database["public"]["Tables"]["industry_organizations"]["Row"];
type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];
type ProjectRow = Database["public"]["Tables"]["challenge_projects"]["Row"];
type ProposalRow = Database["public"]["Tables"]["research_proposals"]["Row"];
type PilotPlanRow = Database["public"]["Tables"]["pilot_plans"]["Row"];
type DeploymentPlanRow = Database["public"]["Tables"]["deployment_plans"]["Row"];
type BlockerRiskRow = Database["public"]["Tables"]["research_blockers_risks"]["Row"];

export interface AdminAttentionItem {
  id: string;
  category: "SECURITY" | "VERIFICATION" | "AI_ANOMALY" | "CIVIC_URGENT" | "INNOVATION" | "DATA_INTEGRITY";
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  subtitle: string;
  source: string;
  actionLabel: string;
  actionHref: string;
  timestamp?: string;
}

type AdminDashboardState = {
  profiles: ProfileRow[];
  issues: IssueRow[];
  activities: HistoryRow[];
  departments: DepartmentRow[];
  institutions: InstitutionRow[];
  industryOrgs: IndustryOrgRow[];
  challenges: ChallengeRow[];
  projects: ProjectRow[];
  proposals: ProposalRow[];
  pilotPlans: PilotPlanRow[];
  deploymentPlans: DeploymentPlanRow[];
  blockers: BlockerRiskRow[];
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AdminDashboardPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const navigate = useNavigate();

  const [state, setState] = useState<AdminDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Attention Queue Filter
  const [attentionFilter, setAttentionFilter] = useState<string>("ALL");

  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [
          profilesResult,
          issuesResult,
          activitiesResult,
          departmentsResult,
          institutionsResult,
          industryResult,
          challengesResult,
          projectsResult,
          proposalsResult,
          pilotsResult,
          deploymentsResult,
          blockersResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, clerk_user_id, full_name, email, phone, role_id, department_id, employee_id, designation, is_active, avatar_url, institution_id, organization_id, joined_at, created_at, updated_at, role:roles!profiles_role_id_fkey(code, name), department:departments!profiles_department_id_fkey(id, name, is_active), institution:institutions!profiles_institution_id_fkey(id, name), organization:industry_organizations!profiles_organization_id_fkey(id, name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("issues")
            .select(
              `
              id,
              status,
              priority,
              severity,
              category,
              title,
              description,
              location_text,
              address_text,
              created_at,
              updated_at,
              reporter_profile_id,
              latitude,
              longitude,
              ai_issue_type,
              ai_classification_confidence,
              final_issue_type,
              department_id,
              resolved_at,
              department_assignments:issue_department_assignments!issue_department_assignments_issue_id_fkey(
                id,
                department_id,
                status,
                department:departments!issue_department_assignments_department_id_fkey(id, name, is_active)
              )
            `,
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("issue_status_history")
            .select(
              `
              id,
              issue_id,
              old_status,
              new_status,
              changed_by_profile_id,
              notes,
              created_at,
              issue:issues!issue_status_history_issue_id_fkey(id, title, category),
              changed_by_profile:profiles!issue_status_history_changed_by_profile_id_fkey(id, full_name, email)
            `,
            )
            .order("created_at", { ascending: false })
            .limit(10),
          supabase.from("departments").select("*").order("name", { ascending: true }),
          supabase.from("institutions").select("*").order("created_at", { ascending: false }),
          supabase.from("industry_organizations").select("*").order("created_at", { ascending: false }),
          supabase.from("innovation_challenges").select("*").order("created_at", { ascending: false }),
          supabase.from("challenge_projects").select("*").order("created_at", { ascending: false }),
          supabase.from("research_proposals").select("*").order("updated_at", { ascending: false }),
          supabase.from("pilot_plans").select("*").order("updated_at", { ascending: false }),
          supabase.from("deployment_plans").select("*").order("updated_at", { ascending: false }),
          supabase.from("research_blockers_risks").select("*").order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        if (
          profilesResult.error ||
          issuesResult.error ||
          activitiesResult.error ||
          departmentsResult.error ||
          institutionsResult.error ||
          industryResult.error
        ) {
          if (import.meta.env.DEV) {
            console.error("Admin dashboard load error", {
              profiles: profilesResult.error,
              issues: issuesResult.error,
              activities: activitiesResult.error,
              departments: departmentsResult.error,
            });
          }
          setError("Unable to load platform governance data.");
          setLoading(false);
          return;
        }

        setState({
          profiles: profilesResult.data ?? [],
          issues: (issuesResult.data ?? []) as unknown as IssueRow[],
          activities: (activitiesResult.data ?? []) as unknown as HistoryRow[],
          departments: departmentsResult.data ?? [],
          institutions: institutionsResult.data ?? [],
          industryOrgs: industryResult.data ?? [],
          challenges: challengesResult.data ?? [],
          projects: projectsResult.data ?? [],
          proposals: proposalsResult.data ?? [],
          pilotPlans: pilotsResult.data ?? [],
          deploymentPlans: deploymentsResult.data ?? [],
          blockers: blockersResult.data ?? [],
        });
        setLastRefreshedAt(new Date().toISOString());
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard error:", err);
          setError("An unexpected error occurred while loading dashboard telemetry.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  // Build Dynamic Platform Attention Queue
  const attentionItems = useMemo(() => {
    if (!state) return [];
    const items: AdminAttentionItem[] = [];

    const { institutions, industryOrgs, issues, proposals, pilotPlans, deploymentPlans, blockers, projects } = state;

    // 1. Pending Institution Verifications
    institutions
      .filter((inst) => inst.verification_status === "PENDING_VERIFICATION" || inst.verification_status === "DRAFT")
      .forEach((inst) => {
        items.push({
          id: `inst-verif-${inst.id}`,
          category: "VERIFICATION",
          urgency: "HIGH",
          title: `Institution Accreditation Pending: ${inst.name}`,
          subtitle: `${inst.institution_type || "University"} located in ${inst.city}, ${inst.state} requires administrative review.`,
          source: "Institutions Registry",
          actionLabel: "Review Institution",
          actionHref: `/app/admin/institutions`,
          timestamp: inst.created_at,
        });
      });

    // 2. Pending Industry Partner Verifications
    industryOrgs
      .filter((org) => org.verification_status === "PENDING")
      .forEach((org) => {
        items.push({
          id: `org-verif-${org.id}`,
          category: "VERIFICATION",
          urgency: "HIGH",
          title: `Industry Partner Verification: ${org.name}`,
          subtitle: `${org.organization_type} partner account registered and awaiting administrative verification.`,
          source: "Industry Registry",
          actionLabel: "Verify Organization",
          actionHref: `/app/admin/users`,
          timestamp: org.created_at,
        });
      });

    // 3. Urgent / Critical Civic Issues requiring Assignment
    issues
      .filter(
        (i) =>
          (i.priority === "URGENT" || i.severity === "CRITICAL") &&
          (i.status === "SUBMITTED" || i.status === "AI_ANALYZED"),
      )
      .slice(0, 4)
      .forEach((iss) => {
        items.push({
          id: `issue-urgent-${iss.id}`,
          category: "CIVIC_URGENT",
          urgency: "CRITICAL",
          title: `Unassigned Critical Issue: ${iss.title}`,
          subtitle: `Severity ${iss.severity} · Priority ${iss.priority} reported at ${iss.location_text || "unspecified location"}.`,
          source: "Civic Intake Queue",
          actionLabel: "Assign Department",
          actionHref: `/app/admin/issues/${iss.id}`,
          timestamp: iss.created_at,
        });
      });

    // 4. Low-Confidence or Flagged AI Classifications
    issues
      .filter(
        (i) =>
          i.status === "AI_ANALYZED" &&
          i.ai_classification_confidence !== null &&
          i.ai_classification_confidence < 0.6,
      )
      .slice(0, 3)
      .forEach((iss) => {
        items.push({
          id: `ai-lowconf-${iss.id}`,
          category: "AI_ANOMALY",
          urgency: "MEDIUM",
          title: `Low-Confidence AI Classification (${Math.round((iss.ai_classification_confidence || 0) * 100)}%)`,
          subtitle: `Issue "${iss.title}" was classified as ${iss.ai_issue_type || "UNKNOWN"} with low model confidence.`,
          source: "AI Classification Engine",
          actionLabel: "Audit Classification",
          actionHref: `/app/admin/classification`,
          timestamp: iss.created_at,
        });
      });

    // 5. Research Proposal Revision Backlog
    proposals
      .filter((p) => p.status === "REQUESTED_REVISION" && p.is_current)
      .slice(0, 3)
      .forEach((prop) => {
        const proj = projects.find((pj) => pj.id === prop.project_id);
        items.push({
          id: `prop-rev-${prop.id}`,
          category: "INNOVATION",
          urgency: "HIGH",
          title: `Proposal Revisions Requested: v${prop.version_number}`,
          subtitle: `Project "${proj?.project_title || "Research Workspace"}" requires institutional resubmission.`,
          source: "Research Governance",
          actionLabel: "Inspect Proposal",
          actionHref: `/app/innovation/proposals`,
          timestamp: prop.updated_at,
        });
      });

    // 6. Open Execution Blockers on Active Projects
    blockers
      .filter((b) => b.item_type === "BLOCKER" && (b.status === "OPEN" || b.status === "IN_PROGRESS"))
      .slice(0, 3)
      .forEach((blk) => {
        const proj = projects.find((pj) => pj.id === blk.project_id);
        items.push({
          id: `blk-${blk.id}`,
          category: "INNOVATION",
          urgency: blk.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
          title: `Execution Blocker: ${blk.title}`,
          subtitle: `Project "${proj?.project_title || "Workspace"}" reported a technical or resource constraint.`,
          source: "Innovation Workspaces",
          actionLabel: "View Workspace",
          actionHref: `/app/university/projects/${blk.project_id}`,
          timestamp: blk.reported_at || blk.created_at,
        });
      });

    // 7. Pilot Protocol & Scaling Review Backlog
    pilotPlans
      .filter((p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW")
      .slice(0, 2)
      .forEach((pilot) => {
        items.push({
          id: `pilot-rev-${pilot.id}`,
          category: "INNOVATION",
          urgency: "MEDIUM",
          title: `Pilot Plan Pending Governance: ${pilot.title}`,
          subtitle: `Field validation methodology awaiting municipal innovation sign-off.`,
          source: "Pilot Control Center",
          actionLabel: "Review Pilot",
          actionHref: `/app/innovation/pilots`,
          timestamp: pilot.updated_at,
        });
      });

    // Sort by Urgency
    const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, INFO: 1 };
    items.sort((a, b) => rank[b.urgency] - rank[a.urgency]);

    return items;
  }, [state]);

  const filteredAttentionItems = useMemo(() => {
    if (attentionFilter === "ALL") return attentionItems;
    if (attentionFilter === "VERIFICATION") return attentionItems.filter((i) => i.category === "VERIFICATION");
    if (attentionFilter === "CIVIC") return attentionItems.filter((i) => i.category === "CIVIC_URGENT");
    if (attentionFilter === "INNOVATION") return attentionItems.filter((i) => i.category === "INNOVATION");
    if (attentionFilter === "AI") return attentionItems.filter((i) => i.category === "AI_ANOMALY");
    return attentionItems;
  }, [attentionItems, attentionFilter]);

  // Executive Platform KPIs
  const kpis = useMemo(() => {
    if (!state) return null;
    const { profiles, issues, departments, institutions, industryOrgs, challenges, projects, proposals, pilotPlans, deploymentPlans } = state;

    const totalUsers = profiles.length;
    const activeStaff = profiles.filter((p) => p.is_active && p.role?.code !== "CITIZEN").length;
    const totalCivicIssues = issues.length;
    const resolvedIssues = issues.filter((i) => ["RESOLVED", "CITIZEN_VERIFIED"].includes(i.status)).length;
    const openIssues = totalCivicIssues - resolvedIssues;
    const resolutionRate = totalCivicIssues > 0 ? Math.round((resolvedIssues / totalCivicIssues) * 100) : 0;

    const verifiedInstitutions = institutions.filter((i) => i.verification_status === "VERIFIED").length;
    const verifiedIndustry = industryOrgs.filter((o) => o.verification_status === "VERIFIED").length;
    const totalOrganizations = institutions.length + industryOrgs.length;
    const verifiedOrganizations = verifiedInstitutions + verifiedIndustry;

    const activeProjects = projects.filter((p) => p.status === "ACTIVE" || p.status === "FORMING_TEAM").length;
    const activePilots = pilotPlans.filter((p) => ["APPROVED", "SUBMITTED", "UNDER_REVIEW"].includes(p.status)).length;
    const activeDeployments = deploymentPlans.filter((d) => ["APPROVED", "SUBMITTED", "UNDER_REVIEW"].includes(d.status)).length;

    // Platform Health Score calculation
    let healthScore = 100;
    const unassignedCritical = issues.filter((i) => (i.priority === "URGENT" || i.severity === "CRITICAL") && (i.status === "SUBMITTED" || i.status === "AI_ANALYZED")).length;
    healthScore -= unassignedCritical * 3;
    const pendingVerifs = (institutions.filter((i) => i.verification_status === "PENDING_VERIFICATION" || i.verification_status === "DRAFT").length + industryOrgs.filter((o) => o.verification_status === "PENDING").length);
    healthScore -= pendingVerifs * 2;
    healthScore = Math.max(72, Math.min(100, healthScore));

    // Pipeline breakdown
    const pipeline = {
      submitted: issues.filter((i) => i.status === "SUBMITTED").length,
      aiAnalyzed: issues.filter((i) => i.status === "AI_ANALYZED").length,
      underReview: issues.filter((i) => i.status === "UNDER_REVIEW").length,
      verified: issues.filter((i) => i.status === "VERIFIED").length,
      assigned: issues.filter((i) => i.status === "ASSIGNED").length,
      inProgress: issues.filter((i) => i.status === "IN_PROGRESS").length,
      partiallyCompleted: issues.filter((i) => i.status === "PARTIALLY_COMPLETED").length,
      resolved: issues.filter((i) => i.status === "RESOLVED").length,
      citizenVerified: issues.filter((i) => i.status === "CITIZEN_VERIFIED").length,
      reopened: issues.filter((i) => i.status === "REOPENED").length,
    };

    return {
      totalUsers,
      activeStaff,
      totalCivicIssues,
      resolvedIssues,
      openIssues,
      resolutionRate,
      totalOrganizations,
      verifiedOrganizations,
      institutionsCount: institutions.length,
      verifiedInstitutions,
      industryCount: industryOrgs.length,
      verifiedIndustry,
      activeProjects,
      totalProjects: projects.length,
      challengesCount: challenges.length,
      proposalsCount: proposals.length,
      activePilots,
      activeDeployments,
      healthScore,
      pipeline,
    };
  }, [state]);

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Admin Control Plane Unavailable"
        description={sessionProblem ?? error ?? "We could not load platform administrative telemetry."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
        }
      />
    );
  }

  if (loading || !kpis || !state) {
    return (
      <div className="space-y-6">
        <div className="h-28 w-full animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-72 animate-pulse rounded-3xl border border-border/70 bg-muted/20" />
          <div className="h-72 animate-pulse rounded-3xl border border-border/70 bg-muted/20" />
        </div>
      </div>
    );
  }

  const greeting = getGreeting();
  const adminName = profile?.full_name?.split(" ")[0] || "Admin";

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Platform Control Plane Header */}
      <PageHeader
        tag="Platform Control Plane & Governance Console"
        title={`${greeting}, ${adminName}`}
        description="Comprehensive city-wide administrative control plane. Monitor real-time civic incident workflows, innovation research, institutional accreditation, and platform data integrity."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="h-8.5 border-border text-foreground hover:bg-surface-elevated text-xs font-semibold gap-1.5 shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
              {lastRefreshedAt && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({new Date(lastRefreshedAt).toLocaleTimeString()})
                </span>
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8.5 border-border text-foreground hover:bg-surface-elevated text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Link to="/app/admin/analytics">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span>Analytics Observatory</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Link to="/app/admin/users">
                <UserPlus className="h-3.5 w-3.5" />
                <span>User Provisioning</span>
              </Link>
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>Platform Status: Operational ({kpis.healthScore}% Integrity)</span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface/90 px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs">
            Scope: <span className="font-semibold text-foreground">Citywide Municipal & Academic Network</span>
          </div>
        </div>
      </PageHeader>

      {/* 2. Needs Administrative Attention Queue */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Needs Administrative Attention ({attentionItems.length})</span>
            </h3>
            {attentionItems.some((i) => i.urgency === "CRITICAL") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                <span>Urgent Actions Required</span>
              </span>
            )}
          </div>

          {/* Attention Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
            {[
              { id: "ALL", label: `All (${attentionItems.length})` },
              { id: "VERIFICATION", label: `Verifications (${attentionItems.filter((i) => i.category === "VERIFICATION").length})` },
              { id: "CIVIC", label: `Civic Urgent (${attentionItems.filter((i) => i.category === "CIVIC_URGENT").length})` },
              { id: "INNOVATION", label: `Innovation (${attentionItems.filter((i) => i.category === "INNOVATION").length})` },
              { id: "AI", label: `AI Telemetry (${attentionItems.filter((i) => i.category === "AI_ANOMALY").length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAttentionFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  attentionFilter === tab.id
                    ? "bg-surface text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredAttentionItems.length === 0 ? (
          <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  All platform subsystems operating within healthy parameters
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No unverified organizations, unassigned critical incidents, low-confidence AI classifications, or innovation review backlogs requiring immediate intervention.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAttentionItems.slice(0, 6).map((item) => {
              const isCritical = item.urgency === "CRITICAL";
              const isHigh = item.urgency === "HIGH";
              const isMedium = item.urgency === "MEDIUM";

              return (
                <Card
                  key={item.id}
                  className={`h-full flex flex-col justify-between rounded-xl border transition-all overflow-hidden shadow-xs ${
                    isCritical
                      ? "border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20 hover:border-rose-400"
                      : isHigh
                      ? "border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20 hover:border-amber-400"
                      : "border-border/80 bg-surface hover:border-border"
                  }`}
                >
                  <CardHeader className="p-4 pb-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          isCritical
                            ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                            : isHigh
                            ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                            : isMedium
                            ? "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {isCritical && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
                        {isHigh && <Clock3 className="h-2.5 w-2.5 shrink-0" />}
                        <span>{item.category.replace(/_/g, " ")}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                        {item.source}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug min-h-[2rem]">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed flex-1">
                      {item.subtitle}
                    </p>
                  </CardHeader>

                  <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 flex items-center justify-between mt-auto">
                    {item.timestamp ? (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    ) : <span />}
                    <Link to={item.actionHref}>
                      <Button
                        size="sm"
                        variant={isCritical ? "default" : isHigh ? "default" : "outline"}
                        className={`text-xs font-semibold h-7.5 px-3 gap-1 shadow-2xs ${
                          isCritical
                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                            : isHigh
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "border-border text-foreground"
                        }`}
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Platform Overview 6 KPI Cards Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Metric 1: Platform Users */}
        <Card className="rounded-xl border border-border/80 hover:border-teal-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Platform Users</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <UsersRound className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {kpis.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {kpis.activeStaff} staff across {state.departments.length} depts
            </p>
          </div>
        </Card>

        {/* Metric 2: Organizations */}
        <Card className="rounded-xl border border-border/80 hover:border-sky-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Organizations</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Building2 className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {kpis.totalOrganizations}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                {kpis.verifiedOrganizations} Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {kpis.institutionsCount} Universities · {kpis.industryCount} Industry
            </p>
          </div>
        </Card>

        {/* Metric 3: Civic Issues */}
        <Card className="rounded-xl border border-border/80 hover:border-blue-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Civic Issues</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Layers className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {kpis.totalCivicIssues}
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                {kpis.resolutionRate}% Rate
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {kpis.resolvedIssues} resolved · {kpis.openIssues} active
            </p>
          </div>
        </Card>

        {/* Metric 4: Innovation Projects */}
        <Card className="rounded-xl border border-border/80 hover:border-indigo-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Innovation</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Rocket className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {kpis.activeProjects}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              Active workspaces ({kpis.totalProjects} total)
            </p>
          </div>
        </Card>

        {/* Metric 5: Pilots & Scale */}
        <Card className="rounded-xl border border-border/80 hover:border-amber-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Pilots & Scale</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <FlaskConical className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {kpis.activePilots + kpis.activeDeployments}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {kpis.activePilots} active pilots · {kpis.activeDeployments} scaling
            </p>
          </div>
        </Card>

        {/* Metric 6: Platform Integrity */}
        <Card className="rounded-xl border border-border/80 hover:border-emerald-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Data Integrity</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {kpis.healthScore}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              Zero schema inconsistencies
            </p>
          </div>
        </Card>
      </section>

      {/* 4. Operations Overview: Civic Workflow Funnel & Innovation Ecosystem Snapshot */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Left: 9-Stage Civic Lifecycle Pipeline */}
        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                <span>Live Municipal Civic Pipeline</span>
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Distribution of citizen incidents across the 9 formal resolution stages.
              </p>
            </div>
            <Link to="/app/admin/issues" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <span>All Issues ({kpis.totalCivicIssues})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {[
              { label: "Submitted", count: kpis.pipeline.submitted, color: "bg-sky-500", href: "/app/admin/issues?status=SUBMITTED" },
              { label: "AI Analyzed", count: kpis.pipeline.aiAnalyzed, color: "bg-indigo-500", href: "/app/admin/classification" },
              { label: "Under Review", count: kpis.pipeline.underReview, color: "bg-violet-500", href: "/app/admin/issues?status=UNDER_REVIEW" },
              { label: "Verified", count: kpis.pipeline.verified, color: "bg-cyan-500", href: "/app/admin/issues?status=VERIFIED" },
              { label: "Assigned", count: kpis.pipeline.assigned, color: "bg-teal-500", href: "/app/admin/issues?status=ASSIGNED" },
              { label: "In Progress", count: kpis.pipeline.inProgress, color: "bg-amber-500", href: "/app/admin/issues?status=IN_PROGRESS" },
              { label: "Partially Done", count: kpis.pipeline.partiallyCompleted, color: "bg-blue-500", href: "/app/admin/issues?status=PARTIALLY_COMPLETED" },
              { label: "Resolved", count: kpis.pipeline.resolved, color: "bg-emerald-500", href: "/app/admin/issues?status=RESOLVED" },
              { label: "Citizen Verified", count: kpis.pipeline.citizenVerified, color: "bg-emerald-600", href: "/app/admin/issues?status=CITIZEN_VERIFIED" },
              { label: "Reopened / Rework", count: kpis.pipeline.reopened, color: "bg-rose-500", href: "/app/admin/issues?status=REOPENED" },
            ].map((stage, idx) => (
              <Link
                key={idx}
                to={stage.href}
                className="p-3 rounded-xl border border-border/70 bg-surface hover:border-primary/50 transition-all shadow-2xs block"
              >
                <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase">
                  <span>{stage.label}</span>
                  <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {stage.count}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Right: Quick Administrative Action Hub */}
        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Administrative Control Hub
              </h4>
            </div>
            <Link to="/app/admin/activity" className="text-xs font-semibold text-primary hover:underline">
              Audit Logs
            </Link>
          </div>

          <div className="space-y-2">
            <Link
              to="/app/admin/users"
              className="p-3 rounded-lg border border-border/70 bg-surface hover:border-teal-400 transition flex items-center justify-between shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 border border-teal-500/20">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">User & Role Management</p>
                  <p className="text-[11px] text-muted-foreground">Provision staff, researchers & partners</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </Link>

            <Link
              to="/app/admin/classification"
              className="p-3 rounded-lg border border-border/70 bg-surface hover:border-indigo-400 transition flex items-center justify-between shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">AI Classification Governance</p>
                  <p className="text-[11px] text-muted-foreground">Audit complexity & human override rates</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </Link>

            <Link
              to="/app/admin/institutions"
              className="p-3 rounded-lg border border-border/70 bg-surface hover:border-sky-400 transition flex items-center justify-between shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Institution Directory</p>
                  <p className="text-[11px] text-muted-foreground">{kpis.institutionsCount} Universities cataloged</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </Link>

            <Link
              to="/app/admin/departments"
              className="p-3 rounded-lg border border-border/70 bg-surface hover:border-violet-400 transition flex items-center justify-between shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 border border-violet-500/20">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Municipal Departments</p>
                  <p className="text-[11px] text-muted-foreground">{state.departments.length} Municipal branches</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </Link>
          </div>
        </Card>
      </section>

      {/* 5. Innovation, Research & Support Ecosystem Pulse */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card 1: Innovation Problems & Challenges */}
        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Rocket className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Innovation Challenges
              </h4>
            </div>
            <Link to="/app/innovation/problems" className="text-xs font-semibold text-primary hover:underline">
              Problems ({kpis.challengesCount})
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Active Workspaces</span>
              <span className="font-bold text-foreground">{kpis.activeProjects}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Research Proposals Submitted</span>
              <span className="font-bold text-foreground">{kpis.proposalsCount}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Active Field Pilots</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{kpis.activePilots}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Academic & Industry Ecosystem */}
        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 border border-teal-500/20">
                <Building2 className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Partner Ecosystem
              </h4>
            </div>
            <Link to="/app/admin/institutions" className="text-xs font-semibold text-primary hover:underline">
              View Directory
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Verified Universities (IITs, NITs)</span>
              <span className="font-bold text-foreground">{kpis.verifiedInstitutions} / {kpis.institutionsCount}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Verified Industry Partners</span>
              <span className="font-bold text-foreground">{kpis.verifiedIndustry} / {kpis.industryCount}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Citywide Scaling Deployments</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">{kpis.activeDeployments}</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Recent Audit Activity */}
        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Clock3 className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Recent State Transitions
              </h4>
            </div>
            <Link to="/app/admin/activity" className="text-xs font-semibold text-primary hover:underline">
              All Activity
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            {state.activities.slice(0, 3).map((act) => (
              <div key={act.id} className="p-2 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-foreground truncate max-w-[140px]">
                    {act.issue?.title || "Civic Incident"}
                  </span>
                  <span className="text-muted-foreground">{new Date(act.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Badge variant="outline" size="sm" className="text-[9px] px-1 py-0">{act.old_status || "START"}</Badge>
                  <span>&rarr;</span>
                  <Badge variant={getAdminIssueStatusTone(act.new_status)} size="sm" className="text-[9px] px-1 py-0 font-bold">{act.new_status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
