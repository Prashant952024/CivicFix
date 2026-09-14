import { useEffect, useState, useMemo } from "react";
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
  Users,
  X,
  GraduationCap,
  Briefcase,
  BookOpen,
  Search,
  Sparkles,
  Plus,
  FileText,
  FlaskConical,
  LayoutGrid,
  List,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ResearchPrototypeWorkspace } from "@/components/research-workspace/research-prototype-workspace";
import { TeamMemberCard } from "@/components/projects/team-member-card";
import { TeamMemberTable } from "@/components/projects/team-member-table";
import { TeamMemberProfileDialog } from "@/components/projects/team-member-profile-dialog";
import {
  fetchProjectById,
  fetchProjectMembers,
  fetchProjectActivity,
  updateProjectMemberRole,
  deactivateProjectMember,
  reactivateProjectMember,
  addResearchTeamMember,
  updateResearchTeamMember,
  assignProjectLead,
  updateProjectStatus,
  updateProjectWorkspace,
  checkUserIsInstitutionCoordinator,
  type ChallengeProjectWithDetails,
  type ChallengeProjectMemberWithProfile,
  type ChallengeProjectActivityWithActor,
  type ResearchMemberInput,
} from "@/lib/projects";
import {
  fetchProjectProposals,
  type ResearchProposalWithDetails,
} from "@/lib/proposals";
import type { ProjectMemberRole, ProjectMemberType, ProjectWorkspaceStatus } from "@/types/database";

export function UniversityProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { profile, roleCode } = useAppSession();
  const navigate = useNavigate();

  const [project, setProject] = useState<ChallengeProjectWithDetails | null>(null);
  const [members, setMembers] = useState<ChallengeProjectMemberWithProfile[]>([]);
  const [activity, setActivity] = useState<ChallengeProjectActivityWithActor[]>([]);
  const [currentProposal, setCurrentProposal] = useState<ResearchProposalWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"team" | "proposal" | "research" | "challenge" | "activity">("team");

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add Member Modal State
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [submittingMember, setSubmittingMember] = useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<ChallengeProjectMemberWithProfile | null>(null);
  const [submittingMemberEdit, setSubmittingMemberEdit] = useState(false);

  // Form Fields State (shared structure for Add & Edit)
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMemberType, setFormMemberType] = useState<ProjectMemberType>("STUDENT");
  const [formRole, setFormRole] = useState<ProjectMemberRole>("STUDENT");
  const [formDesignation, setFormDesignation] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formOrganization, setFormOrganization] = useState("");
  const [formAcademicProgram, setFormAcademicProgram] = useState("B.Tech");
  const [formAcademicYear, setFormAcademicYear] = useState("3rd Year");
  const [formAcademicLevel, setFormAcademicLevel] = useState("Undergraduate");
  const [formSpecialization, setFormSpecialization] = useState("");
  const [formExpectedGraduation, setFormExpectedGraduation] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formResearchProfileUrl, setFormResearchProfileUrl] = useState("");
  const [formLinkedinUrl, setFormLinkedinUrl] = useState("");
  const [formWebsiteUrl, setFormWebsiteUrl] = useState("");
  const [formPrimaryExpertise, setFormPrimaryExpertise] = useState("");
  const [formSecondaryExpertise, setFormSecondaryExpertise] = useState("");
  const [formResearchAreas, setFormResearchAreas] = useState("");
  const [formTechnicalSkills, setFormTechnicalSkills] = useState("");
  const [formTechnologies, setFormTechnologies] = useState("");
  const [formProjectResponsibility, setFormProjectResponsibility] = useState("");
  const [formProjectContribution, setFormProjectContribution] = useState("");
  const [formBio, setFormBio] = useState("");

  // Roster Filter & Search
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [rosterTab, setRosterTab] = useState<"ACTIVE" | "FORMER" | "ALL">("ACTIVE");
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [viewingProfileMember, setViewingProfileMember] = useState<ChallengeProjectMemberWithProfile | null>(null);

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

        const [membersData, activityData, proposalsData] = await Promise.all([
          fetchProjectMembers(projectId),
          fetchProjectActivity(projectId),
          fetchProjectProposals(projectId),
        ]);

        if (cancelled) return;
        setMembers(membersData);
        setActivity(activityData);
        if (proposalsData.length > 0) {
          setCurrentProposal(proposalsData[0]);
        } else {
          setCurrentProposal(null);
        }

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

  const activeMembersList = useMemo(() => members.filter((m) => m.is_active), [members]);
  const inactiveMembersList = useMemo(() => members.filter((m) => !m.is_active), [members]);

  // Filtered members based on search, status tab, and role filter
  const displayedMembers = useMemo(() => {
    let baseList = members;
    if (rosterTab === "ACTIVE") baseList = activeMembersList;
    else if (rosterTab === "FORMER") baseList = inactiveMembersList;

    if (roleCategoryFilter !== "ALL") {
      baseList = baseList.filter((m) => {
        if (roleCategoryFilter === "FACULTY") return m.member_type === "FACULTY" || m.role === "FACULTY";
        if (roleCategoryFilter === "RESEARCHER") return m.member_type === "RESEARCHER" || m.role === "RESEARCHER";
        if (roleCategoryFilter === "STUDENT") return m.member_type === "STUDENT" || m.role === "STUDENT";
        if (roleCategoryFilter === "TECHNICAL") return ["ENGINEER", "TECHNICAL_MEMBER", "DATA_SCIENTIST"].includes(m.role);
        if (roleCategoryFilter === "DATA_SCIENTIST") return m.role === "DATA_SCIENTIST";
        if (roleCategoryFilter === "DOMAIN_EXPERT") return m.role === "DOMAIN_EXPERT";
        return true;
      });
    }

    const q = teamSearchQuery.trim().toLowerCase();
    if (!q) return baseList;

    return baseList.filter((m) => {
      const name = (m.member_name || m.profile?.full_name || "").toLowerCase();
      const email = (m.member_email || m.profile?.email || "").toLowerCase();
      const dept = (m.department || "").toLowerCase();
      const desig = (m.designation || "").toLowerCase();
      const role = m.role.toLowerCase();
      const type = (m.member_type || "").toLowerCase();
      const primaryExp = (m.primary_expertise || "").toLowerCase();
      const secondaryExp = (m.secondary_expertise || "").toLowerCase();
      const skills = (m.technical_skills || []).map((s) => s.toLowerCase()).join(" ");

      return (
        name.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        desig.includes(q) ||
        role.includes(q) ||
        type.includes(q) ||
        primaryExp.includes(q) ||
        secondaryExp.includes(q) ||
        skills.includes(q)
      );
    });
  }, [members, rosterTab, roleCategoryFilter, activeMembersList, inactiveMembersList, teamSearchQuery]);

  // Team Overview Statistics
  const teamStats = useMemo(() => {
    let leadCount = 0;
    let facultyCount = 0;
    let researcherCount = 0;
    let studentCount = 0;
    let staffCount = 0;

    const expertiseFrequency = new Map<string, number>();

    activeMembersList.forEach((m) => {
      if (m.role === "PROJECT_LEAD") leadCount++;
      else if (m.member_type === "FACULTY" || m.role === "FACULTY") facultyCount++;
      else if (m.member_type === "RESEARCHER" || m.role === "RESEARCHER") researcherCount++;
      else if (m.member_type === "STUDENT" || m.role === "STUDENT") studentCount++;
      else staffCount++;

      // Collect structured expertise
      const tokens: string[] = [];
      if (m.primary_expertise) tokens.push(m.primary_expertise.trim());
      if (m.secondary_expertise) tokens.push(m.secondary_expertise.trim());
      (m.technical_skills || []).forEach((s) => tokens.push(s.trim()));
      (m.research_domains || []).forEach((d) => tokens.push(d.trim()));
      (m.research_areas || []).forEach((a) => tokens.push(a.trim()));

      tokens.forEach((t) => {
        if (t.length > 1) {
          const cap = t.charAt(0).toUpperCase() + t.slice(1);
          expertiseFrequency.set(cap, (expertiseFrequency.get(cap) || 0) + 1);
        }
      });
    });

    const topSkills = Array.from(expertiseFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      total: activeMembersList.length,
      leadCount,
      facultyCount,
      researcherCount,
      studentCount,
      staffCount,
      topSkills,
    };
  }, [activeMembersList]);

  // Helper to reset form fields
  const resetFormFields = () => {
    setFormName("");
    setFormEmail("");
    setFormMemberType("STUDENT");
    setFormRole("STUDENT");
    setFormDesignation("");
    setFormDepartment("");
    setFormOrganization("");
    setFormAcademicProgram("B.Tech");
    setFormAcademicYear("3rd Year");
    setFormAcademicLevel("Undergraduate");
    setFormSpecialization("");
    setFormExpectedGraduation("");
    setFormExperience("");
    setFormResearchProfileUrl("");
    setFormLinkedinUrl("");
    setFormWebsiteUrl("");
    setFormPrimaryExpertise("");
    setFormSecondaryExpertise("");
    setFormResearchAreas("");
    setFormTechnicalSkills("");
    setFormTechnologies("");
    setFormProjectResponsibility("");
    setFormProjectContribution("");
    setFormBio("");
  };

  // Populate form for editing
  const openEditMemberModal = (member: ChallengeProjectMemberWithProfile) => {
    setEditingMember(member);
    setFormName(member.member_name || member.profile?.full_name || "");
    setFormEmail(member.member_email || member.profile?.email || "");
    setFormMemberType((member.member_type as ProjectMemberType) || "RESEARCHER");
    setFormRole(member.role);
    setFormDesignation(member.designation || "");
    setFormDepartment(member.department || "");
    setFormOrganization(member.organization || "");
    setFormAcademicProgram(member.academic_program || "B.Tech");
    setFormAcademicYear(member.academic_year || "3rd Year");
    setFormAcademicLevel(member.academic_level || "Undergraduate");
    setFormSpecialization(member.specialization || "");
    setFormExpectedGraduation(member.expected_graduation_year || "");
    setFormExperience(member.years_of_experience ? String(member.years_of_experience) : "");
    setFormResearchProfileUrl(member.research_profile_url || "");
    setFormLinkedinUrl(member.linkedin_url || "");
    setFormWebsiteUrl(member.website_url || "");
    setFormPrimaryExpertise(member.primary_expertise || "");
    setFormSecondaryExpertise(member.secondary_expertise || "");
    setFormResearchAreas((member.research_areas || []).join(", "));
    setFormTechnicalSkills((member.technical_skills || []).join(", "));
    setFormTechnologies((member.technologies || []).join(", "));
    setFormProjectResponsibility(member.project_responsibility || "");
    setFormProjectContribution(member.project_contribution || "");
    setFormBio(member.professional_bio || "");
  };

  // Handler: Add Research Team Member
  const handleAddResearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    if (!formName.trim()) {
      setActionError("Full Name is required.");
      return;
    }

    if (!formEmail.trim() || !formEmail.includes("@")) {
      setActionError("A valid email address is required.");
      return;
    }

    if (!formPrimaryExpertise.trim()) {
      setActionError("Primary Expertise is required.");
      return;
    }

    if (!formProjectResponsibility.trim()) {
      setActionError("Project Responsibility is required.");
      return;
    }

    setSubmittingMember(true);
    setActionError(null);

    const parseTags = (str: string) =>
      str
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const inputData: ResearchMemberInput = {
      member_name: formName.trim(),
      member_email: formEmail.trim().toLowerCase(),
      member_type: formMemberType,
      role: formRole,
      designation: formDesignation.trim() || null,
      department: formDepartment.trim() || null,
      organization: formOrganization.trim() || null,
      institution_name: project?.institution.name || null,
      academic_program: formMemberType === "STUDENT" ? formAcademicProgram : null,
      academic_year: formMemberType === "STUDENT" ? formAcademicYear : null,
      academic_level: formMemberType === "STUDENT" ? formAcademicLevel : null,
      specialization: formSpecialization.trim() || null,
      expected_graduation_year: formExpectedGraduation.trim() || null,
      years_of_experience: formExperience ? Number(formExperience) : null,
      primary_expertise: formPrimaryExpertise.trim() || null,
      secondary_expertise: formSecondaryExpertise.trim() || null,
      expertise: `${formPrimaryExpertise.trim()}${formSecondaryExpertise.trim() ? " · " + formSecondaryExpertise.trim() : ""}`,
      research_areas: parseTags(formResearchAreas),
      technical_skills: parseTags(formTechnicalSkills),
      technologies: parseTags(formTechnologies),
      project_responsibility: formProjectResponsibility.trim() || null,
      project_contribution: formProjectContribution.trim() || null,
      professional_bio: formBio.trim() || null,
      research_profile_url: formResearchProfileUrl.trim() || null,
      linkedin_url: formLinkedinUrl.trim() || null,
      website_url: formWebsiteUrl.trim() || null,
    };

    try {
      await addResearchTeamMember(projectId, inputData, profile?.id);
      setActionSuccess(`Added ${inputData.member_name} to the research team.`);
      setAddMemberOpen(false);
      resetFormFields();
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Add team member error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to add research team member.");
    } finally {
      setSubmittingMember(false);
    }
  };

  // Handler: Update Research Team Member Details
  const handleUpdateResearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    if (!formName.trim()) {
      setActionError("Full Name is required.");
      return;
    }

    if (!formEmail.trim() || !formEmail.includes("@")) {
      setActionError("A valid email address is required.");
      return;
    }

    setSubmittingMemberEdit(true);
    setActionError(null);

    const parseTags = (str: string) =>
      str
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const updates: Partial<ResearchMemberInput> = {
      member_name: formName.trim(),
      member_email: formEmail.trim().toLowerCase(),
      member_type: formMemberType,
      role: formRole,
      designation: formDesignation.trim() || null,
      department: formDepartment.trim() || null,
      organization: formOrganization.trim() || null,
      academic_program: formMemberType === "STUDENT" ? formAcademicProgram : null,
      academic_year: formMemberType === "STUDENT" ? formAcademicYear : null,
      academic_level: formMemberType === "STUDENT" ? formAcademicLevel : null,
      specialization: formSpecialization.trim() || null,
      expected_graduation_year: formExpectedGraduation.trim() || null,
      years_of_experience: formExperience ? Number(formExperience) : null,
      primary_expertise: formPrimaryExpertise.trim() || null,
      secondary_expertise: formSecondaryExpertise.trim() || null,
      expertise: `${formPrimaryExpertise.trim()}${formSecondaryExpertise.trim() ? " · " + formSecondaryExpertise.trim() : ""}`,
      research_areas: parseTags(formResearchAreas),
      technical_skills: parseTags(formTechnicalSkills),
      technologies: parseTags(formTechnologies),
      project_responsibility: formProjectResponsibility.trim() || null,
      project_contribution: formProjectContribution.trim() || null,
      professional_bio: formBio.trim() || null,
      research_profile_url: formResearchProfileUrl.trim() || null,
      linkedin_url: formLinkedinUrl.trim() || null,
      website_url: formWebsiteUrl.trim() || null,
    };

    try {
      await updateResearchTeamMember(editingMember.id, updates);
      setActionSuccess(`Updated profile for ${formName.trim()}.`);
      setEditingMember(null);
      resetFormFields();
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Update team member error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to update research team member.");
    } finally {
      setSubmittingMemberEdit(false);
    }
  };

  // Handler: Update Role quickly
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

  // Handler: Deactivate Member
  const handleDeactivateMember = async (member: ChallengeProjectMemberWithProfile) => {
    const isLead = member.role === "PROJECT_LEAD";
    if (isLead) {
      setActionError("Cannot remove the active Project Lead. Please assign a new Project Lead first.");
      return;
    }

    const memberDisplayName = member.member_name || member.profile?.full_name || "this member";
    if (!confirm(`Are you sure you want to remove ${memberDisplayName} from the active project workspace?`)) {
      return;
    }

    setProcessingMemberId(member.id);
    setActionError(null);
    try {
      await deactivateProjectMember(member.id);
      setActionSuccess(`${memberDisplayName} moved to former team members.`);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Deactivate member error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setProcessingMemberId(null);
    }
  };

  // Handler: Reactivate Member
  const handleReactivateMember = async (member: ChallengeProjectMemberWithProfile) => {
    const memberDisplayName = member.member_name || member.profile?.full_name || "this member";
    setProcessingMemberId(member.id);
    setActionError(null);
    try {
      await reactivateProjectMember(member.id);
      setActionSuccess(`Reactivated ${memberDisplayName} in the active project team.`);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error("Reactivate member error:", err);
      setActionError(err instanceof Error ? err.message : "Failed to reactivate member.");
    } finally {
      setProcessingMemberId(null);
    }
  };

  // Handler: Reassign Project Lead
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

  // Handler: Edit Workspace
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

  // Handler: Status State Machine Transition
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
                  Institution Lead
                </p>
                <h4 className="text-sm font-bold text-foreground mt-0.5 line-clamp-1">
                  {project.project_lead?.full_name || "Unassigned"}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {project.project_lead?.email || "Pending Coordinator Designation"}
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
                  Active Team Roster
                </p>
                <h4 className="text-sm font-bold text-foreground mt-0.5">
                  {activeMembersList.length} Research Members
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {teamStats.facultyCount} Faculty · {teamStats.studentCount} Students · {teamStats.researcherCount} Researchers
                </p>
              </div>
              <Users className="w-6 h-6 text-primary/60 shrink-0" />
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
          Research Team ({activeMembersList.length})
        </button>
        <button
          onClick={() => setActiveTab("proposal")}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "proposal"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Research Proposal {currentProposal ? `(v${currentProposal.version_number})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("research")}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "research"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Research &amp; Prototype
          {currentProposal?.status === "APPROVED" ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[9px] px-1 py-0 ml-1">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 text-muted-foreground">
              Locked
            </Badge>
          )}
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

      {/* Tab 1: Research Team */}
      {activeTab === "team" && (
        <div className="space-y-5">
          {/* Top Actions & Sub-Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Institutional Research Team</h3>
              <p className="text-xs text-muted-foreground">
                Document researchers, academic leads, faculty advisors, and student innovators working on this challenge.
              </p>
            </div>
            {isCoordinatorOrLead && (
              <div className="flex items-center gap-2">
                {activeMembersList.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLeadModalOpen(true)}
                    className="text-xs h-9 gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Reassign Lead
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    resetFormFields();
                    setAddMemberOpen(true);
                  }}
                  className="text-xs h-9 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> + Add Team Member
                </Button>
              </div>
            )}
          </div>

          {/* Team Overview Statistics Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 bg-surface/70 border border-border/80 rounded-2xl p-4 shadow-xs">
            <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-border/70 pb-3 lg:pb-0 lg:pr-4">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Composition
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{teamStats.total}</span>
                <span className="text-xs text-muted-foreground">Active Members</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {teamStats.leadCount > 0 && (
                  <Badge variant="amber" size="sm">
                    {teamStats.leadCount} Lead
                  </Badge>
                )}
                {teamStats.facultyCount > 0 && (
                  <Badge variant="violet" size="sm">
                    {teamStats.facultyCount} Faculty
                  </Badge>
                )}
                {teamStats.researcherCount > 0 && (
                  <Badge variant="sky" size="sm">
                    {teamStats.researcherCount} Researcher
                  </Badge>
                )}
                {teamStats.studentCount > 0 && (
                  <Badge variant="teal" size="sm">
                    {teamStats.studentCount} Student
                  </Badge>
                )}
                {teamStats.staffCount > 0 && (
                  <Badge variant="info" size="sm">
                    {teamStats.staffCount} Staff/Engg
                  </Badge>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 lg:pl-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Structured Expertise Coverage
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Derived from active team capabilities
                </span>
              </div>
              {teamStats.topSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Add research members with structured technical skills and domain expertise to populate team coverage.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teamStats.topSkills.map(([skill, count]) => (
                    <div
                      key={skill}
                      className="inline-flex items-center gap-1.5 bg-card border border-border/80 rounded-xl px-2.5 py-1 text-xs shadow-2xs"
                    >
                      <span className="font-semibold text-foreground">{skill}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                        {count} {count === 1 ? "member" : "members"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Roster Controls: Search, Tabs, Role Filters & View Mode */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/80 text-xs w-fit">
                <button
                  onClick={() => setRosterTab("ACTIVE")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    rosterTab === "ACTIVE"
                      ? "bg-card text-foreground font-bold shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground font-medium"
                  }`}
                >
                  Active Roster ({activeMembersList.length})
                </button>
                <button
                  onClick={() => setRosterTab("FORMER")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    rosterTab === "FORMER"
                      ? "bg-card text-foreground font-bold shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground font-medium"
                  }`}
                >
                  Former Members ({inactiveMembersList.length})
                </button>
                <button
                  onClick={() => setRosterTab("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    rosterTab === "ALL"
                      ? "bg-card text-foreground font-bold shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground font-medium"
                  }`}
                >
                  All Records ({members.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <label htmlFor="team-search-query" className="sr-only">
                    Search team members, skills, department
                  </label>
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                  <input
                    id="team-search-query"
                    name="teamSearchQuery"
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search members, skills, dept..."
                    aria-label="Search members, skills, dept..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  {teamSearchQuery && (
                    <button
                      onClick={() => setTeamSearchQuery("")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* View Switcher (Grid vs Table) */}
                <div className="flex items-center bg-muted/40 p-0.5 rounded-xl border border-border/80 shrink-0">
                  <button
                    onClick={() => setViewMode("GRID")}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === "GRID"
                        ? "bg-card text-primary font-bold shadow-xs border border-border/70"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Card / Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("TABLE")}
                    className={`p-1.5 rounded-lg transition-all ${
                      viewMode === "TABLE"
                        ? "bg-card text-primary font-bold shadow-xs border border-border/70"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Directory / Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Role Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
                Filter:
              </span>
              {[
                { id: "ALL", label: "All Roles" },
                { id: "FACULTY", label: "Faculty" },
                { id: "RESEARCHER", label: "Researchers" },
                { id: "STUDENT", label: "Students" },
                { id: "TECHNICAL", label: "Engineers & Tech" },
                { id: "DATA_SCIENTIST", label: "Data Scientists" },
                { id: "DOMAIN_EXPERT", label: "Domain Experts" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setRoleCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 text-[11px] border ${
                    roleCategoryFilter === cat.id
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                      : "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/40"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              {(teamSearchQuery || roleCategoryFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setTeamSearchQuery("");
                    setRoleCategoryFilter("ALL");
                  }}
                  className="text-[11px] text-primary hover:underline ml-1 shrink-0 font-semibold"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Member Directory Content */}
          {displayedMembers.length === 0 ? (
            <div className="p-10 text-center border border-dashed rounded-2xl bg-card/40 space-y-2">
              <Users className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">
                {teamSearchQuery || roleCategoryFilter !== "ALL"
                  ? "No matching team members found"
                  : "No team members recorded"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {teamSearchQuery || roleCategoryFilter !== "ALL"
                  ? "Try resetting your search filters to see all registered researchers."
                  : "Add professors, researchers, or student innovators to form your project team."}
              </p>
              {isCoordinatorOrLead && !teamSearchQuery && roleCategoryFilter === "ALL" && (
                <Button
                  size="sm"
                  onClick={() => {
                    resetFormFields();
                    setAddMemberOpen(true);
                  }}
                  className="text-xs mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add First Team Member
                </Button>
              )}
            </div>
          ) : viewMode === "GRID" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onViewProfile={(m) => setViewingProfileMember(m)}
                  onEdit={openEditMemberModal}
                  onUpdateRole={(id, r) => {
                    void handleUpdateRole(id, r);
                  }}
                  onDeactivate={(m) => {
                    void handleDeactivateMember(m);
                  }}
                  onReactivate={(m) => {
                    void handleReactivateMember(m);
                  }}
                  isCoordinatorOrLead={isCoordinatorOrLead}
                  isProcessing={processingMemberId === member.id}
                />
              ))}
            </div>
          ) : (
            <TeamMemberTable
              members={displayedMembers}
              onViewProfile={(m) => setViewingProfileMember(m)}
              onEdit={openEditMemberModal}
              onUpdateRole={(id, r) => {
                void handleUpdateRole(id, r);
              }}
              onDeactivate={(m) => {
                void handleDeactivateMember(m);
              }}
              onReactivate={(m) => {
                void handleReactivateMember(m);
              }}
              isCoordinatorOrLead={isCoordinatorOrLead}
              processingMemberId={processingMemberId}
            />
          )}
        </div>
      )}

      {/* Tab 2: Challenge Scope */}
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

      {/* Tab 4: Research Proposal */}
      {activeTab === "proposal" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Formal Research Proposal</h3>
              <p className="text-xs text-muted-foreground">
                Structured research methodology, technical specifications, resource requests, milestones, and deliverables.
              </p>
            </div>
            <Button
              onClick={() => { void navigate(`/app/university/projects/${project.id}/proposal`); }}
              className="gap-1.5 text-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              {currentProposal ? "Open Proposal Workspace" : "Create Research Proposal"}
            </Button>
          </div>

          {!currentProposal ? (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">No Research Proposal Initialized Yet</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Once your research team roster is formed, initialize your formal research proposal to submit your research plan to the Innovation Manager.
                </p>
                {isCoordinatorOrLead && (
                  <Button
                    onClick={() => { void navigate(`/app/university/projects/${project.id}/proposal`); }}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Initialize Proposal Draft
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold">
                      Version {currentProposal.version_number}
                    </Badge>
                    {currentProposal.status === "DRAFT" && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">Draft</Badge>
                    )}
                    {currentProposal.status === "SUBMITTED" && (
                      <Badge className="bg-sky-100 text-sky-800 border-sky-300">Submitted • Awaiting Review</Badge>
                    )}
                    {currentProposal.status === "UNDER_REVIEW" && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">Under Review</Badge>
                    )}
                    {currentProposal.status === "REQUESTED_REVISION" && (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300">Revision Requested</Badge>
                    )}
                    {currentProposal.status === "RESUBMITTED" && (
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Resubmitted</Badge>
                    )}
                    {currentProposal.status === "APPROVED" && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Approved ✓</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Last updated: {new Date(currentProposal.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Manager Feedback Alert if Revision Requested */}
                {currentProposal.status === "REQUESTED_REVISION" && currentProposal.review_feedback && (
                  <div className="p-3.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl text-xs text-orange-900 dark:text-orange-200 space-y-1">
                    <span className="font-bold block text-orange-950 dark:text-orange-100">
                      Innovation Manager Feedback:
                    </span>
                    <p className="whitespace-pre-wrap">{currentProposal.review_feedback}</p>
                  </div>
                )}

                {/* Objective excerpt */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground block">Project Objective:</span>
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                    {currentProposal.project_objective || <em className="text-muted-foreground">No objective statement drafted yet.</em>}
                  </p>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-t border-border text-center text-xs">
                  <div className="p-2 bg-muted/40 rounded-lg">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Questions</span>
                    <span className="font-bold text-foreground">
                      {Array.isArray(currentProposal.research_questions) ? currentProposal.research_questions.length : 0}
                    </span>
                  </div>
                  <div className="p-2 bg-muted/40 rounded-lg">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Resources</span>
                    <span className="font-bold text-foreground">
                      {Array.isArray(currentProposal.required_resources) ? currentProposal.required_resources.length : 0}
                    </span>
                  </div>
                  <div className="p-2 bg-muted/40 rounded-lg">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Milestones</span>
                    <span className="font-bold text-foreground">
                      {Array.isArray(currentProposal.milestones) ? currentProposal.milestones.length : 0}
                    </span>
                  </div>
                  <div className="p-2 bg-muted/40 rounded-lg">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Deliverables</span>
                    <span className="font-bold text-foreground">
                      {Array.isArray(currentProposal.deliverables) ? currentProposal.deliverables.length : 0}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => { void navigate(`/app/university/projects/${project.id}/proposal`); }}
                    className="gap-1.5 text-xs"
                  >
                    <span>Open Detailed Proposal Workspace</span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Research & Prototype Development Workspace */}
      {activeTab === "research" && project && (
        <div className="space-y-4">
          <ResearchPrototypeWorkspace
            projectId={project.id}
            isManager={false}
            onNavigateToTab={(t) => {
              if (t === "proposal") setActiveTab("proposal");
            }}
          />
        </div>
      )}

      {/* Dynamic Add Team Member Dialog */}
      <Dialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Add Research Team Member"
        description={`Record a researcher, faculty advisor, student innovator, or engineer contributing to ${project.institution.name}'s project workspace.`}
        maxWidth="2xl"
      >
        <form
          onSubmit={(e) => {
            void handleAddResearchMember(e);
          }}
          className="space-y-4 pt-2 text-xs"
        >
          {/* Section 1: Core Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-member-name" className="block text-xs font-semibold text-foreground mb-1">
                Full Name *
              </label>
              <input
                id="add-member-name"
                name="memberName"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Dr. Anil Kumar or Priya Singh"
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="add-member-email" className="block text-xs font-semibold text-foreground mb-1">
                Institutional Email *
              </label>
              <input
                id="add-member-email"
                name="memberEmail"
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="e.g. anil.kumar@university.edu"
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="add-member-type" className="block text-xs font-semibold text-foreground mb-1">
                Member Type *
              </label>
              <select
                id="add-member-type"
                name="memberType"
                value={formMemberType}
                onChange={(e) => {
                  const t = e.target.value as ProjectMemberType;
                  setFormMemberType(t);
                  if (t === "STUDENT") setFormRole("STUDENT");
                  else if (t === "FACULTY") setFormRole("FACULTY");
                  else if (t === "RESEARCHER") setFormRole("RESEARCHER");
                  else if (t === "PROFESSIONAL" || t === "TECHNICAL_STAFF") setFormRole("ENGINEER");
                }}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="RESEARCHER">Researcher</option>
                <option value="PROFESSIONAL">Professional / Industry Expert</option>
                <option value="TECHNICAL_STAFF">Technical Staff</option>
                <option value="OTHER">Other Contributor</option>
              </select>
            </div>

            <div>
              <label htmlFor="add-member-role" className="block text-xs font-semibold text-foreground mb-1">
                Project Role *
              </label>
              <select
                id="add-member-role"
                name="memberRole"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as ProjectMemberRole)}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="FACULTY">Faculty</option>
                <option value="RESEARCHER">Researcher</option>
                <option value="STUDENT">Student</option>
                <option value="TECHNICAL_MEMBER">Technical Member</option>
                <option value="DOMAIN_EXPERT">Domain Expert</option>
                <option value="DATA_SCIENTIST">Data Scientist</option>
                <option value="ENGINEER">Engineer</option>
                <option value="MEMBER">General Member</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Section 2: Dynamic Academic / Professional Fields */}
          <div className="p-3.5 rounded-xl bg-surface/70 border border-border/80 space-y-3">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              {formMemberType === "STUDENT" && <GraduationCap className="w-3.5 h-3.5 text-primary" />}
              {(formMemberType === "FACULTY" || formMemberType === "RESEARCHER") && (
                <BookOpen className="w-3.5 h-3.5 text-primary" />
              )}
              {(formMemberType === "PROFESSIONAL" || formMemberType === "TECHNICAL_STAFF") && (
                <Briefcase className="w-3.5 h-3.5 text-primary" />
              )}
              {formMemberType} Background &amp; Affiliation
            </h5>

            {/* STUDENT SECTION */}
            {formMemberType === "STUDENT" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="add-student-degree" className="block text-[11px] font-semibold text-foreground mb-1">
                    Degree / Program
                  </label>
                  <select
                    id="add-student-degree"
                    name="academicProgram"
                    value={formAcademicProgram}
                    onChange={(e) => setFormAcademicProgram(e.target.value)}
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="B.Sc">B.Sc</option>
                    <option value="M.Sc">M.Sc</option>
                    <option value="PhD">PhD</option>
                    <option value="MBA">MBA</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-student-department" className="block text-[11px] font-semibold text-foreground mb-1">
                    Department
                  </label>
                  <input
                    id="add-student-department"
                    name="department"
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Computer Science & Engg"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-student-year" className="block text-[11px] font-semibold text-foreground mb-1">
                    Current Year
                  </label>
                  <select
                    id="add-student-year"
                    name="academicYear"
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                    <option value="Final Year">Final Year</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-student-level" className="block text-[11px] font-semibold text-foreground mb-1">
                    Academic Level
                  </label>
                  <select
                    id="add-student-level"
                    name="academicLevel"
                    value={formAcademicLevel}
                    onChange={(e) => setFormAcademicLevel(e.target.value)}
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Doctoral">Doctoral</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-student-specialization" className="block text-[11px] font-semibold text-foreground mb-1">
                    Specialization
                  </label>
                  <input
                    id="add-student-specialization"
                    name="specialization"
                    type="text"
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    placeholder="e.g. AI & Machine Learning"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-student-graduation" className="block text-[11px] font-semibold text-foreground mb-1">
                    Expected Graduation
                  </label>
                  <input
                    id="add-student-graduation"
                    name="expectedGraduation"
                    type="text"
                    value={formExpectedGraduation}
                    onChange={(e) => setFormExpectedGraduation(e.target.value)}
                    placeholder="e.g. 2028"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* FACULTY SECTION */}
            {formMemberType === "FACULTY" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="add-faculty-designation" className="block text-[11px] font-semibold text-foreground mb-1">
                    Designation
                  </label>
                  <select
                    id="add-faculty-designation"
                    name="designation"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Designation --</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Head of Department">Head of Department</option>
                    <option value="Research Professor">Research Professor</option>
                    <option value="Visiting Faculty">Visiting Faculty</option>
                    <option value="Dean / Director">Dean / Director</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-faculty-department" className="block text-[11px] font-semibold text-foreground mb-1">
                    Department
                  </label>
                  <input
                    id="add-faculty-department"
                    name="department"
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Dept of Agricultural Engg"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-faculty-experience" className="block text-[11px] font-semibold text-foreground mb-1">
                    Years of Experience
                  </label>
                  <input
                    id="add-faculty-experience"
                    name="experienceYears"
                    type="number"
                    min="0"
                    max="60"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="add-faculty-research-areas" className="block text-[11px] font-semibold text-foreground mb-1">
                    Research Areas (comma separated)
                  </label>
                  <input
                    id="add-faculty-research-areas"
                    name="researchAreas"
                    type="text"
                    value={formResearchAreas}
                    onChange={(e) => setFormResearchAreas(e.target.value)}
                    placeholder="e.g. Hydrology, Precision Agriculture, Remote Sensing"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-faculty-research-url" className="block text-[11px] font-semibold text-foreground mb-1">
                    Research Profile URL
                  </label>
                  <input
                    id="add-faculty-research-url"
                    name="researchProfileUrl"
                    type="url"
                    value={formResearchProfileUrl}
                    onChange={(e) => setFormResearchProfileUrl(e.target.value)}
                    placeholder="e.g. Google Scholar or ORCID"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* RESEARCHER SECTION */}
            {formMemberType === "RESEARCHER" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="add-researcher-designation" className="block text-[11px] font-semibold text-foreground mb-1">
                    Designation
                  </label>
                  <select
                    id="add-researcher-designation"
                    name="designation"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Designation --</option>
                    <option value="Research Associate">Research Associate</option>
                    <option value="Research Scientist">Research Scientist</option>
                    <option value="Project Scientist">Project Scientist</option>
                    <option value="PhD Researcher">PhD Researcher</option>
                    <option value="Postdoctoral Researcher">Postdoctoral Researcher</option>
                    <option value="Research Fellow">Research Fellow</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-researcher-department" className="block text-[11px] font-semibold text-foreground mb-1">
                    Department / Research Center
                  </label>
                  <input
                    id="add-researcher-department"
                    name="department"
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Center for Water Resources"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-researcher-experience" className="block text-[11px] font-semibold text-foreground mb-1">
                    Years of Research Experience
                  </label>
                  <input
                    id="add-researcher-experience"
                    name="experienceYears"
                    type="number"
                    min="0"
                    max="50"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="add-researcher-specialization" className="block text-[11px] font-semibold text-foreground mb-1">
                    Specialization &amp; Research Focus
                  </label>
                  <input
                    id="add-researcher-specialization"
                    name="specialization"
                    type="text"
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    placeholder="e.g. Time-Series Forecasting & Sensor Calibration"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-researcher-research-url" className="block text-[11px] font-semibold text-foreground mb-1">
                    Research Profile URL
                  </label>
                  <input
                    id="add-researcher-research-url"
                    name="researchProfileUrl"
                    type="url"
                    value={formResearchProfileUrl}
                    onChange={(e) => setFormResearchProfileUrl(e.target.value)}
                    placeholder="e.g. Google Scholar / ORCID"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* PROFESSIONAL / TECHNICAL STAFF SECTION */}
            {(formMemberType === "PROFESSIONAL" || formMemberType === "TECHNICAL_STAFF") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="add-professional-designation" className="block text-[11px] font-semibold text-foreground mb-1">
                    Designation
                  </label>
                  <input
                    id="add-professional-designation"
                    name="designation"
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. IoT Systems Engineer"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-professional-organization" className="block text-[11px] font-semibold text-foreground mb-1">
                    Organization / Company
                  </label>
                  <input
                    id="add-professional-organization"
                    name="organization"
                    type="text"
                    value={formOrganization}
                    onChange={(e) => setFormOrganization(e.target.value)}
                    placeholder="e.g. Research Park Partner / Lab"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="add-professional-experience" className="block text-[11px] font-semibold text-foreground mb-1">
                    Years of Experience
                  </label>
                  <input
                    id="add-professional-experience"
                    name="experienceYears"
                    type="number"
                    min="0"
                    max="50"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    placeholder="e.g. 6"
                    className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Structured Capabilities & Expertise */}
          <div className="space-y-3">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
              Domain Expertise &amp; Technical Skillset
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-member-primary-expertise" className="block text-[11px] font-semibold text-foreground mb-1">
                  Primary Expertise *
                </label>
                <input
                  id="add-member-primary-expertise"
                  name="primaryExpertise"
                  type="text"
                  required
                  value={formPrimaryExpertise}
                  onChange={(e) => setFormPrimaryExpertise(e.target.value)}
                  placeholder="e.g. Hydrology or Embedded Systems"
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="add-member-secondary-expertise" className="block text-[11px] font-semibold text-foreground mb-1">
                  Secondary Expertise
                </label>
                <input
                  id="add-member-secondary-expertise"
                  name="secondaryExpertise"
                  type="text"
                  value={formSecondaryExpertise}
                  onChange={(e) => setFormSecondaryExpertise(e.target.value)}
                  placeholder="e.g. Water Resource Management"
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="add-member-technical-skills" className="block text-[11px] font-semibold text-foreground mb-1">
                  Technical Skills (comma separated)
                </label>
                <input
                  id="add-member-technical-skills"
                  name="technicalSkills"
                  type="text"
                  value={formTechnicalSkills}
                  onChange={(e) => setFormTechnicalSkills(e.target.value)}
                  placeholder="e.g. Python, TensorFlow, GIS, Embedded C"
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="add-member-technologies" className="block text-[11px] font-semibold text-foreground mb-1">
                  Technologies / Tools (comma separated)
                </label>
                <input
                  id="add-member-technologies"
                  name="technologies"
                  type="text"
                  value={formTechnologies}
                  onChange={(e) => setFormTechnologies(e.target.value)}
                  placeholder="e.g. QGIS, ArcGIS, Arduino, Raspberry Pi, AWS"
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Project-Specific Responsibilities */}
          <div className="space-y-3">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
              Project Execution &amp; Responsibilities
            </h5>

            <div>
              <label htmlFor="add-member-project-responsibility" className="block text-[11px] font-semibold text-foreground mb-1">
                Project Responsibility * (What will this person do?)
              </label>
              <textarea
                id="add-member-project-responsibility"
                name="projectResponsibility"
                required
                rows={2}
                value={formProjectResponsibility}
                onChange={(e) => setFormProjectResponsibility(e.target.value)}
                placeholder="e.g. Responsible for developing the predictive soil-moisture model and leading sensor calibration."
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            <div>
              <label htmlFor="add-member-project-contribution" className="block text-[11px] font-semibold text-foreground mb-1">
                Project Contribution / Deliverables (optional)
              </label>
              <input
                id="add-member-project-contribution"
                name="projectContribution"
                type="text"
                value={formProjectContribution}
                onChange={(e) => setFormProjectContribution(e.target.value)}
                placeholder="e.g. ML model architecture, hardware prototypes, field validation reports"
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="add-member-bio" className="block text-[11px] font-semibold text-foreground mb-1">
                Short Academic / Professional Bio (optional)
              </label>
              <textarea
                id="add-member-bio"
                name="bio"
                rows={2}
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                placeholder="e.g. Researcher specializing in IoT sensor design with 4 years experience in environmental telemetry."
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="add-member-linkedin" className="block text-[11px] font-semibold text-foreground mb-1">
                  LinkedIn URL (optional)
                </label>
                <input
                  id="add-member-linkedin"
                  name="linkedinUrl"
                  type="url"
                  value={formLinkedinUrl}
                  onChange={(e) => setFormLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="add-member-website" className="block text-[11px] font-semibold text-foreground mb-1">
                  Website / Portfolio URL (optional)
                </label>
                <input
                  id="add-member-website"
                  name="websiteUrl"
                  type="url"
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
              disabled={submittingMember}
              className="font-semibold bg-teal-600 hover:bg-teal-700 text-white"
            >
              {submittingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save &amp; Add Member
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog
        open={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title="Edit Research Team Member Profile"
        description={`Update academic records, responsibilities, or technical capabilities for ${formName}.`}
        maxWidth="2xl"
      >
        <form
          onSubmit={(e) => {
            void handleUpdateResearchMember(e);
          }}
          className="space-y-4 pt-2 text-xs"
        >
          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-member-name" className="block text-xs font-semibold text-foreground mb-1">
                Full Name *
              </label>
              <input
                id="edit-member-name"
                name="editMemberName"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="edit-member-email" className="block text-xs font-semibold text-foreground mb-1">
                Institutional Email *
              </label>
              <input
                id="edit-member-email"
                name="editMemberEmail"
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="edit-member-type" className="block text-xs font-semibold text-foreground mb-1">
                Member Type *
              </label>
              <select
                id="edit-member-type"
                name="editMemberType"
                value={formMemberType}
                onChange={(e) => setFormMemberType(e.target.value as ProjectMemberType)}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="RESEARCHER">Researcher</option>
                <option value="PROFESSIONAL">Professional / Industry Expert</option>
                <option value="TECHNICAL_STAFF">Technical Staff</option>
                <option value="OTHER">Other Contributor</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-member-role" className="block text-xs font-semibold text-foreground mb-1">
                Project Role *
              </label>
              <select
                id="edit-member-role"
                name="editMemberRole"
                value={formRole}
                disabled={editingMember?.role === "PROJECT_LEAD"}
                onChange={(e) => setFormRole(e.target.value as ProjectMemberRole)}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {editingMember?.role === "PROJECT_LEAD" && (
                  <option value="PROJECT_LEAD">Project Lead</option>
                )}
                <option value="FACULTY">Faculty</option>
                <option value="RESEARCHER">Researcher</option>
                <option value="STUDENT">Student</option>
                <option value="TECHNICAL_MEMBER">Technical Member</option>
                <option value="DOMAIN_EXPERT">Domain Expert</option>
                <option value="DATA_SCIENTIST">Data Scientist</option>
                <option value="ENGINEER">Engineer</option>
                <option value="MEMBER">General Member</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Academic / Professional Fields */}
          <div className="p-3.5 rounded-xl bg-surface/70 border border-border/80 space-y-3">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
              Affiliation &amp; Academic Details
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="edit-member-designation" className="block text-[11px] font-semibold text-foreground mb-1">
                  Designation / Role
                </label>
                <input
                  id="edit-member-designation"
                  name="editMemberDesignation"
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="e.g. Professor / Research Scholar"
                  className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="edit-member-department" className="block text-[11px] font-semibold text-foreground mb-1">
                  Department
                </label>
                <input
                  id="edit-member-department"
                  name="editMemberDepartment"
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="edit-member-experience" className="block text-[11px] font-semibold text-foreground mb-1">
                  Years of Experience
                </label>
                <input
                  id="edit-member-experience"
                  name="editMemberExperience"
                  type="number"
                  min="0"
                  max="60"
                  value={formExperience}
                  onChange={(e) => setFormExperience(e.target.value)}
                  className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {formMemberType === "STUDENT" && (
                <>
                  <div>
                    <label htmlFor="edit-member-academic-program" className="block text-[11px] font-semibold text-foreground mb-1">
                      Academic Program
                    </label>
                    <input
                      id="edit-member-academic-program"
                      name="editMemberAcademicProgram"
                      type="text"
                      value={formAcademicProgram}
                      onChange={(e) => setFormAcademicProgram(e.target.value)}
                      className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-member-academic-year" className="block text-[11px] font-semibold text-foreground mb-1">
                      Academic Year
                    </label>
                    <input
                      id="edit-member-academic-year"
                      name="editMemberAcademicYear"
                      type="text"
                      value={formAcademicYear}
                      onChange={(e) => setFormAcademicYear(e.target.value)}
                      className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label htmlFor="edit-member-specialization" className="block text-[11px] font-semibold text-foreground mb-1">
                  Specialization
                </label>
                <input
                  id="edit-member-specialization"
                  name="editMemberSpecialization"
                  type="text"
                  value={formSpecialization}
                  onChange={(e) => setFormSpecialization(e.target.value)}
                  className="w-full text-xs border border-border rounded-lg bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
              Expertise &amp; Capabilities
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-member-primary-expertise" className="block text-[11px] font-semibold text-foreground mb-1">
                  Primary Expertise *
                </label>
                <input
                  id="edit-member-primary-expertise"
                  name="editMemberPrimaryExpertise"
                  type="text"
                  required
                  value={formPrimaryExpertise}
                  onChange={(e) => setFormPrimaryExpertise(e.target.value)}
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="edit-member-secondary-expertise" className="block text-[11px] font-semibold text-foreground mb-1">
                  Secondary Expertise
                </label>
                <input
                  id="edit-member-secondary-expertise"
                  name="editMemberSecondaryExpertise"
                  type="text"
                  value={formSecondaryExpertise}
                  onChange={(e) => setFormSecondaryExpertise(e.target.value)}
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="edit-member-skills" className="block text-[11px] font-semibold text-foreground mb-1">
                  Technical Skills (comma separated)
                </label>
                <input
                  id="edit-member-skills"
                  name="editMemberSkills"
                  type="text"
                  value={formTechnicalSkills}
                  onChange={(e) => setFormTechnicalSkills(e.target.value)}
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Project Responsibility */}
          <div className="space-y-3">
            <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
              Project Execution
            </h5>

            <div>
              <label htmlFor="edit-member-responsibility" className="block text-[11px] font-semibold text-foreground mb-1">
                Project Responsibility *
              </label>
              <textarea
                id="edit-member-responsibility"
                name="editMemberResponsibility"
                required
                rows={2}
                value={formProjectResponsibility}
                onChange={(e) => setFormProjectResponsibility(e.target.value)}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            <div>
              <label htmlFor="edit-member-bio" className="block text-[11px] font-semibold text-foreground mb-1">
                Short Bio
              </label>
              <textarea
                id="edit-member-bio"
                name="editMemberBio"
                rows={2}
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-member-research-url" className="block text-[11px] font-semibold text-foreground mb-1">
                  Research Profile URL
                </label>
                <input
                  id="edit-member-research-url"
                  name="editMemberResearchUrl"
                  type="url"
                  value={formResearchProfileUrl}
                  onChange={(e) => setFormResearchProfileUrl(e.target.value)}
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="edit-member-linkedin" className="block text-[11px] font-semibold text-foreground mb-1">
                  LinkedIn URL
                </label>
                <input
                  id="edit-member-linkedin"
                  name="editMemberLinkedinUrl"
                  type="url"
                  value={formLinkedinUrl}
                  onChange={(e) => setFormLinkedinUrl(e.target.value)}
                  className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingMember(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingMemberEdit}
              className="font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submittingMemberEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save Changes
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
            <label htmlFor="edit-workspace-title" className="block text-xs font-semibold text-foreground mb-1">
              Project Title *
            </label>
            <input
              id="edit-workspace-title"
              name="workspaceTitle"
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="edit-workspace-summary" className="block text-xs font-semibold text-foreground mb-1">
              Research Abstract / Scope Summary
            </label>
            <textarea
              id="edit-workspace-summary"
              name="workspaceSummary"
              rows={4}
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="Outline the planned methodology, milestones, and technical targets..."
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

      {/* Change Project Lead Modal */}
      <Dialog
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title="Reassign Project Lead"
        description="Select an active authenticated team member to lead this research workspace."
      >
        <form
          onSubmit={(e) => {
            void handleAssignLead(e);
          }}
          className="space-y-4 pt-2"
        >
          <div>
            <label htmlFor="reassign-lead-select" className="block text-xs font-semibold text-foreground mb-1">
              New Project Lead
            </label>
            <select
              id="reassign-lead-select"
              name="reassignLeadSelect"
              value={selectedNewLead}
              onChange={(e) => setSelectedNewLead(e.target.value)}
              required
              className="w-full text-xs border border-border rounded-xl bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose Active Team Member --</option>
              {activeMembersList
                .filter((m) => Boolean(m.profile_id && m.profile_id !== project.project_lead_profile_id))
                .map((m) => (
                  <option key={m.id} value={m.profile_id!}>
                    {m.member_name || m.profile?.full_name || "Member"} ({m.role})
                  </option>
                ))}
            </select>
            {activeMembersList.filter((m) => Boolean(m.profile_id && m.profile_id !== project.project_lead_profile_id)).length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                No other authenticated institution members are currently available to take over Project Lead.
              </p>
            )}
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
              Confirm New Lead
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Status Transition Confirmation Modal */}
      <Dialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Confirm Status Transition"
        description={`Are you sure you want to transition this workspace to "${targetStatus}"?`}
      >
        <div className="space-y-4 pt-2">
          {targetStatus === "ACTIVE" && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transitioning to <strong className="text-foreground">ACTIVE</strong> signals that team formation is complete and project work has commenced.
            </p>
          )}

          {targetStatus === "PAUSED" && (
            <p className="text-xs text-amber-700 leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              Pausing the workspace will mark ongoing research as temporarily suspended.
            </p>
          )}

          {targetStatus === "COMPLETED" && (
            <p className="text-xs text-teal-800 leading-relaxed bg-teal-50 p-2.5 rounded-xl border border-teal-200">
              Marking as completed concludes research milestones for this challenge.
            </p>
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

      {/* Team Member Full Profile Dialog */}
      <TeamMemberProfileDialog
        open={Boolean(viewingProfileMember)}
        member={viewingProfileMember}
        onClose={() => setViewingProfileMember(null)}
        onEdit={openEditMemberModal}
        canEdit={isCoordinatorOrLead}
      />
    </div>
  );
}
