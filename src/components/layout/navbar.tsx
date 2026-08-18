import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@clerk/react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

export function Navbar() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav className="hidden items-center gap-2 md:flex">
          <Button asChild size="sm" variant="ghost">
            <Link to="/#how-it-works">How it works</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/#features">Features</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/app">
                <span>Open app</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link to="/login">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Login
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Sign up
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
