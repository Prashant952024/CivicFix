import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type CitizenSummaryCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  description?: string;
};

export function CitizenSummaryCard({ label, value, icon: Icon, tone = "default", description }: CitizenSummaryCardProps) {
  const toneClasses =
    tone === "success"
      ? "bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-800 ring-emerald-200"
      : tone === "warning"
        ? "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 ring-amber-200"
        : tone === "danger"
          ? "bg-gradient-to-br from-rose-100 to-red-100 text-rose-800 ring-rose-200"
          : tone === "info"
            ? "bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-800 ring-sky-200"
            : "bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-800 ring-teal-200";

  const accentBarClasses =
    tone === "success"
      ? "from-emerald-500 via-green-400 to-emerald-500"
      : tone === "warning"
        ? "from-amber-500 via-orange-400 to-amber-500"
        : tone === "danger"
          ? "from-rose-500 via-red-400 to-rose-500"
          : tone === "info"
            ? "from-sky-500 via-indigo-400 to-sky-500"
            : "from-teal-500 via-cyan-400 to-emerald-500";

  return (
    <Card className="relative overflow-hidden p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentBarClasses}`} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs sm:text-sm font-semibold text-muted-foreground truncate">{label}</p>
        <span className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ring-1 shadow-sm shrink-0 ${toneClasses}`}>
          <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2.5 sm:mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground truncate">{description}</p>
      ) : null}
    </Card>
  );
}

