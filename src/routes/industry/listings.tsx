import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IndustryListingDetailDialog } from "@/components/marketplace/industry-listing-detail-dialog";
import {
  fetchIndustrySupportListingsData,
  LISTING_STATUS_META,
  SUPPORT_CATEGORY_META,
  type IndustrySupportListingItem,
  type IndustrySupportListingsData,
} from "@/lib/marketplace";
import type {
  ListingStatus,
  SupportRequestCategory,
} from "@/types/database";

type ViewMode = "cards" | "table";
type SortOption = "newest" | "oldest" | "title" | "applications";

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

export function IndustryListingsPage() {
  const navigate = useNavigate();
  const { profile } = useAppSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [data, setData] = useState<IndustrySupportListingsData | null>(null);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<SupportRequestCategory | "ALL">("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Detail Modal State
  const [selectedListing, setSelectedListing] = useState<IndustrySupportListingItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchIndustrySupportListingsData(profile);
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      console.error("Failed to load industry support listings:", err);
      setError(err instanceof Error ? err.message : "Failed to load support listings.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetchIndustrySupportListingsData(profile);
        if (isMounted) {
          setData(res);
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to load industry support listings:", err);
          setError(err instanceof Error ? err.message : "Failed to load support listings.");
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

  const organization = data?.organization;
  const metrics = data?.metrics ?? {
    totalListings: 0,
    activeOpenCount: 0,
    draftOrReviewCount: 0,
    pausedOrFulfilledCount: 0,
    totalApplicationsCount: 0,
    activePartnershipsCount: 0,
    categoryCounts: {
      ALL: 0,
      FUNDING: 0,
      HARDWARE: 0,
      TECHNOLOGY: 0,
      EXPERTISE: 0,
      INFRASTRUCTURE: 0,
      DATA: 0,
      MANUFACTURING: 0,
    },
  };

  const listings = useMemo(() => data?.listings ?? [], [data?.listings]);

  // Filtered and Sorted Listings
  const filteredListings = useMemo(() => {
    return listings
      .filter((listing) => {
        // Status filter
        if (statusFilter !== "ALL" && listing.status !== statusFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== "ALL" && listing.category !== categoryFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const titleMatch = listing.public_title.toLowerCase().includes(q);
          const summaryMatch = listing.public_summary.toLowerCase().includes(q);
          const specMatch = listing.public_specification?.toLowerCase().includes(q) ?? false;
          const outcomeMatch = listing.desired_outcome?.toLowerCase().includes(q) ?? false;
          const instMatch = listing.institution_name.toLowerCase().includes(q);
          const challengeMatch = listing.challenge_title.toLowerCase().includes(q);
          const catMatch = listing.category.toLowerCase().includes(q);

          if (!titleMatch && !summaryMatch && !specMatch && !outcomeMatch && !instMatch && !challengeMatch && !catMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "newest") {
          return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
        }
        if (sortOption === "oldest") {
          return new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime();
        }
        if (sortOption === "title") {
          return a.public_title.localeCompare(b.public_title);
        }
        if (sortOption === "applications") {
          return (b.applications_count || 0) - (a.applications_count || 0);
        }
        return 0;
      });
  }, [listings, statusFilter, categoryFilter, searchQuery, sortOption]);

  // Listings requiring attention (e.g. applications received or paused)
  const attentionListings = useMemo(() => {
    return listings.filter(
      (l) =>
        (l.applications && l.applications.length > 0) ||
        l.status === "PAUSED" ||
        l.status === "PENDING_REVIEW"
    );
  }, [listings]);

  const handleOpenDetail = (listing: IndustrySupportListingItem) => {
    setSelectedListing(listing);
    setIsDetailOpen(true);
  };

  // Unlinked organization state
  if (!organization && !loading) {
    return (
      <div className="space-y-6 pb-16 max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] font-bold uppercase tracking-wider">
            Industry Partner Workspace
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Support Listings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage the support and resources your organization makes available to university research projects.
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
              <span>Browse Marketplace</span>
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Support Listings
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            {organization ? (
              <span>
                Organization: <strong className="text-foreground">{organization.name}</strong> • Manage the support requirements, resource commitments, and prototype collaboration offerings connected to your organization.
              </span>
            ) : (
              "Manage the support and resources your organization makes available to CivicFix research and innovation projects."
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
      {/* SECTION B: REAL OVERVIEW METRICS                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Listings
              </span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground">
              {loading ? "…" : metrics.totalListings}
            </p>
            <p className="text-[11px] text-muted-foreground">All support requirements</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Open / Active
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? "…" : metrics.activeOpenCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Open on marketplace</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                In Review / Draft
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {loading ? "…" : metrics.draftOrReviewCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Awaiting publication</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Applications
              </span>
              <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {loading ? "…" : metrics.totalApplicationsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Connected partner offers</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Partnerships
              </span>
              <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? "…" : metrics.activePartnershipsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Active collaborations</p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: NEEDS ATTENTION AREA (REAL APPLICATION/LISTING STATES ONLY)    */}
      {/* ========================================================================= */}
      {attentionListings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Listing Highlights &amp; Action Queue ({attentionListings.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionListings.slice(0, 4).map((l) => {
              const catMeta = SUPPORT_CATEGORY_META[l.category];
              const appCount = l.applications?.length || 0;

              return (
                <div
                  key={`att-list-${l.id}`}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {catMeta && (
                          <Badge variant={catMeta.badgeTone} className="text-[10px] font-semibold py-0">
                            {catMeta.label}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {l.status}
                        </Badge>
                      </div>

                      {appCount > 0 && (
                        <Badge variant="info" className="text-[10px] font-bold">
                          {appCount} {appCount === 1 ? "Offer" : "Offers"} Received
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground line-clamp-1">
                      {l.public_title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {l.public_summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground">
                      {l.institution_name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetail(l)}
                      className="text-xs h-7 gap-1 font-semibold"
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
      {/* SECTION D: SEARCH, STATUS, CATEGORY & SORTING TOOLBAR                     */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search listings by title, specifications, outcome, institution, or domain..."
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

          {/* Filters & View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select */}
            <select
              aria-label="Filter by listing status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ListingStatus | "ALL")}
              className="h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="ALL">All Statuses ({listings.length})</option>
              <option value="OPEN">Open / Active ({listings.filter((l) => l.status === "OPEN").length})</option>
              <option value="APPROVED">Approved ({listings.filter((l) => l.status === "APPROVED").length})</option>
              <option value="PENDING_REVIEW">Pending Review ({listings.filter((l) => l.status === "PENDING_REVIEW").length})</option>
              <option value="DRAFT">Draft ({listings.filter((l) => l.status === "DRAFT").length})</option>
              <option value="PAUSED">Paused ({listings.filter((l) => l.status === "PAUSED").length})</option>
              <option value="FULFILLED">Fulfilled ({listings.filter((l) => l.status === "FULFILLED").length})</option>
              <option value="CLOSED">Closed ({listings.filter((l) => l.status === "CLOSED").length})</option>
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
              aria-label="Sort listings"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A–Z)</option>
              <option value="applications">Most Applications</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 border-l border-border pl-2">
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
      </div>

      {/* ========================================================================= */}
      {/* SECTION E: LISTINGS CONTENT (CARDS / TABLE / EMPTY)                       */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="font-medium">Loading support listings workspace...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-12 text-center space-y-4 max-w-md mx-auto">
            <span className="p-3.5 rounded-2xl bg-muted text-muted-foreground inline-flex">
              <Layers className="w-6 h-6" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">
                {listings.length === 0 ? "No Support Listings Registered" : "No Matching Listings Found"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {listings.length === 0
                  ? "Explore open university prototypes and offer specialized engineering, dataset access, funding, or advisory support."
                  : "Try adjusting your search keywords, status filters, or category options to view other support listings."}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              {listings.length === 0 ? (
                <Button
                  size="sm"
                  onClick={() => void navigate("/app/industry/marketplace")}
                  className="text-xs font-semibold"
                >
                  Browse Marketplace
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
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredListings.map((listing) => {
            const statusMeta = LISTING_STATUS_META[listing.status];
            const cat = listing.category;
            const catMeta = SUPPORT_CATEGORY_META[cat];
            const appCount = listing.applications?.length || listing.applications_count || 0;

            return (
              <Card
                key={listing.id}
                className="border-border bg-card shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Badges Strip */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {catMeta && (
                        <Badge variant={catMeta.badgeTone} className="text-xs font-semibold gap-1.5 py-0.5">
                          {getCategoryIcon(cat)}
                          <span>{catMeta.label}</span>
                        </Badge>
                      )}
                      <Badge variant={statusMeta?.badgeTone ?? "default"} className="text-xs font-bold px-2.5 py-0.5">
                        {statusMeta?.label ?? listing.status}
                      </Badge>
                      {listing.myPartnership && (
                        <Badge variant="success" className="text-[11px] font-bold">
                          <Handshake className="w-3 h-3 mr-1" />
                          Active Partner
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-muted-foreground">
                      {appCount} {appCount === 1 ? "Offer" : "Offers"}
                    </span>
                  </div>

                  {/* Title & Institution Context */}
                  <div className="space-y-1">
                    <h3
                      onClick={() => handleOpenDetail(listing)}
                      className="font-bold text-base text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                    >
                      {listing.public_title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        <span>{listing.institution_name}</span>
                      </span>
                      <span>• Challenge: {listing.challenge_title}</span>
                    </div>
                  </div>

                  {/* Summary & Deliverable Specs */}
                  <div className="space-y-2">
                    <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                      {listing.public_summary}
                    </p>

                    {listing.public_specification && (
                      <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Specifications:
                        </span>
                        <p className="text-foreground/90 line-clamp-2 leading-relaxed">
                          {listing.public_specification}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metadata: Timeline & Desired Outcome */}
                  <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">Timeline:</span>{" "}
                      <span className="line-clamp-1">{listing.public_timeline || "Coordinated"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Desired:</span>{" "}
                      <span className="line-clamp-1">{listing.desired_outcome || "Validation"}</span>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {listing.published_at ? `Published ${new Date(listing.published_at).toLocaleDateString()}` : "Active Listing"}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetail(listing)}
                        className="text-xs h-7.5 gap-1 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </Button>

                      <Link to={`/app/industry/marketplace/${listing.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs h-7.5 gap-1 text-primary">
                          <span>Public Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Dense Table View */
        <Card className="border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 pl-4">Listing &amp; Institution</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Applications</th>
                  <th className="p-3.5">Target Timeline</th>
                  <th className="p-3.5">Published</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredListings.map((listing) => {
                  const statusMeta = LISTING_STATUS_META[listing.status];
                  const cat = listing.category;
                  const catMeta = SUPPORT_CATEGORY_META[cat];
                  const appCount = listing.applications?.length || listing.applications_count || 0;

                  return (
                    <tr key={`row-${listing.id}`} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 pl-4 max-w-xs">
                        <p
                          onClick={() => handleOpenDetail(listing)}
                          className="font-bold text-foreground hover:text-primary cursor-pointer line-clamp-1"
                        >
                          {listing.public_title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {listing.institution_name} • {listing.challenge_title}
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
                          {statusMeta?.label ?? listing.status}
                        </Badge>
                      </td>

                      <td className="p-3.5 font-bold text-foreground">
                        {appCount} {appCount === 1 ? "offer" : "offers"}
                      </td>

                      <td className="p-3.5 text-muted-foreground">
                        {listing.public_timeline || "Coordinated"}
                      </td>

                      <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                        {listing.published_at ? new Date(listing.published_at).toLocaleDateString() : "Active"}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetail(listing)}
                            className="text-xs h-7 px-2.5 font-semibold"
                          >
                            Details
                          </Button>
                          <Link to={`/app/industry/marketplace/${listing.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs h-7 w-7 p-0 text-primary">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SECTION F: LISTING DETAIL MODAL                                           */}
      {/* ========================================================================= */}
      <IndustryListingDetailDialog
        listing={selectedListing}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
