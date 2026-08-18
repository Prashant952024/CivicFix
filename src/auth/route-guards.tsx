import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/react";

type GuardProps = {
  children?: ReactNode;
  redirectTo?: string;
};

export function RequireAuth({ children, redirectTo = "/" }: GuardProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Loading CivicFix authentication...
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate replace to={redirectTo} />;
  }

  return children ?? <Outlet />;
}

export function PublicOnly({ children, redirectTo = "/" }: GuardProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Loading CivicFix authentication...
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate replace to={redirectTo} />;
  }

  return children ?? <Outlet />;
}
