import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { BrowserRouter } from "react-router-dom";

import App from "@/App";
import { ClerkSupabaseBridge } from "@/auth/clerk-supabase-bridge";
import "@/index.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error("Missing Clerk configuration. Set VITE_CLERK_PUBLISHABLE_KEY in your .env file.");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <BrowserRouter>
        <ClerkSupabaseBridge />
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>,
);
