import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  HardHat,
  History,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Microscope,
  PlusCircle,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

import { useDemo } from "./demo-context";
import { DemoBanner } from "./demo-banner";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { type DemoRole } from "./demo-data";

const ROLE_ICONS: Record<DemoRole, React.ComponentType<{ className?: string }>> = {
  CITIZEN: User,
  MUNICIPAL_OFFICER: ShieldCheck,
  DEPARTMENT_MANAGER: Building2,
  FIELD_WORKER: HardHat,
  ADMIN: ShieldAlert,
  INNOVATION_MANAGER: Lightbulb,
  INSTITUTION: Microscope,
  INDUSTRY_PARTNER: Users,
};

export function DemoLayout() {
  const { role, setRole, currentPersona, personas } = useDemo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Auto-sync persona with active route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/demo/citizen") && role !== "CITIZEN") {
      setRole("CITIZEN");
    } else if (path.startsWith("/demo/officer") && role !== "MUNICIPAL_OFFICER") {
      setRole("MUNICIPAL_OFFICER");
    } else if (path.startsWith("/demo/manager") && role !== "DEPARTMENT_MANAGER") {
      setRole("DEPARTMENT_MANAGER");
    } else if (path.startsWith("/demo/worker") && role !== "FIELD_WORKER") {
      setRole("FIELD_WORKER");
    } else if (path.startsWith("/demo/admin") && role !== "ADMIN") {
      setRole("ADMIN");
    } else if (path.startsWith("/demo/innovation") && role !== "INNOVATION_MANAGER") {
      setRole("INNOVATION_MANAGER");
    } else if (path.startsWith("/demo/institution") && role !== "INSTITUTION") {
      setRole("INSTITUTION");
    } else if (path.startsWith("/demo/industry") && role !== "INDUSTRY_PARTNER") {
      setRole("INDUSTRY_PARTNER");
    }
  }, [location.pathname, role, setRole]);

  // Dynamic Navigation Items per Persona
  const getNavItems = () => {
    switch (role) {
      case "CITIZEN":
        return [
          { label: "My Grievances", path: "/demo/citizen", icon: LayoutDashboard, end: true },
          { label: "Report New Issue", path: "/demo/citizen/report", icon: PlusCircle, end: false },
        ];
      case "MUNICIPAL_OFFICER":
        return [
          { label: "Supervisor Overview", path: "/demo/officer", icon: LayoutDashboard, end: true },
          { label: "Triage & Issue Queue", path: "/demo/officer/issues", icon: ClipboardList, end: false },
        ];
      case "DEPARTMENT_MANAGER":
        return [
          { label: "Department Board", path: "/demo/manager", icon: LayoutDashboard, end: true },
          { label: "Worker Roster", path: "/demo/manager/workers", icon: Users, end: false },
        ];
      case "FIELD_WORKER":
        return [
          { label: "Worker Dashboard", path: "/demo/worker", icon: LayoutDashboard, end: true },
          { label: "Assigned Tasks & Map", path: "/demo/worker/assigned-issues", icon: ClipboardCheck, end: false },
        ];
      case "ADMIN":
        return [
          { label: "System Telemetry", path: "/demo/admin", icon: LayoutDashboard, end: true },
          { label: "User Governance", path: "/demo/admin/users", icon: Users, end: false },
          { label: "Department Allocations", path: "/demo/admin/departments", icon: Building2, end: false },
        ];
      case "INNOVATION_MANAGER":
        return [
          { label: "Innovation Hub", path: "/demo/innovation", icon: LayoutDashboard, end: true },
          { label: "Publish Challenge", path: "/demo/innovation/challenges/new", icon: PlusCircle, end: false },
        ];
      case "INSTITUTION":
        return [
          { label: "Research Hub", path: "/demo/institution", icon: LayoutDashboard, end: true },
          { label: "Submit 11-Sec Proposal", path: "/demo/institution/proposals/new", icon: FileText, end: false },
          { label: "Active Pilots", path: "/demo/institution/pilots", icon: TrendingUp, end: false },
        ];
      case "INDUSTRY_PARTNER":
        return [
          { label: "Co-Funding Marketplace", path: "/demo/industry", icon: LayoutDashboard, end: true },
          { label: "Sponsored Pilots", path: "/demo/industry/pilots", icon: TrendingUp, end: false },
        ];
      default:
        return [{ label: "Dashboard", path: "/demo", icon: LayoutDashboard, end: true }];
    }
  };

  const navItems = getNavItems();
  const IconComponent = ROLE_ICONS[role] || Shield;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Demo Banner with Quick Persona Switcher */}
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

          {/* Active Demo Persona Badge */}
          <div className="mt-5 rounded-2xl border border-teal-200/90 bg-gradient-to-br from-[#0f766e]/10 via-[#0284c7]/10 to-white p-3.5 sm:p-4 shadow-sm shadow-teal-950/5">
            <div className="flex items-center justify-between">
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300">
                Sandbox Mode
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                Zero-Login
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${currentPersona.avatarColor} text-white shadow-2xs`}
              >
                <IconComponent className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {currentPersona.displayName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {currentPersona.fullName}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-amber-950/80 bg-amber-50/80 p-1.5 rounded-md border border-amber-200/70 font-medium">
              {currentPersona.tagline}
            </p>
          </div>

          {/* Persona Navigation Links */}
          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Demo role navigation">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {currentPersona.displayName} Actions
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 min-h-[42px] ${
                      isActive
                        ? "border border-teal-200/90 bg-gradient-to-r from-[#0f766e]/12 via-[#0284c7]/10 to-[#059669]/10 text-[#0f5f59] shadow-xs font-bold"
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
          <div className="mt-4 rounded-2xl border border-teal-100/80 bg-gradient-to-br from-white via-teal-50/50 to-sky-50/50 p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Persona Switcher
            </p>
            <Link
              to="/demo"
              className="mt-1.5 inline-flex items-center text-xs font-bold text-teal-800 hover:text-teal-950 hover:underline"
            >
              <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
              All 8 Demo Personas &rarr;
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Demo Navbar */}
          <header className="sticky top-[41px] z-30 border-b border-teal-100/90 bg-[linear-gradient(90deg,rgba(247,250,248,0.96)_0%,rgba(240,248,247,0.92)_45%,rgba(238,244,247,0.94)_100%)] shadow-xs backdrop-blur-xl">
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
                    <span>CivicFix Interactive Sandbox · {currentPersona.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="truncate text-base font-bold text-foreground sm:text-lg lg:text-xl">
                      {currentPersona.tagline}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                  <Link to="/demo">
                    <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                    Switch Persona
                  </Link>
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
