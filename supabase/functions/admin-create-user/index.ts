/// <reference path="../deno.d.ts" />

import { createClerkClient } from "npm:@clerk/backend";
import { createClient } from "npm:@supabase/supabase-js";

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
  action?: string;
  companies?: Array<any>;
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

  const adminRoleRaw = adminProfile?.role as unknown;
  const roleCodeVal = Array.isArray(adminRoleRaw)
    ? (adminRoleRaw[0] as { code?: string } | undefined)?.code
    : (adminRoleRaw as { code?: string } | null)?.code;

  if (profileErr || !adminProfile || roleCodeVal !== "ADMIN") {
    return json(403, { error: "Admin access required to create staff accounts." }, origin);
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return json(400, { error: "Invalid JSON request body." }, origin);
  }

  if ((body as any).action === "get-sign-in-token") {
    const targetEmail = (body as any).email;
    const targetUserId = (body as any).userId;

    let clerkId = targetUserId;
    if (!clerkId && targetEmail) {
      const { data: p } = await supabase.from("profiles").select("clerk_user_id").eq("email", targetEmail).maybeSingle();
      clerkId = p?.clerk_user_id;
    }

    if (!clerkId) {
      return json(400, { error: "Could not find clerk user for this email." }, origin);
    }

    const tokenRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: clerkId,
        expires_in_seconds: 2592000,
      }),
    });

    const tokenData = await tokenRes.json();
    return json(tokenRes.status, tokenData, origin);
  }

  if ((body as any).action === "reassign-iits-emails") {
    const passwordToSet = (body as any).password || "CivicFix@2026!";
    const updates = [
      {
        instName: "IIT Bombay",
        instId: "bd5b419b-7f6f-44fd-934a-eaa28f4cb740",
        newEmail: "hkumarpandey10@gmail.com",
        fullName: "Prof. Rajesh Sharma",
      },
      {
        instName: "IIT Delhi",
        instId: "264ad154-c527-471c-a971-6c64b15c1efb",
        newEmail: "hkumarpandey07@gmail.com",
        fullName: "Prof. Amit Verma",
      },
    ];

    const report: any[] = [];

    // 1. Process IIT Bombay and IIT Delhi
    for (const u of updates) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, clerk_user_id, email")
        .eq("institution_id", u.instId)
        .maybeSingle();

      if (!p || !p.clerk_user_id) {
        report.push({ instName: u.instName, error: "Profile not found" });
        continue;
      }

      // Add new email address to Clerk
      const addEmailRes = await fetch("https://api.clerk.com/v1/email_addresses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: p.clerk_user_id,
          email_address: u.newEmail,
          verified: true,
          primary: true,
        }),
      });

      const addEmailData = await addEmailRes.json();

      // Fetch user to get old email addresses and remove them
      const userRes = await fetch(`https://api.clerk.com/v1/users/${p.clerk_user_id}`, {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      });
      const userData = await userRes.json();
      const emails = userData.email_addresses || [];
      for (const em of emails) {
        if (em.email_address !== u.newEmail) {
          try {
            await fetch(`https://api.clerk.com/v1/email_addresses/${em.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${clerkSecretKey}` },
            });
          } catch {}
        }
      }

      // Set password
      await fetch(`https://api.clerk.com/v1/users/${p.clerk_user_id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: passwordToSet }),
      });

      // Update Supabase profile
      await supabase
        .from("profiles")
        .update({ email: u.newEmail })
        .eq("id", p.id);

      // Generate sign in ticket
      const ticketRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: p.clerk_user_id, expires_in_seconds: 2592000 }),
      });
      const ticketData = await ticketRes.json();

      report.push({
        institution: u.instName,
        email: u.newEmail,
        password: passwordToSet,
        clerkUserId: p.clerk_user_id,
        addEmailStatus: addEmailRes.status,
        ticketUrl: ticketData.url,
      });
    }

    // 2. Process IIT Madras with abhishek.t.2907@gmail.com
    const madrasId = "803e6be9-6f70-46c4-89f0-ced999fd3c69";
    const { data: abhishekProfile } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, email, full_name")
      .eq("email", "abhishek.t.2907@gmail.com")
      .maybeSingle();

    if (abhishekProfile && abhishekProfile.clerk_user_id) {
      // Find and remove dummy IIT Madras coordinator
      const { data: dummyMadras } = await supabase
        .from("profiles")
        .select("id, clerk_user_id")
        .eq("institution_id", madrasId)
        .neq("id", abhishekProfile.id)
        .maybeSingle();

      if (dummyMadras) {
        await supabase.from("institution_members").delete().eq("institution_id", madrasId);
        await supabase.from("profiles").delete().eq("id", dummyMadras.id);
        if (dummyMadras.clerk_user_id) {
          try {
            await fetch(`https://api.clerk.com/v1/users/${dummyMadras.clerk_user_id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${clerkSecretKey}` },
            });
          } catch {}
        }
      }

      // Update Abhishek Tiwari to INSTITUTION role & IIT Madras
      const { data: instRole } = await supabase.from("roles").select("id").eq("code", "INSTITUTION").single();
      if (instRole) {
        await supabase
          .from("profiles")
          .update({
            role_id: instRole.id,
            institution_id: madrasId,
            employee_id: "inst-003",
            designation: "Nodal Research & Innovation Coordinator",
          })
          .eq("id", abhishekProfile.id);

        await supabase.from("institution_members").insert({
          institution_id: madrasId,
          profile_id: abhishekProfile.id,
          role_title: "Nodal Research & Innovation Coordinator",
          is_primary_contact: true,
        });

        // Update Clerk metadata & password
        await fetch(`https://api.clerk.com/v1/users/${abhishekProfile.clerk_user_id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: passwordToSet,
            public_metadata: {
              role: "INSTITUTION",
              institution: "IIT Madras",
              employeeId: "inst-003",
            },
          }),
        });

        // Generate ticket
        const ticketRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: abhishekProfile.clerk_user_id, expires_in_seconds: 2592000 }),
        });
        const ticketData = await ticketRes.json();

        report.push({
          institution: "IIT Madras",
          email: "abhishek.t.2907@gmail.com",
          fullName: abhishekProfile.full_name,
          password: passwordToSet,
          clerkUserId: abhishekProfile.clerk_user_id,
          ticketUrl: ticketData.url,
        });
      }
    } else {
      report.push({ institution: "IIT Madras", error: "Abhishek Tiwari profile not found" });
    }

    return json(200, { success: true, report }, origin);
  }

  // Support batch email verification for institution accounts
  if ((body as any).action === "verify-all-institution-emails") {
    const { data: instProfiles, error: fetchErr } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, email, full_name, role:roles!profiles_role_id_fkey(code)");

    if (fetchErr) {
      return json(500, { error: `Failed to fetch profiles: ${fetchErr.message}` }, origin);
    }

    const filtered = (instProfiles || []).filter((p: any) => {
      const r = Array.isArray(p.role) ? p.role[0]?.code : p.role?.code;
      return r === "INSTITUTION" && p.clerk_user_id;
    });

    const results = [];
    for (const p of filtered) {
      try {
        const uRes = await fetch(`https://api.clerk.com/v1/users/${p.clerk_user_id}`, {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
        });
        if (!uRes.ok) {
          results.push({ email: p.email, error: `Clerk fetch error ${uRes.status}` });
          continue;
        }
        const uData = await uRes.json();
        const emails = uData.email_addresses || [];
        for (const e of emails) {
          if (e.verification?.status !== "verified") {
            const patchRes = await fetch(`https://api.clerk.com/v1/email_addresses/${e.id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ verified: true }),
            });
            const patchData = await patchRes.json();
            results.push({
              email: p.email,
              emailId: e.id,
              patchStatus: patchRes.status,
              verified: patchData.verification?.status === "verified",
            });
          } else {
            results.push({ email: p.email, alreadyVerified: true });
          }
        }
      } catch (err: any) {
        results.push({ email: p.email, error: err.message });
      }
    }

    return json(200, { success: true, count: results.length, results }, origin);
  }

  // Batch seed companies action
  if ((body as any).action === "batch-seed-50-companies") {
    const companiesInput = Array.isArray(body.companies) && body.companies.length > 0 ? body.companies : null;
    if (!companiesInput) {
      return json(400, { error: "No companies list provided in request body." }, origin);
    }
    const defaultPassword = body.password || "CivicFix@Partner2026!";

    // Resolve INDUSTRY_PARTNER role ID
    const { data: roleRecord } = await supabase.from("roles").select("id, code, name").eq("code", "INDUSTRY_PARTNER").single();
    if (!roleRecord) {
      return json(500, { error: "INDUSTRY_PARTNER role not found in database." }, origin);
    }

    const report: any[] = [];

    for (const c of companiesInput) {
      const email = normalizeEmail(c.email || c.contactEmail);
      const fullName = (c.primaryContactName || c.fullName || "Partner Representative").trim();
      const phone = c.phone || c.contactPhone || null;
      const designation = c.designation || "Primary Partner Representative";
      const orgName = (c.name || c.organizationName).trim();
      const orgType = c.organizationType || "COMPANY";
      const verifStatus = c.verificationStatus || "VERIFIED";

      // 1. Check or Insert industry_organizations
      let orgId = c.organizationId;
      if (!orgId) {
        const { data: existingOrg } = await supabase
          .from("industry_organizations")
          .select("id, name")
          .ilike("name", orgName)
          .maybeSingle();

        if (existingOrg) {
          orgId = existingOrg.id;
        } else {
          const { data: insertedOrg, error: orgErr } = await supabase
            .from("industry_organizations")
            .insert({
              name: orgName,
              organization_type: orgType,
              verification_status: verifStatus,
              website_url: c.websiteUrl || null,
              description: c.description || null,
              domains: Array.isArray(c.domains) ? c.domains : [],
              capabilities: Array.isArray(c.capabilities) ? c.capabilities : [],
              technologies: Array.isArray(c.technologies) ? c.technologies : [],
              support_types: Array.isArray(c.supportTypes) ? c.supportTypes : [],
              geographic_coverage: Array.isArray(c.geographicCoverage) ? c.geographicCoverage : ["Pan-India"],
              contact_email: email,
              contact_phone: phone,
              primary_contact_name: fullName,
              verified_at: verifStatus === "VERIFIED" ? new Date().toISOString() : null,
              verified_by: verifStatus === "VERIFIED" ? adminProfile.id : null,
            })
            .select("id, name")
            .single();

          if (orgErr || !insertedOrg) {
            report.push({ name: orgName, email, error: `Org insert failed: ${getSafeErrorMessage(orgErr)}` });
            continue;
          }
          orgId = insertedOrg.id;
        }
      }

      // 2. Determine canonical username
      let canonicalUsername = normalizeUsername(c.employeeId || c.username || "");
      if (!canonicalUsername) {
        canonicalUsername = await generateNextUniqueEmployeeId(supabase, "INDUSTRY_PARTNER", null, null, orgName);
      }

      const passwordToUse = c.password || defaultPassword;
      const { firstName, lastName } = parseName(fullName);

      // 3. Create or Update Clerk user
      let clerkUserId: string | null = null;
      try {
        // Try searching if profile with email exists
        const { data: existingProf } = await supabase.from("profiles").select("id, clerk_user_id").eq("email", email).maybeSingle();
        if (existingProf?.clerk_user_id) {
          clerkUserId = existingProf.clerk_user_id;
          // Update password & metadata in Clerk
          await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              password: passwordToUse,
              public_metadata: {
                role: "INDUSTRY_PARTNER",
                organization: orgName,
                organizationId: orgId,
                employeeId: canonicalUsername,
              },
            }),
          });
        } else {
          // Create new user in Clerk
          let clerkUser;
          try {
            clerkUser = await clerk.users.createUser({
              emailAddress: [email],
              password: passwordToUse,
              firstName: firstName || fullName,
              lastName,
              username: canonicalUsername,
              publicMetadata: {
                role: "INDUSTRY_PARTNER",
                organization: orgName,
                organizationId: orgId,
                employeeId: canonicalUsername,
              },
            });
          } catch {
            clerkUser = await clerk.users.createUser({
              emailAddress: [email],
              password: passwordToUse,
              firstName: firstName || fullName,
              lastName,
              publicMetadata: {
                role: "INDUSTRY_PARTNER",
                organization: orgName,
                organizationId: orgId,
                employeeId: canonicalUsername,
              },
            });
          }
          clerkUserId = clerkUser.id;
        }

        // Auto verify email
        if (clerkUserId) {
          const uRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
            headers: { Authorization: `Bearer ${clerkSecretKey}` },
          });
          if (uRes.ok) {
            const uData = await uRes.json();
            for (const em of uData.email_addresses || []) {
              if (em.verification?.status !== "verified") {
                await fetch(`https://api.clerk.com/v1/email_addresses/${em.id}`, {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${clerkSecretKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ verified: true }),
                });
              }
            }
          }
        }
      } catch (clerkErr) {
        report.push({ name: orgName, email, error: `Clerk creation failed: ${getSafeErrorMessage(clerkErr)}` });
        continue;
      }

      // 4. Upsert Profile in Supabase
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .upsert(
          {
            clerk_user_id: clerkUserId,
            full_name: fullName,
            email,
            phone,
            role_id: roleRecord.id,
            organization_id: orgId,
            employee_id: canonicalUsername,
            designation,
            is_active: true,
            joined_at: new Date().toISOString().split("T")[0],
          },
          { onConflict: "clerk_user_id" },
        )
        .select("id, email, employee_id")
        .single();

      if (profErr) {
        report.push({ name: orgName, email, error: `Profile upsert failed: ${getSafeErrorMessage(profErr)}` });
      } else {
        report.push({
          organizationName: orgName,
          organizationType: orgType,
          organizationId: orgId,
          email,
          username: canonicalUsername,
          password: passwordToUse,
          fullName,
          designation,
          profileId: prof?.id,
          clerkUserId,
          status: "SUCCESS",
        });
      }
    }

    return json(200, { success: true, count: report.length, report }, origin);
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

  const departmentId = body.departmentId?.trim() || null;
  if ((roleCode === "DEPARTMENT_MANAGER" || roleCode === "FIELD_WORKER") && !departmentId) {
    return json(400, { error: "A department assignment is required for Department Manager and Field Worker roles." }, origin);
  }

  const institutionId = body.institutionId?.trim() || null;
  if (roleCode === "INSTITUTION" && !institutionId) {
    return json(400, { error: "An institution must be selected for Institution accounts." }, origin);
  }

  let organizationId = body.organizationId?.trim() || null;
  let organizationName: string | null = null;

  if (roleCode === "INDUSTRY_PARTNER") {
    if (body.newOrganization && body.newOrganization.name?.trim()) {
      const newOrg = body.newOrganization;
      const validTypes = new Set(["COMPANY", "STARTUP", "INDUSTRY", "RESEARCH_ORGANIZATION", "NONPROFIT", "OTHER"]);
      const orgType = validTypes.has(newOrg.organizationType ?? "") ? newOrg.organizationType! : "COMPANY";
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
          verified_by: verifStatus === "VERIFIED" ? adminProfile.id : null,
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
    canonicalUsername = await generateNextUniqueEmployeeId(supabase, roleCode, departmentName, institutionAcronym, organizationName);
  }

  const { data: existingEmp } = await supabase
    .from("profiles")
    .select("id")
    .eq("employee_id", canonicalUsername)
    .maybeSingle();

  if (existingEmp) {
    canonicalUsername = await generateNextUniqueEmployeeId(supabase, roleCode, departmentName, institutionAcronym, organizationName);
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
          institution: institutionName,
          organization: organizationName,
          organizationId: organizationId,
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
            institution: institutionName,
            organization: organizationName,
            organizationId: organizationId,
            employeeId: canonicalUsername,
          },
        });
      } else {
        throw createErr;
      }
    }

    createdClerkUserId = clerkUser.id;

    // Auto-verify email address in Clerk so user is not blocked on OTP
    try {
      const emailList = clerkUser.emailAddresses || [];
      for (const em of emailList) {
        if (em.id) {
          await fetch(`https://api.clerk.com/v1/email_addresses/${em.id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ verified: true }),
          });
        }
      }
    } catch (vErr) {
      console.warn("Auto-verify email non-fatal error:", vErr);
    }
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
        institution_id: institutionId,
        organization_id: organizationId,
        employee_id: canonicalUsername,
        designation: designation || (roleCode === "INSTITUTION" ? (body.roleTitle?.trim() || "Institution Coordinator") : (roleCode === "INDUSTRY_PARTNER" ? "Partner Representative" : null)),
        joined_at: joinedAt,
        is_active: true,
        avatar_url: avatarUrl,
      })
      .select("id, full_name, email, phone, employee_id, designation, is_active, avatar_url, role:roles!profiles_role_id_fkey(code, name), department:departments!profiles_department_id_fkey(id, name), organization_id")
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

    // If INSTITUTION role, record membership in institution_members
    if (roleCode === "INSTITUTION" && institutionId) {
      const { error: memberError } = await supabase
        .from("institution_members")
        .insert({
          institution_id: institutionId,
          profile_id: createdProfile.id,
          role_title: body.roleTitle?.trim() || "Institution Coordinator",
          is_primary_contact: Boolean(body.isPrimaryContact),
        });

      if (memberError) {
        console.error("admin-create-user institution member failed, rolling back", memberError);
        await supabase.from("profiles").delete().eq("id", createdProfile.id);
        try {
          await clerk.users.deleteUser(createdClerkUserId);
        } catch {}
        return json(500, { error: `Failed to link institution membership: ${getSafeErrorMessage(memberError)}` }, origin);
      }
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
          departmentName: deptObj?.name ?? (departmentName || (institutionName ? institutionName : (organizationName ? organizationName : "Cross-Departmental"))),
          institutionId,
          institutionName,
          organizationId,
          organizationName,
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
