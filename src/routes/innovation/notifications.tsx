import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatCitizenIssueDateTime } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type FilterTab = "all" | "unread" | "read";

function isSameLocalDay(first: string, second: string) {
  const a = new Date(first);
  const b = new Date(second);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function InnovationNotificationsPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

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
        .select("*")
        .eq("recipient_profile_id", currentProfileId)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (loadError) {
        if (import.meta.env.DEV) {
          console.error("Failed to load notifications:", loadError);
        }
        setError("Unable to load notifications. Please check your network and retry.");
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
  }, [profileId, sessionStatus, refreshNonce]);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filterTab === "unread") {
      return notifications.filter((item) => !item.is_read);
    }
    if (filterTab === "read") {
      return notifications.filter((item) => item.is_read);
    }
    return notifications;
  }, [notifications, filterTab]);

  const groupedNotifications = useMemo(() => {
    const today: NotificationRow[] = [];
    const yesterday: NotificationRow[] = [];
    const earlier: NotificationRow[] = [];

    const now = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);

    for (const item of filteredNotifications) {
      if (isSameLocalDay(item.created_at, now.toISOString())) {
        today.push(item);
      } else if (isSameLocalDay(item.created_at, yesterdayDate.toISOString())) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    }

    return [
      { label: "Today", items: today },
      { label: "Yesterday", items: yesterday },
      { label: "Earlier", items: earlier },
    ].filter((group) => group.items.length > 0);
  }, [filteredNotifications]);

  async function handleMarkAllRead() {
    if (!profileId || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (updateError) {
      if (import.meta.env.DEV) {
        console.error("Failed to mark notifications as read:", updateError);
      }
    } else {
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    }
    setMarkingAll(false);
  }

  async function handleNotificationClick(item: NotificationRow) {
    if (!item.is_read) {
      const { error: markError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", item.id);

      if (!markError) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
      }
    }
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Notifications Unavailable"
        description={sessionProblem ?? error ?? "We could not load your notifications."}
        action={
          <Button onClick={() => setRefreshNonce((v) => v + 1)} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Innovation Alerts & Notifications"
        description="Notifications for newly routed complex challenges and updates."
        tag="Innovation Portal"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleMarkAllRead()}
                disabled={markingAll || loading}
                className="gap-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filterTab === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTab("all")}
          className="text-xs"
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={filterTab === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTab("unread")}
          className="text-xs"
        >
          Unread ({unreadCount})
        </Button>
        <Button
          variant={filterTab === "read" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTab("read")}
          className="text-xs"
        >
          Read ({notifications.length - unreadCount})
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-border/70 bg-muted/20" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications"
          description={
            filterTab === "unread"
              ? "You're all caught up! No unread notifications."
              : "No innovation alerts found."
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.label} className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 transition border ${
                      !item.is_read
                        ? "border-teal-200 bg-teal-50/40"
                        : "border-border bg-card"
                    }`}
                    onClick={() => void handleNotificationClick(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{item.title}</span>
                          {!item.is_read && (
                            <Badge variant="teal" size="sm" className="text-[10px]">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.message}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatCitizenIssueDateTime(item.created_at)}</span>
                        </div>
                      </div>

                      {item.related_issue_id && (
                        <Button asChild size="sm" variant="ghost" className="shrink-0 text-xs gap-1">
                          <Link to={`/app/innovation/issues/${item.related_issue_id}`}>
                            View Issue
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
