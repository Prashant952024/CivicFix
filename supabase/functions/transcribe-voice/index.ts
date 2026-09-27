/// <reference path="../deno.d.ts" />

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

function normalizeMimeType(rawMimeType?: string): string {
  if (!rawMimeType || typeof rawMimeType !== "string") {
    return "audio/webm";
  }
  const clean = rawMimeType.split(";")[0].trim().toLowerCase();
  if (clean === "audio/mp3") return "audio/mp3";
  if (clean === "audio/x-m4a") return "audio/m4a";
  if (SUPPORTED_MIME_TYPES.has(clean)) return clean;
  // If video/webm was recorded instead of audio/webm (happens in some browsers)
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

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    console.error(`[transcribe-voice:${requestId}] Server misconfiguration: Missing GEMINI_API_KEY`);
    return json(500, {
      success: false,
      errorCode: "GEMINI_AUTH_ERROR",
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

  const mimeType = normalizeMimeType(body.mimeType);
  const languageHint = body.languageHint?.trim() || "en";
  const fieldMode = body.fieldMode || "description";

  // Sanitize base64 data (strip data URL scheme if accidentally included)
  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "").trim();

  const approximateBytes = Math.round((cleanBase64.length * 3) / 4);
  console.log(`[transcribe-voice:${requestId}] Processing audio (${approximateBytes} bytes, mime=${mimeType}, hint=${languageHint}, field=${fieldMode})`);

  const systemPrompt = `You are the Expert Multilingual Speech-to-Text & Translation AI Engine for CivicFix, India's public municipal grievance redressal platform.

CORE CAPABILITIES:
1. INDIC LANGUAGE COVERAGE: You accurately transcribe speech in all major Indian languages and scripts:
   - English (en), Hindi (hi - हिन्दी), Marathi (mr - मराठी), Bengali (bn - বাংলা), Gujarati (gu - ગુજરાતી)
   - Punjabi (pa - ਪੰਜਾਬੀ), Tamil (ta - தமிழ்), Telugu (te - తెలుగు), Kannada (kn - ಕನ್ನಡ), Malayalam (ml - മലയാളം)
   - Odia (or - ଓଡ଼ିଆ), Assamese (as - অসমীয়া), Urdu (ur - اردو), Sanskrit (sa - संस्कृतम्), Nepali (ne - नेपाली)
   - Konkani (kok - कोंकणी), Kashmiri (ks - कॉशुर / کٲشُر), Sindhi (sd - سنڌي / सिन्धी), Maithili (mai - मैथिली), Manipuri (mni - মৈতৈलोন্)
   - Mixed / Code-switching dialects (e.g. Hinglish, Tanglish, Marathi-English).

2. FIELD CONTEXT:
   - fieldMode = "title": Citizen is speaking an issue title or summary. Generate a concise title in original language and English (max 8 words).
   - fieldMode = "description": Citizen is describing an entire municipal complaint. Provide full verbatim transcription and canonical English translation.
   - fieldMode = "notes": Citizen is providing additional details or landmark notes.

3. ACCURACY & FIDELITY:
   - Transcribe in the EXACT native script of the spoken language (e.g. Devanagari for Hindi/Marathi/Nepali, Tamil for Tamil, Telugu for Telugu, Gurmukhi for Punjabi, Arabic for Urdu, etc.).
   - Preserve civic terminology, road names, colony names, metro pillars, ward numbers, and municipal problems accurately.
   - Remove acoustic fillers ("umm", "uhh", stuttering) while preserving 100% of facts.
   - For Urdu/Kashmiri/Sindhi, specify isRtl: true.

4. CANONICAL ENGLISH TRANSLATION:
   - Always generate a clear, natural, high-fidelity English translation of the spoken content for downstream municipal triage.

5. JSON RESPONSE SCHEMA:
Return ONLY a valid JSON object matching this schema:
{
  "transcription": "Spoken text in native script of spoken language",
  "englishTranslation": "Complete and accurate English canonical translation",
  "suggestedTitle": "Concise title in the spoken language (max 8 words)",
  "suggestedEnglishTitle": "Concise title in English (max 8 words)",
  "detectedLanguage": "ISO-639-1 code (e.g. en, hi, mr, bn, gu, pa, ta, te, kn, ml, or, as, ur, sa, ne, kok, ks, sd, mai, mni)",
  "languageName": "English name of language (e.g. Hindi, Marathi, Tamil, Bengali, Urdu)",
  "script": "Script name (e.g. Devanagari, Tamil, Gurmukhi, Arabic, Bengali, Latin)",
  "isRtl": boolean,
  "confidence": number (between 0.0 and 1.0)
}`;

  const userPromptText = `Please transcribe and translate this civic complaint voice recording.
Field Context: ${fieldMode.toUpperCase()}.
Preferred UI Language Hint: '${languageHint}'.
Provide accurate transcription in the native script, canonical English translation, and language detection in JSON format.`;

  const preferredModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
  ];

  let transcriptionResult: GeminiTranscriptionOutput | null = null;
  let successfulModel = "";
  let lastErrorDetails = "";
  let lastHttpStatus = 0;

  // 1. Try preferred Gemini models
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
        console.warn(`[transcribe-voice:${requestId}] Model ${modelName} returned status ${response.status}:`, errorText);
        lastErrorDetails = `Model ${modelName}: HTTP ${response.status} - ${errorText}`;
        continue;
      }

      const responseData = await response.json();
      const rawOutputText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawOutputText) {
        console.warn(`[transcribe-voice:${requestId}] Model ${modelName} returned empty candidate parts.`);
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
        console.warn(`[transcribe-voice:${requestId}] Model ${modelName} JSON parse failed:`, parseError);
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
      console.warn(`[transcribe-voice:${requestId}] Network error calling ${modelName}:`, fetchError);
      lastErrorDetails = `Model ${modelName}: Network error: ${String(fetchError)}`;
    }
  }

  // 2. Dynamic Model Fallback if preferred models failed
  if (!transcriptionResult) {
    try {
      const modelsListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      if (modelsListRes.ok) {
        const modelsListData = await modelsListRes.json();
        const availableModels: string[] = (modelsListData.models || [])
          .map((m: any) => m.name.replace(/^models\//, ""))
          .filter((name: string) => name.includes("flash") || name.includes("gemini"));

        console.log(`[transcribe-voice:${requestId}] Dynamically discovered fallback models:`, availableModels);

        for (const modelName of availableModels) {
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

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
          });

          if (response.ok) {
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
          }
        }
      }
    } catch (listErr) {
      console.warn(`[transcribe-voice:${requestId}] Dynamic models query failed:`, listErr);
    }
  }

  // 3. Structured Error Handling
  if (!transcriptionResult || (!transcriptionResult.transcription && !transcriptionResult.text)) {
    console.error(`[transcribe-voice:${requestId}] All Gemini models failed. Last error: ${lastErrorDetails}`);

    let errorCode = "GEMINI_REQUEST_FAILED";
    let userMessage = "Voice processing is temporarily unavailable. You can type your response instead.";

    if (lastHttpStatus === 429) {
      errorCode = "GEMINI_RATE_LIMIT";
      userMessage = "Voice processing rate limit reached. Please wait a moment and try again.";
    } else if (lastHttpStatus === 400) {
      errorCode = "NO_SPEECH_DETECTED";
      userMessage = "The recording was received, but speech could not be detected. Please try speaking clearly.";
    }

    return json(
      502,
      {
        success: false,
        errorCode,
        userMessage,
        requestId,
        devDetails: lastErrorDetails,
      },
      origin,
    );
  }

  const primaryText = (transcriptionResult.transcription || transcriptionResult.text || "").trim();
  const englishText = (transcriptionResult.englishTranslation || primaryText).trim();
  const detectedLang = (transcriptionResult.detectedLanguage || languageHint || "en").toLowerCase().trim();

  // If transcription returned nothing meaningful
  if (!primaryText || primaryText.length === 0) {
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

  console.log(`[transcribe-voice:${requestId}] Success with ${successfulModel} -> detected=${detectedLang}, len=${primaryText.length}`);

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
      detectedScript: transcriptionResult.script || "Standard",
      isRtl: Boolean(transcriptionResult.isRtl || detectedLang === "ur" || detectedLang === "ks" || detectedLang === "sd"),
      confidence: transcriptionResult.confidence ?? 0.9,
      modelUsed: successfulModel,
      fieldMode,
      requestId,
    },
    origin,
  );
});
