import { type ComponentType } from "react";
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  SquarePen,
  UsersRound,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";
import { civicFixNavItems, civicFixRoleConfigs, type CivicFixRoleCode, type CivicFixRoleNavItem } from "@/lib/civicfix";

type AppSidebarProps = {
  roleCode: CivicFixRoleCode;
  mobileOpen: boolean;
  onClose: () => void;
};

type NavIconKey =
  | "dashboard"
  | "issues"
  | "report"
  | "assigned"
  | "notifications"
  | "map"
  | "analytics"
  | "users"
  | "departments";

const navIcons: Record<NavIconKey, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  dashboard: LayoutDashboard,
  issues: ClipboardList,
  report: SquarePen,
  assigned: ClipboardCheck,
  notifications: Bell,
  map: MapPinned,
  analytics: ChartNoAxesCombined,
  users: UsersRound,
  departments: Building2,
};

function getNavIcon(item: CivicFixRoleNavItem) {
  const lowered = item.path.toLowerCase();
  if (lowered.includes("report")) return navIcons.report;
  if (lowered.includes("assigned")) return navIcons.assigned;
  if (lowered.includes("notification")) return navIcons.notifications;
  if (lowered.includes("map")) return navIcons.map;
  if (lowered.includes("analytic")) return navIcons.analytics;
  if (lowered.includes("user")) return navIcons.users;
  if (lowered.includes("department")) return navIcons.departments;
  if (lowered.endsWith("/citizen") || lowered.endsWith("/officer") || lowered.endsWith("/worker") || lowered.endsWith("/admin")) {
    return navIcons.dashboard;
  }
  return navIcons.issues;
}

export function AppSidebar({ roleCode, mobileOpen, onClose }: AppSidebarProps) {
  const role = civicFixRoleConfigs[roleCode];
  const navItems = civicFixNavItems[roleCode];

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-teal-100/80 bg-[linear-gradient(180deg,#f7fbf9_0%,#eff6f4_48%,#e8f1ed_100%)] px-4 py-5 shadow-2xl shadow-teal-950/8 backdrop-blur-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <BrandMark />
          <Button className="lg:hidden" size="icon" variant="ghost" onClick={onClose} type="button">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-teal-100/80 bg-gradient-to-br from-[#0f766e]/10 via-[#0284c7]/10 to-white p-4 shadow-sm shadow-teal-950/5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Active role
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">{role.label}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            CivicFix workflow for {role.label.toLowerCase()} operations.
          </p>
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = getNavIcon(item);

            return (
              <NavLink
                key={item.path}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "border border-teal-200/90 bg-gradient-to-r from-[#0f766e]/10 via-[#0284c7]/10 to-[#059669]/10 text-[#0f5f59] shadow-sm shadow-teal-950/5"
                      : "text-muted-foreground hover:bg-teal-50/60 hover:text-foreground",
                  ].join(" ")
                }
                onClick={onClose}
                to={item.path}
                end={item.path.split("/").length <= 3}
              >
                <Icon className="h-4 w-4" aria-hidden={true} />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-teal-100/80 bg-gradient-to-br from-surface-elevated via-teal-50/70 to-sky-50/70 p-4 shadow-sm shadow-teal-950/5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Workflow
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["REPORT", "ANALYZE", "PRIORITIZE", "ASSIGN", "RESOLVE", "VERIFY"].map((step) => (
              <span
                key={step}
                className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground"
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
