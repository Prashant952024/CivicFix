import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Megaphone,
  RefreshCw,
  Rocket,
  Sparkles,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProblemControlCenterData } from "@/lib/innovation";

interface ProblemHeaderProps {
  problem: ProblemControlCenterData["problem"];
  challenge: ProblemControlCenterData["challenge"];
  stats: ProblemControlCenterData["stats"];
  actionRequired: ProblemControlCenterData["actionRequired"];
  matchingRunAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenRecommendationEngine: () => void;
}

export function ProblemHeader({
  problem,
  challenge,
  stats,
  actionRequired,
  matchingRunAt,
  refreshing,
  onRefresh,
  onOpenRecommendationEngine,
}: ProblemHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* 1. TOP BREADCRUMB & UTILITY ROW */}
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate("/app/innovation/problems")}
            className="h-8 px-2.5 text-xs text-primary font-bold hover:bg-primary/10 gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Complex Problems</span>
          </Button>
          <span className="text-border">|</span>
          <nav aria-label="Breadcrumb navigation" className="flex items-center gap-1.5">
            <Link to="/app/innovation" className="hover:text-primary font-medium transition-colors">
              Innovation
            </Link>
            <span>/</span>
            <Link to="/app/innovation/problems" className="hover:text-primary font-medium transition-colors">
              Complex Problems
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold max-w-[240px] sm:max-w-xs truncate">
              {problem.title}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs gap-1.5 h-8 bg-card shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* 2. CANONICAL PROBLEM HERO CARD */}
      <Card className="border-border/90 bg-card shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-teal-600 via-sky-600 to-indigo-600" />
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2.5 flex-1 min-w-0">
              {/* Category & Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-semibold bg-muted/30">
                  {problem.category}
                </Badge>
                <Badge variant="info" className="text-xs">
                  {problem.geographicScope}
                </Badge>
                <Badge className="bg-amber-100 text-amber-950 border-amber-300 font-bold text-xs">
                  COMPLEX • {stats.complexityScore}/100
                </Badge>
                {problem.complexityConfidence !== null && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                    Confidence: {Math.round(problem.complexityConfidence * 100)}%
                  </Badge>
                )}
                {challenge ? (
                  <Badge
                    className={
                      challenge.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300 text-xs font-bold"
                        : "bg-teal-100 text-teal-900 border-teal-300 text-xs font-bold"
                    }
                  >
                    Challenge {challenge.status}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                    Needs Formulation
                  </Badge>
                )}
              </div>

              {/* Problem Title */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-snug">
                {problem.title}
              </h1>

              {/* Problem ID and challenge title */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="font-mono text-[11px]">ID: {problem.id}</span>
                {challenge?.title && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <Rocket className="w-3.5 h-3.5 text-primary" />
                      <span>Formulation: {challenge.title}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* PRIMARY ACTION: RECOMMENDATION ENGINE */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {challenge ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigate(`/app/innovation/challenges/${challenge.id}`);
                    }}
                    className="text-xs font-medium gap-1.5 h-9"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View Challenge</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={onOpenRecommendationEngine}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold gap-1.5 shadow-sm h-9 px-4"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>
                      {matchingRunAt ? "Open Recommendation Engine" : "Recommendation Engine"}
                    </span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    void navigate(`/app/innovation/issues/${problem.id}`);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-sm h-9 px-4"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Formulate Challenge</span>
                </Button>
              )}
            </div>
          </div>

          {/* Quick Problem Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/70 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Administrative Classification
              </span>
              <span className="font-semibold text-foreground truncate block">
                COMPLEX (Admin Approved)
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                <span>Location &amp; City</span>
              </span>
              <span className="font-semibold text-foreground truncate block">
                {problem.addressText || problem.locationText || "Municipal Area"}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                <span>Report Origin</span>
              </span>
              <span className="font-semibold text-foreground truncate block">
                {problem.reporterName || "Citizen Report"} • {new Date(problem.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Challenge Status</span>
              </span>
              <span className="font-semibold text-foreground truncate block">
                {challenge ? challenge.status : "Pending Formulation"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. PROBLEM-LEVEL ACTION REQUIRED SUMMARY RIBBON */}
      {actionRequired.needsAction && actionRequired.proposalsAwaitingReviewList.length > 0 && (
        <div className="p-4 rounded-2xl border border-sky-300 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-background shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-sky-700" />
                <span>Actions Required on This Problem</span>
              </span>
            </div>
            <Badge className="bg-sky-600 text-white font-bold text-[10px]">
              {actionRequired.proposalsAwaitingReviewCount} Pending Review
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {actionRequired.proposalsAwaitingReviewList.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-sky-200 bg-white/95 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground truncate">
                      {item.institutionName}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      v{item.versionNumber}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Proposal awaiting evaluation
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      void navigate(`/app/innovation/proposals/${item.id}`);
                    }}
                    className="bg-primary text-primary-foreground text-xs font-bold gap-1 h-7 px-2.5"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
