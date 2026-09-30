import { useState } from "react";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  HardHat,
  Lightbulb,
  Microscope,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDemo } from "./demo-context";
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

export function DemoBanner() {
  const { role, setRole, currentPersona, personas, resetDemo } = useDemo();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const navigate = useNavigate();

  const handleSelectRole = (newRole: DemoRole, route: string) => {
    setRole(newRole);
    setShowSwitchModal(false);
    void navigate(route);
  };

  const handleConfirmReset = () => {
    resetDemo();
    setShowResetConfirm(false);
    void navigate("/demo");
  };

  const ActiveIcon = ROLE_ICONS[role] || Shield;

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-amber-300/80 bg-[linear-gradient(90deg,rgba(254,243,199,0.98)_0%,rgba(255,251,235,0.98)_50%,rgba(254,243,199,0.98)_100%)] px-3.5 py-2 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
          {/* Persona & Sandbox Indicator */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 items-center gap-1 rounded-full bg-amber-500 px-2 text-white font-bold text-[10px] uppercase tracking-wider">
              <Shield className="h-3 w-3" />
              Demo Sandbox
            </span>
            <div className="flex items-center gap-1.5 text-amber-950 font-medium">
              <span className="hidden sm:inline text-amber-800">Active Persona:</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white/90 px-2 py-0.5 font-bold text-amber-950 shadow-2xs">
                <ActiveIcon className="h-3.5 w-3.5 text-amber-700" />
                {currentPersona.displayName}
              </span>
              <span className="hidden md:inline text-amber-800 text-[11px]">
                ({currentPersona.badge})
              </span>
            </div>
          </div>

          {/* Actions & Switcher */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSwitchModal(true)}
              className="h-7 px-2.5 text-[11px] font-bold border-amber-300 bg-white hover:bg-amber-100/70 text-amber-950 shadow-2xs"
            >
              <ArrowRightLeft className="mr-1 h-3 w-3 text-amber-700" />
              Switch Persona ({personas.length})
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowResetConfirm(true)}
              className="h-7 px-2 text-[11px] text-amber-900 hover:bg-amber-200/60 font-medium"
              title="Reset sandbox state back to original sample data"
            >
              <RefreshCw className="mr-1 h-3 w-3 text-amber-800" />
              Reset Sandbox
            </Button>

            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-[11px] text-amber-950 hover:bg-amber-200/60 font-semibold"
            >
              <Link to="/demo">All Personas</Link>
            </Button>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[11px] border-amber-300 bg-white hover:bg-amber-50 text-amber-950 font-semibold"
            >
              <Link to="/">Exit</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Switch Persona Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-200 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                  Switch Demo Persona
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seamlessly switch between all 8 roles. Sandbox issues and state are preserved across personas.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setShowSwitchModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {personas.map((p) => {
                const Icon = ROLE_ICONS[p.role] || Shield;
                const isActive = p.role === role;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectRole(p.role, p.route)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition duration-150 ${
                      isActive
                        ? "border-teal-500 bg-teal-50/70 shadow-sm"
                        : "border-border/70 hover:border-amber-400 hover:bg-amber-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${p.avatarColor} text-white shadow-2xs`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{p.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">{p.fullName}</p>
                        </div>
                      </div>
                      {isActive && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <RefreshCw className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Reset Demo Sandbox?</h3>
                <p className="text-xs text-muted-foreground">
                  Restore all issues, challenges, proposals, and pilots back to initial sample state.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border border-border/60">
              This will clear any demo issues you created during this session and reset all simulated workflows. Real production data is never touched.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmReset}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Reset Sandbox
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
