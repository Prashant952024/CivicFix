import { useState, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Image as ImageIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SimpleSolutionKnowledgeBaseRow } from "@/types/database";

interface SimpleSolutionCatalogProps {
  solutions: SimpleSolutionKnowledgeBaseRow[];
  loading?: boolean;
}

export function SimpleSolutionCatalog({
  solutions,
  loading = false,
}: SimpleSolutionCatalogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [selectedSolution, setSelectedSolution] = useState<SimpleSolutionKnowledgeBaseRow | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    solutions.forEach((s) => set.add(s.category));
    return ["ALL", ...Array.from(set).sort()];
  }, [solutions]);

  const areas = useMemo(() => {
    const set = new Set<string>();
    solutions.forEach((s) => set.add(s.area_name));
    return ["ALL", ...Array.from(set).sort()];
  }, [solutions]);

  const filteredSolutions = useMemo(() => {
    return solutions.filter((s) => {
      const matchSearch =
        !search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.resolution_summary.toLowerCase().includes(search.toLowerCase()) ||
        (s.identified_root_cause && s.identified_root_cause.toLowerCase().includes(search.toLowerCase()));

      const matchCat = selectedCategory === "ALL" || s.category === selectedCategory;
      const matchArea = selectedArea === "ALL" || s.area_name === selectedArea;

      return matchSearch && matchCat && matchArea;
    });
  }, [solutions, search, selectedCategory, selectedArea]);

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-surface-elevated/60 p-4 rounded-2xl border border-border/70">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search verified resolutions, causes, or procedures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/80 bg-surface/90 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-surface/90 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Categories" : c}
              </option>
            ))}
          </select>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-surface/90 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {areas.map((a) => (
              <option key={a} value={a}>
                {a === "ALL" ? "All Areas / Wards" : a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-border/60 bg-surface/50" />
          ))}
        </div>
      ) : filteredSolutions.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border border-dashed border-border/80">
          <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Verified Simple Solutions Found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Once simple civic issues complete citizen verification and closure, their resolution knowledge will automatically be cataloged here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSolutions.map((solution) => {
            const beforeImgs = Array.isArray(solution.before_evidence_images)
              ? (solution.before_evidence_images as any[])
              : [];
            const afterImgs = Array.isArray(solution.after_evidence_images)
              ? (solution.after_evidence_images as any[])
              : [];

            return (
              <Card
                key={solution.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-surface/90 p-4 transition-all hover:border-emerald-500/40 hover:shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      {solution.category}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-rose-500" /> {solution.area_name}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                    {solution.title}
                  </h4>

                  <div className="text-xs text-muted-foreground line-clamp-2">
                    <span className="font-semibold text-foreground">Root Cause: </span>
                    {solution.identified_root_cause || "Standard civic wear and operational degradation."}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-surface-elevated/40 p-2.5 text-xs text-foreground space-y-1">
                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Resolution Procedure:
                    </span>
                    <p className="text-muted-foreground line-clamp-2">{solution.resolution_summary}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {beforeImgs.length > 0 && <span>{beforeImgs.length} Before</span>}
                    {afterImgs.length > 0 && <span className="text-emerald-700 font-medium">{afterImgs.length} After</span>}
                  </div>

                  <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-foreground">
                    <Link to={`/app/officer/issues/${solution.source_issue_id}`}>
                      Inspect Source <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
