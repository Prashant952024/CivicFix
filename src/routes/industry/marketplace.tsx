import { useEffect, useState } from "react";
import {
  Building2,
  ExternalLink,
  Handshake,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchIndustryOrganizationProfile,
  fetchMarketplaceListings,
  ORGANIZATION_TYPE_META,
  SUPPORT_CATEGORY_META,
  type PublicMarketplaceListing,
} from "@/lib/marketplace";
import type { IndustryOrganizationRow, SupportRequestCategory } from "@/types/database";

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

export function IndustryMarketplacePage() {
  const navigate = useNavigate();
  const { profile } = useAppSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<PublicMarketplaceListing[]>([]);
  const [organization, setOrganization] = useState<IndustryOrganizationRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SupportRequestCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadListings() {
    setLoading(true);
    setError(null);
    try {
      const [data, org] = await Promise.all([
        fetchMarketplaceListings({
          category: selectedCategory,
          searchQuery,
        }),
        profile?.organization_id ? fetchIndustryOrganizationProfile(profile.organization_id) : Promise.resolve(null),
      ]);
      setListings(data);
      setOrganization(org);
    } catch (err: unknown) {
      console.error("Failed to load marketplace listings:", err);
      setError(err instanceof Error ? err.message : "Failed to load open listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function run() {
      try {
        const [data, org] = await Promise.all([
          fetchMarketplaceListings({
            category: selectedCategory,
          }),
          profile?.organization_id ? fetchIndustryOrganizationProfile(profile.organization_id) : Promise.resolve(null),
        ]);
        if (isMounted) {
          setListings(data);
          setOrganization(org);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load open listings.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, profile?.organization_id]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadListings();
  }

  const orgTypeMeta = organization
    ? ORGANIZATION_TYPE_META[organization.organization_type] ?? {
        label: organization.organization_type,
        badgeTone: "default",
      }
    : null;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Research & Innovation Marketplace"
        description="Discover civic innovation challenges from accredited universities seeking specialized hardware, compute, funding, and technical advisory."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void loadListings(); }}
            disabled={loading}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => { void navigate("/app/industry/applications"); }}
            className="text-xs h-8 gap-1.5"
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>My Applications</span>
          </Button>
        </div>
      </PageHeader>

      {/* Organization Identity Bar if authenticated */}
      {organization && (
        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">{organization.name}</span>
                {organization.verification_status === "VERIFIED" && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </div>
              <div className="text-muted-foreground text-[11px] mt-0.5">
                Organization: <strong className="text-foreground">{organization.name}</strong> • Type:{" "}
                <Badge variant={orgTypeMeta?.badgeTone} className="text-[10px] ml-1">
                  {orgTypeMeta?.label}
                </Badge>
              </div>
            </div>
          </div>

          <Badge
            variant={organization.verification_status === "VERIFIED" ? "success" : "warning"}
            className="text-xs self-start sm:self-auto"
          >
            {organization.verification_status === "VERIFIED" ? "Verified Partner" : "Pending Verification"}
          </Badge>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Controlled Disclosure Notice */}
      <Card className="border-blue-200/80 bg-blue-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-blue-100 text-blue-900 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="space-y-0.5 text-xs text-blue-950">
              <span className="font-bold block">Controlled Disclosure &amp; Verified Partnership</span>
              <p className="text-blue-900/90 leading-relaxed">
                All marketplace listings are moderated and backed by approved university research projects. Detailed proprietary methodologies, codebases, and student team internal discussions remain strictly confidential.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & Category Filter Toolbar */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by topic, university, or technology requirement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm" className="text-xs h-9">
            Search
          </Button>
        </form>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary mx-auto" />
          <p>Loading open research opportunities...</p>
        </div>
      ) : listings.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="p-12 text-center space-y-3 max-w-md mx-auto">
            <span className="p-3 rounded-xl bg-primary/10 text-primary inline-flex">
              <Store className="w-6 h-6" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">No Open Listings Found</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                There are currently no active requirements matching this category. Check back soon or select another category filter.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => {
            const catMeta = SUPPORT_CATEGORY_META[item.category];
            return (
              <Card
                key={item.id}
                className="border-border/80 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between bg-card"
              >
                <CardContent className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {/* Category & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={catMeta.badgeTone} className="text-[11px] font-semibold">
                        {catMeta.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {item.applications_count} {item.applications_count === 1 ? "applicant" : "applicants"}
                      </span>
                    </div>

                    {/* Challenge Title */}
                    <div className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1 truncate">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.challenge_title}</span>
                    </div>

                    {/* Public Title */}
                    <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                      {item.public_title}
                    </h3>

                    {/* Public Summary */}
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {item.public_summary}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-3 border-t border-border/60 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate font-medium text-foreground">
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

                    <Link to={`/app/industry/marketplace/${item.id}`} className="block">
                      <Button size="sm" className="w-full text-xs font-semibold gap-1.5">
                        <span>View Opportunity &amp; Apply</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
