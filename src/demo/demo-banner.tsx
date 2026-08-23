import { HardHat, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDemo } from "./demo-context";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const { role, setRole, resetDemo } = useDemo();
  const navigate = useNavigate();

  const handleRoleSwitch = (newRole: "MUNICIPAL_OFFICER" | "FIELD_WORKER") => {
    setRole(newRole);
    if (newRole === "MUNICIPAL_OFFICER") {
      void navigate("/demo/officer");
    } else {
      void navigate("/demo/worker");
    }
  };

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300/80 bg-[linear-gradient(90deg,rgba(254,243,199,0.98)_0%,rgba(255,251,235,0.98)_50%,rgba(254,243,199,0.98)_100%)] px-3.5 py-2 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-[10px]">
            Demo
          </span>
          <span className="font-semibold text-amber-950">
            Safe Sandbox Mode:{" "}
            <span className="font-normal text-amber-800 hidden sm:inline">
              Exploring as <strong>{role === "MUNICIPAL_OFFICER" ? "Municipal Officer" : "Field Worker"}</strong>. Real database & authentication are untouched.
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Role Switcher */}
          <div className="flex items-center rounded-lg border border-amber-300 bg-white/90 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleRoleSwitch("MUNICIPAL_OFFICER")}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                role === "MUNICIPAL_OFFICER"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "text-amber-900 hover:bg-amber-50"
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              Officer View
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch("FIELD_WORKER")}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                role === "FIELD_WORKER"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-amber-900 hover:bg-amber-50"
              }`}
            >
              <HardHat className="h-3 w-3" />
              Worker View
            </button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={resetDemo}
            className="h-7 px-2 text-[11px] text-amber-900 hover:bg-amber-200/60"
            title="Reset sandbox to original sample issues"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Reset Data
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[11px] border-amber-300 bg-white hover:bg-amber-50 text-amber-950 font-semibold"
          >
            <Link to="/">Exit Demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
