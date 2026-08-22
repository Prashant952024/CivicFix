import { Bell, Menu, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

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
  const notificationPath = roleCode === "CITIZEN" 
    ? "/app/citizen/notifications" 
    : roleCode === "MUNICIPAL_OFFICER" 
      ? "/app/officer/notifications" 
      : roleCode === "FIELD_WORKER" 
        ? "/app/worker/notifications" 
        : "/app/admin/dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-teal-100/90 bg-[linear-gradient(90deg,rgba(247,250,248,0.96)_0%,rgba(240,248,247,0.92)_45%,rgba(238,244,247,0.94)_100%)] shadow-sm shadow-teal-950/5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-3.5 py-3 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            className="lg:hidden shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
            size="icon"
            variant="ghost"
            onClick={onMenuClick}
            type="button"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="hidden xs:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-[#0f766e] shrink-0" aria-hidden="true" />
              <span>CivicFix workspace</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="truncate text-base font-bold text-foreground sm:text-lg lg:text-xl">{title}</h1>
              <span className="shrink-0 rounded-full border border-sky-200/90 bg-gradient-to-r from-[#0f766e]/10 via-[#0284c7]/10 to-[#4f46e5]/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
                {getCivicFixRoleLabel(roleCode)}
              </span>
            </div>
            <p className="hidden md:block truncate text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button asChild aria-label="Notifications" size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-foreground">
            <Link to={notificationPath}>
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <UserMenu roleCode={roleCode} />
        </div>
      </div>
    </header>
  );
}

