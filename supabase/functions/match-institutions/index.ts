/// <reference path="../deno.d.ts" />

import { createClient } from "npm:@supabase/supabase-js";

type MatchInstitutionsRequestBody = {
  challenge_id?: string;
  challengeId?: string;
  rerun?: boolean;
};

type InstitutionRecord = {
  id: string;
  name: string;
  official_name: string | null;
  institution_type: string;
  acronym: string | null;
  description: string | null;
  city: string;
  state: string;
  nirf_rank: number | null;
  naac_grade: string | null;
  verification_status: string;
  is_active: boolean;
  departments: string[];
  research_domains: string[];
  areas_of_expertise: string[];
  technologies: string[];
  laboratories: string[];
  facilities: string[];
  equipment: string[];
  field_capabilities: string[];
  collaboration_capabilities: string[];
  projects?: Array<{
    title: string;
    description: string | null;
    domain: string | null;
    technologies: string[];
    outcomes: string[];
  }>;
};

type DimensionScores = {
  research_domains: number; // max 20
  technical_expertise: number; // max 15
  technologies: number; // max 10
  facilities_and_labs: number; // max 10
  previous_projects: number; // max 10
  research_requirements: number; // max 10
  field_capabilities: number; // max 10
  multidisciplinary_fit: number; // max 5
  geographic_scope: number; // max 5
  collaboration_readiness: number; // max 5
};

type CandidateMatchEvaluation = {
  institution: InstitutionRecord;
  structured_score: number;
  dimension_scores: DimensionScores;
  matched_capabilities: string[];
  partial_matches: string[];
  missing_capabilities: string[];
  unknown_capabilities: string[];
  strengths: string[];
  concerns: string[];
  recommended_role?: string;
  ai_score?: number;
  overall_score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  match_explanation?: string;
  ai_reasoning?: string;
  rank?: number;
  is_top_10?: boolean;
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

// Tokenize and clean text for capability alignment
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["and", "the", "for", "with", "from", "that", "this", "are"].includes(t));
}

function calculateJaccardOrOverlap(queryTokens: Set<string>, targetTokens: Set<string>): number {
  if (queryTokens.size === 0 || targetTokens.size === 0) return 0;
  let matches = 0;
  for (const token of queryTokens) {
    if (targetTokens.has(token)) matches++;
  }
  return matches / Math.min(queryTokens.size, Math.max(targetTokens.size, 1));
}

// Multi-Dimensional Capability Scoring Engine
function evaluateInstitutionStructuredScore(
  institution: InstitutionRecord,
  challenge: any
): { score: number; dimensions: DimensionScores; matchedCapabilities: string[]; missingCapabilities: string[] } {
  const reqDomains = (challenge.required_domains || []) as string[];
  const reqTech = (challenge.potential_technology_areas || []) as string[];
  const objectives = (challenge.objectives || []) as string[];
  const researchReq = challenge.research_requirements || "";
  const constraints = (challenge.constraints || []) as string[];
  const problemCategory = challenge.problem_category || challenge.category || "";
  const geographicScope = (challenge.geographic_scope || "").toLowerCase();

  const challengeTokens = new Set([
    ...tokenize(challenge.title || ""),
    ...tokenize(challenge.problem_statement || ""),
    ...tokenize(challenge.root_cause || ""),
    ...tokenize(problemCategory),
  ]);

  const reqDomainTokens = new Set(reqDomains.flatMap(tokenize));
  const reqTechTokens = new Set(reqTech.flatMap(tokenize));
  const researchReqTokens = new Set(tokenize(researchReq));

  // Institution Tokens
  const instDomainTokens = new Set(institution.research_domains.flatMap(tokenize));
  const instExpertiseTokens = new Set(institution.areas_of_expertise.flatMap(tokenize));
  const instTechTokens = new Set(institution.technologies.flatMap(tokenize));
  const instLabTokens = new Set(institution.laboratories.flatMap(tokenize));
  const instFacilitiesTokens = new Set(institution.facilities.flatMap(tokenize));
  const instEquipTokens = new Set(institution.equipment.flatMap(tokenize));
  const instFieldTokens = new Set(institution.field_capabilities.flatMap(tokenize));
  const instCollabTokens = new Set(institution.collaboration_capabilities.flatMap(tokenize));
  const instDeptTokens = new Set(institution.departments.flatMap(tokenize));

  const matchedCapabilities: string[] = [];
  const missingCapabilities: string[] = [];

  // Dimension A: Research Domains Alignment (Max: 20)
  let domainScore = 0;
  let domainMatches = 0;
  for (const rd of reqDomains) {
    const rdTokens = tokenize(rd);
    const matched = institution.research_domains.some((id) =>
      rdTokens.some((t) => id.toLowerCase().includes(t))
    );
    if (matched) {
      domainMatches++;
      matchedCapabilities.push(rd);
    } else {
      missingCapabilities.push(rd);
    }
  }
  if (reqDomains.length > 0) {
    domainScore = (domainMatches / reqDomains.length) * 20;
  } else {
    const overlap = calculateJaccardOrOverlap(challengeTokens, instDomainTokens);
    domainScore = Math.min(overlap * 20, 20);
  }

  // Dimension B: Technical Expertise (Max: 15)
  const expertiseOverlap = calculateJaccardOrOverlap(challengeTokens, instExpertiseTokens);
  const domainExpertiseOverlap = calculateJaccardOrOverlap(reqDomainTokens, instExpertiseTokens);
  const technicalExpertiseScore = Math.min(
    (expertiseOverlap * 0.5 + domainExpertiseOverlap * 0.5) * 25,
    15
  );

  // Dimension C: Technology Capability (Max: 10)
  let techScore = 0;
  let techMatches = 0;
  for (const tech of reqTech) {
    const tTokens = tokenize(tech);
    const matched = institution.technologies.some((it) =>
      tTokens.some((token) => it.toLowerCase().includes(token))
    );
    if (matched) {
      techMatches++;
      matchedCapabilities.push(tech);
    }
  }
  if (reqTech.length > 0) {
    techScore = (techMatches / reqTech.length) * 10;
  } else {
    techScore = Math.min(calculateJaccardOrOverlap(reqTechTokens, instTechTokens) * 15, 10);
  }

  // Dimension D: Facilities & Labs Availability (Max: 10)
  const allLabTokens = new Set([...instLabTokens, ...instFacilitiesTokens, ...instEquipTokens]);
  const labChallengeOverlap = calculateJaccardOrOverlap(reqDomainTokens, allLabTokens);
  const labScore = institution.laboratories.length > 0 || institution.facilities.length > 0
    ? Math.min(2 + labChallengeOverlap * 10, 10)
    : 0;

  // Dimension E: Previous Relevant Work (Projects) (Max: 10)
  let projectScore = 0;
  const projects = institution.projects || [];
  if (projects.length > 0) {
    let bestProjOverlap = 0;
    for (const p of projects) {
      const pTokens = new Set([
        ...tokenize(p.title),
        ...tokenize(p.description || ""),
        ...tokenize(p.domain || ""),
        ...p.technologies.flatMap(tokenize),
      ]);
      const overlap = calculateJaccardOrOverlap(challengeTokens, pTokens);
      if (overlap > bestProjOverlap) bestProjOverlap = overlap;
    }
    projectScore = Math.min(4 + bestProjOverlap * 12, 10);
  }

  // Dimension F: Research Requirements Alignment (Max: 10)
  let researchReqScore = 0;
  if (researchReqTokens.size > 0) {
    const resOverlap = calculateJaccardOrOverlap(
      researchReqTokens,
      new Set([...instDomainTokens, ...instExpertiseTokens, ...instLabTokens])
    );
    researchReqScore = Math.min(resOverlap * 15, 10);
  } else {
    researchReqScore = (domainScore / 20) * 10;
  }

  // Dimension G: Field Deployment Capability (Max: 10)
  let fieldScore = 0;
  if (institution.field_capabilities.length > 0) {
    const fieldTokens = instFieldTokens;
    const needsField = challengeTokens.has("field") || challengeTokens.has("pilot") || challengeTokens.has("rural") || challengeTokens.has("deployment");
    if (needsField) {
      const fieldOverlap = calculateJaccardOrOverlap(challengeTokens, fieldTokens);
      fieldScore = Math.min(4 + fieldOverlap * 10, 10);
    } else {
      fieldScore = Math.min(institution.field_capabilities.length * 2.5, 10);
    }
  }

  // Dimension H: Multidisciplinary Fit (Max: 5)
  // Higher if institution has multiple distinct departments or complementary domains
  const deptCount = institution.departments.length;
  const domainCount = institution.research_domains.length;
  let multiScore = 0;
  if (deptCount >= 3 || domainCount >= 4) {
    multiScore = 5;
  } else if (deptCount >= 1 || domainCount >= 2) {
    multiScore = 3;
  } else {
    multiScore = 1;
  }

  // Dimension I: Geographic Scope / Readiness (Max: 5)
  let geoScore = 3; // Baseline regional neutral
  if (geographicScope) {
    if (geographicScope.includes(institution.state.toLowerCase()) || geographicScope.includes(institution.city.toLowerCase())) {
      geoScore = 5;
    } else if (geographicScope.includes("national") || geographicScope.includes("india")) {
      geoScore = 4;
    }
  }

  // Dimension J: Collaboration Capability (Max: 5)
  let collabScore = 2;
  if (institution.collaboration_capabilities.length >= 3) {
    collabScore = 5;
  } else if (institution.collaboration_capabilities.length >= 1) {
    collabScore = 3.5;
  }

  const dimensions: DimensionScores = {
    research_domains: Math.round(domainScore * 10) / 10,
    technical_expertise: Math.round(technicalExpertiseScore * 10) / 10,
    technologies: Math.round(techScore * 10) / 10,
    facilities_and_labs: Math.round(labScore * 10) / 10,
    previous_projects: Math.round(projectScore * 10) / 10,
    research_requirements: Math.round(researchReqScore * 10) / 10,
    field_capabilities: Math.round(fieldScore * 10) / 10,
    multidisciplinary_fit: Math.round(multiScore * 10) / 10,
    geographic_scope: Math.round(geoScore * 10) / 10,
    collaboration_readiness: Math.round(collabScore * 10) / 10,
  };

  const totalRaw =
    dimensions.research_domains +
    dimensions.technical_expertise +
    dimensions.technologies +
    dimensions.facilities_and_labs +
    dimensions.previous_projects +
    dimensions.research_requirements +
    dimensions.field_capabilities +
    dimensions.multidisciplinary_fit +
    dimensions.geographic_scope +
    dimensions.collaboration_readiness;

  const normalizedScore = Math.min(Math.max(Math.round(totalRaw * 10) / 10, 0), 100);

  return {
    score: normalizedScore,
    dimensions,
    matchedCapabilities: Array.from(new Set(matchedCapabilities)),
    missingCapabilities: Array.from(new Set(missingCapabilities)),
  };
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  const origin = req.headers.get("origin");

  // Handle CORS
  if (req.method === "OPTIONS") {
    return json(200, { ok: true }, origin);
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[match-institutions] Missing Supabase credentials");
    return json(500, { error: "Internal server configuration error." }, origin);
  }

  let body: MatchInstitutionsRequestBody = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON request body." }, origin);
  }

  const challengeId = (body.challenge_id || body.challengeId || "").trim();
  if (!challengeId) {
    return json(400, { error: "Missing required field: challenge_id" }, origin);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // 1. Authorize Caller (Role Check: ADMIN or INNOVATION_MANAGER)
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

  // Fallback check
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
      // Ignored
    }
  }

  // Reject unauthorized roles
  const callerRole = callerProfile?.role?.code;
  if (callerRole && !["ADMIN", "INNOVATION_MANAGER"].includes(callerRole)) {
    return json(403, { error: "Unauthorized. Only Innovation Managers and Platform Administrators can initiate institution matching." }, origin);
  }

  // 2. Load and Validate Challenge
  const { data: challenge, error: chalError } = await supabaseAdmin
    .from("innovation_challenges")
    .select("*")
    .eq("id", challengeId)
    .maybeSingle();

  if (chalError || !challenge) {
    return json(404, { error: `Innovation challenge not found: ${challengeId}` }, origin);
  }

  // Challenge must be APPROVED or in a matching/selected state
  const allowedStatuses = [
    "APPROVED",
    "READY_FOR_MATCHING",
    "MATCHING_IN_PROGRESS",
    "MATCHING_COMPLETED",
    "INSTITUTIONS_SELECTED",
  ];

  if (!allowedStatuses.includes(challenge.status)) {
    return json(400, {
      error: `Cannot match unapproved challenge. Current status is '${challenge.status}'. Only approved innovation challenges can undergo institution matching.`,
    }, origin);
  }

  // 3. Dynamic Query of All Eligible Institutions (Verification Status = 'VERIFIED' and is_active = true)
  const { data: eligibleInstitutions, error: instError } = await supabaseAdmin
    .from("institutions")
    .select(`
      id,
      name,
      official_name,
      institution_type,
      acronym,
      description,
      city,
      state,
      nirf_rank,
      naac_grade,
      verification_status,
      is_active,
      departments,
      research_domains,
      areas_of_expertise,
      technologies,
      laboratories,
      facilities,
      equipment,
      field_capabilities,
      collaboration_capabilities
    `)
    .eq("verification_status", "VERIFIED")
    .eq("is_active", true);

  if (instError) {
    console.error("[match-institutions] Failed to load institutions:", instError);
    return json(500, { error: "Failed to load institution registry data." }, origin);
  }

  if (!eligibleInstitutions || eligibleInstitutions.length === 0) {
    return json(400, {
      error: "No verified, active institutions found in the registry to evaluate.",
    }, origin);
  }

  // Fetch projects for eligible institutions
  const instIds = eligibleInstitutions.map((i) => i.id);
  const { data: projectsData } = await supabaseAdmin
    .from("institution_projects")
    .select("institution_id, title, description, domain, technologies, outcomes")
    .in("institution_id", instIds);

  const projectsByInst = new Map<string, any[]>();
  (projectsData || []).forEach((p) => {
    const list = projectsByInst.get(p.institution_id) || [];
    list.push(p);
    projectsByInst.set(p.institution_id, list);
  });

  const fullInstitutions: InstitutionRecord[] = eligibleInstitutions.map((i) => ({
    ...i,
    projects: projectsByInst.get(i.id) || [],
  }));

  // 4. Structured Multi-Dimensional Capability Scoring
  const evaluations: CandidateMatchEvaluation[] = fullInstitutions.map((inst) => {
    const { score, dimensions, matchedCapabilities, missingCapabilities } =
      evaluateInstitutionStructuredScore(inst, challenge);

    // Compute completeness of profile evidence
    let completenessFields = 0;
    if (inst.research_domains.length > 0) completenessFields++;
    if (inst.areas_of_expertise.length > 0) completenessFields++;
    if (inst.technologies.length > 0) completenessFields++;
    if (inst.laboratories.length > 0 || inst.facilities.length > 0) completenessFields++;
    if (inst.field_capabilities.length > 0) completenessFields++;
    if (inst.projects && inst.projects.length > 0) completenessFields++;

    const confidence: "HIGH" | "MEDIUM" | "LOW" =
      completenessFields >= 4 && score >= 60 ? "HIGH" : completenessFields >= 2 ? "MEDIUM" : "LOW";

    const strengths: string[] = [];
    if (dimensions.research_domains >= 12) strengths.push("Strong alignment in required research domains");
    if (dimensions.technical_expertise >= 9) strengths.push("Proven specialized technical expertise");
    if (dimensions.technologies >= 6) strengths.push("Direct capability in potential technology areas");
    if (dimensions.facilities_and_labs >= 6) strengths.push("Dedicated research laboratories & equipment");
    if (dimensions.previous_projects >= 5) strengths.push("Demonstrated past pilot or civic research projects");
    if (dimensions.field_capabilities >= 5) strengths.push("Documented field deployment readiness");

    const concerns: string[] = [];
    if (missingCapabilities.length > 0) {
      concerns.push(`No verified evidence for: ${missingCapabilities.slice(0, 3).join(", ")}`);
    }
    if (dimensions.facilities_and_labs < 3) {
      concerns.push("Limited verified laboratory facilities documented in registry");
    }
    if (dimensions.field_capabilities < 2) {
      concerns.push("Field deployment / pilot testing capability not explicitly confirmed");
    }

    return {
      institution: inst,
      structured_score: score,
      dimension_scores: dimensions,
      matched_capabilities: matchedCapabilities,
      partial_matches: [],
      missing_capabilities: missingCapabilities,
      unknown_capabilities: [],
      strengths,
      concerns,
      overall_score: score,
      confidence,
    };
  });

  // Sort by structured score descending
  evaluations.sort((a, b) => b.structured_score - a.structured_score);

  // 5. Shortlist top candidates for Gemini Semantic AI Reasoning
  // Evaluate top 15 candidates with Gemini
  const shortlistCount = Math.min(evaluations.length, 15);
  const shortlist = evaluations.slice(0, shortlistCount);

  let successfulModel = "gemini-3.6-flash";
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiApiKey && shortlist.length > 0) {
    try {
      const promptChallengeData = {
        title: challenge.title,
        problem_statement: challenge.problem_statement,
        root_cause: challenge.root_cause,
        required_domains: challenge.required_domains,
        potential_technology_areas: challenge.potential_technology_areas,
        objectives: challenge.objectives,
        expected_outcomes: challenge.expected_outcomes,
        constraints: challenge.constraints,
        research_requirements: challenge.research_requirements,
      };

      const promptInstitutions = shortlist.map((e) => ({
        id: e.institution.id,
        name: e.institution.name,
        type: e.institution.institution_type,
        city: e.institution.city,
        state: e.institution.state,
        departments: e.institution.departments,
        research_domains: e.institution.research_domains,
        areas_of_expertise: e.institution.areas_of_expertise,
        technologies: e.institution.technologies,
        laboratories: e.institution.laboratories,
        facilities: e.institution.facilities,
        equipment: e.institution.equipment,
        field_capabilities: e.institution.field_capabilities,
        collaboration_capabilities: e.institution.collaboration_capabilities,
        past_projects: (e.institution.projects || []).map((p) => ({
          title: p.title,
          domain: p.domain,
          technologies: p.technologies,
        })),
        structured_score: e.structured_score,
      }));

      const systemPrompt = `You are an institutional capability matching engine for CivicFix.
Your job is to evaluate how well an institution's VERIFIED capability profile matches the requirements of an APPROVED civic innovation challenge.

STRICT ANTI-HALLUCINATION POLICY:
1. You MUST use ONLY the supplied challenge and verified institution data.
2. Do NOT invent facilities, laboratories, equipment, faculty, researchers, projects, technologies, partnerships, geographical capabilities, certifications, funding, or achievements.
3. If an institution does not explicitly list a facility, equipment, or project in its profile, it is NOT_FOUND or UNKNOWN. Do NOT assume it exists.
4. Do NOT assume an institution is capable merely because its name, category, or prestige suggests relevance.
5. Provide cautious, evidence-backed evaluation.

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON array of objects, one per institution in the same order or keyed by "institution_id":
[
  {
    "institution_id": "uuid",
    "ai_score": 0-100,
    "confidence": "HIGH" | "MEDIUM" | "LOW",
    "matched_capabilities": ["list of verified matching capabilities from profile"],
    "partial_matches": ["list of capabilities with partial overlap"],
    "missing_capabilities": ["important challenge requirements with no verified evidence"],
    "unknown_capabilities": ["areas where registry data is incomplete"],
    "strengths": ["bullet points of actual verified strengths"],
    "concerns": ["bullet points of potential gaps or missing infrastructure"],
    "recommended_role": "Lead R&D Partner" | "Technology Prototyping Partner" | "Field Pilot & Deployment Partner" | "Advisory & Validation Partner",
    "match_explanation": "Concise 2-3 sentence explanation of why this institution matches and what verified evidence supports it.",
    "ai_reasoning": "Deeper analysis of technical feasibility and capability fit."
  }
]`;

      const userPrompt = `APPROVED INNOVATION CHALLENGE:
${JSON.stringify(promptChallengeData, null, 2)}

VERIFIED INSTITUTION CANDIDATES:
${JSON.stringify(promptInstitutions, null, 2)}

Evaluate each institution strictly against the challenge requirements and return JSON array.`;

      // Preferred model order: gemini-3.6-flash is primary (as recommended by Google API)
      // Fallbacks: gemini-2.5-flash, gemini-1.5-flash
      // Note: gemini-2.0-flash is permanently decommissioned/unavailable (404) and removed
      const preferredModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
      let geminiData: any = null;
      let lastErrorDetails = "";

      const sanitizeSafe = (val: string): string => {
        return val.replace(/key=[^&\s"']+/gi, "key=[REDACTED]");
      };

      const parseHighLevelError = (text: string, status: number): string => {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error?.message) {
            return sanitizeSafe(String(parsed.error.message));
          }
          if (parsed?.error?.status) {
            return sanitizeSafe(String(parsed.error.status));
          }
        } catch {
          // not json
        }
        return sanitizeSafe(text).slice(0, 300) || `HTTP ${status}`;
      };

      const invokeGeminiModel = async (modelName: string): Promise<boolean> => {
        try {
          console.log(`[match-institutions] Attempting model: ${modelName}`);
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                },
              }),
            }
          );

          if (res.ok) {
            const parsed = await res.json();
            const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleanText = rawText.replace(/```json\s*|\s*```/g, "").trim();
              geminiData = JSON.parse(cleanText);
              successfulModel = modelName;
              console.log(`[match-institutions] Model ${modelName} succeeded (HTTP ${res.status})`);
              return true;
            } else {
              lastErrorDetails = `Model ${modelName} returned empty candidate text`;
              console.warn(`[match-institutions] Model ${modelName} returned empty candidate text (HTTP ${res.status})`);
            }
          } else {
            const errText = await res.text();
            const highLevelErr = parseHighLevelError(errText, res.status);
            lastErrorDetails = `Model ${modelName} failed (HTTP ${res.status}): ${highLevelErr}`;
            console.warn(`[match-institutions] Model ${modelName} failed (HTTP ${res.status}): ${highLevelErr}`);
          }
        } catch (mErr) {
          const rawErr = mErr instanceof Error ? mErr.message : String(mErr);
          const safeErr = sanitizeSafe(rawErr);
          lastErrorDetails = `Model ${modelName} invocation error: ${safeErr}`;
          console.warn(`[match-institutions] Model ${modelName} error: ${safeErr}`);
        }
        return false;
      };

      // 1. Try preferred models in order
      for (const model of preferredModels) {
        const ok = await invokeGeminiModel(model);
        if (ok) break;
      }

      // 2. Dynamic discovery fallback if preferred models all failed
      if (!geminiData) {
        try {
          console.log("[match-institutions] Preferred models failed. Querying available models dynamically from Google API...");
          const modelsListRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
          );
          if (modelsListRes.ok) {
            const modelsListData = await modelsListRes.json();
            const discoveredModels: string[] = (modelsListData.models || [])
              .map((m: any) => (m.name || "").replace(/^models\//, ""))
              .filter((name: string) =>
                (name.includes("flash") || name.includes("gemini") || name.includes("pro")) &&
                name !== "gemini-2.0-flash" &&
                !preferredModels.includes(name)
              );

            console.log(`[match-institutions] Dynamically discovered ${discoveredModels.length} alternate models:`, discoveredModels);
            for (const discModel of discoveredModels) {
              const ok = await invokeGeminiModel(discModel);
              if (ok) break;
            }
          } else {
            const listErrText = await modelsListRes.text();
            const safeListErr = parseHighLevelError(listErrText, modelsListRes.status);
            console.warn(`[match-institutions] Dynamic model discovery failed (HTTP ${modelsListRes.status}): ${safeListErr}`);
          }
        } catch (discErr) {
          console.warn("[match-institutions] Dynamic model discovery exception:", discErr);
        }
      }

      // If all models failed, halt and return error rather than silently swallowing
      if (!geminiData || !successfulModel) {
        console.error(`[match-institutions] AI semantic scoring failed. All candidate models failed. Last error: ${lastErrorDetails}`);
        return json(
          502,
          {
            error: "AI semantic scoring failed: No supported Gemini models are available.",
            details: lastErrorDetails || "No models returned valid completions.",
          },
          origin
        );
      }

      const parsedList = Array.isArray(geminiData)
        ? geminiData
        : (geminiData?.evaluations || geminiData?.candidates || geminiData?.institutions || []);

      if (parsedList.length > 0) {
        const geminiByInstId = new Map<string, any>();
        parsedList.forEach((item: any) => {
          const id = item?.institution_id || item?.id;
          if (id) geminiByInstId.set(id, item);
        });

        shortlist.forEach((evalItem) => {
          const aiEval = geminiByInstId.get(evalItem.institution.id);
          if (aiEval) {
            const rawAi = typeof aiEval.ai_score === "number" ? aiEval.ai_score : (typeof aiEval.score === "number" ? aiEval.score : null);
            const aiScore = rawAi !== null ? Math.min(Math.max(rawAi, 0), 100) : evalItem.structured_score;
            evalItem.ai_score = Math.round(aiScore * 10) / 10;
            evalItem.overall_score = Math.round((evalItem.structured_score * 0.5 + aiScore * 0.5) * 10) / 10;
            if (aiEval.confidence) evalItem.confidence = aiEval.confidence;
            if (Array.isArray(aiEval.matched_capabilities) && aiEval.matched_capabilities.length > 0) {
              evalItem.matched_capabilities = aiEval.matched_capabilities;
            }
            if (Array.isArray(aiEval.partial_matches)) evalItem.partial_matches = aiEval.partial_matches;
            if (Array.isArray(aiEval.missing_capabilities)) evalItem.missing_capabilities = aiEval.missing_capabilities;
            if (Array.isArray(aiEval.unknown_capabilities)) evalItem.unknown_capabilities = aiEval.unknown_capabilities;
            if (Array.isArray(aiEval.strengths) && aiEval.strengths.length > 0) evalItem.strengths = aiEval.strengths;
            if (Array.isArray(aiEval.concerns) && aiEval.concerns.length > 0) evalItem.concerns = aiEval.concerns;
            evalItem.recommended_role = aiEval.recommended_role || (evalItem.overall_score >= 70 ? "Lead R&D Partner" : "Collaborative Research Partner");
            evalItem.match_explanation = aiEval.match_explanation || `Verified capability alignment in ${evalItem.institution.research_domains.slice(0, 3).join(", ")}.`;
            evalItem.ai_reasoning = aiEval.ai_reasoning || "";
          } else {
            evalItem.ai_score = evalItem.structured_score;
            evalItem.overall_score = evalItem.structured_score;
            evalItem.match_explanation = `High structured capability alignment in ${evalItem.institution.research_domains.slice(0, 3).join(", ")}.`;
          }
        });
      }
    } catch (gErr) {
      console.error("[match-institutions] Gemini evaluation error:", gErr);
      return json(
        502,
        {
          error: "AI semantic scoring failed due to unexpected error.",
          details: gErr instanceof Error ? gErr.message : String(gErr),
        },
        origin
      );
    }
  } else if (!geminiApiKey) {
    console.error("[match-institutions] Server misconfiguration: Missing GEMINI_API_KEY");
    return json(500, { error: "AI service configuration error: GEMINI_API_KEY is missing." }, origin);
  }

  // Ensure every evaluation has explanation and ai_score is numeric
  evaluations.forEach((item) => {
    if (item.ai_score === undefined || item.ai_score === null) {
      item.ai_score = item.structured_score;
    }
    if (!item.match_explanation) {
      item.match_explanation = `Verified capability alignment across ${item.institution.research_domains.slice(0, 3).join(", ") || "core disciplines"}.`;
    }
    if (!item.recommended_role) {
      item.recommended_role = item.overall_score >= 70 ? "Lead R&D Partner" : "Collaborative Research Partner";
    }
  });

  // Re-sort all by overall_score descending
  evaluations.sort((a, b) => b.overall_score - a.overall_score);

  // Assign ranks & flag top 10
  evaluations.forEach((item, index) => {
    item.rank = index + 1;
    item.is_top_10 = index < 10;
  });

  const top10 = evaluations.slice(0, 10);
  const top10Ids = top10.map((item) => item.institution.id);

  // 6. Auditable Persistence: Create Match Run & Matches
  const { data: matchRun, error: runError } = await supabaseAdmin
    .from("institution_match_runs")
    .insert({
      challenge_id: challengeId,
      created_by: callerProfile?.id || null,
      status: "COMPLETED",
      algorithm_version: "v1.0-hybrid",
      ai_model_version: successfulModel || "gemini-3.6-flash",
      eligible_candidates_count: evaluations.length,
      top_10_institution_ids: top10Ids,
      summary: {
        total_eligible: evaluations.length,
        top_10_average_score: Math.round((top10.reduce((acc, curr) => acc + curr.overall_score, 0) / Math.max(top10.length, 1)) * 10) / 10,
        highest_score: top10[0]?.overall_score || 0,
        lowest_top_10_score: top10[top10.length - 1]?.overall_score || 0,
        evaluated_at: new Date().toISOString(),
      },
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError || !matchRun) {
    console.error("[match-institutions] Failed to save match run:", runError);
    return json(500, { error: "Failed to persist match run record." }, origin);
  }

  // Insert all matches records
  const matchesInsertPayload = evaluations.map((item) => ({
    match_run_id: matchRun.id,
    challenge_id: challengeId,
    institution_id: item.institution.id,
    rank: item.rank!,
    is_top_10: item.is_top_10!,
    overall_score: item.overall_score,
    structured_score: item.structured_score,
    ai_score: item.ai_score || null,
    confidence: item.confidence,
    dimension_scores: item.dimension_scores,
    matched_capabilities: item.matched_capabilities,
    partial_matches: item.partial_matches,
    missing_capabilities: item.missing_capabilities,
    unknown_capabilities: item.unknown_capabilities,
    strengths: item.strengths,
    concerns: item.concerns,
    recommended_role: item.recommended_role || null,
    match_explanation: item.match_explanation || null,
    ai_reasoning: item.ai_reasoning || null,
  }));

  const { error: matchesInsertError } = await supabaseAdmin
    .from("institution_matches")
    .insert(matchesInsertPayload);

  if (matchesInsertError) {
    console.error("[match-institutions] Failed to save institution matches:", matchesInsertError);
    return json(500, { error: "Failed to persist institution matches." }, origin);
  }

  // Update challenge status to MATCHING_COMPLETED if it was APPROVED or READY_FOR_MATCHING
  if (["APPROVED", "READY_FOR_MATCHING", "MATCHING_IN_PROGRESS"].includes(challenge.status)) {
    await supabaseAdmin
      .from("innovation_challenges")
      .update({ status: "MATCHING_COMPLETED" })
      .eq("id", challengeId);
  }

  const durationMs = Date.now() - startTime;

  return json(
    200,
    {
      success: true,
      matchRunId: matchRun.id,
      match_run_id: matchRun.id,
      totalEvaluated: evaluations.length,
      total_evaluated: evaluations.length,
      top10Count: top10.length,
      top_10_count: top10.length,
      durationMs: durationMs,
      duration_ms: durationMs,
      challengeStatus: "MATCHING_COMPLETED",
      challenge_status: "MATCHING_COMPLETED",
      match_run: matchRun,
      top_10: top10.map((e) => ({
        institution_id: e.institution.id,
        institution_name: e.institution.name,
        institution_type: e.institution.institution_type,
        city: e.institution.city,
        state: e.institution.state,
        nirf_rank: e.institution.nirf_rank,
        naac_grade: e.institution.naac_grade,
        rank: e.rank,
        overall_score: e.overall_score,
        structured_score: e.structured_score,
        ai_score: e.ai_score,
        confidence: e.confidence,
        dimension_scores: e.dimension_scores,
        matched_capabilities: e.matched_capabilities,
        partial_matches: e.partial_matches,
        missing_capabilities: e.missing_capabilities,
        strengths: e.strengths,
        concerns: e.concerns,
        recommended_role: e.recommended_role,
        match_explanation: e.match_explanation,
        ai_reasoning: e.ai_reasoning,
      })),
      total_evaluated: evaluations.length,
      evaluated_at: matchRun.created_at,
    },
    origin
  );
});
