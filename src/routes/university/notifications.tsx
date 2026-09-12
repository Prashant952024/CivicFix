import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Clock,
  RotateCcw,
} from "lucide-react";

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

export function UniversityNotificationsPage() {
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
    if (sessionStatus !== "ready" || !profileId) return;

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_profile_id", profileId!)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        setError("Failed to load notifications.");
      } else {
        setNotifications(data ?? []);
      }
      setLoading(false);
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [profileId, sessionStatus, refreshNonce]);

  const filteredNotifications = useMemo(() => {
    if (filterTab === "unread") return notifications.filter((n) => !n.is_read);
    if (filterTab === "read") return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, filterTab]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  async function handleMarkAsRead(id: string) {
    const { error: err } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    if (!err) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    }
  }

  async function handleMarkAllAsRead() {
    if (!profileId || unreadCount === 0) return;
    setMarkingAll(true);

    const { error: err } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("recipient_profile_id", profileId)
      .eq("is_read", false);

    if (!err) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    }
    setMarkingAll(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Notifications"
        title="Institutional Notifications & Alerts"
        description="Challenge matching invitations, capability verification updates, and municipal communications."
        backHref="/app/university"
        backLabel="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              disabled={loading}
              className="border-border text-foreground hover:bg-surface-elevated"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleMarkAllAsRead()}
                disabled={markingAll}
                className="border-border text-foreground hover:bg-surface-elevated"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      {sessionProblem ? (
        <Card className="border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            <span>Profile Error</span>
          </div>
          <p className="mt-1">{sessionProblem}</p>
        </Card>
      ) : error ? (
        <Card className="border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            <span>Notification Error</span>
          </div>
          <p className="mt-1">{error}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterTab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("unread")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterTab === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("read")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterTab === "read" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg border border-border/60 bg-muted/20" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={
                filterTab === "unread"
                  ? "No unread notifications"
                  : filterTab === "read"
                  ? "No read notifications"
                  : "No notifications yet"
              }
              description="You will receive alerts here when innovation challenges are matched with your institution's capabilities."
            />
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={`border transition-all ${
                    notif.is_read
                      ? "border-border/60 bg-surface/70"
                      : "border-primary/40 bg-surface shadow-sm ring-1 ring-primary/20"
                  }`}
                >
                  <div className="flex items-start justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{notif.title}</span>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {notif.notification_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{notif.message}</p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatCitizenIssueDateTime(notif.created_at)}</span>
                      </div>
                    </div>

                    {!notif.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleMarkAsRead(notif.id)}
                        className="text-xs text-primary"
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
