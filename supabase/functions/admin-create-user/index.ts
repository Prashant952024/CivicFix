/// <reference path="../deno.d.ts" />

import { createClerkClient } from "npm:@clerk/backend";
import { createClient } from "npm:@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");
const CLERK_PUBLISHABLE_KEY = Deno.env.get("CLERK_PUBLISHABLE_KEY");
const CIVICFIX_ALLOWED_ORIGINS = parseOrigins(Deno.env.get("CIVICFIX_ALLOWED_ORIGINS"));

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CLERK_SECRET_KEY || !CLERK_PUBLISHABLE_KEY) {
  console.warn("admin-create-user function is missing required environment secrets.");
}

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

const ALLOWED_ROLE_CODES = new Set(["MUNICIPAL_OFFICER", "FIELD_WORKER"] as const);

type CreateUserBody = {
  fullName?: string;
  email?: string;
  roleCode?: string;
};

function parseOrigins(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin ?? "*",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Origin",
    },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");
  return {
    firstName,
    lastName: lastName || undefined,
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSafeErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const anyError = error as { message?: unknown; shortMessage?: unknown; longMessage?: unknown; code?: unknown };
    const parts = [anyError.shortMessage, anyError.longMessage, anyError.message]
      .filter((part) => typeof part === "string" && part.trim().length > 0)
      .map((part) => String(part));
    if (parts.length > 0) {
      return parts[0];
    }
    if (typeof anyError.code === "string" && anyError.code.trim()) {
      return anyError.code;
    }
  }

  return "Unknown error";
}

function isDuplicateEmailError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const anyError = error as { code?: unknown; shortMessage?: unknown; longMessage?: unknown; message?: unknown };
  const text = [anyError.code, anyError.shortMessage, anyError.longMessage, anyError.message]
    .filter((part) => typeof part === "string")
    .join(" ")
    .toLowerCase();
  return text.includes("already in use") || text.includes("already exists") || text.includes("duplicate");
}

async function getCurrentAdminProfile(clerkUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, clerk_user_id, full_name, email, role:roles(code, name)")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | {
        id: string;
        clerk_user_id: string;
        full_name: string;
        email: string | null;
        role?: { code: string; name: string } | null;
      }
    | null;
}

async function getRoleRecord(roleCode: string) {
  const { data, error } = await supabase.from("roles").select("id, code, name").eq("code", roleCode).maybeSingle();

  if (error) {
    throw error;
  }

  return data as { id: string; code: string; name: string } | null;
}

async function deleteClerkUserSafely(userId: string) {
  try {
    await clerk.users.deleteUser(userId);
    return true;
  } catch (error) {
    console.error("admin-create-user rollback failed", {
      userId,
      error: getSafeErrorMessage(error),
    });
    return false;
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && CIVICFIX_ALLOWED_ORIGINS.length > 0 && !CIVICFIX_ALLOWED_ORIGINS.includes(origin)) {
    return json(403, { error: "Origin not allowed." }, origin);
  }

  if (request.method === "OPTIONS") {
    return json(204, {}, origin);
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." }, origin);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CLERK_SECRET_KEY || !CLERK_PUBLISHABLE_KEY) {
    return json(500, { error: "Function is missing required configuration." }, origin);
  }

  let authState;
  try {
    authState = await clerk.authenticateRequest(request, {
      acceptsToken: "session_token",
      authorizedParties: CIVICFIX_ALLOWED_ORIGINS.length > 0 ? CIVICFIX_ALLOWED_ORIGINS : undefined,
      secretKey: CLERK_SECRET_KEY,
      publishableKey: CLERK_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error("admin-create-user auth failure", { error: getSafeErrorMessage(error) });
    return json(401, { error: "Unauthorized." }, origin);
  }

  if (!authState.isAuthenticated) {
    return json(401, { error: "Unauthorized." }, origin);
  }

  const auth = authState.toAuth();
  const currentUserId = auth.userId;
  if (!currentUserId) {
    return json(401, { error: "Unauthorized." }, origin);
  }

  let currentProfile;
  try {
    currentProfile = await getCurrentAdminProfile(currentUserId);
  } catch (error) {
    console.error("admin-create-user profile lookup failed", { error: getSafeErrorMessage(error), userId: currentUserId });
    return json(500, { error: "Unable to verify your CivicFix account." }, origin);
  }

  if (!currentProfile || currentProfile.role?.code !== "ADMIN") {
    return json(403, { error: "Admin access required." }, origin);
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return json(400, { error: "Invalid JSON body." }, origin);
  }

  const fullName = body.fullName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const roleCode = body.roleCode?.trim() ?? "";

  if (!fullName) {
    return json(400, { error: "Full name is required." }, origin);
  }

  if (!email || !isValidEmail(email)) {
    return json(400, { error: "A valid email is required." }, origin);
  }

  if (!ALLOWED_ROLE_CODES.has(roleCode as "MUNICIPAL_OFFICER" | "FIELD_WORKER")) {
    return json(400, { error: "Only Municipal Officer or Field Worker accounts can be created." }, origin);
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    const { data: existingClerkUsers } = await clerk.users.getUserList({ emailAddress: [normalizedEmail], limit: 1 });
    if ((existingClerkUsers?.length ?? 0) > 0) {
      return json(409, { error: "A user with this email already exists." }, origin);
    }
  } catch (error) {
    console.error("admin-create-user clerk lookup failed", { error: getSafeErrorMessage(error), email: normalizedEmail });
    return json(500, { error: "Unable to verify whether this email already exists." }, origin);
  }

  try {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return json(409, { error: "A user with this email already exists." }, origin);
    }
  } catch (error) {
    console.error("admin-create-user profile lookup by email failed", { error: getSafeErrorMessage(error), email: normalizedEmail });
    return json(500, { error: "Unable to verify whether this email already exists." }, origin);
  }

  const roleRecord = await getRoleRecord(roleCode);
  if (!roleRecord) {
    return json(500, { error: "Requested role could not be resolved." }, origin);
  }

  let createdClerkUser;
  try {
    const { firstName, lastName } = parseName(fullName);
    createdClerkUser = await clerk.users.createUser({
      emailAddress: [normalizedEmail],
      emailAddressIdentificationStatus: ["reserved"],
      firstName: firstName || fullName,
      lastName,
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return json(409, { error: "A user with this email already exists." }, origin);
    }

    console.error("admin-create-user clerk creation failed", {
      error: getSafeErrorMessage(error),
      email: normalizedEmail,
      roleCode,
    });
    return json(500, { error: "Clerk account creation failed." }, origin);
  }

  try {
    const { data: createdProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: createdClerkUser.id,
        full_name: fullName,
        email: normalizedEmail,
        role_id: roleRecord.id,
      })
      .select("id, full_name, email, role:roles(code, name)")
      .single();

    if (insertError) {
      console.error("admin-create-user profile creation failed", {
        error: getSafeErrorMessage(insertError),
        clerkUserId: createdClerkUser.id,
        email: normalizedEmail,
        roleCode,
      });

      const rolledBack = await deleteClerkUserSafely(createdClerkUser.id);
      return json(
        500,
        {
          error: rolledBack
            ? "CivicFix profile creation failed after Clerk account creation."
            : "CivicFix profile creation failed and the Clerk account could not be rolled back automatically.",
        },
        origin,
      );
    }

    const roleData = createdProfile.role as { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null;
    const roleObj = Array.isArray(roleData) ? roleData[0] : roleData;

    return json(
      200,
      {
        user: {
          id: createdProfile.id,
          fullName: createdProfile.full_name,
          email: createdProfile.email,
          roleCode: roleObj?.code ?? roleCode,
          roleName: roleObj?.name ?? roleRecord.name,
        },
      },
      origin,
    );
  } catch (error) {
    console.error("admin-create-user profile creation crashed", {
      error: getSafeErrorMessage(error),
      clerkUserId: createdClerkUser.id,
      email: normalizedEmail,
      roleCode,
    });

    const rolledBack = await deleteClerkUserSafely(createdClerkUser.id);
    return json(
      500,
      {
        error: rolledBack
          ? "CivicFix profile creation failed after Clerk account creation."
          : "CivicFix profile creation failed and the Clerk account could not be rolled back automatically.",
      },
      origin,
    );
  }
});

