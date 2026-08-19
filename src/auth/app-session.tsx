import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Outlet } from "react-router-dom";

import { useCivicFixProfileSync } from "@/auth/use-civicfix-profile-sync";
import { type CivicFixRoleCode } from "@/lib/civicfix";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type AppSessionState = {
  profile: ProfileRow | null;
  roleCode: CivicFixRoleCode | null;
  needsOnboarding: boolean;
  status: "idle" | "syncing" | "ready" | "error";
  error: string | null;
  refresh: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionState | null>(null);

export function AppSessionProvider({ children }: { children?: ReactNode }) {
  const profileSync = useCivicFixProfileSync();

  const value = useMemo<AppSessionState>(() => {
    if (profileSync.status === "idle") {
      return {
        profile: null,
        roleCode: null,
        needsOnboarding: false,
        status: "idle",
        error: null,
        refresh: profileSync.refresh,
      };
    }

    if (profileSync.status === "syncing") {
      return {
        profile: null,
        roleCode: null,
        needsOnboarding: false,
        status: "syncing",
        error: null,
        refresh: profileSync.refresh,
      };
    }

    if (profileSync.status === "error") {
      return {
        profile: null,
        roleCode: null,
        needsOnboarding: false,
        status: "error",
        error: profileSync.error ?? "CivicFix profile synchronization failed.",
        refresh: profileSync.refresh,
      };
    }

    if (!profileSync.profile) {
      return {
        profile: null,
        roleCode: null,
        needsOnboarding: true,
        status: "ready",
        error: null,
        refresh: profileSync.refresh,
      };
    }

    if (!profileSync.profile.role_id) {
      return {
        profile: profileSync.profile,
        roleCode: null,
        needsOnboarding: false,
        status: "error",
        error: "CivicFix profile is missing a role assignment.",
        refresh: profileSync.refresh,
      };
    }

    if (!profileSync.roleCode) {
      return {
        profile: profileSync.profile,
        roleCode: null,
        needsOnboarding: false,
        status: "error",
        error: "Could not resolve the CivicFix role for the current profile.",
        refresh: profileSync.refresh,
      };
    }

    return {
      profile: profileSync.profile,
      roleCode: profileSync.roleCode,
      needsOnboarding: false,
      status: "ready",
      error: null,
      refresh: profileSync.refresh,
    };
  }, [profileSync.error, profileSync.profile, profileSync.refresh, profileSync.roleCode, profileSync.status]);

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
