import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRight, LogIn, Menu, Sparkles, X } from "lucide-react";
import { useAuth } from "@clerk/react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Features", to: "/#features" },
  { label: "About", to: "/#features" },
] as const;

export function SiteHeader() {
  const { isSignedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-40 border-b border-teal-200/60 bg-[linear-gradient(90deg,rgba(247,250,248,0.88)_0%,rgba(240,248,247,0.85)_40%,rgba(238,244,255,0.85)_100%)] shadow-sm shadow-teal-950/5 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <BrandMark />

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-teal-50/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <Button asChild size="sm" className="bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-white shadow-md shadow-teal-950/15 transition hover:shadow-lg hover:shadow-teal-950/20">
              <Link to="/app">
                <span>Open App</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link to="/login">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-white shadow-md shadow-teal-950/15 transition hover:shadow-lg hover:shadow-teal-950/20">
                <Link to="/signup">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <Button
          className="md:hidden"
          size="icon"
          variant="ghost"
          onClick={() => setMobileOpen((prev) => !prev)}
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen ? (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
            onClick={closeMobile}
            aria-label="Close menu"
          />

          {/* Menu panel */}
          <div
            ref={menuRef}
            className="fixed inset-x-0 top-[calc(3.5rem+1px)] z-50 animate-in slide-in-from-top-2 border-b border-teal-200/60 bg-[linear-gradient(180deg,rgba(247,250,248,0.98)_0%,rgba(240,248,247,0.96)_100%)] px-4 pb-6 pt-4 shadow-xl shadow-teal-950/10 backdrop-blur-xl md:hidden"
          >
            <nav className="space-y-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeMobile}
                  className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-teal-50/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-teal-100/80 pt-4">
              {isSignedIn ? (
                <Button asChild className="w-full bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-white shadow-md shadow-teal-950/15">
                  <Link to="/app" onClick={closeMobile}>
                    <span>Open App</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={closeMobile}>
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-white shadow-md shadow-teal-950/15">
                    <Link to="/signup" onClick={closeMobile}>
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      Get Started
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
