import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Layers3,
  MapPinned,
  PieChart,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  "id" | "status" | "priority" | "severity" | "category" | "created_at" | "department_id" | "latitude" | "longitude" | "location_text" | "address_text" | "resolved_at"
>;

type DepartmentRow = Pick<Database["public"]["Tables"]["departments"]["Row"], "id" | "name" | "is_active">;

type TimeRangeKey = "7d" | "30d" | "3m" | "6m" | "1y";
type TimeBucketUnit = "day" | "week" | "month";
type StatusKey =
  | "SUBMITTED"
  | "VERIFIED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "CITIZEN_VERIFIED"
  | "REOPENED"
  | "REJECTED";
type SeverityKey = Database["public"]["Enums"]["issue_severity"];
type PriorityKey = Database["public"]["Enums"]["issue_priority"];

type ChartPoint = {
  label: string;
  rangeLabel: string;
  value: number;
  start: Date;
};

type TrendPoint = {
  label: string;
  rangeLabel: string;
  created: number;
  resolved: number;
  start: Date;
};

type StatusSeriesEntry = {
  key: StatusKey;
  label: string;
  description: string;
  color: string;
  gradientClass: string;
  aliases: Database["public"]["Enums"]["issue_status"][];
};

type SeveritySeriesEntry = {
  key: SeverityKey;
  label: string;
  description: string;
  color: string;
};

type PrioritySeriesEntry = {
  key: PriorityKey;
  label: string;
  description: string;
  color: string;
};

type LocationSeriesEntry = {
  key: string;
  label: string;
  count: number;
  color: string;
  description: string;
};

type DepartmentSeriesEntry = {
  id: string;
  label: string;
  assigned: number;
  resolved: number;
  pending: number;
  reopened: number;
  avgResolutionHours: number | null;
  isActive: boolean;
};

const STATUS_SERIES: StatusSeriesEntry[] = [
  {
    key: "SUBMITTED",
    label: "Submitted",
    description: "New intake awaiting triage.",
    color: "#f59e0b",
    gradientClass: "from-amber-500 via-orange-500 to-rose-500",
    aliases: ["SUBMITTED", "AI_ANALYZED"],
  },
  {
    key: "VERIFIED",
    label: "Verified",
    description: "Validated and ready to route.",
    color: "#38bdf8",
    gradientClass: "from-sky-500 via-cyan-400 to-teal-500",
    aliases: ["VERIFIED"],
  },
  {
    key: "ASSIGNED",
    label: "Assigned",
    description: "Ownership is set on a department.",
    color: "#14b8a6",
    gradientClass: "from-teal-500 via-emerald-400 to-green-500",
    aliases: ["ASSIGNED"],
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    description: "Field work is underway.",
    color: "#2563eb",
    gradientClass: "from-blue-500 via-sky-500 to-cyan-400",
    aliases: ["IN_PROGRESS"],
  },
  {
    key: "UNDER_REVIEW",
    label: "Under Review",
    description: "Awaiting a closure decision.",
    color: "#8b5cf6",
    gradientClass: "from-violet-500 via-purple-500 to-fuchsia-500",
    aliases: ["UNDER_REVIEW"],
  },
  {
    key: "RESOLVED",
    label: "Resolved",
    description: "Closed by staff.",
    color: "#10b981",
    gradientClass: "from-emerald-500 via-teal-400 to-cyan-400",
    aliases: ["RESOLVED"],
  },
  {
    key: "CITIZEN_VERIFIED",
    label: "Citizen Verified",
    description: "Resident confirmed the fix.",
    color: "#22c55e",
    gradientClass: "from-green-500 via-emerald-400 to-teal-400",
    aliases: ["CITIZEN_VERIFIED"],
  },
  {
    key: "REOPENED",
    label: "Reopened",
    description: "Needs another pass.",
    color: "#f97316",
    gradientClass: "from-orange-500 via-amber-400 to-yellow-400",
    aliases: ["REOPENED"],
  },
  {
    key: "REJECTED",
    label: "Rejected",
    description: "Closed without action.",
    color: "#ef4444",
    gradientClass: "from-rose-500 via-red-500 to-orange-500",
    aliases: ["REJECTED"],
  },
];

const SEVERITY_SERIES: SeveritySeriesEntry[] = [
  {
    key: "LOW",
    label: "Low",
    description: "Lower impact items.",
    color: "#14b8a6",
  },
  {
    key: "MEDIUM",
    label: "Medium",
    description: "Moderate urgency.",
    color: "#38bdf8",
  },
  {
    key: "HIGH",
    label: "High",
    description: "Needs attention soon.",
    color: "#f59e0b",
  },
  {
    key: "CRITICAL",
    label: "Critical",
    description: "Highest urgency.",
    color: "#ef4444",
  },
];

const PRIORITY_SERIES: PrioritySeriesEntry[] = [
  {
    key: "LOW",
    label: "Low",
    description: "Lowest routing priority.",
    color: "#10b981",
  },
  {
    key: "MEDIUM",
    label: "Medium",
    description: "Standard handling.",
    color: "#38bdf8",
  },
  {
    key: "HIGH",
    label: "High",
    description: "Fast-track work.",
    color: "#f59e0b",
  },
  {
    key: "URGENT",
    label: "Urgent",
    description: "Immediate attention required.",
    color: "#ef4444",
  },
];

const TIME_RANGES: Record<TimeRangeKey, { label: string; bucket: TimeBucketUnit; amount: number }> = {
  "7d": { label: "Last 7 days", bucket: "day", amount: 7 },
  "30d": { label: "Last 30 days", bucket: "day", amount: 30 },
  "3m": { label: "Last 3 months", bucket: "week", amount: 3 },
  "6m": { label: "Last 6 months", bucket: "week", amount: 6 },
  "1y": { label: "Last 1 year", bucket: "month", amount: 12 },
};

type IssueFilters = {
  status: "all" | StatusKey;
  priority: "all" | PriorityKey;
  severity: "all" | SeverityKey;
  category: string | null;
  department: string | null;
};

function isResolvedLike(status: Database["public"]["Enums"]["issue_status"]) {
  return status === "RESOLVED" || status === "CITIZEN_VERIFIED";
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeLookup(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function formatDurationFromHours(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) {
    return "N/A";
  }

  if (hours < 24) {
    return `${Math.max(0.1, Math.round(hours * 10) / 10).toFixed(hours < 10 ? 1 : 0)}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return `${days}d`;
  }

  return `${days}d ${remainingHours}h`;
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getIssueResolutionHours(issue: Pick<IssueRow, "created_at" | "resolved_at">) {
  const createdAt = parseTimestamp(issue.created_at);
  const resolvedAt = parseTimestamp(issue.resolved_at);
  if (!createdAt || !resolvedAt) {
    return null;
  }

  const hours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hours >= 0 ? hours : null;
}

function getStatusEntryFromIssue(status: Database["public"]["Enums"]["issue_status"]) {
  return STATUS_SERIES.find((entry) => entry.aliases.includes(status)) ?? null;
}

function matchesStatusFilter(issueStatus: Database["public"]["Enums"]["issue_status"], filter: IssueFilters["status"]) {
  if (filter === "all") {
    return true;
  }

  return getStatusEntryFromIssue(issueStatus)?.key === filter;
}

function getIssueLocationLabel(issue: Pick<IssueRow, "latitude" | "longitude" | "location_text" | "address_text">) {
  const address = normalizeText(issue.address_text);
  const location = normalizeText(issue.location_text);

  if (address) {
    return address.split(",")[0]?.trim() || address;
  }

  if (location) {
    return location.split(",")[0]?.trim() || location;
  }

  const latitude = issue.latitude?.trim();
  const longitude = issue.longitude?.trim();
  if (latitude && longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
  }

  return "";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const offset = (day + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

function startOfMonth(date: Date) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addWeeks(date: Date, amount: number) {
  return addDays(date, amount * 7);
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function getBucketStart(date: Date, bucket: TimeBucketUnit) {
  if (bucket === "day") {
    return startOfDay(date);
  }

  if (bucket === "week") {
    return startOfWeek(date);
  }

  return startOfMonth(date);
}

function getBucketEnd(date: Date, bucket: TimeBucketUnit) {
  if (bucket === "day") {
    return addDays(date, 1);
  }

  if (bucket === "week") {
    return addWeeks(date, 1);
  }

  return addMonths(date, 1);
}

function getRangeStart(now: Date, range: TimeRangeKey) {
  const config = TIME_RANGES[range];
  if (config.bucket === "day") {
    return addDays(startOfDay(now), -(config.amount - 1));
  }

  if (config.bucket === "week") {
    return addWeeks(startOfWeek(now), -(config.amount - 1));
  }

  return addMonths(startOfMonth(now), -(config.amount - 1));
}

function bucketLabel(start: Date, bucket: TimeBucketUnit) {
  if (bucket === "month") {
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(start);
  }

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(start);
}

function rangeLabel(start: Date, bucket: TimeBucketUnit) {
  const end = getBucketEnd(start, bucket);
  const inclusiveEnd = new Date(end.getTime() - 1);
  if (bucket === "month") {
    return `${new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(start)} - ${new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(inclusiveEnd)}`;
  }

  return `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(start)} - ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(inclusiveEnd)}`;
}

function buildTimeSeries(issues: IssueRow[], range: TimeRangeKey) {
  const now = new Date();
  const config = TIME_RANGES[range];
  const start = getRangeStart(now, range);
  const cursorStart = getBucketStart(start, config.bucket);
  const finalBucketStart = getBucketStart(now, config.bucket);

  const buckets = new Map<string, TrendPoint>();
  let cursor = new Date(cursorStart);
  while (cursor <= finalBucketStart) {
    const normalized = getBucketStart(cursor, config.bucket);
    buckets.set(normalized.toISOString(), {
      label: bucketLabel(normalized, config.bucket),
      rangeLabel: rangeLabel(normalized, config.bucket),
      created: 0,
      resolved: 0,
      start: normalized,
    });
    cursor =
      config.bucket === "day"
        ? addDays(cursor, 1)
        : config.bucket === "week"
          ? addWeeks(cursor, 1)
          : addMonths(cursor, 1);
  }

  for (const issue of issues) {
    const createdAt = new Date(issue.created_at);
    if (createdAt < start || createdAt > now) {
      continue;
    }

    const normalized = getBucketStart(createdAt, config.bucket);
    const bucket = buckets.get(normalized.toISOString());
    if (bucket) {
      bucket.created += 1;
    }
  }

  for (const issue of issues) {
    const resolvedAt = parseTimestamp(issue.resolved_at);
    if (!resolvedAt || resolvedAt < start || resolvedAt > now) {
      continue;
    }

    const normalized = getBucketStart(resolvedAt, config.bucket);
    const bucket = buckets.get(normalized.toISOString());
    if (bucket && isResolvedLike(issue.status)) {
      bucket.resolved += 1;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
}

function buildCategoryTrendSeries(issues: IssueRow[], range: TimeRangeKey, category: string | null): ChartPoint[] {
  if (!category) {
    return [];
  }

  const normalizedCategory = normalizeLookup(category);
  return buildTimeSeries(issues.filter((issue) => normalizeLookup(issue.category) === normalizedCategory), range).map((point) => ({
    label: point.label,
    rangeLabel: point.rangeLabel,
    value: point.created,
    start: point.start,
  }));
}

function buildStatusSeries(issues: IssueRow[]) {
  return STATUS_SERIES.map((entry) => ({
    ...entry,
    count: issues.filter((issue) => entry.aliases.includes(issue.status)).length,
  }));
}

function buildSeveritySeries(issues: IssueRow[]) {
  return SEVERITY_SERIES.map((entry) => ({
    ...entry,
    count: issues.filter((issue) => issue.severity === entry.key).length,
  }));
}

function buildPrioritySeries(issues: IssueRow[]) {
  return PRIORITY_SERIES.map((entry) => ({
    ...entry,
    count: issues.filter((issue) => issue.priority === entry.key).length,
  }));
}

function buildCategorySeries(issues: IssueRow[]) {
  const buckets = new Map<string, { label: string; count: number }>();

  for (const issue of issues) {
    const label = normalizeText(issue.category) || "Uncategorized";
    const key = label.toLowerCase();
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { label, count: 1 });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildDepartmentSeries(issues: IssueRow[], departments: DepartmentRow[]): DepartmentSeriesEntry[] {
  const buckets = new Map<
    string,
    {
      id: string;
      label: string;
      assigned: number;
      resolved: number;
      pending: number;
      reopened: number;
      avgResolutionHours: number | null;
      isActive: boolean;
    }
  >();

  for (const department of departments) {
    buckets.set(department.id, {
      id: department.id,
      label: department.name,
      assigned: 0,
      resolved: 0,
      pending: 0,
      reopened: 0,
      avgResolutionHours: null,
      isActive: department.is_active,
    });
  }

  const unassigned = {
    id: "__unassigned__",
    label: "Unassigned",
    assigned: 0,
    resolved: 0,
    pending: 0,
    reopened: 0,
    avgResolutionHours: null,
    isActive: false,
  };

  const resolutionTotals = new Map<string, { hours: number; count: number }>();

  for (const issue of issues) {
    const key = issue.department_id ?? unassigned.id;
    const entry = buckets.get(key) ?? unassigned;
    if (entry.id === "__unassigned__") {
      buckets.set(entry.id, entry);
    }

    entry.assigned += 1;
    if (isResolvedLike(issue.status)) {
      entry.resolved += 1;
      const duration = getIssueResolutionHours(issue);
      if (duration !== null) {
        const totals = resolutionTotals.get(entry.id) ?? { hours: 0, count: 0 };
        totals.hours += duration;
        totals.count += 1;
        resolutionTotals.set(entry.id, totals);
      }
    } else {
      entry.pending += 1;
    }

    if (issue.status === "REOPENED") {
      entry.reopened += 1;
    }
  }

  for (const entry of buckets.values()) {
    const totals = resolutionTotals.get(entry.id);
    entry.avgResolutionHours = totals && totals.count > 0 ? totals.hours / totals.count : null;
  }

  return Array.from(buckets.values()).sort((a, b) => b.assigned - a.assigned || a.label.localeCompare(b.label));
}

function buildLocationSeries(issues: IssueRow[]) {
  const buckets = new Map<string, LocationSeriesEntry>();

  for (const issue of issues) {
    const label = getIssueLocationLabel(issue);
    if (!label) {
      continue;
    }

    const key = label === label.toLowerCase() ? `lookup:${normalizeLookup(label)}` : `label:${label}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    const palette = ["#0f766e", "#0284c7", "#059669", "#f59e0b", "#6366f1"];
    buckets.set(key, {
      key,
      label,
      count: 1,
      color: palette[buckets.size % palette.length],
      description: "Live issue concentration from existing location data.",
    });
  }

  return Array.from(buckets.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function filterIssuesByPeriod(issues: IssueRow[], range: TimeRangeKey) {
  const now = new Date();
  const start = getRangeStart(now, range);
  return issues.filter((issue) => {
    const createdAt = parseTimestamp(issue.created_at);
    return createdAt ? createdAt >= start && createdAt <= now : false;
  });
}

function issueMatchesFilters(issue: IssueRow, filters: IssueFilters) {
  if (!matchesStatusFilter(issue.status, filters.status)) {
    return false;
  }

  if (filters.priority !== "all" && issue.priority !== filters.priority) {
    return false;
  }

  if (filters.severity !== "all" && issue.severity !== filters.severity) {
    return false;
  }

  if (filters.category && normalizeLookup(issue.category) !== normalizeLookup(filters.category)) {
    return false;
  }

  if (filters.department && issue.department_id !== filters.department) {
    return false;
  }

  return true;
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function buildAnalyticsCsv(issues: IssueRow[], departmentsById: Map<string, DepartmentRow>) {
  const header = [
    "Issue ID",
    "Created At",
    "Resolved At",
    "Status",
    "Priority",
    "Severity",
    "Category",
    "Department",
    "Location",
    "Latitude",
    "Longitude",
    "Resolution Hours",
  ];

  const rows = issues.map((issue) => {
    const department = issue.department_id ? departmentsById.get(issue.department_id) : null;
    return [
      issue.id,
      issue.created_at,
      issue.resolved_at ?? "",
      issue.status,
      issue.priority,
      issue.severity,
      issue.category,
      department?.name ?? "Unassigned",
      normalizeText(issue.address_text) || normalizeText(issue.location_text),
      issue.latitude ?? "",
      issue.longitude ?? "",
      getIssueResolutionHours(issue)?.toFixed(2) ?? "",
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(","))
    .join("\n");
}

function buildSvgPath(points: { x: number; y: number }[]) {
  if (points.length === 0) {
    return "";
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${path} L ${point.x} ${point.y}`;
  }, "");
}

function AnalyticsStatCard({
  icon: Icon,
  label,
  value,
  description,
  className,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  description: string;
  className: string;
}) {
  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-teal-950/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-950/10 ${className}`}>
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="max-w-[18rem] text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-foreground shadow-sm shadow-teal-950/5 ring-1 ring-black/5">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function StatusDonutChart({
  items,
  activeKey,
  onActiveKeyChange,
}: {
  items: { key: StatusKey; label: string; count: number; color: string; description: string }[];
  activeKey: StatusKey | null;
  onActiveKeyChange: (key: StatusKey) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const selected = items.find((item) => item.key === activeKey) ?? items.find((item) => item.count > 0) ?? items[0] ?? null;
  const radius = 84;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  const segments = items
    .filter((item) => item.count > 0)
    .reduce<{ item: (typeof items)[number]; offset: number; segment: number }[]>((acc, item) => {
      const segment = (item.count / Math.max(1, total)) * circumference;
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].segment : 0;
      acc.push({ item, offset, segment });
      return acc;
    }, []);

  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Issue status distribution</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Live counts from the CivicFix issues table, with intake grouped into the Submitted bucket.</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total issues</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{total}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="flex items-center justify-center rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(15,118,110,0.08)_0%,rgba(255,255,255,0.92)_100%)] p-4">
          <svg viewBox="0 0 240 240" className="h-[240px] w-[240px]">
            <defs>
              <filter id="status-donut-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(15,118,110,0.22)" />
              </filter>
            </defs>
            <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={strokeWidth} />
            {segments.map(({ item, offset, segment }) => {
              const dashArray = `${segment} ${circumference - segment}`;
              const dashOffset = -offset;
              const isSelected = item.key === selected?.key;
              return (
                <circle
                  key={item.key}
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeLinecap="butt"
                  strokeWidth={isSelected ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "120px 120px", cursor: "pointer", opacity: isSelected ? 1 : 0.82 }}
                  onMouseEnter={() => onActiveKeyChange(item.key)}
                  onFocus={() => onActiveKeyChange(item.key)}
                  tabIndex={0}
                  aria-label={`${item.label}: ${item.count} issues`}
                  filter={isSelected ? "url(#status-donut-glow)" : undefined}
                />
              );
            })}
            <circle cx="120" cy="120" r={radius - strokeWidth - 10} fill="rgba(255,255,255,0.95)" />
            <text x="120" y="113" textAnchor="middle" className="fill-foreground text-[30px] font-semibold">
              {selected?.count ?? 0}
            </text>
            <text x="120" y="136" textAnchor="middle" className="fill-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
              {selected?.label ?? "No data"}
            </text>
            <text x="120" y="158" textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {total > 0 ? `${Math.round(((selected?.count ?? 0) / total) * 100)}% of issues` : "No issues recorded"}
            </text>
          </svg>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const percent = total > 0 ? (item.count / total) * 100 : 0;
              const selectedItem = item.key === selected?.key;
              return (
                <button
                  key={item.key}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedItem ? "border-transparent bg-slate-950/5 shadow-sm shadow-teal-950/5" : "border-border/70 bg-surface-elevated hover:border-border hover:bg-white/80"
                  }`}
                  onClick={() => onActiveKeyChange(item.key)}
                  onFocus={() => onActiveKeyChange(item.key)}
                  onMouseEnter={() => onActiveKeyChange(item.key)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate font-medium text-foreground">{item.label}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{item.count}</p>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(255,255,255,0.94)_100%)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Focused status</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selected.color }} />
                <p className="text-base font-semibold text-foreground">{selected.label}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.count} issues, {total > 0 ? Math.round((selected.count / total) * 100) : 0}% of all records
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TimeSeriesChart({
  points,
  range,
  activeIndex,
  onActiveIndexChange,
  onRangeChange,
}: {
  points: TrendPoint[];
  range: TimeRangeKey;
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
  onRangeChange: (range: TimeRangeKey) => void;
}) {
  const width = 1000;
  const height = 320;
  const paddingX = 56;
  const paddingY = 36;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.created, point.resolved]));
  const selectedPoint = points[activeIndex ?? points.length - 1] ?? null;

  const coordinates = points.map((point, index) => {
    const x = points.length <= 1 ? width / 2 : paddingX + (innerWidth * index) / (points.length - 1);
    const createdY = paddingY + innerHeight - (point.created / maxValue) * innerHeight;
    const resolvedY = paddingY + innerHeight - (point.resolved / maxValue) * innerHeight;
    return { ...point, x, createdY, resolvedY };
  });

  const createdPath = buildSvgPath(coordinates.map(({ x, createdY }) => ({ x, y: createdY })));
  const resolvedPath = buildSvgPath(coordinates.map(({ x, resolvedY }) => ({ x, y: resolvedY })));
  const areaPath =
    coordinates.length > 0
      ? `${buildSvgPath(coordinates.map(({ x, createdY }) => ({ x, y: createdY })))} L ${coordinates.at(-1)?.x ?? paddingX} ${height - paddingY} L ${coordinates[0]?.x ?? paddingX} ${height - paddingY} Z`
      : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Issues reported over time</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{TIME_RANGES[range].label} using actual issue creation timestamps.</p>
        </div>
        {selectedPoint ? (
          <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hovered period</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedPoint.label}</p>
            <p className="text-xs text-muted-foreground">
              {selectedPoint.created} created, {selectedPoint.resolved} resolved
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(TIME_RANGES) as TimeRangeKey[]).map((key) => (
          <Button
            key={key}
            onClick={() => {
              onRangeChange(key);
              onActiveIndexChange(null);
            }}
            type="button"
            variant={range === key ? "default" : "outline"}
            className="min-w-[7.5rem]"
          >
            {TIME_RANGES[key].label}
          </Button>
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(15,118,110,0.06)_0%,rgba(255,255,255,0.95)_100%)] p-4">
        {points.length > 0 ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
            {gridLines.map((ratio) => {
              const y = paddingY + innerHeight - innerHeight * ratio;
              return (
                <g key={ratio}>
                  <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="5 6" />
                  <text x={paddingX - 12} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                    {Math.round(maxValue * ratio)}
                  </text>
                </g>
              );
            })}

            <defs>
              <linearGradient id="timeline-area-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(14,165,233,0.42)" />
                <stop offset="100%" stopColor="rgba(20,184,166,0.03)" />
              </linearGradient>
              <linearGradient id="timeline-line-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill="url(#timeline-area-gradient)" />
            <path d={createdPath} fill="none" stroke="url(#timeline-line-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            <path d={resolvedPath} fill="none" stroke="#f97316" strokeDasharray="8 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />

            {coordinates.map((point, index) => {
              const isSelected = index === (activeIndex ?? coordinates.length - 1);
              const showResolved = point.resolved > 0;
              return (
                <g key={point.label}>
                  <circle
                    cx={point.x}
                    cy={point.createdY}
                    r={isSelected ? 7 : 5}
                    fill={isSelected ? "#0f766e" : "#ffffff"}
                    stroke={point.created > 0 ? "#38bdf8" : "#94a3b8"}
                    strokeWidth="3"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => onActiveIndexChange(index)}
                    onFocus={() => onActiveIndexChange(index)}
                    tabIndex={0}
                    aria-label={`${point.label}: ${point.created} created issues and ${point.resolved} resolved issues`}
                  />
                  {showResolved ? <circle cx={point.x} cy={point.resolvedY} r={3.5} fill="#f97316" opacity="0.9" /> : null}
                  <line
                    x1={point.x}
                    x2={point.x}
                    y1={point.createdY}
                    y2={height - paddingY}
                    stroke={isSelected ? "rgba(14,165,233,0.16)" : "transparent"}
                    strokeDasharray="4 6"
                  />
                </g>
              );
            })}

            {coordinates.map((point, index) => (
              <text
                key={`${point.label}-axis`}
                x={point.x}
                y={height - 8}
                textAnchor="middle"
                className={`fill-muted-foreground text-[11px] ${points.length > 8 && index % Math.ceil(points.length / 8) !== 0 ? "opacity-0" : ""}`}
              >
                {point.label}
              </text>
            ))}
          </svg>
        ) : (
          <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
            No issue creation data is available for this time window.
          </div>
        )}
      </div>

      {selectedPoint ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedPoint.label}</p>
              <p className="text-xs text-muted-foreground">{selectedPoint.rangeLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Created / resolved</p>
              <p className="text-2xl font-semibold text-foreground">
                {selectedPoint.created} / {selectedPoint.resolved}
              </p>
              <p className="text-xs text-muted-foreground">issues in this period</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BarMetricList({
  title,
  subtitle,
  items,
  activeKey,
  onActiveKeyChange,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  items: { key: string; label: string; value: number; color: string; detail: string }[];
  activeKey: string | null;
  onActiveKeyChange: (key: string) => void;
  emptyMessage: string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const selected = items.find((item) => item.key === activeKey) ?? items[0] ?? null;

  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </div>
        {selected ? (
          <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selected.label}</p>
            <p className="text-xs text-muted-foreground">{selected.value} issues</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const selectedItem = item.key === selected?.key;
            return (
              <button
                key={item.key}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedItem ? "border-transparent bg-slate-950/5 shadow-sm shadow-teal-950/5" : "border-border/70 bg-surface-elevated hover:border-border hover:bg-white/80"
                }`}
                onClick={() => onActiveKeyChange(item.key)}
                onFocus={() => onActiveKeyChange(item.key)}
                onMouseEnter={() => onActiveKeyChange(item.key)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate font-medium text-foreground">{item.label}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{((item.value / maxValue) * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                  <div className="h-full rounded-full" style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }} />
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}

function DepartmentPerformanceCard({
  items,
  activeId,
  onActiveIdChange,
}: {
  items: {
    id: string;
    label: string;
    assigned: number;
    resolved: number;
    pending: number;
    reopened: number;
    avgResolutionHours: number | null;
    isActive: boolean;
  }[];
  activeId: string | null;
  onActiveIdChange: (id: string) => void;
}) {
  const selected = items.find((item) => item.id === activeId) ?? items[0] ?? null;

  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Department performance</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Departments sorted by assigned issue volume, with resolution rates calculated from live records.</p>
        </div>
        {selected ? (
          <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected department</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selected.label}</p>
            <p className="text-xs text-muted-foreground">{selected.assigned} assigned, {selected.resolved} resolved</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-border/70">
        <div className="hidden gap-3 border-b border-border/70 bg-surface-elevated px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:grid lg:grid-cols-[1.1fr_0.75fr_0.75fr_0.75fr_0.75fr_0.95fr_0.75fr]">
          <div>Department</div>
          <div>Assigned</div>
          <div>Resolved</div>
          <div>Pending</div>
          <div>Reopened</div>
          <div>Avg time</div>
          <div>Rate</div>
        </div>

        <div className="divide-y divide-border/70">
          {items.length > 0 ? (
            items.map((item) => {
              const rate = item.assigned > 0 ? (item.resolved / item.assigned) * 100 : 0;
              const avgResolutionLabel = item.avgResolutionHours !== null ? formatDurationFromHours(item.avgResolutionHours) : "N/A";
              const selectedItem = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  className={`w-full px-4 py-4 text-left transition ${
                    selectedItem ? "bg-slate-950/5" : "hover:bg-slate-950/[0.03]"
                  }`}
                  onClick={() => onActiveIdChange(item.id)}
                  onFocus={() => onActiveIdChange(item.id)}
                  onMouseEnter={() => onActiveIdChange(item.id)}
                  type="button"
                >
                  <div className="space-y-3 lg:hidden">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <span className="truncate font-medium text-foreground">{item.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assigned</p>
                        <p className="mt-1 font-semibold text-foreground">{item.assigned}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resolved</p>
                        <p className="mt-1 font-semibold text-foreground">{item.resolved}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pending</p>
                        <p className="mt-1 font-semibold text-foreground">{item.pending}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reopened</p>
                        <p className="mt-1 font-semibold text-foreground">{item.reopened}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Avg time</p>
                        <p className="mt-1 font-semibold text-foreground">{avgResolutionLabel}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-surface-elevated p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rate</p>
                        <p className="mt-1 font-semibold text-foreground">{Math.round(rate)}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:grid lg:grid-cols-[1.1fr_0.75fr_0.75fr_0.75fr_0.75fr_0.95fr_0.75fr] lg:gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        <span className="truncate font-medium text-foreground">{item.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.isActive ? "Active department" : "Inactive department"}</p>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{item.assigned}</div>
                    <div className="text-sm font-semibold text-foreground">{item.resolved}</div>
                    <div className="text-sm font-semibold text-foreground">{item.pending}</div>
                    <div className="text-sm font-semibold text-foreground">{item.reopened}</div>
                    <div className="text-sm font-semibold text-foreground">{avgResolutionLabel}</div>
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">{Math.round(rate)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60">
                        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 via-sky-400 to-emerald-500" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No department assignments are available yet.</div>
          )}
        </div>
      </div>

      {selected ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(255,255,255,0.96)_100%)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{selected.label}</p>
              <p className="text-xs text-muted-foreground">
                {selected.assigned} assigned, {selected.pending} pending, {selected.resolved} resolved, {selected.reopened} reopened
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-foreground">{selected.assigned > 0 ? Math.round((selected.resolved / selected.assigned) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">resolution rate</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Avg {selected.avgResolutionHours !== null ? formatDurationFromHours(selected.avgResolutionHours) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminAnalyticsPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
  const [filters, setFilters] = useState<IssueFilters>({
    status: "all",
    priority: "all",
    severity: "all",
    category: null,
    department: null,
  });
  const [activeStatusKey, setActiveStatusKey] = useState<StatusKey | null>(null);
  const [activeSeverityKey, setActiveSeverityKey] = useState<SeverityKey | null>(null);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState<number | null>(null);
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    if (sessionStatus !== "ready" || !profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);

      const [issuesResult, departmentsResult] = await Promise.all([
        supabase
          .from("issues")
          .select("id, status, priority, severity, category, created_at, resolved_at, department_id, latitude, longitude, location_text, address_text")
          .order("created_at", { ascending: false }),
        supabase.from("departments").select("id, name, is_active").order("name", { ascending: true }),
      ]);

      if (cancelled) {
        return;
      }

      const firstError = issuesResult.error ?? departmentsResult.error;
      if (firstError) {
        if (import.meta.env.DEV) {
          console.error("Admin analytics load failed", firstError);
        }
        setError("Unable to load analytics right now.");
        setLoading(false);
        return;
      }

      setIssues(issuesResult.data ?? []);
      setDepartments(departmentsResult.data ?? []);
      setLastRefreshedAt(new Date().toISOString());
      setLoading(false);
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, refreshNonce, sessionStatus]);

  const departmentsById = useMemo(() => new Map(departments.map((department) => [department.id, department])), [departments]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => issueMatchesFilters(issue, filters));
  }, [filters, issues]);

  const periodIssues = useMemo(() => filterIssuesByPeriod(filteredIssues, timeRange), [filteredIssues, timeRange]);
  const statusSeries = useMemo(() => buildStatusSeries(periodIssues), [periodIssues]);
  const severitySeries = useMemo(() => buildSeveritySeries(periodIssues), [periodIssues]);
  const prioritySeries = useMemo(() => buildPrioritySeries(periodIssues), [periodIssues]);
  const categorySeries = useMemo(() => buildCategorySeries(periodIssues), [periodIssues]);
  const departmentSeries = useMemo(() => buildDepartmentSeries(periodIssues, departments), [departments, periodIssues]);
  const timelineSeries = useMemo(() => buildTimeSeries(periodIssues, timeRange), [periodIssues, timeRange]);
  const locationSeries = useMemo(() => buildLocationSeries(periodIssues), [periodIssues]);

  const totalIssues = periodIssues.length;
  const totalResolved = periodIssues.filter((issue) => isResolvedLike(issue.status)).length;
  const totalUnresolved = totalIssues - totalResolved;
  const reopenedCount = periodIssues.filter((issue) => issue.status === "REOPENED").length;
  const resolutionRate = totalIssues > 0 ? Math.round((totalResolved / totalIssues) * 100) : 0;
  const highCriticalCount = severitySeries
    .filter((entry) => entry.key === "HIGH" || entry.key === "CRITICAL")
    .reduce((sum, entry) => sum + entry.count, 0);
  const highCriticalRate = totalIssues > 0 ? Math.round((highCriticalCount / totalIssues) * 100) : 0;
  const averageResolutionHours = useMemo(() => {
    const resolvedDurations = periodIssues.map((issue) => getIssueResolutionHours(issue)).filter((value): value is number => value !== null);
    if (resolvedDurations.length === 0) {
      return null;
    }

    return resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length;
  }, [periodIssues]);

  const selectedStatusKey = activeStatusKey ?? (statusSeries.find((entry) => entry.count > 0)?.key ?? statusSeries[0]?.key ?? null);
  const selectedSeverityKey = activeSeverityKey ?? (severitySeries.find((entry) => entry.count > 0)?.key ?? severitySeries[0]?.key ?? null);
  const selectedCategoryKey = activeCategoryKey ?? (categorySeries[0]?.label ?? null);
  const selectedDepartmentId = activeDepartmentId ?? (departmentSeries[0]?.id ?? null);
  const selectedTimelineIndex = activeTimelineIndex ?? Math.max(0, timelineSeries.length - 1);
  const selectedCategoryTrend = useMemo(() => buildCategoryTrendSeries(periodIssues, timeRange, selectedCategoryKey), [periodIssues, selectedCategoryKey, timeRange]);
  const filteredCount = filteredIssues.length;
  const activeFilterCount = [filters.status, filters.priority, filters.severity, filters.category, filters.department].filter((value) => value !== "all" && value !== null).length;

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(issues.map((issue) => normalizeText(issue.category)).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [issues],
  );

  const handleRefresh = () => {
    setRefreshNonce((value) => value + 1);
  };

  const handleExportCsv = () => {
    if (periodIssues.length === 0) {
      return;
    }

    const csv = buildAnalyticsCsv(periodIssues, departmentsById);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `civicfix-analytics-${timeRange}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      priority: "all",
      severity: "all",
      category: null,
      department: null,
    });
    setActiveStatusKey(null);
    setActiveSeverityKey(null);
    setActiveCategoryKey(null);
    setActiveDepartmentId(null);
    setActiveTimelineIndex(null);
  };

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-white/82 p-6 shadow-lg shadow-teal-950/10">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load analytics</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <Button onClick={handleRefresh} type="button">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.12)_45%,rgba(124,58,237,0.10)_100%)] p-6 shadow-2xl shadow-teal-950/12">
          <div className="space-y-3">
            <div className="h-4 w-44 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-border/80 bg-surface/90" />
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="h-[420px] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
          <div className="h-[420px] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
        </section>
      </div>
    );
  }

  const categoryItems = categorySeries.map((entry) => ({
    key: entry.label,
    label: entry.label,
    value: entry.count,
    color: "#38bdf8",
    detail: `${((entry.count / Math.max(1, totalIssues)) * 100).toFixed(1)}% of all issues`,
  }));

  const selectedCategory = categorySeries.find((entry) => entry.label === selectedCategoryKey) ?? categorySeries[0] ?? null;
  const selectedDepartment = departmentSeries.find((entry) => entry.id === selectedDepartmentId) ?? departmentSeries[0] ?? null;
  const selectedTimelinePoint = timelineSeries[selectedTimelineIndex] ?? timelineSeries[timelineSeries.length - 1] ?? null;
  const selectedCategoryTrendMax = Math.max(1, ...selectedCategoryTrend.map((point) => point.value));
  const selectedCategoryTrendCoordinates = selectedCategoryTrend.map((point, index) => {
    const width = 720;
    const height = 220;
    const paddingX = 24;
    const paddingY = 20;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const x = selectedCategoryTrend.length <= 1 ? width / 2 : paddingX + (innerWidth * index) / (selectedCategoryTrend.length - 1);
    const y = paddingY + innerHeight - (point.value / selectedCategoryTrendMax) * innerHeight;
    return { ...point, x, y };
  });
  const selectedCategoryTrendPath = buildSvgPath(selectedCategoryTrendCoordinates.map(({ x, y }) => ({ x, y })));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.14)_0%,rgba(2,132,199,0.12)_45%,rgba(124,58,237,0.10)_100%)] shadow-2xl shadow-teal-950/12">
        <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
        <div className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(247,250,248,0.76)_100%)] px-6 py-6 backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                Municipal command center
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Civic Operations Analytics</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Real-time civic intelligence from Supabase, focused on issue flow, resolution performance, category demand, severity risk, geographic concentration, and department load.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-white/70 px-3 py-1.5 font-medium text-foreground shadow-sm">
                  Reporting period: {TIME_RANGES[timeRange].label}
                </span>
                <span className="rounded-full border border-border/70 bg-white/70 px-3 py-1.5 font-medium text-foreground shadow-sm">
                  Showing {filteredCount} filtered issues
                </span>
                {lastRefreshedAt ? (
                  <span className="rounded-full border border-border/70 bg-white/70 px-3 py-1.5 font-medium text-foreground shadow-sm">
                    Refreshed {formatAdminDateTime(lastRefreshedAt)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-4 shadow-sm shadow-teal-950/5">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-[#0f766e]" aria-hidden="true" />
                Live civic snapshot
              </div>
              <p className="text-sm leading-6 text-muted-foreground">Built directly from live CivicFix records with no synthetic metrics.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRefresh} type="button" variant="outline" disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                  Refresh
                </Button>
                <Button onClick={handleExportCsv} type="button" variant="outline" disabled={periodIssues.length === 0}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/80 bg-[linear-gradient(135deg,rgba(247,250,248,0.96)_0%,rgba(240,248,247,0.94)_45%,rgba(238,244,255,0.92)_100%)] p-5 shadow-lg shadow-teal-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Analytics filters</p>
            <h3 className="text-lg font-semibold text-foreground">Focus the command center without changing the underlying data</h3>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Filters update every visible metric, chart, and export using the same live Supabase records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={clearFilters} type="button" variant="outline" disabled={activeFilterCount === 0}>
              Clear filters
            </Button>
            <div className="rounded-full border border-border/70 bg-white/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm">
              {activeFilterCount === 0 ? "No filters applied" : `${activeFilterCount} filters active`}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm font-medium text-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
            <select
              aria-label="Filter by issue status"
              className="h-11 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as IssueFilters["status"] }))}
            >
              <option value="all">All statuses</option>
              {STATUS_SERIES.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Priority</span>
            <select
              aria-label="Filter by issue priority"
              className="h-11 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
              value={filters.priority}
              onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value as IssueFilters["priority"] }))}
            >
              <option value="all">All priorities</option>
              {PRIORITY_SERIES.map((priority) => (
                <option key={priority.key} value={priority.key}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Severity</span>
            <select
              aria-label="Filter by issue severity"
              className="h-11 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
              value={filters.severity}
              onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value as IssueFilters["severity"] }))}
            >
              <option value="all">All severities</option>
              {SEVERITY_SERIES.map((severity) => (
                <option key={severity.key} value={severity.key}>
                  {severity.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</span>
            <select
              aria-label="Filter by issue category"
              className="h-11 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
              value={filters.category ?? ""}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value || null }))}
            >
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Department</span>
            <select
              aria-label="Filter by issue department"
              className="h-11 w-full rounded-xl border border-border/70 bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
              value={filters.department ?? ""}
              onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value || null }))}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AnalyticsStatCard
          icon={BarChart3}
          label="Total issues"
          value={totalIssues}
          description="All issue records currently in the platform."
          className="bg-[linear-gradient(135deg,rgba(14,165,233,0.10)_0%,rgba(255,255,255,0.95)_100%)]"
        />
        {statusSeries.map((entry) => {
          const Icon = entry.key === "RESOLVED" || entry.key === "CITIZEN_VERIFIED" ? CheckCircle2 : entry.key === "REJECTED" ? TriangleAlert : entry.key === "REOPENED" ? RefreshCw : entry.key === "ASSIGNED" ? Building2 : entry.key === "IN_PROGRESS" ? Clock3 : entry.key === "UNDER_REVIEW" ? PieChart : entry.key === "VERIFIED" ? ShieldCheck : Layers3;
          return (
            <AnalyticsStatCard
              key={entry.key}
              icon={Icon}
              label={entry.label}
              value={entry.count}
              description={entry.description}
              className={`bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(248,250,252,0.98)_100%)]`}
            />
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <StatusDonutChart items={statusSeries.map((entry) => ({ key: entry.key, label: entry.label, count: entry.count, color: entry.color, description: entry.description }))} activeKey={selectedStatusKey} onActiveKeyChange={(key) => setActiveStatusKey(key)} />

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Resolution performance</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">How efficiently the platform is closing issues versus leaving them open.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resolution rate</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{resolutionRate}%</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(15,118,110,0.08)_0%,rgba(255,255,255,0.95)_100%)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Resolved vs unresolved</p>
                <p className="text-xs text-muted-foreground">
                  {totalResolved} / {totalIssues} issues resolved
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{totalUnresolved} unresolved</p>
            </div>
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-muted/60">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400" style={{ width: `${resolutionRate}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Resolved</span>
              <span className="text-muted-foreground">{totalResolved}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Unresolved</span>
              <span className="text-muted-foreground">{totalUnresolved}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resolved</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{totalResolved}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Unresolved</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{totalUnresolved}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resolved share</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{resolutionRate}%</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3">
            <p className="text-sm font-medium text-foreground">High + Critical risk share</p>
            <p className="mt-1 text-sm text-muted-foreground">{highCriticalRate}% of all issues are in the high or critical severity bands.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Average resolution time</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{averageResolutionHours !== null ? formatDurationFromHours(averageResolutionHours) : "N/A"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Calculated from issues with a resolved timestamp.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reopened issues</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{reopenedCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">Issues that returned to work after reopening.</p>
            </div>
          </div>
        </div>
      </section>

      <TimeSeriesChart
        points={timelineSeries}
        range={timeRange}
        activeIndex={activeTimelineIndex}
        onActiveIndexChange={setActiveTimelineIndex}
        onRangeChange={setTimeRange}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <BarMetricList
          title="Issue categories"
          subtitle="Categories are grouped from the actual values stored in the database and sorted highest to lowest."
          items={categoryItems}
          activeKey={selectedCategoryKey}
          onActiveKeyChange={setActiveCategoryKey}
          emptyMessage="No issue categories are available yet."
        />

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Priority / severity analytics</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Severity uses the low, medium, high, and critical bands requested for command-center review.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">High + critical</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{highCriticalRate}%</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {severitySeries.map((entry) => {
              const maxSeverity = Math.max(1, ...severitySeries.map((item) => item.count));
              const selectedItem = entry.key === selectedSeverityKey;
              return (
                <button
                  key={entry.key}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedItem ? "border-transparent bg-slate-950/5 shadow-sm shadow-teal-950/5" : "border-border/70 bg-surface-elevated hover:border-border hover:bg-white/80"
                  }`}
                  onClick={() => setActiveSeverityKey(entry.key)}
                  onFocus={() => setActiveSeverityKey(entry.key)}
                  onMouseEnter={() => setActiveSeverityKey(entry.key)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{entry.count}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full" style={{ width: `${(entry.count / maxSeverity) * 100}%`, backgroundColor: entry.color }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(255,255,255,0.96)_100%)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Priority mix</p>
                <p className="text-xs text-muted-foreground">Actual issue priorities from the database.</p>
              </div>
              <span className="rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {prioritySeries.reduce((sum, item) => sum + item.count, 0)} total
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {prioritySeries.map((entry) => (
                <div key={entry.key} className="rounded-2xl border border-border/70 bg-surface-elevated p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{entry.label}</p>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{entry.count}</p>
                  <p className="text-xs text-muted-foreground">{entry.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Category trend</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {selectedCategory?.label ?? "Selected category"} over {TIME_RANGES[timeRange].label.toLowerCase()}.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected category</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedCategory?.label ?? "No category data"}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(15,118,110,0.06)_0%,rgba(255,255,255,0.95)_100%)] p-4">
            {selectedCategoryTrend.length > 0 ? (
              <svg viewBox="0 0 720 220" className="h-auto w-full overflow-visible">
                <defs>
                  <linearGradient id="category-trend-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#0f766e" />
                    <stop offset="50%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="category-trend-fill" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(14,165,233,0.28)" />
                    <stop offset="100%" stopColor="rgba(14,165,233,0.02)" />
                  </linearGradient>
                </defs>
                <path
                  d={`${selectedCategoryTrendPath} L ${selectedCategoryTrendCoordinates.at(-1)?.x ?? 24} ${220 - 20} L ${selectedCategoryTrendCoordinates[0]?.x ?? 24} ${220 - 20} Z`}
                  fill="url(#category-trend-fill)"
                />
                <path d={selectedCategoryTrendPath} fill="none" stroke="url(#category-trend-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                {selectedCategoryTrendCoordinates.map((point, index) => (
                  <g key={point.label}>
                    <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#0f766e" strokeWidth="3" />
                    <text
                      x={point.x}
                      y={210}
                      textAnchor="middle"
                      className={`fill-muted-foreground text-[11px] ${selectedCategoryTrendCoordinates.length > 8 && index % Math.ceil(selectedCategoryTrendCoordinates.length / 8) !== 0 ? "opacity-0" : ""}`}
                    >
                      {point.label}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
                Select a category to view its period trend.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <MapPinned className="h-4.5 w-4.5 text-sky-500" aria-hidden="true" />
                Geographic insights
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Location clusters are derived from existing address, location text, or coordinate data.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Data coverage</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{locationSeries.length > 0 ? `${locationSeries.length}` : "0"}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {locationSeries.length > 0 ? (
              locationSeries.slice(0, 5).map((location) => {
                const percent = (location.count / Math.max(1, totalIssues)) * 100;
                return (
                  <div key={location.key} className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{location.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{location.description}</p>
                      </div>
                      <span className="rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: location.color }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{location.count} issues in this cluster</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                Geographic analytics were skipped because the current period does not contain usable location data.
              </div>
            )}
          </div>
        </div>
      </section>

      <DepartmentPerformanceCard items={departmentSeries} activeId={selectedDepartmentId} onActiveIdChange={setActiveDepartmentId} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Status detail</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">The selected status card stays linked to the donut and the supporting metrics below.</p>
            </div>
            {selectedStatusKey ? (
              <span className="rounded-full border border-border/70 bg-surface-elevated px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {selectedStatusKey}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Submitted</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{statusSeries.find((item) => item.key === "SUBMITTED")?.count ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assigned</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{statusSeries.find((item) => item.key === "ASSIGNED")?.count ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reopened</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{statusSeries.find((item) => item.key === "REOPENED")?.count ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(255,255,255,0.96)_100%)] p-4">
            <p className="text-sm font-medium text-foreground">Operational summary</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {statusSeries.find((item) => item.key === "RESOLVED")?.count ?? 0} resolved, {statusSeries.find((item) => item.key === "CITIZEN_VERIFIED")?.count ?? 0} citizen verified, and {statusSeries.find((item) => item.key === "REJECTED")?.count ?? 0} rejected issues are currently in the live dataset.
            </p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-teal-950/5">
          <h3 className="text-lg font-semibold text-foreground">Recent snapshot</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Quick-glance timing and snapshot details for the current Admin session.</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active time window</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{TIME_RANGES[timeRange].label}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(TIME_RANGES) as TimeRangeKey[]).map((key) => (
                  <Button
                    key={key}
                    onClick={() => {
                      setTimeRange(key);
                      setActiveTimelineIndex(null);
                    }}
                    type="button"
                    variant={timeRange === key ? "default" : "outline"}
                    className="min-w-[4.5rem]"
                  >
                    {key}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Latest issue timestamp</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {periodIssues[0]?.created_at ? formatAdminDateTime(periodIssues[0].created_at) : "No issues yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Most active department</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{selectedDepartment?.label ?? "No department data"}</p>
              <p className="text-sm text-muted-foreground">
                {selectedDepartment ? `${selectedDepartment.assigned} assigned issues, ${selectedDepartment.resolved} resolved` : "Department metrics are still loading."}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected category</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{selectedCategory?.label ?? "No category data"}</p>
              <p className="text-sm text-muted-foreground">
                {selectedCategory ? `${selectedCategory.count} issues in this category` : "Category metrics are still loading."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {selectedTimelinePoint ? (
        <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-lg shadow-teal-950/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Timeline focus</p>
              <p className="text-xs text-muted-foreground">{selectedTimelinePoint.rangeLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-foreground">
                {selectedTimelinePoint.created} / {selectedTimelinePoint.resolved}
              </p>
              <p className="text-xs text-muted-foreground">created / resolved</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
