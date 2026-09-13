import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProblemControlCenterData } from "@/lib/innovation";

interface ChallengeSummarySectionProps {
  challenge: ProblemControlCenterData["challenge"];
  problemId: string;
}

export function ChallengeSummarySection({
  challenge,
  problemId,
}: ChallengeSummarySectionProps) {
  const navigate = useNavigate();

  if (!challenge) {
    return (
      <Card className="border-dashed border-amber-300 bg-amber-50/20 shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
              Formulation Required
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Challenge Not Yet Formulated
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              To screen and invite research institutions, formulate this complex problem into a structured municipal innovation challenge.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => void navigate(`/app/innovation/issues/${problemId}`)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Formulate Challenge</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/90 bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70 flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Rocket className="w-4 h-4 text-teal-600" />
              <span>Formulated Innovation Challenge: {challenge.title}</span>
            </CardTitle>
            <Badge
              className={
                challenge.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 text-xs font-bold"
                  : "bg-teal-100 text-teal-900 border-teal-300 text-xs font-bold"
              }
            >
              Status: {challenge.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Structured scope, objectives, and research requirements for academic collaboration
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => void navigate(`/app/innovation/challenges/${challenge.id}`)}
          className="text-xs font-bold gap-1.5 h-8"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>View Challenge</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Button>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4 text-xs">
        {/* Objectives */}
        {challenge.objectives && challenge.objectives.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
              <Target className="w-3 h-3 text-primary" />
              <span>Challenge Objectives</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-foreground bg-muted/20 p-3 rounded-xl border border-border/70">
              {challenge.objectives.map((obj, idx) => (
                <li key={idx} className="leading-relaxed">
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Required Domains & Success Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Required Domains */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              Required Research Domains
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {challenge.requiredDomains && challenge.requiredDomains.length > 0 ? (
                challenge.requiredDomains.map((dom, idx) => (
                  <Badge key={idx} variant="info" className="text-[9px]">
                    {dom}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">Environmental Engineering, GIS, IoT</span>
              )}
            </div>
          </div>

          {/* Success Criteria */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Target Success Criteria</span>
            </span>
            <div className="space-y-1 text-foreground">
              {challenge.successCriteria && challenge.successCriteria.length > 0 ? (
                challenge.successCriteria.map((crit, idx) => (
                  <p key={idx} className="truncate">
                    • {crit}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">
                  Empirical pilot deployment validated in designated municipal zone.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
