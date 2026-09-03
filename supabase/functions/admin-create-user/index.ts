/// <reference path="../deno.d.ts" />

import { createClerkClient } from "npm:@clerk/backend";
import { createClient } from "npm:@supabase/supabase-js";

const ALLOWED_ROLE_CODES = new Set(["MUNICIPAL_OFFICER", "FIELD_WORKER", "DEPARTMENT_MANAGER"] as const);

type CreateUserBody = {
  fullName?: string;
  email?: string;
  roleCode?: string;
  departmentId?: string;
  employeeId?: string;
  designation?: string;
  phone?: string;
  avatarUrl?: string;
  joinedAt?: string;
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
      "Access-Control-Allow-Origin": origin || "*",
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

/**
 * Canonical username normalizer:
 * lowercase only, hyphens only, no underscores, no spaces, no special characters.
 */
function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

/**
 * Generate a cryptographically strong 16-character temporary password
 */
function generateSecureTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%&*?";
  const allChars = upper + lower + numbers + symbols;

  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  // Guarantee at least 2 of each required character type
  const required = [
    upper[randomBytes[0] % upper.length],
    upper[randomBytes[1] % upper.length],
    lower[randomBytes[2] % lower.length],
    lower[randomBytes[3] % lower.length],
    numbers[randomBytes[4] % numbers.length],
    numbers[randomBytes[5] % numbers.length],
    symbols[randomBytes[6] % symbols.length],
    symbols[randomBytes[7] % symbols.length],
  ];

  const remaining: string[] = [];
  for (let i = 8; i < 16; i++) {
    remaining.push(allChars[randomBytes[i] % allChars.length]);
  }

  const combined = [...required, ...remaining];
  const shuffleBytes = new Uint8Array(combined.length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = combined.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = combined[i];
    combined[i] = combined[j];
    combined[j] = temp;
  }

  return combined.join("");
}

function getPrefixForRoleAndDepartment(roleCode: string, departmentName?: string | null): string {
  if (roleCode === "MUNICIPAL_OFFICER") return "municipal-officer";
  if (roleCode === "DEPARTMENT_MANAGER") {
    if (departmentName) {
      const norm = departmentName.toLowerCase();
      if (norm.includes("road") || norm.includes("infrastructure")) return "road-manager";
      if (norm.includes("water") || norm.includes("sewage")) return "water-manager";
      if (norm.includes("waste") || norm.includes("garbage")) return "waste-manager";
      if (norm.includes("electr") || norm.includes("light")) return "electricity-manager";
      if (norm.includes("park")) return "parks-manager";
      if (norm.includes("health")) return "health-manager";
      if (norm.includes("traffic")) return "traffic-manager";
      if (norm.includes("build")) return "building-manager";
    }
    return "dept-manager";
  }

  if (departmentName) {
    const norm = departmentName.toLowerCase();
    if (norm.includes("road") || norm.includes("infrastructure")) return "road-worker";
    if (norm.includes("water") || norm.includes("sewage")) return "water-worker";
    if (norm.includes("waste") || norm.includes("garbage")) return "waste-worker";
    if (norm.includes("electr") || norm.includes("light")) return "electricity-worker";
    if (norm.includes("park")) return "parks-worker";
    if (norm.includes("health")) return "health-worker";
    if (norm.includes("traffic")) return "traffic-worker";
    if (norm.includes("build")) return "building-worker";
    if (norm.includes("drain")) return "drainage-worker";
    if (norm.includes("fire")) return "fire-worker";
  }

  return "field-worker";
}

async function generateNextUniqueEmployeeId(supabaseClient: any, roleCode: string, departmentName?: string | null): Promise<string> {
  const prefix = getPrefixForRoleAndDepartment(roleCode, departmentName);

  const { data } = await supabaseClient
    .from("profiles")
    .select("employee_id")
    .like("employee_id", `${prefix}-%`);

  let maxNum = 0;
  if (data && Array.isArray(data)) {
    for (const row of data) {
      if (typeof row.employee_id === "string") {
        const normalized = normalizeUsername(row.employee_id);
        const parts = normalized.split("-");
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, "0");
  return `${prefix}-${padded}`;
}

function getSafeErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const anyError = error as { message?: unknown; shortMessage?: unknown; longMessage?: unknown; code?: unknown; errors?: Array<{ message?: unknown }> };
    if (Array.isArray(anyError.errors) && anyError.errors.length > 0 && typeof anyError.errors[0]?.message === "string") {
      return anyError.errors[0].message;
    }
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
  return text.includes("already in use") || text.includes("already exists") || text.includes("duplicate") || text.includes("taken");
}

function extractClerkUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
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
  const allowedOrigins = parseOrigins(Deno.env.get("CIVICFIX_ALLOWED_ORIGINS"));
  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
  const clerkPublishableKey = Deno.env.get("CLERK_PUBLISHABLE_KEY");

  // Safe Presence Diagnostics (Never logs actual secret values)
  console.log("admin-create-user runtime diagnostics:", {
    hasClerkSecret: Boolean(clerkSecretKey),
    hasClerkPublishableKey: Boolean(clerkPublishableKey),
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseServiceRoleKey: Boolean(supabaseServiceKey),
    deploymentId: Deno.env.get("DENO_DEPLOYMENT_ID") ?? "local",
  });

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(500, { error: "Database configuration is unavailable." }, origin);
  }

  if (!clerkSecretKey) {
    return json(
      500,
      {
        error: "Authentication service is not configured. Please contact the system administrator.",
      },
      origin,
    );
  }

  const clerk = createClerkClient({
    secretKey: clerkSecretKey,
    publishableKey: clerkPublishableKey || undefined,
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Authenticate caller as Admin
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  let currentUserId: string | null = null;

  if (clerkSecretKey && clerkPublishableKey) {
    try {
      const authState = await clerk.authenticateRequest(request, {
        acceptsToken: "session_token",
        authorizedParties: allowedOrigins.length > 0 ? allowedOrigins : undefined,
        secretKey: clerkSecretKey,
        publishableKey: clerkPublishableKey,
      });
      if (authState.isAuthenticated) {
        currentUserId = authState.toAuth().userId;
      }
    } catch (authErr) {
      console.warn("Clerk authenticateRequest fallback", authErr);
    }
  }

  if (!currentUserId) {
    currentUserId = extractClerkUserIdFromJwt(authHeader);
  }

  if (!currentUserId) {
    return json(401, { error: "Unauthorized. Missing valid authentication token." }, origin);
  }

  // Verify Admin role in database
  const { data: adminProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, clerk_user_id, role:roles!profiles_role_id_fkey(code)")
    .eq("clerk_user_id", currentUserId)
    .maybeSingle();

  if (profileErr || !adminProfile || adminProfile.role?.code !== "ADMIN") {
    return json(403, { error: "Admin access required to create staff accounts." }, origin);
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return json(400, { error: "Invalid JSON request body." }, origin);
  }

  const fullName = body.fullName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const roleCode = body.roleCode?.trim() ?? "";
  const phone = body.phone?.trim() || null;
  const designation = body.designation?.trim() || null;
  const avatarUrl = body.avatarUrl?.trim() || null;
  const joinedAt = body.joinedAt?.trim() || new Date().toISOString().split("T")[0];

  if (!fullName) {
    return json(400, { error: "Full name is required." }, origin);
  }

  if (!email || !isValidEmail(email)) {
    return json(400, { error: "A valid official email is required." }, origin);
  }

  if (!ALLOWED_ROLE_CODES.has(roleCode as any)) {
    return json(400, { error: "Only Municipal Officer, Department Manager, or Field Worker accounts can be created." }, origin);
  }

  const departmentId = body.departmentId?.trim() || null;
  if ((roleCode === "DEPARTMENT_MANAGER" || roleCode === "FIELD_WORKER") && !departmentId) {
    return json(400, { error: "A department assignment is required for Department Manager and Field Worker roles." }, origin);
  }

  let departmentName: string | null = null;
  if (departmentId) {
    const { data: deptData } = await supabase.from("departments").select("name, is_active").eq("id", departmentId).maybeSingle();
    if (!deptData || !deptData.is_active) {
      return json(400, { error: "The selected department does not exist or is inactive." }, origin);
    }
    departmentName = deptData.name;
  }

  const normalizedEmail = normalizeEmail(email);

  // Check existing email in profiles
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    return json(409, { error: "A user with this email already exists in CivicFix." }, origin);
  }

  // 2. Generate canonical normalized Username / Employee ID (lowercase only, hyphens only)
  let canonicalUsername = normalizeUsername(body.employeeId?.trim() || "");
  if (!canonicalUsername) {
    canonicalUsername = await generateNextUniqueEmployeeId(supabase, roleCode, departmentName);
  }

  const { data: existingEmp } = await supabase
    .from("profiles")
    .select("id")
    .eq("employee_id", canonicalUsername)
    .maybeSingle();

  if (existingEmp) {
    canonicalUsername = await generateNextUniqueEmployeeId(supabase, roleCode, departmentName);
  }

  const { data: roleRecord } = await supabase.from("roles").select("id, code, name").eq("code", roleCode).maybeSingle();
  if (!roleRecord) {
    return json(500, { error: "Requested role could not be resolved." }, origin);
  }

  // 3. Generate Cryptographic 16-character Temporary Password
  const temporaryPassword = generateSecureTemporaryPassword();

  // 4. Create REAL Clerk Authentication Account
  let createdClerkUserId: string;
  const { firstName, lastName } = parseName(fullName);

  try {
    let clerkUser;
    // Attempt creation with canonical normalized username
    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [normalizedEmail],
        password: temporaryPassword,
        firstName: firstName || fullName,
        lastName,
        username: canonicalUsername,
        publicMetadata: {
          role: roleCode,
          department: departmentName,
          employeeId: canonicalUsername,
        },
      });
    } catch (createErr) {
      const errMsg = getSafeErrorMessage(createErr).toLowerCase();
      if (errMsg.includes("username") && (errMsg.includes("not enabled") || errMsg.includes("invalid") || errMsg.includes("support"))) {
        // Fall back to email + password creation if username authentication is not configured in Clerk dashboard
        clerkUser = await clerk.users.createUser({
          emailAddress: [normalizedEmail],
          password: temporaryPassword,
          firstName: firstName || fullName,
          lastName,
          publicMetadata: {
            role: roleCode,
            department: departmentName,
            employeeId: canonicalUsername,
          },
        });
      } else {
        throw createErr;
      }
    }

    createdClerkUserId = clerkUser.id;
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return json(409, { error: "A user with this email already exists in Clerk." }, origin);
    }

    console.error("admin-create-user clerk creation failed", {
      error: getSafeErrorMessage(error),
      email: normalizedEmail,
      roleCode,
    });
    return json(500, { error: `Authentication account creation failed: ${getSafeErrorMessage(error)}` }, origin);
  }

  // 5. Insert linked profile into Supabase
  try {
    const { data: createdProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: createdClerkUserId,
        full_name: fullName,
        email: normalizedEmail,
        phone,
        role_id: roleRecord.id,
        department_id: departmentId,
        employee_id: canonicalUsername,
        designation,
        joined_at: joinedAt,
        is_active: true,
        avatar_url: avatarUrl,
      })
      .select("id, full_name, email, phone, employee_id, designation, is_active, avatar_url, role:roles!profiles_role_id_fkey(code, name), department:departments!profiles_department_id_fkey(id, name)")
      .single();

    if (insertError) {
      console.error("admin-create-user profile creation failed, rolling back Clerk user", {
        error: getSafeErrorMessage(insertError),
        clerkUserId: createdClerkUserId,
      });

      try {
        await clerk.users.deleteUser(createdClerkUserId);
      } catch (delErr) {
        console.error("Clerk rollback failed", delErr);
      }

      return json(500, { error: `Profile creation failed: ${getSafeErrorMessage(insertError)}` }, origin);
    }

    const roleData = createdProfile.role as { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null;
    const roleObj = Array.isArray(roleData) ? roleData[0] : roleData;
    const deptData = createdProfile.department as { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null;
    const deptObj = Array.isArray(deptData) ? deptData[0] : deptData;

    return json(
      200,
      {
        user: {
          id: createdProfile.id,
          fullName: createdProfile.full_name,
          email: createdProfile.email,
          phone: createdProfile.phone,
          employeeId: createdProfile.employee_id,
          username: canonicalUsername,
          designation: createdProfile.designation,
          roleCode: roleObj?.code ?? roleCode,
          roleName: roleObj?.name ?? roleRecord.name,
          departmentId: deptObj?.id ?? departmentId,
          departmentName: deptObj?.name ?? (departmentName || "Cross-Departmental"),
          isActive: createdProfile.is_active,
          avatarUrl: createdProfile.avatar_url,
          temporaryPassword,
        },
      },
      origin,
    );
  } catch (error) {
    console.error("admin-create-user unexpected profile error", {
      error: getSafeErrorMessage(error),
      clerkUserId: createdClerkUserId,
    });

    try {
      await clerk.users.deleteUser(createdClerkUserId);
    } catch {
      // ignore
    }

    return json(500, { error: "An unexpected error occurred while saving the user profile." }, origin);
  }
});
