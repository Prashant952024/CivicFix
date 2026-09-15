import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchProjectSupportRequests,
  PRIORITY_META,
  publishSupportRequest,
  REQUEST_STATUS_META,
  SUPPORT_CATEGORY_META,
} from "@/lib/marketplace";
import type { EnrichedSupportRequest } from "@/lib/marketplace";
import type {
  ResearchProjectMilestoneRow,
  SupportRequestCategory,
} from "@/types/database";
import { CreateSupportRequestDialog } from "./create-support-request-dialog";
import { ApplicationReviewDialog } from "./application-review-dialog";
import {
  Building2,
  Calendar,
  DollarSign,
  Handshake,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Store,
} from "lucide-react";

interface SupportRequirementsCardProps {
  projectId: string;
  challengeId: string;
  institutionId: string;
  profileId: string;
  isGated: boolean;
  proposalStatus?: string | null;
  milestones: ResearchProjectMilestoneRow[];
}

export function SupportRequirementsCard({
  projectId,
  challengeId,
  institutionId,
  profileId,
  isGated,
  proposalStatus,
  milestones,
}: SupportRequirementsCardProps) {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<EnrichedSupportRequest[]>([]);
  const [filterCategory, setFilterCategory] = useState<SupportRequestCategory | "ALL">("ALL");
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<EnrichedSupportRequest | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (isGated) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchProjectSupportRequests(projectId);
        if (!cancelled) {
          setRequests(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load project support requests:", err);
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId, isGated, refreshNonce]);

  async function handleQuickPublish(req: EnrichedSupportRequest) {
    setPublishingId(req.id);
    try {
      await publishSupportRequest({
        requestId: req.id,
        projectId,
        challengeId,
        institutionId,
        actorProfileId: profileId,
        publicTitle: req.title,
        publicSummary: req.description,
        category: req.category,
        publicSpecification: req.specification,
        publicTimeline: req.required_by_date ? `Required by ${new Date(req.required_by_date).toLocaleDateString()}` : null,
        desiredOutcome: req.quantity_or_scope || "Collaborative support for research prototype testing and deployment.",
      });
      triggerRefresh();
    } catch (err) {
      console.error("Failed to publish support request:", err);
    } finally {
      setPublishingId(null);
    }
  }

  const filteredRequests = requests.filter((r) =>
    filterCategory === "ALL" ? true : r.category === filterCategory
  );

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            <span>Research &amp; Innovation Marketplace Support ({requests.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Connect your prototype with verified industry partners, hardware labs, and grant providers for testing and deployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isGated && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerRefresh}
                disabled={loading}
                className="text-xs h-8 gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Support Requirement</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Gating Invariant Warning */}
      {isGated && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-amber-100 text-amber-900 shrink-0">
                <Lock className="w-5 h-5" />
              </span>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-amber-950">
                  Marketplace &amp; Support Requests Locked
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Support requirements and external industry partnerships are gated until your Research Proposal is formally <strong>APPROVED</strong> by the Innovation Manager.
                </p>
                <div className="text-[11px] text-amber-800 font-medium pt-1">
                  Current Proposal Status: <strong>{proposalStatus ?? "DRAFT / NOT SUBMITTED"}</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Requirements Directory */}
      {!isGated && (
        <div className="space-y-3">
          {/* Category Filter Pills */}
          {requests.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFilterCategory("ALL")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filterCategory === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All ({requests.length})
              </button>
              {(
                [
                  "FUNDING",
                  "HARDWARE",
                  "TECHNOLOGY",
                  "EXPERTISE",
                  "INFRASTRUCTURE",
                  "DATA",
                  "MANUFACTURING",
                ] as SupportRequestCategory[]
              ).map((cat) => {
                const count = requests.filter((r) => r.category === cat).length;
                if (count === 0) return null;
                const meta = SUPPORT_CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterCategory === cat
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {meta.label.split("&")[0].trim()} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {requests.length === 0 ? (
            <Card className="border-border/80">
              <CardContent className="p-8">
                <div className="text-center space-y-3 max-w-md mx-auto">
                  <span className="p-3 rounded-xl bg-primary/10 text-primary inline-flex">
                    <Store className="w-6 h-6" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      No Support Requirements Defined
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Need sensors, compute, testing labs, data access, or technical mentors? Create a requirement to list it on the Research &amp; Innovation Marketplace for verified partners.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Requirement</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRequests.map((req) => {
                const categoryMeta = SUPPORT_CATEGORY_META[req.category];
                const priorityMeta = PRIORITY_META[req.priority];
                const statusMeta = REQUEST_STATUS_META[req.status];
                const listing = req.listing;
                const appsCount = listing?.applications_count ?? 0;
                const activePartners = (req.partners ?? []).filter((p) => p.status === "ACTIVE");

                return (
                  <Card
                    key={req.id}
                    className="border-border/80 hover:border-border transition-all bg-card overflow-hidden shadow-xs"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Top row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={categoryMeta.badgeTone} className="text-xs font-semibold">
                            {categoryMeta.label}
                          </Badge>
                          <Badge variant={priorityMeta.badgeTone} className="text-[10px] font-medium">
                            {priorityMeta.label}
                          </Badge>
                          <Badge variant={statusMeta.badgeTone} className="text-[10px] font-medium">
                            {statusMeta.label}
                          </Badge>
                          {req.confidentiality_level && (
                            <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded-md bg-muted">
                              {req.confidentiality_level}
                            </span>
                          )}
                        </div>

                        {/* Marketplace Actions */}
                        <div className="flex items-center gap-2">
                          {req.status === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { void handleQuickPublish(req); }}
                              disabled={publishingId === req.id}
                              className="text-xs h-7 gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-primary" />
                              <span>Publish to Marketplace</span>
                            </Button>
                          )}

                          {listing && (
                            <Button
                              size="sm"
                              variant={appsCount > 0 ? "default" : "outline"}
                              onClick={() => setReviewRequest(req)}
                              className="text-xs h-7 gap-1.5"
                            >
                              <Handshake className="w-3.5 h-3.5" />
                              <span>
                                {appsCount > 0 ? `Review Candidates (${appsCount})` : "View Applications (0)"}
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">
                          {req.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {req.description}
                        </p>
                      </div>

                      {/* Technical Specs & Requirements grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                        {req.specification && (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                            <span className="text-muted-foreground text-[10px] block font-medium">
                              Specifications:
                            </span>
                            <span className="font-semibold text-foreground text-xs truncate block">
                              {req.specification}
                            </span>
                          </div>
                        )}

                        {req.quantity_or_scope && (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                            <span className="text-muted-foreground text-[10px] block font-medium">
                              Scope / Quantity:
                            </span>
                            <span className="font-semibold text-foreground text-xs truncate block">
                              {req.quantity_or_scope}
                            </span>
                          </div>
                        )}

                        {req.estimated_cost != null && (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
                            <div>
                              <span className="text-muted-foreground text-[10px] block font-medium">
                                Budget / Value:
                              </span>
                              <span className="font-semibold text-foreground text-xs">
                                ₹{req.estimated_cost.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {req.required_by_date && (
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div>
                              <span className="text-muted-foreground text-[10px] block font-medium">
                                Needed By:
                              </span>
                              <span className="font-semibold text-foreground text-xs">
                                {new Date(req.required_by_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Linked Milestone Tag */}
                      {req.linked_milestone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                          <span>Linked Milestone:</span>
                          <span className="font-semibold text-foreground">
                            {req.linked_milestone.title}
                          </span>
                        </div>
                      )}

                      {/* Active Partner Card (if accepted) */}
                      {activePartners.length > 0 && (
                        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                                <Building2 className="w-3.5 h-3.5" />
                              </span>
                              <span className="font-bold text-xs text-emerald-950">
                                Active Partner: {activePartners[0].organization?.name ?? "Industry Partner"}
                              </span>
                              <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                SUPPORT_SPECIFIC ACCESS
                              </Badge>
                            </div>
                            <span className="text-[10px] text-emerald-800 font-mono">
                              Onboarded {new Date(activePartners[0].started_at ?? activePartners[0].onboarded_at ?? activePartners[0].created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-900 pl-7 leading-relaxed">
                            {activePartners[0].contribution_summary}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CreateSupportRequestDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        challengeId={challengeId}
        institutionId={institutionId}
        profileId={profileId}
        milestones={milestones}
        onCreated={triggerRefresh}
      />

      {reviewRequest && (
        <ApplicationReviewDialog
          open={Boolean(reviewRequest)}
          onClose={() => setReviewRequest(null)}
          request={reviewRequest}
          profileId={profileId}
          onUpdated={triggerRefresh}
        />
      )}
    </div>
  );
}
