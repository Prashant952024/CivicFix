import { Leaf, Sprout, TreePine } from "lucide-react";
import { Link } from "react-router-dom";

type SiteFooterProps = {
  compact?: boolean;
};

const platformLinks = [
  { label: "Report an Issue", to: "/signup" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Features", to: "/#features" },
] as const;

const authorityLabels = ["Municipal Officer", "Field Worker", "Admin"] as const;

const resourceLinks = [
  { label: "About CivicFix", to: "/#features" },
] as const;

export function SiteFooter({ compact = false }: SiteFooterProps) {
  if (compact) {
    return (
      <footer className="border-t border-white/10 bg-[linear-gradient(135deg,#164E63_0%,#14532D_55%,#1e3a5f_100%)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-cyan-100/70 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5">
            <Sprout className="h-3.5 w-3.5 text-emerald-400/60" aria-hidden="true" />
            <span className="font-semibold text-white/80">CivicFix</span>
          </div>
          <p>&copy; {new Date().getFullYear()} CivicFix. Built for smarter, cleaner communities.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[linear-gradient(135deg,#164E63_0%,#14532D_50%,#1e3a5f_100%)]">
      {/* Ambient glow effects */}
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-[#059669]/12 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[#312E81]/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-[#0284c7]/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        {/* Columns */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 shadow-sm">
                <Sprout className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold text-white">CivicFix</span>
            </Link>
            <p className="max-w-xs text-sm leading-6 text-cyan-100/60">
              Making communities cleaner, safer, and better — one civic issue at a time.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/50">
              Platform
            </h3>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-cyan-100/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#164E63]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <span className="text-sm text-cyan-100/40">Track Issues</span>
              </li>
              <li>
                <span className="text-sm text-cyan-100/40">Community Impact</span>
              </li>
            </ul>
          </div>

          {/* For Authorities */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/50">
              For Authorities
            </h3>
            <ul className="space-y-2.5">
              {authorityLabels.map((label) => (
                <li key={label}>
                  <span className="text-sm text-cyan-100/40">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/50">
              Resources
            </h3>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-cyan-100/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#164E63]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <span className="text-sm text-cyan-100/40">Help</span>
              </li>
              <li>
                <span className="text-sm text-cyan-100/40">Privacy</span>
              </li>
              <li>
                <span className="text-sm text-cyan-100/40">Terms</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-cyan-100/50">
              &copy; {new Date().getFullYear()} CivicFix
            </p>
            <div className="flex items-center gap-3 text-cyan-100/40">
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs">Built for smarter, cleaner communities.</span>
              <TreePine className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
