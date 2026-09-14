import { useState } from "react";
import { Info, Users, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamMemberCard } from "@/components/projects/team-member-card";
import { TeamMemberProfileDialog } from "@/components/projects/team-member-profile-dialog";
import type { ChallengeProjectMemberWithProfile } from "@/lib/projects";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityTeamProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityTeam({ institution }: UniversityTeamProps) {
  const [selectedProfileMember, setSelectedProfileMember] =
    useState<ChallengeProjectMemberWithProfile | null>(null);

  const rawMembers = institution.teamMembers || [];
  const totalCount = institution.teamMembersCount ?? rawMembers.length;
  const activeCount =
    institution.teamMembersActiveCount ??
    rawMembers.filter((m) => m.isActive).length;
  const formerCount =
    institution.teamMembersFormerCount ??
    rawMembers.filter((m) => !m.isActive).length;

  const mappedMembers: ChallengeProjectMemberWithProfile[] = rawMembers.map((m) => ({
    id: m.id,
    project_id: institution.projectId || "",
    profile_id: m.profileId,
    member_name: m.memberName,
    member_email: m.memberEmail,
    member_type: (m.memberType as ChallengeProjectMemberWithProfile["member_type"]) || null,
    role: (m.role as ChallengeProjectMemberWithProfile["role"]) || "MEMBER",
    designation: m.designation,
    department: m.department || null,
    organization: m.organization || null,
    institution_name: m.institutionName || institution.institutionName,
    academic_program: m.academicProgram || null,
    academic_year: m.academicYear || null,
    academic_level: m.academicLevel || null,
    specialization: m.specialization || null,
    expected_graduation_year: m.expectedGraduationYear || null,
    years_of_experience: m.yearsOfExperience || null,
    primary_expertise: m.primaryExpertise || null,
    secondary_expertise: m.secondaryExpertise || null,
    expertise: m.expertise || null,
    research_areas: m.researchAreas || [],
    research_domains: m.researchDomains || [],
    technical_skills: m.technicalSkills || [],
    technologies: m.technologies || [],
    project_responsibility: m.projectResponsibility || null,
    project_contribution: m.projectContribution || null,
    professional_bio: m.professionalBio || null,
    research_profile_url: m.researchProfileUrl || null,
    linkedin_url: m.linkedinUrl || null,
    website_url: m.websiteUrl || null,
    is_active: m.isActive,
    joined_at: m.joinedAt || new Date().toISOString(),
    added_by: institution.projectId || "",
    created_at: m.joinedAt || new Date().toISOString(),
    updated_at: m.joinedAt || new Date().toISOString(),
    profile: m.profileId
      ? { id: m.profileId, full_name: m.memberName, email: m.memberEmail || "", phone: null }
      : null,
  }));

  return (
    <div className="space-y-5 text-xs">
      {/* Top Banner with Member Count Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">
              Research Team Roster
            </h4>
            <div className="flex items-center gap-1.5 ml-2">
              <Badge variant="outline" className="text-[11px] font-semibold">
                {totalCount} Total
              </Badge>
              <Badge
                variant="outline"
                className="text-[11px] font-semibold border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center gap-1"
              >
                <UserCheck className="w-3 h-3" />
                <span>{activeCount} Active</span>
              </Badge>
              {formerCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold border-muted-foreground/30 text-muted-foreground flex items-center gap-1"
                >
                  <UserX className="w-3 h-3" />
                  <span>{formerCount} Former</span>
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-0.5">
            Multidisciplinary researchers, faculty, and scholars provisioned by {institution.institutionName} for this municipal challenge.
          </p>
        </div>

        {institution.projectLeadName && (
          <Badge variant="outline" className="text-[11px] font-semibold text-primary shrink-0 self-start sm:self-auto">
            Project Lead: {institution.projectLeadName}
          </Badge>
        )}
      </div>

      {/* Governance & Privacy Notice */}
      <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 dark:bg-sky-950/20 dark:border-sky-900/60 text-sky-950 dark:text-sky-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block text-[11px]">
            CivicFix Institutional Research Governance
          </span>
          <p className="text-[11px] text-sky-900 dark:text-sky-300 leading-relaxed">
            Research teammates are registered academic contributors entered and managed by the authenticated Project Lead. Teammates are official research collaborator records and do not require separate municipal login credentials.
          </p>
        </div>
      </div>

      {/* Team Members List */}
      {mappedMembers.length === 0 ? (
        <EmptyState
          title="No Research Team Assigned Yet"
          description={`Once ${institution.institutionName}'s Project Lead forms and registers the research roster, faculty co-investigators, domain researchers, and student scholars will appear here.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mappedMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onViewProfile={(m) => setSelectedProfileMember(m)}
              isCoordinatorOrLead={false}
            />
          ))}
        </div>
      )}

      {/* Full Member Profile Modal */}
      <TeamMemberProfileDialog
        member={selectedProfileMember}
        open={Boolean(selectedProfileMember)}
        onClose={() => setSelectedProfileMember(null)}
        canEdit={false}
      />
    </div>
  );
}
