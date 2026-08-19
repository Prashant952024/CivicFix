import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Link className="inline-flex items-center gap-3 text-sm font-semibold tracking-tight" to="/">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-200/80 bg-[linear-gradient(145deg,#ecfeff_0%,#f0fdfa_38%,#eff6ff_100%)] shadow-sm shadow-teal-950/5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f766e] via-[#0284c7] to-[#059669] text-white shadow-inner shadow-teal-950/15">
          <Sprout className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[1.02rem] font-semibold text-foreground">CivicFix</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Clean city operations platform
          </span>
        </span>
      ) : (
        <span className="text-[1.02rem] font-semibold text-foreground">CivicFix</span>
      )}
    </Link>
  );
}
