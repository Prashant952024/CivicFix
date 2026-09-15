import { useEffect, useState } from "react";
import {
  Building2,
  ExternalLink,
  Eye,
  Handshake,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchInnovationMarketplaceOverview,
  PRIORITY_META,
  REQUEST_STATUS_META,
  SUPPORT_CATEGORY_META,
} from "@/lib/marketplace";
import { supabase } from "@/lib/supabase";
import type {
  IndustryOrganizationRow,
  ResearchSupportRequestRow,
  SupportRequestCategory,
  SupportRequestStatus,
  VerificationStatus,
} from "@/types/database";

type ActiveTab = "requirements" | "organizations" | "partnerships";

interface JoinedRequestItem extends ResearchSupportRequestRow {
  institution?: { name: string; city?: string | null } | null;
  challenge?: { title: string } | null;
  project?: { title: string } | null;
}

interface OverviewPartner {
  id: string;
  project_id: string;
  organization_id: string;
  request_id: string | null;
  application_id: string | null;
  category: SupportRequestCategory;
  contribution_summary: string;
  status: string;
  access_scope: string;
  started_at: string;
}

export function InnovationMarketplacePage() {
  const { profile } = useAppSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("requirements");

  // Overview data
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    publishedListings: 0,
    totalApplications: 0,
    activePartnerships: 0,
    verifiedOrganizations: 0,
    pendingOrganizations: 0,
  });
  const [requests, setRequests] = useState<JoinedRequestItem[]>([]);
  const [organizations, setOrganizations] = useState<IndustryOrganizationRow[]>([]);
  const [partners, setPartners] = useState<OverviewPartner[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SupportRequestCategory | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<SupportRequestStatus | "ALL">("ALL");

  // Inspection modal
  const [inspectedRequest, setInspectedRequest] = useState<JoinedRequestItem | null>(null);

  // Organization verification action state
  const [verifyingOrgId, setVerifyingOrgId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInnovationMarketplaceOverview();
      setMetrics(data.metrics);
      setRequests(data.requests as unknown as JoinedRequestItem[]);
      setOrganizations(data.organizations as IndustryOrganizationRow[]);
      setPartners(data.partners as unknown as OverviewPartner[]);
    } catch (err: unknown) {
      console.error("Error loading marketplace overview:", err);
      setError(err instanceof Error ? err.message : "Failed to load marketplace data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const data = await fetchInnovationMarketplaceOverview();
        if (!isMounted) return;
        setMetrics(data.metrics);
        setRequests(data.requests as unknown as JoinedRequestItem[]);
        setOrganizations(data.organizations as IndustryOrganizationRow[]);
        setPartners(data.partners as unknown as OverviewPartner[]);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error("Error loading marketplace overview:", err);
        setError(err instanceof Error ? err.message : "Failed to load marketplace data.");
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
  }, []);

  async function handleVerifyOrganization(orgId: string, newStatus: VerificationStatus) {
    if (!profile?.id) return;
    setVerifyingOrgId(orgId);
    try {
      const { error: updateErr } = await supabase
        .from("industry_organizations")
        .update({
          verification_status: newStatus,
          verified_at: newStatus === "VERIFIED" ? new Date().toISOString() : null,
          verified_by: newStatus === "VERIFIED" ? profile.id : null,
        })
        .eq("id", orgId);

      if (updateErr) throw updateErr;
      await loadData();
    } catch (err) {
      console.error("Failed to update organization status:", err);
    } finally {
      setVerifyingOrgId(null);
    }
  }

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchInst = r.institution?.name?.toLowerCase().includes(q);
      const matchChal = r.challenge?.title?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchInst && !matchChal) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Innovation Marketplace Control Center"
        description="Monitor research support requirements across university projects, govern marketplace listings, and verify industry partner organizations."
      >
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
      </PageHeader>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider block">
              Support Requests
            </span>
            <div className="text-2xl font-bold text-foreground">{metrics.totalRequests}</div>
            <div className="text-[10px] text-muted-foreground">Across all challenges</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-emerald-700 text-[11px] font-medium uppercase tracking-wider block">
              Open Listings
            </span>
            <div className="text-2xl font-bold text-emerald-950">{metrics.publishedListings}</div>
            <div className="text-[10px] text-emerald-800">Published to public</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/80 bg-blue-50/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-blue-700 text-[11px] font-medium uppercase tracking-wider block">
              Offers Received
            </span>
            <div className="text-2xl font-bold text-blue-950">{metrics.totalApplications}</div>
            <div className="text-[10px] text-blue-800">From industry candidates</div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/80 bg-indigo-50/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-indigo-700 text-[11px] font-medium uppercase tracking-wider block">
              Active Partners
            </span>
            <div className="text-2xl font-bold text-indigo-950">{metrics.activePartnerships}</div>
            <div className="text-[10px] text-indigo-800">Onboarded &amp; deployed</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider block">
              Verified Orgs
            </span>
            <div className="text-2xl font-bold text-foreground">{metrics.verifiedOrganizations}</div>
            <div className="text-[10px] text-muted-foreground">Accredited partners</div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-amber-50/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-amber-700 text-[11px] font-medium uppercase tracking-wider block">
              Pending Orgs
            </span>
            <div className="text-2xl font-bold text-amber-950">{metrics.pendingOrganizations}</div>
            <div className="text-[10px] text-amber-800">Awaiting verification</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <Button
          size="sm"
          variant={activeTab === "requirements" ? "default" : "ghost"}
          onClick={() => setActiveTab("requirements")}
          className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-lg"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Research Support Requirements ({requests.length})</span>
        </Button>
        <Button
          size="sm"
          variant={activeTab === "organizations" ? "default" : "ghost"}
          onClick={() => setActiveTab("organizations")}
          className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-lg"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Industry Organizations ({organizations.length})</span>
        </Button>
        <Button
          size="sm"
          variant={activeTab === "partnerships" ? "default" : "ghost"}
          onClick={() => setActiveTab("partnerships")}
          className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-lg"
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>Active Partnerships ({partners.length})</span>
        </Button>
      </div>

      {/* TAB 1: REQUIREMENTS DIRECTORY */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title, university, or challenge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as SupportRequestCategory | "ALL")}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Categories</option>
                <option value="FUNDING">Funding &amp; Grants</option>
                <option value="HARDWARE">Hardware &amp; Devices</option>
                <option value="TECHNOLOGY">Software &amp; Cloud</option>
                <option value="EXPERTISE">Expertise &amp; Advisory</option>
                <option value="INFRASTRUCTURE">Testing &amp; Labs</option>
                <option value="DATA">Data Access &amp; Sets</option>
                <option value="MANUFACTURING">Manufacturing</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SupportRequestStatus | "ALL")}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="IN_PROGRESS">Partner Engaged</option>
                <option value="FULFILLED">Fulfilled</option>
              </select>
            </div>
          </div>

          {/* Directory list */}
          {filteredRequests.length === 0 ? (
            <Card className="border-border/80">
              <CardContent className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">No Requirements Match Criteria</p>
                <p>Try adjusting your search query or filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRequests.map((req) => {
                const catMeta = SUPPORT_CATEGORY_META[req.category];
                const prioMeta = PRIORITY_META[req.priority];
                const statMeta = REQUEST_STATUS_META[req.status];

                return (
                  <Card
                    key={req.id}
                    className="border-border/80 hover:border-border transition-all bg-card shadow-xs"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={catMeta.badgeTone} className="text-xs font-semibold">
                            {catMeta.label}
                          </Badge>
                          <Badge variant={prioMeta.badgeTone} className="text-[10px]">
                            {prioMeta.label}
                          </Badge>
                          <Badge variant={statMeta.badgeTone} className="text-[10px]">
                            {statMeta.label}
                          </Badge>
                          {req.confidentiality_level && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {req.confidentiality_level}
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectedRequest(req)}
                          className="text-xs h-7 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Detail</span>
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">{req.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {req.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-4 flex-wrap">
                          {req.institution && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              <span>{req.institution.name}</span>
                            </span>
                          )}
                          {req.challenge && (
                            <span className="truncate max-w-[220px]">
                              Challenge: <strong>{req.challenge.title}</strong>
                            </span>
                          )}
                          {req.estimated_cost != null && (
                            <span className="font-semibold text-foreground">
                              ₹{req.estimated_cost.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono">
                          Created {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INDUSTRY ORGANIZATIONS */}
      {activeTab === "organizations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Registered Industry Organizations</h3>
              <p className="text-xs text-muted-foreground">
                Verify technology companies, hardware vendors, and startups to participate in the civic research marketplace.
              </p>
            </div>
          </div>

          {organizations.length === 0 ? (
            <Card className="border-border/80">
              <CardContent className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">No Registered Organizations</p>
                <p>Organizations will appear here when they register or apply for partner status.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {organizations.map((org) => {
                const isVerified = org.verification_status === "VERIFIED";
                const isPending = org.verification_status === "PENDING";

                return (
                  <Card key={org.id} className="border-border/80 bg-card shadow-xs">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            <h4 className="font-bold text-sm text-foreground">{org.name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {org.organization_type} • {org.sector ?? "General Industry"}
                          </p>
                        </div>

                        <Badge
                          variant={isVerified ? "success" : isPending ? "warning" : "default"}
                          className="text-xs"
                        >
                          {org.verification_status}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        {org.contact_person && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>{org.contact_person}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{org.contact_email}</span>
                        </div>
                        {org.website_url && (
                          <div className="flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                            <a
                              href={org.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              {org.website_url}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Verification Actions */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                        {!isVerified && (
                          <Button
                            size="sm"
                            onClick={() => { void handleVerifyOrganization(org.id, "VERIFIED"); }}
                            disabled={verifyingOrgId === org.id}
                            className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verify Organization</span>
                          </Button>
                        )}
                        {isVerified && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { void handleVerifyOrganization(org.id, "SUSPENDED"); }}
                            disabled={verifyingOrgId === org.id}
                            className="text-xs h-7 text-amber-700 hover:bg-amber-50"
                          >
                            <span>Suspend</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVE PARTNERSHIPS */}
      {activeTab === "partnerships" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Active Industry Partnerships</h3>
            <p className="text-xs text-muted-foreground">
              Formal collaborations between approved university research teams and verified industry partners with SUPPORT_SPECIFIC access.
            </p>
          </div>

          {partners.length === 0 ? (
            <Card className="border-border/80">
              <CardContent className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">No Active Partnerships</p>
                <p>When universities accept candidate support offers, active partnerships will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {partners.map((p) => (
                <Card key={p.id} className="border-emerald-200 bg-emerald-50/20 shadow-xs">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Handshake className="w-4 h-4 text-emerald-700" />
                        <span className="font-bold text-sm text-emerald-950">
                          {p.contribution_summary}
                        </span>
                      </div>
                      <Badge variant="success" className="text-xs">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Access Scope: <strong>{p.access_scope}</strong> • Category: {p.category}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSPECTION MODAL */}
      {inspectedRequest && (
        <Dialog
          open={Boolean(inspectedRequest)}
          onClose={() => setInspectedRequest(null)}
          title="Support Requirement Inspection"
          description={`Created by ${inspectedRequest.institution?.name ?? "University Team"} for ${inspectedRequest.challenge?.title ?? "Civic Challenge"}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/80 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={SUPPORT_CATEGORY_META[inspectedRequest.category]?.badgeTone}
                  className="text-xs font-semibold"
                >
                  {SUPPORT_CATEGORY_META[inspectedRequest.category]?.label}
                </Badge>
                <Badge
                  variant={REQUEST_STATUS_META[inspectedRequest.status]?.badgeTone}
                  className="text-xs"
                >
                  {REQUEST_STATUS_META[inspectedRequest.status]?.label}
                </Badge>
                <Badge
                  variant={PRIORITY_META[inspectedRequest.priority]?.badgeTone}
                  className="text-[10px]"
                >
                  {PRIORITY_META[inspectedRequest.priority]?.label}
                </Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground pt-1">{inspectedRequest.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {inspectedRequest.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border border-border/80 bg-background">
                <span className="text-muted-foreground text-[11px] block">Specifications:</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {inspectedRequest.specification ?? "None provided"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border/80 bg-background">
                <span className="text-muted-foreground text-[11px] block">Scope / Quantity:</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {inspectedRequest.quantity_or_scope ?? "None specified"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border/80 bg-background">
                <span className="text-muted-foreground text-[11px] block">Estimated Cost:</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {inspectedRequest.estimated_cost != null
                    ? `₹${inspectedRequest.estimated_cost.toLocaleString()} ${inspectedRequest.currency}`
                    : "Not specified"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border/80 bg-background">
                <span className="text-muted-foreground text-[11px] block">Required By Date:</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {inspectedRequest.required_by_date
                    ? new Date(inspectedRequest.required_by_date).toLocaleDateString()
                    : "Flexible"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectedRequest(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
