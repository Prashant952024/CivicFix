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
      ? "bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-700 ring-emerald-200"
      : tone === "warning"
        ? "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 ring-amber-200"
        : tone === "danger"
          ? "bg-gradient-to-br from-orange-100 to-rose-100 text-orange-700 ring-orange-200"
          : tone === "info"
            ? "bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700 ring-sky-200"
            : "bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 ring-teal-200";

  const accentBarClasses =
    tone === "success"
      ? "from-emerald-500 via-green-400 to-emerald-500"
      : tone === "warning"
        ? "from-amber-500 via-orange-400 to-amber-500"
        : tone === "danger"
          ? "from-orange-500 via-rose-400 to-orange-500"
          : tone === "info"
            ? "from-sky-500 via-indigo-400 to-sky-500"
            : "from-teal-500 via-cyan-400 to-emerald-500";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-white/82 p-5 shadow-sm shadow-teal-950/8 backdrop-blur-sm">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentBarClasses}`} />
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
