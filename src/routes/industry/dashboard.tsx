import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Handshake,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLICATION_STATUS_META,
  fetchIndustryDashboardData,
  ORGANIZATION_TYPE_META,
  SUPPORT_CATEGORY_META,
  type IndustryApplicationItem,
  type IndustryAttentionItem,
  type IndustryDashboardData,
  type IndustryPartnershipItem,
  type PublicMarketplaceListing,
} from "@/lib/marketplace";
import type { SupportRequestCategory } from "@/types/database";

// Helper for Category Icons
function getCategoryIcon(category: SupportRequestCategory) {
  switch (category) {
    case "FUNDING":
      return <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "HARDWARE":
      return <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case "TECHNOLOGY":
      return <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case "EXPERTISE":
      return <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "INFRASTRUCTURE":
      return <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "DATA":
      return <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    case "MANUFACTURING":
      return <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    default:
      return <Layers className="w-4 h-4 text-muted-foreground" />;
  }
}

// Helper for Urgency Styles
function getUrgencyBadgeTone(urgency: IndustryAttentionItem["urgency"]) {
  switch (urgency) {
    case "CRITICAL":
      return "danger";
    case "HIGH":
      return "amber";
    case "MEDIUM":
      return "info";
    default:
      return "outline";
  }
}

export function IndustryDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAppSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [dashboardData, setDashboardData] = useState<IndustryDashboardData | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Attention filter
  const [attentionFilter, setAttentionFilter] = useState<string>("ALL");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchIndustryDashboardData(profile);
        if (cancelled) return;
        setDashboardData(data);
        setLastRefreshed(new Date().toLocaleTimeString());
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load industry dashboard data:", err);
          setError(err instanceof Error ? err.message : "Failed to load partner dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [profile, refreshNonce]);

  // Attention item filtering
  const attentionItems = dashboardData?.attentionItems ?? [];
  const filteredAttentionItems = attentionItems.filter((item) => {
    if (attentionFilter === "ALL") return true;
    if (attentionFilter === "ACCEPTED") return item.category === "APPLICATION_DECISION";
    if (attentionFilter === "UPDATES") return item.category === "APPLICATION_UPDATE";
    if (attentionFilter === "OPPORTUNITIES") return item.category === "OPPORTUNITY_MATCH";
    return true;
  });

  const organization = dashboardData?.organization;
  const metrics = dashboardData?.metrics;
  const openListings: PublicMarketplaceListing[] = dashboardData?.openListings ?? [];
  const myApplications: IndustryApplicationItem[] = dashboardData?.myApplications ?? [];
  const myPartnerships: IndustryPartnershipItem[] = dashboardData?.myPartnerships ?? [];
  const recentActivity = dashboardData?.recentActivity ?? [];

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* ========================================================================= */}
      {/* SECTION A: HEADER & ORGANIZATION CONTEXT                                 */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Operations Center Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
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
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="text-xs h-8.5 gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => { void navigate("/app/industry/marketplace"); }}
              className="text-xs gap-1.5 h-8.5 shadow-xs font-semibold"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Browse Marketplace</span>
            </Button>
          </div>
        </div>

        {/* Header Title & Context */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-card via-card to-muted/40 border border-border shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {organization ? organization.name : "Industry Partner Portal"}
                </h1>
                {organization?.sector && (
                  <Badge variant="outline" className="text-xs bg-muted/60 font-medium">
                    {organization.sector}
                  </Badge>
                )}
                {organization?.organization_type && (
                  <Badge variant="outline" className="text-xs text-muted-foreground font-mono">
                    {ORGANIZATION_TYPE_META[organization.organization_type]?.label ?? organization.organization_type}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Discover civic innovation opportunities, contribute technology and expertise to university research, and track the active projects your organization supports.
              </p>
            </div>

            {/* Header Mini Context Card */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-background/80 backdrop-blur-xs border border-border shrink-0">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {organization ? "Partner Organization" : "Guest Partner"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {organization?.contact_email ?? profile?.email ?? "Role: Industry Contributor"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-danger/30 bg-danger/5 text-danger p-4 text-xs font-semibold">
          {error}
        </Card>
      )}

      {/* Unlinked Organization Notice */}
      {!organization && !loading && (
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-500/5 shadow-xs">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Organization Profile Not Linked</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your account is not yet formally associated with a verified industry organization. You can browse public opportunities freely, but submitting support offers requires an organization profile.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { void navigate("/app/industry/marketplace"); }}
              className="text-xs shrink-0"
            >
              Browse Open Listings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: NEEDS YOUR ATTENTION (THE ATTENTION CENTER)                    */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* 4 Headline Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card hover:border-primary/40 transition shadow-2xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold tracking-wide uppercase">Open Opportunities</span>
                <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {loading ? "..." : metrics?.totalOpenOpportunities ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">listings</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                Active research support requests
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/40 transition shadow-2xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold tracking-wide uppercase">Submitted Applications</span>
                <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {loading ? "..." : metrics?.myApplicationsCount ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">total offers</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {metrics?.myPendingCount ?? 0} currently under evaluation
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/40 transition shadow-2xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold tracking-wide uppercase">Active Contributions</span>
                <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {loading ? "..." : metrics?.activePartnershipsCount ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">projects</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                Supported university teams
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/40 transition shadow-2xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold tracking-wide uppercase">Accepted Offers</span>
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {loading ? "..." : metrics?.myAcceptedCount ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">accepted</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                Formal partnerships formed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Priority Action Queue */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <CardTitle className="text-base font-bold text-foreground">
                    Needs Your Attention
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">
                    {filteredAttentionItems.length}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Prioritized actions, review updates, and relevant opportunities for your organization.
                </CardDescription>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={attentionFilter === "ALL" ? "default" : "outline"}
                  onClick={() => setAttentionFilter("ALL")}
                  className="text-xs h-7 px-2.5"
                >
                  All ({attentionItems.length})
                </Button>
                <Button
                  size="sm"
                  variant={attentionFilter === "ACCEPTED" ? "default" : "outline"}
                  onClick={() => setAttentionFilter("ACCEPTED")}
                  className="text-xs h-7 px-2.5"
                >
                  Accepted Offers
                </Button>
                <Button
                  size="sm"
                  variant={attentionFilter === "UPDATES" ? "default" : "outline"}
                  onClick={() => setAttentionFilter("UPDATES")}
                  className="text-xs h-7 px-2.5"
                >
                  In Review
                </Button>
                <Button
                  size="sm"
                  variant={attentionFilter === "OPPORTUNITIES" ? "default" : "outline"}
                  onClick={() => setAttentionFilter("OPPORTUNITIES")}
                  className="text-xs h-7 px-2.5"
                >
                  Matches
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading attention items...
              </div>
            ) : filteredAttentionItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-foreground">No Pending Action Items</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  All your applications and active partnerships are operating normally.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAttentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getUrgencyBadgeTone(item.urgency)} className="text-[10px] font-bold">
                          {item.badgeLabel}
                        </Badge>
                        {item.urgency === "CRITICAL" && (
                          <Badge variant="danger" className="text-[9px] font-bold uppercase">
                            Urgent
                          </Badge>
                        )}
                        {item.elapsedTime && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {item.elapsedTime}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 pt-1 md:pt-0">
                      <Button
                        size="sm"
                        onClick={() => { void navigate(item.actionUrl); }}
                        className="text-xs h-8 gap-1 font-semibold"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: OPPORTUNITY SNAPSHOT & CATEGORY BREAKDOWN                     */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Civic Research Opportunities Snapshot
            </h2>
            <p className="text-xs text-muted-foreground">
              Open support demands published by university research teams tackling complex civic challenges.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void navigate("/app/industry/marketplace"); }}
            className="text-xs gap-1.5 h-8 font-semibold shrink-0"
          >
            <span>View All ({openListings.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Support Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {(Object.keys(SUPPORT_CATEGORY_META) as SupportRequestCategory[]).map((cat) => {
            const meta = SUPPORT_CATEGORY_META[cat];
            const count = metrics?.byCategory[cat] ?? 0;
            return (
              <div
                key={cat}
                onClick={() => { void navigate(`/app/industry/marketplace?category=${cat}`); }}
                className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition flex flex-col justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-md bg-muted/60">
                    {getCategoryIcon(cat)}
                  </div>
                  <Badge variant={count > 0 ? "outline" : "outline"} className="text-[10px] font-bold">
                    {count}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground leading-tight truncate">
                    {meta.label.split("&")[0].trim()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {count === 1 ? "1 request" : `${count} requests`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Opportunity Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl border border-border bg-card/60 animate-pulse" />
            ))
          ) : openListings.length === 0 ? (
            <div className="col-span-full py-10 text-center border border-dashed border-border rounded-xl space-y-2">
              <Store className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs font-bold text-foreground">No Open Support Listings Currently</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                New support demands from university research teams will appear here once published.
              </p>
            </div>
          ) : (
            openListings.slice(0, 3).map((listing) => (
              <Card
                key={listing.id}
                className="border-border bg-card hover:border-primary/50 transition flex flex-col justify-between shadow-2xs"
              >
                <CardHeader className="p-4.5 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold gap-1">
                      {getCategoryIcon(listing.category)}
                      <span>{SUPPORT_CATEGORY_META[listing.category]?.label ?? listing.category}</span>
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {listing.institution_city ?? "Regional"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {listing.public_title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      Challenge: {listing.challenge_title}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-4.5 pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {listing.public_summary || listing.public_specification || "University research team is seeking verified industry collaboration."}
                  </p>

                  <div className="pt-2 border-t border-border/80 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-foreground truncate max-w-[140px]">
                      {listing.institution_name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { void navigate(`/app/industry/marketplace/${listing.id}`); }}
                      className="text-xs h-7.5 gap-1 font-semibold"
                    >
                      <span>Explore</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION D & E: MY APPLICATIONS & ACTIVE CONTRIBUTIONS                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section D: My Applications */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-border/80 flex flex-row items-center justify-between gap-2">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  My Submitted Applications
                </CardTitle>
                <CardDescription className="text-xs">
                  Proposals submitted by your organization to university research demands.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void navigate("/app/industry/applications"); }}
                className="text-xs h-7.5"
              >
                View All ({myApplications.length})
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {loading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Loading applications...</div>
              ) : myApplications.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <FileText className="w-7 h-7 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-bold text-foreground">No Applications Submitted Yet</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Browse active marketplace listings and submit support proposals to collaborate with research teams.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => { void navigate("/app/industry/marketplace"); }}
                    className="text-xs mt-2"
                  >
                    Browse Opportunities
                  </Button>
                </div>
              ) : (
                myApplications.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          app.status === "ACCEPTED"
                            ? "success"
                            : app.status === "REJECTED"
                            ? "danger"
                            : "outline"
                        }
                        className="text-[10px] font-bold"
                      >
                        {APPLICATION_STATUS_META[app.status]?.label ?? app.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">
                        {app.listing?.public_title ?? "Research Support Proposal"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {app.listing?.institution?.name ?? "University Team"}
                      </p>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {app.proposed_contribution || app.capabilities_summary}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </div>

          <div className="p-4 border-t border-border/80 bg-muted/20 rounded-b-xl flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {metrics?.myPendingCount ?? 0} awaiting review • {metrics?.myAcceptedCount ?? 0} accepted
            </span>
            <Link
              to="/app/industry/applications"
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <span>Manage Applications</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Section E: Active Contributions & Supported Projects */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-border/80 flex flex-row items-center justify-between gap-2">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Active Contributions (Supported Projects)
                </CardTitle>
                <CardDescription className="text-xs">
                  Projects where your organization is a confirmed supporting partner.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void navigate("/app/industry/applications?tab=partnerships"); }}
                className="text-xs h-7.5"
              >
                View All ({myPartnerships.length})
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {loading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Loading contributions...</div>
              ) : myPartnerships.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Building2 className="w-7 h-7 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-bold text-foreground">No Active Supported Projects</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    When university research teams accept your support proposals, your formal collaboration partnerships will appear here.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { void navigate("/app/industry/marketplace"); }}
                    className="text-xs mt-2"
                  >
                    Discover Opportunities
                  </Button>
                </div>
              ) : (
                myPartnerships.slice(0, 4).map((part) => (
                  <div
                    key={part.id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="success" className="text-[10px] font-bold">
                        Supporting Partner
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {part.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                        {part.project?.project_title ?? part.project?.title ?? "Civic Research Prototype"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        University: {part.project?.institution?.name ?? "Partner Institution"}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {part.contribution_summary || part.notes || "Active technical, hardware, or resource support provided to research team."}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </div>

          <div className="p-4 border-t border-border/80 bg-muted/20 rounded-b-xl flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {metrics?.activePartnershipsCount ?? 0} active institutional engagements
            </span>
            <Link
              to="/app/industry/applications?tab=partnerships"
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Partnerships</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION F & G: CAPABILITY PROFILE & RECENT OPERATIONS ACTIVITY            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section F: Capability & Organization Profile Summary (1 Column) */}
        <Card className="border-border bg-card shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-border/80">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Organization Profile
              </CardTitle>
              <CardDescription className="text-xs">
                Registration details and verified capability alignment.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              {organization ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Legal Name
                    </span>
                    <p className="text-xs font-bold text-foreground">
                      {organization.legal_name || organization.name}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Sector / Industry
                    </span>
                    <p className="text-xs text-foreground font-medium">
                      {organization.sector || "Civic Technology & Industry"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Primary Contact
                    </span>
                    <p className="text-xs text-foreground">
                      {organization.contact_person ?? "Authorized Representative"}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {organization.contact_email}
                    </p>
                  </div>

                  {organization.address && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Address
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {organization.address}
                      </p>
                    </div>
                  )}

                  {organization.website_url && (
                    <div className="pt-1">
                      <a
                        href={organization.website_url.startsWith("http") ? organization.website_url : `https://${organization.website_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Visit Website</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
                  <ShieldAlert className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="font-semibold text-foreground">No Profile Linked</p>
                  <p className="text-[11px]">
                    Contact municipal innovation administrators to associate your account with an industry organization.
                  </p>
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-4 border-t border-border/80 bg-muted/20 rounded-b-xl text-[11px] text-muted-foreground">
            Role: <strong className="text-foreground">Contributor</strong> • Authority: University & Municipal Governance
          </div>
        </Card>

        {/* Section G: Recent Marketplace Activity Stream (2 Columns) */}
        <Card className="border-border bg-card shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-border/80 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Recent Operations Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Chronological audit feed of marketplace opportunities, application submissions, and partner engagements.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading activity...</div>
              ) : recentActivity.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No recent marketplace activity recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={act.badgeTone} className="text-[9px] font-bold">
                            {act.type.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {act.relativeTime}
                          </span>
                        </div>
                        <h4 className="font-bold text-foreground">
                          {act.title}
                        </h4>
                        <p className="text-muted-foreground line-clamp-1">
                          {act.description}
                        </p>
                      </div>

                      {act.linkUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { void navigate(act.linkUrl!); }}
                          className="text-xs h-7 px-2 shrink-0 gap-1 text-primary hover:text-primary"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-3.5 border-t border-border/80 bg-muted/20 rounded-b-xl flex items-center justify-between text-xs text-muted-foreground">
            <span>Real-time platform activity log</span>
            <Link to="/app/industry/marketplace" className="text-primary hover:underline font-semibold flex items-center gap-1">
              <span>Explore Marketplace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION H: QUICK ACTIONS & NAVIGATION DOCK                                */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Quick Navigation Dock
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            onClick={() => { void navigate("/app/industry/marketplace"); }}
            className="border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition p-4 shadow-2xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Store className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Civic Marketplace</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore open funding, hardware, and tech demands from research teams.
            </p>
          </Card>

          <Card
            onClick={() => { void navigate("/app/industry/applications"); }}
            className="border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition p-4 shadow-2xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Send className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition" />
            </div>
            <h4 className="text-sm font-bold text-foreground">My Applications</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track candidate offers, review notes, and university decisions.
            </p>
          </Card>

          <Card
            onClick={() => { void navigate("/app/industry/applications?tab=partnerships"); }}
            className="border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition p-4 shadow-2xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Handshake className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Active Partnerships</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              View active collaborative projects and deliverable requirements.
            </p>
          </Card>

          <Card
            onClick={() => { void navigate("/app/industry/marketplace"); }}
            className="border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition p-4 shadow-2xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Innovation Challenges</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse complex civic challenges and discover collaborative innovation.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
