import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/react";

import { getCivicFixDashboardPath, type CivicFixRoleCode } from "@/lib/civicfix";
import { useAppSession } from "@/auth/app-session";

type GuardProps = {
  children?: ReactNode;
  redirectTo?: string;
};

type RoleGuardProps = GuardProps & {
  allowedRoles: CivicFixRoleCode[];
};

function LoadingState({ label = "Loading CivicFix..." }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center px-4 text-sm text-muted-foreground">
      <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
        {label}
      </div>
    </div>
  );
}

export function RequireAuth({ children, redirectTo = "/" }: GuardProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingState label="Loading CivicFix authentication..." />;
  }

  if (!isSignedIn) {
    return <Navigate replace to={redirectTo} />;
  }

  return children ?? <Outlet />;
}

export function PublicOnly({ children, redirectTo = "/" }: GuardProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingState label="Loading CivicFix authentication..." />;
  }

  if (isSignedIn) {
    return <Navigate replace to={redirectTo} />;
  }

  return children ?? <Outlet />;
}

export function RequireRole({ allowedRoles, children, redirectTo = "/unauthorized" }: RoleGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const appSession = useAppSession();

  if (!isLoaded || appSession.status === "syncing" || appSession.status === "idle" || appSession.status === "resolving") {
    return <LoadingState label="Loading CivicFix profile..." />;
  }

  if (!isSignedIn) {
    return <Navigate replace to={redirectTo} />;
  }

  if (appSession.status === "error" || !appSession.profile) {
    return <Navigate replace to={redirectTo} state={{ reason: appSession.error ?? "Missing CivicFix profile." }} />;
  }

  if (appSession.error) {
    return <Navigate replace to={redirectTo} state={{ reason: appSession.error }} />;
  }

  if (!appSession.roleCode) {
    return <LoadingState label="Resolving CivicFix role..." />;
  }

  if (!allowedRoles.includes(appSession.roleCode)) {
    return <Navigate replace to={redirectTo} state={{ reason: "You do not have access to this dashboard." }} />;
  }

  return children ?? <Outlet />;
}

export function RedirectToRoleDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const appSession = useAppSession();
  const location = useLocation();

  if (!isLoaded || appSession.status === "syncing" || appSession.status === "idle" || appSession.status === "resolving") {
    return <LoadingState label="Routing you to CivicFix..." />;
  }

  if (!isSignedIn) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  if (appSession.status === "error" || !appSession.profile) {
    return <Navigate replace to="/unauthorized" state={{ reason: appSession.error ?? "Missing CivicFix profile." }} />;
  }

  if (!appSession.roleCode) {
    return <LoadingState label="Resolving your dashboard..." />;
  }

  return <Navigate replace to={getCivicFixDashboardPath(appSession.roleCode)} />;
}
