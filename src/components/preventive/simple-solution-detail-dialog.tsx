import { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { SimpleSolutionKnowledgeBaseRow } from "@/types/database";

interface SimpleSolutionDetailDialogProps {
  solution: SimpleSolutionKnowledgeBaseRow | null;
  open: boolean;
  onClose: () => void;
}

export function SimpleSolutionDetailDialog({
  solution,
  open,
  onClose,
}: SimpleSolutionDetailDialogProps) {
  const [activeImageTab, setActiveImageTab] = useState<"before" | "after">("after");

  if (!solution) return null;

  const beforeImgs = Array.isArray(solution.before_evidence_images)
    ? (solution.before_evidence_images as any[])
    : [];
  const afterImgs = Array.isArray(solution.after_evidence_images)
    ? (solution.after_evidence_images as any[])
    : [];

  const materials = solution.materials_used || [];
  const contributingFactors = solution.contributing_factors || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl" className="max-w-3xl p-6">
      <div className="space-y-6">
        {/* Header Badges & Title */}
        <div className="space-y-2 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-sky-500/10 text-sky-700 border-sky-300/40 font-semibold">
              {solution.category}
            </Badge>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-rose-500" /> {solution.area_name}
            </span>
            {solution.department_name && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {solution.department_name}
              </span>
            )}
            <Badge variant="success" className="gap-1 text-[11px]">
              <ShieldCheck className="h-3 w-3" /> Citizen Verified
            </Badge>
          </div>

          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            {solution.title}
          </h2>

          {solution.location_text && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {solution.location_text}
              {solution.address_text && solution.address_text !== solution.location_text && (
                <span> &bull; {solution.address_text}</span>
              )}
            </p>
          )}
        </div>

        {/* Core Lineage Grid */}
        <div className="space-y-5">
          {/* 1. Problem Context & Root Cause */}
          <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Problem Context & Root Cause
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              {solution.description}
            </p>
            <div className="rounded-xl bg-background/80 p-3 border border-border/60 space-y-1.5 text-xs">
              <div>
                <span className="font-semibold text-foreground">Identified Root Cause: </span>
                <span className="text-muted-foreground">
                  {solution.identified_root_cause || "Operational wear and departmental maintenance requirement."}
                </span>
              </div>
              {contributingFactors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Contributing Factors:</span>
                  {contributingFactors.map((factor, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] text-foreground border border-border/60"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Resolution Procedure & Materials */}
          <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Standard Resolution Procedure
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {solution.resolution_summary}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/50 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-sky-600" /> Materials & Equipment Used:
                </span>
                <div className="flex flex-wrap gap-1">
                  {materials.length > 0 ? (
                    materials.map((mat, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-background px-2 py-0.5 text-[11px] text-foreground border border-border/60"
                      >
                        {mat}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Standard municipal repair materials</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" /> Resolution Turnaround:
                </span>
                <span className="text-muted-foreground">
                  {solution.resolution_duration_hours
                    ? `${solution.resolution_duration_hours} hours from report to fix`
                    : "Standard operational turnaround"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Citizen Verification Evidence & Timing */}
          <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-indigo-600" /> Citizen Verification & Seasonal Context
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {new Date(solution.closed_at).toLocaleDateString()}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-background/80 p-3 border border-border/60 space-y-1">
                <span className="font-semibold text-foreground">Citizen Verification Feedback:</span>
                <p className="text-muted-foreground italic">
                  &ldquo;{solution.citizen_feedback || "Resolution inspected and verified by citizen."}&rdquo;
                </p>
                {solution.verified_at && (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Verified on: {new Date(solution.verified_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-background/80 p-3 border border-border/60 space-y-1">
                <span className="font-semibold text-foreground">Seasonal Window:</span>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Season: {solution.occurrence_season}
                  </Badge>
                  <span>Month: {solution.occurrence_month}</span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Used by recurrence engine for seasonal pattern clustering.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Before & After Evidence Images if available */}
          {(beforeImgs.length > 0 || afterImgs.length > 0) && (
            <div className="rounded-2xl border border-border/70 bg-surface-elevated/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-emerald-600" /> Verification Evidence Images
                </span>
                <div className="flex items-center rounded-xl bg-background/80 p-1 border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveImageTab("before")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      activeImageTab === "before"
                        ? "bg-surface-elevated text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Before ({beforeImgs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageTab("after")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      activeImageTab === "after"
                        ? "bg-surface-elevated text-emerald-700 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    After ({afterImgs.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
                {(activeImageTab === "before" ? beforeImgs : afterImgs).map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-video overflow-hidden rounded-xl border border-border/70 bg-background/60"
                  >
                    <img
                      src={img.storage_path || "/placeholder.svg"}
                      alt={`${activeImageTab} evidence ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
          <div>
            Knowledge Reference: <span className="font-mono text-foreground">{solution.id.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Close
            </Button>
            <Button asChild size="sm" className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Link to={`/app/officer/issues/${solution.source_issue_id}`}>
                View Original Issue <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
