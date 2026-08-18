import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, ExternalLink, MailCheck, MailWarning } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { CitizenEmptyState } from "@/components/citizen/citizen-empty-state";
import { Button } from "@/components/ui/button";
import {
  formatCitizenIssueDateTime,
  type CitizenNotificationRow,
} from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";

type GroupKey = "today" | "earlier";

function isSameLocalDay(first: string, second: string) {
  const a = new Date(first);
  const b = new Date(second);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getNotificationGroup(createdAt: string) {
  return isSameLocalDay(createdAt, new Date().toISOString()) ? "today" : "earlier";
}

function getTypeTone(type: CitizenNotificationRow["notification_type"]) {
  switch (type) {
    case "VERIFICATION":
      return "success";
    case "ASSIGNMENT":
      return "info";
    case "SYSTEM":
      return "default";
    case "STATUS_CHANGE":
    default:
      return "warning";
  }
}

function toneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
    : tone === "warning"
      ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
      : tone === "danger"
        ? "bg-red-500/10 text-red-300 ring-red-500/20"
        : tone === "info"
          ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
          : "bg-slate-500/10 text-slate-300 ring-slate-500/20";
}

export function CitizenNotificationsPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [notifications, setNotifications] = useState<CitizenNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId) {
      return;
    }

    const currentProfileId = profileId;
    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("notifications")
        .select("id, recipient_profile_id, notification_type, title, message, related_issue_id, is_read, created_at, read_at")
        .eq("recipient_profile_id", currentProfileId)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Citizen notifications load failed", loadError);
        }
        setError("Unable to load your notifications right now.");
        setNotifications([]);
        setLoading(false);
        return;
      }

      setNotifications(data ?? []);
      setLoading(false);
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshNonce, sessionStatus]);

  const groupedNotifications = useMemo(() => {
    const today: CitizenNotificationRow[] = [];
    const earlier: CitizenNotificationRow[] = [];

    for (const notification of notifications) {
      if (getNotificationGroup(notification.created_at) === "today") {
        today.push(notification);
      } else {
        earlier.push(notification);
      }
    }

    return [
      { key: "today" as GroupKey, title: "Today", items: today },
      { key: "earlier" as GroupKey, title: "Earlier", items: earlier },
    ].filter((group) => group.items.length > 0);
  }, [notifications]);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load notifications</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-2xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-3xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[1.5rem] border border-border/80 bg-surface/90" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
        <div className="border-b border-border/70 bg-gradient-to-r from-background/30 to-background/5 px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Citizen alerts
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Notifications</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Follow verification prompts, workflow updates, and citizen-facing CivicFix messages.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-4 py-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" aria-hidden="true" />
                {notifications.length} total
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-4 py-2 text-sm text-muted-foreground">
                {unreadCount > 0 ? (
                  <MailWarning className="h-4 w-4 text-amber-300" aria-hidden="true" />
                ) : (
                  <MailCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                )}
                {unreadCount} unread
              </div>
              <Button asChild>
                <Link to="/app/citizen/issues">View My Issues</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {groupedNotifications.length > 0 ? (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <section key={group.key} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.items.length}
                </span>
              </div>

              <div className="grid gap-4">
                {group.items.map((notification) => {
                  const tone = getTypeTone(notification.notification_type);
                  return (
                    <article
                      key={notification.id}
                      className="rounded-[1.5rem] border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${toneClasses(tone)}`}
                            >
                              {notification.notification_type.replaceAll("_", " ")}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${
                                notification.is_read
                                  ? "bg-slate-500/10 text-slate-300 ring-slate-500/20"
                                  : "bg-amber-500/10 text-amber-300 ring-amber-500/20"
                              }`}
                            >
                              {notification.is_read ? "Read" : "Unread"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-lg font-semibold tracking-tight text-foreground">{notification.title}</h4>
                            <p className="text-sm leading-6 text-muted-foreground">{notification.message}</p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 text-sm text-muted-foreground lg:items-end">
                          <p>{formatCitizenIssueDateTime(notification.created_at)}</p>
                          {notification.related_issue_id ? (
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/app/citizen/issues/${notification.related_issue_id}`}>
                                View Issue
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <CitizenEmptyState
          description="You do not have any civic notifications yet. Updates will appear here when CivicFix creates them."
          primaryActionHref="/app/citizen/issues"
          primaryActionLabel="View My Issues"
          secondaryActionHref="/app/citizen/report"
          secondaryActionLabel="Report an Issue"
          title="No notifications yet"
        />
      )}
    </div>
  );
}
