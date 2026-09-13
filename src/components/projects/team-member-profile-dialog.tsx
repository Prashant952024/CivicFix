import { useState } from "react";
import {
  GraduationCap,
  Briefcase,
  BookOpen,
  Globe,
  Mail,
  Award,
  Sparkles,
  Cpu,
  Layers,
  Building2,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Crown,
  FileText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ChallengeProjectMemberWithProfile } from "@/lib/projects";
import { getRoleBadgeColor } from "./team-member-utils";

interface TeamMemberProfileDialogProps {
  member: ChallengeProjectMemberWithProfile | null;
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onEdit?: (member: ChallengeProjectMemberWithProfile) => void;
  canEdit?: boolean;
}

export function TeamMemberProfileDialog({
  member,
  open,
  onClose,
  onOpenChange,
  onEdit,
  canEdit = false,
}: TeamMemberProfileDialogProps) {
  const [activeTab, setActiveTab] = useState<"role" | "academic" | "skills">("role");

  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  if (!member) return null;

  const memberName = member.member_name || member.profile?.full_name || "Team Member";
  const memberEmail = member.member_email || member.profile?.email;
  const isLead = member.role === "PROJECT_LEAD";
  const {
    badgeVariant,
    avatarBg,
    avatarText,
    avatarBorder,
    icon: RoleIcon,
    iconColor,
  } = getRoleBadgeColor(member.role);

  const initials = memberName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const skillsList = member.technical_skills || [];
  const techList = member.technologies || [];
  const researchAreas = member.research_areas || [];
  const researchDomains = member.research_domains || [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="2xl">
      <div className="space-y-5 -mt-2">
        {/* Profile Header Banner */}
        <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-card via-card to-muted/40 border border-border/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar with Role Badge Indicator */}
            <div className="relative shrink-0">
              <div
                className={`w-14 h-14 rounded-2xl ${avatarBg} ${avatarText} border ${avatarBorder} flex items-center justify-center font-black text-lg shadow-sm`}
              >
                {initials}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${avatarBg} ${iconColor} border ${avatarBorder} flex items-center justify-center shadow-xs`}
                title={member.role.replace(/_/g, " ")}
              >
                <RoleIcon className="w-3 h-3" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5">
                  {memberName}
                  {isLead && (
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                  )}
                </h3>
                <Badge variant={badgeVariant} size="sm">
                  {member.role.replace(/_/g, " ")}
                </Badge>
                {member.member_type && member.member_type !== member.role && (
                  <Badge variant="outline" size="sm" className="text-muted-foreground text-[10px]">
                    {member.member_type}
                  </Badge>
                )}
                {member.is_active ? (
                  <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Active
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-medium bg-muted px-2.5 py-0.5 rounded-full">
                    Former Member
                  </span>
                )}
              </div>

              {/* Subtitles: Designation & Affiliation */}
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {member.designation && (
                  <span className="font-medium text-foreground/90">{member.designation}</span>
                )}
                {member.department && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 opacity-70" />
                    {member.department}
                  </span>
                )}
                {member.institution_name && (
                  <span className="text-primary font-medium">({member.institution_name})</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action in Header (Edit if permitted) */}
          {canEdit && onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                handleClose();
                onEdit(member);
              }}
              className="gap-1.5 text-xs self-end sm:self-auto shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Contact Links Strip */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/40 rounded-xl border border-border/80 text-xs">
          {memberEmail && (
            <a
              href={`mailto:${memberEmail}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-foreground/80 hover:text-primary transition-colors font-medium"
            >
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>{memberEmail}</span>
            </a>
          )}
          {member.research_profile_url && (
            <a
              href={member.research_profile_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-primary hover:underline font-semibold"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Research Profile</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
          {member.linkedin_url && (
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-sky-600 hover:underline font-medium"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.6 1.6 0 1 0-.01-3.2 1.6 1.6 0 0 0 .01 3.2m1.39 9.74v-8.37H5.07v8.37h2.78Z" />
              </svg>
              <span>LinkedIn</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
          {member.website_url && (
            <a
              href={member.website_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-medium"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-border pb-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("role")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "role"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-semibold"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Project Role &amp; Contribution
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "academic"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-semibold"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Academic Background
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "skills"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-semibold"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Skills &amp; Technologies
          </button>
        </div>

        {/* Tab 1: Project Role & Contribution */}
        {activeTab === "role" && (
          <div className="space-y-3.5 text-xs">
            {/* Project Responsibility */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-1.5 shadow-2xs">
              <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                Project Responsibility
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                {member.project_responsibility || "No specific responsibility defined yet."}
              </p>
            </div>

            {/* Project Contribution */}
            {member.project_contribution && (
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-1.5">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Key Project Contribution
                </span>
                <p className="text-muted-foreground leading-relaxed text-xs">
                  {member.project_contribution}
                </p>
              </div>
            )}

            {/* Professional Bio */}
            {member.professional_bio && (
              <div className="p-3.5 rounded-xl bg-card border border-border space-y-1.5">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Professional Biography
                </span>
                <p className="text-muted-foreground leading-relaxed text-xs italic">
                  &ldquo;{member.professional_bio}&rdquo;
                </p>
              </div>
            )}

            {isLead && (
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Principal Research Lead:</strong> Authoritative responsibility for research methodology, team oversight, and proposal submission.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Academic & Institutional Background */}
        {activeTab === "academic" && (
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-card border border-border rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Academic Program / Level
                </span>
                <p className="font-semibold text-foreground text-xs">
                  {member.academic_program || "N/A"}
                  {member.academic_level && ` (${member.academic_level})`}
                </p>
              </div>

              <div className="p-3 bg-card border border-border rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Academic Year / Cohort
                </span>
                <p className="font-semibold text-foreground text-xs">
                  {member.academic_year || "N/A"}
                </p>
              </div>

              <div className="p-3 bg-card border border-border rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Department &amp; Institution
                </span>
                <p className="font-semibold text-foreground text-xs">
                  {member.department || "Academic Department"}
                  {member.institution_name && ` · ${member.institution_name}`}
                </p>
              </div>

              <div className="p-3 bg-card border border-border rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Expected Graduation / Experience
                </span>
                <p className="font-semibold text-foreground text-xs">
                  {member.expected_graduation_year
                    ? `Graduating ${member.expected_graduation_year}`
                    : member.years_of_experience
                    ? `${member.years_of_experience} Years Experience`
                    : "N/A"}
                </p>
              </div>
            </div>

            {member.specialization && (
              <div className="p-3.5 bg-card border border-border rounded-xl space-y-1.5">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  Domain Specialization
                </span>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {member.specialization}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Skills & Technology Stack */}
        {activeTab === "skills" && (
          <div className="space-y-3.5 text-xs">
            {/* Primary & Secondary Expertise */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-primary/10 border border-primary/25 rounded-xl space-y-1 shadow-2xs">
                <span className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Primary Expertise
                </span>
                <p className="font-bold text-foreground text-sm">
                  {member.primary_expertise || "Not specified"}
                </p>
              </div>

              <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Secondary Expertise
                </span>
                <p className="font-semibold text-foreground/90 text-sm">
                  {member.secondary_expertise || "Not specified"}
                </p>
              </div>
            </div>

            {/* Technical Skills */}
            <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2.5">
              <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Technical Competencies &amp; Methods ({skillsList.length})
              </span>
              {skillsList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 font-medium text-[11px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px] italic">No specific technical competencies tagged.</p>
              )}
            </div>

            {/* Technologies */}
            <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2.5">
              <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                Hardware, Software &amp; Frameworks ({techList.length})
              </span>
              {techList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {techList.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/80 font-medium text-[11px]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px] italic">No specific technologies tagged.</p>
              )}
            </div>

            {/* Research Areas / Domains */}
            {(researchAreas.length > 0 || researchDomains.length > 0) && (
              <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2.5">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Research Areas &amp; Domains
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {researchAreas.map((area, idx) => (
                    <span
                      key={`area-${idx}`}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-medium text-[11px]"
                    >
                      {area}
                    </span>
                  ))}
                  {researchDomains.map((domain, idx) => (
                    <span
                      key={`domain-${idx}`}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80 font-medium text-[11px]"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Button size="sm" variant="outline" onClick={handleClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
