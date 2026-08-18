import { useEffect } from "react";
import { useAuth } from "@clerk/react";

import { setSupabaseAccessTokenProvider } from "@/lib/supabase";

export function ClerkSupabaseBridge() {
  const { isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      setSupabaseAccessTokenProvider(null);
      return;
    }

    setSupabaseAccessTokenProvider(() => getToken());

    return () => {
      setSupabaseAccessTokenProvider(null);
    };
  }, [getToken, isLoaded]);

  return null;
}
