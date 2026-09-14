import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { reportBlockerOrRisk, resolveBlockerOrRisk } from "@/lib/research-workspace";
import type {
  BlockerSeverity,
  ResearchBlockerRiskRow,
} from "@/types/database";

interface RisksAndBlockersCardProps {
  projectId: string;
  items: ResearchBlockerRiskRow[];
  canEdit?: boolean;
  onRefresh?: () => void;
}

const SEVERITY_CONFIG: Record<
  BlockerSeverity,
  { label: string; badgeClass: string }
> = {
  CRITICAL: { label: "Critical", badgeClass: "bg-rose-100 text-rose-900 border-rose-300 font-bold animate-pulse" },
  HIGH: { label: "High", badgeClass: "bg-orange-100 text-orange-900 border-orange-300 font-bold" },
  MEDIUM: { label: "Medium", badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-semibold" },
  LOW: { label: "Low", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
};

export function RisksAndBlockersCard({
  projectId,
  items,
  canEdit = true,
  onRefresh,
}: RisksAndBlockersCardProps) {
  const [filterType, setFilterType] = useState<"ALL" | "BLOCKER" | "RISK" | "OPEN">("OPEN");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [resolvingItem, setResolvingItem] = useState<ResearchBlockerRiskRow | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Report Form State
  const [itemType, setItemType] = useState<"BLOCKER" | "RISK">("BLOCKER");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<BlockerSeverity>("MEDIUM");
  const [supportRequired, setSupportRequired] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    if (filterType === "ALL") return true;
    if (filterType === "OPEN") return item.status !== "RESOLVED";
    if (filterType === "BLOCKER") return item.item_type === "BLOCKER";
    if (filterType === "RISK") return item.item_type === "RISK";
    return true;
  });

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Title and description are required.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await reportBlockerOrRisk({
        projectId,
        itemType,
        title: title.trim(),
        description: description.trim(),
        severity,
        supportRequired: supportRequired.trim() || undefined,
      });

      setTitle("");
      setDescription("");
      setSupportRequired("");
      setReportModalOpen(false);
      onRefresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to report item";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveItem = async () => {
    if (!resolvingItem || !resolutionNotes.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await resolveBlockerOrRisk(resolvingItem.id, projectId, resolutionNotes.trim());
      setResolvingItem(null);
      setResolutionNotes("");
      onRefresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve item";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCount = items.filter((i) => i.status !== "RESOLVED").length;
  const blockersCount = items.filter((i) => i.item_type === "BLOCKER" && i.status !== "RESOLVED").length;

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span>Risks &amp; Blockers ({items.length})</span>
            {blockersCount > 0 && (
              <Badge variant="danger" className="text-[10px] font-bold">
                {blockersCount} Blocking
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            Active technical blockers, resource constraints, and prospective project risks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filters */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/80 text-xs">
            <button
              type="button"
              onClick={() => setFilterType("OPEN")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "OPEN" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("BLOCKER")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "BLOCKER" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Blockers
            </button>
            <button
              type="button"
              onClick={() => setFilterType("RISK")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "RISK" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Risks
            </button>
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "ALL" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({items.length})
            </button>
          </div>

          {canEdit && (
            <Button
              size="sm"
              onClick={() => setReportModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs h-8 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Item</span>
            </Button>
          )}
        </div>
      </div>

      {/* ITEMS LIST */}
      {filteredItems.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="p-8">
            <EmptyState
              icon={ShieldAlert}
              title="No Risks or Blockers Found"
              description="No issues matching this filter. Clear blockers promptly to ensure on-schedule research delivery."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isResolved = item.status === "RESOLVED";
            const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.MEDIUM;

            return (
              <Card
                key={item.id}
                className={`border-border/80 transition-shadow ${
                  isResolved
                    ? "bg-muted/15 opacity-75"
                    : item.item_type === "BLOCKER"
                    ? "border-rose-200 bg-rose-50/15"
                    : "border-amber-200 bg-amber-50/15"
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-black uppercase ${
                          item.item_type === "BLOCKER"
                            ? "bg-rose-100 text-rose-950 border-rose-300"
                            : "bg-amber-100 text-amber-950 border-amber-300"
                        }`}
                      >
                        {item.item_type === "BLOCKER" ? "Active Blocker" : "Technical Risk"}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${sev.badgeClass}`}>
                        {sev.label} Severity
                      </Badge>
                      {isResolved ? (
                        <Badge className="bg-emerald-100 text-emerald-950 border-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline text-emerald-600" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-900 border-sky-300 font-semibold">
                          <Clock className="w-2.5 h-2.5 mr-1 inline text-sky-600" />
                          Open
                        </Badge>
                      )}
                    </div>

                    {!isResolved && canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResolvingItem(item);
                          setResolutionNotes("");
                        }}
                        className="h-7 px-2.5 text-xs font-semibold gap-1 text-emerald-700 hover:bg-emerald-50 self-end sm:self-center"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resolve</span>
                      </Button>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      {item.description}
                    </p>
                  </div>

                  {/* Support Requirement Tag */}
                  {item.support_required && (
                    <div className="p-2.5 rounded-lg bg-amber-100/50 border border-amber-300/80 text-xs flex items-start gap-2">
                      <Wrench className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-950">Support Requested: </span>
                        <span className="text-amber-900">{item.support_required}</span>
                      </div>
                    </div>
                  )}

                  {/* Resolution Notes (if resolved) */}
                  {isResolved && item.resolution_notes && (
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs space-y-0.5">
                      <span className="font-bold text-emerald-950 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolution Notes:
                      </span>
                      <p className="text-emerald-900 pl-4">
                        {item.resolution_notes}
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground font-mono">
                    Reported on {new Date(item.reported_at).toLocaleDateString()}
                    {item.resolved_at && ` • Resolved on ${new Date(item.resolved_at).toLocaleDateString()}`}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* REPORT BLOCKER MODAL */}
      <Dialog
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Blocker or Project Risk"
        description="Notify innovation managers of roadblocks halting execution or risks that could delay delivery."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            void handleCreateItem(e);
          }}
          className="space-y-4 pt-2"
        >
          {errorMsg && (
            <div className="p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Type *</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as "BLOCKER" | "RISK")}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
              >
                <option value="BLOCKER">Active Blocker (Halting Work)</option>
                <option value="RISK">Technical Risk (Future Impact)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Severity *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BlockerSeverity)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
              >
                <option value="CRITICAL">Critical (Total Halt)</option>
                <option value="HIGH">High (Significant Delay)</option>
                <option value="MEDIUM">Medium (Manageable)</option>
                <option value="LOW">Low (Minor Concern)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Issue Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lack of high-precision calibration testbed"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation of the technical problem, dependencies, and expected delay..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Support Required from City / Industry (Optional)
            </label>
            <input
              type="text"
              value={supportRequired}
              onChange={(e) => setSupportRequired(e.target.value)}
              placeholder="e.g. Access to municipal water discharge meters or 15 specialized LoRa probes"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReportModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground font-bold"
            >
              {isSubmitting ? "Reporting..." : "Report Item"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* RESOLVE ITEM MODAL */}
      <Dialog
        open={Boolean(resolvingItem)}
        onClose={() => setResolvingItem(null)}
        title="Resolve Item"
        description={resolvingItem?.title}
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Resolution Summary / Actions Taken *
            </label>
            <textarea
              required
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Hardware acquired through alternative vendor; testbed calibrated and operational."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResolvingItem(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void handleResolveItem();
              }}
              disabled={isSubmitting || !resolutionNotes.trim()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {isSubmitting ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
