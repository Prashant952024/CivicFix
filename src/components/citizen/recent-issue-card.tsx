import { CalendarDays, MapPin, MoveRight } from "lucide-react";
import { Link } from "react-router-dom";

import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type IssueImageRow = Database["public"]["Tables"]["issue_images"]["Row"];

export type CitizenIssueCardItem = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  "id" | "title" | "description" | "category" | "priority" | "status" | "location_text" | "address_text" | "created_at"
> & {
  issue_images?: IssueImageRow[] | null;
};

type RecentIssueCardProps = {
  issue: CitizenIssueCardItem;
  statusLabel: string;
  statusTone: "default" | "success" | "warning" | "danger" | "info";
  thumbnailUrl: string | null;
  viewDetailsHref: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatPriorityLabel(priority: CitizenIssueCardItem["priority"]) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function RecentIssueCard({
  issue,
  statusLabel,
  statusTone,
  thumbnailUrl,
  viewDetailsHref,
}: RecentIssueCardProps) {
  const statusClasses =
    statusTone === "success"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
      : statusTone === "warning"
        ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
        : statusTone === "danger"
          ? "bg-red-500/10 text-red-300 ring-red-500/20"
          : statusTone === "info"
            ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
            : "bg-slate-500/10 text-slate-300 ring-slate-500/20";

  const locationText = issue.address_text?.trim() || issue.location_text?.trim();

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-surface/90 shadow-sm shadow-black/10">
      <div className="grid gap-0 md:grid-cols-[160px_1fr]">
        <div className="border-b border-border/70 bg-surface-elevated md:border-b-0 md:border-r">
          <IssueImage
            alt={issue.title}
            brokenLabel="Image unavailable"
            className="min-h-[10rem] rounded-none md:h-full md:min-h-full"
            emptyLabel="No image"
            imageClassName="md:h-full"
            src={thumbnailUrl}
            variant="card"
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {issue.category}
                </span>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${statusClasses}`}>
                  {statusLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Priority {formatPriorityLabel(issue.priority)}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">{issue.title}</h3>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{issue.description}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 text-sm text-muted-foreground lg:items-end">
              <div className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <span>{formatDate(issue.created_at)}</span>
              </div>
              {locationText ? (
                <div className="inline-flex items-center gap-2 lg:max-w-[18rem] lg:justify-end lg:text-right">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="line-clamp-2">{locationText}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <Button asChild size="sm" variant="outline">
              <Link to={viewDetailsHref}>
                View Details
                <MoveRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
