import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  Building,
  Building2,
  CheckCircle2,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  Leaf,
  List,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { InstitutionProfileDialog } from "@/components/institutions/institution-profile-dialog";
import {
  fetchInstitutionsWithEngagements,
  fetchInstitutionStats,
  getVerificationStatusBadge,
  type InstitutionStats,
  type InstitutionWithEngagement,
} from "@/lib/institutions";
import type { InstitutionVerificationStatus } from "@/types/database";

// Visual helpers for institution types
function getInstitutionTypeVisual(type: string) {
  const normalized = (type || "").toLowerCase();
  if (normalized.includes("iit") || normalized.includes("technology") || normalized.includes("nit")) {
    return {
      label: type,
      badgeClass: "bg-teal-50 text-teal-900 border-teal-300 font-bold",
      icon: GraduationCap,
      category: "IIT_NIT",
    };
  }
  if (normalized.includes("research") || normalized.includes("csir") || normalized.includes("drdo") || normalized.includes("icmr") || normalized.includes("icar")) {
    return {
      label: type,
      badgeClass: "bg-teal-50 text-teal-900 border-teal-300 font-bold",
      icon: FlaskConical,
      category: "RESEARCH",
    };
  }
  if (normalized.includes("agriculture") || normalized.includes("farming")) {
    return {
      label: type,
      badgeClass: "bg-teal-50 text-teal-900 border-teal-300 font-bold",
      icon: Leaf,
      category: "AGRICULTURE",
    };
  }
  return {
    label: type,
    badgeClass: "bg-teal-50 text-teal-900 border-teal-300 font-bold",
    icon: Building2,
    category: "UNIVERSITIES",
  };
}

function getInitials(name: string, acronym?: string | null): string {
  if (acronym && acronym.length >= 2 && acronym.length <= 5) return acronym;
  const parts = name.replace(/Indian Institute of Technology/i, "IIT")
    .replace(/National Institute of Technology/i, "NIT")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

type QuickCategoryFilter = "ALL" | "ENGAGED" | "IIT_NIT" | "RESEARCH" | "UNIVERSITIES" | "AGRICULTURE";

export function InnovationInstitutionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedInstitutionParam = searchParams.get("selected");

  const [institutions, setInstitutions] = useState<InstitutionWithEngagement[]>([]);
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

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<QuickCategoryFilter>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<InstitutionVerificationStatus | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Detail Dialog State
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const activeInstitutionId = selectedInstitutionParam || localSelectedId;

  const handleOpenProfile = (id: string) => {
    setLocalSelectedId(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("selected", id);
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseProfile = () => {
    setLocalSelectedId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("selected");
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [insts, st] = await Promise.all([
          fetchInstitutionsWithEngagements({
            search: search.trim() || undefined,
            type: selectedType !== "ALL" ? selectedType : undefined,
            state: selectedState !== "ALL" ? selectedState : undefined,
            verificationStatus: selectedStatus !== "ALL" ? selectedStatus : undefined,
            engagedOnly: categoryFilter === "ENGAGED",
          }),
          fetchInstitutionStats(),
        ]);
        if (cancelled) return;
        setInstitutions(insts);
        setStats(st);
      } catch (err) {
        console.error("Failed to load institution registry:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedType, selectedState, selectedStatus, categoryFilter, refreshNonce, search]);

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

  // Filter institutions locally based on categoryFilter
  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      if (categoryFilter === "ENGAGED") {
        return (
          inst.selectedChallengesCount > 0 ||
          inst.invitationsCount > 0 ||
          inst.activeProjectsCount > 0 ||
          inst.proposalsCount > 0
        );
      }
      if (categoryFilter === "IIT_NIT") {
        const visual = getInstitutionTypeVisual(inst.institution_type);
        return visual.category === "IIT_NIT";
      }
      if (categoryFilter === "RESEARCH") {
        const visual = getInstitutionTypeVisual(inst.institution_type);
        return visual.category === "RESEARCH";
      }
      if (categoryFilter === "UNIVERSITIES") {
        const visual = getInstitutionTypeVisual(inst.institution_type);
        return visual.category === "UNIVERSITIES";
      }
      if (categoryFilter === "AGRICULTURE") {
        const visual = getInstitutionTypeVisual(inst.institution_type);
        return visual.category === "AGRICULTURE";
      }
      return true;
    });
  }, [institutions, categoryFilter]);

  const engagedCount = useMemo(() => {
    return institutions.filter(
      (i) => i.selectedChallengesCount > 0 || i.invitationsCount > 0 || i.activeProjectsCount > 0
    ).length;
  }, [institutions]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    categoryFilter !== "ALL" ||
    selectedType !== "ALL" ||
    selectedState !== "ALL" ||
    selectedStatus !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("ALL");
    setSelectedType("ALL");
    setSelectedState("ALL");
    setSelectedStatus("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Page Header matching CivicFix design system */}
      <PageHeader
        tag="Institution Registry"
        title="Institution Registry & Capability Intelligence"
        description="Explore accredited universities, national research laboratories, and institutional partners collaborating on complex civic challenges."
        backHref="/app/innovation"
        backLabel="Innovation Hub"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshNonce((n) => n + 1)}
            disabled={loading}
            className="gap-1.5 border-border text-foreground hover:bg-surface-elevated"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Data</span>
          </Button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total */}
        <Card
          onClick={() => setCategoryFilter("ALL")}
          className={`cursor-pointer transition-all duration-150 border rounded-2xl bg-card shadow-xs hover:border-primary hover:shadow-md ${
            categoryFilter === "ALL" ? "border-primary ring-2 ring-primary/25 bg-teal-50/40" : "border-border hover:bg-slate-50/60"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Total
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            <p className="mt-1 text-xs font-semibold text-slate-600">Accredited Centers</p>
          </CardContent>
        </Card>

        {/* Verified */}
        <Card
          onClick={() => setSelectedStatus((s) => (s === "VERIFIED" ? "ALL" : "VERIFIED"))}
          className={`cursor-pointer transition-all duration-150 border rounded-2xl bg-card shadow-xs hover:border-emerald-600 hover:shadow-md ${
            selectedStatus === "VERIFIED" ? "border-emerald-600 ring-2 ring-emerald-500/25 bg-emerald-50/40" : "border-border hover:bg-slate-50/60"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Verified
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.verified}</div>
            <p className="mt-1 text-xs font-semibold text-slate-600">Govt Validated</p>
          </CardContent>
        </Card>

        {/* Active Partner */}
        <Card
          onClick={() => setCategoryFilter((c) => (c === "ENGAGED" ? "ALL" : "ENGAGED"))}
          className={`cursor-pointer transition-all duration-150 border rounded-2xl bg-card shadow-xs hover:border-purple-600 hover:shadow-md ${
            categoryFilter === "ENGAGED" ? "border-purple-600 ring-2 ring-purple-500/25 bg-purple-50/40" : "border-border hover:bg-slate-50/60"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Partner
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{engagedCount}</div>
            <p className="mt-1 text-xs font-semibold text-slate-600">In Civic Challenges</p>
          </CardContent>
        </Card>

        {/* IITs & NITs */}
        <Card
          onClick={() => setCategoryFilter((c) => (c === "IIT_NIT" ? "ALL" : "IIT_NIT"))}
          className={`cursor-pointer transition-all duration-150 border rounded-2xl bg-card shadow-xs hover:border-sky-600 hover:shadow-md ${
            categoryFilter === "IIT_NIT" ? "border-sky-600 ring-2 ring-sky-500/25 bg-sky-50/40" : "border-border hover:bg-slate-50/60"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
              IITs &amp; NITs
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.iits + stats.nits}</div>
            <p className="mt-1 text-xs font-semibold text-slate-600">Premier Institutes</p>
          </CardContent>
        </Card>

        {/* Research Labs */}
        <Card
          onClick={() => setCategoryFilter((c) => (c === "RESEARCH" ? "ALL" : "RESEARCH"))}
          className={`cursor-pointer transition-all duration-150 border rounded-2xl bg-card shadow-xs hover:border-teal-600 hover:shadow-md ${
            categoryFilter === "RESEARCH" ? "border-teal-600 ring-2 ring-teal-500/25 bg-teal-50/40" : "border-border hover:bg-slate-50/60"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Research Labs
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
              <FlaskConical className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.researchLabs}</div>
            <p className="mt-1 text-xs font-semibold text-slate-600">CSIR / DRDO Labs</p>
          </CardContent>
        </Card>

        {/* Universities */}
        <Card
          onClick={() => setCategoryFilter((c) => (c === "UNIVERSITIES" ? "ALL" : "UNIVERSITIES"))}
          className={`cursor-pointer transition-all duration-150 border rounded-2xl bg-card shadow-xs hover:border-amber-600 hover:shadow-md ${
            categoryFilter === "UNIVERSITIES" ? "border-amber-600 ring-2 ring-amber-500/25 bg-amber-50/40" : "border-border hover:bg-slate-50/60"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Universities
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats.universities + stats.agriculture}</div>
            <p className="mt-1 text-xs font-semibold text-slate-600">Central, State &amp; Agri</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Multi-Filter Bar */}
      <Card className="border border-border bg-card rounded-2xl shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by institution name, acronym, state, city, domains, or technologies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters:</span>
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All States</option>
                {availableStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Verification Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as InstitutionVerificationStatus | "ALL")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Verification</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
              </select>

              {/* View Toggle */}
              <div className="ml-auto flex items-center rounded-xl border border-slate-300 bg-slate-100 p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg p-1.5 text-xs font-semibold transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-lg p-1.5 text-xs font-semibold transition-all ${
                    viewMode === "table"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 shadow-2xs ${
                categoryFilter === "ALL"
                  ? "bg-primary text-white border border-primary ring-1 ring-primary/30"
                  : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300"
              }`}
            >
              <span>All Institutions</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                categoryFilter === "ALL" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("ENGAGED")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 shadow-2xs ${
                categoryFilter === "ENGAGED"
                  ? "bg-primary text-white border border-primary ring-1 ring-primary/30"
                  : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Active in CivicFix</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                categoryFilter === "ENGAGED" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {engagedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("IIT_NIT")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 shadow-2xs ${
                categoryFilter === "IIT_NIT"
                  ? "bg-primary text-white border border-primary ring-1 ring-primary/30"
                  : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
              <span>IITs &amp; NITs</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                categoryFilter === "IIT_NIT" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {stats.iits + stats.nits}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("RESEARCH")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 shadow-2xs ${
                categoryFilter === "RESEARCH"
                  ? "bg-primary text-white border border-primary ring-1 ring-primary/30"
                  : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
              <span>Research Labs</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                categoryFilter === "RESEARCH" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {stats.researchLabs}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("UNIVERSITIES")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 shadow-2xs ${
                categoryFilter === "UNIVERSITIES"
                  ? "bg-primary text-white border border-primary ring-1 ring-primary/30"
                  : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300"
              }`}
            >
              <Building className="w-3.5 h-3.5 text-amber-600" />
              <span>Universities</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                categoryFilter === "UNIVERSITIES" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {stats.universities}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("AGRICULTURE")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 shadow-2xs ${
                categoryFilter === "AGRICULTURE"
                  ? "bg-primary text-white border border-primary ring-1 ring-primary/30"
                  : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300"
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>Agri Universities</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                categoryFilter === "AGRICULTURE" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {stats.agriculture}
              </span>
            </button>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-700 font-medium">
                Showing <strong className="text-slate-950 font-bold">{filteredInstitutions.length}</strong> matching institutions
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs h-7 text-primary font-bold hover:underline hover:bg-primary/10"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="h-64 rounded-2xl border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : filteredInstitutions.length === 0 ? (
        <EmptyState
          title="No institutions found"
          description={
            hasActiveFilters
              ? "No accredited institutions match your current filter selection. Try clearing filters or refining search keywords."
              : "No accredited institutions are registered in CivicFix yet."
          }
          action={
            hasActiveFilters ? (
              <Button size="sm" variant="outline" onClick={clearFilters} className="text-xs font-semibold">
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "grid" ? (
        /* GRID VIEW MATCHING CIVICFIX WEBSITE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstitutions.map((inst) => {
            const initials = getInitials(inst.name, inst.acronym);
            const isEngaged =
              inst.selectedChallengesCount > 0 ||
              inst.invitationsCount > 0 ||
              inst.activeProjectsCount > 0 ||
              inst.proposalsCount > 0;
            const statusBadge = getVerificationStatusBadge(inst.verification_status);

            return (
              <Card
                key={inst.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-300 shadow-2xs">
                        {inst.institution_type}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {inst.nirf_rank && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs"
                            title={`NIRF All-India Ranking #${inst.nirf_rank}`}
                          >
                            <Award className="h-3 w-3 text-amber-700" />
                            #{inst.nirf_rank}
                          </span>
                        )}

                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 mt-3.5">
                      <div
                        className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs ring-2 ring-teal-600/20 group-hover:scale-105 transition-transform"
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-base font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                          {inst.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 font-medium truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{inst.city}, {inst.state}</span>
                          {inst.acronym && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {inst.acronym}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3.5 pb-3">
                    {/* Research Domains Chips */}
                    {inst.research_domains && inst.research_domains.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Research Domains</span>
                        <div className="flex flex-wrap gap-1.5">
                          {inst.research_domains.slice(0, 3).map((dom, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800 border border-slate-300"
                            >
                              {dom}
                            </span>
                          ))}
                          {inst.research_domains.length > 3 && (
                            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-800 font-bold border border-slate-300">
                              +{inst.research_domains.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CivicFix Engagement Strip */}
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-2.5 transition ${
                        isEngaged
                          ? "bg-emerald-50/70 border-emerald-300"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900">
                          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                          CivicFix Engagement
                        </span>
                        {isEngaged ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Active Partner
                          </span>
                        ) : (
                          <span className="text-slate-600 font-semibold text-[11px] bg-slate-200/80 px-2 py-0.5 rounded-full border border-slate-300">
                            Available for Matching
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Problems</span>
                          <span className="font-black text-slate-900 text-sm mt-0.5 block">{inst.selectedChallengesCount}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Projects</span>
                          <span className="font-black text-slate-900 text-sm mt-0.5 block">{inst.activeProjectsCount}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Proposals</span>
                          <span className="font-black text-slate-900 text-sm mt-0.5 block">{inst.proposalsCount}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Button */}
                <div className="p-4 pt-0">
                  <Button
                    size="sm"
                    onClick={() => handleOpenProfile(inst.id)}
                    className="w-full bg-primary hover:bg-teal-800 text-white font-bold text-xs h-9 shadow-xs group/btn flex items-center justify-center gap-2 rounded-xl transition"
                  >
                    <span>View Capabilities &amp; Profile</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW MATCHING CIVICFIX WEBSITE */
        <div className="rounded-2xl border border-slate-200 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Institution</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Research Domains</th>
                  <th className="py-3.5 px-4">CivicFix Engagement</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInstitutions.map((inst) => {
                  const initials = getInitials(inst.name, inst.acronym);
                  const statusBadge = getVerificationStatusBadge(inst.verification_status);

                  return (
                    <tr key={inst.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs"
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 hover:text-primary transition truncate max-w-sm">
                              {inst.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {inst.acronym && (
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {inst.acronym}
                                </span>
                              )}
                              {inst.nirf_rank && (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300">
                                  NIRF #{inst.nirf_rank}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${statusBadge.bg}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-300">
                          {inst.institution_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{inst.city}, {inst.state}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          {inst.research_domains?.slice(0, 2).map((dom, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-800 border border-slate-300"
                            >
                              {dom}
                            </span>
                          ))}
                          {inst.research_domains?.length > 2 && (
                            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-800 font-bold border border-slate-300">
                              +{inst.research_domains.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-slate-900">
                            {inst.selectedChallengesCount} <span className="text-slate-600 font-normal">Problems</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-bold text-slate-900">
                            {inst.activeProjectsCount} <span className="text-slate-600 font-normal">Projects</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-bold text-slate-900">
                            {inst.proposalsCount} <span className="text-slate-600 font-normal">Proposals</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenProfile(inst.id)}
                          className="text-xs font-bold h-8 border-primary/40 text-primary hover:bg-primary hover:text-white transition"
                        >
                          View Profile →
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REUSABLE INSTITUTION PROFILE DIALOG */}
      <InstitutionProfileDialog
        institutionId={activeInstitutionId}
        isOpen={Boolean(activeInstitutionId)}
        onClose={handleCloseProfile}
      />
    </div>
  );
}
