/// <reference path="../deno.d.ts" />

import { createClient } from "npm:@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "npm:jose";
import { verifyToken } from "npm:@clerk/backend";

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

function getClerkDomain(): string {
  const pk = Deno.env.get("CLERK_PUBLISHABLE_KEY") || "pk_test_bmV1dHJhbC1zbmFpbC00NTE4LmNsZXJrLmFjY291bnRzLmRldiQ";
  try {
    const raw = pk.replace(/^pk_(test|live)_/, "");
    const decoded = atob(raw).replace(/\$$/, "");
    if (decoded.includes(".")) {
      return decoded;
    }
  } catch {
    // fallback
  }
  return "neutral-snail-4518.clerk.accounts.dev";
}

const CLERK_DOMAIN = getClerkDomain();
const CLERK_JWKS_URL = `https://${CLERK_DOMAIN}/.well-known/jwks.json`;
const clerkJwks = createRemoteJWKSet(new URL(CLERK_JWKS_URL));

async function verifyClerkSessionToken(token: string): Promise<string | null> {
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (clerkSecretKey) {
    try {
      const payload = await verifyToken(token, { secretKey: clerkSecretKey });
      if (payload && typeof payload.sub === "string" && payload.sub.trim().length > 0) {
        return payload.sub.trim();
      }
    } catch {
      // Fall through to direct JWKS verification
    }
  }

  try {
    const { payload } = await jwtVerify(token, clerkJwks, {
      issuer: (iss) => !iss || iss.includes("clerk") || iss.includes(CLERK_DOMAIN),
    });
    if (payload && typeof payload.sub === "string" && payload.sub.trim().length > 0) {
      return payload.sub.trim();
    }
  } catch {
    // Invalid signature, expired, or malformed
  }

  return null;
}

async function verifySupabaseAuthToken(token: string, supabaseAdmin: ReturnType<typeof createClient>): Promise<string | null> {
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (!userError && userData?.user?.id) {
      return userData.user.id;
    }
  } catch {
    // Not a valid Supabase auth token
  }
  return null;
}

type TranscribeRequestBody = {
  audioBase64?: string;
  mimeType?: string;
  languageHint?: string;
  fieldMode?: "title" | "description" | "notes" | "general";
};

type GeminiTranscriptionOutput = {
  text?: string;
  transcription?: string;
  englishTranslation?: string;
  suggestedTitle?: string;
  suggestedEnglishTitle?: string;
  detectedLanguage?: string;
  languageName?: string;
  script?: string;
  isRtl?: boolean;
  confidence?: number;
};

// Supported audio MIME types for Gemini multimodal API
const SUPPORTED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/m4a",
  "audio/flac",
  "audio/x-m4a",
  "audio/aiff",
  "audio/l16",
]);

const VALID_FIELD_MODES = new Set(["title", "description", "notes", "general"]);

const VALID_INDIC_LANGUAGE_CODES = new Set([
  "en", "hi", "mr", "bn", "gu", "pa", "ta", "te", "kn", "ml",
  "or", "as", "ur", "sa", "ne", "kok", "ks", "sd", "mai", "mni"
]);

function normalizeMimeType(rawMimeType?: string): string {
  if (!rawMimeType || typeof rawMimeType !== "string") {
    return "audio/webm";
  }
  const clean = rawMimeType.split(";")[0].trim().toLowerCase();
  if (clean === "audio/mp3") return "audio/mp3";
  if (clean === "audio/x-m4a") return "audio/m4a";
  if (SUPPORTED_MIME_TYPES.has(clean)) return clean;
  // If video container was recorded instead of audio container (common in some webviews/browsers)
  if (clean === "video/webm") return "audio/webm";
  if (clean === "video/mp4") return "audio/mp4";
  return "audio/webm";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const requestId = crypto.randomUUID().slice(0, 8);

  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return json(200, { ok: true }, origin);
  }

  if (req.method !== "POST") {
    return json(405, {
      success: false,
      errorCode: "METHOD_NOT_ALLOWED",
      userMessage: "Method not allowed. Use POST.",
      requestId,
    }, origin);
  }

  // =========================================================================
  // 1. AUTHENTICATE CALLER — STRICT FAIL-CLOSED
  // =========================================================================
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json(401, {
      success: false,
      errorCode: "UNAUTHORIZED",
      userMessage: "Authentication required to transcribe voice audio.",
      requestId,
    }, origin);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return json(401, {
      success: false,
      errorCode: "UNAUTHORIZED",
      userMessage: "Authentication token missing.",
      requestId,
    }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  let isServiceRole = false;
  if (supabaseServiceKey && token === supabaseServiceKey) {
    isServiceRole = true;
  } else {
    let verifiedUserId: string | null = await verifyClerkSessionToken(token);
    if (!verifiedUserId && supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });
      verifiedUserId = await verifySupabaseAuthToken(token, supabaseAdmin);
    }

    if (!verifiedUserId) {
      return json(401, {
        success: false,
        errorCode: "UNAUTHORIZED",
        userMessage: "Invalid, forged, or expired authentication token.",
        requestId,
      }, origin);
    }
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    console.error(`[transcribe-voice:${requestId}] Server misconfiguration: Missing GEMINI_API_KEY`);
    return json(500, {
      success: false,
      errorCode: "GEMINI_API_FAILED",
      userMessage: "Voice processing is temporarily unavailable. You can type your response instead.",
      requestId,
    }, origin);
  }

  let body: TranscribeRequestBody = {};
  try {
    body = await req.json();
  } catch {
    return json(400, {
      success: false,
      errorCode: "INVALID_JSON_BODY",
      userMessage: "Invalid request payload format.",
      requestId,
    }, origin);
  }

  const audioBase64 = body.audioBase64?.trim();
  if (!audioBase64 || audioBase64.length < 50) {
    console.warn(`[transcribe-voice:${requestId}] Audio payload is empty or too short (${audioBase64?.length ?? 0} chars)`);
    return json(400, {
      success: false,
      errorCode: "EMPTY_AUDIO",
      userMessage: "The recording was empty. Please try speaking into the microphone again.",
      requestId,
    }, origin);
  }

  // Enforce abuse/size limit: max 12 MB base64 (~9 MB decoded audio)
  if (audioBase64.length > 12000000) {
    return json(413, {
      success: false,
      errorCode: "PAYLOAD_TOO_LARGE",
      userMessage: "The audio recording exceeds the maximum allowable size (9 MB). Please record a shorter audio clip.",
      requestId,
    }, origin);
  }

  // Sanitize base64 data (strip data URL scheme if included)
  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "").trim();

  // Validate base64 structure
  if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64.replace(/\s+/g, ""))) {
    return json(400, {
      success: false,
      errorCode: "INVALID_AUDIO_DATA",
      userMessage: "The audio recording data format is corrupt. Please record again.",
      requestId,
    }, origin);
  }

  const approximateBytes = Math.round((cleanBase64.length * 3) / 4);
  if (approximateBytes < 250) {
    return json(400, {
      success: false,
      errorCode: "AUDIO_TOO_SHORT",
      userMessage: "The recording was too short. Please speak for at least 1-2 seconds.",
      requestId,
    }, origin);
  }

  const mimeType = normalizeMimeType(body.mimeType);
  const rawLanguageHint = body.languageHint?.trim().toLowerCase() || "en";
  const languageHint = VALID_INDIC_LANGUAGE_CODES.has(rawLanguageHint) ? rawLanguageHint : "en";
  const fieldMode = body.fieldMode && VALID_FIELD_MODES.has(body.fieldMode) ? body.fieldMode : "description";

  console.log(`[transcribe-voice:${requestId}] Processing audio (${approximateBytes} bytes, mime=${mimeType}, hint=${languageHint}, field=${fieldMode})`);

  const systemPrompt = `You are the Expert Multilingual Speech-to-Text & Translation AI Engine for CivicFix, India's public municipal grievance redressal platform.

CORE CAPABILITIES & RULES:
1. ALL 20 INDIC LANGUAGES SUPPORTED:
   You accurately detect and transcribe speech in all 20 official CivicFix languages and their authentic native scripts:
   - English (en) [Latin]
   - Hindi (hi) [Devanagari - हिन्दी]
   - Marathi (mr) [Devanagari - मराठी]
   - Bengali (bn) [Bengali - বাংলা]
   - Gujarati (gu) [Gujarati - ગુજરાતી]
   - Punjabi (pa) [Gurmukhi - ਪੰਜਾਬੀ]
   - Tamil (ta) [Tamil - தமிழ்]
   - Telugu (te) [Telugu - తెలుగు]
   - Kannada (kn) [Kannada - ಕನ್ನಡ]
   - Malayalam (ml) [Malayalam - മലയാളം]
   - Odia (or) [Odia - ଓଡ଼ିଆ]
   - Assamese (as) [Assamese - অসমীয়া]
   - Urdu (ur) [Arabic - اردو] (isRtl: true)
   - Sanskrit (sa) [Devanagari - संस्कृतम्]
   - Nepali (ne) [Devanagari - नेपाली]
   - Konkani (kok) [Devanagari - कोंकणी]
   - Kashmiri (ks) [Arabic/Devanagari - کٲشُر] (isRtl: true if Arabic script)
   - Sindhi (sd) [Arabic/Devanagari - سنڌي] (isRtl: true if Arabic script)
   - Maithili (mai) [Devanagari - मैथिली]
   - Manipuri (mni) [Meetei Mayek / Bengali - মৈতৈলোন্]
   - Also handle mixed code-switching (e.g. Hinglish, Tanglish, Marathi-English).

2. INDEPENDENT SPOKEN LANGUAGE DETECTION:
   - The user interface language is provided strictly as a recognition hint ('${languageHint}').
   - Citizens very often speak a different language than their UI language (e.g. UI is Hindi, citizen speaks Marathi; UI is English, citizen speaks Tamil; UI is Gujarati, citizen speaks Hindi).
   - You MUST detect the ACTUAL spoken language independently from the audio. Never force the detected language to match the UI language hint unless that is genuinely what was spoken.

3. FIELD MODES:
   - fieldMode = "title": Citizen is speaking an issue title or summary. Return a concise title in original language (max 8 words) and suggested English title (max 8 words).
   - fieldMode = "description": Citizen is describing a full municipal problem. Provide full verbatim transcription in native script and natural canonical English translation. Do NOT summarize or omit details.
   - fieldMode = "notes": Citizen is providing landmark or location directions (e.g. "near Gram Panchayat office, next to water tank"). Transcribe verbatim and translate to canonical English.
   - fieldMode = "general": Verbatim transcription and canonical English translation.

4. SILENCE & BACKGROUND NOISE HANDLING:
   - If the audio contains only silence, background static, breathing, or unintelligible noise with NO human speech:
     Return empty string for transcription (""), empty englishTranslation (""), and confidence: 0.0.

5. SCRIPT & CIVIC TERMINOLOGY FIDELITY:
   - Transcribe in the EXACT authentic native script of the spoken language.
   - Preserve municipal landmarks, ward numbers, road names, colony names, and civic issues accurately.
   - For Urdu, Kashmiri, and Sindhi in Arabic script, set isRtl: true.

6. JSON OUTPUT SCHEMA:
Return ONLY a valid JSON object matching this schema:
{
  "transcription": "Verbatim spoken text in native script of spoken language (or empty string if silence)",
  "englishTranslation": "Complete and accurate English canonical translation (or empty string if silence)",
  "suggestedTitle": "Concise title in the spoken language (max 8 words)",
  "suggestedEnglishTitle": "Concise title in English (max 8 words)",
  "detectedLanguage": "ISO-639-1 code (one of: en, hi, mr, bn, gu, pa, ta, te, kn, ml, or, as, ur, sa, ne, kok, ks, sd, mai, mni)",
  "languageName": "English name of language (e.g. Marathi, Hindi, Tamil, Bengali, Urdu)",
  "script": "Script name (e.g. Devanagari, Tamil, Gurmukhi, Arabic, Bengali, Latin)",
  "isRtl": boolean,
  "confidence": number (between 0.0 and 1.0)
}`;

  const userPromptText = `Transcribe and translate this civic grievance audio recording.
Field Context: ${fieldMode.toUpperCase()}.
Citizen UI Language Hint: '${languageHint}'.
Remember: The citizen may be speaking in ANY of the 20 supported Indic languages. Detect the spoken language from the audio itself. Output strictly valid JSON.`;

function categorizeGeminiError(status: number, message: string): string {
  const lower = (message || "").toLowerCase();
  if (status === 404 || lower.includes("not found") || lower.includes("no longer available")) {
    return "MODEL_NOT_FOUND";
  }
  if (status === 403 || lower.includes("permission") || lower.includes("access denied")) {
    return "MODEL_ACCESS_DENIED";
  }
  if (status === 401 || lower.includes("api key") || lower.includes("unauthenticated")) {
    return "GEMINI_AUTH_ERROR";
  }
  if (status === 429 || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return "GEMINI_RATE_LIMITED";
  }
  if (status === 400 || lower.includes("invalid argument")) {
    return "GEMINI_INVALID_REQUEST";
  }
  if (status >= 500) {
    return "GEMINI_SERVER_ERROR";
  }
  return "GEMINI_ERROR";
}

  const preferredModels = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  type DiagnosticEntry = {
    model: string;
    status: number;
    category: string;
  };

  const diagnostics: DiagnosticEntry[] = [];
  let transcriptionResult: GeminiTranscriptionOutput | null = null;
  let successfulModel = "";
  let lastErrorDetails = "";
  let lastHttpStatus = 0;

  // 1. Try preferred Gemini models in sequence
  for (const modelName of preferredModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

      const requestPayload = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: userPromptText,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      lastHttpStatus = response.status;

      if (!response.ok) {
        const errorText = await response.text();
        const category = categorizeGeminiError(response.status, errorText);
        console.warn(`[transcribe-voice:${requestId}] ${modelName} -> ${response.status} -> ${category}`);
        diagnostics.push({ model: modelName, status: response.status, category });
        lastErrorDetails = `${modelName}: HTTP ${response.status} [${category}]`;
        continue;
      }

      console.log(`[transcribe-voice:${requestId}] ${modelName} -> 200 -> GEMINI_SUCCESS`);

      const responseData = await response.json();
      const rawOutputText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawOutputText) {
        console.warn(`[transcribe-voice:${requestId}] ${modelName} -> Empty candidate parts -> GEMINI_INVALID_RESPONSE`);
        diagnostics.push({ model: modelName, status: 200, category: "EMPTY_CANDIDATES" });
        lastErrorDetails = `Model ${modelName}: Empty candidate response`;
        continue;
      }

      try {
        let cleanJson = rawOutputText.trim();
        if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        }
        const firstBrace = cleanJson.indexOf("{");
        const lastBrace = cleanJson.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
        }
        transcriptionResult = JSON.parse(cleanJson) as GeminiTranscriptionOutput;
        successfulModel = modelName;
        break;
      } catch (parseError) {
        console.warn(`[transcribe-voice:${requestId}] ${modelName} JSON parse fallback:`, parseError);
        if (rawOutputText.trim()) {
          transcriptionResult = {
            transcription: rawOutputText.trim(),
            englishTranslation: rawOutputText.trim(),
            detectedLanguage: languageHint || "en",
            languageName: "Detected",
            confidence: 0.75,
          };
          successfulModel = modelName;
          break;
        }
      }
    } catch (fetchError) {
      console.warn(`[transcribe-voice:${requestId}] ${modelName} -> Network Error -> GEMINI_SERVER_ERROR`);
      diagnostics.push({ model: modelName, status: 0, category: "GEMINI_SERVER_ERROR" });
      lastErrorDetails = `Model ${modelName}: Network error: ${String(fetchError)}`;
    }
  }

  // 2. Dynamic Model Fallback if preferred models failed
  if (!transcriptionResult) {
    try {
      const modelsListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      if (modelsListRes.ok) {
        const modelsListData = await modelsListRes.json();
        const candidateModels: string[] = (modelsListData.models || [])
          .map((m: any) => m.name.replace(/^models\//, ""))
          .filter((name: string) => {
            const lower = name.toLowerCase();
            const isExcluded = lower.includes("image") || lower.includes("tts") || lower.includes("banana") || lower.includes("veo") || lower.includes("lyria") || lower.includes("embed");
            const isCandidate = lower.includes("flash") || lower.includes("gemini") || lower.includes("pro");
            return isCandidate && !isExcluded;
          });

        console.log(`[transcribe-voice:${requestId}] Dynamically discovered fallback candidates:`, candidateModels);

        for (const modelName of candidateModels) {
          if (preferredModels.includes(modelName)) continue; // already tried

          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
          const requestPayload = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType, data: cleanBase64 } },
                  { text: userPromptText },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          };

          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestPayload),
            });

            if (!response.ok) {
              const errTxt = await response.text();
              const category = categorizeGeminiError(response.status, errTxt);
              console.warn(`[transcribe-voice:${requestId}] Dynamic ${modelName} -> ${response.status} -> ${category}`);
              diagnostics.push({ model: modelName, status: response.status, category });
              continue;
            }

            console.log(`[transcribe-voice:${requestId}] Dynamic ${modelName} -> 200 -> GEMINI_SUCCESS`);

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              try {
                let cleanJson = text.trim();
                if (cleanJson.startsWith("```")) {
                  cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
                }
                const firstBrace = cleanJson.indexOf("{");
                const lastBrace = cleanJson.lastIndexOf("}");
                if (firstBrace !== -1 && lastBrace !== -1) {
                  cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
                }
                transcriptionResult = JSON.parse(cleanJson) as GeminiTranscriptionOutput;
                successfulModel = modelName;
                break;
              } catch {
                if (text.trim()) {
                  transcriptionResult = {
                    transcription: text.trim(),
                    englishTranslation: text.trim(),
                    detectedLanguage: languageHint,
                    languageName: "Detected",
                    confidence: 0.7,
                  };
                  successfulModel = modelName;
                  break;
                }
              }
            }
          } catch (dynErr) {
            console.warn(`[transcribe-voice:${requestId}] Dynamic ${modelName} fetch error:`, dynErr);
            diagnostics.push({ model: modelName, status: 0, category: "GEMINI_SERVER_ERROR" });
          }
        }
      }
    } catch (listErr) {
      console.warn(`[transcribe-voice:${requestId}] Dynamic models query failed:`, listErr);
    }
  }

  // 3. Structured Error Handling
  if (!transcriptionResult) {
    console.error(`[transcribe-voice:${requestId}] All Gemini models failed (${diagnostics.length} attempts). Last: ${lastErrorDetails}`);

    let errorCode = "GEMINI_API_FAILED";
    let userMessage = "Voice processing is temporarily unavailable. You can type your response instead.";

    const hasRateLimit = diagnostics.some((d) => d.category === "GEMINI_RATE_LIMITED" || d.status === 429);
    if (hasRateLimit) {
      errorCode = "GEMINI_API_FAILED";
      userMessage = "Voice processing rate limit reached. Please wait a moment and try again.";
    }

    return json(
      502,
      {
        success: false,
        errorCode,
        userMessage,
        requestId,
        diagnostics,
      },
      origin,
    );
  }

  const primaryText = (transcriptionResult.transcription || transcriptionResult.text || "").trim();
  const englishText = (transcriptionResult.englishTranslation || primaryText).trim();
  const rawDetectedLang = (transcriptionResult.detectedLanguage || languageHint || "en").toLowerCase().trim();
  const detectedLang = VALID_INDIC_LANGUAGE_CODES.has(rawDetectedLang) ? rawDetectedLang : "en";
  const confidence = typeof transcriptionResult.confidence === "number" ? transcriptionResult.confidence : 0.9;

  // If transcription returned nothing meaningful or silence detected
  if (!primaryText || primaryText.length === 0 || confidence === 0) {
    return json(
      200,
      {
        success: false,
        errorCode: "NO_SPEECH_DETECTED",
        userMessage: "The recording was received, but speech could not be detected. Please try speaking clearly.",
        requestId,
      },
      origin,
    );
  }

  console.log(`[transcribe-voice:${requestId}] Success with ${successfulModel} -> detected=${detectedLang}, len=${primaryText.length}, conf=${confidence}`);

  return json(
    200,
    {
      success: true,
      transcription: primaryText,
      englishTranslation: englishText,
      suggestedTitle: transcriptionResult.suggestedTitle?.trim() || "",
      suggestedEnglishTitle: transcriptionResult.suggestedEnglishTitle?.trim() || "",
      detectedLanguage: detectedLang,
      detectedLanguageName: transcriptionResult.languageName || "Detected",
      languageName: transcriptionResult.languageName || "Detected",
      detectedScript: transcriptionResult.script || "Standard",
      script: transcriptionResult.script || "Standard",
      isRtl: Boolean(transcriptionResult.isRtl || detectedLang === "ur" || detectedLang === "ks" || detectedLang === "sd"),
      confidence,
      modelUsed: successfulModel,
      fieldMode,
      requestId,
    },
    origin,
  );
});
