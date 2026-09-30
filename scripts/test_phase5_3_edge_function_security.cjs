const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env if present
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
} catch {
  // Ignore
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fzatlgzittpguemzbdkm.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_79XhVwdn8WpQYA2In1HjOQ_S7zYP05f";

const ENDPOINTS = [
  "analyze-issue",
  "transcribe-voice",
  "detect-duplicates",
  "generate-challenge",
  "match-institutions",
  "admin-create-user",
  "admin-delete-user"
];

function sendRequest(endpoint, options = {}, body = null) {
  const url = new URL(`${SUPABASE_URL}/functions/v1/${endpoint}`);
  const reqOptions = {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      ...options.headers
    }
  };

  const payload = body ? JSON.stringify(body) : "";
  if (body) {
    reqOptions.headers["Content-Length"] = Buffer.byteLength(payload);
  }

  return new Promise((resolve) => {
    const req = https.request(url, reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on("error", (err) => {
      resolve({ status: 0, error: err.message });
    });

    if (body) req.write(payload);
    req.end();
  });
}

async function runSecuritySuite() {
  console.log("================================================================================");
  console.log("CIVICFIX PHASE 5.3 — REMEDIATED EDGE FUNCTION SECURITY REGRESSION SUITE");
  console.log("================================================================================");
  console.log(`Target Base URL: ${SUPABASE_URL}/functions/v1/`);

  let passedTests = 0;
  let totalTests = 0;

  function assertResult(testName, condition, detail = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName} - ${detail}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. EF-01: UNVERIFIED JWT FALLBACK & AUTHENTICATION HARDENING
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 1: EF-01 — CRYPTOGRAPHIC AUTHENTICATION (ALL ENDPOINTS) ---");

  for (const ep of ENDPOINTS) {
    // 1a. Missing token (Anonymous)
    const resAnon = await sendRequest(ep, { method: "POST" }, { test: "data" });
    const isAnonRejected = resAnon.status === 401 || resAnon.status === 403;
    assertResult(`[${ep}] Anonymous POST rejected (HTTP 401/403)`, isAnonRejected, `Got HTTP ${resAnon.status}`);

    // 1b. Forged Token with tampered signature
    const forgedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const forgedPayload = Buffer.from(JSON.stringify({
      sub: "user_fake_admin_123",
      role: "ADMIN",
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString("base64url");
    const forgedToken = `${forgedHeader}.${forgedPayload}.invalid_forged_signature`;

    const resForged = await sendRequest(ep, {
      method: "POST",
      headers: { "Authorization": `Bearer ${forgedToken}` }
    }, { test: "data" });
    const isForgedRejected = resForged.status === 401 || resForged.status === 403;
    assertResult(`[${ep}] Forged JWT with fake signature rejected (HTTP 401/403)`, isForgedRejected, `Got HTTP ${resForged.status}: ${JSON.stringify(resForged.data)}`);

    // 1c. Malformed token
    const resMalformed = await sendRequest(ep, {
      method: "POST",
      headers: { "Authorization": "Bearer not_a_valid_jwt_token_at_all" }
    }, { test: "data" });
    const isMalformedRejected = resMalformed.status === 401 || resMalformed.status === 403;
    assertResult(`[${ep}] Malformed Bearer token rejected (HTTP 401/403)`, isMalformedRejected, `Got HTTP ${resMalformed.status}`);
  }

  // ---------------------------------------------------------------------------
  // 2. EF-02: AUXILIARY SEEDING / MIGRATION ACTIONS REMOVAL IN ADMIN-CREATE-USER
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: EF-02 — AUXILIARY ACTIONS REMOVAL ---");
  const auxActions = ["get-sign-in-token", "reassign-iits-emails", "verify-all-institution-emails", "batch-seed-50-companies"];

  for (const actionName of auxActions) {
    const resAux = await sendRequest("admin-create-user", {
      method: "POST",
      headers: { "Authorization": "Bearer invalid_token" }
    }, { action: actionName });
    // Should be rejected at auth layer before any action parsing occurs
    const isRejected = resAux.status === 401 || resAux.status === 403;
    assertResult(`[admin-create-user] Action '${actionName}' unauthorized request rejected`, isRejected, `Got HTTP ${resAux.status}`);
  }

  // ---------------------------------------------------------------------------
  // 3. EF-03: DUPLICATE DETECTION CITIZEN OWNERSHIP & RATE LIMIT
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: EF-03 — DUPLICATE DETECTION RATE LIMIT & OWNERSHIP ---");
  // Test invalid issue_id payload under unauthenticated caller
  const resDupAnon = await sendRequest("detect-duplicates", { method: "POST" }, { issue_id: "00000000-0000-0000-0000-000000000000" });
  assertResult("[detect-duplicates] Unauthenticated call rejected (HTTP 401)", resDupAnon.status === 401, `Got HTTP ${resDupAnon.status}`);

  // ---------------------------------------------------------------------------
  // 4. EF-04: ERROR DIAGNOSTIC INFORMATION LEAKAGE PREVENTION
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: EF-04 — ERROR SANITIZATION & LEAKAGE PREVENTION ---");

  for (const ep of ["transcribe-voice", "generate-challenge", "match-institutions"]) {
    const resErr = await sendRequest(ep, { method: "POST" }, { dummy: "payload" });
    const jsonStr = JSON.stringify(resErr.data || "");
    const leaksApiKey = jsonStr.includes("key=") && !jsonStr.includes("REDACTED");
    const leaksDiagnostics = jsonStr.includes('"diagnostics":[');
    const leaksUpstreamUrl = jsonStr.includes("generativelanguage.googleapis.com");

    assertResult(`[${ep}] Does not leak API keys in response body`, !leaksApiKey, `Response leaked API key: ${jsonStr.slice(0, 100)}`);
    assertResult(`[${ep}] Does not leak diagnostics array in response body`, !leaksDiagnostics, `Response leaked diagnostics: ${jsonStr.slice(0, 100)}`);
    assertResult(`[${ep}] Does not leak raw upstream API URLs in response body`, !leaksUpstreamUrl, `Response leaked upstream URL: ${jsonStr.slice(0, 100)}`);
  }

  // ---------------------------------------------------------------------------
  // 5. EF-06: CORS ORIGIN WHITELIST ENFORCEMENT ON ADMIN ENDPOINTS
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: EF-06 — CORS ORIGIN WHITELIST ENFORCEMENT ---");

  for (const ep of ["admin-create-user", "admin-delete-user"]) {
    const resCorsDisallowed = await sendRequest(ep, {
      method: "OPTIONS",
      headers: {
        "Origin": "https://malicious-attacker-domain.com",
        "Access-Control-Request-Method": "POST"
      }
    });

    const returnedOrigin = resCorsDisallowed.headers ? resCorsDisallowed.headers["access-control-allow-origin"] : undefined;
    const isWildcard = returnedOrigin === "*";
    const isDisallowedRefused = !isWildcard && returnedOrigin !== "https://malicious-attacker-domain.com";

    assertResult(`[${ep}] CORS does not return wildcard '*' or echo disallowed origin`, isDisallowedRefused, `Returned Allow-Origin: ${returnedOrigin}`);
  }

  console.log("\n================================================================================");
  console.log(`REGRESSION SUITE SUMMARY: ${passedTests} / ${totalTests} assertions passed.`);
  console.log("================================================================================");
}

runSecuritySuite();
