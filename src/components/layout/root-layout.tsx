import { Outlet } from "react-router-dom";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

export function RootLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
