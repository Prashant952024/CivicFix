import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Handshake,
  HelpCircle,
  Info,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import {
  APPLICATION_STATUS_META,
  fetchOpportunityDiscoveryData,
  ORGANIZATION_TYPE_META,
  submitSupportApplication,
  SUPPORT_CATEGORY_META,
  type EnrichedDiscoveryListing,
  type OpportunityDiscoveryData,
} from "@/lib/marketplace";
import type { SupportRequestCategory } from "@/types/database";

const CATEGORIES: { label: string; value: SupportRequestCategory | "ALL" }[] = [
  { label: "All Opportunities", value: "ALL" },
  { label: "Funding & Grants", value: "FUNDING" },
  { label: "Hardware & Devices", value: "HARDWARE" },
  { label: "Software & Cloud", value: "TECHNOLOGY" },
  { label: "Expertise & Advisory", value: "EXPERTISE" },
  { label: "Testing & Facilities", value: "INFRASTRUCTURE" },
  { label: "Data Access", value: "DATA" },
  { label: "Manufacturing", value: "MANUFACTURING" },
];

type SortOption = "NEWEST" | "MOST_APPLICANTS" | "CATEGORY" | "INSTITUTION";
type ApplicationFilterOption = "ALL" | "NOT_APPLIED" | "APPLIED";
type ViewMode = "grid" | "table";

export function IndustryMarketplacePage() {
  const navigate = useNavigate();
  const { profile } = useAppSession();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpportunityDiscoveryData | null>(null);

  // Discovery Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SupportRequestCategory | "ALL">("ALL");
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilterOption>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [onlyHighMatch, setOnlyHighMatch] = useState(false);

  // In-Place Evaluation & Application Dialog
  const [evaluatingListing, setEvaluatingListing] = useState<EnrichedDiscoveryListing | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [proposedContribution, setProposedContribution] = useState("");
  const [capabilitiesSummary, setCapabilitiesSummary] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [timeline, setTimeline] = useState("");
  const [termsOrConditions, setTermsOrConditions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadDiscoveryData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetchOpportunityDiscoveryData(profile);
      setData(res);
    } catch (err: unknown) {
      console.error("Failed to load opportunity discovery data:", err);
      setError(err instanceof Error ? err.message : "Failed to load opportunities.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetchOpportunityDiscoveryData(profile);
        if (isMounted) {
          setData(res);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load opportunities.");
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

  // Filter & Sort Logic
  const filteredListings = useMemo(() => {
    if (!data?.listings) return [];

    let results = [...data.listings];

    // 1. Text Search across multiple fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(
        (item) =>
          item.public_title.toLowerCase().includes(q) ||
          item.public_summary.toLowerCase().includes(q) ||
          item.challenge_title.toLowerCase().includes(q) ||
          item.institution_name.toLowerCase().includes(q) ||
          (item.institution_city && item.institution_city.toLowerCase().includes(q)) ||
          (item.challenge_domain && item.challenge_domain.toLowerCase().includes(q)) ||
          (item.public_specification && item.public_specification.toLowerCase().includes(q)) ||
          (item.desired_outcome && item.desired_outcome.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (selectedCategory !== "ALL") {
      results = results.filter((item) => item.category === selectedCategory);
    }

    // 3. Application State Filter
    if (applicationFilter === "NOT_APPLIED") {
      results = results.filter((item) => !item.hasApplied);
    } else if (applicationFilter === "APPLIED") {
      results = results.filter((item) => item.hasApplied);
    }

    // 4. High Match Filter
    if (onlyHighMatch) {
      results = results.filter((item) => item.advisoryMatch.level === "HIGH");
    }

    // 5. Sorting
    results.sort((a, b) => {
      if (sortBy === "MOST_APPLICANTS") {
        return (b.applications_count || 0) - (a.applications_count || 0);
      }
      if (sortBy === "CATEGORY") {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === "INSTITUTION") {
        return a.institution_name.localeCompare(b.institution_name);
      }
      // Default: NEWEST
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return timeB - timeA;
    });

    return results;
  }, [data, searchQuery, selectedCategory, applicationFilter, onlyHighMatch, sortBy]);

  // Open Evaluation Drawer
  function handleOpenEvaluation(listing: EnrichedDiscoveryListing) {
    setEvaluatingListing(listing);
    setSubmitSuccess(false);
    setSubmitError(null);
    setProposedContribution("");
    setCapabilitiesSummary("");
    setEstimatedValue("");
    setTimeline(listing.public_timeline || "");
    setTermsOrConditions("");
    setApplyModalOpen(true);
  }

  // Submit Application
  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!evaluatingListing || !data?.organization || !profile) return;

    if (!proposedContribution.trim() || !capabilitiesSummary.trim()) {
      setSubmitError("Please provide both the proposed contribution and your organization's capability summary.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitSupportApplication({
        listingId: evaluatingListing.id,
        organizationId: data.organization.id,
        applicantProfileId: profile.id,
        proposedContribution: proposedContribution.trim(),
        capabilitiesSummary: capabilitiesSummary.trim(),
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        timeline: timeline.trim() || null,
        termsOrConditions: termsOrConditions.trim() || null,
      });

      setSubmitSuccess(true);
      await loadDiscoveryData(true);
    } catch (err: unknown) {
      console.error("Failed to submit support application:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  const organization = data?.organization;
  const isOrgVerified = organization?.verification_status === "VERIFIED";
  const orgTypeMeta = organization
    ? ORGANIZATION_TYPE_META[organization.organization_type] ?? {
        label: organization.organization_type,
        badgeTone: "default",
      }
    : null;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* SECTION A: PAGE HEADER & CONTEXT */}
      <PageHeader
        title="Opportunity Discovery"
        description="Discover and evaluate civic research projects seeking specialized industry funding, hardware, cloud technology, expertise, testing infrastructure, data, or manufacturing support."
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void loadDiscoveryData(true); }}
            disabled={loading || refreshing}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { void navigate("/app/industry"); }}
            className="text-xs h-8 gap-1.5"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Button>

          <Button
            size="sm"
            onClick={() => { void navigate("/app/industry/applications"); }}
            className="text-xs h-8 gap-1.5 shadow-xs"
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>My Applications ({data?.myApplicationsCount ?? 0})</span>
          </Button>
        </div>
      </PageHeader>

      {/* Organization Context Banner */}
      {organization ? (
        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">{organization.name}</span>
                {isOrgVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <div className="text-muted-foreground text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Organization Type:</span>
                <Badge variant={orgTypeMeta?.badgeTone} className="text-[10px]">
                  {orgTypeMeta?.label}
                </Badge>
                {organization.sector && (
                  <span className="text-foreground font-medium">• Sector: {organization.sector}</span>
                )}
              </div>
            </div>
          </div>

          <Badge
            variant={isOrgVerified ? "success" : "warning"}
            className="text-xs self-start sm:self-auto"
          >
            {isOrgVerified ? "Verified Partner" : "Verification Pending"}
          </Badge>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-muted bg-muted/30 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>
              Browsing public opportunity catalog. Link your user profile to a registered Industry Partner organization to submit support offers.
            </span>
          </div>
        </div>
      )}

      {/* Controlled Disclosure Notice */}
      <Card className="border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-300 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="space-y-0.5 text-xs text-blue-950 dark:text-blue-200">
              <span className="font-bold block">Controlled Disclosure &amp; Intellectual Property Protection</span>
              <p className="text-blue-900/90 dark:text-blue-300/90 leading-relaxed text-[11px] sm:text-xs">
                All marketplace opportunities are published from approved university research projects. Detailed internal lab codebases, private student discussions, and raw telemetry remain confidential. Contributing partners receive a scoped, non-exclusive collaboration role (<code>SUPPORT_SPECIFIC</code>).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {loading ? "-" : data?.totalOpenCount ?? 0}
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                Open Opportunities
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {loading
                  ? "-"
                  : new Set(data?.listings.map((l) => l.institution_id)).size}
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                Accredited Universities
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {loading ? "-" : data?.highMatchCount ?? 0}
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                High Advisory Matches
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Handshake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {loading ? "-" : data?.myApplicationsCount ?? 0}
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                My Applications
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION B: SEARCH, FILTERS & SORTING TOOLBAR */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          {/* Top Row: Search Input & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by topic, university, technical spec, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-8 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

            {/* Filter Dropdowns & View Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* High Match Toggle */}
              <button
                type="button"
                onClick={() => setOnlyHighMatch((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  onlyHighMatch
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>High Synergy Matches</span>
              </button>

              {/* Application Filter */}
              <select
                value={applicationFilter}
                onChange={(e) => setApplicationFilter(e.target.value as ApplicationFilterOption)}
                aria-label="Filter opportunities by application status"
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="ALL">All Applications</option>
                <option value="NOT_APPLIED">Not Yet Applied</option>
                <option value="APPLIED">Applied Only</option>
              </select>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-lg px-2 h-8">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort opportunities"
                  className="bg-transparent text-xs text-foreground focus:outline-none font-medium"
                >
                  <option value="NEWEST">Newest Published</option>
                  <option value="MOST_APPLICANTS">Most Applicants</option>
                  <option value="CATEGORY">Category</option>
                  <option value="INSTITUTION">Institution</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid View"
                  className={`p-1.5 rounded-md text-xs transition-all ${
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table View"
                  className={`p-1.5 rounded-md text-xs transition-all ${
                    viewMode === "table"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Category Filter Tabs with live count badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border/50">
            {CATEGORIES.map((cat) => {
              const count = data?.categoryCounts[cat.value] ?? 0;
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white font-bold"
                        : "bg-background text-muted-foreground font-mono"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Filter Indicators & Results Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          Showing <strong className="text-foreground">{filteredListings.length}</strong> of{" "}
          <strong className="text-foreground">{data?.totalOpenCount ?? 0}</strong> open research opportunities
        </div>

        {(searchQuery || selectedCategory !== "ALL" || applicationFilter !== "ALL" || onlyHighMatch) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("ALL");
              setApplicationFilter("ALL");
              setOnlyHighMatch(false);
            }}
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => { void loadDiscoveryData(); }} className="text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* SECTION C: RESULTS (GRID OR TABLE) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/60 animate-pulse">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between gap-2">
                  <div className="h-5 w-24 bg-muted rounded-full" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
                <div className="h-14 w-full bg-muted/60 rounded" />
                <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-8 w-24 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="border-border/80 bg-card">
          <CardContent className="p-12 text-center space-y-3 max-w-md mx-auto">
            <span className="p-3 rounded-xl bg-primary/10 text-primary inline-flex">
              <Filter className="w-6 h-6" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">No Opportunities Match Your Filters</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                There are no open requirements matching your search keyword, category, or application criteria. Try adjusting your query or resetting filters.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setApplicationFilter("ALL");
                setOnlyHighMatch(false);
              }}
              className="text-xs"
            >
              Clear Search &amp; Filters
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((item) => {
            const catMeta = SUPPORT_CATEGORY_META[item.category];
            const hasApplied = item.hasApplied;
            const appStatus = item.applicationStatus;
            const advisory = item.advisoryMatch;

            return (
              <Card
                key={item.id}
                className="border-border/80 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between bg-card group"
              >
                <CardContent className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Header Badges: Category + Applicants + Application State */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant={catMeta.badgeTone} className="text-[11px] font-semibold">
                        {catMeta.label}
                      </Badge>

                      <div className="flex items-center gap-1.5">
                        {hasApplied && appStatus && (
                          <Badge
                            variant={APPLICATION_STATUS_META[appStatus]?.badgeTone ?? "info"}
                            className="text-[10px] font-bold"
                          >
                            {APPLICATION_STATUS_META[appStatus]?.label ?? "Applied"}
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {item.applications_count} {item.applications_count === 1 ? "applicant" : "applicants"}
                        </span>
                      </div>
                    </div>

                    {/* Challenge Context Title */}
                    <div className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1 truncate">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.challenge_title}</span>
                    </div>

                    {/* Public Title */}
                    <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.public_title}
                    </h3>

                    {/* Public Summary */}
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {item.public_summary}
                    </p>

                    {/* Technical Spec / Deliverable snippet */}
                    {item.public_specification && (
                      <div className="p-2 rounded-lg bg-muted/40 text-[11px] text-muted-foreground line-clamp-2 border border-border/50 leading-relaxed">
                        <span className="font-semibold text-foreground">Spec: </span>
                        {item.public_specification}
                      </div>
                    )}

                    {/* AI Advisory Match Preview Pill */}
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 flex items-start gap-2 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-foreground">
                            AI Advisory Match
                          </span>
                          <Badge variant={advisory.badgeTone} className="text-[9px] px-1.5 py-0">
                            {advisory.badgeLabel}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[10px] line-clamp-1">
                          {advisory.summary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-border/60 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate font-semibold text-foreground">
                          {item.institution_name}
                        </span>
                      </div>
                      {item.institution_city && (
                        <div className="flex items-center gap-1 text-[11px] shrink-0">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>{item.institution_city}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenEvaluation(item)}
                        className="text-xs font-bold gap-1 shadow-xs"
                      >
                        <span>{hasApplied ? "View Evaluation" : "Evaluate & Apply"}</span>
                      </Button>

                      <Link to={`/app/industry/marketplace/${item.id}`} className="block">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-semibold gap-1"
                        >
                          <span>Full Detail</span>
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
        /* TABLE VIEW */
        <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="p-3.5 pl-4">Opportunity</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">University</th>
                  <th className="p-3.5">AI Advisory Fit</th>
                  <th className="p-3.5">Applications</th>
                  <th className="p-3.5">Your Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredListings.map((item) => {
                  const catMeta = SUPPORT_CATEGORY_META[item.category];
                  const hasApplied = item.hasApplied;
                  const appStatus = item.applicationStatus;
                  const advisory = item.advisoryMatch;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 pl-4 max-w-xs">
                        <div className="font-bold text-foreground line-clamp-1">{item.public_title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {item.challenge_title}
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge variant={catMeta.badgeTone} className="text-[10px]">
                          {catMeta.label}
                        </Badge>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-medium text-foreground">{item.institution_name}</div>
                        {item.institution_city && (
                          <div className="text-[11px] text-muted-foreground">{item.institution_city}</div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge variant={advisory.badgeTone} className="text-[10px]">
                          {advisory.badgeLabel}
                        </Badge>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono text-muted-foreground">
                        {item.applications_count}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {hasApplied && appStatus ? (
                          <Badge
                            variant={APPLICATION_STATUS_META[appStatus]?.badgeTone ?? "info"}
                            className="text-[10px]"
                          >
                            {APPLICATION_STATUS_META[appStatus]?.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Not Applied</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenEvaluation(item)}
                            className="text-xs h-7 px-2.5 font-semibold"
                          >
                            <span>Evaluate</span>
                          </Button>
                          <Link to={`/app/industry/marketplace/${item.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              title="Open Full Page Detail"
                            >
                              <ExternalLink className="w-3 h-3" />
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

      {/* SECTION D: IN-PLACE OPPORTUNITY EVALUATION & APPLICATION MODAL */}
      {evaluatingListing && (
        <Dialog
          open={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          title="Opportunity Evaluation &amp; Application"
          description={`Civic research collaboration requirement from ${evaluatingListing.institution_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* 1. What problem is being addressed? */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>1. What problem is being addressed?</span>
              </div>
              <h4 className="font-bold text-base text-foreground">
                {evaluatingListing.challenge_title}
              </h4>
              {evaluatingListing.problemStatement ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {evaluatingListing.problemStatement}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {evaluatingListing.public_summary}
                </p>
              )}
            </div>

            {/* 2. What project is working on it? */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" />
                <span>2. What project &amp; university is leading it?</span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-foreground">
                    {evaluatingListing.institution_name}
                  </div>
                  {evaluatingListing.institution_city && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{evaluatingListing.institution_city}</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Stage: {evaluatingListing.projectStage}
                </Badge>
              </div>
            </div>

            {/* 3. What support is required? */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Handshake className="w-3.5 h-3.5" />
                  <span>3. What support is required?</span>
                </div>
                <Badge
                  variant={SUPPORT_CATEGORY_META[evaluatingListing.category]?.badgeTone ?? "default"}
                  className="text-xs font-semibold"
                >
                  {SUPPORT_CATEGORY_META[evaluatingListing.category]?.label}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-sm text-foreground">
                  {evaluatingListing.public_title}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {evaluatingListing.public_summary}
                </p>

                {evaluatingListing.public_specification && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-0.5">
                    <span className="font-semibold text-foreground block">Deliverable Specifications:</span>
                    <p className="text-muted-foreground leading-relaxed">
                      {evaluatingListing.public_specification}
                    </p>
                  </div>
                )}

                {evaluatingListing.desired_outcome && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-0.5">
                    <span className="font-semibold text-foreground block">Target Impact &amp; Outcome:</span>
                    <p className="text-muted-foreground leading-relaxed">
                      {evaluatingListing.desired_outcome}
                    </p>
                  </div>
                )}

                {evaluatingListing.public_timeline && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span><strong>Required Schedule:</strong> {evaluatingListing.public_timeline}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. AI Advisory Match (Non-authoritative) */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-primary uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>4. AI Advisory Capability Match</span>
                </div>
                <Badge variant={evaluatingListing.advisoryMatch.badgeTone} className="text-xs">
                  {evaluatingListing.advisoryMatch.badgeLabel} ({evaluatingListing.advisoryMatch.score}%)
                </Badge>
              </div>

              <div className="space-y-1 text-xs">
                <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                  {evaluatingListing.advisoryMatch.reasons.map((r, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-primary/15 flex items-start gap-2 text-[11px] text-muted-foreground italic">
                <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>AI Advisory Notice:</strong> Recommendations are advisory heuristics designed to assist opportunity discovery. Human industry partners authoritatively decide whether to apply, and university project leads authoritatively evaluate offers.
                </span>
              </div>
            </div>

            {/* 5. Application State & Action Form */}
            <div className="pt-2">
              {evaluatingListing.hasApplied && evaluatingListing.existingApplication ? (
                /* Already Applied Box */
                <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                          Application Already Submitted
                        </span>
                      </div>
                      <Badge
                        variant={APPLICATION_STATUS_META[evaluatingListing.existingApplication.status]?.badgeTone ?? "info"}
                        className="text-xs font-bold"
                      >
                        {APPLICATION_STATUS_META[evaluatingListing.existingApplication.status]?.label ?? "Submitted"}
                      </Badge>
                    </div>

                    <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                      <div>
                        <strong>Your Proposed Contribution:</strong>{" "}
                        {evaluatingListing.existingApplication.proposed_contribution}
                      </div>
                      {evaluatingListing.existingApplication.timeline && (
                        <div>
                          <strong>Proposed Timeline:</strong> {evaluatingListing.existingApplication.timeline}
                        </div>
                      )}
                      {evaluatingListing.existingApplication.review_notes && (
                        <div className="p-3 bg-white/80 dark:bg-background/80 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1 text-foreground">
                          <div className="font-bold flex items-center gap-1 text-emerald-700">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Clarification Notes from University:</span>
                          </div>
                          <p>{evaluatingListing.existingApplication.review_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 dark:text-emerald-400">
                      <span>Submitted on {new Date(evaluatingListing.existingApplication.created_at).toLocaleDateString()}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setApplyModalOpen(false);
                          void navigate("/app/industry/applications");
                        }}
                        className="text-xs h-7"
                      >
                        Track in My Applications
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : !organization ? (
                /* Unregistered User Warning */
                <div className="p-4 rounded-xl border border-muted bg-muted/30 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">Organization Registration Required</p>
                  <p>
                    Your user account is not linked to a registered industry organization. To submit contribution offers, please register your company or CSR organization.
                  </p>
                </div>
              ) : !isOrgVerified ? (
                /* Unverified Organization Notice */
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-950 dark:text-amber-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Organization Verification Pending</span>
                  </div>
                  <p className="leading-relaxed">
                    Your organization (<strong>{organization.name}</strong>) is currently <code>{organization.verification_status}</code>. Municipal innovation managers review and verify organizations before support applications can be dispatched.
                  </p>
                </div>
              ) : submitSuccess ? (
                /* Submission Success Notice */
                <Card className="border-emerald-300 bg-emerald-50/50 p-5 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-emerald-950">Support Application Submitted!</h4>
                    <p className="text-xs text-emerald-800 max-w-md mx-auto">
                      Your offer has been submitted to the university research team. You can monitor its evaluation in your applications tracker.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setApplyModalOpen(false);
                        void navigate("/app/industry/applications");
                      }}
                      className="text-xs"
                    >
                      View in My Applications
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setApplyModalOpen(false)}
                      className="text-xs"
                    >
                      Continue Discovery
                    </Button>
                  </div>
                </Card>
              ) : (
                /* Application Submission Form */
                <form onSubmit={(e) => { void handleApplySubmit(e); }} className="space-y-4 pt-2">
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span>Submit Support Proposal for this Project</span>
                  </div>

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
                        placeholder="Detail the exact hardware units, software licenses, compute credits, grant funding, or technical hours your organization will commit..."
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
                        placeholder="Explain why your lab or company is uniquely equipped to deliver this support (certified hardware, previous civic deployments, etc.)..."
                        value={capabilitiesSummary}
                        onChange={(e) => setCapabilitiesSummary(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">
                          Estimated Commercial Valuation (₹ INR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 250000"
                          value={estimatedValue}
                          onChange={(e) => setEstimatedValue(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">
                          Proposed Delivery Timeline
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Within 14 days of partnership agreement"
                          value={timeline}
                          onChange={(e) => setTimeline(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground">
                        Terms, Conditions or Scope Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Requires anonymized validation report; Includes 1-year telemetry support"
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
                      onClick={() => setApplyModalOpen(false)}
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
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

