import { Bell, Menu, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { getCivicFixRoleLabel, type CivicFixRoleCode } from "@/lib/civicfix";

type AppNavbarProps = {
  title: string;
  subtitle: string;
  roleCode: CivicFixRoleCode | null;
  onMenuClick: () => void;
};

export function AppNavbar({ title, subtitle, roleCode, onMenuClick }: AppNavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-teal-100/90 bg-[linear-gradient(90deg,rgba(247,250,248,0.96)_0%,rgba(240,248,247,0.9)_45%,rgba(238,244,247,0.92)_100%)] backdrop-blur-xl">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Button className="lg:hidden" size="icon" variant="ghost" onClick={onMenuClick} type="button">
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
            CivicFix workspace
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
            <span className="rounded-full border border-sky-200/90 bg-gradient-to-r from-[#0f766e]/10 via-[#0284c7]/10 to-[#4f46e5]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
              {getCivicFixRoleLabel(roleCode)}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Button aria-label="Notifications" size="icon" variant="ghost" type="button">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </Button>
          <UserMenu roleCode={roleCode} />
        </div>
      </div>

      <div className="border-t border-teal-100/80 bg-gradient-to-r from-surface/95 via-teal-50/70 to-sky-50/70 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{getCivicFixRoleLabel(roleCode)}</p>
            <p className="truncate text-xs text-muted-foreground">Notifications and profile access below.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button aria-label="Notifications" size="icon" variant="ghost" type="button">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Button>
            <UserMenu roleCode={roleCode} />
          </div>
        </div>
      </div>
    </header>
  );
}
