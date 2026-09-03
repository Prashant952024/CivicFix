/// <reference path="../deno.d.ts" />

import { createClerkClient } from "npm:@clerk/backend";
import { createClient } from "npm:@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");
const CLERK_PUBLISHABLE_KEY = Deno.env.get("CLERK_PUBLISHABLE_KEY");
const CIVICFIX_ALLOWED_ORIGINS = (Deno.env.get("CIVICFIX_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const clerk = createClerkClient({
  secretKey: CLERK_SECRET_KEY ?? "",
  publishableKey: CLERK_PUBLISHABLE_KEY ?? "",
});

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Origin",
    },
  });
}

function extractClerkUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && CIVICFIX_ALLOWED_ORIGINS.length > 0 && !CIVICFIX_ALLOWED_ORIGINS.includes(origin)) {
    return json(403, { error: "Origin not allowed." }, origin);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." }, origin);
  }

  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  let currentUserId: string | null = null;

  if (CLERK_SECRET_KEY && CLERK_PUBLISHABLE_KEY) {
    try {
      const authState = await clerk.authenticateRequest(request, {
        acceptsToken: "session_token",
        secretKey: CLERK_SECRET_KEY,
        publishableKey: CLERK_PUBLISHABLE_KEY,
      });
      if (authState.isAuthenticated) {
        currentUserId = authState.toAuth().userId;
      }
    } catch {
      // fallback
    }
  }

  if (!currentUserId) {
    currentUserId = extractClerkUserIdFromJwt(authHeader);
  }

  if (!currentUserId) {
    return json(401, { error: "Unauthorized." }, origin);
  }

  // Verify Admin
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id, role:roles!profiles_role_id_fkey(code)")
    .eq("clerk_user_id", currentUserId)
    .maybeSingle();

  const roleCode = (adminProfile?.role as { code?: string } | null)?.code;
  if (roleCode !== "ADMIN") {
    return json(403, { error: "Admin access required." }, origin);
  }

  let body: { profileId?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body." }, origin);
  }

  const profileId = body.profileId;
  if (!profileId) {
    return json(400, { error: "profileId is required." }, origin);
  }

  // Get target user profile
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("id, clerk_user_id, full_name, email")
    .eq("id", profileId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    return json(404, { error: "User profile not found." }, origin);
  }

  if (targetProfile.id === adminProfile?.id) {
    return json(400, { error: "Cannot delete your own admin account." }, origin);
  }

  // 1. Delete from Supabase profiles
  const { error: deleteProfileError } = await supabase.from("profiles").delete().eq("id", profileId);

  if (deleteProfileError) {
    return json(
      400,
      {
        error:
          "Cannot permanently delete this user because they have associated civic records (issues, assignments, or status logs). Please use Deactivate instead to preserve historical accountability.",
      },
      origin,
    );
  }

  // 2. Delete from Clerk if Clerk user ID exists
  if (targetProfile.clerk_user_id && CLERK_SECRET_KEY) {
    try {
      await clerk.users.deleteUser(targetProfile.clerk_user_id);
    } catch (clerkErr) {
      console.warn("Clerk delete error (profile was deleted from database)", clerkErr);
    }
  }

  return json(200, { success: true, message: `User ${targetProfile.full_name || targetProfile.email} deleted successfully.` }, origin);
});
