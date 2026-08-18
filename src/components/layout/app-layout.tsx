import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { civicFixNavItems, civicFixRoleConfigs, type CivicFixRoleCode } from "@/lib/civicfix";
import { useAppSession } from "@/auth/app-session";

type AppLayoutProps = {
  roleCode?: CivicFixRoleCode;
};

export function AppLayout({ roleCode: roleCodeOverride }: AppLayoutProps) {
  const { roleCode: sessionRoleCode } = useAppSession();
  const roleCode = roleCodeOverride ?? sessionRoleCode;
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const activeNav = useMemo(() => {
    if (!roleCode) {
      return null;
    }

    const navItems = civicFixNavItems[roleCode];
    return navItems.find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)) ?? navItems[0] ?? null;
  }, [location.pathname, roleCode]);

  if (!roleCode) {
    return null;
  }

  const role = civicFixRoleConfigs[roleCode];
  const title = activeNav?.label ?? `${role.label} Dashboard`;
  const subtitle = activeNav?.description ?? `${role.label} workspace for CivicFix.`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative flex min-h-screen">
        <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} roleCode={roleCode} />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppNavbar
            onMenuClick={() => setMobileOpen(true)}
            roleCode={roleCode}
            subtitle={subtitle}
            title={title}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
              <Outlet context={{ roleCode }} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
