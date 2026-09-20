import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  FileCheck2,
  FileEdit,
  FileText,
  Flame,
  FlaskConical,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchInstitutionById,
  getVerificationStatusBadge,
} from "@/lib/institutions";
import {
  fetchInstitutionInvitations,
  type InstitutionReceivedInvitation,
} from "@/lib/outreach";
import {
  fetchInstitutionChallengeProjects,
  type ChallengeProjectWithDetails,
} from "@/lib/projects";
import { supabase } from "@/lib/supabase";
import type {
  Database,
  InstitutionRow,
  ResearchProposalRow,
  ResearchProjectMilestoneRow,
  ResearchBlockerRiskRow,
  PilotPlanRow,
  DeploymentPlanRow,
} from "@/types/database";

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];

export interface InstitutionActivityItem {
  id: string;
  project_id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
  project_title?: string;
  actor?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
}

export interface UniversityAttentionItem {
  id: string;
  category: "INVITATION" | "PROPOSAL" | "MILESTONE" | "BLOCKER" | "PILOT" | "DEPLOYMENT";
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  subtitle: string;
  actionLabel: string;
  actionHref: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export function UniversityDashboardPage() {
  const { profile } = useAppSession();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [challengeProjects, setChallengeProjects] = useState<ChallengeProjectWithDetails[]>([]);
  const [invitations, setInvitations] = useState<InstitutionReceivedInvitation[]>([]);
  const [openChallenges, setOpenChallenges] = useState<ChallengeRow[]>([]);
  const [proposals, setProposals] = useState<ResearchProposalRow[]>([]);
  const [milestones, setMilestones] = useState<ResearchProjectMilestoneRow[]>([]);
  const [blockersRisks, setBlockersRisks] = useState<ResearchBlockerRiskRow[]>([]);
  const [pilotPlans, setPilotPlans] = useState<PilotPlanRow[]>([]);
  const [deploymentPlans, setDeploymentPlans] = useState<DeploymentPlanRow[]>([]);
  const [activities, setActivities] = useState<InstitutionActivityItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Filters
  const [attentionFilter, setAttentionFilter] = useState<string>("ALL");
  const [invitationFilter, setInvitationFilter] = useState<string>("PENDING");

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
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

        // Fallback for development/demo viewing if no institution linked: pick premier institution (e.g. IIT Bombay)
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
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        // Parallel initial queries
        const [
          instData,
          chalProjData,
          invData,
          challengesRes,
          proposalsRes,
          pilotsRes,
          deploymentsRes,
        ] = await Promise.all([
          fetchInstitutionById(instId),
          fetchInstitutionChallengeProjects(instId).catch((err) => {
            console.warn("Could not fetch institution projects:", err);
            return [] as ChallengeProjectWithDetails[];
          }),
          fetchInstitutionInvitations(instId).catch((err) => {
            console.warn("Could not fetch institution invitations:", err);
            return [] as InstitutionReceivedInvitation[];
          }),
          supabase
            .from("innovation_challenges")
            .select("*")
            .neq("status", "DRAFT")
            .order("created_at", { ascending: false }),
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
        setChallengeProjects(chalProjData);
        setInvitations(invData);
        setOpenChallenges(challengesRes.data ?? []);
        setProposals(proposalsRes.data ?? []);
        setPilotPlans(pilotsRes.data ?? []);
        setDeploymentPlans(deploymentsRes.data ?? []);

        // Query project-dependent records if projects exist
        const projectIds = chalProjData.map((p) => p.id);
        const projectTitleMap = new Map<string, string>();
        chalProjData.forEach((p) => projectTitleMap.set(p.id, p.project_title));

        if (projectIds.length > 0) {
          const [milestonesRes, blockersRes, activityRes] = await Promise.all([
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
            supabase
              .from("challenge_project_activity")
              .select(`
                id,
                project_id,
                activity_type,
                description,
                created_at,
                actor:profiles!challenge_project_activity_actor_profile_id_fkey(
                  id, full_name, email
                )
              `)
              .in("project_id", projectIds)
              .order("created_at", { ascending: false })
              .limit(12),
          ]);

          if (!cancelled) {
            setMilestones(milestonesRes.data ?? []);
            setBlockersRisks(blockersRes.data ?? []);
            type SupabaseActor = { id: string; full_name: string; email: string | null };
            const mappedActivities: InstitutionActivityItem[] = (activityRes.data ?? []).map((a) => {
              const rawActor = a.actor as unknown;
              const actorRecord = (Array.isArray(rawActor) ? rawActor[0] : rawActor) as SupabaseActor | null;
              return {
                id: a.id,
                project_id: a.project_id,
                activity_type: a.activity_type,
                description: a.description,
                created_at: a.created_at,
                project_title: projectTitleMap.get(a.project_id) || "Project Workspace",
                actor: actorRecord
                  ? {
                      id: actorRecord.id,
                      full_name: actorRecord.full_name,
                      email: actorRecord.email,
                    }
                  : null,
              };
            });
            setActivities(mappedActivities);
          }
        } else {
          if (!cancelled) {
            setMilestones([]);
            setBlockersRisks([]);
            setActivities([]);
          }
        }

        setLastRefreshed(new Date().toLocaleTimeString());
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load university dashboard data:", err);
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [profile?.institution_id, profile?.id, refreshNonce]);

  // Build dynamic Attention Items Queue from actual database state
  const attentionItems: UniversityAttentionItem[] = [];

  // 1. Pending invitations requiring institution response
  invitations
    .filter((inv) => inv.status === "SENT" || inv.status === "PENDING")
    .forEach((inv) => {
      attentionItems.push({
        id: `inv-${inv.id}`,
        category: "INVITATION",
        urgency: "HIGH",
        title: `Municipal Invitation: ${inv.challenge.title}`,
        subtitle: inv.invitation_message
          ? `"${inv.invitation_message}"`
          : "Your institution was selected by municipal innovation managers for this challenge.",
        actionLabel: "Review & Respond",
        actionHref: `/app/university/challenges?tab=invitations&invitationId=${inv.id}`,
        timestamp: inv.invited_at,
        metadata: { matchScore: inv.match_evidence?.overall_score },
      });
    });

  // 2. Proposals needing revisions or waiting on submission
  proposals.forEach((prop) => {
    const proj = challengeProjects.find((p) => p.id === prop.project_id);
    const projTitle = proj?.project_title || prop.project_objective || "Research Proposal";

    if (prop.status === "REQUESTED_REVISION") {
      attentionItems.push({
        id: `prop-rev-${prop.id}`,
        category: "PROPOSAL",
        urgency: "CRITICAL",
        title: `Proposal Revision Requested: v${prop.version_number} (${projTitle})`,
        subtitle:
          prop.review_feedback ||
          "The Innovation Review committee requested revisions on your research proposal.",
        actionLabel: "Edit & Resubmit Proposal",
        actionHref: `/app/university/projects/${prop.project_id}/proposal`,
        timestamp: prop.reviewed_at || prop.updated_at,
      });
    } else if (prop.status === "DRAFT" && prop.is_current) {
      attentionItems.push({
        id: `prop-draft-${prop.id}`,
        category: "PROPOSAL",
        urgency: "MEDIUM",
        title: `Draft Proposal in Progress: ${projTitle}`,
        subtitle:
          "Proposal draft requires completion and formal submission for municipal review.",
        actionLabel: "Continue Proposal",
        actionHref: `/app/university/projects/${prop.project_id}/proposal`,
        timestamp: prop.updated_at,
      });
    }
  });

  // 3. Open Blockers and Critical/High Risks
  blockersRisks
    .filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS")
    .forEach((item) => {
      const isBlocker = item.item_type === "BLOCKER";
      const isCritical = item.severity === "CRITICAL" || item.severity === "HIGH";
      if (isBlocker || isCritical) {
        const proj = challengeProjects.find((p) => p.id === item.project_id);
        attentionItems.push({
          id: `risk-${item.id}`,
          category: "BLOCKER",
          urgency: item.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
          title: `${isBlocker ? "Execution Blocker" : "High Risk"}: ${item.title}`,
          subtitle: `Project "${proj?.project_title || "Workspace"}" · ${item.description || "Requires research team intervention."}`,
          actionLabel: "Inspect Workspace",
          actionHref: `/app/university/projects/${item.project_id}`,
          timestamp: item.reported_at || item.created_at,
        });
      }
    });

  // 4. Overdue or Blocked Milestones
  const nowStr = new Date().toISOString();
  milestones
    .filter((m) => {
      const isOverdue =
        m.status === "IN_PROGRESS" &&
        m.planned_completion_date &&
        m.planned_completion_date < nowStr;
      return m.status === "BLOCKED" || m.status === "DELAYED" || isOverdue;
    })
    .forEach((m) => {
      const proj = challengeProjects.find((p) => p.id === m.project_id);
      attentionItems.push({
        id: `milestone-${m.id}`,
        category: "MILESTONE",
        urgency: m.status === "BLOCKED" ? "HIGH" : "MEDIUM",
        title: `Milestone Alert: ${m.title} (${m.status.replace(/_/g, " ")})`,
        subtitle: `Project "${proj?.project_title || "Workspace"}" · ${m.completion_percentage}% completed · Due: ${m.planned_completion_date ? new Date(m.planned_completion_date).toLocaleDateString() : "Unscheduled"}`,
        actionLabel: "View Milestones",
        actionHref: `/app/university/projects/${m.project_id}`,
        timestamp: m.updated_at,
      });
    });

  // 5. Pilot Plans in Revision
  pilotPlans
    .filter((p) => p.status === "REQUESTED_REVISION")
    .forEach((p) => {
      const proj = challengeProjects.find((cp) => cp.id === p.project_id);
      attentionItems.push({
        id: `pilot-rev-${p.id}`,
        category: "PILOT",
        urgency: "HIGH",
        title: `Pilot Protocol Revision: ${p.title}`,
        subtitle: `Project "${proj?.project_title || "Workspace"}" · ${p.revision_feedback || "City innovation team requested adjustments to pilot protocol."}`,
        actionLabel: "Refine Pilot Plan",
        actionHref: `/app/university/projects/${p.project_id}`,
        timestamp: p.updated_at,
      });
    });

  // 6. Deployment Plans in Revision
  deploymentPlans
    .filter((d) => d.status === "REVISION_REQUESTED" || d.status === "REQUESTED_REVISION")
    .forEach((d) => {
      const proj = challengeProjects.find((cp) => cp.id === d.project_id);
      attentionItems.push({
        id: `deploy-rev-${d.id}`,
        category: "DEPLOYMENT",
        urgency: "HIGH",
        title: `Deployment Blueprint Revision: ${d.title}`,
        subtitle: `Project "${proj?.project_title || "Workspace"}" · City scaling blueprint requires institutional updates.`,
        actionLabel: "Update Deployment",
        actionHref: `/app/university/projects/${d.project_id}`,
        timestamp: d.updated_at,
      });
    });

  // Urgency Sort (CRITICAL -> HIGH -> MEDIUM -> INFO)
  const urgencyWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, INFO: 1 };
  attentionItems.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);

  const filteredAttentionItems = attentionItems.filter((item) => {
    if (attentionFilter === "ALL") return true;
    if (attentionFilter === "INVITATIONS") return item.category === "INVITATION";
    if (attentionFilter === "PROPOSALS") return item.category === "PROPOSAL";
    if (attentionFilter === "BLOCKERS") return item.category === "BLOCKER" || item.category === "MILESTONE";
    if (attentionFilter === "PILOTS") return item.category === "PILOT" || item.category === "DEPLOYMENT";
    return true;
  });

  // Aggregated KPIs
  const activeProjectsCount = challengeProjects.filter((p) => p.status === "ACTIVE" || p.status === "FORMING_TEAM").length;
  const pendingInvitationsCount = invitations.filter((i) => i.status === "SENT" || i.status === "PENDING").length;
  const activeProposalsCount = proposals.filter((p) => p.is_current).length;
  const approvedProposalsCount = proposals.filter((p) => p.status === "APPROVED" && p.is_current).length;
  const activePilotsCount = pilotPlans.filter((p) => p.status === "APPROVED" || p.status === "SUBMITTED" || p.status === "UNDER_REVIEW").length;
  const activeDeploymentsCount = deploymentPlans.filter((d) => d.status === "APPROVED" || d.status === "SUBMITTED" || d.status === "UNDER_REVIEW").length;
  const openBlockersCount = blockersRisks.filter((b) => b.item_type === "BLOCKER" && (b.status === "OPEN" || b.status === "IN_PROGRESS")).length;
  const criticalRisksCount = blockersRisks.filter((b) => b.item_type === "RISK" && (b.severity === "CRITICAL" || b.severity === "HIGH") && (b.status === "OPEN" || b.status === "IN_PROGRESS")).length;
  const totalFacultyCount = challengeProjects.reduce((acc, p) => acc + (p.members_count || 1), 0);

  const filteredInvitations = invitations.filter((inv) => {
    if (invitationFilter === "PENDING") return inv.status === "SENT" || inv.status === "PENDING";
    if (invitationFilter === "ACCEPTED") return inv.status === "ACCEPTED";
    if (invitationFilter === "DECLINED") return inv.status === "REJECTED" || inv.status === "CANCELLED";
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse border border-border/60 bg-muted/20" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="h-72 animate-pulse border border-border/60 bg-muted/20 lg:col-span-2" />
          <Card className="h-72 animate-pulse border border-border/60 bg-muted/20" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          tag="University Portal"
          title="University Research & Civic Innovation"
          description="Institutional operational overview"
        />
        <Card className="border border-rose-300 bg-rose-50/30 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/20">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600 dark:text-rose-400" />
          <h3 className="mt-3 text-base font-bold text-foreground">Failed to Load University Dashboard</h3>
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
      {/* 1. Header & Institutional Context */}
      <PageHeader
        tag="University Portal"
        title="University Research & Civic Innovation"
        description="Track your institution's civic research initiatives, municipal opportunities, research activity, and actions requiring attention."
        variant="research"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="h-8.5 border-border text-foreground hover:bg-surface-elevated text-xs font-semibold gap-1.5 shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
              <span className="text-[10px] text-muted-foreground font-normal">({lastRefreshed})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigate("/app/university/profile");
              }}
              className="h-8.5 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-xs font-semibold gap-1.5 shadow-xs"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Capability Matrix</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void navigate("/app/university/challenges?tab=invitations");
              }}
              className="h-8.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs text-xs font-semibold gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Invitations</span>
              {pendingInvitationsCount > 0 && (
                <span className="rounded-full bg-white text-primary px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {pendingInvitationsCount}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* Institution Banner Card */}
      {institution && (
        <Card className="rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-r from-sky-500/5 via-primary/5 to-surface shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2.5 min-w-0 flex-1">
                {/* Status Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="h-6 border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-xs font-semibold px-2.5 py-0.5">
                    {institution.institution_type}
                  </Badge>
                  <span className={`inline-flex items-center h-6 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                  {institution.is_active && (
                    <span className="inline-flex items-center gap-1 h-6 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Active Research Partner</span>
                    </span>
                  )}
                  {institution.nirf_rank && (
                    <span className="inline-flex items-center gap-1 h-6 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      <Award className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>NIRF Rank #{institution.nirf_rank}</span>
                    </span>
                  )}
                </div>

                {/* Institution Name */}
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
                  {institution.official_name || institution.name}
                </h2>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground/80">{institution.city}, {institution.state}</span>
                  </div>
                  {institution.website && (
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <a
                        href={institution.website.startsWith("http") ? institution.website : `https://${institution.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
                      >
                        {institution.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{institution.research_domains?.length || 0} Research Domains</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{(institution.laboratories?.length || 0) + (institution.facilities?.length || 0)} Labs &amp; Facilities</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 lg:self-center shrink-0">
                <Link to="/app/university/profile">
                  <Button variant="outline" size="sm" className="h-9 text-xs font-semibold border-border px-3.5 shadow-xs">
                    Edit Capability Matrix
                  </Button>
                </Link>
                <Link to="/app/university/challenges">
                  <Button size="sm" className="h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 shadow-xs">
                    Browse Open Challenges ({openChallenges.length})
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Needs Your Attention (Action Queue) */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Needs Your Attention ({attentionItems.length})</span>
            </h3>
            {attentionItems.some((i) => i.urgency === "CRITICAL") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>Urgent Action Required</span>
              </span>
            )}
          </div>

          {/* Attention Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
            {[
              { id: "ALL", label: `All (${attentionItems.length})` },
              { id: "INVITATIONS", label: `Invitations (${attentionItems.filter((i) => i.category === "INVITATION").length})` },
              { id: "PROPOSALS", label: `Proposals (${attentionItems.filter((i) => i.category === "PROPOSAL").length})` },
              { id: "BLOCKERS", label: `Risks & Milestones (${attentionItems.filter((i) => i.category === "BLOCKER" || i.category === "MILESTONE").length})` },
              { id: "PILOTS", label: `Pilots (${attentionItems.filter((i) => i.category === "PILOT" || i.category === "DEPLOYMENT").length})` },
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
                  All institutional initiatives are on track
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No pending municipal invitations, overdue proposal revisions, or unresolved critical blockers require immediate action.
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
                        {isHigh && <Clock className="h-2.5 w-2.5 shrink-0" />}
                        <span>{item.category}</span>
                      </span>
                      {item.timestamp && (
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug min-h-[2rem]">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed flex-1">
                      {item.subtitle}
                    </p>
                  </CardHeader>

                  <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 flex items-center justify-end mt-auto">
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
      </div>

      {/* 3. Institutional Overview Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Metric 1: Active Projects */}
        <Card className="rounded-xl border border-border/80 hover:border-emerald-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Active Projects</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BookOpen className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {activeProjectsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {challengeProjects.length} total initialized
            </p>
          </div>
        </Card>

        {/* Metric 2: Invitations */}
        <Card className="rounded-xl border border-border/80 hover:border-teal-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Invitations</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Mail className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {invitations.length}
              </span>
              {pendingInvitationsCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                  {pendingInvitationsCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {invitations.filter((i) => i.status === "ACCEPTED").length} accepted by institution
            </p>
          </div>
        </Card>

        {/* Metric 3: Proposals */}
        <Card className="rounded-xl border border-border/80 hover:border-sky-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Proposals</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <FileText className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {activeProposalsCount}
              </span>
              {approvedProposalsCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                  {approvedProposalsCount} Approved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {proposals.filter((p) => p.status === "UNDER_REVIEW" || p.status === "SUBMITTED" || p.status === "RESUBMITTED").length} under review
            </p>
          </div>
        </Card>

        {/* Metric 4: Pilots & Scale */}
        <Card className="rounded-xl border border-border/80 hover:border-indigo-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Pilots &amp; Scale</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FlaskConical className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {activePilotsCount + activeDeploymentsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {activePilotsCount} pilots · {activeDeploymentsCount} deployments
            </p>
          </div>
        </Card>

        {/* Metric 5: Blockers & Risks */}
        <Card className="rounded-xl border border-border/80 hover:border-amber-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Blockers &amp; Risks</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldAlert className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                {openBlockersCount}
              </span>
              {criticalRisksCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                  {criticalRisksCount} High Risk
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              {blockersRisks.filter((b) => b.status === "RESOLVED").length} issues resolved
            </p>
          </div>
        </Card>

        {/* Metric 6: Research Faculty */}
        <Card className="rounded-xl border border-border/80 hover:border-cyan-500/60 bg-surface shadow-xs flex flex-col justify-between p-4 h-full transition-all">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Research Faculty</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Users className="h-4 w-4 shrink-0" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
              {totalFacultyCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-1">
              Across {challengeProjects.length} active teams
            </p>
          </div>
        </Card>
      </div>

      {/* 4. Research Pipeline Flow */}
      <Card className="rounded-xl border border-border/80 bg-surface/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60 gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Institutional Research Pipeline
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Lifecycle progression of municipal challenges tackled by your university faculties.
            </p>
          </div>
          <Link to="/app/university/challenges" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto">
            <span>Explore Opportunities</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              stage: "1. Invitations",
              count: invitations.length,
              sub: `${pendingInvitationsCount} pending review`,
              href: "/app/university/challenges?tab=invitations",
              highlight: pendingInvitationsCount > 0,
            },
            {
              stage: "2. Projects",
              count: challengeProjects.length,
              sub: `${challengeProjects.filter((p) => p.status === "ACTIVE").length} active workspaces`,
              href: challengeProjects.length > 0 ? `/app/university/projects/${challengeProjects[0].id}` : "/app/university/challenges",
              highlight: false,
            },
            {
              stage: "3. Proposals",
              count: proposals.length,
              sub: `${approvedProposalsCount} approved by city`,
              href: proposals.length > 0 ? `/app/university/projects/${proposals[0].project_id}/proposal` : "/app/university/challenges",
              highlight: proposals.some((p) => p.status === "REQUESTED_REVISION"),
            },
            {
              stage: "4. Research Execution",
              count: milestones.length,
              sub: `${milestones.filter((m) => m.status === "COMPLETED").length} milestones done`,
              href: challengeProjects.length > 0 ? `/app/university/projects/${challengeProjects[0].id}` : "/app/university/challenges",
              highlight: false,
            },
            {
              stage: "5. Pilot Validation",
              count: pilotPlans.length,
              sub: `${activePilotsCount} active in field`,
              href: pilotPlans.length > 0 ? `/app/university/projects/${pilotPlans[0].project_id}` : "/app/university/challenges",
              highlight: false,
            },
            {
              stage: "6. City Deployment",
              count: deploymentPlans.length,
              sub: `${activeDeploymentsCount} scaling city-wide`,
              href: deploymentPlans.length > 0 ? `/app/university/projects/${deploymentPlans[0].project_id}` : "/app/university/challenges",
              highlight: false,
            },
          ].map((step, idx) => (
            <Link
              key={idx}
              to={step.href}
              className={`p-3 rounded-xl border flex flex-col justify-between h-full transition-all text-left block hover:border-primary/50 shadow-2xs ${
                step.highlight
                  ? "border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20"
                  : "border-border/60 bg-muted/20"
              }`}
            >
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {step.stage}
              </div>
              <div className="text-xl font-bold text-foreground mt-1.5">
                {step.count}
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-1">
                {step.sub}
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* 5. Active Projects Snapshot & 6. Invitations Snapshot (2-Column Grid) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Active Projects Preview */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Active Challenge Workspaces &amp; Research Teams
                </h3>
                <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800 text-[10px] font-bold px-2 py-0.5">
                  Page 5 Workspaces
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dedicated collaborative research teams solving accepted municipal innovation challenges.
              </p>
            </div>
            {challengeProjects.length > 0 && (
              <span className="text-xs text-muted-foreground font-semibold">
                {challengeProjects.length} Projects
              </span>
            )}
          </div>

          {challengeProjects.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-border/80 bg-surface/50 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                  <h4 className="text-sm font-bold text-foreground">No Project Workspaces Formed Yet</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accept a municipal invitation or submit a challenge proposal to initialize your first research team.
                  </p>
                </div>
                <Link to="/app/university/challenges?tab=invitations">
                  <Button size="sm" className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold h-8.5 px-3.5 shadow-xs">
                    View Received Invitations
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {challengeProjects.slice(0, 4).map((proj) => {
                const projMilestones = milestones.filter((m) => m.project_id === proj.id);
                const completedMilestones = projMilestones.filter((m) => m.status === "COMPLETED").length;
                const projBlockers = blockersRisks.filter((b) => b.project_id === proj.id && (b.status === "OPEN" || b.status === "IN_PROGRESS"));
                const projProposal = proposals.find((p) => p.project_id === proj.id && p.is_current);

                return (
                  <Card
                    key={proj.id}
                    className="h-full flex flex-col justify-between rounded-xl border border-border/80 bg-surface/90 hover:border-primary/40 transition-all shadow-xs overflow-hidden"
                  >
                    <CardHeader className="p-4 pb-2 space-y-2 flex-1 flex flex-col">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-semibold border-primary/20 bg-primary/5 text-primary px-2 py-0.5">
                          {proj.challenge.category.replace(/_/g, " ")}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          {projProposal && (
                            <Badge
                              variant="outline"
                              size="sm"
                              className={`text-[9px] font-semibold px-2 py-0.5 ${
                                projProposal.status === "APPROVED"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : projProposal.status === "REQUESTED_REVISION"
                                  ? "border-rose-300 bg-rose-50 text-rose-800"
                                  : "border-sky-300 bg-sky-50 text-sky-800"
                              }`}
                            >
                              Prop: {projProposal.status.replace(/_/g, " ")}
                            </Badge>
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
                            className="text-[10px] font-bold px-2 py-0.5"
                          >
                            {proj.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>

                      {/* Title & Summary */}
                      <h4 className="text-sm font-bold text-foreground line-clamp-1 min-h-[1.25rem]">
                        {proj.project_title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
                        {proj.project_summary || proj.challenge.problem_statement}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-3 p-4 pt-0 mt-auto">
                      {/* Milestone Progress Bar */}
                      {projMilestones.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                            <span>Milestones</span>
                            <span>{completedMilestones} / {projMilestones.length} Done</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 rounded-full"
                              style={{ width: `${(completedMilestones / projMilestones.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Lead & Members Row */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 text-foreground/90 font-medium">
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
                          <span className="truncate text-[11px] font-semibold">
                            {proj.project_lead?.full_name || "Lead Unassigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {projBlockers.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-300 font-bold text-[10px]">
                              <ShieldAlert className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                              <span>{projBlockers.length} {projBlockers.length === 1 ? "Issue" : "Issues"}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 font-semibold text-[10px]">
                            <Users className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span>{proj.members_count || 1}</span>
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link to={`/app/university/projects/${proj.id}/proposal`}>
                          <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-8 gap-1.5 shadow-2xs">
                            <FileEdit className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>Proposal</span>
                          </Button>
                        </Link>
                        <Link to={`/app/university/projects/${proj.id}`}>
                          <Button size="sm" className="w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-8 gap-1.5 shadow-2xs">
                            <Rocket className="w-3.5 h-3.5 shrink-0" />
                            <span>Workspace</span>
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Municipal Invitations Snapshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Municipal Invitations</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Targeted matching invitations from municipal innovation teams.
              </p>
            </div>
            <Link
              to="/app/university/challenges?tab=invitations"
              className="text-xs font-semibold text-primary hover:underline"
            >
              All ({invitations.length})
            </Link>
          </div>

          {/* Invitation status filter */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
            {[
              { id: "PENDING", label: `Pending (${pendingInvitationsCount})` },
              { id: "ACCEPTED", label: `Accepted (${invitations.filter((i) => i.status === "ACCEPTED").length})` },
              { id: "ALL", label: `All (${invitations.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInvitationFilter(tab.id)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                  invitationFilter === tab.id
                    ? "bg-surface text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredInvitations.length === 0 ? (
            <Card className="rounded-xl border border-border/80 bg-surface/90 p-6 text-center shadow-xs">
              <p className="text-xs font-bold text-foreground">No invitations matching filter</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                When city innovation managers invite your university, they will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredInvitations.slice(0, 3).map((inv) => {
                const isPending = inv.status === "SENT" || inv.status === "PENDING";
                return (
                  <Card
                    key={inv.id}
                    className={`rounded-xl border transition-all p-4 space-y-3 shadow-xs flex flex-col justify-between ${
                      isPending
                        ? "border-teal-300 dark:border-teal-800 bg-teal-50/20 dark:bg-teal-950/20"
                        : "border-border/80 bg-surface/90"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[9px] font-semibold border-primary/20 bg-primary/5 text-primary px-2 py-0.5">
                          {inv.challenge.category}
                        </Badge>
                        {inv.match_evidence && (
                          <span className="inline-flex items-center rounded-full bg-teal-50 dark:bg-teal-950 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            {inv.match_evidence.overall_score.toFixed(0)}% Advisory Match
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug min-h-[2rem]">
                        {inv.challenge.title}
                      </h4>

                      {inv.invitation_message && (
                        <p className="text-[11px] text-muted-foreground italic line-clamp-2 bg-background/60 p-2 rounded-lg border border-border/60 leading-relaxed">
                          &ldquo;{inv.invitation_message}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-[10px] text-muted-foreground">
                      <span className="font-medium">Invited: {new Date(inv.invited_at).toLocaleDateString()}</span>
                      <Link to={`/app/university/challenges?tab=invitations&invitationId=${inv.id}`}>
                        <Button size="sm" variant={isPending ? "default" : "outline"} className={`h-7 px-2.5 text-[11px] font-semibold ${isPending ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}>
                          {isPending ? "Review & Respond" : "View Dossier"}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 7. Research Health & Open Blockers / Risks Snapshot */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Milestones Breakdown */}
        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Milestone Execution Health
              </h4>
            </div>
            <span className="text-xs text-foreground font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border">
              {milestones.length} Total
            </span>
          </div>

          <div className="space-y-2.5 text-xs flex-1">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/25 dark:border-emerald-800/60 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-foreground text-xs">Completed Milestones</span>
              </div>
              <span className="font-bold text-xs text-white bg-emerald-600 dark:bg-emerald-500 px-2.5 py-0.5 rounded-full shadow-2xs">
                {milestones.filter((m) => m.status === "COMPLETED").length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/10 dark:bg-sky-950/30 border border-sky-500/25 dark:border-sky-800/60 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="font-semibold text-foreground text-xs">In Progress</span>
              </div>
              <span className="font-bold text-xs text-white bg-sky-600 dark:bg-sky-500 px-2.5 py-0.5 rounded-full shadow-2xs">
                {milestones.filter((m) => m.status === "IN_PROGRESS").length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 dark:border-amber-800/60 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold text-foreground text-xs">Delayed / Blocked</span>
              </div>
              <span className="font-bold text-xs text-white bg-amber-600 dark:bg-amber-500 px-2.5 py-0.5 rounded-full shadow-2xs">
                {milestones.filter((m) => m.status === "BLOCKED" || m.status === "DELAYED").length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 dark:bg-muted/40 border border-border/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-muted-foreground text-xs">Not Started</span>
              </div>
              <span className="font-bold text-xs text-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full">
                {milestones.filter((m) => m.status === "NOT_STARTED").length}
              </span>
            </div>
          </div>
        </Card>

        {/* Open Blockers & Active Risks */}
        <Card className="rounded-xl border border-border/80 bg-surface/90 shadow-xs p-5 space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Active Execution Blockers &amp; Risks</span>
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Unresolved technical and logistical constraints reported by research project teams.
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground font-bold shrink-0">
              {blockersRisks.filter((b) => b.status === "OPEN" || b.status === "IN_PROGRESS").length} Active
            </span>
          </div>

          {blockersRisks.filter((b) => b.status === "OPEN" || b.status === "IN_PROGRESS").length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground flex-1 flex flex-col items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mb-1.5 shrink-0" />
              <span>No open blockers or critical risks reported across active projects.</span>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {blockersRisks
                .filter((b) => b.status === "OPEN" || b.status === "IN_PROGRESS")
                .slice(0, 3)
                .map((item) => {
                  const proj = challengeProjects.find((p) => p.id === item.project_id);
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border/70 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant={item.item_type === "BLOCKER" ? "danger" : "amber"}
                            size="sm"
                            className="text-[9px] font-bold px-1.5 py-0.5"
                          >
                            {item.item_type}
                          </Badge>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.severity === "CRITICAL"
                                ? "bg-rose-100 text-rose-800"
                                : item.severity === "HIGH"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.severity}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {proj?.project_title} · {item.description}
                        </p>
                      </div>

                      <Link to={`/app/university/projects/${item.project_id}`} className="shrink-0 self-end sm:self-center">
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-[10px] font-semibold gap-1 shadow-2xs">
                          <span>Inspect</span>
                          <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>

      {/* 8. Pilot & Deployment Operational Summary */}
      {(pilotPlans.length > 0 || deploymentPlans.length > 0) && (
        <Card className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-surface/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Pilots &amp; City-Scale Deployments</span>
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Advanced stage field trials and civic impact deployment plans underway.
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground font-bold shrink-0">
              {pilotPlans.length} Pilots · {deploymentPlans.length} Deployments
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pilotPlans.slice(0, 2).map((pilot) => {
              const proj = challengeProjects.find((p) => p.id === pilot.project_id);
              return (
                <div
                  key={pilot.id}
                  className="p-4 rounded-xl border border-border/70 bg-surface flex flex-col justify-between space-y-3 shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="indigo" size="sm" className="text-[9px] font-semibold px-2 py-0.5">
                        PILOT: {pilot.test_environment_type.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" size="sm" className="text-[9px] font-semibold px-2 py-0.5">
                        {pilot.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <h5 className="text-xs font-bold text-foreground mt-2 line-clamp-1">
                      {pilot.title}
                    </h5>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      Project: {proj?.project_title || "Workspace"} · {pilot.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
                    <span>Duration: {pilot.estimated_duration_days} days</span>
                    <Link to={`/app/university/projects/${pilot.project_id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs font-semibold px-2.5">
                        Open Pilot Workspace →
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}

            {deploymentPlans.slice(0, 2).map((deploy) => {
              const proj = challengeProjects.find((p) => p.id === deploy.project_id);
              return (
                <div
                  key={deploy.id}
                  className="p-4 rounded-xl border border-border/70 bg-surface flex flex-col justify-between space-y-3 shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="emerald" size="sm" className="text-[9px] font-semibold px-2 py-0.5">
                        DEPLOYMENT: {deploy.deployment_scope}
                      </Badge>
                      <Badge variant="outline" size="sm" className="text-[9px] font-semibold px-2 py-0.5">
                        {deploy.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <h5 className="text-xs font-bold text-foreground mt-2 line-clamp-1">
                      {deploy.title}
                    </h5>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      Project: {proj?.project_title || "Workspace"} · Geography: {deploy.target_geography}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
                    <span>Readiness: {deploy.technical_readiness}</span>
                    <Link to={`/app/university/projects/${deploy.project_id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs font-semibold px-2.5">
                        Open Deployment Workspace →
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 9. Recent Institutional Activity Feed */}
      <Card className="rounded-xl border border-border/80 bg-surface/90 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              <span>Recent Institutional Activity</span>
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Audit timeline of project creation, proposal submissions, milestone completion, and municipal updates.
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground font-bold shrink-0">
            Live Stream
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No institutional activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {activities.slice(0, 6).map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-muted text-primary mt-0.5 shrink-0">
                    {act.activity_type.includes("PROPOSAL") ? (
                      <FileText className="h-4 w-4 shrink-0" />
                    ) : act.activity_type.includes("MILESTONE") ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : act.activity_type.includes("BLOCKER") || act.activity_type.includes("RISK") ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    ) : act.activity_type.includes("PILOT") ? (
                      <FlaskConical className="h-4 w-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Rocket className="h-4 w-4 shrink-0" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-foreground">
                      {act.description || act.activity_type.replace(/_/g, " ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{act.project_title}</span>
                      {act.actor?.full_name && (
                        <span>· Actor: {act.actor.full_name}</span>
                      )}
                      <span>· {new Date(act.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Link to={`/app/university/projects/${act.project_id}`} className="shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/5">
                    <span>Workspace</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 10. Quick Actions Navigation Dock */}
      <Card className="rounded-xl border border-border/80 bg-surface/90 shadow-xs p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3.5">
          Institutional Quick Actions &amp; Navigation
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Link
            to="/app/university/challenges?tab=invitations"
            className="p-4 rounded-xl border border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group flex flex-col items-center justify-center min-h-[6.5rem] shadow-2xs"
          >
            <Mail className="h-5 w-5 mx-auto text-teal-600 mb-2 group-hover:scale-110 transition-transform shrink-0" />
            <div className="text-xs font-bold text-foreground">Review Invitations</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{pendingInvitationsCount} Pending</div>
          </Link>

          <Link
            to="/app/university/challenges"
            className="p-4 rounded-xl border border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group flex flex-col items-center justify-center min-h-[6.5rem] shadow-2xs"
          >
            <Rocket className="h-5 w-5 mx-auto text-primary mb-2 group-hover:scale-110 transition-transform shrink-0" />
            <div className="text-xs font-bold text-foreground">Browse Challenges</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{openChallenges.length} Open</div>
          </Link>

          <Link
            to="/app/university/marketplace"
            className="p-4 rounded-xl border border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group flex flex-col items-center justify-center min-h-[6.5rem] shadow-2xs"
          >
            <Store className="h-5 w-5 mx-auto text-indigo-600 mb-2 group-hover:scale-110 transition-transform shrink-0" />
            <div className="text-xs font-bold text-foreground">Industry Support</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Marketplace</div>
          </Link>

          <Link
            to="/app/university/profile"
            className="p-4 rounded-xl border border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group flex flex-col items-center justify-center min-h-[6.5rem] shadow-2xs"
          >
            <GraduationCap className="h-5 w-5 mx-auto text-sky-600 mb-2 group-hover:scale-110 transition-transform shrink-0" />
            <div className="text-xs font-bold text-foreground">Capability Matrix</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Labs &amp; Expertise</div>
          </Link>

          <Link
            to="/app/university/notifications"
            className="p-4 rounded-xl border border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group col-span-2 sm:col-span-1 flex flex-col items-center justify-center min-h-[6.5rem] shadow-2xs"
          >
            <Activity className="h-5 w-5 mx-auto text-amber-600 mb-2 group-hover:scale-110 transition-transform shrink-0" />
            <div className="text-xs font-bold text-foreground">Notifications</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">System Alerts</div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
