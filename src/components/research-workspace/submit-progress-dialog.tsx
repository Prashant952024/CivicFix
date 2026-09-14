import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Layers,
  Link2,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  BlockerSeverity,
  EvidenceType,
  ResearchProjectMilestoneRow,
  SupportCategory,
} from "@/types/database";
import { submitProgressUpdate } from "@/lib/research-workspace";

interface SubmitProgressDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  milestones: ResearchProjectMilestoneRow[];
  lastUpdateAt: string | null;
  onSuccess: () => void;
}

export function SubmitProgressDialog({
  open,
  onClose,
  projectId,
  milestones,
  lastUpdateAt,
  onSuccess,
}: SubmitProgressDialogProps) {
  const [periodStart, setPeriodStart] = useState(() => {
    if (lastUpdateAt) {
      return new Date(lastUpdateAt).toISOString().split("T")[0];
    }
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d.toISOString().split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [summaryCompleted, setSummaryCompleted] = useState("");
  const [currentFindings, setCurrentFindings] = useState("");

  // Milestone Progress
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(
    milestones[0]?.id || ""
  );
  const [milestoneProgressPct, setMilestoneProgressPct] = useState<number>(
    milestones[0]?.completion_percentage || 0
  );

  // Next planned work
  const [nextPlannedWork, setNextPlannedWork] = useState("");

  // Support Required
  const [supportRequired, setSupportRequired] = useState("");
  const [supportCategory, setSupportCategory] = useState<SupportCategory | "">("");

  // Optional Evidence Item
  const [hasEvidence, setHasEvidence] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("REPORT");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");

  // Optional Blocker
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blockerType, setBlockerType] = useState<"BLOCKER" | "RISK">("BLOCKER");
  const [blockerTitle, setBlockerTitle] = useState("");
  const [blockerDesc, setBlockerDesc] = useState("");
  const [blockerSeverity, setBlockerSeverity] = useState<BlockerSeverity>("MEDIUM");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summaryCompleted.trim()) {
      setErrorMessage("Please describe the work completed during this reporting period.");
      return;
    }
    if (!nextPlannedWork.trim()) {
      setErrorMessage("Please specify the next planned work for the upcoming 5-day cycle.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitProgressUpdate({
        projectId,
        reportingPeriodStart: periodStart,
        reportingPeriodEnd: periodEnd,
        summaryCompleted: summaryCompleted.trim(),
        currentFindings: currentFindings.trim() || undefined,
        milestoneId: selectedMilestoneId || undefined,
        milestoneProgressPct: selectedMilestoneId ? milestoneProgressPct : undefined,
        nextPlannedWork: nextPlannedWork.trim(),
        supportRequired: supportRequired.trim() || undefined,
        supportCategory: supportCategory || undefined,
        evidence:
          hasEvidence && evidenceTitle.trim()
            ? [
                {
                  title: evidenceTitle.trim(),
                  evidenceType,
                  url: evidenceUrl.trim() || undefined,
                  description: evidenceDesc.trim() || undefined,
                },
              ]
            : undefined,
        newBlocker:
          hasBlocker && blockerTitle.trim() && blockerDesc.trim()
            ? {
                itemType: blockerType,
                title: blockerTitle.trim(),
                description: blockerDesc.trim(),
                severity: blockerSeverity,
                supportRequired: supportRequired.trim() || undefined,
              }
            : undefined,
      });

      // Reset
      setSummaryCompleted("");
      setCurrentFindings("");
      setNextPlannedWork("");
      setSupportRequired("");
      setSupportCategory("");
      setHasEvidence(false);
      setHasBlocker(false);

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit progress update";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Submit Periodic Research Progress Report"
      description="Record research accomplishments, update milestone progress, and identify municipal or technical support needs."
      maxWidth="xl"
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4 pt-2"
      >
        {errorMessage && (
          <div className="p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* 1. REPORTING PERIOD */}
        <div className="p-3.5 bg-muted/30 border border-border/70 rounded-xl space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Reporting Period (5-Day Cadence)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Period Start</span>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Period End</span>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        {/* 2. COMPLETED ACTIVITIES */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center justify-between">
            <span>What Was Completed *</span>
            <span className="text-[10px] text-muted-foreground font-normal">Required</span>
          </label>
          <textarea
            required
            rows={3}
            value={summaryCompleted}
            onChange={(e) => setSummaryCompleted(e.target.value)}
            placeholder="Detailed overview of research experiments, prototype assemblies, field surveys, or algorithms finalized during this cycle..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
          />
        </div>

        {/* 3. CURRENT FINDINGS */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Current Findings / Technical Discoveries (Optional)
          </label>
          <textarea
            rows={2}
            value={currentFindings}
            onChange={(e) => setCurrentFindings(e.target.value)}
            placeholder="Notable empirical findings, sensor accuracy gains, mathematical anomalies, or lab observations..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
          />
        </div>

        {/* 4. LINKED MILESTONE & PROGRESS */}
        {milestones.length > 0 && (
          <div className="p-3.5 bg-sky-50/20 border border-sky-200/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>Progress Milestone</span>
              </label>
              <span className="font-mono font-bold text-primary">{milestoneProgressPct}%</span>
            </div>

            <select
              value={selectedMilestoneId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedMilestoneId(id);
                const found = milestones.find((m) => m.id === id);
                if (found) {
                  setMilestoneProgressPct(found.completion_percentage);
                }
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
            >
              <option value="">-- No milestone change this cycle --</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  M{m.sequence_order}: {m.title} (Currently {m.completion_percentage}%)
                </option>
              ))}
            </select>

            {selectedMilestoneId && (
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground block">
                  Update milestone completion to:
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={milestoneProgressPct}
                  onChange={(e) => setMilestoneProgressPct(parseInt(e.target.value, 10))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* 5. NEXT PLANNED WORK */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center justify-between">
            <span>Next Planned Work (Upcoming 5-Day Plan) *</span>
            <span className="text-[10px] text-muted-foreground font-normal">Required</span>
          </label>
          <textarea
            required
            rows={2}
            value={nextPlannedWork}
            onChange={(e) => setNextPlannedWork(e.target.value)}
            placeholder="Specific tasks, fabrication targets, test setups, or analyses planned for the next 5 days..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
          />
        </div>

        {/* 6. SUPPORT REQUIRED (FUTURE MARKETPLACE READY) */}
        <div className="p-3.5 bg-amber-50/20 border border-amber-200/70 rounded-xl space-y-2.5">
          <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-700" />
            <span>Support or Resources Required (Optional)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={supportRequired}
                onChange={(e) => setSupportRequired(e.target.value)}
                placeholder="e.g. Access to municipal canal telemetry data or 20 additional soil moisture probes"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div>
              <select
                value={supportCategory}
                onChange={(e) => setSupportCategory(e.target.value as SupportCategory)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
              >
                <option value="">-- Category --</option>
                <option value="HARDWARE">Hardware / Sensors</option>
                <option value="DATA_ACCESS">Municipal Data Access</option>
                <option value="TESTBED">Field Testbed / Site</option>
                <option value="REGULATORY">Regulatory Clearance</option>
                <option value="TECHNICAL_ADVISORY">Technical Advisory</option>
                <option value="FINANCIAL">Financial / Grants</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* 7. COLLAPSIBLE EVIDENCE ATTACHMENT */}
        <div className="border border-border/70 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              <span>Attach External Link / Artifact</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHasEvidence(!hasEvidence)}
              className="h-7 px-2 text-xs text-primary font-semibold"
            >
              {hasEvidence ? "Remove" : "+ Add Link / Evidence"}
            </Button>
          </div>

          {hasEvidence && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/50">
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Title</span>
                <input
                  type="text"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  placeholder="e.g. Hydro-Telemetry Git Repository"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Type</span>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="REPORT">Research Report</option>
                  <option value="CODE_REPO">Code Repository (GitHub/GitLab)</option>
                  <option value="DATASET">Dataset / Benchmark</option>
                  <option value="DASHBOARD">Interactive Dashboard</option>
                  <option value="IMAGE">Image / Diagram</option>
                  <option value="VIDEO">Video / Demonstration</option>
                  <option value="PUBLICATION">Academic Publication</option>
                  <option value="PROTOTYPE_DOC">Prototype Documentation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] text-muted-foreground block mb-1">URL</span>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] text-muted-foreground block mb-1">Description (Optional)</span>
                <input
                  type="text"
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  placeholder="Brief note or summary of deliverable..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>
            </div>
          )}
        </div>

        {/* 8. COLLAPSIBLE BLOCKER / RISK REPORT */}
        <div className="border border-border/70 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Report Blocker or Emerging Risk</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHasBlocker(!hasBlocker)}
              className="h-7 px-2 text-xs text-amber-700 font-semibold"
            >
              {hasBlocker ? "Remove" : "+ Report Blocker/Risk"}
            </Button>
          </div>

          {hasBlocker && (
            <div className="space-y-2.5 pt-2 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">Type</span>
                  <select
                    value={blockerType}
                    onChange={(e) => setBlockerType(e.target.value as "BLOCKER" | "RISK")}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="BLOCKER">Active Blocker (Halting Work)</option>
                    <option value="RISK">Technical Risk (Future Impact)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">Severity</span>
                  <select
                    value={blockerSeverity}
                    onChange={(e) => setBlockerSeverity(e.target.value as BlockerSeverity)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Title</span>
                <input
                  type="text"
                  value={blockerTitle}
                  onChange={(e) => setBlockerTitle(e.target.value)}
                  placeholder="e.g. Sensor supply chain shortage"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Description</span>
                <textarea
                  rows={2}
                  value={blockerDesc}
                  onChange={(e) => setBlockerDesc(e.target.value)}
                  placeholder="Explanation of the issue and how it affects the timeline..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            {isSubmitting ? "Submitting Report..." : "Submit Progress Update"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
