import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";

import { useCivicFixProfileSync } from "@/auth/use-civicfix-profile-sync";
import { loadCivicFixRoleCode, type CivicFixRoleCode } from "@/lib/civicfix";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type AppSessionState = {
  profile: ProfileRow | null;
  roleCode: CivicFixRoleCode | null;
  needsOnboarding: boolean;
  status: "idle" | "syncing" | "resolving" | "ready" | "error";
  error: string | null;
  refresh: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionState | null>(null);

export function AppSessionProvider({ children }: { children?: ReactNode }) {
  const profileSync = useCivicFixProfileSync();
  const [roleCode, setRoleCode] = useState<CivicFixRoleCode | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [roleStatus, setRoleStatus] = useState<AppSessionState["status"]>("idle");
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveRole() {
      if (profileSync.status === "idle") {
        setRoleCode(null);
        setNeedsOnboarding(false);
        setRoleStatus("idle");
        setRoleError(null);
        return;
      }

      if (profileSync.status === "syncing") {
        setRoleCode(null);
        setNeedsOnboarding(false);
        setRoleStatus("syncing");
        setRoleError(null);
        return;
      }

      if (profileSync.status === "error") {
        setRoleCode(null);
        setNeedsOnboarding(false);
        setRoleStatus("error");
        setRoleError(profileSync.error ?? "CivicFix profile synchronization failed.");
        return;
      }

      if (!profileSync.profile) {
        setRoleCode(null);
        setNeedsOnboarding(true);
        setRoleStatus("ready");
        setRoleError(null);
        return;
      }

      setNeedsOnboarding(false);

      if (!profileSync.profile.role_id) {
        setRoleCode(null);
        setRoleStatus("error");
        setRoleError("CivicFix profile is missing a role assignment.");
        return;
      }

      setRoleStatus("resolving");
      setRoleError(null);

      const nextRoleCode = await loadCivicFixRoleCode(profileSync.profile.role_id);
      if (cancelled) {
        return;
      }

      if (!nextRoleCode) {
        setRoleCode(null);
        setRoleStatus("error");
        setRoleError("Could not resolve the CivicFix role for the current profile.");
        return;
      }

      setRoleCode(nextRoleCode);
      setRoleStatus("ready");
    }

    void resolveRole();

    return () => {
      cancelled = true;
    };
  }, [profileSync.error, profileSync.profile, profileSync.status]);

  const value = useMemo<AppSessionState>(
    () => ({
      profile: profileSync.profile,
      roleCode,
      needsOnboarding,
      status: roleStatus,
      error: roleError,
      refresh: profileSync.refresh,
    }),
    [needsOnboarding, profileSync.profile, profileSync.refresh, roleCode, roleError, roleStatus],
  );

  return <AppSessionContext.Provider value={value}>{children ?? <Outlet />}</AppSessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppSession() {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error("useAppSession must be used within AppSessionProvider.");
  }

  return context;
}
