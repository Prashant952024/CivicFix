import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  History,
  Layers,
  Loader2,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fetchProjectById,
  fetchProjectMembers,
  fetchProjectActivity,
  fetchInstitutionAvailableMembers,
  addProjectMember,
  updateProjectMemberRole,
  deactivateProjectMember,
  assignProjectLead,
  updateProjectStatus,
  updateProjectWorkspace,
  checkUserIsInstitutionCoordinator,
  type ChallengeProjectWithDetails,
  type ChallengeProjectMemberWithProfile,
  type ChallengeProjectActivityWithActor,
  type AvailableInstitutionMember,
} from "@/lib/projects";
import type { ProjectMemberRole, ProjectWorkspaceStatus } from "@/types/database";

export function UniversityProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { profile, roleCode } = useAppSession();
  const navigate = useNavigate();

  const [project, setProject] = useState<ChallengeProjectWithDetails | null>(null);
  const [members, setMembers] = useState<ChallengeProjectMemberWithProfile[]>([]);
  const [activity, setActivity] = useState<ChallengeProjectActivityWithActor[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableInstitutionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"team" | "challenge" | "activity">("team");

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add Member Modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>("MEMBER");
  const [submittingMember, setSubmittingMember] = useState(false);

  // Edit Workspace Modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Change Lead Modal
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedNewLead, setSelectedNewLead] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);

  // Status Change Confirmation Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ProjectWorkspaceStatus | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Member Action in Progress
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!projectId) return;
      setLoading(true);
      try {
        const projData = await fetchProjectById(projectId);
        if (cancelled) return;
        if (!projData) {
          setProject(null);
          return;
        }
        setProject(projData);
        setEditTitle(projData.project_title);
        setEditSummary(projData.project_summary || "");

        const [membersData, activityData, availData] = await Promise.all([
          fetchProjectMembers(projectId),
          fetchProjectActivity(projectId),
          fetchInstitutionAvailableMembers(projData.institution_id, projectId),
        ]);

        if (cancelled) return;
        setMembers(membersData);
        setActivity(activityData);
        setAvailableMembers(availData);

        if (profile?.id && projData.institution_id) {
          const hasCoordRole = await checkUserIsInstitutionCoordinator(
            projData.institution_id,
            profile.id
          );
          setIsCoordinator(hasCoordRole);
        }
      } catch (err) {
        console.error("Failed to load project details:", err);
        setActionError(err instanceof Error ? err.message : "Failed to load project workspace");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [projectId, profile?.id, refreshNonce]);

  const isProjectLead =
    profile?.id === project?.project_lead_profile_id ||
    members.some((m) => m.profile_id === profile?.id && m.role === "PROJECT_LEAD" && m.is_active);

  const isManager = roleCode === "ADMIN" || roleCode === "INNOVATION_MANAGER";

  const isCoordinatorOrLead = isManager || isProjectLead || isCoordinator;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedProfileId) return;

    setSubmittingMember(true);
    setActionError(null);
    try {
      await addProjectMember(projectId, selectedProfileId, selectedRole);
      setActionSuccess("Team member added successfully.");
      setAddMemberOpen(false);
      setSelectedProfileId("");
      setSelectedRole("MEMBER");
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Add member error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: ProjectMemberRole) => {
    setProcessingMemberId(memberId);
    setActionError(null);
    try {
      await updateProjectMemberRole(memberId, newRole);
      setActionSuccess("Member role updated successfully.");
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Update role error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleDeactivateMember = async (memberId: string, memberProfileId: string) => {
    if (memberProfileId === project?.project_lead_profile_id) {
      setActionError("Cannot remove the active Project Lead. Please assign a new Project Lead first.");
      return;
    }

    if (!confirm("Are you sure you want to remove this member from the project workspace?")) {
      return;
    }

    setProcessingMemberId(memberId);
    setActionError(null);
    try {
      await deactivateProjectMember(memberId);
      setActionSuccess("Member removed from workspace.");
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Deactivate member error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleAssignLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedNewLead) return;

    setSubmittingLead(true);
    setActionError(null);
    try {
      await assignProjectLead(projectId, selectedNewLead);
      setActionSuccess("Project Lead reassigned successfully.");
      setLeadModalOpen(false);
      setSelectedNewLead("");
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Assign lead error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to assign lead.");
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleEditWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !editTitle.trim()) return;

    setSubmittingEdit(true);
    setActionError(null);
    try {
      await updateProjectWorkspace(projectId, {
        projectTitle: editTitle,
        projectSummary: editSummary,
      });
      setActionSuccess("Project details updated successfully.");
      setEditOpen(false);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Edit workspace error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to update project details.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!projectId || !targetStatus) return;

    setSubmittingStatus(true);
    setActionError(null);
    try {
      await updateProjectStatus(projectId, targetStatus);
      setActionSuccess(`Project status changed to ${targetStatus}.`);
      setStatusModalOpen(false);
      setTargetStatus(null);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Status transition error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to change project status.");
    } finally {
      setSubmittingStatus(false);
    }
  };

  const getStatusBadge = (status: ProjectWorkspaceStatus) => {
    switch (status) {
      case "FORMING_TEAM":
        return <Badge variant="sky">Forming Team</Badge>;
      case "ACTIVE":
        return <Badge variant="emerald">Active</Badge>;
      case "PAUSED":
        return <Badge variant="amber">Paused</Badge>;
      case "COMPLETED":
        return <Badge variant="teal">Completed</Badge>;
      case "ARCHIVED":
        return <Badge variant="default">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading project workspace...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <EmptyState
          title="Project Workspace Not Found"
          description="The requested project workspace does not exist or you do not have permission to view it."
          action={
            <Button
              onClick={() => {
                void navigate("/app/university/challenges");
              }}
            >
              Back to Challenges
            </Button>
          }
        />
      </div>
    );
  }

  const activeMembersList = members.filter((m) => m.is_active);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div>
        <Link
          to="/app/university/challenges"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Challenges &amp; Invitations
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {project.project_title}
              </h1>
              {getStatusBadge(project.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              {project.institution.name} · Created on{" "}
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCoordinatorOrLead && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="text-xs h-9 gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Details
                </Button>

                {project.status === "FORMING_TEAM" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setTargetStatus("ACTIVE");
                      setStatusModalOpen(true);
                    }}
                    className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Launch / Activate Workspace
                  </Button>
                )}

                {project.status === "ACTIVE" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetStatus("PAUSED");
                        setStatusModalOpen(true);
                      }}
                      className="text-xs h-9 gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> Pause Workspace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetStatus("COMPLETED");
                        setStatusModalOpen(true);
                      }}
                      className="text-xs h-9 gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark Completed
                    </Button>
                  </>
                )}

                {project.status === "PAUSED" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setTargetStatus("ACTIVE");
                      setStatusModalOpen(true);
                    }}
                    className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Resume Workspace
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Challenge
                </p>
                <h4 className="text-sm font-bold text-foreground mt-0.5 line-clamp-1">
                  {project.challenge.title}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Category: {project.challenge.category.replace(/_/g, " ")}
                </p>
              </div>
              <Layers className="w-6 h-6 text-primary/60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Project Lead
                </p>
                <h4 className="text-sm font-bold text-foreground mt-0.5">
                  {project.project_lead?.full_name || "Unassigned"}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {project.project_lead?.email || "No email"}
                </p>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-600/70 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Team Members
                </p>
                <h4 className="text-xl font-black text-foreground mt-0.5">
                  {activeMembersList.length}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Institution: {project.institution.name}
                </p>
              </div>
              <Users className="w-6 h-6 text-sky-600/70 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Box */}
      {project.project_summary && (
        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Project Summary &amp; Research Scope
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {project.project_summary}
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-border flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("team")}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "team"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Project Team ({activeMembersList.length})
        </button>
        <button
          onClick={() => setActiveTab("challenge")}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "challenge"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Challenge Scope &amp; Requirements
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "activity"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Activity Log ({activity.length})
        </button>
      </div>

      {/* Tab 1: Project Team */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Institutional Research Team</h3>
              <p className="text-xs text-muted-foreground">
                Manage roles, faculty leads, research assistants, and student innovators.
              </p>
            </div>
            {isCoordinatorOrLead && (
              <div className="flex items-center gap-2">
                {activeMembersList.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLeadModalOpen(true)}
                    className="text-xs h-8 gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Reassign Lead
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setAddMemberOpen(true)}
                  className="text-xs h-8 gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Team Member
                </Button>
              </div>
            )}
          </div>

          <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/70">
                <tr>
                  <th className="p-3">Member Name &amp; Email</th>
                  <th className="p-3">Project Role</th>
                  <th className="p-3">Joined Date</th>
                  <th className="p-3">Status</th>
                  {isCoordinatorOrLead && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activeMembersList.map((member) => {
                  const isLead = member.role === "PROJECT_LEAD";
                  const isProcessing = processingMemberId === member.id;

                  return (
                    <tr key={member.id} className="hover:bg-surface/50 transition-colors">
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              {member.profile.full_name}
                              {isLead && (
                                <Badge variant="emerald" size="sm" className="font-mono">
                                  LEAD
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {member.profile.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {isCoordinatorOrLead && !isLead ? (
                          <select
                            disabled={isProcessing}
                            value={member.role}
                            onChange={(e) => {
                              void handleUpdateRole(member.id, e.target.value as ProjectMemberRole);
                            }}
                            aria-label={`Update role for ${member.profile.full_name}`}
                            className="text-xs border border-border rounded-lg bg-surface px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="FACULTY">Faculty</option>
                            <option value="RESEARCHER">Researcher</option>
                            <option value="STUDENT">Student</option>
                            <option value="MEMBER">Member</option>
                          </select>
                        ) : (
                          <Badge variant="outline" size="sm">
                            {member.role.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      </td>
                      {isCoordinatorOrLead && (
                        <td className="p-3 text-right">
                          {!isLead && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => {
                                void handleDeactivateMember(member.id, member.profile_id);
                              }}
                              className="text-[11px] h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Challenge Details */}
      {activeTab === "challenge" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">
              {project.challenge.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Scope and specifications provided by the Innovation Management Office
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Problem Statement</h4>
              <p className="text-muted-foreground leading-relaxed">
                {project.challenge.problem_statement}
              </p>
            </div>

            {project.challenge.objectives && project.challenge.objectives.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Objectives</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {project.challenge.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            {project.challenge.expected_outcomes && project.challenge.expected_outcomes.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Expected Outcomes</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {project.challenge.expected_outcomes.map((out, i) => (
                    <li key={i}>{out}</li>
                  ))}
                </ul>
              </div>
            )}

            {project.challenge.required_domains && project.challenge.required_domains.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Required Domains</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {project.challenge.required_domains.map((dom, i) => (
                    <Badge key={i} variant="outline" size="sm">
                      {dom}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Activity Timeline */}
      {activeTab === "activity" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Project Timeline &amp; Audit Trail</h3>
          {activity.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No activity logged yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {activity.map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Clock className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-card border border-border/80 rounded-xl p-3 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-foreground">
                        {item.actor.full_name}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Add Project Team Member"
        description={`Add a verified researcher or faculty member from ${project.institution.name} to this workspace.`}
      >
        <form
          onSubmit={(e) => {
            void handleAddMember(e);
          }}
          className="space-y-4 pt-2"
        >
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Select Institution Affiliate
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              required
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose Member --</option>
              {availableMembers
                .filter((m) => !m.is_already_member)
                .map((m) => (
                  <option key={m.profile_id} value={m.profile_id}>
                    {m.full_name} ({m.email}) {m.role_title ? `· ${m.role_title}` : ""}
                  </option>
                ))}
            </select>
            {availableMembers.filter((m) => !m.is_already_member).length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                All registered profiles for this institution are already members of this project.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Assign Project Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="FACULTY">Faculty</option>
              <option value="RESEARCHER">Researcher</option>
              <option value="STUDENT">Student</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddMemberOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingMember || !selectedProfileId}
            >
              {submittingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Add to Workspace
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Workspace Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Project Workspace"
        description="Update the working title and research summary for this project."
      >
        <form
          onSubmit={(e) => {
            void handleEditWorkspace(e);
          }}
          className="space-y-4 pt-2"
        >
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Research &amp; Project Summary
            </label>
            <textarea
              rows={4}
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="Outline the methodology, initial thoughts, team responsibilities..."
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingEdit || !editTitle.trim()}
            >
              {submittingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reassign Lead Dialog */}
      <Dialog
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title="Reassign Project Lead"
        description="Select an active team member to assume the primary Project Lead role."
      >
        <form
          onSubmit={(e) => {
            void handleAssignLead(e);
          }}
          className="space-y-4 pt-2"
        >
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              New Project Lead
            </label>
            <select
              value={selectedNewLead}
              onChange={(e) => setSelectedNewLead(e.target.value)}
              required
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose Active Team Member --</option>
              {activeMembersList
                .filter((m) => m.profile_id !== project.project_lead_profile_id)
                .map((m) => (
                  <option key={m.profile_id} value={m.profile_id}>
                    {m.profile.full_name} ({m.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingLead || !selectedNewLead}
            >
              {submittingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Change Status to ${targetStatus}`}
        description={`Are you sure you want to transition this project workspace from ${project.status} to ${targetStatus}?`}
      >
        <div className="space-y-4 pt-2 text-xs text-muted-foreground">
          {targetStatus === "ACTIVE" && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
              <p className="font-semibold mb-1">Activation Requirement Check:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Project Lead must be assigned (Current: {project.project_lead?.full_name || "None"})</li>
                <li>At least 1 active team member (Current active: {activeMembersList.length})</li>
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingStatus}
              onClick={() => {
                void handleStatusTransition();
              }}
            >
              {submittingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirm Transition
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
