import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Handshake,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  APPLICATION_STATUS_META,
  fetchIndustryOrganizationProfile,
  fetchMarketplaceListingDetail,
  submitSupportApplication,
  SUPPORT_CATEGORY_META,
  type PublicMarketplaceListing,
} from "@/lib/marketplace";
import type {
  IndustryOrganizationRow,
  ResearchSupportApplicationRow,
} from "@/types/database";

export function IndustryListingDetailPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { profile } = useAppSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<PublicMarketplaceListing | null>(null);
  const [organization, setOrganization] = useState<IndustryOrganizationRow | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [existingApplication, setExistingApplication] = useState<ResearchSupportApplicationRow | null>(null);

  // Application Dialog
  const [applyOpen, setApplyOpen] = useState(false);
  const [proposedContribution, setProposedContribution] = useState("");
  const [capabilitiesSummary, setCapabilitiesSummary] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [timeline, setTimeline] = useState("");
  const [termsOrConditions, setTermsOrConditions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function loadData() {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    try {
      let orgData: IndustryOrganizationRow | null = null;
      if (profile?.organization_id) {
        orgData = await fetchIndustryOrganizationProfile(profile.organization_id);
        setOrganization(orgData);
      }

      const res = await fetchMarketplaceListingDetail(listingId, profile?.organization_id ?? null);
      setListing(res.listing);
      setHasApplied(res.hasApplied);
      setExistingApplication(res.existingApplication ?? null);
    } catch (err: unknown) {
      console.error("Failed to load listing detail:", err);
      setError(err instanceof Error ? err.message : "Opportunity listing not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!listingId) return;
      try {
        let orgData: IndustryOrganizationRow | null = null;
        if (profile?.organization_id) {
          orgData = await fetchIndustryOrganizationProfile(profile.organization_id);
          if (isMounted) setOrganization(orgData);
        }

        const res = await fetchMarketplaceListingDetail(listingId, profile?.organization_id ?? null);
        if (isMounted) {
          setListing(res.listing);
          setHasApplied(res.hasApplied);
          setExistingApplication(res.existingApplication ?? null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to load listing detail:", err);
          setError(err instanceof Error ? err.message : "Opportunity listing not found.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    void init();
    return () => {
      isMounted = false;
    };
  }, [listingId, profile?.organization_id]);

  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listing || !organization || !profile) return;

    if (!proposedContribution.trim() || !capabilitiesSummary.trim()) {
      setSubmitError("Please fill in both the proposed contribution and capabilities summary.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitSupportApplication({
        listingId: listing.id,
        organizationId: organization.id,
        applicantProfileId: profile.id,
        proposedContribution: proposedContribution.trim(),
        capabilitiesSummary: capabilitiesSummary.trim(),
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        timeline: timeline.trim() || null,
        termsOrConditions: termsOrConditions.trim() || null,
      });

      setApplyOpen(false);
      await loadData();
    } catch (err: unknown) {
      console.error("Failed to submit support application:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-20 text-center text-xs text-muted-foreground space-y-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        <p>Loading opportunity details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="space-y-4 max-w-lg mx-auto p-8">
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm font-bold text-red-950">Listing Not Found</p>
            <p className="text-xs text-red-800">{error ?? "This listing may have expired or been closed."}</p>
            <Button size="sm" variant="outline" onClick={() => { void navigate("/app/industry/marketplace"); }}>
              Return to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const catMeta = SUPPORT_CATEGORY_META[listing.category];
  const isOrgVerified = organization?.verification_status === "VERIFIED";

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/app/industry/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace Opportunities</span>
        </Link>
      </div>

      {/* Main Header Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={catMeta.badgeTone} className="text-xs font-semibold">
                {catMeta.label}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium">
                {listing.status}
              </Badge>
              {listing.challenge_domain && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {listing.challenge_domain}
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              {listing.applications_count} {listing.applications_count === 1 ? "Organization Applied" : "Organizations Applied"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">
              {listing.challenge_title}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {listing.public_title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {listing.public_summary}
            </p>
          </div>

          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Building2 className="w-4 h-4 text-primary" />
                <span>{listing.institution_name}</span>
              </span>
              {listing.institution_city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{listing.institution_city}</span>
                </span>
              )}
            </div>

            {listing.published_at && (
              <span className="text-[11px] font-mono">
                Published {new Date(listing.published_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Application Status Box */}
      {hasApplied && existingApplication && (
        <Card className="border-emerald-300 bg-emerald-50/40">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-sm text-emerald-950">
                  Your Organization Has Applied
                </span>
              </div>
              <Badge variant={APPLICATION_STATUS_META[existingApplication.status].badgeTone} className="text-xs">
                {APPLICATION_STATUS_META[existingApplication.status].label}
              </Badge>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              <strong>Your Proposed Contribution:</strong> {existingApplication.proposed_contribution}
            </p>
            {existingApplication.review_notes && (
              <div className="p-3 bg-white/80 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Clarification Notes from University:</span>
                </div>
                <p className="pl-4">{existingApplication.review_notes}</p>
              </div>
            )}
            <div className="text-[11px] text-emerald-800 font-mono">
              Submitted on {new Date(existingApplication.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunity Specifications & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Requirements & Outcome */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-border/80 bg-card">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Technical Specifications &amp; Scope</span>
              </h3>

              <div className="space-y-3 text-xs">
                {listing.public_specification && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold block uppercase tracking-wider">
                      Technical Spec:
                    </span>
                    <p className="font-medium text-foreground leading-relaxed">
                      {listing.public_specification}
                    </p>
                  </div>
                )}

                {listing.desired_outcome && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold block uppercase tracking-wider">
                      Target Outcome &amp; Impact:
                    </span>
                    <p className="font-medium text-foreground leading-relaxed">
                      {listing.desired_outcome}
                    </p>
                  </div>
                )}

                {listing.public_timeline && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold block uppercase tracking-wider">
                      Target Schedule:
                    </span>
                    <p className="font-medium text-foreground leading-relaxed">
                      {listing.public_timeline}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controlled Privacy Notice */}
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-0.5">
                <span className="font-semibold text-foreground block">Engagement Rules &amp; Scope</span>
                <p className="leading-relaxed">
                  Support accepted by the university grants a scoped, non-exclusive collaboration role (<code>SUPPORT_SPECIFIC</code>). It does not convey ownership over university intellectual property or raw citizen telemetry.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Application Action Card */}
        <div className="space-y-4">
          <Card className="border-border/80 bg-card shadow-xs">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Handshake className="w-4 h-4 text-primary" />
                <span>Support This Prototype</span>
              </h3>

              {!profile?.organization_id ? (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-2">
                  <p>
                    You are viewing this as a general user. To submit offers, your profile must be linked to an industry partner organization.
                  </p>
                </div>
              ) : !isOrgVerified ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Organization Verification Pending</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    Your organization (<strong>{organization?.name}</strong>) is currently <code>{organization?.verification_status}</code>. Municipal administrators review credentials before applications can be submitted.
                  </p>
                </div>
              ) : hasApplied ? (
                <div className="space-y-2 text-xs">
                  <Button disabled className="w-full text-xs font-semibold gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Application Submitted</span>
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    The research team is reviewing incoming offers. You will be notified of any updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-muted-foreground leading-relaxed">
                    Provide hardware units, software access, test facility slots, or grant support to help the university build this prototype.
                  </p>
                  <Button
                    onClick={() => setApplyOpen(true)}
                    className="w-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Apply to Provide Support</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* APPLY MODAL */}
      <Dialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Submit Support Application"
        description={`Offer support to ${listing.institution_name} for "${listing.public_title}"`}
        maxWidth="2xl"
      >
        <form onSubmit={(e) => { void handleApplySubmit(e); }} className="space-y-4">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Proposed Contribution &amp; Deliverables *
              </label>
              <textarea
                rows={3}
                placeholder="Detail the exact hardware, cloud compute credits, grant amount, or technical consulting hours your organization will provide..."
                value={proposedContribution}
                onChange={(e) => setProposedContribution(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Organization Capabilities &amp; Track Record *
              </label>
              <textarea
                rows={2}
                placeholder="Explain why your company or lab is uniquely suited to deliver this support (previous deployments, certified equipment, etc.)..."
                value={capabilitiesSummary}
                onChange={(e) => setCapabilitiesSummary(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Estimated Commercial Value (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150000"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Delivery Timeline / Schedule
                </label>
                <input
                  type="text"
                  placeholder="e.g. Within 2 weeks of acceptance"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Terms, Conditions, or Scope Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Requires telemetry data feed for validation; 1-year equipment warranty"
                value={termsOrConditions}
                onChange={(e) => setTermsOrConditions(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setApplyOpen(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !proposedContribution.trim() || !capabilitiesSummary.trim()}
              className="text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Support Offer</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
