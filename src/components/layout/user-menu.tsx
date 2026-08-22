import { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/react";
import { ChevronDown, LogOut, Shield } from "lucide-react";
import { getCivicFixRoleLabel, type CivicFixRoleCode } from "@/lib/civicfix";

type UserMenuProps = {
  roleCode: CivicFixRoleCode | null;
};

function getInitials(name: string | null | undefined) {
  if (!name) {
    return "CF";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "CF";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ roleCode }: UserMenuProps) {
  const { user } = useUser();
  const clerk = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName?.trim() || user?.username?.trim() || "CivicFix User";
  const email = user?.primaryEmailAddress?.emailAddress ?? "No email";
  const initials = getInitials(displayName);

  // Close menu on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User account menu"
        className={[
          "flex h-10 sm:h-11 items-center gap-2 sm:gap-3 rounded-full border border-border/70 bg-surface/90 px-2 sm:px-3 text-sm shadow-sm shadow-emerald-950/5 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer",
        ].join(" ")}
      >
        <span className="flex items-center gap-2 sm:gap-2.5">
          {user?.imageUrl ? (
            <img
              alt={displayName}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-teal-200/60"
              src={user.imageUrl}
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 text-xs font-semibold text-teal-800">
              {initials}
            </span>
          )}
          <span className="hidden flex-col items-start text-left sm:flex">
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[120px]">{displayName}</span>
            <span className="text-[10px] text-muted-foreground">{getCivicFixRoleLabel(roleCode)}</span>
          </span>
        </span>
        <ChevronDown className={["h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen ? "rotate-180" : ""].join(" ")} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/80 bg-surface/98 p-3 shadow-2xl shadow-emerald-950/15 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-elevated px-3 py-2.5">
            {user?.imageUrl ? (
              <img alt={displayName} className="h-10 w-10 rounded-full object-cover shrink-0" src={user.imageUrl} />
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 text-xs font-bold text-teal-800">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="font-semibold text-foreground">{getCivicFixRoleLabel(roleCode)}</span>
            </div>

            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-xs sm:text-sm font-semibold text-red-700 transition hover:bg-red-100 hover:text-red-800 min-h-[44px]"
              onClick={() => {
                void clerk.signOut({ redirectUrl: "/" });
              }}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

