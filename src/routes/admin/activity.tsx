import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock,
  RotateCcw,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatAdminDateTime, getAdminIssueStatusTone } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ActivityRow = {
  id: string;
  issue_id: string;
  old_status: Database["public"]["Enums"]["issue_status"] | null;
  new_status: Database["public"]["Enums"]["issue_status"];
  changed_by_profile_id: string;
  notes: string | null;
  created_at: string;
  issue?: {
    id: string;
    title: string;
    category: string;
    priority: string;
  } | null;
  changed_by_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    employee_id: string | null;
    role?: { code: string; name: string } | null;
  } | null;
};

export function AdminActivityPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    let cancelled = false;

    async function loadActivityLog() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("issue_status_history")
        .select(
          `
          id,
          issue_id,
          old_status,
          new_status,
          changed_by_profile_id,
          notes,
          created_at,
          issue:issues!issue_status_history_issue_id_fkey(id, title, category, priority),
          changed_by_profile:profiles!issue_status_history_changed_by_profile_id_fkey(
            id,
            full_name,
            email,
            employee_id,
            role:roles!profiles_role_id_fkey(code, name)
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (loadError) {
        if (import.meta.env.DEV) console.error("Admin activity load failed", loadError);
        setError("Unable to load system activity log.");
        setLoading(false);
        return;
      }

      setActivities(data ?? []);
      setLoading(false);
    }

    void loadActivityLog();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return activities.filter((act) => {
      if (statusFilter !== "all" && act.new_status !== statusFilter) {
        return false;
      }

      if (query) {
        const title = act.issue?.title?.toLowerCase() || "";
        const actor = act.changed_by_profile?.full_name?.toLowerCase() || "";
        const email = act.changed_by_profile?.email?.toLowerCase() || "";
        const empId = act.changed_by_profile?.employee_id?.toLowerCase() || "";
        const notes = act.notes?.toLowerCase() || "";
        const issueId = act.issue_id.toLowerCase();

        if (
          !title.includes(query) &&
          !actor.includes(query) &&
          !email.includes(query) &&
          !empId.includes(query) &&
          !notes.includes(query) &&
          !issueId.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [activities, searchQuery, statusFilter]);

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Activity Log Unavailable"
        description={sessionProblem ?? error ?? "We could not load system audit records."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        tag="System Audit & Governance"
        title="Command Center Activity Feed"
        description="Immutable system-wide audit trail of issue transitions, worker dispatches, and manager approvals."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshNonce((v) => v + 1)}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Refresh Audit Feed
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="rounded-2xl border border-teal-200/80 bg-white/80 px-3.5 py-2 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800">Total Audit Events</span>
            <p className="text-xl font-bold text-teal-900 mt-0.5">{activities.length}</p>
          </div>
          <div className="rounded-2xl border border-sky-200/80 bg-white/80 px-3.5 py-2 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-sky-800">Filtered Events</span>
            <p className="text-xl font-bold text-sky-900 mt-0.5">{filteredActivities.length}</p>
          </div>
        </div>
      </PageHeader>

      {/* 2. Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border/70 bg-background py-2 pl-10 pr-3.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary/50"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity by actor, issue title, employee ID, notes..."
            value={searchQuery}
          />
        </div>

        <select
          className="rounded-xl border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary/50 w-full sm:w-auto"
          onChange={(e) => setStatusFilter(e.target.value)}
          value={statusFilter}
        >
          <option value="all">All Transition Types</option>
          <option value="ASSIGNED">Assigned to Department</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="UNDER_REVIEW">Submitted / Under Review</option>
          <option value="PARTIALLY_COMPLETED">Partially Completed</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rework Requested</option>
          <option value="REOPENED">Reopened</option>
        </select>
      </div>

      {/* 3. Activity Feed List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card className="p-8 text-center rounded-3xl border border-dashed border-border/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-foreground">No activity records found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or transition filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => {
            const actor = act.changed_by_profile;
            const issue = act.issue;

            return (
              <Card
                key={act.id}
                className="p-4 rounded-2xl border border-border/80 bg-surface/95 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xs">
                    {actor?.full_name ? actor.full_name[0].toUpperCase() : "A"}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground text-xs sm:text-sm">
                        {actor?.full_name || actor?.email || "System Actor"}
                      </span>
                      {actor?.role && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                          {actor.role.name}
                        </span>
                      )}
                      {actor?.employee_id && (
                        <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
                          {actor.employee_id}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {act.notes || `Transitioned status to ${act.new_status}`}
                    </p>

                    {issue && (
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5 pt-0.5">
                        <span className="text-muted-foreground font-mono">#{act.issue_id.slice(0, 8).toUpperCase()}:</span>
                        <span className="truncate">{issue.title}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <Badge variant={getAdminIssueStatusTone(act.new_status)} size="sm">
                    {act.new_status}
                  </Badge>

                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatAdminDateTime(act.created_at)}
                  </span>

                  <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-teal-800 hover:text-teal-950 font-semibold -mr-1">
                    <Link to={`/app/admin/issues/${act.issue_id}`}>
                      View Issue →
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
