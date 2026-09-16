import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CreateSupportRequestDialog } from "@/components/marketplace/create-support-request-dialog";
import { ApplicationReviewDialog } from "@/components/marketplace/application-review-dialog";
import {
  acceptSupportApplication,
  APPLICATION_STATUS_META,
  fetchUniversityMarketplaceData,
  ORGANIZATION_TYPE_META,
  PRIORITY_META,
  REQUEST_STATUS_META,
  SUPPORT_CATEGORY_META,
  type UniversityEligibleProject,
  type UniversityMarketplaceApplicationItem,
  type UniversityMarketplaceRequestItem,
} from "@/lib/marketplace";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Filter,
  Handshake,
  HelpCircle,
  Inbox,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

export default function UniversityMarketplacePage() {
  const { profile } = useAppSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    activeRequirements: 0,
    applicationsReceived: 0,
    activePartnerships: 0,
    totalValueCommitted: 0,
  });
  const [requests, setRequests] = useState<UniversityMarketplaceRequestItem[]>([]);
  const [eligibleProjects, setEligibleProjects] = useState<UniversityEligibleProject[]>([]);
  const [allApplications, setAllApplications] = useState<UniversityMarketplaceApplicationItem[]>([]);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<UniversityMarketplaceRequestItem | null>(null);

  // Quick Accept Dialog
  const [acceptingApp, setAcceptingApp] = useState<UniversityMarketplaceApplicationItem | null>(null);
  const [agreementNotes, setAgreementNotes] = useState("");
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"requirements" | "applications" | "partnerships" | "eligible">("requirements");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("ALL");

  const institutionId = profile?.institution_id;

  const loadData = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchUniversityMarketplaceData(institutionId);
      setMetrics(data.metrics);
      setRequests(data.requests);
      setEligibleProjects(data.eligibleProjects);
      setAllApplications(data.allApplications ?? []);
    } catch (err: unknown) {
      console.error("Failed to load university marketplace data:", err);
      setError(err instanceof Error ? err.message : "Failed to load marketplace data.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!institutionId) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const data = await fetchUniversityMarketplaceData(institutionId);
        if (isMounted) {
          setMetrics(data.metrics);
          setRequests(data.requests);
          setEligibleProjects(data.eligibleProjects);
          setAllApplications(data.allApplications ?? []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to load university marketplace data:", err);
          setError(err instanceof Error ? err.message : "Failed to load marketplace data.");
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
  }, [institutionId]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.project?.title && r.project.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.challenge?.title && r.challenge.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [requests, searchQuery, categoryFilter, statusFilter]);

  // Active partnerships list extracted from requests
  const activePartnershipsList = useMemo(() => {
    const list: {
      partnerId: string;
      request: UniversityMarketplaceRequestItem;
      partnerName: string;
      partnerType: string;
      partnerStatus: string;
      verified: boolean;
      startedAt: string;
    }[] = [];

    for (const req of requests) {
      if (req.partners && req.partners.length > 0) {
        for (const p of req.partners) {
          list.push({
            partnerId: p.id,
            request: req,
            partnerName: p.organization?.name ?? "Partner Organization",
            partnerType: p.organization?.organization_type ?? "COMPANY",
            partnerStatus: p.participation_status ?? p.status ?? "ACTIVE",
            verified: p.organization?.verification_status === "VERIFIED",
            startedAt: p.started_at ?? p.onboarded_at ?? p.created_at,
          });
        }
      }
    }

    return list;
  }, [requests]);

  // Filtered applications for Company Applications tab
  const filteredApplications = useMemo(() => {
    return allApplications.filter((app) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        app.organization?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.request?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.project?.title && app.project.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.challenge?.title && app.challenge.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAppStatus = appStatusFilter === "ALL" || app.status === appStatusFilter;
      const matchesCategory = categoryFilter === "ALL" || app.request?.category === categoryFilter;

      return matchesSearch && matchesAppStatus && matchesCategory;
    });
  }, [allApplications, searchQuery, appStatusFilter, categoryFilter]);

  async function handleConfirmAccept() {
    if (!acceptingApp || !profile?.id) return;
    setAcceptSubmitting(true);
    setAcceptError(null);
    try {
      await acceptSupportApplication({
        applicationId: acceptingApp.id,
        reviewerProfileId: profile.id,
        agreementNotes: agreementNotes.trim() || "Offer accepted for research prototype collaboration and testing.",
      });
      setAcceptingApp(null);
      setAgreementNotes("");
      await loadData();
    } catch (err: unknown) {
      console.error("Failed to accept application:", err);
      setAcceptError(err instanceof Error ? err.message : "Failed to accept application.");
    } finally {
      setAcceptSubmitting(false);
    }
  }

  if (!institutionId && !loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">University Affiliation Required</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your profile is not currently linked to a verified university institution. Please contact your institution coordinator or innovation manager.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              University Research &amp; Innovation Marketplace
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              Ecosystem
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Publish prototype requirements, review industry support offers, and engage verified partners for your research projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Support Requirement</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center justify-between text-sm text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadData()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "-" : metrics.activeRequirements}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Active Requirements</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "-" : metrics.applicationsReceived}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Support Offers Received</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "-" : metrics.activePartnerships}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Active Partner Engagements</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "-" : `₹${metrics.totalValueCommitted.toLocaleString()}`}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Partner Co-Funding / Value</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("requirements")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === "requirements"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Requirements ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === "applications"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Company Applications</span>
          <Badge
            variant={allApplications.length > 0 ? "info" : "outline"}
            className="text-[10px] px-1.5 py-0"
          >
            {allApplications.length}
          </Badge>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("partnerships")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === "partnerships"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Partnerships ({activePartnershipsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("eligible")}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === "eligible"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Eligible Research Projects ({eligibleProjects.length})
        </button>
      </div>

      {/* TAB 1: REQUIREMENTS */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search requirements, problem statements, or research projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>Category:</span>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Categories</option>
                {Object.entries(SUPPORT_CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(REQUEST_STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">Loading university requirements...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/50 space-y-3">
              <div className="p-3 bg-muted/60 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-muted-foreground">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No Requirements Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {requests.length === 0
                    ? "Your research team has not published any support requirements yet. Click the button below to request hardware, funding, or industrial expertise."
                    : "No requirements match your active filter criteria."}
                </p>
              </div>
              {requests.length === 0 && (
                <Button
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                  className="text-xs gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Requirement</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => {
                const categoryMeta = SUPPORT_CATEGORY_META[req.category] ?? {
                  label: req.category,
                  badgeTone: "default",
                };
                const statusMeta = REQUEST_STATUS_META[req.status] ?? {
                  label: req.status,
                  badgeTone: "default",
                };
                const priorityMeta = PRIORITY_META[req.priority] ?? {
                  label: req.priority,
                  badgeTone: "default",
                };

                const offersCount = req.applications_count ?? 0;
                const activePartners = req.partners?.filter((p) => p.status === "ACTIVE") ?? [];

                return (
                  <div
                    key={req.id}
                    className="p-4.5 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-3.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={categoryMeta.badgeTone} className="text-[10px]">
                              {categoryMeta.label}
                            </Badge>
                            <Badge variant={statusMeta.badgeTone} className="text-[10px]">
                              {statusMeta.label}
                            </Badge>
                            <Badge variant={priorityMeta.badgeTone} className="text-[10px]">
                              {priorityMeta.label}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground leading-snug">
                            {req.title}
                          </h3>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>

                      {/* Problem Statement and Project Breadcrumb */}
                      <div className="p-2 bg-muted/40 rounded-lg text-[11px] space-y-0.5 border border-border/60">
                        <div className="text-muted-foreground font-medium">
                          Problem: <span className="text-foreground">{req.challenge?.title ?? "Municipal Challenge"}</span>
                        </div>
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>
                            Project:{" "}
                            <Link
                              to={`/app/university/projects/${req.project_id}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {req.project?.title ?? "Research Project"}
                            </Link>
                          </span>
                        </div>
                      </div>

                      {/* Technical Specs & Details */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                        {req.quantity_or_scope && (
                          <div>
                            <span className="font-medium text-foreground">Scope: </span>
                            {req.quantity_or_scope}
                          </div>
                        )}
                        {req.required_by_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>Needed by: {new Date(req.required_by_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Active Partners Badge */}
                      {activePartners.length > 0 && (
                        <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Handshake className="w-3 h-3" /> Engaged Partners:
                          </span>
                          {activePartners.map((p) => (
                            <Badge
                              key={p.id}
                              variant="outline"
                              className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                            >
                              {p.organization?.name ?? "Partner"}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Applied Companies Section */}
                      {req.applications && req.applications.length > 0 && (
                        <div className="pt-2.5 border-t border-border/60 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              <span>Companies Applied ({req.applications.length}):</span>
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {req.applications.filter((a) => a.status === "ACCEPTED").length} Accepted
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {req.applications.map((app) => {
                              const appStatusMeta = APPLICATION_STATUS_META[app.status] ?? {
                                label: app.status,
                                badgeTone: "default",
                              };
                              const isAccepted = app.status === "ACCEPTED";
                              return (
                                <div
                                  key={app.id}
                                  className="p-2.5 rounded-lg bg-muted/40 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-foreground truncate">
                                        {app.organization.name}
                                      </span>
                                      <Badge variant={appStatusMeta.badgeTone} className="text-[9px] py-0 px-1.5">
                                        {appStatusMeta.label}
                                      </Badge>
                                      {app.organization.verification_status === "VERIFIED" && (
                                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                                      {app.proposed_contribution}
                                    </p>
                                    {app.estimated_value != null && (
                                      <div className="text-[10px] text-primary font-medium">
                                        Value: ₹{app.estimated_value.toLocaleString()} {app.timeline ? `• ${app.timeline}` : ""}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {!isAccepted && app.status !== "REJECTED" ? (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setAcceptingApp({
                                            ...app,
                                            request: {
                                              id: req.id,
                                              title: req.title,
                                              category: req.category,
                                              status: req.status,
                                            },
                                            project: req.project,
                                            challenge: req.challenge,
                                          });
                                          setAgreementNotes("Offer accepted for research prototype collaboration and testing.");
                                        }}
                                        className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Accept Offer</span>
                                      </Button>
                                    ) : isAccepted ? (
                                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Partner Accepted</span>
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {offersCount > 0 ? (
                          <Badge variant="info" className="text-[11px]">
                            {offersCount} Offer{offersCount === 1 ? "" : "s"} Received
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">0 offers yet</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/app/university/projects/${req.project_id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-muted/50"
                        >
                          <span>Workspace</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>

                        {offersCount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => setReviewRequest(req)}
                            className="text-xs gap-1 h-7"
                          >
                            <span>Review Offers</span>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPANY APPLICATIONS */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by company name, requirement, or research project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>Status:</span>
              </div>
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Application Statuses</option>
                <option value="SUBMITTED">Pending Review (Submitted)</option>
                <option value="UNDER_REVIEW">Under Review / Clarification</option>
                <option value="ACCEPTED">Accepted (Partner Onboarded)</option>
                <option value="REJECTED">Declined</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">Loading company applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/50 space-y-3">
              <div className="p-3 bg-muted/60 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-muted-foreground">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No Company Applications Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {allApplications.length === 0
                    ? "When industry partners or startups apply for your raised demands in the marketplace, their detailed support offers will appear here for you to review and accept."
                    : "No applications match your active filter criteria."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => {
                const statusMeta = APPLICATION_STATUS_META[app.status] ?? {
                  label: app.status,
                  badgeTone: "default",
                };
                const orgTypeMeta = ORGANIZATION_TYPE_META[app.organization.organization_type] ?? {
                  label: app.organization.organization_type,
                  badgeTone: "default",
                };
                const isAccepted = app.status === "ACCEPTED";

                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-xl border border-border bg-card shadow-xs hover:border-border/80 transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-foreground">
                            {app.organization.name}
                          </h3>
                          <Badge variant={orgTypeMeta.badgeTone} className="text-[10px]">
                            {orgTypeMeta.label}
                          </Badge>
                          {app.organization.verification_status === "VERIFIED" && (
                            <Badge variant="success" className="text-[10px] gap-1 py-0">
                              <ShieldCheck className="w-3 h-3" />
                              Verified Partner
                            </Badge>
                          )}
                        </div>
                        {app.organization.sector && (
                          <p className="text-xs text-muted-foreground">
                            Sector: {app.organization.sector}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={statusMeta.badgeTone} className="text-xs">
                          {statusMeta.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Applied For Banner */}
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-muted-foreground font-medium">Applied for Demand: </span>
                          <span className="font-semibold text-foreground">{app.request.title}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {app.request.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground text-[11px] flex-wrap">
                        {app.project && (
                          <span>
                            Project:{" "}
                            <Link
                              to={`/app/university/projects/${app.project.id}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {app.project.title}
                            </Link>
                          </span>
                        )}
                        {app.challenge && (
                          <span>Problem: <span className="text-foreground">{app.challenge.title}</span></span>
                        )}
                      </div>
                    </div>

                    {/* Offer Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg border border-border/70 bg-background space-y-1">
                        <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider text-muted-foreground">
                          Proposed Contribution &amp; Deliverables
                        </span>
                        <p className="text-foreground leading-relaxed">
                          {app.proposed_contribution}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-border/70 bg-background space-y-1">
                        <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider text-muted-foreground">
                          Capabilities &amp; Track Record
                        </span>
                        <p className="text-muted-foreground leading-relaxed">
                          {app.capabilities_summary}
                        </p>
                      </div>
                    </div>

                    {/* Specs / Meta Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      {app.estimated_value != null && (
                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                          <span className="text-[10px] text-muted-foreground block">Offered Value</span>
                          <span className="font-bold text-foreground text-sm">
                            ₹{app.estimated_value.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {app.timeline && (
                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                          <span className="text-[10px] text-muted-foreground block">Schedule / Delivery</span>
                          <span className="font-medium text-foreground">{app.timeline}</span>
                        </div>
                      )}
                      {app.organization.contact_person && (
                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                          <span className="text-[10px] text-muted-foreground block">Contact Lead</span>
                          <span className="font-medium text-foreground truncate block">
                            {app.organization.contact_person}
                          </span>
                        </div>
                      )}
                      {app.organization.contact_email && (
                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                          <span className="text-[10px] text-muted-foreground block">Email</span>
                          <span className="font-medium text-foreground truncate block">
                            {app.organization.contact_email}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes if present */}
                    {app.acceptance_agreement_notes && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Collaboration Agreement Notes:</span>
                        </div>
                        <p className="pl-5">{app.acceptance_agreement_notes}</p>
                      </div>
                    )}

                    {app.review_notes && !isAccepted && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-950 dark:text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Clarification Notes Sent:</span>
                        </div>
                        <p className="pl-5">{app.review_notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-muted-foreground">
                        {isAccepted ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Partner Accepted &amp; Engaged in Research Project</span>
                          </span>
                        ) : (
                          <span>Review candidate proposal and decide to accept or clarify terms.</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isAccepted && app.status !== "REJECTED" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setAcceptingApp(app);
                                setAgreementNotes("Offer accepted for research prototype deployment and collaborative evaluation.");
                              }}
                              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept Company Offer</span>
                            </Button>

                            {/* Also trigger full review dialog for this request */}
                            {requests.find((r) => r.id === app.request.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const targetReq = requests.find((r) => r.id === app.request.id);
                                  if (targetReq) setReviewRequest(targetReq);
                                }}
                                className="text-xs gap-1"
                              >
                                <span>Detailed Review</span>
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}

                        {isAccepted && app.project && (
                          <Link
                            to={`/app/university/projects/${app.project.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5"
                          >
                            <span>Open Project Workspace</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVE PARTNERSHIPS */}
      {activeTab === "partnerships" && (
        <div className="space-y-4">
          {activePartnershipsList.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/50 space-y-2">
              <Handshake className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">No Active Partnerships Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                When you accept offers submitted by industry partners, startups, or CSR foundations, they will appear here with active collaboration tracking.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePartnershipsList.map((item) => {
                const orgTypeMeta = ORGANIZATION_TYPE_META[item.partnerType] ?? {
                  label: item.partnerType,
                  badgeTone: "default",
                };

                return (
                  <div
                    key={item.partnerId}
                    className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-semibold text-foreground">{item.partnerName}</h4>
                          {item.verified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <Badge variant={orgTypeMeta.badgeTone} className="text-[10px] mt-1">
                          {orgTypeMeta.label}
                        </Badge>
                      </div>

                      <Badge variant="success" className="text-[10px]">
                        {item.partnerStatus}
                      </Badge>
                    </div>

                    <div className="p-2.5 bg-muted/40 rounded-lg text-xs space-y-1 border border-border/60">
                      <div>
                        <span className="text-muted-foreground font-medium">Requirement: </span>
                        <span className="font-semibold text-foreground">{item.request.title}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">Project: </span>
                        <Link
                          to={`/app/university/projects/${item.request.project_id}`}
                          className="text-primary hover:underline"
                        >
                          {item.request.project?.title ?? "Research Project"}
                        </Link>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">Problem: </span>
                        <span>{item.request.challenge?.title ?? "Municipal Challenge"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Onboarded {new Date(item.startedAt).toLocaleDateString()}</span>
                      <Link
                        to={`/app/university/projects/${item.request.project_id}`}
                        className="text-primary font-medium hover:underline flex items-center gap-1"
                      >
                        <span>Open Project Workspace</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ELIGIBLE RESEARCH PROJECTS */}
      {activeTab === "eligible" && (
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Approved Research Proposal Gating Rule</span>
            </div>
            <p>
              In accordance with CivicFix platform governance, only research projects with an approved proposal can post support requirements to the marketplace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eligibleProjects.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-foreground">{p.title}</h4>
                    <p className="text-xs text-muted-foreground">{p.challenge?.title ?? "Problem Statement"}</p>
                  </div>
                  <Badge
                    variant={p.has_approved_proposal ? "success" : "warning"}
                    className="text-[10px]"
                  >
                    {p.has_approved_proposal ? "Proposal Approved" : "Pending Proposal"}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  <span>Milestones Defined: {p.milestones?.length ?? 0}</span>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <Link
                    to={`/app/university/projects/${p.id}`}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <span>View Project</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  {p.has_approved_proposal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(true)}
                      className="text-xs gap-1 h-7"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Request Support</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Support Request Modal */}
      {createDialogOpen && profile && (
        <CreateSupportRequestDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          profileId={profile.id}
          eligibleProjects={eligibleProjects}
          onCreated={() => {
            void loadData();
          }}
        />
      )}

      {/* Review Applications Modal */}
      {reviewRequest && profile && (
        <ApplicationReviewDialog
          open={Boolean(reviewRequest)}
          onClose={() => setReviewRequest(null)}
          request={reviewRequest}
          profileId={profile.id}
          onUpdated={() => {
            void loadData();
          }}
        />
      )}

      {/* Quick Accept Dialog */}
      {acceptingApp && (
        <Dialog
          open={Boolean(acceptingApp)}
          onClose={() => setAcceptingApp(null)}
          title="Accept Company Support Offer"
          description={`Onboard ${acceptingApp.organization.name} to support "${acceptingApp.request.title}"`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {acceptError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{acceptError}</span>
              </div>
            )}

            <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-1.5">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                <span>{acceptingApp.organization.name}</span>
                {acceptingApp.organization.verification_status === "VERIFIED" && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </div>
              <p className="text-muted-foreground">
                <strong>Offered Contribution:</strong> {acceptingApp.proposed_contribution}
              </p>
              {acceptingApp.estimated_value != null && (
                <p className="text-muted-foreground">
                  <strong>Estimated Value:</strong> ₹{acceptingApp.estimated_value.toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Collaboration Agreement Notes &amp; Scope
              </label>
              <textarea
                rows={3}
                value={agreementNotes}
                onChange={(e) => setAgreementNotes(e.target.value)}
                placeholder="Specify agreed delivery schedule, testbed access, or prototype scope..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 text-[11px] space-y-0.5">
              <span className="font-semibold block">Upon Acceptance:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>The company will be onboarded as a Project Support Partner (<code>SUPPORT_SPECIFIC</code> access).</li>
                <li>Application status will be marked <code>ACCEPTED</code>.</li>
                <li>The partnership will be visible under Active Partnerships and in the project workspace.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAcceptingApp(null)}
                disabled={acceptSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleConfirmAccept()}
                disabled={acceptSubmitting}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                {acceptSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Accept Offer</span>
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
