import { useState, useMemo } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Repeat,
  Search,
  SlidersHorizontal,
  Tag,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ComplexSolutionKnowledgeBaseRow } from "@/types/database";

interface ComplexSolutionCatalogProps {
  solutions: ComplexSolutionKnowledgeBaseRow[];
  loading?: boolean;
  onSelectSolution: (solution: ComplexSolutionKnowledgeBaseRow) => void;
}

export function ComplexSolutionCatalog({
  solutions,
  loading = false,
  onSelectSolution,
}: ComplexSolutionCatalogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedReusability, setSelectedReusability] = useState("ALL");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    solutions.forEach((s) => {
      if (s.problem_category) cats.add(s.problem_category);
    });
    return ["ALL", ...Array.from(cats).sort()];
  }, [solutions]);

  const filteredSolutions = useMemo(() => {
    return solutions.filter((s) => {
      const matchSearch =
        !search ||
        s.problem_title.toLowerCase().includes(search.toLowerCase()) ||
        s.solution_title.toLowerCase().includes(search.toLowerCase()) ||
        s.university_name.toLowerCase().includes(search.toLowerCase()) ||
        s.solution_summary.toLowerCase().includes(search.toLowerCase()) ||
        (s.technologies_used || []).some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchCat =
        selectedCategory === "ALL" || s.problem_category === selectedCategory;

      const matchReusability =
        selectedReusability === "ALL" || s.reusability_status === selectedReusability;

      return matchSearch && matchCat && matchReusability;
    });
  }, [solutions, search, selectedCategory, selectedReusability]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-surface-elevated/60 p-4 rounded-2xl border border-border/70 backdrop-blur-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by problem, solution, university, or technology..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/80 bg-surface/90 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
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
          </div>

          <select
            value={selectedReusability}
            onChange={(e) => setSelectedReusability(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-surface/90 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="ALL">All Reusability States</option>
            <option value="ACTIVE_REUSABLE">Active & Reusable</option>
            <option value="NEEDS_ADAPTATION">Needs Adaptation</option>
            <option value="ELIGIBLE">Eligible</option>
            <option value="DEPRECATED">Deprecated / Inactive</option>
          </select>
        </div>
      </div>

      {/* Solutions Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-border/60 bg-surface/50"
            />
          ))}
        </div>
      ) : filteredSolutions.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border border-dashed border-border/80">
          <BrainCircuit className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Verified Complex Solutions Found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {search || selectedCategory !== "ALL"
              ? "Try adjusting your search criteria or filters."
              : "As complex civic innovation projects achieve validation and deployment, their reusable solutions will appear here."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredSolutions.map((solution) => (
            <Card
              key={solution.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-surface/90 p-5 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/5"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300/40 font-medium">
                      {solution.problem_category}
                    </Badge>
                    {solution.reusability_status === "ACTIVE_REUSABLE" && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Reusable
                      </Badge>
                    )}
                    {solution.reusability_status === "NEEDS_ADAPTATION" && (
                      <Badge variant="warning" className="gap-1">
                        <Wrench className="h-3 w-3" /> Needs Adaptation
                      </Badge>
                    )}
                  </div>

                  {solution.reuse_count > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                      <Repeat className="h-3 w-3" /> {solution.reuse_count} Reuses
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-emerald-700 transition-colors">
                    {solution.solution_title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>{solution.university_name}</span>
                  </p>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {solution.solution_summary}
                </p>

                {/* Tech tags */}
                {solution.technologies_used && solution.technologies_used.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {solution.technologies_used.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1 rounded-lg bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground/80 border border-border/60"
                      >
                        <Tag className="h-2.5 w-2.5 text-muted-foreground" />
                        {tech}
                      </span>
                    ))}
                    {solution.technologies_used.length > 4 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{solution.technologies_used.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  Validated Outcome:{" "}
                  <span className="font-semibold text-emerald-700">
                    {solution.final_validation_outcome?.replace(/_/g, " ") || "Meets Criteria"}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectSolution(solution)}
                  className="gap-1.5 text-xs rounded-xl"
                >
                  Inspect Solution <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
