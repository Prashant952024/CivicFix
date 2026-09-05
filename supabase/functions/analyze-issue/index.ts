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
};

type GeminiStructuredOutput = {
  category?: string;
  severity?: string;
  priority?: string;
  department?: string;
  confidence?: number;
  explanation?: string;
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
  activeDepartments: Array<{ id: string; name: string }>,
): string {
  if (activeDepartments.length === 0) {
    return "Road & Infrastructure";
  }

  if (typeof suggestedName !== "string" || !suggestedName.trim()) {
    return activeDepartments[0].name;
  }

  const clean = suggestedName.trim().toLowerCase();

  // 1. Exact case-insensitive match
  const exact = activeDepartments.find((d) => d.name.toLowerCase() === clean);
  if (exact) return exact.name;

  // 2. Substring match
  const substringMatch = activeDepartments.find(
    (d) => d.name.toLowerCase().includes(clean) || clean.includes(d.name.toLowerCase()),
  );
  if (substringMatch) return substringMatch.name;

  // 3. Keyword heuristic fallback
  if (clean.includes("road") || clean.includes("pothole") || clean.includes("pavement") || clean.includes("asphalt")) {
    const roadDept = activeDepartments.find((d) => d.name.toLowerCase().includes("road"));
    if (roadDept) return roadDept.name;
  }
  if (clean.includes("water") || clean.includes("pipe") || clean.includes("leak") || clean.includes("sewer")) {
    const waterDept = activeDepartments.find((d) => d.name.toLowerCase().includes("water"));
    if (waterDept) return waterDept.name;
  }
  if (clean.includes("garbage") || clean.includes("waste") || clean.includes("trash") || clean.includes("dump")) {
    const wasteDept = activeDepartments.find((d) => d.name.toLowerCase().includes("waste"));
    if (wasteDept) return wasteDept.name;
  }
  if (clean.includes("light") || clean.includes("electricity") || clean.includes("power") || clean.includes("lamp")) {
    const lightDept = activeDepartments.find((d) => d.name.toLowerCase().includes("light") || d.name.toLowerCase().includes("electr"));
    if (lightDept) return lightDept.name;
  }
  if (clean.includes("drain") || clean.includes("flood") || clean.includes("storm")) {
    const drainDept = activeDepartments.find((d) => d.name.toLowerCase().includes("flood") || d.name.toLowerCase().includes("drain"));
    if (drainDept) return drainDept.name;
  }
  if (clean.includes("health") || clean.includes("sanitat") || clean.includes("hygiene")) {
    const healthDept = activeDepartments.find((d) => d.name.toLowerCase().includes("health") || d.name.toLowerCase().includes("sanitat"));
    if (healthDept) return healthDept.name;
  }
  if (clean.includes("traffic") || clean.includes("transport") || clean.includes("sign")) {
    const trafficDept = activeDepartments.find((d) => d.name.toLowerCase().includes("traffic") || d.name.toLowerCase().includes("transport"));
    if (trafficDept) return trafficDept.name;
  }
  if (clean.includes("park") || clean.includes("tree") || clean.includes("garden")) {
    const parkDept = activeDepartments.find((d) => d.name.toLowerCase().includes("park") || d.name.toLowerCase().includes("hort"));
    if (parkDept) return parkDept.name;
  }

  // Default to first active department
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

  const targetIssueId = (body.issue_id || body.issueId || "").trim();
  if (!targetIssueId) {
    return json(400, { error: "Missing required field: issue_id" }, origin);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
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
    const { data: issue, error: issueError } = await supabaseAdmin
      .from("issues")
      .select("id, title, description, category, priority, severity, status, location_text, address_text, latitude, longitude, created_at")
      .eq("id", targetIssueId)
      .maybeSingle();

    if (issueError || !issue) {
      console.error(`[analyze-issue] Issue ${targetIssueId} not found:`, issueError);
      return json(404, { error: `Issue not found: ${targetIssueId}` }, origin);
    }

    // 3. Fetch initial report image
    const { data: imageRecord } = await supabaseAdmin
      .from("issue_images")
      .select("id, storage_bucket, storage_path, image_type, created_at")
      .eq("issue_id", targetIssueId)
      .eq("image_type", "INITIAL_REPORT")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // 4. Fetch active municipal departments
    const { data: departmentsData } = await supabaseAdmin
      .from("departments")
      .select("id, name, description")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const activeDepartments = (departmentsData ?? []) as Array<{ id: string; name: string; description?: string | null }>;
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
    const systemPrompt = `You are the CivicFix Municipal AI Analysis Assistant, an expert AI system for municipal triage and civic issue classification.
Your role is to analyze civic complaints submitted by citizens (including photos, titles, descriptions, and location information) and provide high-accuracy, structured recommendations to assist municipal officers.

Instructions:
1. Examine the visual evidence (if provided) and cross-reference with the citizen's complaint title and description.
2. Determine the most accurate civic issue category from the allowed categories: [${ALLOWED_CATEGORIES.join(", ")}].
3. Determine the severity level (physical risk/impact):
   - LOW: Cosmetic damage, minor litter, low impact.
   - MEDIUM: Moderate defect, single streetlight out, standard pothole, routine waste pile.
   - HIGH: Major road crater, substantial sewage overflow, active water main break, hazardous dark intersection.
   - CRITICAL: Life-threatening road collapse, exposed high-voltage cables, structural danger, severe flood inundation.
4. Recommend dispatch priority:
   - LOW: Routine non-urgent work.
   - MEDIUM: Standard maintenance queue.
   - HIGH: Needs prompt dispatch within 24-48 hours.
   - URGENT: Immediate same-day emergency response required.
5. Select the single most responsible municipal department from the active departments list: [${departmentNames.join(", ")}].
6. Provide a calibrated confidence score between 0.0 and 1.0 (e.g. 0.92 for clear photographic evidence, 0.40 - 0.60 if ambiguous or no clear defect visible).
7. Provide a concise, professional explanation (2-3 sentences) detailing the ground-level rationale based strictly on observable evidence.

You must respond ONLY with a valid JSON object matching the required schema.`;

    const userPromptText = `Please analyze this civic complaint:
- Issue Title: ${issue.title}
- Citizen Problem Description: ${issue.description}
- Citizen Selected Category: ${issue.category || "Unspecified"}
- Location / Landmark: ${issue.address_text || issue.location_text || "Not provided"}
- GPS Coordinates: ${issue.latitude && issue.longitude ? `${issue.latitude}, ${issue.longitude}` : "Not provided"}
- Photo Attached: ${imagePart ? "Yes (see attached image)" : "No photo provided"}

Available Municipal Departments:
${activeDepartments.map((d) => `- ${d.name}: ${d.description || "General maintenance"}`).join("\n")}

Return a JSON object with this exact structure:
{
  "category": "string (one of: ${ALLOWED_CATEGORIES.join(", ")})",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "department": "string (must match one of the active departments)",
  "confidence": number (between 0.0 and 1.0),
  "explanation": "string (concise evidence-based rationale)"
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
    try {
      parsedOutput = JSON.parse(candidateText.trim());
    } catch (parseErr) {
      console.error("[analyze-issue] Failed to parse Gemini JSON output:", candidateText, parseErr);
      return json(502, { error: "Failed to parse structured AI output." }, origin);
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

    const structuredPayload = {
      category: validatedCategory,
      severity: validatedSeverity,
      priority: validatedPriority,
      department: validatedDepartment,
      confidence: validatedConfidence,
      explanation: validatedExplanation,
      raw_model_output: parsedOutput,
    };

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
        confidence_score: validatedConfidence,
        structured_response: structuredPayload,
      })
      .select("id, issue_id, provider, model, category_recommendation, severity_recommendation, priority_recommendation, department_recommendation, confidence_score, structured_response, created_at")
      .single();

    if (insertError) {
      console.error("[analyze-issue] Failed to insert issue_ai_analysis record:", insertError);
      return json(500, { error: "Failed to save AI analysis to database." }, origin);
    }

    // 10. Advance issue status from SUBMITTED to AI_ANALYZED if applicable
    if (issue.status === "SUBMITTED") {
      const { error: statusUpdateError } = await supabaseAdmin
        .from("issues")
        .update({
          status: "AI_ANALYZED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetIssueId)
        .eq("status", "SUBMITTED");

      if (statusUpdateError) {
        console.warn("[analyze-issue] Non-fatal: Failed to update issue status to AI_ANALYZED:", statusUpdateError);
      }
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
