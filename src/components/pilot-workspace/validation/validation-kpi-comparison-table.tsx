import React from "react";
import { Target, ExternalLink, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PILOT_KPI_ACHIEVEMENT_META,
  type PilotValidationKPIResultRow,
} from "@/lib/pilot-validation";

interface ValidationKPIComparisonTableProps {
  kpis: PilotValidationKPIResultRow[];
  evidenceList?: Array<{ id: string; title: string; url?: string | null }>;
}

export function ValidationKPIComparisonTable({
  kpis,
  evidenceList = [],
}: ValidationKPIComparisonTableProps) {
  if (kpis.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs rounded-lg border border-dashed border-border/60">
        No KPI targets configured in approved pilot plan.
      </div>
    );
  }

  // Create evidence lookup map
  const evidenceMap = new Map<string, { id: string; title: string; url?: string | null }>();
  evidenceList.forEach((ev) => evidenceMap.set(ev.id, ev));

  return (
    <div className="space-y-3">
      {/* Mobile Stacked Cards (< md) */}
      <div className="block md:hidden space-y-3">
        {kpis.map((kpi) => {
          const achievementMeta =
            PILOT_KPI_ACHIEVEMENT_META[kpi.achievement_status] ||
            PILOT_KPI_ACHIEVEMENT_META.INCONCLUSIVE;
          const linkedEvIds = Array.isArray(kpi.evidence_ids) ? (kpi.evidence_ids as string[]) : [];

          return (
            <Card key={kpi.id || kpi.kpi_id} className="border-border/60 bg-card p-3.5 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{kpi.kpi_name}</span>
                  </div>
                  {kpi.unit && (
                    <span className="inline-block mt-0.5 text-[10px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.2 rounded">
                      Unit: {kpi.unit}
                    </span>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 shrink-0",
                    kpi.achievement_status === "ACHIEVED" &&
                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    kpi.achievement_status === "PARTIALLY_ACHIEVED" &&
                      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    kpi.achievement_status === "NOT_ACHIEVED" &&
                      "bg-destructive/10 text-destructive border-destructive/20",
                    kpi.achievement_status === "INCONCLUSIVE" && "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {achievementMeta.label}
                </Badge>
              </div>

              {kpi.description && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {kpi.description}
                </p>
              )}

              {/* Baseline -> Target -> Observed comparison strip */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/20 border border-border/40 text-center text-[11px]">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Baseline</span>
                  <span className="font-mono text-muted-foreground font-semibold">{kpi.baseline_value || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-primary block font-medium">Target</span>
                  <span className="font-mono text-foreground font-bold">{kpi.target_value || "—"}</span>
                </div>
                <div className="bg-primary/5 rounded p-0.5">
                  <span className="text-[10px] text-primary font-bold block">Observed</span>
                  <span className="font-mono text-primary font-bold">{kpi.observed_value || "Pending"}</span>
                </div>
              </div>

              {kpi.measurement_method && (
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Method:</span> {kpi.measurement_method}
                </div>
              )}

              {kpi.notes && (
                <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-1.5 rounded border border-border/30">
                  "{kpi.notes}"
                </p>
              )}

              {linkedEvIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                  {linkedEvIds.map((evId) => {
                    const ev = evidenceMap.get(evId);
                    if (!ev) return null;
                    return (
                      <a
                        key={evId}
                        href={ev.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
                      >
                        <Paperclip className="h-2.5 w-2.5" />
                        <span className="max-w-[140px] truncate">{ev.title}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </a>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border/60 bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4 min-w-[180px]">Approved KPI</th>
              <th className="py-3 px-3 w-[110px] text-right font-mono">Approved Baseline</th>
              <th className="py-3 px-3 w-[110px] text-right font-mono">Approved Target</th>
              <th className="py-3 px-3 w-[120px] text-right font-mono bg-muted/20">Observed Result</th>
              <th className="py-3 px-3 w-[130px] text-center">Factual Result</th>
              <th className="py-3 px-4 min-w-[200px]">Measurement Notes & Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {kpis.map((kpi) => {
              const achievementMeta =
                PILOT_KPI_ACHIEVEMENT_META[kpi.achievement_status] ||
                PILOT_KPI_ACHIEVEMENT_META.INCONCLUSIVE;

              const linkedEvIds = Array.isArray(kpi.evidence_ids) ? (kpi.evidence_ids as string[]) : [];

              return (
                <tr key={kpi.id || kpi.kpi_id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{kpi.kpi_name}</span>
                    </div>
                    {kpi.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {kpi.description}
                      </p>
                    )}
                    {kpi.unit && (
                      <span className="inline-block mt-1 text-[10px] text-muted-foreground/80 font-mono bg-muted/40 px-1.5 py-0.5 rounded">
                        Unit: {kpi.unit}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-right align-top font-mono text-muted-foreground font-medium">
                    {kpi.baseline_value || "—"}
                  </td>

                  <td className="py-3.5 px-3 text-right align-top font-mono text-foreground font-bold">
                    {kpi.target_value || "—"}
                  </td>

                  <td className="py-3.5 px-3 text-right align-top font-mono font-bold bg-muted/10 text-foreground">
                    {kpi.observed_value ? (
                      <span className="text-primary font-semibold">{kpi.observed_value}</span>
                    ) : (
                      <span className="text-muted-foreground italic font-normal text-[11px]">Pending</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center align-top">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5",
                        kpi.achievement_status === "ACHIEVED" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                        kpi.achievement_status === "PARTIALLY_ACHIEVED" &&
                          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                        kpi.achievement_status === "NOT_ACHIEVED" &&
                          "bg-destructive/10 text-destructive border-destructive/20",
                        kpi.achievement_status === "INCONCLUSIVE" && "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {achievementMeta.label}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 align-top space-y-1.5">
                    {kpi.measurement_method && (
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">Method:</span> {kpi.measurement_method}
                      </div>
                    )}
                    {kpi.measurement_period && (
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">Period:</span> {kpi.measurement_period}
                      </div>
                    )}
                    {kpi.notes && (
                      <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-1.5 rounded border border-border/30">
                        "{kpi.notes}"
                      </p>
                    )}

                    {/* Linked Evidence items */}
                    {linkedEvIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {linkedEvIds.map((evId) => {
                          const ev = evidenceMap.get(evId);
                          if (!ev) return null;
                          return (
                            <a
                              key={evId}
                              href={ev.url || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              <span className="max-w-[120px] truncate">{ev.title}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
