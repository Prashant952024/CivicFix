/// <reference path="../deno.d.ts" />

import { createClerkClient } from "npm:@clerk/backend";
import { createClient } from "npm:@supabase/supabase-js";
import { checkRateLimits, createRateLimitResponse, getClientIp } from "../_shared/rate-limiter.ts";
import { verifyClerkSessionToken, verifySupabaseAuthToken, sanitizeErrorMessage } from "../_shared/auth-utils.ts";

const ALLOWED_ROLE_CODES = new Set([
  "MUNICIPAL_OFFICER",
  "FIELD_WORKER",
  "DEPARTMENT_MANAGER",
  "INNOVATION_MANAGER",
  "INSTITUTION",
  "INDUSTRY_PARTNER",
] as const);

type CreateUserBody = {
  fullName?: string;
  email?: string;
  roleCode?: string;
  departmentId?: string;
  institutionId?: string;
  organizationId?: string;
  newOrganization?: {
    name: string;
    organizationType?: string;
    websiteUrl?: string;
    description?: string;
    domains?: string[];
    capabilities?: string[];
    technologies?: string[];
    supportTypes?: string[];
    geographicCoverage?: string[];
    contactEmail?: string;
    contactPhone?: string;
    primaryContactName?: string;
    verificationStatus?: string;
  };
  roleTitle?: string;
  isPrimaryContact?: boolean;
  employeeId?: string;
  designation?: string;
  phone?: string;
  avatarUrl?: string;
  joinedAt?: string;
  password?: string;
};

function parseOrigins(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const DEFAULT_ALLOWED_ORIGINS = ["https://civicfix.app", "http://localhost:5173", "http://localhost:3000"];

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  const envOrigins = parseOrigins(Deno.env.get("CIVICFIX_ALLOWED_ORIGINS"));
  const allowedOrigins = envOrigins.length > 0 ? envOrigins : DEFAULT_ALLOWED_ORIGINS;
  const safeOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": safeOrigin,
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

function generateSecureTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%&*?";
  const allChars = upper + lower + numbers + symbols;

  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

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

function getPrefixForRoleAndDepartment(
  roleCode: string,
  departmentName?: string | null,
  institutionAcronym?: string | null,
  organizationName?: string | null,
): string {
  if (roleCode === "INDUSTRY_PARTNER") {
    if (organizationName) {
      const acr = normalizeUsername(organizationName).slice(0, 12);
      if (acr) return `ind-${acr}`;
    }
    return "ind";
  }
  if (roleCode === "INSTITUTION") {
    if (institutionAcronym) {
      const acr = normalizeUsername(institutionAcronym);
      if (acr) return `inst-${acr}`;
    }
    return "inst";
  }
  if (roleCode === "INNOVATION_MANAGER") return "innovation-manager";
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

async function generateNextUniqueEmployeeId(
  supabaseClient: any,
  roleCode: string,
  departmentName?: string | null,
  institutionAcronym?: string | null,
  organizationName?: string | null,
): Promise<string> {
  const prefix = getPrefixForRoleAndDepartment(roleCode, departmentName, institutionAcronym, organizationName);

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
  return sanitizeErrorMessage(error);
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

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin") || request.headers.get("origin");
  const envOrigins = parseOrigins(Deno.env.get("CIVICFIX_ALLOWED_ORIGINS"));
  const allowedOrigins = envOrigins.length > 0 ? envOrigins : DEFAULT_ALLOWED_ORIGINS;

  if (origin && !allowedOrigins.includes(origin)) {
    return json(403, { error: "Origin not allowed." }, origin);
  }

  if (request.method === "OPTIONS") {
    const safeOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": safeOrigin,
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

  // =========================================================================
  // 1. AUTHENTICATE CALLER — STRICT CRYPTOGRAPHIC VERIFICATION (FAIL-CLOSED)
  // =========================================================================
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized. Missing Bearer authentication token." }, origin);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return json(401, { error: "Unauthorized. Empty Bearer authentication token." }, origin);
  }

  let currentUserId: string | null = null;
  let isServiceRole = false;

  if (token === supabaseServiceKey) {
    isServiceRole = true;
  } else {
    if (clerkSecretKey && clerkPublishableKey) {
      try {
        const authState = await clerk.authenticateRequest(request, {
          acceptsToken: "session_token",
          authorizedParties: allowedOrigins,
          secretKey: clerkSecretKey,
          publishableKey: clerkPublishableKey,
        });
        if (authState.isAuthenticated) {
          currentUserId = authState.toAuth().userId;
        }
      } catch {
        // Fallback to direct JWKS verification
      }
    }

    if (!currentUserId) {
      currentUserId = await verifyClerkSessionToken(token);
    }
    if (!currentUserId) {
      currentUserId = await verifySupabaseAuthToken(token, supabase);
    }

    if (!currentUserId) {
      return json(401, { error: "Unauthorized. Invalid, forged, or expired authentication token." }, origin);
    }
  }

  // =========================================================================
  // 2. AUTHORIZE CALLER — STRICT ADMIN ROLE CHECK
  // =========================================================================
  let adminProfile: any = null;
  if (!isServiceRole) {
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, role:roles!profiles_role_id_fkey(code)")
      .eq("clerk_user_id", currentUserId)
      .maybeSingle();

    const adminRoleRaw = profileData?.role as unknown;
    const roleCodeVal = Array.isArray(adminRoleRaw)
      ? (adminRoleRaw[0] as { code?: string } | undefined)?.code
      : (adminRoleRaw as { code?: string } | null)?.code;

    if (profileErr || !profileData || roleCodeVal !== "ADMIN") {
      return json(403, { error: "Admin access required to create staff accounts." }, origin);
    }
    adminProfile = profileData;
  }

  // Enforce server-side rate limits (Admin user: 10/min)
  const clientIp = getClientIp(request);
  const rateLimitResult = await checkRateLimits(supabase, {
    endpoint: "admin-create-user",
    userId: currentUserId,
    clientIp,
    isServiceRole,
    rules: [
      { scope: "user", limit: 10, windowSeconds: 60 },
    ],
    failClosedOnDbError: false,
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfterSeconds, origin);
  }

  // =========================================================================
  // 3. PARSE AND VALIDATE USER CREATION REQUEST BODY
  // =========================================================================
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
    return json(400, { error: "Only Municipal Officer, Department Manager, Field Worker, Innovation Manager, Institution, or Industry Partner accounts can be created." }, origin);
  }

  const normalizedEmail = normalizeEmail(email);

  const { data: roleRecord, error: roleError } = await supabase
    .from("roles")
    .select("id, code, name")
    .eq("code", roleCode)
    .maybeSingle();

  if (roleError || !roleRecord) {
    return json(400, { error: `Invalid role code: ${roleCode}` }, origin);
  }

  const departmentId = body.departmentId?.trim() || null;
  const institutionId = body.institutionId?.trim() || null;
  let organizationId = body.organizationId?.trim() || null;
  const newOrg = body.newOrganization;
  let organizationName: string | null = null;

  if (roleCode === "DEPARTMENT_MANAGER" || roleCode === "FIELD_WORKER" || roleCode === "MUNICIPAL_OFFICER") {
    if (!departmentId) {
      return json(400, { error: "Department selection is required for municipal staff accounts." }, origin);
    }
  }

  if (roleCode === "INSTITUTION") {
    if (!institutionId) {
      return json(400, { error: "Institution selection is required for university research coordinator accounts." }, origin);
    }
  }

  if (roleCode === "INDUSTRY_PARTNER") {
    if (newOrg && typeof newOrg === "object" && newOrg.name?.trim()) {
      const validOrgTypes = new Set(["COMPANY", "STARTUP", "NGO", "RESEARCH_LAB", "FOUNDATION"]);
      const orgType = validOrgTypes.has(newOrg.organizationType ?? "") ? newOrg.organizationType! : "COMPANY";
      const validVerif = new Set(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]);
      const verifStatus = validVerif.has(newOrg.verificationStatus ?? "") ? newOrg.verificationStatus! : "VERIFIED";

      const { data: createdOrg, error: orgErr } = await supabase
        .from("industry_organizations")
        .insert({
          name: newOrg.name.trim(),
          organization_type: orgType,
          verification_status: verifStatus,
          website_url: newOrg.websiteUrl?.trim() || null,
          description: newOrg.description?.trim() || null,
          domains: Array.isArray(newOrg.domains) ? newOrg.domains : [],
          capabilities: Array.isArray(newOrg.capabilities) ? newOrg.capabilities : [],
          technologies: Array.isArray(newOrg.technologies) ? newOrg.technologies : [],
          support_types: Array.isArray(newOrg.supportTypes) ? newOrg.supportTypes : [],
          geographic_coverage: Array.isArray(newOrg.geographicCoverage) ? newOrg.geographicCoverage : ["Pan-India"],
          contact_email: newOrg.contactEmail?.trim() || normalizedEmail || null,
          contact_phone: newOrg.contactPhone?.trim() || phone || null,
          primary_contact_name: newOrg.primaryContactName?.trim() || fullName || null,
          verified_at: verifStatus === "VERIFIED" ? new Date().toISOString() : null,
          verified_by: verifStatus === "VERIFIED" ? (adminProfile?.id || null) : null,
        })
        .select("id, name")
        .single();

      if (orgErr || !createdOrg) {
        return json(500, { error: `Failed to create company/organization: ${getSafeErrorMessage(orgErr)}` }, origin);
      }
      organizationId = createdOrg.id;
      organizationName = createdOrg.name;
    } else if (organizationId) {
      const { data: orgData } = await supabase.from("industry_organizations").select("name").eq("id", organizationId).maybeSingle();
      if (!orgData) {
        return json(400, { error: "The selected organization does not exist." }, origin);
      }
      organizationName = orgData.name;
    } else {
      return json(400, { error: "Please select an existing organization or provide details to register a new company/startup." }, origin);
    }
  }

  let departmentName: string | null = null;
  if (departmentId) {
    const { data: deptData } = await supabase.from("departments").select("name, is_active").eq("id", departmentId).maybeSingle();
    if (!deptData || !deptData.is_active) {
      return json(400, { error: "The selected department does not exist or is inactive." }, origin);
    }
    departmentName = deptData.name;
  }

  let institutionName: string | null = null;
  let institutionAcronym: string | null = null;
  if (institutionId) {
    const { data: instData } = await supabase.from("institutions").select("name, acronym, is_active").eq("id", institutionId).maybeSingle();
    if (!instData || !instData.is_active) {
      return json(400, { error: "The selected institution does not exist or is inactive." }, origin);
    }
    institutionName = instData.name;
    institutionAcronym = instData.acronym;
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, clerk_user_id, employee_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    return json(409, { error: `An account with email address '${normalizedEmail}' already exists in the system.` }, origin);
  }

  let canonicalUsername = normalizeUsername(body.employeeId ?? "");
  if (!canonicalUsername) {
    canonicalUsername = await generateNextUniqueEmployeeId(
      supabase,
      roleCode,
      departmentName,
      institutionAcronym,
      organizationName,
    );
  }

  let existingClerkUser = null;
  try {
    const foundUsers = await clerk.users.getUserList({ emailAddress: [normalizedEmail] });
    existingClerkUser = foundUsers.data?.[0] ?? null;
  } catch {
    // Ignore error
  }

  if (existingClerkUser) {
    return json(409, { error: `A authentication identity with email '${normalizedEmail}' already exists.` }, origin);
  }

  const temporaryPassword = body.password?.trim() || generateSecureTemporaryPassword();
  const { firstName, lastName } = parseName(fullName);

  let clerkUser;
  try {
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
          institution: institutionName,
          organization: organizationName,
          employeeId: canonicalUsername,
        },
      });
    } catch (createErr) {
      clerkUser = await clerk.users.createUser({
        emailAddress: [normalizedEmail],
        password: temporaryPassword,
        firstName: firstName || fullName,
        lastName,
        publicMetadata: {
          role: roleCode,
          department: departmentName,
          institution: institutionName,
          organization: organizationName,
          employeeId: canonicalUsername,
        },
      });
    }
  } catch (error) {
    console.error("Clerk user creation error:", error);
    if (isDuplicateEmailError(error)) {
      return json(409, { error: `The email address '${normalizedEmail}' is already registered in Clerk.` }, origin);
    }
    return json(500, { error: `Failed to create authentication user account: ${getSafeErrorMessage(error)}` }, origin);
  }

  // Auto-verify email
  try {
    const userDetail = await clerk.users.getUser(clerkUser.id);
    const primaryEmailObj = userDetail.emailAddresses.find((e) => e.emailAddress.toLowerCase() === normalizedEmail);
    if (primaryEmailObj && !primaryEmailObj.verification?.status?.includes("verified")) {
      const tokenRes = await fetch(`https://api.clerk.com/v1/email_addresses/${primaryEmailObj.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verified: true }),
      });
      if (!tokenRes.ok) {
        console.warn("Auto-verify email endpoint failed", await tokenRes.text());
      }
    }
  } catch (verifyErr) {
    console.warn("Failed to auto-verify primary email address:", verifyErr);
  }

  let profileRecord;
  try {
    const { data: profileData, error: profileInsertError } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: clerkUser.id,
        full_name: fullName,
        email: normalizedEmail,
        phone,
        avatar_url: avatarUrl,
        role_id: roleRecord.id,
        department_id: departmentId,
        institution_id: institutionId,
        organization_id: organizationId,
        employee_id: canonicalUsername,
        designation,
        is_active: true,
        joined_at: joinedAt,
      })
      .select(`
        id,
        clerk_user_id,
        full_name,
        email,
        phone,
        employee_id,
        designation,
        is_active,
        joined_at,
        role:roles!profiles_role_id_fkey(code, name),
        department:departments!profiles_department_id_fkey(id, name, code)
      `)
      .single();

    if (profileInsertError) {
      console.error("Supabase profile insertion error:", profileInsertError);
      try {
        await clerk.users.deleteUser(clerkUser.id);
      } catch (rollbackErr) {
        console.error("Failed to rollback Clerk user after DB profile insertion failed:", rollbackErr);
      }
      return json(500, { error: `Failed to create staff profile: ${profileInsertError.message}` }, origin);
    }

    profileRecord = profileData;
  } catch (err: any) {
    console.error("Unexpected error during profile creation:", err);
    try {
      await clerk.users.deleteUser(clerkUser.id);
    } catch {}
    return json(500, { error: "Failed to persist user profile record." }, origin);
  }

  // Handle junction table associations
  if (roleCode === "INSTITUTION" && institutionId) {
    try {
      await supabase.from("institution_members").insert({
        institution_id: institutionId,
        profile_id: profileRecord.id,
        role_title: body.roleTitle || designation || "Research Coordinator",
        is_primary_contact: Boolean(body.isPrimaryContact),
      });
    } catch (instMemberErr) {
      console.warn("Failed to insert institution_members record:", instMemberErr);
    }
  }

  if (roleCode === "INDUSTRY_PARTNER" && organizationId) {
    try {
      await supabase.from("industry_organization_members").insert({
        organization_id: organizationId,
        profile_id: profileRecord.id,
        role_title: body.roleTitle || designation || "Partner Representative",
        is_primary_contact: Boolean(body.isPrimaryContact ?? true),
      });
    } catch (orgMemberErr) {
      console.warn("Failed to insert industry_organization_members record:", orgMemberErr);
    }
  }

  return json(
    200,
    {
      success: true,
      message: `Staff account created successfully for ${fullName}.`,
      user: {
        profileId: profileRecord.id,
        clerkUserId: clerkUser.id,
        fullName,
        email: normalizedEmail,
        employeeId: canonicalUsername,
        username: canonicalUsername,
        temporaryPassword,
        roleCode: roleRecord.code,
        roleName: roleRecord.name,
        departmentId,
        departmentName,
        institutionId,
        institutionName,
        organizationId,
        organizationName,
        phone,
        designation,
        joinedAt,
      },
    },
    origin,
  );
});
