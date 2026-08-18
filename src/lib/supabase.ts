import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type AccessTokenProvider = () => Promise<string | null> | string | null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let accessTokenProvider: AccessTokenProvider | null = null;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.",
  );
}

export function setSupabaseAccessTokenProvider(provider: AccessTokenProvider | null) {
  accessTokenProvider = provider;
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  accessToken: async () => {
    if (!accessTokenProvider) {
      return null;
    }

    return accessTokenProvider();
  },
});
