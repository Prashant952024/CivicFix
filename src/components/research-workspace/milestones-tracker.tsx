import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Edit3,
  FileCheck,
  Layers,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { updateMilestoneStatus } from "@/lib/research-workspace";
import type { ResearchMilestoneStatus, ResearchProjectMilestoneRow } from "@/types/database";

interface MilestonesTrackerProps {
  projectId: string;
  milestones: ResearchProjectMilestoneRow[];
  canEdit?: boolean;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<
  ResearchMilestoneStatus,
  { label: string; badgeClass: string }
> = {
  NOT_STARTED: { label: "Not Started", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
  IN_PROGRESS: { label: "In Progress", badgeClass: "bg-sky-100 text-sky-800 border-sky-300 font-bold" },
  COMPLETED: { label: "Completed", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" },
  BLOCKED: { label: "Blocked", badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold" },
  DELAYED: { label: "Delayed", badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold" },
  CANCELLED: { label: "Cancelled", badgeClass: "bg-gray-100 text-gray-500 border-gray-300" },
};

export function MilestonesTracker({
  projectId,
  milestones,
  canEdit = true,
  onRefresh,
}: MilestonesTrackerProps) {
  const [editingMilestone, setEditingMilestone] = useState<ResearchProjectMilestoneRow | null>(null);
  const [editStatus, setEditStatus] = useState<ResearchMilestoneStatus>("NOT_STARTED");
  const [editPercentage, setEditPercentage] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenEdit = (m: ResearchProjectMilestoneRow) => {
    setEditingMilestone(m);
    setEditStatus(m.status);
    setEditPercentage(m.completion_percentage);
    setEditNotes(m.notes || "");
    setErrorMessage(null);
  };

  const handleSaveMilestone = async () => {
    if (!editingMilestone) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await updateMilestoneStatus(
        editingMilestone.id,
        projectId,
        editStatus,
        editPercentage,
        editNotes
      );
      setEditingMilestone(null);
      onRefresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update milestone";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (milestones.length === 0) {
    return (
      <Card className="border-border/80">
        <CardContent className="p-8">
          <EmptyState
            icon={Layers}
            title="No Milestones Defined"
            description="Milestones are automatically initialized once the university research proposal is approved by the Innovation Manager."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Research &amp; Prototype Milestones ({milestones.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Operational milestones derived from the approved solution blueprint.
          </p>
        </div>
      </div>

      {/* MILESTONE LIST */}
      <div className="space-y-3">
        {milestones.map((m) => {
          const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.NOT_STARTED;
          const deliverablesList = Array.isArray(m.deliverables)
            ? (m.deliverables as { title?: string; name?: string }[])
            : [];

          return (
            <Card
              key={m.id}
              className={`border-border/80 transition-shadow hover:shadow-xs ${
                m.status === "COMPLETED" ? "bg-emerald-50/20" : m.status === "IN_PROGRESS" ? "bg-sky-50/20" : ""
              }`}
            >
              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs shrink-0 font-mono">
                      M{m.sequence_order}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-foreground leading-snug">
                        {m.title}
                      </h4>
                      {m.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Badge variant="outline" className={`text-[11px] font-semibold ${cfg.badgeClass}`}>
                      {cfg.label}
                    </Badge>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(m)}
                        className="h-7 px-2 text-xs font-semibold gap-1 text-slate-600 hover:text-slate-900"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Update</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {m.description && (
                  <p className="text-xs text-slate-600 leading-relaxed pl-10">
                    {m.description}
                  </p>
                )}

                {/* Deliverables tags */}
                {deliverablesList.length > 0 && (
                  <div className="pl-10 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">
                      Deliverables:
                    </span>
                    {deliverablesList.map((d, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] font-medium bg-muted/40 text-foreground py-0.5"
                      >
                        <FileCheck className="w-2.5 h-2.5 mr-1 inline text-primary" />
                        {d.title || d.name || "Deliverable"}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Progress Bar & Dates */}
                <div className="pl-10 pt-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {m.actual_completion_date ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed on {m.actual_completion_date}
                        </span>
                      ) : m.planned_completion_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Target: {m.planned_completion_date}
                        </span>
                      ) : (
                        <span>Milestone Progress</span>
                      )}
                    </span>
                    <span className="font-bold text-foreground text-xs font-mono">
                      {m.completion_percentage}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        m.completion_percentage === 100
                          ? "bg-emerald-600"
                          : m.status === "BLOCKED"
                          ? "bg-rose-500"
                          : "bg-primary"
                      }`}
                      style={{ width: `${m.completion_percentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* UPDATE MILESTONE MODAL */}
      <Dialog
        open={Boolean(editingMilestone)}
        onClose={() => setEditingMilestone(null)}
        title={editingMilestone ? `Update Milestone ${editingMilestone.sequence_order}` : "Update Milestone"}
        description={editingMilestone?.title}
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Milestone Status</label>
            <select
              value={editStatus}
              onChange={(e) => {
                const s = e.target.value as ResearchMilestoneStatus;
                setEditStatus(s);
                if (s === "COMPLETED") {
                  setEditPercentage(100);
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DELAYED">Delayed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Progress Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-foreground">Completion Percentage</label>
              <span className="font-mono font-bold text-primary">{editPercentage}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={editPercentage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setEditPercentage(val);
                if (val === 100) {
                  setEditStatus("COMPLETED");
                } else if (val > 0 && editStatus === "NOT_STARTED") {
                  setEditStatus("IN_PROGRESS");
                }
              }}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Notes / Progress Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Operational Notes / Context</label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Sensor calibration finished, awaiting field test fixtures."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingMilestone(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void handleSaveMilestone();
              }}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground font-bold"
            >
              {isSubmitting ? "Saving..." : "Save Milestone Progress"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
