import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  Grid,
  Handshake,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Store,
  Table as TableIcon,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IndustryApplicationDetailDialog } from "@/components/marketplace/industry-application-detail-dialog";
import {
  APPLICATION_STATUS_META,
  fetchOrganizationApplications,
  fetchOrganizationPartnerships,
  resolveIndustryOrganizationForUser,
  SUPPORT_CATEGORY_META,
  type IndustryApplicationItem,
  type IndustryPartnershipItem,
} from "@/lib/marketplace";
import type {
  ApplicationStatus,
  IndustryOrganizationRow,
  SupportRequestCategory,
} from "@/types/database";

type ApplicationsTab = "applications" | "partnerships";
type ViewMode = "cards" | "table";
type SortOption = "newest" | "oldest" | "title" | "value";

function getCategoryIcon(category: SupportRequestCategory) {
  switch (category) {
    case "FUNDING":
      return <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    case "HARDWARE":
      return <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    case "TECHNOLOGY":
      return <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
    case "EXPERTISE":
      return <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    case "INFRASTRUCTURE":
      return <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    case "DATA":
      return <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
    case "MANUFACTURING":
      return <Wrench className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
    default:
      return <Layers className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function getNextStepText(status: ApplicationStatus, hasReviewNotes: boolean): string {
  if (hasReviewNotes && status === "UNDER_REVIEW") {
    return "University requested clarification — review notes above.";
  }
  switch (status) {
    case "SUBMITTED":
      return "Awaiting initial review by university research leads.";
    case "UNDER_REVIEW":
      return "University team is actively evaluating proposal alignment.";
    case "SHORTLISTED":
      return "Selected as primary candidate for contribution agreement.";
    case "ACCEPTED":
      return "Support accepted! Active partnership established.";
    case "REJECTED":
      return "Evaluation concluded. Explore other open opportunities.";
    case "WITHDRAWN":
      return "Application withdrawn by your organization.";
    default:
      return "Draft offer — submit when ready.";
  }
}

export function IndustryApplicationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAppSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [organization, setOrganization] = useState<IndustryOrganizationRow | null>(null);
  const [applications, setApplications] = useState<IndustryApplicationItem[]>([]);
  const [partnerships, setPartnerships] = useState<IndustryPartnershipItem[]>([]);

  // Navigation & Filtering State
  const tabParam = searchParams.get("tab") as ApplicationsTab | null;
  const [activeTab, setActiveTab] = useState<ApplicationsTab>(tabParam === "partnerships" ? "partnerships" : "applications");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<SupportRequestCategory | "ALL">("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Detail Modal State
  const [selectedApp, setSelectedApp] = useState<IndustryApplicationItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Sync tab with URL query param
  const handleTabChange = (newTab: ApplicationsTab) => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === "partnerships") {
        next.set("tab", "partnerships");
      } else {
        next.delete("tab");
      }
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const org = await resolveIndustryOrganizationForUser(profile);
      setOrganization(org);

      if (org) {
        const [apps, parts] = await Promise.all([
          fetchOrganizationApplications(org.id),
          fetchOrganizationPartnerships(org.id),
        ]);
        setApplications(apps);
        setPartnerships(parts);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      console.error("Failed to load organization applications:", err);
      setError(err instanceof Error ? err.message : "Failed to load application history.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const org = await resolveIndustryOrganizationForUser(profile);
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
        if (isMounted) setLastRefreshed(new Date().toLocaleTimeString());
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to load organization applications:", err);
          setError(err instanceof Error ? err.message : "Failed to load application history.");
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
  }, [profile]);

  // Lookup map for partnerships linked to listing_id or project_id
  const partnershipByListingId = useMemo(() => {
    const map = new Map<string, IndustryPartnershipItem>();
    for (const part of partnerships) {
      if (part.project_id) {
        map.set(part.project_id, part);
      }
    }
    return map;
  }, [partnerships]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const total = applications.length;
    const underReview = applications.filter((a) =>
      ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"].includes(a.status)
    ).length;
    const needsAction = applications.filter(
      (a) => a.review_notes && a.review_notes.trim().length > 0 && a.status === "UNDER_REVIEW"
    ).length;
    const accepted = applications.filter((a) => a.status === "ACCEPTED").length;
    const activePartnershipsCount = partnerships.filter(
      (p) => p.status === "ACTIVE" || p.participation_status === "ACTIVE"
    ).length;

    return {
      total,
      underReview,
      needsAction,
      accepted,
      activePartnershipsCount,
    };
  }, [applications, partnerships]);

  // Filtered and Sorted Applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Status filter
        if (statusFilter !== "ALL" && app.status !== statusFilter) {
          return false;
        }

        // Category filter
        const appCat = app.listing?.category;
        if (categoryFilter !== "ALL" && appCat !== categoryFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const titleMatch = app.listing?.public_title?.toLowerCase().includes(q) ?? false;
          const instMatch = app.listing?.institution?.name?.toLowerCase().includes(q) ?? false;
          const projMatch = app.listing?.project?.project_title?.toLowerCase().includes(q) ?? false;
          const contribMatch = app.proposed_contribution?.toLowerCase().includes(q) ?? false;
          const catMatch = appCat?.toLowerCase().includes(q) ?? false;
          if (!titleMatch && !instMatch && !projMatch && !contribMatch && !catMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortOption === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortOption === "title") {
          const titleA = a.listing?.public_title ?? "";
          const titleB = b.listing?.public_title ?? "";
          return titleA.localeCompare(titleB);
        }
        if (sortOption === "value") {
          const valA = a.estimated_value ?? 0;
          const valB = b.estimated_value ?? 0;
          return valB - valA;
        }
        return 0;
      });
  }, [applications, statusFilter, categoryFilter, searchQuery, sortOption]);

  // Open detail modal helper
  const handleOpenDetail = (app: IndustryApplicationItem) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  // Find linked partnership for selected application
  const selectedAppPartnership = useMemo(() => {
    if (!selectedApp || selectedApp.status !== "ACCEPTED") return null;
    const projId = selectedApp.listing?.project?.id;
    if (projId && partnershipByListingId.has(projId)) {
      return partnershipByListingId.get(projId);
    }
    return partnerships.find((p) => p.category === selectedApp.listing?.category) ?? null;
  }, [selectedApp, partnershipByListingId, partnerships]);

  // Applications requiring attention (clarification requested or newly accepted)
  const attentionApplications = useMemo(() => {
    return applications.filter(
      (a) =>
        (a.review_notes && a.review_notes.trim().length > 0 && a.status === "UNDER_REVIEW") ||
        a.status === "SHORTLISTED"
    );
  }, [applications]);

  // Unlinked organization state
  if (!organization && !loading) {
    return (
      <div className="space-y-6 pb-16 max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] font-bold uppercase tracking-wider">
            Industry Partner Workspace
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Track support applications submitted by your organization to university research prototypes.
          </p>
        </div>

        <Card className="border-border bg-card shadow-sm max-w-lg mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <span className="p-3.5 rounded-2xl bg-muted text-muted-foreground inline-flex">
              <Building2 className="w-7 h-7" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">No Organization Linked</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your authenticated profile is not linked to an accredited Industry Partner organization. Please contact your civic platform administrator to associate your company profile.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void navigate("/app/industry/marketplace")}>
                Browse Marketplace
              </Button>
              <Button size="sm" onClick={() => void loadData()}>
                Retry Sync
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* ========================================================================= */}
      {/* SECTION A: HEADER & ORGANIZATION CONTEXT                                 */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5"
            >
              <Building2 className="w-3 h-3 mr-1" />
              Industry Partner Operations
            </Badge>

            {organization && (
              <Badge
                variant={
                  organization.verification_status === "VERIFIED"
                    ? "success"
                    : organization.verification_status === "PENDING"
                    ? "warning"
                    : "outline"
                }
                className="text-[11px] font-semibold"
              >
                {organization.verification_status === "VERIFIED" && <ShieldCheck className="w-3 h-3 mr-1" />}
                {organization.verification_status}
              </Badge>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono pl-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Live sync: {lastRefreshed}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              disabled={loading}
              className="text-xs h-8.5 gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => void navigate("/app/industry/marketplace")}
              className="text-xs gap-1.5 h-8.5 shadow-xs font-semibold"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Browse Opportunities</span>
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Applications
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            {organization ? (
              <span>
                Organization: <strong className="text-foreground">{organization.name}</strong> • Track your submitted support proposals, review decisions, university follow-ups, and active partnerships.
              </span>
            ) : (
              "Track your organization's support applications, review decisions, follow-ups, and resulting partnerships."
            )}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-950 dark:text-rose-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadData()} className="text-xs h-7">
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: APPLICATION OVERVIEW METRICS (DERIVED RELIABLY FROM REAL DATA) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Offers
              </span>
              <Send className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {loading ? "…" : metrics.total}
            </p>
            <p className="text-[11px] text-muted-foreground">All submitted proposals</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                In Review
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {loading ? "…" : metrics.underReview}
            </p>
            <p className="text-[11px] text-muted-foreground">Under evaluation</p>
          </CardContent>
        </Card>

        <Card className={`border-border bg-card shadow-xs ${metrics.needsAction > 0 ? "ring-1 ring-amber-400 dark:ring-amber-600" : ""}`}>
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Clarifications
              </span>
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className={`text-2xl sm:text-3xl font-black ${metrics.needsAction > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
              {loading ? "…" : metrics.needsAction}
            </p>
            <p className="text-[11px] text-muted-foreground">Reviewer notes received</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Accepted
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? "…" : metrics.accepted}
            </p>
            <p className="text-[11px] text-muted-foreground">Approved by university</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Partnerships
              </span>
              <Handshake className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {loading ? "…" : metrics.activePartnershipsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Active collaborations</p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: NEEDS ATTENTION STRIP (REAL APPLICATION STATES ONLY)            */}
      {/* ========================================================================= */}
      {attentionApplications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Action &amp; Evaluation Highlights ({attentionApplications.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionApplications.slice(0, 4).map((app) => {
              const isClarification = Boolean(app.review_notes && app.status === "UNDER_REVIEW");
              const listingTitle = app.listing?.public_title ?? "Research Support";
              const instName = app.listing?.institution?.name ?? "Partner Institution";

              return (
                <div
                  key={`att-${app.id}`}
                  className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={isClarification ? "amber" : "info"}
                        className="text-[11px] font-bold"
                      >
                        {isClarification ? "Clarification Requested" : "Proposal Shortlisted"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {app.listing?.category}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground line-clamp-1">
                      {listingTitle}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {instName} • {app.listing?.project?.project_title ?? "Prototype Project"}
                    </p>

                    {isClarification && app.review_notes && (
                      <p className="text-xs text-amber-950 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-900/40 p-2 rounded-lg line-clamp-2 leading-relaxed font-medium">
                        “{app.review_notes}”
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-900/60">
                    <span className="text-[11px] text-muted-foreground">
                      Submitted {new Date(app.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetail(app)}
                      className="text-xs h-7 gap-1 font-semibold border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200"
                    >
                      <span>Review Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: TABS, SEARCH & FILTER TOOLBAR                                  */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Main Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTab === "applications" ? "default" : "ghost"}
              onClick={() => handleTabChange("applications")}
              className="text-xs font-semibold gap-1.5 h-8.5 px-3.5 rounded-lg"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submitted Offers ({applications.length})</span>
            </Button>

            <Button
              size="sm"
              variant={activeTab === "partnerships" ? "default" : "ghost"}
              onClick={() => handleTabChange("partnerships")}
              className="text-xs font-semibold gap-1.5 h-8.5 px-3.5 rounded-lg"
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Active Partnerships ({partnerships.length})</span>
            </Button>
          </div>

          {activeTab === "applications" && (
            <div className="flex items-center gap-1.5">
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="h-8 w-8 p-0"
                title="Card View"
              >
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 w-8 p-0"
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filters Strip (for Applications tab) */}
        {activeTab === "applications" && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by opportunity, project, institution, or proposal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 text-xs h-9 bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Select */}
              <select
                aria-label="Filter by application status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "ALL")}
                className="h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="ALL">All Statuses ({applications.length})</option>
                <option value="SUBMITTED">Submitted ({applications.filter((a) => a.status === "SUBMITTED").length})</option>
                <option value="UNDER_REVIEW">Under Review ({applications.filter((a) => a.status === "UNDER_REVIEW").length})</option>
                <option value="SHORTLISTED">Shortlisted ({applications.filter((a) => a.status === "SHORTLISTED").length})</option>
                <option value="ACCEPTED">Accepted ({applications.filter((a) => a.status === "ACCEPTED").length})</option>
                <option value="REJECTED">Not Selected ({applications.filter((a) => a.status === "REJECTED").length})</option>
                <option value="WITHDRAWN">Withdrawn ({applications.filter((a) => a.status === "WITHDRAWN").length})</option>
              </select>

              {/* Category Select */}
              <select
                aria-label="Filter by support category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as SupportRequestCategory | "ALL")}
                className="h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="ALL">All Categories</option>
                <option value="FUNDING">Funding &amp; Grants</option>
                <option value="HARDWARE">Hardware &amp; Devices</option>
                <option value="TECHNOLOGY">Software &amp; Cloud</option>
                <option value="EXPERTISE">Expertise &amp; Advisory</option>
                <option value="INFRASTRUCTURE">Infrastructure &amp; Labs</option>
                <option value="DATA">Data Access</option>
                <option value="MANUFACTURING">Manufacturing</option>
              </select>

              {/* Sort Select */}
              <select
                aria-label="Sort applications"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Opportunity (A–Z)</option>
                <option value="value">Highest Value</option>
              </select>

              {/* Reset Filters CTA */}
              {(statusFilter !== "ALL" || categoryFilter !== "ALL" || searchQuery.trim()) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setCategoryFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION E: APPLICATIONS CONTENT (CARDS / TABLE / EMPTY)                   */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="font-medium">Loading application management workspace...</p>
        </div>
      ) : activeTab === "applications" ? (
        filteredApplications.length === 0 ? (
          /* Empty State */
          <Card className="border-border bg-card">
            <CardContent className="p-12 text-center space-y-4 max-w-md mx-auto">
              <span className="p-3.5 rounded-2xl bg-muted text-muted-foreground inline-flex">
                <Send className="w-6 h-6" />
              </span>
              <div className="space-y-1">
                <p className="text-base font-bold text-foreground">
                  {applications.length === 0 ? "No Applications Submitted Yet" : "No Matching Applications Found"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {applications.length === 0
                    ? "Browse open civic research opportunities and offer specialized hardware, software, compute, or advisory to university teams."
                    : "Try adjusting your search query, status filters, or category options to view other applications."}
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                {applications.length === 0 ? (
                  <Button
                    size="sm"
                    onClick={() => void navigate("/app/industry/marketplace")}
                    className="text-xs font-semibold"
                  >
                    Browse Opportunities
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setCategoryFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="text-xs font-semibold"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "cards" ? (
          /* Card View */
          <div className="grid grid-cols-1 gap-3.5">
            {filteredApplications.map((app) => {
              const statusMeta = APPLICATION_STATUS_META[app.status];
              const listing = app.listing;
              const cat = listing?.category ?? "HARDWARE";
              const catMeta = SUPPORT_CATEGORY_META[cat];
              const hasNotes = Boolean(app.review_notes && app.review_notes.trim().length > 0);
              const nextStep = getNextStepText(app.status, hasNotes);

              return (
                <Card
                  key={app.id}
                  className="border-border bg-card shadow-xs hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Top Row: Category + Status Badges + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {catMeta && (
                          <Badge variant={catMeta.badgeTone} className="text-xs font-semibold gap-1.5 py-0.5">
                            {getCategoryIcon(cat)}
                            <span>{catMeta.label}</span>
                          </Badge>
                        )}
                        <Badge variant={statusMeta?.badgeTone ?? "default"} className="text-xs font-bold px-2.5 py-0.5">
                          {statusMeta?.label ?? app.status}
                        </Badge>
                        {app.status === "ACCEPTED" && (
                          <Badge variant="success" className="text-[11px] font-bold">
                            <Handshake className="w-3 h-3 mr-1" />
                            Partner Onboarded
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(app)}
                          className="text-xs h-7.5 gap-1 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </Button>

                        {listing?.id && (
                          <Link to={`/app/industry/marketplace/${listing.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs h-7.5 gap-1 text-primary">
                              <span>Opportunity</span>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Main Title & Context Strip */}
                    <div className="space-y-1">
                      <h3
                        onClick={() => handleOpenDetail(app)}
                        className="font-bold text-base text-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        {listing?.public_title ?? "Research Support Listing"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {listing?.institution && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            <span>{listing.institution.name}</span>
                            {listing.institution.city && (
                              <span className="text-muted-foreground">({listing.institution.city})</span>
                            )}
                          </span>
                        )}
                        {listing?.project?.project_title && (
                          <span>
                            • Project: <strong>{listing.project.project_title}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Proposed Contribution Box */}
                    <div className="p-3 rounded-lg border border-border/70 bg-muted/20 text-xs space-y-1">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">
                        Your Proposed Contribution:
                      </span>
                      <p className="text-foreground leading-relaxed">
                        {app.proposed_contribution}
                      </p>
                    </div>

                    {/* University Review Notes / Clarification Callout */}
                    {hasNotes && (
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-950 dark:text-amber-200 space-y-1 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>University Reviewer Clarification Note</span>
                        </div>
                        <p className="pl-5 leading-relaxed font-medium">
                          {app.review_notes}
                        </p>
                      </div>
                    )}

                    {/* Acceptance Notes Callout */}
                    {app.acceptance_agreement_notes && (
                      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 space-y-1 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Partnership Agreement &amp; Delivery Scope</span>
                        </div>
                        <p className="pl-5 leading-relaxed font-medium">
                          {app.acceptance_agreement_notes}
                        </p>
                      </div>
                    )}

                    {/* Rejection Notes Callout */}
                    {app.rejection_reason && (
                      <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-950 dark:text-rose-200 space-y-1 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-300">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Review Decision Notes</span>
                        </div>
                        <p className="pl-5 leading-relaxed font-medium">
                          {app.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Bottom Metadata Strip: Next Expected Step + Values */}
                    <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                        {app.estimated_value != null && (
                          <span>
                            Value: <strong className="text-foreground">₹{app.estimated_value.toLocaleString()}</strong>
                          </span>
                        )}
                        {app.timeline && (
                          <span>
                            Timeline: <strong className="text-foreground">{app.timeline}</strong>
                          </span>
                        )}
                        <span className="font-mono text-[11px]">
                          Submitted {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span className="font-semibold text-foreground">Next:</span>
                        <span className="line-clamp-1">{nextStep}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Card className="border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5 pl-4">Opportunity &amp; Institution</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Offered Value</th>
                    <th className="p-3.5">Timeline</th>
                    <th className="p-3.5">Submitted</th>
                    <th className="p-3.5 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((app) => {
                    const statusMeta = APPLICATION_STATUS_META[app.status];
                    const listing = app.listing;
                    const cat = listing?.category ?? "HARDWARE";
                    const catMeta = SUPPORT_CATEGORY_META[cat];

                    return (
                      <tr key={`row-${app.id}`} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 pl-4 max-w-xs">
                          <p
                            onClick={() => handleOpenDetail(app)}
                            className="font-bold text-foreground hover:text-primary cursor-pointer line-clamp-1"
                          >
                            {listing?.public_title ?? "Research Support"}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {listing?.institution?.name} • {listing?.project?.project_title ?? "Prototype"}
                          </p>
                        </td>

                        <td className="p-3.5">
                          {catMeta && (
                            <Badge variant={catMeta.badgeTone} className="text-[11px] font-semibold">
                              {catMeta.label}
                            </Badge>
                          )}
                        </td>

                        <td className="p-3.5">
                          <Badge variant={statusMeta?.badgeTone ?? "default"} className="text-[11px] font-bold">
                            {statusMeta?.label ?? app.status}
                          </Badge>
                        </td>

                        <td className="p-3.5 font-medium text-foreground">
                          {app.estimated_value != null ? `₹${app.estimated_value.toLocaleString()}` : "—"}
                        </td>

                        <td className="p-3.5 text-muted-foreground">
                          {app.timeline || "Flexible"}
                        </td>

                        <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>

                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetail(app)}
                              className="text-xs h-7 px-2.5 font-semibold"
                            >
                              Details
                            </Button>
                            {listing?.id && (
                              <Link to={`/app/industry/marketplace/${listing.id}`}>
                                <Button size="sm" variant="ghost" className="text-xs h-7 w-7 p-0 text-primary">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        /* SECTION F: ACTIVE PARTNERSHIPS TAB CONTENT */
        partnerships.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12 text-center space-y-4 max-w-md mx-auto">
              <span className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 inline-flex">
                <Handshake className="w-6 h-6" />
              </span>
              <div className="space-y-1">
                <p className="text-base font-bold text-foreground">No Active Partnerships Yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When a university project team evaluates and accepts your support proposal, your formal project engagement details and scope will appear here.
                </p>
              </div>
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() => handleTabChange("applications")}
                  className="text-xs font-semibold"
                >
                  View Submitted Applications
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {partnerships.map((p) => {
              const catMeta = SUPPORT_CATEGORY_META[p.category];

              return (
                <Card
                  key={`part-${p.id}`}
                  className="border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/15 shadow-xs"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="font-bold text-base text-foreground">
                            {p.project?.title ?? "University Prototype"}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {p.project?.institution?.name} • Challenge: <strong>{p.project?.challenge?.title}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {catMeta && (
                          <Badge variant={catMeta.badgeTone} className="text-xs font-semibold">
                            {catMeta.label}
                          </Badge>
                        )}
                        <Badge variant="success" className="text-xs font-bold uppercase tracking-wider">
                          {p.access_scope}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3.5 bg-background border border-emerald-200 dark:border-emerald-900/80 rounded-xl text-xs space-y-1.5">
                      <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider block">
                        Deliverables &amp; Support Commitment:
                      </span>
                      <p className="text-foreground leading-relaxed font-medium">
                        {p.contribution_summary}
                      </p>
                    </div>

                    {p.notes && (
                      <div className="text-xs text-foreground/90 bg-background/50 p-3 rounded-lg border border-border/60 space-y-1">
                        <span className="font-bold text-muted-foreground block text-[11px]">Lab Notes &amp; Integration Guidelines:</span>
                        <p className="leading-relaxed">{p.notes}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[11px]">
                        Onboarded {new Date(p.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          Status: {p.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* SECTION G: APPLICATION DETAIL MODAL                                       */}
      {/* ========================================================================= */}
      <IndustryApplicationDetailDialog
        application={selectedApp}
        partnership={selectedAppPartnership}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
