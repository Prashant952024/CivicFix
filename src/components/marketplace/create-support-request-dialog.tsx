import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  createSupportRequest,
  SUPPORT_CATEGORY_META,
  type UniversityEligibleProject,
} from "@/lib/marketplace";
import type {
  SupportConfidentiality,
  SupportRequestCategory,
  SupportRequestPriority,
} from "@/types/database";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

interface CreateSupportRequestDialogProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
  onCreated: () => void;
  // Workspace Mode (Direct project context)
  projectId?: string;
  challengeId?: string;
  institutionId?: string;
  milestones?: { id: string; title: string; sequence_order: number }[];
  // Global University Mode (Dropdown selection of eligible approved projects)
  eligibleProjects?: UniversityEligibleProject[];
}

const CATEGORIES: SupportRequestCategory[] = [
  "FUNDING",
  "HARDWARE",
  "TECHNOLOGY",
  "EXPERTISE",
  "INFRASTRUCTURE",
  "DATA",
  "MANUFACTURING",
];

const PRIORITIES: SupportRequestPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function CreateSupportRequestDialog({
  open,
  onClose,
  profileId,
  projectId: propProjectId,
  challengeId: propChallengeId,
  institutionId: propInstitutionId,
  milestones: propMilestones,
  eligibleProjects,
  onCreated,
}: CreateSupportRequestDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected project for Global University Mode
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (propProjectId) return propProjectId;
    if (eligibleProjects && eligibleProjects.length > 0) {
      const approved = eligibleProjects.find((p) => p.has_approved_proposal);
      return approved ? approved.id : eligibleProjects[0].id;
    }
    return "";
  });

  const effectiveProjectId = propProjectId || selectedProjectId || (eligibleProjects && eligibleProjects.length > 0 ? (eligibleProjects.find((p) => p.has_approved_proposal)?.id ?? eligibleProjects[0].id) : "");
  const activeProject = eligibleProjects?.find((p) => p.id === effectiveProjectId);
  const activeProjectId = effectiveProjectId;
  const activeChallengeId = propChallengeId || activeProject?.challenge_id || "";
  const activeInstitutionId = propInstitutionId || activeProject?.institution_id || "";
  const availableMilestones = propMilestones || activeProject?.milestones || [];
  const isApproved = propProjectId ? true : (activeProject?.has_approved_proposal ?? true);

  const [category, setCategory] = useState<SupportRequestCategory>("HARDWARE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportRequestPriority>("MEDIUM");
  const [specification, setSpecification] = useState("");
  const [quantityOrScope, setQuantityOrScope] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [requiredByDate, setRequiredByDate] = useState("");
  const [linkedMilestoneId, setLinkedMilestoneId] = useState<string>("none");
  const [confidentialityLevel, setConfidentialityLevel] = useState<SupportConfidentiality>("RESTRICTED");
  const [autoPublish, setAutoPublish] = useState(true);

  const selectedCategoryMeta = SUPPORT_CATEGORY_META[category];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProjectId || !activeChallengeId || !activeInstitutionId) {
      setError("Please select a research project to link this requirement to.");
      return;
    }
    if (!isApproved) {
      setError("This project does not have an approved proposal yet. Only approved projects can request marketplace support.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Please fill out the title and description.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createSupportRequest({
        challengeId: activeChallengeId,
        institutionId: activeInstitutionId,
        projectId: activeProjectId,
        createdBy: profileId,
        category,
        title: title.trim(),
        description: description.trim(),
        priority,
        specification: specification.trim() || null,
        quantityOrScope: quantityOrScope.trim() || null,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        currency,
        requiredByDate: requiredByDate || null,
        linkedMilestoneId: linkedMilestoneId === "none" ? null : linkedMilestoneId,
        confidentialityLevel,
        autoPublish,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setSpecification("");
      setQuantityOrScope("");
      setEstimatedCost("");
      setRequiredByDate("");
      setLinkedMilestoneId("none");
      onClose();
      onCreated();
    } catch (err: unknown) {
      console.error("Failed to create support request:", err);
      setError(err instanceof Error ? err.message : "Failed to record support requirement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Define Research Support Requirement"
      description="Request specialized hardware, cloud resources, funding, or industrial domain expertise for your prototype."
      maxWidth="2xl"
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Project Selection (shown when in Global University Marketplace mode) */}
          {!propProjectId && eligibleProjects && (
            <div className="space-y-1.5 p-3 bg-muted/40 rounded-lg border border-border/80">
              <label htmlFor="select-project" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Select Research Project &amp; Problem Statement *</span>
                {activeProject && (
                  <span className={`text-[11px] flex items-center gap-1 font-normal ${
                    activeProject.has_approved_proposal ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                  }`}>
                    {activeProject.has_approved_proposal ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Proposal Approved
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" /> Proposal Under Review
                      </>
                    )}
                  </span>
                )}
              </label>
              <select
                id="select-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {eligibleProjects.length === 0 ? (
                  <option value="">No active research projects found</option>
                ) : (
                  eligibleProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.challenge ? `(${p.challenge.title})` : ""} {p.has_approved_proposal ? "✓ Approved" : "⏳ Pending Approval"}
                    </option>
                  ))
                )}
              </select>
              {!isApproved && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  ⚠️ This project does not have an approved proposal yet. Only projects with approved proposals can publish requirements to the marketplace.
                </p>
              )}
            </div>
          )}

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Support Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const meta = SUPPORT_CATEGORY_META[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 font-semibold text-primary shadow-xs ring-1 ring-primary/30"
                        : "border-border hover:border-border/80 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="truncate">{meta.label.split("&")[0].trim()}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {selectedCategoryMeta.description}
            </p>
          </div>

          {/* Title & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="title" className="text-xs font-semibold text-foreground">
                Requirement Title *
              </label>
              <input
                id="title"
                type="text"
                placeholder={
                  category === "FUNDING"
                    ? "e.g. Prototype Co-Funding for Sensor Field Deployment"
                    : category === "HARDWARE"
                    ? "e.g. 10x Ultrasonic Depth Sensors & LoRaWAN Modems"
                    : category === "EXPERTISE"
                    ? "e.g. Embedded Firmware & Low-Power RF Domain Expert"
                    : category === "INFRASTRUCTURE"
                    ? "e.g. Environmental Testing Chamber & Vibration Rig Access"
                    : category === "DATA"
                    ? "e.g. 3-Year Historical Municipal Water Quality Sensor Feed"
                    : "e.g. Rapid CNC & 3D Prototyping for Casing Enclosures"
                }
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="priority" className="text-xs font-semibold text-foreground">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as SupportRequestPriority)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-xs font-semibold text-foreground">
              Objective &amp; Description *
            </label>
            <textarea
              id="description"
              rows={2}
              placeholder="Explain what problem this support solves and how the research team will integrate it into the prototype..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              required
            />
          </div>

          {/* Technical Specification & Quantity/Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="specification" className="text-xs font-semibold text-foreground">
                Technical Specifications / Deliverables
              </label>
              <input
                id="specification"
                type="text"
                placeholder={
                  category === "FUNDING"
                    ? "e.g. Disbursed across 3 prototype testing milestones"
                    : category === "HARDWARE"
                    ? "e.g. IP67 waterproof, I2C/UART interface, 20m range"
                    : category === "TECHNOLOGY"
                    ? "e.g. Python SDK, REST API, >100 req/sec rate limit"
                    : "e.g. Industry standard SLA and deliverable specifications"
                }
                value={specification}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpecification(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="scope" className="text-xs font-semibold text-foreground">
                Quantity / Desired Scope
              </label>
              <input
                id="scope"
                type="text"
                placeholder={
                  category === "FUNDING"
                    ? "e.g. Full grant or partial sponsorship"
                    : category === "HARDWARE"
                    ? "e.g. 10 physical units"
                    : category === "EXPERTISE"
                    ? "e.g. 4 hours/week for 2 months"
                    : "e.g. Target scope or test sessions"
                }
                value={quantityOrScope}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantityOrScope(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Estimated Value & Needed By Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="cost" className="text-xs font-semibold text-foreground">
                Estimated Value ({currency})
              </label>
              <input
                id="cost"
                type="number"
                min="0"
                placeholder="e.g. 50000"
                value={estimatedCost}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEstimatedCost(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="currency" className="text-xs font-semibold text-foreground">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="date" className="text-xs font-semibold text-foreground">
                Required By Date
              </label>
              <input
                id="date"
                type="date"
                value={requiredByDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequiredByDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Linked Milestone & Confidentiality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="milestone" className="text-xs font-semibold text-foreground">
                Link to Research Milestone
              </label>
              <select
                id="milestone"
                value={linkedMilestoneId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLinkedMilestoneId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="none">-- General Requirement (Not tied to milestone) --</option>
                {availableMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    Milestone {m.sequence_order}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confidentiality" className="text-xs font-semibold text-foreground">
                Confidentiality Level
              </label>
              <select
                id="confidentiality"
                value={confidentialityLevel}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConfidentialityLevel(e.target.value as SupportConfidentiality)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PUBLIC">Public (Visible to all verified industry partners)</option>
                <option value="RESTRICTED">Restricted (Controlled summary on marketplace)</option>
                <option value="INTERNAL">Internal (University &amp; Innovation Manager only)</option>
              </select>
            </div>
          </div>

          {/* Auto-publish toggle */}
          <div className="p-3 bg-muted/40 rounded-lg border border-border/80 flex items-start space-x-2.5">
            <input
              id="autopublish"
              type="checkbox"
              checked={autoPublish}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoPublish(e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <div className="space-y-0.5">
              <label
                htmlFor="autopublish"
                className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Publish directly to the Research &amp; Innovation Marketplace
              </label>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Verified tech companies, hardware vendors, and startups can discover this requirement and submit offers to support your team.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !title.trim() || !description.trim()}
            className="text-xs gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{autoPublish ? "Create & Publish" : "Save as Draft"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
