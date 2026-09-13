import {
  Crown,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  Building2,
  GraduationCap,
  Mail,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRoleBadgeColor } from "@/components/projects/team-member-utils";
import type { ChallengeProjectMemberWithProfile } from "@/lib/projects";
import type { ProjectMemberRole } from "@/types/database";

interface TeamMemberTableProps {
  members: ChallengeProjectMemberWithProfile[];
  onViewProfile: (member: ChallengeProjectMemberWithProfile) => void;
  onEdit?: (member: ChallengeProjectMemberWithProfile) => void;
  onUpdateRole?: (memberId: string, role: ProjectMemberRole) => void;
  onDeactivate?: (member: ChallengeProjectMemberWithProfile) => void;
  onReactivate?: (member: ChallengeProjectMemberWithProfile) => void;
  isCoordinatorOrLead?: boolean;
  processingMemberId?: string | null;
}

export function TeamMemberTable({
  members,
  onViewProfile,
  onEdit,
  onUpdateRole,
  onDeactivate,
  onReactivate,
  isCoordinatorOrLead = false,
  processingMemberId = null,
}: TeamMemberTableProps) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-3">Role &amp; Status</th>
              <th className="py-3 px-3">Affiliation / Program</th>
              <th className="py-3 px-3">Primary Expertise</th>
              <th className="py-3 px-3">Project Responsibility</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {members.map((member) => {
              const isLead = member.role === "PROJECT_LEAD";
              const isProcessing = processingMemberId === member.id;
              const memberName = member.member_name || member.profile?.full_name || "Team Member";
              const memberEmail = member.member_email || member.profile?.email;
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

              return (
                <tr
                  key={member.id}
                  className={`hover:bg-muted/35 transition-colors ${
                    !member.is_active
                      ? "opacity-60 bg-muted/10"
                      : isLead
                      ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]"
                      : ""
                  }`}
                >
                  {/* Column 1: Member Name & Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-xl ${avatarBg} ${avatarText} border ${avatarBorder} flex items-center justify-center font-bold text-xs shadow-2xs`}
                        >
                          {initials}
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${avatarBg} ${iconColor} border ${avatarBorder} flex items-center justify-center shadow-xs`}
                        >
                          <RoleIcon className="w-2 h-2" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div
                          onClick={() => onViewProfile(member)}
                          className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate flex items-center gap-1"
                        >
                          <span>{memberName}</span>
                          {isLead && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
                          )}
                        </div>
                        {memberEmail && (
                          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 opacity-60" />
                            <span>{memberEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Role & Status */}
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={badgeVariant} size="sm">
                          {member.role.replace(/_/g, " ")}
                        </Badge>
                        {member.member_type && member.member_type !== member.role && (
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted border border-border/60">
                            {member.member_type}
                          </span>
                        )}
                      </div>
                      <div>
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">Former</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Column 3: Department / Program */}
                  <td className="py-3 px-3 max-w-[180px]">
                    <div className="space-y-0.5 text-[11px]">
                      {member.department ? (
                        <div className="text-foreground/90 font-medium truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 opacity-60 shrink-0" />
                          <span className="truncate">{member.department}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No department</span>
                      )}
                      {member.designation && (
                        <p className="text-muted-foreground text-[10px] truncate">{member.designation}</p>
                      )}
                      {member.academic_program && (
                        <p className="text-primary/90 text-[10px] truncate flex items-center gap-1">
                          <GraduationCap className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{member.academic_program}</span>
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Column 4: Primary Expertise */}
                  <td className="py-3 px-3 max-w-[200px]">
                    {member.primary_expertise ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/25 font-semibold text-[11px] truncate max-w-full shadow-2xs">
                          <Sparkles className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate">{member.primary_expertise}</span>
                        </span>
                        {member.technical_skills && member.technical_skills.length > 0 && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            +{member.technical_skills.length} technical skills
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px] italic">Not specified</span>
                    )}
                  </td>

                  {/* Column 5: Project Responsibility */}
                  <td className="py-3 px-3 max-w-[240px]">
                    {member.project_responsibility ? (
                      <p
                        onClick={() => onViewProfile(member)}
                        className="text-muted-foreground text-xs line-clamp-2 cursor-pointer hover:text-foreground transition-colors"
                        title={member.project_responsibility}
                      >
                        {member.project_responsibility}
                      </p>
                    ) : (
                      <span className="text-muted-foreground text-[11px] italic">No responsibility recorded</span>
                    )}
                  </td>

                  {/* Column 6: Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
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
                                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit Member"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!isLead && onUpdateRole && (
                                <select
                                  id={`table-member-role-select-${member.id}`}
                                  name={`tableMemberRole_${member.id}`}
                                  disabled={isProcessing}
                                  value={member.role}
                                  onChange={(e) => {
                                    onUpdateRole(member.id, e.target.value as ProjectMemberRole);
                                  }}
                                  aria-label={`Update role for ${memberName}`}
                                  className="text-[10px] border border-border rounded-lg bg-surface px-1 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="FACULTY">Faculty</option>
                                  <option value="RESEARCHER">Researcher</option>
                                  <option value="STUDENT">Student</option>
                                  <option value="TECHNICAL_MEMBER">Tech</option>
                                  <option value="DOMAIN_EXPERT">Expert</option>
                                  <option value="DATA_SCIENTIST">Data</option>
                                  <option value="ENGINEER">Eng</option>
                                  <option value="MEMBER">Member</option>
                                </select>
                              )}
                              {!isLead && onDeactivate && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => onDeactivate(member)}
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                                  title="Deactivate Member"
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
                                className="text-[10px] h-6 px-2 gap-1 text-teal-700 border-teal-300 hover:bg-teal-50"
                              >
                                <RotateCcw className="w-3 h-3" /> Reactivate
                              </Button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
