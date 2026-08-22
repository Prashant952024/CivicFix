import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type CitizenEmptyStateProps = {
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
};

export function CitizenEmptyState({
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel,
  secondaryActionHref,
}: CitizenEmptyStateProps) {
  return (
    <EmptyState
      icon={ClipboardList}
      title={title}
      description={description}
      action={
        <>
          <Button asChild>
            <Link to={primaryActionHref}>{primaryActionLabel}</Link>
          </Button>
          {secondaryActionLabel && secondaryActionHref ? (
            <Button asChild variant="outline">
              <Link to={secondaryActionHref}>{secondaryActionLabel}</Link>
            </Button>
          ) : null}
        </>
      }
    />
  );
}

