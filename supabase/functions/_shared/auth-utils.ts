/// <reference path="../deno.d.ts" />

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "npm:jose";
import { verifyToken } from "npm:@clerk/backend";

function getClerkDomain(): string {
  const pk = Deno.env.get("CLERK_PUBLISHABLE_KEY") || "pk_test_bmV1dHJhbC1zbmFpbC00NTE4LmNsZXJrLmFjY291bnRzLmRldiQ";
  try {
    const raw = pk.replace(/^pk_(test|live)_/, "");
    const decoded = atob(raw).replace(/\$$/, "");
    if (decoded.includes(".")) {
      return decoded;
    }
  } catch {
    // fallback
  }
  return "neutral-snail-4518.clerk.accounts.dev";
}

const CLERK_DOMAIN = getClerkDomain();
const CLERK_JWKS_URL = `https://${CLERK_DOMAIN}/.well-known/jwks.json`;
const clerkJwks = createRemoteJWKSet(new URL(CLERK_JWKS_URL));

/**
 * Cryptographically verifies a Clerk session JWT token.
 * Uses @clerk/backend verifyToken (with CLERK_SECRET_KEY) or direct JWKS signature verification via jose.
 * Returns the verified Clerk sub (user ID) if valid, or null if forged, expired, or malformed.
 */
export async function verifyClerkSessionToken(token: string): Promise<string | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (clerkSecretKey) {
    try {
      const payload = await verifyToken(token, { secretKey: clerkSecretKey });
      if (payload && typeof payload.sub === "string" && payload.sub.trim().length > 0) {
        return payload.sub.trim();
      }
    } catch {
      // Fall through to direct JWKS verification
    }
  }

  try {
    const { payload } = await jwtVerify(token, clerkJwks, {
      issuer: (iss) => !iss || iss.includes("clerk") || iss.includes(CLERK_DOMAIN),
    });
    if (payload && typeof payload.sub === "string" && payload.sub.trim().length > 0) {
      return payload.sub.trim();
    }
  } catch {
    // Invalid signature, expired, or malformed
  }

  return null;
}

/**
 * Cryptographically verifies a Supabase Auth token via Supabase Auth server.
 * Returns the verified user ID if valid, or null if invalid.
 */
export async function verifySupabaseAuthToken(token: string, supabaseAdmin: SupabaseClient): Promise<string | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (!userError && userData?.user?.id) {
      return userData.user.id;
    }
  } catch {
    // Not a valid Supabase auth token
  }
  return null;
}

/**
 * Sanitizes error messages to prevent leaking API keys, bearer tokens, stack traces, or upstream URLs.
 */
export function sanitizeErrorMessage(input: unknown): string {
  if (!input) return "An internal error occurred.";
  const text = typeof input === "string" ? input : (input instanceof Error ? input.message : String(input));
  return text
    .replace(/key=[^&\s"']+/gi, "key=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/https?:\/\/[^\s"']+/gi, "[REDACTED_URL]")
    .slice(0, 300);
}
