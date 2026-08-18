import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full rounded-[1.75rem] border border-border/80 bg-surface/90 p-8 text-center shadow-lg shadow-black/20">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          This CivicFix route does not exist.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          The page you requested was not found. Use the landing page or open your CivicFix dashboard.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app">Open app</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
