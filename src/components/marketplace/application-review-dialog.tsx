import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  acceptSupportApplication,
  APPLICATION_STATUS_META,
  fetchListingApplications,
  rejectSupportApplication,
  requestApplicationClarification,
  SUPPORT_CATEGORY_META,
} from "@/lib/marketplace";
import type {
  EnrichedApplication,
  EnrichedSupportRequest,
} from "@/lib/marketplace";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Loader2,
  Mail,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

interface ApplicationReviewDialogProps {
  open: boolean;
  onClose: () => void;
  request: EnrichedSupportRequest;
  profileId: string;
  onUpdated: () => void;
}

export function ApplicationReviewDialog({
  open,
  onClose,
  request,
  profileId,
  onUpdated,
}: ApplicationReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Action state
  const [actionType, setActionType] = useState<"ACCEPT" | "CLARIFY" | "REJECT" | null>(null);
  const [actionText, setActionText] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const listingId = request.listing?.id;

  useEffect(() => {
    if (!open || !listingId) return;

    let cancelled = false;
    async function load() {
      try {
        const apps = await fetchListingApplications(listingId!);
        if (!cancelled) {
          setApplications(apps);
          setLoading(false);
          if (apps.length > 0 && !selectedAppId) {
            setSelectedAppId(apps[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load applications:", err);
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, listingId, selectedAppId]);

  const selectedApp = applications.find((a) => a.id === selectedAppId) ?? applications[0];

  async function handleExecuteAction() {
    if (!selectedApp) return;

    setActionSubmitting(true);
    setActionError(null);

    try {
      if (actionType === "ACCEPT") {
        await acceptSupportApplication({
          applicationId: selectedApp.id,
          reviewerProfileId: profileId,
          agreementNotes: actionText.trim() || "Offer accepted for research prototype deployment.",
        });
      } else if (actionType === "CLARIFY") {
        await requestApplicationClarification(selectedApp.id, actionText.trim(), profileId);
      } else if (actionType === "REJECT") {
        await rejectSupportApplication({
          applicationId: selectedApp.id,
          reviewerProfileId: profileId,
          rejectionReason: actionText.trim() || "Requirement criteria or terms did not align with current prototype roadmap.",
        });
      }

      setActionType(null);
      setActionText("");
      onUpdated();

      // Refresh applications list
      if (listingId) {
        const refreshed = await fetchListingApplications(listingId);
        setApplications(refreshed);
      }
    } catch (err: unknown) {
      console.error("Action execution failed:", err);
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionSubmitting(false);
    }
  }

  const categoryMeta = SUPPORT_CATEGORY_META[request.category];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Review Support Candidates"
      description={`${request.title} • ${categoryMeta.label} (${applications.length} ${applications.length === 1 ? "Offer" : "Offers"} Received)`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border border-border/80 rounded-xl overflow-hidden bg-background">
          {/* Left Column: Candidates list */}
          <div className="p-3 overflow-y-auto max-h-[260px] md:max-h-[500px] space-y-2 bg-muted/10">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading candidates...</span>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">No Offers Yet</p>
                <p className="mt-1 text-[11px]">
                  This requirement is live on the marketplace. Verified companies will appear here when they submit offers.
                </p>
              </div>
            ) : (
              applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const statusMeta = APPLICATION_STATUS_META[app.status];
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      setSelectedAppId(app.id);
                      setActionType(null);
                      setActionText("");
                      setActionError(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs space-y-1.5 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/80 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground truncate">
                        {app.organization?.name ?? "Partner Organization"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={statusMeta.badgeTone} className="text-[10px] py-0 px-1.5">
                        {statusMeta.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {app.proposed_contribution}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Candidate Detail */}
          <div className="md:col-span-2 p-4 overflow-y-auto max-h-[500px] space-y-4">
            {!selectedApp ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                Select a candidate to review their capabilities and proposed support.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Org header card */}
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-sm text-foreground">
                          {selectedApp.organization.name}
                        </h4>
                        {selectedApp.organization.verification_status === "VERIFIED" && (
                          <Badge variant="success" className="text-[10px] gap-1 py-0">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Industry Partner
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedApp.organization.organization_type} • {selectedApp.organization.sector ?? "Technology & Innovation"}
                      </p>
                    </div>

                    <Badge variant={APPLICATION_STATUS_META[selectedApp.status].badgeTone} className="text-xs">
                      {APPLICATION_STATUS_META[selectedApp.status].label}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {selectedApp.organization.website_url && (
                      <a
                        href={selectedApp.organization.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Website</span>
                      </a>
                    )}
                    {selectedApp.organization.contact_person && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{selectedApp.organization.contact_person}</span>
                      </span>
                    )}
                    {selectedApp.organization.contact_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedApp.organization.contact_email}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Offer details */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-foreground">Proposed Contribution</div>
                    <div className="p-3 rounded-lg border border-border/80 bg-background text-xs text-foreground leading-relaxed">
                      {selectedApp.proposed_contribution}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-foreground">Capabilities &amp; Track Record</div>
                    <div className="p-3 rounded-lg border border-border/80 bg-background text-xs text-muted-foreground leading-relaxed">
                      {selectedApp.capabilities_summary}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedApp.estimated_value != null && (
                      <div className="p-2.5 rounded-lg border border-border/80 bg-background text-xs">
                        <div className="text-muted-foreground text-[11px]">Estimated Value</div>
                        <div className="font-bold text-foreground mt-0.5">
                          ₹{selectedApp.estimated_value.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedApp.timeline && (
                      <div className="p-2.5 rounded-lg border border-border/80 bg-background text-xs">
                        <div className="text-muted-foreground text-[11px]">Delivery Timeline</div>
                        <div className="font-bold text-foreground mt-0.5">
                          {selectedApp.timeline}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedApp.terms_or_conditions && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-foreground">Proposed Terms &amp; Scope</div>
                      <div className="p-2.5 rounded-lg border border-border/80 bg-background text-xs text-muted-foreground">
                        {selectedApp.terms_or_conditions}
                      </div>
                    </div>
                  )}

                  {/* Clarification notes if present */}
                  {selectedApp.review_notes && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                        <span>University Clarification Notes</span>
                      </div>
                      <p className="leading-relaxed pl-5">{selectedApp.review_notes}</p>
                    </div>
                  )}

                  {/* Accepted agreement notes if accepted */}
                  {selectedApp.acceptance_agreement_notes && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Collaboration Agreement &amp; Scope</span>
                      </div>
                      <p className="leading-relaxed pl-5">{selectedApp.acceptance_agreement_notes}</p>
                    </div>
                  )}
                </div>

                {/* Action Box */}
                {selectedApp.status !== "ACCEPTED" && selectedApp.status !== "REJECTED" && (
                  <div className="pt-2 border-t border-border space-y-3">
                    {actionError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{actionError}</span>
                      </div>
                    )}

                    {!actionType ? (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setActionType("ACCEPT");
                            setActionText("");
                          }}
                          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accept Support Offer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionType("CLARIFY");
                            setActionText("");
                          }}
                          className="text-xs gap-1.5"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          Request Clarification
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActionType("REJECT");
                            setActionText("");
                          }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Decline Offer
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border border-border/80 bg-muted/30 space-y-2.5">
                        <div className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>
                            {actionType === "ACCEPT" && "Confirm Partner Acceptance & Agreement Notes"}
                            {actionType === "CLARIFY" && "Ask Clarifying Questions"}
                            {actionType === "REJECT" && "Decline Application (Polite Reason)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActionType(null)}
                            className="text-muted-foreground hover:text-foreground text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={actionText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionText(e.target.value)}
                          placeholder={
                            actionType === "ACCEPT"
                              ? "Specify delivery schedule, point-of-contact at lab, or onboarding notes..."
                              : actionType === "CLARIFY"
                              ? "Specify the technical question or timeline clarification needed..."
                              : "Reason for declining..."
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActionType(null)}
                            disabled={actionSubmitting}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { void handleExecuteAction(); }}
                            disabled={actionSubmitting}
                            className={`text-xs gap-1.5 ${
                              actionType === "ACCEPT"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : actionType === "REJECT"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : ""
                            }`}
                          >
                            {actionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>
                              {actionType === "ACCEPT" && "Confirm & Onboard Partner"}
                              {actionType === "CLARIFY" && "Send Clarification Request"}
                              {actionType === "REJECT" && "Confirm Decline"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
