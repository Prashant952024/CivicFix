import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  FlaskConical,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PilotFilters } from "@/components/innovation/pilot-control-center/pilot-filters";
import { PilotReviewPanel } from "@/components/innovation/pilot-control-center/pilot-review-panel";
import { PilotSummaryCards } from "@/components/innovation/pilot-control-center/pilot-summary-cards";
import { PilotTable } from "@/components/innovation/pilot-control-center/pilot-table";
import {
  fetchInnovationManagerPilots,
  fetchPilotPlanById,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";

export function PilotControlCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pilotIdParam = searchParams.get("pilotId");

  const [pilots, setPilots] = useState<PilotPlanWithDetails[]>([]);
  const [selectedPilot, setSelectedPilot] = useState<PilotPlanWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [environmentFilter, setEnvironmentFilter] = useState("ALL");

  const loadPilots = useCallback(async (isBackground = false) => {
    try {
      if (isBackground) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await fetchInnovationManagerPilots({
        status: statusFilter,
        environment: environmentFilter,
        search: searchQuery,
      });

      setPilots(data);

      // If deep linked pilotId exists, load full pilot details
      if (pilotIdParam) {
        const found = data.find((p) => p.id === pilotIdParam);
        if (found) {
          const detailed = await fetchPilotPlanById(found.id);
          setSelectedPilot(detailed || found);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load pilots:", err);
      const msg = err instanceof Error ? err.message : "Failed to load pilot plans.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, environmentFilter, searchQuery, pilotIdParam]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (isMounted) {
        await loadPilots();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loadPilots]);

  const handleSelectPilot = async (pilot: PilotPlanWithDetails) => {
    try {
      setLoading(true);
      const detailed = await fetchPilotPlanById(pilot.id);
      setSelectedPilot(detailed || pilot);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("pilotId", pilot.id);
        return p;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load pilot plan details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReview = () => {
    setSelectedPilot(null);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("pilotId");
      return p;
    });
  };

  const handleRefreshCurrent = async () => {
    if (selectedPilot) {
      const updated = await fetchPilotPlanById(selectedPilot.id);
      setSelectedPilot(updated);
    }
    await loadPilots(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Pilot Control Center &amp; Governance
          </h1>
          <p className="text-xs text-muted-foreground">
            Monitor, evaluate, and govern real-world testing plans submitted by university research teams.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadPilots(true)}
          disabled={loading || refreshing}
          className="text-xs h-8 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {selectedPilot ? (
        <PilotReviewPanel
          pilot={selectedPilot}
          onClose={handleCloseReview}
          onRefresh={handleRefreshCurrent}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <PilotSummaryCards
            pilots={pilots}
            selectedStatus={statusFilter}
            onSelectStatus={setStatusFilter}
          />

          {/* Filter Bar */}
          <PilotFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            environmentFilter={environmentFilter}
            onEnvironmentChange={setEnvironmentFilter}
            onReset={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setEnvironmentFilter("ALL");
            }}
          />

          {/* Table Directory */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading pilot governance directory...</p>
            </div>
          ) : (
            <PilotTable
              pilots={pilots}
              onSelectPilot={(pilot) => {
                void handleSelectPilot(pilot);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
