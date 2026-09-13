import {
  ExternalLink,
  Info,
  Mail,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityTeamProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityTeam({ institution }: UniversityTeamProps) {
  const members = institution.teamMembers || [];

  return (
    <div className="space-y-5 text-xs">
      {/* Top Banner with Governance Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>Research Team Roster ({members.length})</span>
          </h4>
          <p className="text-muted-foreground">
            Multidisciplinary researchers, faculty, and scholars provisioned for this project
          </p>
        </div>

        <Badge variant="outline" className="text-[10px] font-semibold text-primary">
          Project Lead: {institution.projectLeadName || "Assigned Coordinator"}
        </Badge>
      </div>

      {/* Governance & Privacy Notice */}
      <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 text-sky-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block text-[11px]">
            CivicFix Institutional Research Governance
          </span>
          <p className="text-[11px] text-sky-900 leading-relaxed">
            Research teammates are registered academic contributors entered and managed by the authenticated Project Lead. Teammates are research collaborator records and do not require municipal login credentials.
          </p>
        </div>
      </div>

      {/* Team Members List */}
      {members.length === 0 ? (
        <EmptyState
          title="Research Team Not Formed Yet"
          description={`Once ${institution.institutionName}'s Project Lead activates the project workspace, faculty co-investigators and research scholars will appear here.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              className="border-border/90 shadow-xs hover:border-border transition-all flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-3.5">
                {/* Header: Name, Role, Type */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h5 className="text-sm font-bold text-foreground truncate">
                      {member.memberName}
                    </h5>
                    <p className="text-muted-foreground truncate">
                      {member.designation || member.role}
                      {member.department && ` • ${member.department}`}
                    </p>
                  </div>

                  <Badge
                    className={
                      member.role === "PROJECT_LEAD"
                        ? "bg-teal-100 text-teal-900 border-teal-300 font-bold text-[10px] shrink-0"
                        : "bg-muted text-muted-foreground text-[10px] shrink-0"
                    }
                  >
                    {member.memberType || member.role}
                  </Badge>
                </div>

                {/* Academic Context */}
                {(member.academicProgram || member.academicYear || member.specialization) && (
                  <div className="text-[11px] bg-muted/20 p-2.5 rounded-lg border border-border/60 space-y-0.5 text-muted-foreground">
                    {member.academicProgram && (
                      <span className="font-semibold text-foreground block">
                        {member.academicProgram} {member.academicYear ? `(${member.academicYear})` : ""}
                      </span>
                    )}
                    {member.specialization && (
                      <span>Specialization: {member.specialization}</span>
                    )}
                  </div>
                )}

                {/* Expertise & Skills */}
                <div className="space-y-1.5">
                  {member.primaryExpertise && (
                    <p className="text-[11px]">
                      <span className="font-bold text-foreground">Primary Expertise: </span>
                      <span className="text-muted-foreground">{member.primaryExpertise}</span>
                    </p>
                  )}

                  {member.technicalSkills && member.technicalSkills.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {member.technicalSkills.map((sk, i) => (
                        <Badge key={i} variant="outline" className="text-[9px]">
                          {sk}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Responsibilities & Contributions */}
                {(member.projectResponsibility || member.projectContribution) && (
                  <div className="pt-2 border-t border-border/60 space-y-1 text-[11px]">
                    {member.projectResponsibility && (
                      <p className="text-muted-foreground">
                        <span className="font-bold text-foreground">Role: </span>
                        {member.projectResponsibility}
                      </p>
                    )}
                    {member.projectContribution && (
                      <p className="text-muted-foreground">
                        <span className="font-bold text-foreground">Deliverables: </span>
                        {member.projectContribution}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer: Email & Links */}
                <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
                  <span className="truncate flex items-center gap-1">
                    {member.memberEmail && (
                      <>
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{member.memberEmail}</span>
                      </>
                    )}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {member.linkedinUrl && (
                      <a
                        href={member.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                        title="LinkedIn Profile"
                      >
                        <span>LinkedIn</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {member.websiteUrl && (
                      <a
                        href={member.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                        title="Academic Website"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
