import { Outlet } from "react-router-dom";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-3.5 py-6 sm:px-6 sm:py-8 lg:px-8 outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

