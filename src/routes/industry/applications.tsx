import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Handshake,
  HelpCircle,
  Loader2,
  RefreshCw,
  Send,
  Store,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { supabase } from "@/lib/supabase";
import {
  APPLICATION_STATUS_META,
  fetchIndustryOrganizationProfile,
  fetchOrganizationApplications,
  fetchOrganizationPartnerships,
  SUPPORT_CATEGORY_META,
} from "@/lib/marketplace";
import type {
  ApplicationStatus,
  IndustryOrganizationRow,
  SupportRequestCategory,
} from "@/types/database";

type ApplicationsTab = "applications" | "partnerships";

interface OrganizationApplicationItem {
  id: string;
  listing_id: string;
  organization_id: string;
  status: ApplicationStatus;
  proposed_contribution: string;
  estimated_value: number | null;
  timeline: string | null;
  review_notes: string | null;
  acceptance_agreement_notes: string | null;
  created_at: string;
  listing?: {
    id: string;
    public_title: string;
    category: SupportRequestCategory;
    institution?: {
      name: string;
      city?: string | null;
    } | null;
  } | null;
}

interface OrganizationPartnershipItem {
  id: string;
  project_id: string;
  organization_id: string;
  category: SupportRequestCategory;
  contribution_summary: string;
  notes: string | null;
  status: string;
  access_scope: string;
  started_at: string;
  project?: {
    id: string;
    title: string;
    challenge?: {
      title: string;
    } | null;
    institution?: {
      name: string;
    } | null;
  } | null;
}

export function IndustryApplicationsPage() {
  const navigate = useNavigate();
  const { profile } = useAppSession();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApplicationsTab>("applications");
  const [organization, setOrganization] = useState<IndustryOrganizationRow | null>(null);
  const [applications, setApplications] = useState<OrganizationApplicationItem[]>([]);
  const [partnerships, setPartnerships] = useState<OrganizationPartnershipItem[]>([]);

  const resolveOrganization = useCallback(async (currentProfile: typeof profile): Promise<IndustryOrganizationRow | null> => {
    if (!currentProfile) return null;
    const orgId = currentProfile.organization_id;
    if (orgId) {
      try {
        const directOrg = await fetchIndustryOrganizationProfile(orgId);
        if (directOrg) return directOrg;
      } catch (e) {
        console.warn("Direct org fetch failed, falling back:", e);
      }
    }

    // Fallback 1: Query profile directly from database
    if (currentProfile.id) {
      try {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", currentProfile.id)
          .maybeSingle();
        if (dbProfile?.organization_id) {
          const directOrg = await fetchIndustryOrganizationProfile(dbProfile.organization_id);
          if (directOrg) return directOrg;
        }
      } catch (e) {
        console.warn("Profile org lookup failed:", e);
      }
    }

    // Fallback 2: Match by contact email in industry_organizations
    if (currentProfile.email) {
      try {
        const normalizedEmail = currentProfile.email.trim().toLowerCase();
        const { data: matchedOrg } = await supabase
          .from("industry_organizations")
          .select("*")
          .eq("contact_email", normalizedEmail)
          .maybeSingle();
        if (matchedOrg) {
          void supabase
            .from("profiles")
            .update({ organization_id: matchedOrg.id, updated_at: new Date().toISOString() })
            .eq("id", currentProfile.id);
          return matchedOrg;
        }
      } catch (e) {
        console.warn("Email org lookup failed:", e);
      }
    }

    return null;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const org = await resolveOrganization(profile);
      setOrganization(org);

      if (org) {
        const [apps, parts] = await Promise.all([
          fetchOrganizationApplications(org.id),
          fetchOrganizationPartnerships(org.id),
        ]);
        setApplications(apps);
        setPartnerships(parts);
      }
    } catch (err) {
      console.error("Failed to load organization applications:", err);
    } finally {
      setLoading(false);
    }
  }, [profile, resolveOrganization]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const org = await resolveOrganization(profile);
        if (isMounted) setOrganization(org);

        if (org) {
          const [apps, parts] = await Promise.all([
            fetchOrganizationApplications(org.id),
            fetchOrganizationPartnerships(org.id),
          ]);
          if (isMounted) {
            setApplications(apps);
            setPartnerships(parts);
          }
        }
      } catch (err) {
        console.error("Failed to load organization applications:", err);
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
  }, [profile, resolveOrganization]);

  if (!organization && !loading) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader
          title="My Applications & Partnerships"
          description="Track support applications submitted by your organization to university research prototypes."
        />
        <Card className="border-border/80 max-w-lg mx-auto">
          <CardContent className="p-8 text-center space-y-3">
            <span className="p-3 rounded-xl bg-muted text-muted-foreground inline-flex">
              <Building2 className="w-6 h-6" />
            </span>
            <p className="text-sm font-bold text-foreground">No Organization Profile Linked</p>
            <p className="text-xs text-muted-foreground">
              Your profile is not currently associated with an industry organization. Please contact your civic administrator to link your account.
            </p>
            <Button size="sm" variant="outline" onClick={() => { void navigate("/app/industry/marketplace"); }}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <PageHeader
        title="My Applications &amp; Partnerships"
        description={`Organization: ${organization?.name ?? "Industry Partner"} • Track candidate offers, review notes, and active research partnerships.`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void loadData(); }}
            disabled={loading}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => { void navigate("/app/industry/marketplace"); }}
            className="text-xs h-8 gap-1.5 shadow-xs"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Browse Opportunities</span>
          </Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <Button
          size="sm"
          variant={activeTab === "applications" ? "default" : "ghost"}
          onClick={() => setActiveTab("applications")}
          className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-lg"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Submitted Offers ({applications.length})</span>
        </Button>
        <Button
          size="sm"
          variant={activeTab === "partnerships" ? "default" : "ghost"}
          onClick={() => setActiveTab("partnerships")}
          className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-lg"
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>Active Partnerships ({partnerships.length})</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          <p>Loading application history...</p>
        </div>
      ) : activeTab === "applications" ? (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <Card className="border-border/80">
              <CardContent className="p-12 text-center space-y-3 max-w-md mx-auto">
                <span className="p-3 rounded-xl bg-primary/10 text-primary inline-flex">
                  <Send className="w-6 h-6" />
                </span>
                <p className="text-sm font-bold text-foreground">No Applications Submitted</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Browse open civic research listings and offer specialized hardware, software, or advisory to university teams.
                </p>
                <Button size="sm" onClick={() => { void navigate("/app/industry/marketplace"); }} className="text-xs">
                  Explore Opportunities
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {applications.map((app) => {
                const statusMeta = APPLICATION_STATUS_META[app.status];
                const listing = app.listing;
                const catMeta = listing ? SUPPORT_CATEGORY_META[listing.category] : null;

                return (
                  <Card key={app.id} className="border-border/80 bg-card shadow-xs">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {catMeta && (
                            <Badge variant={catMeta.badgeTone} className="text-xs font-semibold">
                              {catMeta.label}
                            </Badge>
                          )}
                          <Badge variant={statusMeta?.badgeTone ?? "default"} className="text-xs">
                            {statusMeta?.label ?? app.status}
                          </Badge>
                          {listing?.institution && (
                            <span className="text-xs font-medium text-foreground flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              <span>{listing.institution.name}</span>
                            </span>
                          )}
                        </div>

                        {listing?.id && (
                          <Link to={`/app/industry/marketplace/${listing.id}`}>
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                              <span>View Listing</span>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">
                          {listing?.public_title ?? "Research Support Listing"}
                        </h4>
                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1">
                          <span className="text-muted-foreground text-[11px] font-semibold block">
                            Your Proposed Contribution:
                          </span>
                          <p className="text-foreground leading-relaxed">
                            {app.proposed_contribution}
                          </p>
                        </div>
                      </div>

                      {/* Clarification notes if requested by university */}
                      {app.review_notes && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-950 dark:text-amber-200 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-300">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>University Clarification Note</span>
                          </div>
                          <p className="pl-4 leading-relaxed">{app.review_notes}</p>
                        </div>
                      )}

                      {/* Acceptance notes if accepted */}
                      {app.acceptance_agreement_notes && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-emerald-900 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Partnership Agreement &amp; Delivery Scope</span>
                          </div>
                          <p className="pl-4 leading-relaxed">{app.acceptance_agreement_notes}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          {app.estimated_value != null && (
                            <span>Estimated Value: <strong>₹{app.estimated_value.toLocaleString()}</strong></span>
                          )}
                          {app.timeline && (
                            <span>Timeline: <strong>{app.timeline}</strong></span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono">
                          Submitted {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* PARTNERSHIPS TAB */
        <div className="space-y-3">
          {partnerships.length === 0 ? (
            <Card className="border-border/80">
              <CardContent className="p-12 text-center space-y-3 max-w-md mx-auto">
                <span className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 inline-flex">
                  <Handshake className="w-6 h-6" />
                </span>
                <p className="text-sm font-bold text-foreground">No Active Partnerships Yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When a university accepts your support offer, your formal collaboration details will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {partnerships.map((p) => (
                <Card key={p.id} className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {p.project?.title ?? "University Prototype"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {p.project?.institution?.name} • Challenge: {p.project?.challenge?.title}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-xs">
                        SUPPORT_SPECIFIC ACCESS
                      </Badge>
                    </div>

                    <div className="p-3 bg-background border border-border/80 rounded-lg text-xs space-y-1">
                      <span className="text-muted-foreground text-[11px] font-semibold block">
                        Deliverables &amp; Support Summary:
                      </span>
                      <p className="text-foreground leading-relaxed">
                        {p.contribution_summary}
                      </p>
                    </div>

                    {p.notes && (
                      <div className="text-xs text-foreground/80 leading-relaxed pl-1">
                        <strong>Lab Notes:</strong> {p.notes}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span>Category: <strong>{p.category}</strong></span>
                      <span>Onboarded {new Date(p.started_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
