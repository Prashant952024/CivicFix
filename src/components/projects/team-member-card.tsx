import {
  Crown,
  GraduationCap,
  Building2,
  Briefcase,
  Award,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  Mail,
  BookOpen,
  Globe,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRoleBadgeColor } from "@/components/projects/team-member-utils";
import type { ChallengeProjectMemberWithProfile } from "@/lib/projects";
import type { ProjectMemberRole } from "@/types/database";

interface TeamMemberCardProps {
  member: ChallengeProjectMemberWithProfile;
  onViewProfile: (member: ChallengeProjectMemberWithProfile) => void;
  onEdit?: (member: ChallengeProjectMemberWithProfile) => void;
  onUpdateRole?: (memberId: string, role: ProjectMemberRole) => void;
  onDeactivate?: (member: ChallengeProjectMemberWithProfile) => void;
  onReactivate?: (member: ChallengeProjectMemberWithProfile) => void;
  isCoordinatorOrLead?: boolean;
  isProcessing?: boolean;
}

export function TeamMemberCard({
  member,
  onViewProfile,
  onEdit,
  onUpdateRole,
  onDeactivate,
  onReactivate,
  isCoordinatorOrLead = false,
  isProcessing = false,
}: TeamMemberCardProps) {
  const isLead = member.role === "PROJECT_LEAD";
  const memberName = member.member_name || member.profile?.full_name || "Team Member";
  const memberEmail = member.member_email || member.profile?.email;
  const {
    badgeVariant,
    avatarBg,
    avatarText,
    avatarBorder,
    icon: RoleIcon,
    iconColor,
    cardBorder,
    cardBgTint,
  } = getRoleBadgeColor(member.role);

  const initials = memberName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const skills = member.technical_skills || [];
  const visibleSkills = skills.slice(0, 3);
  const remainingSkillsCount = skills.length - visibleSkills.length;

  return (
    <Card
      className={`flex flex-col justify-between border rounded-2xl transition-all duration-200 hover:shadow-md ${
        !member.is_active
          ? "opacity-75 bg-muted/20 border-dashed border-border/70"
          : isLead
          ? `${cardBorder} ${cardBgTint} shadow-xs ring-1 ring-amber-500/20`
          : `${cardBorder} ${cardBgTint}`
      }`}
    >
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        {/* Top: Identity Header */}
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {/* Role-themed Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-11 h-11 rounded-2xl ${avatarBg} ${avatarText} border ${avatarBorder} flex items-center justify-center font-bold text-sm shadow-xs`}
                >
                  {initials}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${avatarBg} ${iconColor} border ${avatarBorder} flex items-center justify-center shadow-xs`}
                  title={member.role.replace(/_/g, " ")}
                >
                  <RoleIcon className="w-2.5 h-2.5" />
                </div>
              </div>

              {/* Name & Role Badges */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4
                    onClick={() => onViewProfile(member)}
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate cursor-pointer flex items-center gap-1"
                    title={memberName}
                  >
                    {memberName}
                    {isLead && (
                      <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0 inline" />
                    )}
                  </h4>
                  <Badge variant={badgeVariant} size="sm">
                    {member.role.replace(/_/g, " ")}
                  </Badge>
                  {member.member_type && member.member_type !== member.role && (
                    <Badge variant="outline" size="sm" className="text-muted-foreground text-[10px]">
                      {member.member_type}
                    </Badge>
                  )}
                </div>

                {/* Designation & Department */}
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {member.designation && (
                    <span className="font-medium text-foreground/85">{member.designation}</span>
                  )}
                  {member.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 opacity-60 shrink-0" />
                      <span className="truncate max-w-[200px]">{member.department}</span>
                    </span>
                  )}
                </div>

                {/* Student / Academic Cohort if applicable */}
                {member.academic_program && (
                  <div className="text-[11px] text-teal-700 dark:text-teal-400 flex items-center gap-1 mt-0.5 font-medium">
                    <GraduationCap className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {member.academic_program}
                      {member.academic_year ? ` (${member.academic_year})` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Active / Inactive Status Pill */}
            <div className="shrink-0">
              {member.is_active ? (
                <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-full shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Active
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-full">
                  Former
                </span>
              )}
            </div>
          </div>

          {/* Specialization Subline */}
          {member.specialization && (
            <div className="text-[11px] text-foreground/80 flex items-center gap-1.5 font-medium bg-muted/40 dark:bg-muted/20 px-2.5 py-1 rounded-lg border border-border/70">
              <Award className="w-3 h-3 text-primary shrink-0" />
              <span className="truncate">{member.specialization}</span>
            </div>
          )}
        </div>

        {/* Middle: Competencies & Project Responsibility */}
        <div className="space-y-2.5 pt-1 flex-1">
          {/* Core Expertise Tags */}
          {(member.primary_expertise || visibleSkills.length > 0) && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {member.primary_expertise && (
                  <span
                    className="bg-primary/10 text-primary border border-primary/25 px-2.5 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1 truncate max-w-full shadow-2xs"
                    title={member.primary_expertise}
                  >
                    <Sparkles className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{member.primary_expertise}</span>
                  </span>
                )}
                {member.secondary_expertise && !member.primary_expertise && (
                  <span className="bg-muted text-foreground/80 border border-border px-2 py-0.5 rounded-md text-[11px]">
                    {member.secondary_expertise}
                  </span>
                )}
                {visibleSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-muted/50 dark:bg-muted/30 text-foreground/80 border border-border/70 px-2 py-0.5 rounded-md text-[11px]"
                  >
                    {skill}
                  </span>
                ))}
                {remainingSkillsCount > 0 && (
                  <button
                    onClick={() => onViewProfile(member)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary font-bold border border-primary/20 px-1.5 py-0.5 rounded-md text-[10px] transition-colors"
                  >
                    +{remainingSkillsCount} more
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Project Responsibility Callout */}
          {member.project_responsibility && (
            <div
              onClick={() => onViewProfile(member)}
              className="p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 dark:bg-muted/20 dark:hover:bg-muted/30 border border-border/70 hover:border-primary/40 transition-colors cursor-pointer group/resp space-y-1"
            >
              <span className="font-bold text-foreground text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-primary" />
                Project Responsibility
              </span>
              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                {member.project_responsibility}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Card Action & Link Footer */}
      <div className="px-4 py-2.5 bg-muted/30 dark:bg-muted/20 border-t border-border/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Quick Contact Icons */}
        <div className="flex items-center gap-1 text-muted-foreground">
          {memberEmail && (
            <a
              href={`mailto:${memberEmail}`}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title={`Email: ${memberEmail}`}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          {member.research_profile_url && (
            <a
              href={member.research_profile_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 transition-colors"
              title="View Research Profile"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </a>
          )}
          {member.linkedin_url && (
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-[#0A66C2]/10 text-[#0A66C2] transition-colors"
              title="LinkedIn Profile"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.6 1.6 0 1 0-.01-3.2 1.6 1.6 0 0 0 .01 3.2m1.39 9.74v-8.37H5.07v8.37h2.78Z" />
              </svg>
            </a>
          )}
          {member.website_url && (
            <a
              href={member.website_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Personal Website"
            >
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewProfile(member)}
            className="h-7 text-xs px-2.5 gap-1.5 font-semibold text-foreground bg-card hover:bg-muted hover:border-primary/50 transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>Profile</span>
          </Button>

          {isCoordinatorOrLead && (
            <>
              {member.is_active ? (
                <>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(member)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit Member Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isLead && onUpdateRole && (
                    <select
                      id={`card-member-role-select-${member.id}`}
                      name={`cardMemberRole_${member.id}`}
                      disabled={isProcessing}
                      value={member.role}
                      onChange={(e) => {
                        onUpdateRole(member.id, e.target.value as ProjectMemberRole);
                      }}
                      aria-label={`Update role for ${memberName}`}
                      className="text-[11px] border border-border rounded-lg bg-surface px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="FACULTY">Faculty</option>
                      <option value="RESEARCHER">Researcher</option>
                      <option value="STUDENT">Student</option>
                      <option value="TECHNICAL_MEMBER">Tech Member</option>
                      <option value="DOMAIN_EXPERT">Domain Expert</option>
                      <option value="DATA_SCIENTIST">Data Scientist</option>
                      <option value="ENGINEER">Engineer</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  )}
                  {!isLead && onDeactivate && (
                    <button
                      disabled={isProcessing}
                      onClick={() => onDeactivate(member)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                      title="Remove / Deactivate Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              ) : (
                onReactivate && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => onReactivate(member)}
                    className="text-[11px] h-7 gap-1 text-teal-700 border-teal-300 hover:bg-teal-50"
                  >
                    <RotateCcw className="w-3 h-3" /> Reactivate
                  </Button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
