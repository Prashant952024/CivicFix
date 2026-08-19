import { useClerk, useUser } from "@clerk/react";
import { ChevronDown, LogOut, Shield, UserCircle2 } from "lucide-react";
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
  const displayName = user?.fullName?.trim() || user?.username?.trim() || "CivicFix User";
  const email = user?.primaryEmailAddress?.emailAddress ?? "No email";
  const initials = getInitials(displayName);

  return (
    <details className="group relative">
      <summary
        className={[
          "flex h-11 list-none items-center gap-3 rounded-full border border-border/80 bg-surface/80 px-3 text-sm shadow-sm shadow-black/10 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "cursor-pointer",
        ].join(" ")}
      >
        <span className="flex items-center gap-3">
          {user?.imageUrl ? (
            <img
              alt={displayName}
              className="h-7 w-7 rounded-full object-cover"
              src={user.imageUrl}
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </span>
          )}
          <span className="hidden flex-col items-start text-left sm:flex">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <span className="text-xs text-muted-foreground">{getCivicFixRoleLabel(roleCode)}</span>
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" aria-hidden="true" />
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border/80 bg-surface/95 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-elevated px-3 py-3">
          {user?.imageUrl ? (
            <img alt={displayName} className="h-11 w-11 rounded-full object-cover" src={user.imageUrl} />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-medium text-foreground">{getCivicFixRoleLabel(roleCode)}</span>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
          >
            <UserCircle2 className="h-4 w-4" aria-hidden="true" />
            Account details
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15 hover:text-red-100"
            onClick={() => {
              void clerk.signOut({ redirectUrl: "/" });
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </details>
  );
}
