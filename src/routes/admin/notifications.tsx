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
import { formatAdminDateTime } from "@/lib/admin";
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

export function AdminNotificationsPage() {
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
        .select("id, recipient_profile_id, notification_type, title, message, related_issue_id, is_read, created_at, read_at")
        .eq("recipient_profile_id", currentProfileId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        if (import.meta.env.DEV) console.error("Admin notifications load failed", loadError);
        setError("Unable to load system notifications.");
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

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    if (filterTab === "unread") return notifications.filter((n) => !n.is_read);
    if (filterTab === "read") return notifications.filter((n) => n.is_read);
    return notifications;
  }, [filterTab, notifications]);

  const groupedNotifications = useMemo(() => {
    const today: NotificationRow[] = [];
    const earlier: NotificationRow[] = [];
    const now = new Date().toISOString();

    for (const item of filteredNotifications) {
      if (isSameLocalDay(item.created_at, now)) {
        today.push(item);
      } else {
        earlier.push(item);
      }
    }

    return { today, earlier };
  }, [filteredNotifications]);

  async function markAsRead(id: string) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    if (!updateError) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
      );
    }
  }

  async function markAllAsRead() {
    if (!profileId || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("recipient_profile_id", profileId)
      .eq("is_read", false);

    if (!updateError) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
      );
    }
    setMarkingAll(false);
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Notifications Unavailable"
        description={sessionProblem ?? error ?? "We could not load your admin notifications right now."}
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
        tag="System Administration"
        title="Admin Notifications & Broadcasts"
        description="System-level security notices, dispatch alerts, and governance notifications."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void markAllAsRead()}
                disabled={markingAll}
                className="text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-teal-600" />
                {markingAll ? "Marking..." : "Mark All Read"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="rounded-2xl border border-teal-200/80 bg-white/80 px-3.5 py-2 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800">Unread Alerts</span>
            <p className="text-xl font-bold text-teal-900 mt-0.5">{unreadCount}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-white/80 px-3.5 py-2 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Received</span>
            <p className="text-xl font-bold text-foreground mt-0.5">{notifications.length}</p>
          </div>
        </div>
      </PageHeader>

      {/* 2. Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
          {(["all", "unread", "read"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                filterTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all" ? `All (${notifications.length})` : tab === "unread" ? `Unread (${unreadCount})` : `Read (${notifications.length - unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Notification List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-8 text-center rounded-3xl border border-dashed border-border/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-foreground">No notifications found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {filterTab === "unread"
              ? "You are all caught up! No unread system notifications."
              : "You have not received any system notifications yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.today.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today</h3>
              <div className="space-y-2.5">
                {groupedNotifications.today.map((notif) => (
                  <NotificationItem key={notif.id} notification={notif} onMarkRead={(id) => void markAsRead(id)} />
                ))}
              </div>
            </div>
          )}

          {groupedNotifications.earlier.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Earlier</h3>
              <div className="space-y-2.5">
                {groupedNotifications.earlier.map((notif) => (
                  <NotificationItem key={notif.id} notification={notif} onMarkRead={(id) => void markAsRead(id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationRow;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${
        notification.is_read
          ? "border-border/60 bg-card/60 opacity-90 hover:opacity-100"
          : "border-teal-200/90 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/50 shadow-sm"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          notification.is_read
            ? "border-border/80 bg-muted/40 text-muted-foreground"
            : "border-teal-200 bg-teal-50 text-teal-700"
        }`}
      >
        <Bell className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" size="sm">
            {notification.notification_type}
          </Badge>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" title="Unread" />
          )}
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {formatAdminDateTime(notification.created_at)}
          </span>
        </div>

        <p className="text-sm font-bold text-foreground">{notification.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{notification.message}</p>

        <div className="flex items-center gap-3 pt-1">
          {notification.related_issue_id && (
            <Button size="sm" variant="outline" asChild className="h-7 text-xs px-2.5 rounded-lg border-teal-200 text-teal-800 hover:bg-teal-50">
              <Link to={`/app/admin/issues/${notification.related_issue_id}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                View Related Issue
              </Link>
            </Button>
          )}

          {!notification.is_read && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition underline underline-offset-2"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
