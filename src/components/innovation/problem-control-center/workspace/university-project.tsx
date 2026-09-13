import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityProjectProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityProject({ institution }: UniversityProjectProps) {
  const navigate = useNavigate();

  if (!institution.projectId) {
    return (
      <EmptyState
        title="Project Workspace Pending"
        description={`${institution.institutionName} has not created a challenge project workspace yet. The workspace is provisioned once the institution formally accepts the invitation and assigns a Project Lead.`}
      />
    );
  }

  return (
    <div className="space-y-6 text-xs">
      {/* 1. PROJECT HEADER CARD */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-teal-100 text-teal-900 border-teal-300 font-bold text-[10px]">
                  {institution.projectStatus || "Active Workspace"}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ID: {institution.projectId}
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-bold text-foreground">
                {institution.projectTitle || "Civic Research & Development Project"}
              </h4>
            </div>

            <Button
              size="sm"
              onClick={() => {
                void navigate(`/app/innovation/projects/${institution.projectId}`);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs shrink-0"
            >
              <span>Open Project Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Project Summary */}
          {institution.projectSummary && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Workspace Summary
              </span>
              <p className="text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/70">
                {institution.projectSummary}
              </p>
            </div>
          )}

          {/* Key Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/70 text-muted-foreground">
            <div>
              <span className="text-[10px] font-bold uppercase block text-muted-foreground">
                Lead Investigator
              </span>
              <span className="font-semibold text-foreground truncate block">
                {institution.projectLeadName || "Assigned Coordinator"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase block text-muted-foreground">
                Lead Email
              </span>
              <span className="font-semibold text-foreground truncate block">
                {institution.projectLeadEmail || "—"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase block text-muted-foreground">
                Research Team
              </span>
              <span className="font-semibold text-foreground block">
                {institution.teamMembersCount} Staffed Members
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase block text-muted-foreground">
                Proposal Deliverable
              </span>
              <span className="font-semibold text-foreground truncate block">
                {institution.proposalStatus ? `Version ${institution.proposalVersion} (${institution.proposalStatus})` : "Pending"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
