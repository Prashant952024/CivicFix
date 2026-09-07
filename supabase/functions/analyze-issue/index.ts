/// <reference path="../deno.d.ts" />

import { createClient } from "npm:@supabase/supabase-js";

const ALLOWED_CATEGORIES = [
  "Pothole",
  "Garbage",
  "Streetlight",
  "Water Supply",
  "Drainage",
  "Road Damage",
  "Traffic/Safety",
  "Other",
] as const;

const ALLOWED_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type IssueSeverity = (typeof ALLOWED_SEVERITIES)[number];
type IssuePriority = (typeof ALLOWED_PRIORITIES)[number];

type AnalyzeIssueRequestBody = {
  issue_id?: string;
  issueId?: string;
  dry_run?: boolean;
  benchmark_issue?: {
    id?: string;
    title: string;
    description: string;
    category?: string;
    address_text?: string;
    location_text?: string;
    latitude?: number;
    longitude?: number;
  };
};

type GeminiStructuredOutput = {
  category?: string;
  severity?: string;
  priority?: string;
  department?: string;
  confidence?: number;
  explanation?: string;
  root_problem_summary?: string;
  operationally_resolvable?: boolean;
  existing_solution_available?: boolean;
  innovation_need?: boolean;
  operational_resolvability?: {
    is_operationally_resolvable?: boolean;
    known_sop_available?: boolean;
    operational_assessment_notes?: string;
  };
  systemic_innovation_need?: {
    requires_research_or_experimentation?: boolean;
    requires_predictive_or_sensors?: boolean;
    requires_cross_domain_coordination?: boolean;
    innovation_assessment_notes?: string;
  };
  issue_type?: string;
  complexity_score?: number;
  complexity_reasoning?: string;
  classification_confidence?: number;
  classification_note?: string;
  complexity_factors?: {
    systemic_problem?: boolean;
    recurring_problem?: boolean;
    multi_domain?: boolean;
    research_required?: boolean;
    technology_potential?: boolean;
    large_scale_impact?: boolean;
    multiple_stakeholders?: boolean;
    existing_municipal_solution?: boolean;
  };
  required_expertise?: string[];
};

function json(status: number, body: Record<string, unknown>, origin: string | null = "*") {
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

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  const upper = value.trim().toUpperCase() as T;
  return allowed.includes(upper) ? upper : fallback;
}

function matchDepartment(
  suggestedName: unknown,
  activeDepartments: Array<{ id: string; name: string; code?: string | null; description?: string | null }>,
): string {
  if (activeDepartments.length === 0) {
    return "";
  }

  if (typeof suggestedName !== "string" || !suggestedName.trim()) {
    return activeDepartments[0].name;
  }

  const clean = suggestedName.trim().toLowerCase();

  // 1. Exact case-insensitive match on name
  const exactName = activeDepartments.find((d) => d.name.toLowerCase() === clean);
  if (exactName) return exactName.name;

  // 2. Exact match on code
  const exactCode = activeDepartments.find((d) => d.code && d.code.toLowerCase() === clean);
  if (exactCode) return exactCode.name;

  // 3. Substring match
  const substringMatch = activeDepartments.find(
    (d) => d.name.toLowerCase().includes(clean) || clean.includes(d.name.toLowerCase()),
  );
  if (substringMatch) return substringMatch.name;

  // 4. Word/token overlap scoring against dynamic active departments
  const cleanTokens = clean.split(/[\s,._\-/]+/).filter((t) => t.length > 2);
  let bestDept = activeDepartments[0];
  let maxScore = 0;

  for (const dept of activeDepartments) {
    const deptTokens = `${dept.name} ${dept.code || ""} ${dept.description || ""}`
      .toLowerCase()
      .split(/[\s,._\-/]+/)
      .filter((t) => t.length > 2);

    let score = 0;
    for (const token of cleanTokens) {
      if (deptTokens.includes(token)) {
        score += 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestDept = dept;
    }
  }

  if (maxScore > 0) {
    return bestDept.name;
  }

  // Fallback to first active department
  return activeDepartments[0].name;
}

function matchCategory(suggested: unknown, fallbackCategory: string): string {
  if (typeof suggested !== "string" || !suggested.trim()) {
    return (ALLOWED_CATEGORIES as readonly string[]).includes(fallbackCategory) ? fallbackCategory : "Other";
  }

  const clean = suggested.trim().toLowerCase();
  for (const cat of ALLOWED_CATEGORIES) {
    if (cat.toLowerCase() === clean) return cat;
  }

  for (const cat of ALLOWED_CATEGORIES) {
    if (clean.includes(cat.toLowerCase()) || cat.toLowerCase().includes(clean)) {
      return cat;
    }
  }

  return (ALLOWED_CATEGORIES as readonly string[]).includes(fallbackCategory) ? fallbackCategory : "Other";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return json(200, { ok: true }, origin);
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." }, origin);
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    console.error("[analyze-issue] Server misconfiguration: Missing GEMINI_API_KEY");
    return json(500, { error: "AI service configuration error. Please contact administrator." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[analyze-issue] Missing Supabase service credentials");
    return json(500, { error: "Internal database service configuration error." }, origin);
  }

  let body: AnalyzeIssueRequestBody = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON request body." }, origin);
  }

  const isDryRun = Boolean(body.dry_run && body.benchmark_issue);
  const targetIssueId = (body.issue_id || body.issueId || (isDryRun ? "benchmark-dry-run" : "")).trim();
  if (!targetIssueId) {
    return json(400, { error: "Missing required field: issue_id" }, origin);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    let issue: {
      id: string;
      title: string;
      description: string;
      category?: string | null;
      priority?: string | null;
      severity?: string | null;
      status?: string | null;
      location_text?: string | null;
      address_text?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      created_at?: string;
    };

    let imageRecord: {
      id: string;
      storage_bucket: string;
      storage_path: string;
      image_type: string;
      created_at: string;
    } | null = null;

    if (isDryRun) {
      const b = body.benchmark_issue!;
      issue = {
        id: b.id || "benchmark-dry-run",
        title: b.title,
        description: b.description,
        category: b.category || "Other",
        priority: "MEDIUM",
        severity: "MEDIUM",
        status: "SUBMITTED",
        location_text: b.location_text || null,
        address_text: b.address_text || null,
        latitude: b.latitude || null,
        longitude: b.longitude || null,
        created_at: new Date().toISOString(),
      };
    } else {
      // 1. Check for existing analysis (Idempotency Guard)
      const { data: existingAnalysis } = await supabaseAdmin
        .from("issue_ai_analysis")
        .select("id, issue_id, provider, model, category_recommendation, severity_recommendation, priority_recommendation, department_recommendation, confidence_score, structured_response, created_at")
        .eq("issue_id", targetIssueId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAnalysis) {
        return json(200, {
          success: true,
          message: "Issue has already been analyzed.",
          data: existingAnalysis,
          alreadyAnalyzed: true,
        }, origin);
      }

      // 2. Fetch the target issue record
      const { data: dbIssue, error: issueError } = await supabaseAdmin
        .from("issues")
        .select("id, title, description, category, priority, severity, status, location_text, address_text, latitude, longitude, created_at")
        .eq("id", targetIssueId)
        .maybeSingle();

      if (issueError || !dbIssue) {
        console.error(`[analyze-issue] Issue ${targetIssueId} not found:`, issueError);
        return json(404, { error: `Issue not found: ${targetIssueId}` }, origin);
      }

      issue = dbIssue;

      // 3. Fetch initial report image
      const { data: img } = await supabaseAdmin
        .from("issue_images")
        .select("id, storage_bucket, storage_path, image_type, created_at")
        .eq("issue_id", targetIssueId)
        .eq("image_type", "INITIAL_REPORT")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      imageRecord = img;
    }

    // 4. Fetch active municipal departments
    const { data: departmentsData } = await supabaseAdmin
      .from("departments")
      .select("id, name, code, description")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const activeDepartments = (departmentsData ?? []) as Array<{ id: string; name: string; code?: string | null; description?: string | null }>;
    const departmentNames = activeDepartments.map((d) => d.name);

    // 5. Download image data if available
    let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
    if (imageRecord && imageRecord.storage_bucket && imageRecord.storage_path) {
      try {
        const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
          .from(imageRecord.storage_bucket)
          .download(imageRecord.storage_path);

        if (!downloadError && fileBlob) {
          const arrayBuffer = await fileBlob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          const base64 = base64Encode(uint8);
          const mimeType = fileBlob.type || (imageRecord.storage_path.endsWith(".png") ? "image/png" : "image/jpeg");

          imagePart = {
            inlineData: {
              mimeType,
              data: base64,
            },
          };
        } else if (downloadError) {
          console.warn("[analyze-issue] Could not download issue image from storage:", downloadError);
        }
      } catch (storageErr) {
        console.warn("[analyze-issue] Storage download exception:", storageErr);
      }
    }

    // 6. Build the Multimodal Prompt for Gemini
    const systemPrompt = `You are the CivicFix Municipal AI Analysis Assistant, an advanced analytical system for civic triage and multi-stage problem classification.
You are not deciding the government's final routing decision. You are an advisory analytical assistant providing an evidence-based recommendation to a human Administrator.

Your primary mission:
Rigorously distinguish routine operational municipal complaints from systemic, multi-domain problems requiring research, prediction, experimentation, technology development, or scalable innovation.

======================================================================
CORE CLASSIFICATION PRINCIPLE:
Answer this central question:
"Can the underlying problem reasonably be resolved through an existing routine municipal operational process, established standard operating procedure (SOP), known intervention, or standard field crew repair?"
VERSUS
"Does solving the underlying problem require developing, researching, predicting, experimenting, optimizing, prototyping, piloting, coordinating multiple domains/stakeholders, or addressing a systemic/root-cause condition for which an existing operational solution is insufficient?"

This distinction is far more fundamental than the department or category associated with the issue.

======================================================================
TWO-STAGE SEMANTIC REASONING PROCESS:

STEP 1: IDENTIFY THE UNDERLYING PROBLEM (Symptom vs. Root Cause)
- Determine what the citizen is actually reporting:
  * A routine localized symptom that can be directly repaired (e.g. "streetlight bulb broken outside house" -> standard repair).
  * OR an underlying systemic challenge (e.g. "streetlights repeatedly fail across neighborhoods because the city lacks predictive maintenance" -> systemic).
- Synthesize the true underlying problem in 1-2 sentences.

STAGE A: OPERATIONAL RESOLVABILITY ASSESSMENT
Assess whether standard municipal capabilities suffice:
- Is there a known, established intervention or SOP?
- Can existing personnel, maintenance crews, or routine contractors execute it?
- Is the reported issue primarily an isolated defect that can be directly fixed with known tools?
- If YES: Mark is_operationally_resolvable = true, known_sop_available = true. This is a strong indicator of a SIMPLE issue.

STAGE B: SYSTEMIC & INNOVATION NEED ASSESSMENT
If routine resolution is insufficient or inappropriate, assess whether solving the underlying problem requires:
- Scientific study, environmental/aquifer research, data modeling, or predictive forecasting.
- Sensor networks, IoT telemetry, satellite data, or digital decision-support platforms.
- Multidisciplinary coordination (e.g. Agronomy + Hydrology + Data Science + Meteorology).
- Optimization (e.g. when/how much to irrigate, dynamic traffic timing, predictive flood mitigation).
- Prototyping, pilot testing, or startup/university collaboration.
- If YES: Mark requires_research_or_experimentation = true, requires_predictive_or_sensors = true, or requires_cross_domain_coordination = true. This is a strong indicator of a COMPLEX issue.

======================================================================
CRITICAL ANTI-BIAS AND EVALUATION RULES:

1. DO NOT EQUATE SEVERITY WITH COMPLEXITY:
   - A hazardous sinkhole or critical hospital water pipe leak is HIGH or CRITICAL severity, but operationally SIMPLE because standard civil/utility repair crews resolve it using established emergency repair procedures.
   - Severity measures danger/urgency; Complexity measures the novelty/systemic nature of the required solution.

2. DO NOT EQUATE GOVERNMENT DEPARTMENT WITH SIMPLE:
   - The presence of "Agriculture", "Water Resources", "Environment", or "Public Works" in the active municipal department list does NOT make a problem SIMPLE.
   - Having an institutional owner does not mean an established operational solution exists for a seasonal, predictive, or research-driven challenge.

3. AVOID KEYWORD BIAS:
   - Words like "sensor", "IoT", "smart", "research", "technology", "agriculture", "farmer", or "water" must NOT trigger COMPLEX.
   - Example: "The sensor bulb on the smart streetlight is cracked" is SIMPLE (routine bulb replacement).
   - Example: "Farmers need fertilizer distribution at the depot" is SIMPLE (routine logistical distribution).

4. AVOID COMPLEXITY INFLATION:
   - A 3-day garbage backlog affecting an entire neighborhood or 5 broken lights on an avenue is SIMPLE if normal sanitation or electrical maintenance can clear it. Large impact or multi-person complaints do not make an operational issue complex.

5. EXISTING SOLUTION TEST:
   - Broken streetlight -> Inspect, replace bulb/fuse -> Known SOP -> SIMPLE.
   - Blocked drain -> Clean silt, flush pipe -> Known SOP -> SIMPLE.
   - Pothole -> Asphalt compaction -> Known SOP -> SIMPLE.
   - Seasonal unpredictable water availability causing recurring crop loss -> Requires predictive modeling, weather data, soil sensors, irrigation scheduling optimization -> No routine municipal wrench fix -> COMPLEX.

======================================================================
SCORING & CONFIDENCE SCALE:
- Complexity Score (0–100):
  * 0–30: Strongly SIMPLE (routine physical repair by single maintenance crew)
  * 31–50: Likely SIMPLE (multi-step municipal work using established procedures)
  * 51–65: Borderline / Requires Admin Review (provide detailed classification_note)
  * 66–80: Likely COMPLEX (cross-disciplinary, systemic factors, or technological/analytical requirements)
  * 81–100: Strongly COMPLEX (deep systemic/recurring challenges requiring research, data platforms, or pilot innovation)
- The issue_type recommendation ("SIMPLE" vs "COMPLEX") must be derived holistically from Stage A and Stage B, NOT by arbitrarily thresholding a score.

======================================================================
STANDARD MUNICIPAL TRIAGE:
- Category: Must be one of [${ALLOWED_CATEGORIES.join(", ")}].
- Severity: LOW | MEDIUM | HIGH | CRITICAL.
- Priority: LOW | MEDIUM | HIGH | URGENT.
- Department: Best-suited municipal department from active list [${departmentNames.join(", ")}].
`;

    const userPromptText = `Please analyze this civic complaint using the Two-Stage Semantic Reasoning Process:
- Issue Title: ${issue.title}
- Citizen Problem Description: ${issue.description}
- Citizen Selected Category: ${issue.category || "Unspecified"}
- Location / Landmark: ${issue.address_text || issue.location_text || "Not provided"}
- GPS Coordinates: ${issue.latitude && issue.longitude ? `${issue.latitude}, ${issue.longitude}` : "Not provided"}
- Photo Attached: ${imagePart ? "Yes (see attached image)" : "No photo provided"}

Available Municipal Departments:
${activeDepartments.map((d) => `- ${d.name}: ${d.description || "General maintenance"}`).join("\n")}

Respond ONLY with a valid JSON object matching this exact structure:
{
  "category": "string (one of: ${ALLOWED_CATEGORIES.join(", ")})",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "department": "string (must match one of active departments)",
  "root_problem_summary": "string (1-2 sentences defining the true underlying problem)",
  "operational_resolvability": {
    "is_operationally_resolvable": boolean,
    "known_sop_available": boolean,
    "operational_assessment_notes": "string"
  },
  "systemic_innovation_need": {
    "requires_research_or_experimentation": boolean,
    "requires_predictive_or_sensors": boolean,
    "requires_cross_domain_coordination": boolean,
    "innovation_assessment_notes": "string"
  },
  "issue_type": "SIMPLE | COMPLEX",
  "complexity_score": number (integer 0 to 100),
  "classification_confidence": number (between 0.0 and 1.0),
  "complexity_reasoning": "string (holistic evaluation of operational solvability vs systemic innovation needs)",
  "classification_note": "string or null (mandatory if score is 51-65, otherwise null)",
  "complexity_factors": {
    "systemic_problem": boolean,
    "recurring_problem": boolean,
    "multi_domain": boolean,
    "research_required": boolean,
    "technology_potential": boolean,
    "large_scale_impact": boolean,
    "multiple_stakeholders": boolean,
    "existing_municipal_solution": boolean
  },
  "required_expertise": ["string", "string"],
  "confidence": number (between 0.0 and 1.0),
  "explanation": "string (concise summary of ground reality and recommended municipal assignment)"
}`;

    const contentsParts: Array<Record<string, unknown>> = [];
    if (imagePart) {
      contentsParts.push(imagePart);
    }
    contentsParts.push({ text: userPromptText });

    // 7. Invoke Google Gemini API with intelligent model selection
    const preferredOrder = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-pro",
      "gemini-1.5-pro",
    ];

    let geminiResult: any = null;
    let successfulModel = "";
    let lastErrorDetails = "";

    // First try preferred models in order
    for (const modelName of preferredOrder) {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

      const geminiRequestBody = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: contentsParts,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      };

      try {
        const geminiResponse = await fetch(geminiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(geminiRequestBody),
        });

        if (geminiResponse.ok) {
          geminiResult = await geminiResponse.json();
          successfulModel = modelName;
          break;
        } else {
          lastErrorDetails = await geminiResponse.text();
          console.warn(`[analyze-issue] Model ${modelName} (HTTP ${geminiResponse.status}): ${lastErrorDetails}`);
        }
      } catch (fetchErr) {
        lastErrorDetails = String(fetchErr);
        console.warn(`[analyze-issue] Error with model ${modelName}:`, fetchErr);
      }
    }

    // If preferred models did not succeed, dynamically fetch available models from Google API
    if (!geminiResult) {
      try {
        const modelsListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        if (modelsListRes.ok) {
          const modelsListData = await modelsListRes.json();
          const availableModels: string[] = (modelsListData.models || [])
            .map((m: any) => m.name.replace(/^models\//, ""))
            .filter((name: string) => name.includes("flash") || name.includes("gemini") || name.includes("pro"));

          console.log("[analyze-issue] Dynamically discovered available models:", availableModels);

          for (const modelName of availableModels) {
            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
            const geminiRequestBody = {
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: contentsParts,
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            };

            const geminiResponse = await fetch(geminiEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(geminiRequestBody),
            });

            if (geminiResponse.ok) {
              geminiResult = await geminiResponse.json();
              successfulModel = modelName;
              break;
            }
          }
        }
      } catch (listErr) {
        console.warn("[analyze-issue] Failed to dynamically query models list:", listErr);
      }
    }

    if (!geminiResult || !successfulModel) {
      console.error("[analyze-issue] All Gemini models failed:", lastErrorDetails);
      return json(502, { error: "Gemini AI model inference failed across all candidate models.", details: lastErrorDetails }, origin);
    }

    const candidateText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.error("[analyze-issue] Empty candidate response from Gemini:", JSON.stringify(geminiResult));
      return json(502, { error: "Gemini AI returned an empty response." }, origin);
    }

    let parsedOutput: GeminiStructuredOutput = {};
    let cleanJson = candidateText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
    }

    try {
      parsedOutput = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn("[analyze-issue] Standard JSON.parse failed, trying sanitized relaxed cleanup:", parseErr);
      try {
        let relaxed = cleanJson.replace(/,\s*([}\]])/g, "$1");
        // Escape literal unescaped newlines/tabs within strings
        relaxed = relaxed.replace(/[\u0000-\u001F]+/g, (c: string) => {
          if (c === "\n") return "\\n";
          if (c === "\r") return "\\r";
          if (c === "\t") return "\\t";
          return "";
        });
        parsedOutput = JSON.parse(relaxed);
      } catch (secondErr) {
        console.error("[analyze-issue] Failed to parse structured AI output:", candidateText, secondErr);
        return json(502, { error: "Failed to parse structured AI output." }, origin);
      }
    }

    // 8. Validate & Sanitize AI Output
    const validatedCategory = matchCategory(parsedOutput.category, issue.category || "Other");
    const validatedSeverity: IssueSeverity = normalizeEnum<IssueSeverity>(
      parsedOutput.severity,
      ALLOWED_SEVERITIES,
      "MEDIUM",
    );
    const validatedPriority: IssuePriority = normalizeEnum<IssuePriority>(
      parsedOutput.priority,
      ALLOWED_PRIORITIES,
      "MEDIUM",
    );
    const validatedDepartment = matchDepartment(parsedOutput.department, activeDepartments);

    let validatedConfidence = typeof parsedOutput.confidence === "number" ? parsedOutput.confidence : 0.85;
    if (isNaN(validatedConfidence) || validatedConfidence < 0) validatedConfidence = 0.5;
    if (validatedConfidence > 1) validatedConfidence = 1.0;
    // Round to 4 decimal places for numeric(5,4)
    validatedConfidence = Math.round(validatedConfidence * 10000) / 10000;

    const validatedExplanation =
      typeof parsedOutput.explanation === "string" && parsedOutput.explanation.trim()
        ? parsedOutput.explanation.trim()
        : `AI analyzed ${validatedCategory} issue and recommended assignment to ${validatedDepartment}.`;

    // Validate Issue Type & Complexity using Two-Stage Holistic Reasoning
    const rawRootProblemSummary =
      typeof parsedOutput.root_problem_summary === "string" && parsedOutput.root_problem_summary.trim()
        ? parsedOutput.root_problem_summary.trim()
        : issue.title;

    const opRes = parsedOutput.operational_resolvability;
    const isOpResolvable =
      typeof opRes?.is_operationally_resolvable === "boolean"
        ? opRes.is_operationally_resolvable
        : (typeof parsedOutput.operationally_resolvable === "boolean" ? parsedOutput.operationally_resolvable : null);

    const hasSop =
      typeof opRes?.known_sop_available === "boolean"
        ? opRes.known_sop_available
        : (typeof parsedOutput.existing_solution_available === "boolean" ? parsedOutput.existing_solution_available : null);

    const opNotes =
      typeof opRes?.operational_assessment_notes === "string"
        ? opRes.operational_assessment_notes.trim()
        : "";

    const sysInnov = parsedOutput.systemic_innovation_need;
    const reqResearch = Boolean(sysInnov?.requires_research_or_experimentation);
    const reqPredictive = Boolean(sysInnov?.requires_predictive_or_sensors);
    const reqCoord = Boolean(sysInnov?.requires_cross_domain_coordination);
    const innovNotes =
      typeof sysInnov?.innovation_assessment_notes === "string"
        ? sysInnov.innovation_assessment_notes.trim()
        : "";

    // Validate Issue Type based on holistic semantic reasoning (Stage A + Stage B):
    const rawType = String(parsedOutput.issue_type || "").trim().toUpperCase();
    let validatedIssueType: "SIMPLE" | "COMPLEX";

    if (rawType === "COMPLEX" || rawType === "SIMPLE") {
      validatedIssueType = rawType;
    } else if (isOpResolvable === true && hasSop === true && !reqResearch && !reqPredictive) {
      validatedIssueType = "SIMPLE";
    } else if (isOpResolvable === false || reqResearch || reqPredictive) {
      validatedIssueType = "COMPLEX";
    } else {
      validatedIssueType = "SIMPLE";
    }

    // Complexity score validation:
    let rawScore = Number(parsedOutput.complexity_score);
    if (isNaN(rawScore) || rawScore < 0) {
      rawScore = validatedIssueType === "COMPLEX" ? 80 : 25;
    }
    let validatedComplexityScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Harmonize score to be consistent with validatedIssueType
    if (validatedIssueType === "COMPLEX" && validatedComplexityScore < 55) {
      validatedComplexityScore = 75;
    } else if (validatedIssueType === "SIMPLE" && validatedComplexityScore > 60) {
      validatedComplexityScore = 30;
    }

    let validatedClassificationConfidence = typeof parsedOutput.classification_confidence === "number"
      ? parsedOutput.classification_confidence
      : validatedConfidence;
    if (isNaN(validatedClassificationConfidence) || validatedClassificationConfidence < 0) {
      validatedClassificationConfidence = 0.85;
    }
    if (validatedClassificationConfidence > 1) validatedClassificationConfidence = 1.0;
    validatedClassificationConfidence = Math.round(validatedClassificationConfidence * 10000) / 10000;

    const validatedComplexityReasoning =
      typeof parsedOutput.complexity_reasoning === "string" && parsedOutput.complexity_reasoning.trim()
        ? parsedOutput.complexity_reasoning.trim()
        : validatedIssueType === "COMPLEX"
        ? "AI flagged this complaint as a complex societal challenge requiring multi-domain coordination and specialized research/innovation."
        : "Standard civic infrastructure maintenance resolvable through routine departmental procedures.";

    const validatedClassificationNote =
      typeof parsedOutput.classification_note === "string" && parsedOutput.classification_note.trim()
        ? parsedOutput.classification_note.trim()
        : validatedComplexityScore >= 51 && validatedComplexityScore <= 65
        ? "Borderline case: The problem may involve operational repair aspects alongside recurring or predictive requirements. Requires human Administrator review."
        : null;

    const rawFactors = (parsedOutput.complexity_factors && typeof parsedOutput.complexity_factors === "object")
      ? parsedOutput.complexity_factors
      : {};

    const validatedComplexityFactors = {
      systemic_problem: Boolean(rawFactors.systemic_problem ?? (validatedIssueType === "COMPLEX")),
      recurring_problem: Boolean(rawFactors.recurring_problem),
      multi_domain: Boolean(rawFactors.multi_domain ?? reqCoord),
      research_required: Boolean(rawFactors.research_required ?? reqResearch),
      technology_potential: Boolean(rawFactors.technology_potential ?? reqPredictive),
      large_scale_impact: Boolean(rawFactors.large_scale_impact),
      multiple_stakeholders: Boolean(rawFactors.multiple_stakeholders ?? reqCoord),
      existing_municipal_solution: typeof rawFactors.existing_municipal_solution === "boolean"
        ? rawFactors.existing_municipal_solution
        : (hasSop ?? (validatedIssueType === "SIMPLE")),
    };

    const validatedOperationalResolvability = {
      is_operationally_resolvable: isOpResolvable ?? (validatedIssueType === "SIMPLE"),
      known_sop_available: hasSop ?? (validatedIssueType === "SIMPLE"),
      operational_assessment_notes: opNotes,
    };

    const validatedSystemicInnovationNeed = {
      requires_research_or_experimentation: reqResearch,
      requires_predictive_or_sensors: reqPredictive,
      requires_cross_domain_coordination: reqCoord,
      innovation_assessment_notes: innovNotes,
    };

    const validatedRequiredExpertise: string[] = Array.isArray(parsedOutput.required_expertise)
      ? (parsedOutput.required_expertise as unknown[])
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((s) => s.trim())
      : validatedIssueType === "COMPLEX"
      ? ["Urban Systems", "Infrastructure Engineering"]
      : [validatedDepartment || "Municipal Maintenance"];
    if (validatedRequiredExpertise.length === 0) {
      validatedRequiredExpertise.push(validatedDepartment || "Municipal Maintenance");
    }

    const structuredPayload = {
      category: validatedCategory,
      severity: validatedSeverity,
      priority: validatedPriority,
      department: validatedDepartment,
      root_problem_summary: rawRootProblemSummary,
      operational_resolvability: validatedOperationalResolvability,
      systemic_innovation_need: validatedSystemicInnovationNeed,
      issue_type: validatedIssueType,
      complexity_score: validatedComplexityScore,
      complexity_reasoning: validatedComplexityReasoning,
      classification_note: validatedClassificationNote,
      complexity_factors: validatedComplexityFactors,
      required_expertise: validatedRequiredExpertise,
      confidence: validatedConfidence,
      classification_confidence: validatedClassificationConfidence,
      explanation: validatedExplanation,
      raw_model_output: parsedOutput,
    };

    if (isDryRun) {
      return json(200, {
        success: true,
        dry_run: true,
        data: structuredPayload,
      }, origin);
    }

    // 9. Insert Record into public.issue_ai_analysis
    const { data: insertedAnalysis, error: insertError } = await supabaseAdmin
      .from("issue_ai_analysis")
      .insert({
        issue_id: targetIssueId,
        provider: "google-gemini",
        model: successfulModel,
        category_recommendation: validatedCategory,
        severity_recommendation: validatedSeverity,
        priority_recommendation: validatedPriority,
        department_recommendation: validatedDepartment,
        issue_type: validatedIssueType,
        complexity_score: validatedComplexityScore,
        complexity_reasoning: validatedComplexityReasoning,
        classification_note: validatedClassificationNote,
        complexity_factors: validatedComplexityFactors,
        required_expertise: validatedRequiredExpertise,
        confidence_score: validatedConfidence,
        classification_confidence: validatedClassificationConfidence,
        structured_response: structuredPayload,
      })
      .select("id, issue_id, provider, model, category_recommendation, severity_recommendation, priority_recommendation, department_recommendation, issue_type, complexity_score, complexity_reasoning, required_expertise, confidence_score, structured_response, created_at")
      .single();

    if (insertError) {
      console.error("[analyze-issue] Failed to insert issue_ai_analysis record:", insertError);
      return json(500, { error: "Failed to save AI analysis to database." }, origin);
    }

    // 10. Advance issue status to AWAITING_ADMIN_CLASSIFICATION and save AI classification
    const { error: statusUpdateError } = await supabaseAdmin
      .from("issues")
      .update({
        ai_issue_type: validatedIssueType,
        ai_complexity_score: validatedComplexityScore,
        ai_complexity_reasoning: validatedComplexityReasoning,
        ai_required_expertise: validatedRequiredExpertise,
        ai_classification_confidence: validatedClassificationConfidence,
        ai_complexity_factors: validatedComplexityFactors,
        status: "AWAITING_ADMIN_CLASSIFICATION",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetIssueId);

    if (statusUpdateError) {
      console.warn("[analyze-issue] Non-fatal: Failed to update issue status to AWAITING_ADMIN_CLASSIFICATION:", statusUpdateError);
    }

    // 11. Asynchronously trigger Duplicate Issue Detection (non-blocking)
    try {
      const detectDuplicatesUrl = `${supabaseUrl}/functions/v1/detect-duplicates`;
      fetch(detectDuplicatesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ issue_id: targetIssueId }),
      }).catch((detectErr) => {
        console.warn("[analyze-issue] Async duplicate detection trigger encountered error:", detectErr);
      });
    } catch (triggerErr) {
      console.warn("[analyze-issue] Non-fatal: Duplicate detection dispatch error:", triggerErr);
    }

    return json(200, {
      success: true,
      data: insertedAnalysis,
    }, origin);
  } catch (unexpectedError) {
    console.error("[analyze-issue] Unexpected execution error:", unexpectedError);
    return json(500, { error: "An unexpected error occurred during AI analysis." }, origin);
  }
});
