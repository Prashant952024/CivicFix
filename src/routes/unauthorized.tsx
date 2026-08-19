import { ShieldAlert } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

type LocationState = {
  reason?: string;
};

export function UnauthorizedPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-[1.75rem] border border-border/80 bg-surface/90 p-8 text-center shadow-lg shadow-black/20">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Unauthorized
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          You do not have access to this CivicFix area.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {state?.reason ?? "Your current CivicFix role cannot open this route."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/app">Go to app</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
