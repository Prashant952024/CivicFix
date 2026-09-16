import {
  ArrowRight,
  Building2,
  Clock,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatElapsedWaitingTime,
  type InstitutionLifecycleTrack,
} from "@/lib/innovation";
import type { UniversityWorkspaceTab } from "@/components/innovation/problem-control-center/workspace/university-workspace";

interface UniversityCardProps {
  track: InstitutionLifecycleTrack;
  onOpenWorkspace: (institutionId: string, tab?: UniversityWorkspaceTab) => void;
  onInspectProfile?: (track: InstitutionLifecycleTrack) => void;
}

export function UniversityCard({
  track,
  onOpenWorkspace,
  onInspectProfile,
}: UniversityCardProps) {
  const navigate = useNavigate();

  const isAccepted = track.invitationStatus === "ACCEPTED";
  const isApproved = track.proposalStatus === "APPROVED";
  const hasProposal = Boolean(track.proposalId);
  const needsReview =
    track.proposalStatus === "SUBMITTED" || track.proposalStatus === "RESUBMITTED";

  return (
    <Card
      className={`rounded-2xl border transition-all duration-200 ease-out shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
        isApproved
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50/20 via-background to-background"
          : needsReview
          ? "border-sky-300 bg-gradient-to-br from-sky-50/25 via-background to-background"
          : isAccepted
          ? "border-border/90 bg-card"
          : "border-border/70 bg-muted/10"
      }`}
    >
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* 1. Header: Name, Acronym, Location, Type, Stage Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                onClick={() => onOpenWorkspace(track.institutionId)}
                className="text-base font-bold text-foreground hover:text-primary cursor-pointer transition truncate"
              >
                {track.institutionName}
                {track.city ? ` (${track.city})` : ""}
              </h3>
              {track.institutionAcronym && (
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {track.institutionAcronym}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>
                {track.city ? `${track.city}, ${track.state}` : "Accredited National Research Institution"}
              </span>
              {track.institutionType && (
                <>
                  <span>•</span>
                  <span>{track.institutionType}</span>
                </>
              )}
            </p>
          </div>

          <Badge
            className={
              isApproved
                ? "bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold shrink-0"
                : needsReview
                ? "bg-sky-100 text-sky-900 border-sky-300 text-[10px] font-bold shrink-0 animate-pulse"
                : isAccepted
                ? "bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold shrink-0"
                : "bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold shrink-0"
            }
          >
            {track.lifecycleLabel}
          </Badge>
        </div>

        {/* 2. Collaboration Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/60">
          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">
              Invitation
            </span>
            <span
              className={`font-semibold ${
                isAccepted
                  ? "text-emerald-700"
                  : track.invitationStatus === "DECLINED"
                  ? "text-rose-700"
                  : "text-amber-800"
              }`}
            >
              {track.invitationStatus ? track.invitationStatus : "Selected"}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">
              Project
            </span>
            <span className="font-semibold text-foreground truncate block">
              {track.projectId ? (track.projectStatus || "Active") : "—"}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">
              Team
            </span>
            <span className="font-semibold text-foreground block">
              {track.teamMembersCount > 0 ? `${track.teamMembersCount} members` : "—"}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">
              Proposal
            </span>
            <span
              className={`font-semibold truncate block ${
                isApproved
                  ? "text-emerald-700 font-bold"
                  : needsReview
                  ? "text-sky-700 font-bold"
                  : "text-foreground"
              }`}
            >
              {track.proposalStatus ? `${track.proposalStatus} (v${track.proposalVersion})` : "—"}
            </span>
          </div>
        </div>

        {/* 3. Lifecycle Stage Mini-Tracker with Upcoming Prototype */}
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70 space-y-1.5 text-[9px]">
          <div className="flex items-center justify-between font-bold uppercase text-muted-foreground">
            <span>Collaboration Stage</span>
            <span className="text-primary">{track.lifecycleStage}</span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-center font-semibold">
            <div className="p-1 rounded bg-emerald-100 text-emerald-900">
              ✓ Invited
            </div>
            <div
              className={`p-1 rounded ${
                isAccepted
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isAccepted ? "✓ Accepted" : "Pending"}
            </div>
            <div
              className={`p-1 rounded ${
                track.projectId
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {track.projectId ? "✓ Project" : "Workspace"}
            </div>
            <div
              className={`p-1 rounded ${
                isApproved
                  ? "bg-emerald-600 text-white font-bold"
                  : hasProposal
                  ? "bg-sky-100 text-sky-900 font-bold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isApproved ? "Approved ✓" : hasProposal ? `Proposal v${track.proposalVersion}` : "Proposal"}
            </div>
            <div className="p-1 rounded border border-dashed border-border text-muted-foreground/60">
              ○ Prototype
            </div>
          </div>
        </div>

        {/* 4. Latest Update Row */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
          <span className="truncate max-w-[260px] flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground/70 shrink-0" />
            <span>Last Update: {track.lastActivityDescription || "Collaboration tracking active"}</span>
          </span>
          <span className="text-[10px] font-mono">
            {track.lastActivityAt ? formatElapsedWaitingTime(track.lastActivityAt) + " ago" : ""}
          </span>
        </div>

        {/* 5. Action CTAs */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          {onInspectProfile && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onInspectProfile(track)}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {needsReview && track.proposalId && (
              <Button
                size="sm"
                onClick={() => {
                  void navigate(`/app/innovation/proposals/${track.proposalId}`);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold gap-1 h-8 px-3 shadow-xs"
              >
                <span>Review Proposal</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}

            {isApproved && track.proposalId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenWorkspace(track.institutionId, "proposal")}
                className="text-emerald-800 border-emerald-300 hover:bg-emerald-100/60 text-xs font-bold gap-1 h-8 px-3 shadow-xs"
              >
                <span>Approved Proposal</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => onOpenWorkspace(track.institutionId)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 h-8 px-3.5 shadow-xs"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
