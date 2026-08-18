import { type LucideIcon } from "lucide-react";

type CitizenSummaryCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

export function CitizenSummaryCard({ label, value, icon: Icon, tone = "default" }: CitizenSummaryCardProps) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
        : tone === "danger"
          ? "bg-red-500/10 text-red-300 ring-red-500/20"
          : tone === "info"
            ? "bg-blue-500/10 text-blue-300 ring-blue-500/20"
            : "bg-primary/10 text-primary ring-primary/20";

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-sm shadow-black/10">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ${toneClasses}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
