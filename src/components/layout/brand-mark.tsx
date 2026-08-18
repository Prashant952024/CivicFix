import { DatabaseZap } from "lucide-react";
import { Link } from "react-router-dom";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Link className="inline-flex items-center gap-3 text-sm font-semibold tracking-tight" to="/">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-surface-elevated shadow-sm">
        <DatabaseZap className="h-4 w-4 text-primary" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-base font-semibold text-foreground">CivicFix</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Civic operations platform
          </span>
        </span>
      ) : (
        <span className="text-base font-semibold text-foreground">CivicFix</span>
      )}
    </Link>
  );
}
