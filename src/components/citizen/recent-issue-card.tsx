import { CalendarDays, MapPin, MoveRight } from "lucide-react";
import { Link } from "react-router-dom";

import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const locationText = issue.address_text?.trim() || issue.location_text?.trim();

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-col sm:flex-row min-w-0">
        {/* Thumbnail Frame */}
        <div className="sm:w-48 lg:w-56 shrink-0 overflow-hidden border-b sm:border-b-0 sm:border-r border-border/70 bg-[linear-gradient(135deg,rgba(15,118,110,0.08)_0%,rgba(2,132,199,0.08)_100%)]">
          <IssueImage
            alt={issue.title}
            brokenLabel="Image unavailable"
            className="h-44 sm:h-full w-full object-cover"
            emptyLabel="No image attached"
            src={thumbnailUrl}
            variant="card"
          />
        </div>

        {/* Content Area */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 lg:p-6 min-w-0">
          <div className="space-y-3">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusTone} size="sm">
                {statusLabel}
              </Badge>
              <Badge variant="outline" size="sm" className="bg-white/80">
                {issue.category}
              </Badge>
              <Badge variant="default" size="sm" className="text-muted-foreground">
                Priority: {formatPriorityLabel(issue.priority)}
              </Badge>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <Link to={viewDetailsHref} className="block group-hover:text-primary transition-colors">
                <h3 className="break-words text-base sm:text-lg font-bold text-foreground line-clamp-1">
                  {issue.title}
                </h3>
              </Link>
              <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {issue.description}
              </p>
            </div>
          </div>

          {/* Footer with Metadata & CTA */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1.5 shrink-0">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{formatDate(issue.created_at)}</span>
              </div>
              {locationText ? (
                <div className="inline-flex items-center gap-1.5 max-w-[200px] sm:max-w-[260px] truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{locationText}</span>
                </div>
              ) : null}
            </div>

            <Button asChild size="sm" variant="outline" className="shrink-0 ml-auto group-hover:border-teal-300">
              <Link to={viewDetailsHref}>
                <span>View Details</span>
                <MoveRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

