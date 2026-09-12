import { useEffect, useMemo, useState } from "react";
import {
  Building,
  Building2,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchInstitutions,
  fetchInstitutionStats,
  getVerificationStatusBadge,
  type InstitutionStats,
} from "@/lib/institutions";
import type { InstitutionRow, InstitutionVerificationStatus } from "@/types/database";

export function AdminInstitutionsPage() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [stats, setStats] = useState<InstitutionStats>({
    total: 0,
    verified: 0,
    pending: 0,
    iits: 0,
    nits: 0,
    researchLabs: 0,
    universities: 0,
    agriculture: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<InstitutionVerificationStatus | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [insts, st] = await Promise.all([
          fetchInstitutions({
            search: search.trim() || undefined,
            type: selectedType !== "ALL" ? selectedType : undefined,
            state: selectedState !== "ALL" ? selectedState : undefined,
            verificationStatus: selectedStatus !== "ALL" ? selectedStatus : undefined,
          }),
          fetchInstitutionStats(),
        ]);
        if (cancelled) return;
        setInstitutions(insts);
        setStats(st);
      } catch (err) {
        console.error("Failed to load institutions:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedType, selectedState, selectedStatus, refreshNonce, search]);

  // Extract unique states & types from loaded list or defaults
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    institutions.forEach((i) => {
      if (i.state) states.add(i.state);
    });
    return Array.from(states).sort();
  }, [institutions]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    institutions.forEach((i) => {
      if (i.institution_type) types.add(i.institution_type);
    });
    return Array.from(types).sort();
  }, [institutions]);

  const filteredInstitutions = useMemo(() => {
    if (!search.trim()) return institutions;
    const term = search.toLowerCase().trim();
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(term) ||
        (inst.official_name && inst.official_name.toLowerCase().includes(term)) ||
        (inst.acronym && inst.acronym.toLowerCase().includes(term)) ||
        inst.city.toLowerCase().includes(term) ||
        inst.state.toLowerCase().includes(term) ||
        inst.research_domains.some((d) => d.toLowerCase().includes(term)) ||
        inst.technologies.some((t) => t.toLowerCase().includes(term))
    );
  }, [institutions, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        tag="Institution Registry"
        title="Institution Registry & Capability Intelligence"
        description="Manage verified universities, national laboratories, and research institutions participating in civic innovation challenges."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="border-border text-foreground hover:bg-surface-elevated"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void navigate("/app/admin/institutions/new");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Institution
            </Button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Institutions
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total || institutions.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.verified} verified & active partners
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Premier IITs & NITs
            </CardTitle>
            <Building2 className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.iits + stats.nits}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.iits} IITs · {stats.nits} NITs
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CSIR & Research Labs
            </CardTitle>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.researchLabs}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              National research organizations
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Universities & Agri
            </CardTitle>
            <Building className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.universities + stats.agriculture}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.universities} Central/State · {stats.agriculture} Agri
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border border-border/80 bg-surface/90 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by institution name, city, state, domain or technology..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setRefreshNonce((v) => v + 1);
                }}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setRefreshNonce((v) => v + 1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters:</span>
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* State Filter */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All States</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as InstitutionVerificationStatus | "ALL")}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="DRAFT">Draft</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              {/* View toggle */}
              <div className="ml-auto flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1 text-xs transition-colors ${
                    viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-md p-1 text-xs transition-colors ${
                    viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="h-64 animate-pulse border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : filteredInstitutions.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No institutions found"
          description="Try adjusting your search query, state, or category filters to find registered institutions."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedType("ALL");
                setSelectedState("ALL");
                setSelectedStatus("ALL");
                setRefreshNonce((v) => v + 1);
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInstitutions.map((institution) => {
            const statusBadge = getVerificationStatusBadge(institution.verification_status);
            return (
              <Card
                key={institution.id}
                className="group flex flex-col justify-between border border-border/80 bg-surface/90 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[11px] font-medium border-primary/20 bg-primary/5 text-primary">
                        {institution.institution_type}
                      </Badge>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      <Link to={`/app/admin/institutions/${institution.id}`}>
                        {institution.name}
                      </Link>
                    </h3>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                      <span>{institution.city}, {institution.state}</span>
                      {institution.established_year && (
                        <>
                          <span>•</span>
                          <span>Est. {institution.established_year}</span>
                        </>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3">
                    {institution.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {institution.description}
                      </p>
                    )}

                    {/* Research Domains Chips */}
                    {institution.research_domains && institution.research_domains.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-foreground/80">Research Domains:</span>
                        <div className="flex flex-wrap gap-1">
                          {institution.research_domains.slice(0, 3).map((domain, i) => (
                            <span
                              key={i}
                              className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 border border-sky-200/60"
                            >
                              {domain}
                            </span>
                          ))}
                          {institution.research_domains.length > 3 && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                              +{institution.research_domains.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technologies */}
                    {institution.technologies && institution.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {institution.technologies.slice(0, 3).map((tech, i) => (
                          <span
                            key={i}
                            className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200/60"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Infrastructure counts */}
                    <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">
                          {institution.laboratories?.length || 0}
                        </span>{" "}
                        Labs & Centers
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">
                          {institution.equipment?.length || 0}
                        </span>{" "}
                        Specialized Equip
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-4 py-2.5">
                  <Link
                    to={`/app/admin/institutions/${institution.id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View Capabilities →
                  </Link>

                  <div className="flex items-center gap-1">
                    {institution.website && (
                      <a
                        href={institution.website.startsWith("http") ? institution.website : `https://${institution.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Visit official website"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Link
                      to={`/app/admin/institutions/${institution.id}?action=provision`}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                      title="Provision coordinator account"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="border border-border/80 bg-surface/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Key Research Domains</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInstitutions.map((institution) => {
                  const statusBadge = getVerificationStatusBadge(institution.verification_status);
                  return (
                    <tr key={institution.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <Link
                          to={`/app/admin/institutions/${institution.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {institution.name}
                        </Link>
                        {institution.official_name && institution.official_name !== institution.name && (
                          <div className="text-[11px] text-muted-foreground font-normal">
                            {institution.official_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {institution.institution_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {institution.city}, {institution.state}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {institution.research_domains?.slice(0, 2).map((d, i) => (
                            <span key={i} className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700">
                              {d}
                            </span>
                          ))}
                          {(institution.research_domains?.length || 0) > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{institution.research_domains.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/app/admin/institutions/${institution.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            Details
                          </Link>
                          <Link
                            to={`/app/admin/institutions/${institution.id}?action=provision`}
                            className="font-medium text-muted-foreground hover:text-foreground"
                            title="Provision Coordinator"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
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

      {/* Footer count indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <div>
          Showing <span className="font-semibold text-foreground">{filteredInstitutions.length}</span> of{" "}
          <span className="font-semibold text-foreground">{institutions.length}</span> registered institutions
        </div>
        <div>
          Powered by CivicFix Capability Intelligence Database
        </div>
      </div>
    </div>
  );
}
