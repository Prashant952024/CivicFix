import { useMemo, useState } from "react";
import {
  Building2,
  CheckSquare,
  ExternalLink,
  GraduationCap,
  RotateCcw,
  Sparkles,
  Square,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProblemControlCenterData } from "@/lib/innovation";

interface MatchingTabProps {
  matching: ProblemControlCenterData["matching"];
  challenge: ProblemControlCenterData["challenge"];
  problemId: string;
  onInspectInstitutionById: (institutionId: string) => void;
}

export function MatchingTab({
  matching,
  challenge,
  problemId,
  onInspectInstitutionById,
}: MatchingTabProps) {
  const navigate = useNavigate();

  // Selected institution IDs for bulk actions / invitation staging (unlimited selection)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    matching.topMatches.forEach((m) => {
      if (m.isSelected) initial.add(m.institutionId);
    });
    return initial;
  });

  const allMatchIds = useMemo(
    () => matching.topMatches.map((m) => m.institutionId),
    [matching.topMatches]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(allMatchIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* 1. SCREENING RUN BANNER & ACTION BAR */}
      <Card className="border-border/90 bg-gradient-to-r from-teal-50/40 via-sky-50/20 to-background shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">
                  AI Matching Engine &amp; 10-Dimensional Screening
                </h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Evaluates institutional domains, research labs, faculty publications, field deployment capabilities, and geographic alignment against this complex problem.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {challenge ? (
                <Button
                  size="sm"
                  variant="innovation"
                  onClick={() => {
                    void navigate(`/app/innovation/challenges/${challenge.id}/matching`);
                  }}
                  className="text-xs font-bold gap-1.5 shadow-xs h-9 px-3.5"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Open Full Outreach Console</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    void navigate(`/app/innovation/issues/${problemId}`);
                  }}
                  className="bg-primary text-primary-foreground text-xs font-bold gap-1.5 shadow-xs h-9"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Formulate Challenge First</span>
                </Button>
              )}
            </div>
          </div>

          {/* Screening Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/70 text-xs">
            <div>
              <span className="text-stat-label block">
                Screening Model
              </span>
              <span className="font-semibold text-foreground truncate block mt-0.5">
                {matching.modelUsed || "CivicFix 10D Multi-Vector Engine"}
              </span>
            </div>
            <div>
              <span className="text-stat-label block">
                Accredited Registry Screened
              </span>
              <span className="font-semibold text-foreground truncate block mt-0.5">
                {matching.eligibleCount} Institutions Evaluated
              </span>
            </div>
            <div>
              <span className="text-stat-label block">
                Matches Recommended
              </span>
              <span className="font-semibold text-teal-800 truncate block mt-0.5 font-bold">
                {matching.matchesCount} Qualified Institutes
              </span>
            </div>
            <div>
              <span className="text-stat-label block">
                Last Screening Date
              </span>
              <span className="font-semibold text-foreground truncate block mt-0.5">
                {matching.lastRunAt ? new Date(matching.lastRunAt).toLocaleDateString() : "Active Evaluation"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. MATCH RECOMMENDATIONS LIST */}
      {matching.topMatches.length === 0 ? (
        <EmptyState
          title="No Matching Runs Recorded"
          description="Run the AI Matching Engine to screen accredited universities and labs against this complex challenge."
          action={
            challenge ? (
              <Button
                onClick={() => {
                  void navigate(`/app/innovation/challenges/${challenge.id}/matching`);
                }}
                className="bg-primary text-primary-foreground text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run AI Matching</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Unlimited Selection Controls Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/80 shadow-xs text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSelectAll}
                  className="h-7.5 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Select All ({matching.topMatches.length})</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeselectAll}
                  className="h-7.5 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Deselect All</span>
                </Button>
              </div>

              <span className="text-border">|</span>

              <span className="font-semibold text-foreground">
                <span className="text-teal-700 font-bold">{selectedIds.size}</span> institution(s) marked for engagement
              </span>
            </div>

            {challenge && selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  void navigate(`/app/innovation/challenges/${challenge.id}/matching`);
                }}
                className="bg-primary text-primary-foreground text-xs font-bold gap-1.5 h-8 px-3.5 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Proceed to Outreach ({selectedIds.size})</span>
              </Button>
            )}
          </div>

          {/* Recommendations Cards List */}
          <div className="space-y-3">
            {matching.topMatches.map((m) => {
              const isChecked = selectedIds.has(m.institutionId);

              return (
                <Card
                  key={m.institutionId}
                  className={`border transition-all duration-150 ${
                    isChecked
                      ? "border-teal-400/90 bg-teal-50/20 shadow-xs ring-1 ring-teal-400/40"
                      : "border-border/80 bg-card hover:bg-muted/10"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    {/* Left: Checkbox, Rank, Name & Badges */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelect(m.institutionId)}
                        className="mt-0.5 text-muted-foreground hover:text-primary transition shrink-0 cursor-pointer"
                        title={isChecked ? "Deselect institution" : "Select institution"}
                        aria-label={isChecked ? `Deselect ${m.institutionName}` : `Select ${m.institutionName}`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-teal-700" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-muted-foreground text-xs">
                            #{m.rank}
                          </span>
                          <span
                            onClick={() => onInspectInstitutionById(m.institutionId)}
                            className="font-bold text-foreground text-sm hover:text-primary cursor-pointer transition truncate"
                          >
                            {m.institutionName}
                          </span>
                          {m.institutionAcronym && (
                            <Badge variant="outline" size="sm" className="font-semibold">
                              {m.institutionAcronym}
                            </Badge>
                          )}
                          {m.recommendedRole && (
                            <Badge variant="info" size="sm" className="text-[10px]">
                              {m.recommendedRole}
                            </Badge>
                          )}
                          {m.isSelected && (
                            <Badge variant="civic" size="sm" className="text-[10px] font-semibold">
                              Active Selection
                            </Badge>
                          )}
                          {m.invitationStatus && (
                            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                              Invite: {m.invitationStatus}
                            </Badge>
                          )}
                        </div>

                        {/* Top Strengths */}
                        {m.topStrengths && m.topStrengths.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              Strengths:
                            </span>
                            {m.topStrengths.map((str, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-0.5 rounded-md bg-muted/50 border border-border/70 text-[10px] text-foreground font-medium"
                              >
                                {str}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Scores & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                      {/* Overall Match Score */}
                      <div className="text-center md:text-right">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                          Overall Match
                        </span>
                        <span className="text-base font-black text-teal-800 block">
                          {Math.round(m.overallScore * 100)}%
                        </span>
                      </div>

                      {/* Semantic Fit */}
                      <div className="text-center md:text-right">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                          Semantic Fit
                        </span>
                        <span className="text-xs font-semibold text-foreground block">
                          {Math.round(m.aiSemanticScore * 100)}%
                        </span>
                      </div>

                      {/* Inspect Profile */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onInspectInstitutionById(m.institutionId)}
                        className="h-8 px-2.5 text-xs text-primary font-bold hover:bg-primary/10 gap-1"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
