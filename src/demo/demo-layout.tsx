import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

import { useDemo } from "./demo-context";
import { DemoBanner } from "./demo-banner";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

export function DemoLayout() {
  const { role, setRole, currentUser } = useDemo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/demo/officer") && role !== "MUNICIPAL_OFFICER") {
      setRole("MUNICIPAL_OFFICER");
    } else if (location.pathname.startsWith("/demo/worker") && role !== "FIELD_WORKER") {
      setRole("FIELD_WORKER");
    }
  }, [location.pathname, role, setRole]);

  const isOfficer = role === "MUNICIPAL_OFFICER";

  const navItems = isOfficer
    ? [
        { label: "Dashboard", path: "/demo/officer", icon: LayoutDashboard, end: true },
        { label: "Issue Queue", path: "/demo/officer/issues", icon: ClipboardList, end: false },
      ]
    : [
        { label: "Dashboard", path: "/demo/worker", icon: LayoutDashboard, end: true },
        { label: "Assigned Issues", path: "/demo/worker/assigned-issues", icon: ClipboardCheck, end: false },
      ];

  const roleTitle = isOfficer ? "Municipal Officer Demo" : "Field Worker Demo";
  const roleSubtitle = isOfficer
    ? "Review, verify, assign and sign-off on civic reports in a local sandbox."
    : "Inspect assigned work, start tasks, and submit evidence in a local sandbox.";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Demo Banner */}
      <DemoBanner />

      <div className="relative flex min-h-screen flex-1">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs lg:hidden animate-in fade-in-0 duration-200"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[280px] sm:w-[300px] lg:w-[270px] xl:w-[285px] flex-col border-r border-teal-100/80 bg-[linear-gradient(180deg,#f7fbf9_0%,#eff6f4_48%,#e8f1ed_100%)] px-4 py-5 shadow-2xl shadow-teal-950/8 backdrop-blur-xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <BrandMark />
            <Button
              className="lg:hidden h-10 w-10 text-muted-foreground hover:text-foreground"
              size="icon"
              variant="ghost"
              onClick={() => setMobileOpen(false)}
              type="button"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Active Demo Role Card */}
          <div className="mt-5 rounded-2xl border border-teal-100/80 bg-gradient-to-br from-[#0f766e]/10 via-[#0284c7]/10 to-white p-3.5 sm:p-4 shadow-sm shadow-teal-950/5">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
                Sandbox
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Demo Workspace
              </p>
            </div>
            <p className="mt-1.5 text-base font-bold text-foreground">{currentUser.full_name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Demo role navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 min-h-[44px] ${
                      isActive
                        ? "border border-teal-200/90 bg-gradient-to-r from-[#0f766e]/12 via-[#0284c7]/10 to-[#059669]/10 text-[#0f5f59] shadow-sm shadow-teal-950/5 font-semibold"
                        : "text-muted-foreground hover:bg-teal-50/70 hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Hub Back Link */}
          <div className="mt-4 rounded-2xl border border-teal-100/80 bg-gradient-to-br from-surface-elevated via-teal-50/70 to-sky-50/70 p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Demo Hub
            </p>
            <Link
              to="/demo"
              className="mt-1.5 inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Switch Role or Hub &rarr;
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Demo Navbar */}
          <header className="sticky top-[41px] z-30 border-b border-teal-100/90 bg-[linear-gradient(90deg,rgba(247,250,248,0.96)_0%,rgba(240,248,247,0.92)_45%,rgba(238,244,247,0.94)_100%)] shadow-sm shadow-teal-950/5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-3.5 py-3 sm:px-6 sm:py-3.5 lg:px-8">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button
                  className="lg:hidden shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                  size="icon"
                  variant="ghost"
                  onClick={() => setMobileOpen(true)}
                  type="button"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>

                <div className="min-w-0 flex-1">
                  <div className="hidden xs:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-[#0f766e] shrink-0" aria-hidden="true" />
                    <span>CivicFix Demo Sandbox</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="truncate text-base font-bold text-foreground sm:text-lg lg:text-xl">
                      {roleTitle}
                    </h1>
                    <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">
                      Sandbox
                    </span>
                  </div>
                  <p className="hidden md:block truncate text-xs text-muted-foreground mt-0.5">
                    {roleSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link to="/demo">Choose Role</Link>
                </Button>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-3.5 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10 lg:py-8 outline-none">
            <div className="mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
