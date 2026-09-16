import React from "react";
import { Filter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PILOT_ENVIRONMENT_META,
  PILOT_STATUS_META,
  type PilotEnvironmentType,
  type PilotPlanStatus,
} from "@/lib/pilot-planning";

interface PilotFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  environmentFilter: string;
  onEnvironmentChange: (env: string) => void;
  onReset: () => void;
}

export function PilotFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  environmentFilter,
  onEnvironmentChange,
  onReset,
}: PilotFiltersProps) {
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    environmentFilter !== "ALL";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border/60 shadow-xs">
      <div className="flex-1 relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by pilot title, university, project, or problem..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          className={cn(
            "w-full h-8 pl-8 pr-8 rounded-md border border-input bg-background text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="ALL">All Pilots & Statuses</option>
          <option value="PILOT_ACTIVE">⚡ Active Pilots (Executing)</option>
          <option value="VALIDATION">🔍 In Validation (Results Submitted)</option>
          <option value="PILOT_READY">🚀 Pilot Ready (Approved)</option>
          <option value="NEEDS_REVIEW">⏳ Awaiting Review (Submitted / Resubmitted)</option>
          <option value="REQUESTED_REVISION">⚠️ Revision Requested</option>
          <option value="APPROVED">✅ Approved</option>
          <option value="DRAFT">📝 Draft</option>
        </select>

        <select
          value={environmentFilter}
          onChange={(e) => onEnvironmentChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="ALL">All Testbeds</option>
          {Object.entries(PILOT_ENVIRONMENT_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
