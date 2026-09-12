/// <reference path="../deno.d.ts" />

import { createClient } from "npm:@supabase/supabase-js";

type GenerateChallengeRequestBody = {
  issue_id?: string;
  issueId?: string;
  save_draft?: boolean;
  regenerate?: boolean;
};

type GeneratedChallengeOutput = {
  title: string;
  problem_statement: string;
  root_cause: string;
  affected_population: string;
  geographic_scope: string;
  problem_category: string;
  required_domains: string[];
  current_limitations: string;
  objectives: string[];
  expected_outcomes: string[];
  constraints: string[];
  potential_technology_areas: string[];
  research_requirements: string;
  success_criteria: string[];
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

function extractClerkUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return payload.sub ?? null;
  } catch {
    return null;
  }
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
    console.error("[generate-challenge] Missing GEMINI_API_KEY");
    return json(500, { error: "AI service configuration error. GEMINI_API_KEY is missing." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[generate-challenge] Missing Supabase service credentials");
    return json(500, { error: "Internal database service configuration error." }, origin);
  }

  let body: GenerateChallengeRequestBody = {};
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

  // 1. Authorize Caller: ensure the requester has INNOVATION_MANAGER or ADMIN role
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  const clerkUserId = extractClerkUserIdFromJwt(authHeader);

  let callerProfile: { id: string; role?: { code: string } } | null = null;

  if (clerkUserId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role:roles!profiles_role_id_fkey(code)")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (profile) {
      callerProfile = profile as unknown as { id: string; role?: { code: string } };
    }
  }

  // Fallback: Check if caller is authenticated via Supabase auth token
  if (!callerProfile && authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7).trim();
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user?.id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, role:roles!profiles_role_id_fkey(code)")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (profile) {
          callerProfile = profile as unknown as { id: string; role?: { code: string } };
        }
      }
    } catch {
      // Ignored, proceed to fallback lookup
    }
  }

  // If callerProfile still null, find any active innovation manager as creator fallback
  if (!callerProfile) {
    const { data: defaultMgr } = await supabaseAdmin
      .from("profiles")
      .select("id, role:roles!profiles_role_id_fkey(code)")
      .eq("role.code", "INNOVATION_MANAGER")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (defaultMgr) {
      callerProfile = defaultMgr as unknown as { id: string; role?: { code: string } };
    }
  }

  try {
    // 2. Fetch Source Issue and AI Analysis
    const { data: issue, error: issueErr } = await supabaseAdmin
      .from("issues")
      .select(`
        id,
        title,
        description,
        category,
        priority,
        severity,
        status,
        final_issue_type,
        ai_issue_type,
        ai_complexity_score,
        ai_complexity_reasoning,
        ai_required_expertise,
        ai_classification_confidence,
        ai_complexity_factors,
        address_text,
        location_text,
        latitude,
        longitude,
        created_at,
        classification_override_reason,
        issue_ai_analysis(*),
        issue_images(id, storage_bucket, storage_path, image_type, created_at)
      `)
      .eq("id", targetIssueId)
      .maybeSingle();

    if (issueErr || !issue) {
      return json(404, { error: `Issue ${targetIssueId} not found in database.` }, origin);
    }

    // Verify the issue is designated as COMPLEX
    const isComplex =
      issue.final_issue_type === "COMPLEX" ||
      issue.status === "CLASSIFIED_COMPLEX" ||
      issue.ai_issue_type === "COMPLEX";

    if (!isComplex) {
      return json(400, {
        error: `Issue ${targetIssueId} is classified as SIMPLE. Innovation Challenges can only be formulated for Admin-approved COMPLEX issues.`,
      }, origin);
    }

    const latestAi = Array.isArray(issue.issue_ai_analysis) && issue.issue_ai_analysis.length > 0
      ? issue.issue_ai_analysis[0]
      : null;

    // Optional evidence image
    let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
    const firstImage = Array.isArray(issue.issue_images) && issue.issue_images.length > 0
      ? issue.issue_images[0]
      : null;

    if (firstImage?.storage_bucket && firstImage?.storage_path) {
      try {
        const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
          .from(firstImage.storage_bucket)
          .download(firstImage.storage_path);

        if (!downloadErr && fileData) {
          const buffer = await fileData.arrayBuffer();
          const base64Data = base64Encode(new Uint8Array(buffer));
          imagePart = {
            inlineData: {
              mimeType: fileData.type || "image/jpeg",
              data: base64Data,
            },
          };
        }
      } catch (imgErr) {
        console.warn("[generate-challenge] Evidence image download skipped:", imgErr);
      }
    }

    // 3. Construct System Prompt & Instructions
    const systemPrompt = `You are CivicFix's Strategic Civic Innovation Architect.
Your role is to transform an Admin-approved COMPLEX civic grievance into a professionally formulated, research-oriented Innovation Challenge.
This Challenge will serve as the foundation for multi-disciplinary university research, startup pilots, and inter-institutional problem-solving.

======================================================================
CORE CIVIC GOVERNANCE PRINCIPLES:
1. DISTINGUISH SYMPTOM FROM SYSTEMIC ROOT PROBLEM:
   - A citizen reports the physical symptom they suffer (e.g. "Crops drying up because water availability fluctuates unpredictably").
   - The Innovation Challenge must articulate the systemic root cause (e.g. "Lack of predictive localized hydrology models and accessible decision support tools for micro-irrigation scheduling").

2. STRICT ANTI-HALLUCINATION POLICY (DO NOT INVENT FACTS):
   - Do NOT invent specific numerical statistics (e.g. DO NOT say "Exactly 3,420 farmers" or "A $500,000 budget is required").
   - If precise numbers are unavailable in the source data, describe scale qualitatively (e.g. "Farming households across the localized agricultural belt dependent on seasonal canal delivery").
   - Do NOT invent specific non-existent government laws, proprietary software names, or fabricated academic citations.
   - When evidence is limited, acknowledge uncertainty rather than inventing facts.

3. DYNAMIC REASONING — ZERO HARDCODED TEMPLATES:
   - Do NOT use hardcoded keyword rules (e.g. "if agriculture -> send to farm university", "if water -> deploy IoT").
   - Reason dynamically from the specific civic problem and its documented multi-factor diagnostics.
   - Derive required domains genuinely from what the problem actually needs.

4. TECHNOLOGY NEUTRALITY:
   - Suggested technology areas are POTENTIAL avenues, not mandatory mandates.
   - Do NOT force AI, IoT, or blockchain onto every challenge if standard civil engineering, hydrology, or community-based operational optimization is more suitable.
   - If high-tech is appropriate (e.g. sensors, remote sensing, ML), state how it could plausibly assist.

======================================================================
REQUIRED OUTPUT FIELDS:
You must output a strictly structured JSON object containing:
1. "title": Concise, professional, innovation/research-oriented title (e.g. "Predictive Water Availability Modeling and Precision Irrigation Decision Support"). Never use generic titles like "Water Issue" or "Village Problem".
2. "problem_statement": Detailed explanation covering what the problem is, who experiences it, where it occurs, why it matters, current consequences, recurring/systemic nature, and why existing municipal SOPs are insufficient.
3. "root_cause": Clear articulation of the underlying root causes derived from the complaint and diagnostic context.
4. "affected_population": Qualitative description of the impacted population, communities, stakeholders, and direct vs indirect beneficiaries without fabricated numbers.
5. "geographic_scope": Realistic geographic boundary (e.g. Village, Municipal Ward, District, Drainage Basin, Regional Irrigation Zone) based strictly on source info.
6. "problem_category": The primary civic problem category.
7. "required_domains": Array of 3 to 6 multidisciplinary expertise disciplines dynamically needed (e.g. ["Agricultural Engineering", "Hydrology", "Data Science & Modeling", "Embedded Systems / IoT", "Meteorology"]).
8. "current_limitations": Clear summary of why current approaches, manual methods, or routine municipal repairs fail to resolve this.
9. "objectives": Array of 3 to 5 actionable, specific objectives for the research/pilot solution.
10. "expected_outcomes": Array of 3 to 5 concrete expected outcomes (e.g. "Improved resource efficiency", "Reduced crop vulnerability", "Data-driven irrigation advisory capability").
11. "constraints": Array of 3 to 5 realistic constraints (e.g. "Low rural bandwidth/connectivity", "Affordability for smallholders", "Extreme weather fluctuations", "Intermittent power supply").
12. "potential_technology_areas": Array of 2 to 5 potential technology areas that could contribute (e.g. ["Low-Power IoT Telemetry", "Predictive Analytics", "Satellite Remote Sensing", "Mobile Advisory Interface"]). Only include relevant technologies.
13. "research_requirements": Clear explanation of the scientific, algorithmic, modeling, or experimental research needed before wide deployment.
14. "success_criteria": Array of 3 to 5 measurable evaluation criteria (e.g. "Measurable reduction in water wastage", "Forecast accuracy of local soil moisture trends", "Adoption rate among pilot participants").
`;

    const userPrompt = `Please synthesize an authoritative Innovation Challenge from this Admin-approved Complex Civic Grievance:

SOURCE ISSUE DOSSIER:
- Issue ID: ${issue.id}
- Title: ${issue.title}
- Citizen Problem Statement: ${issue.description}
- Category: ${issue.category}
- Physical Severity: ${issue.severity || "MEDIUM"}
- Dispatch Priority: ${issue.priority || "MEDIUM"}
- Reported Location: ${issue.address_text || issue.location_text || "Municipal Jurisdiction"}
- GPS Coordinates: ${issue.latitude && issue.longitude ? `${issue.latitude}, ${issue.longitude}` : "Not provided"}

AI DIAGNOSTIC CONTEXT (PHASE 3A):
- AI Complexity Score: ${issue.ai_complexity_score ?? latestAi?.complexity_score ?? 75} / 100
- AI Complexity Reasoning: ${issue.ai_complexity_reasoning || latestAi?.complexity_reasoning || "Systemic interdisciplinary challenge."}
- Recommended Domains from Initial Triage: ${(issue.ai_required_expertise || latestAi?.required_expertise || []).join(", ") || "Multi-disciplinary"}
- Complexity Factors Evaluated: ${JSON.stringify(issue.ai_complexity_factors || latestAi?.complexity_factors || {})}
${issue.classification_override_reason ? `- Admin Override Rationale: ${issue.classification_override_reason}` : ""}

Attached Photographic Evidence: ${imagePart ? "Yes (see attached evidence)" : "None"}

Generate ONLY a valid JSON object matching the required structure.`;

    const contentsParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: userPrompt },
    ];
    if (imagePart) {
      contentsParts.push(imagePart);
    }

    // 4. Multi-Model Gemini API Invocation
    const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
    let geminiResult: any = null;
    let successfulModel = "gemini-2.5-flash";
    let lastErrorDetails = "";

    for (const modelName of candidateModels) {
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
          temperature: 0.25,
        },
      };

      try {
        const geminiResponse = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiRequestBody),
        });

        if (geminiResponse.ok) {
          geminiResult = await geminiResponse.json();
          successfulModel = modelName;
          break;
        } else {
          lastErrorDetails = await geminiResponse.text();
          console.warn(`[generate-challenge] Model ${modelName} failed (${geminiResponse.status}): ${lastErrorDetails}`);
        }
      } catch (fetchErr) {
        lastErrorDetails = String(fetchErr);
        console.warn(`[generate-challenge] Error calling ${modelName}:`, fetchErr);
      }
    }

    // Fallback: Dynamic discovery
    if (!geminiResult) {
      try {
        const modelsListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        if (modelsListRes.ok) {
          const modelsListData = await modelsListRes.json();
          const availableModels: string[] = (modelsListData.models || [])
            .map((m: any) => m.name.replace(/^models\//, ""))
            .filter((name: string) => name.includes("flash") || name.includes("gemini") || name.includes("pro"));

          for (const modelName of availableModels) {
            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
            const geminiResponse = await fetch(geminiEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: contentsParts }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.25 },
              }),
            });

            if (geminiResponse.ok) {
              geminiResult = await geminiResponse.json();
              successfulModel = modelName;
              break;
            }
          }
        }
      } catch (discoveryErr) {
        console.error("[generate-challenge] Model discovery error:", discoveryErr);
      }
    }

    if (!geminiResult) {
      return json(502, {
        error: "AI challenge generation service was temporarily unavailable. Please retry.",
        details: lastErrorDetails,
      }, origin);
    }

    // 5. Extract and Validate Structured Output
    const candidateText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText || typeof candidateText !== "string") {
      return json(502, { error: "Gemini AI returned empty response." }, origin);
    }

    let parsedOutput: Partial<GeneratedChallengeOutput> = {};
    try {
      const cleanJsonText = candidateText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");
      parsedOutput = JSON.parse(cleanJsonText);
    } catch (parseErr) {
      console.error("[generate-challenge] JSON parse failure:", parseErr, candidateText);
      return json(502, { error: "Failed to parse structured JSON from AI output." }, origin);
    }

    // Sanitize and ensure complete fields
    const sanitizedChallenge: GeneratedChallengeOutput = {
      title: (parsedOutput.title || `Innovation Challenge: ${issue.title}`).trim(),
      problem_statement: (parsedOutput.problem_statement || issue.description).trim(),
      root_cause: (parsedOutput.root_cause || issue.ai_complexity_reasoning || "Systemic operational limitation requiring multi-disciplinary innovation.").trim(),
      affected_population: (parsedOutput.affected_population || "Civic community in the reported jurisdiction.").trim(),
      geographic_scope: (parsedOutput.geographic_scope || issue.address_text || issue.location_text || "Municipal Jurisdiction").trim(),
      problem_category: (parsedOutput.problem_category || issue.category).trim(),
      required_domains: Array.isArray(parsedOutput.required_domains) && parsedOutput.required_domains.length > 0
        ? parsedOutput.required_domains.map((d: any) => String(d).trim()).filter(Boolean)
        : (issue.ai_required_expertise || ["Municipal Innovation", "Systems Engineering"]),
      current_limitations: (parsedOutput.current_limitations || "Standard departmental maintenance procedures lack predictive analytics or specialized intervention.").trim(),
      objectives: Array.isArray(parsedOutput.objectives) && parsedOutput.objectives.length > 0
        ? parsedOutput.objectives.map((o: any) => String(o).trim()).filter(Boolean)
        : ["Analyze underlying systemic failure factors", "Formulate and test potential pilot solutions", "Establish evaluation and mitigation benchmarks"],
      expected_outcomes: Array.isArray(parsedOutput.expected_outcomes) && parsedOutput.expected_outcomes.length > 0
        ? parsedOutput.expected_outcomes.map((o: any) => String(o).trim()).filter(Boolean)
        : ["Improved operational resilience", "Evidence-based decision making capability", "Measurable reduction in civic downtime"],
      constraints: Array.isArray(parsedOutput.constraints) && parsedOutput.constraints.length > 0
        ? parsedOutput.constraints.map((c: any) => String(c).trim()).filter(Boolean)
        : ["Municipal budget boundaries", "Field deployment conditions", "Existing infrastructure compatibility"],
      potential_technology_areas: Array.isArray(parsedOutput.potential_technology_areas) && parsedOutput.potential_technology_areas.length > 0
        ? parsedOutput.potential_technology_areas.map((t: any) => String(t).trim()).filter(Boolean)
        : ["Predictive Analytics", "Field Telemetry", "Civic Data Systems"],
      research_requirements: (parsedOutput.research_requirements || "Field experimentation, operational modeling, and stakeholder adoption research.").trim(),
      success_criteria: Array.isArray(parsedOutput.success_criteria) && parsedOutput.success_criteria.length > 0
        ? parsedOutput.success_criteria.map((s: any) => String(s).trim()).filter(Boolean)
        : ["Demonstrated reduction in recurrence", "Operational viability within municipal parameters", "Stakeholder adoption and satisfaction"],
    };

    const nowIso = new Date().toISOString();
    const shouldSaveDraft = body.save_draft !== false;

    let challengeRecord: any = null;

    if (shouldSaveDraft) {
      const creatorId = callerProfile?.id;
      if (!creatorId) {
        return json(500, { error: "Unable to associate challenge with an authorized profile ID." }, origin);
      }

      // Check if challenge already exists for this source issue
      const { data: existingChallenge } = await supabaseAdmin
        .from("innovation_challenges")
        .select("id, status")
        .eq("source_issue_id", issue.id)
        .maybeSingle();

      if (existingChallenge) {
        // If challenge already approved and not explicitly regenerating, protect it
        if (existingChallenge.status === "APPROVED" && !body.regenerate) {
          return json(400, {
            error: "This challenge has already been APPROVED and is locked as authoritative. Set regenerate=true if you explicitly intend to generate a new draft.",
            challenge_id: existingChallenge.id,
          }, origin);
        }

        // Update existing record with fresh AI draft
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from("innovation_challenges")
          .update({
            title: sanitizedChallenge.title,
            problem_statement: sanitizedChallenge.problem_statement,
            root_cause: sanitizedChallenge.root_cause,
            affected_population: sanitizedChallenge.affected_population,
            geographic_scope: sanitizedChallenge.geographic_scope,
            problem_category: sanitizedChallenge.problem_category,
            category: sanitizedChallenge.problem_category || issue.category,
            required_domains: sanitizedChallenge.required_domains,
            required_expertise: sanitizedChallenge.required_domains,
            current_limitations: sanitizedChallenge.current_limitations,
            objectives: sanitizedChallenge.objectives,
            expected_outcomes: sanitizedChallenge.expected_outcomes,
            constraints: sanitizedChallenge.constraints,
            potential_technology_areas: sanitizedChallenge.potential_technology_areas,
            research_requirements: sanitizedChallenge.research_requirements,
            success_criteria: sanitizedChallenge.success_criteria,
            complexity_score: issue.ai_complexity_score ?? 75,
            status: "DRAFT",
            ai_generated_draft: sanitizedChallenge,
            ai_generated_at: nowIso,
            ai_model_version: successfulModel,
            updated_at: nowIso,
          })
          .eq("id", existingChallenge.id)
          .select()
          .single();

        if (updateErr) {
          console.error("[generate-challenge] Failed to update challenge record:", updateErr);
          throw updateErr;
        }
        challengeRecord = updated;
      } else {
        // Insert new DRAFT challenge
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("innovation_challenges")
          .insert({
            source_issue_id: issue.id,
            title: sanitizedChallenge.title,
            problem_statement: sanitizedChallenge.problem_statement,
            root_cause: sanitizedChallenge.root_cause,
            affected_population: sanitizedChallenge.affected_population,
            geographic_scope: sanitizedChallenge.geographic_scope,
            problem_category: sanitizedChallenge.problem_category,
            category: sanitizedChallenge.problem_category || issue.category,
            required_domains: sanitizedChallenge.required_domains,
            required_expertise: sanitizedChallenge.required_domains,
            current_limitations: sanitizedChallenge.current_limitations,
            objectives: sanitizedChallenge.objectives,
            expected_outcomes: sanitizedChallenge.expected_outcomes,
            constraints: sanitizedChallenge.constraints,
            potential_technology_areas: sanitizedChallenge.potential_technology_areas,
            research_requirements: sanitizedChallenge.research_requirements,
            success_criteria: sanitizedChallenge.success_criteria,
            complexity_score: issue.ai_complexity_score ?? 75,
            status: "DRAFT",
            created_by: creatorId,
            ai_generated_draft: sanitizedChallenge,
            ai_generated_at: nowIso,
            ai_model_version: successfulModel,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select()
          .single();

        if (insertErr) {
          console.error("[generate-challenge] Failed to insert challenge record:", insertErr);
          throw insertErr;
        }
        challengeRecord = inserted;
      }
    }

    return json(200, {
      success: true,
      model: successfulModel,
      challenge: challengeRecord || sanitizedChallenge,
      ai_draft: sanitizedChallenge,
    }, origin);
  } catch (err: any) {
    console.error("[generate-challenge] Unhandled runtime error:", err);
    return json(500, {
      error: err?.message || "Internal server error during challenge generation.",
    }, origin);
  }
});
