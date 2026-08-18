import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">Page not found</p>
        <h1 className="text-3xl font-semibold tracking-tight">This CivicFix route does not exist.</h1>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
