import { useState } from "react";
import {
  Code,
  Database,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  Layout,
  Link2,
  Plus,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { addResearchEvidence } from "@/lib/research-workspace";
import type { EvidenceType, ResearchEvidenceRow } from "@/types/database";

interface EvidenceAndResourcesCardProps {
  projectId: string;
  evidence: ResearchEvidenceRow[];
  canEdit?: boolean;
  onRefresh?: () => void;
}

const TYPE_ICONS: Record<EvidenceType, React.ComponentType<{ className?: string }>> = {
  REPORT: FileText,
  CODE_REPO: Code,
  DATASET: Database,
  IMAGE: FileCheck,
  VIDEO: Video,
  DASHBOARD: Layout,
  PUBLICATION: Globe,
  PROTOTYPE_DOC: FileCheck,
  OTHER: Link2,
};

export function EvidenceAndResourcesCard({
  projectId,
  evidence,
  canEdit = true,
  onRefresh,
}: EvidenceAndResourcesCardProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("CODE_REPO");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredItems = evidence.filter((e) => {
    if (filterType === "ALL") return true;
    return e.evidence_type === filterType;
  });

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await addResearchEvidence({
        projectId,
        title: title.trim(),
        evidenceType,
        url: url.trim() || undefined,
        description: description.trim() || undefined,
      });

      setTitle("");
      setUrl("");
      setDescription("");
      setModalOpen(false);
      onRefresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record resource";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <span>Deliverables, Evidence &amp; External Resources ({evidence.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Verified research deliverables, repositories, datasets, and public dashboards.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/80 text-xs">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "ALL" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({evidence.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("CODE_REPO")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "CODE_REPO" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Code Repos
            </button>
            <button
              type="button"
              onClick={() => setFilterType("DATASET")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "DATASET" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Datasets
            </button>
            <button
              type="button"
              onClick={() => setFilterType("REPORT")}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                filterType === "REPORT" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reports
            </button>
          </div>

          {canEdit && (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs h-8 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Resource</span>
            </Button>
          )}
        </div>
      </div>

      {/* ITEMS LIST */}
      {filteredItems.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="p-8">
            <EmptyState
              icon={Link2}
              title="No Evidence or Resources Linked"
              description="Attach GitHub repositories, dataset archives, published reports, or telemetry dashboards to provide auditable evidence of research progress."
              action={
                canEdit ? (
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    Add First Resource
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const Icon = TYPE_ICONS[item.evidence_type] || Link2;

            return (
              <Card key={item.id} className="border-border/80 shadow-xs hover:border-primary/60 transition-colors">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-foreground leading-snug">
                          {item.title}
                        </h4>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium mt-0.5 bg-muted/30">
                          {item.evidence_type}
                        </Badge>
                      </div>
                    </div>

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="Open external resource"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 leading-relaxed pl-8">
                      {item.description}
                    </p>
                  )}

                  {item.url && (
                    <div className="pl-8 pt-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-mono text-primary truncate block hover:underline"
                      >
                        {item.url}
                      </a>
                    </div>
                  )}

                  <div className="pl-8 text-[10px] text-muted-foreground font-mono">
                    Recorded on {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ADD EVIDENCE MODAL */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Deliverable, Evidence or External Resource"
        description="Link repositories, research dashboards, datasets, or reports created during this project."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            void handleAddEvidence(e);
          }}
          className="space-y-4 pt-2"
        >
          {errorMsg && (
            <div className="p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Resource Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Open-Hardware Sensor Node Firmware"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Artifact Type *</label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            >
              <option value="CODE_REPO">Code Repository (GitHub / GitLab)</option>
              <option value="DATASET">Hydrological / Agricultural Dataset</option>
              <option value="DASHBOARD">Interactive Telemetry Dashboard</option>
              <option value="REPORT">Peer-Reviewed / Technical Report</option>
              <option value="PROTOTYPE_DOC">Hardware Architecture &amp; Schematics</option>
              <option value="IMAGE">Photos &amp; Lab Calibration Diagrams</option>
              <option value="VIDEO">Video Demonstration / Field Pilot</option>
              <option value="PUBLICATION">Published Academic Paper</option>
              <option value="OTHER">Other Resource</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">External URL / Location</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/iitb-water/sensor-nodes"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Description &amp; Context</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain how this artifact supports the milestone or validates the solution..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(false)}
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
              {isSubmitting ? "Adding..." : "Add Resource Link"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
