import { DatabaseZap } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight" to="/">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card">
            <DatabaseZap className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>ConsoleLog</span>
        </Link>

        <Button asChild size="sm" variant="outline">
          <Link to="/">Home</Link>
        </Button>
      </div>
    </header>
  );
}
