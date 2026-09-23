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
};

type GeminiTranscriptionOutput = {
  text?: string;
  detectedLanguage?: string;
  languageName?: string;
  confidence?: number;
};

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
    console.error("[transcribe-voice] Server misconfiguration: Missing GEMINI_API_KEY");
    return json(500, { error: "AI transcription service configuration error. Missing API key." }, origin);
  }

  let body: TranscribeRequestBody = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON request body." }, origin);
  }

  const audioBase64 = body.audioBase64?.trim();
  if (!audioBase64) {
    return json(400, { error: "Missing required field: audioBase64" }, origin);
  }

  const rawMimeType = body.mimeType?.trim() || "audio/webm";
  // Clean mime type if it contains codecs parameter (e.g. 'audio/webm;codecs=opus' -> 'audio/webm')
  const mimeType = rawMimeType.split(";")[0].trim() || "audio/webm";
  const languageHint = body.languageHint?.trim();

  const systemPrompt = `You are an expert multilingual speech-to-text AI for CivicFix, an urban municipal grievance redressal platform in India.

TASK:
Accurately transcribe the citizen's spoken voice complaint into natural, readable text in the original spoken language.

RULES:
1. LANGUAGE FIDELITY: The citizen may speak in Hindi (हिन्दी), Marathi (मराठी), English, or mixed languages (Hinglish, Marathi-English). Transcribe in the actual spoken language using standard Devanagari script for Hindi/Marathi or Roman script for English.
2. ACCURACY: Preserve local city landmarks, colony names, metro pillars, street addresses, problem categories, and civic terms accurately.
3. SPEECH CLEANUP: Remove stutters, long pauses, and filler sounds ("umm", "uhh") while strictly preserving 100% of the factual content and meaning.
4. LANGUAGE DETECTION: Identify the primary language: "hi" (Hindi), "mr" (Marathi), "en" (English), or other ISO-639-1 code.
5. STRICT JSON OUTPUT: Return ONLY a JSON object matching this schema:
{
  "text": "Transcribed grievance description in the original language",
  "detectedLanguage": "hi" | "mr" | "en",
  "languageName": "Hindi" | "Marathi" | "English" | "Mixed",
  "confidence": number (between 0.0 and 1.0)
}`;

  const userPromptText = `Please transcribe this audio recording of a citizen reporting a civic issue.${
    languageHint ? ` The citizen's preferred app language is '${languageHint}'.` : ""
  } Provide faithful verbatim transcription and language detection in JSON format.`;

  const preferredModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
  ];

  let transcriptionResult: GeminiTranscriptionOutput | null = null;
  let successfulModel = "";
  let lastErrorDetails = "";

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
                  data: audioBase64,
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

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[transcribe-voice] Model ${modelName} returned status ${response.status}:`, errorText);
        lastErrorDetails = `Model ${modelName}: HTTP ${response.status} - ${errorText}`;
        continue;
      }

      const responseData = await response.json();
      const rawOutputText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawOutputText) {
        console.warn(`[transcribe-voice] Model ${modelName} returned empty candidate content.`);
        lastErrorDetails = `Model ${modelName}: Empty candidate response`;
        continue;
      }

      try {
        const cleanedJson = rawOutputText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        transcriptionResult = JSON.parse(cleanedJson) as GeminiTranscriptionOutput;
        successfulModel = modelName;
        break;
      } catch (parseError) {
        console.warn(`[transcribe-voice] Model ${modelName} JSON parse failed:`, rawOutputText, parseError);
        // Fallback: If raw text was returned instead of JSON
        if (rawOutputText.trim()) {
          transcriptionResult = {
            text: rawOutputText.trim(),
            detectedLanguage: languageHint || "en",
            languageName: "Detected",
            confidence: 0.8,
          };
          successfulModel = modelName;
          break;
        }
      }
    } catch (fetchError) {
      console.warn(`[transcribe-voice] Network error calling ${modelName}:`, fetchError);
      lastErrorDetails = `Model ${modelName}: Network error: ${String(fetchError)}`;
    }
  }

  if (!transcriptionResult || !transcriptionResult.text) {
    console.error("[transcribe-voice] All Gemini models failed. Last error:", lastErrorDetails);
    return json(
      502,
      {
        error: "We could not transcribe the audio recording at this time. Please try again or type the description.",
        details: lastErrorDetails,
      },
      origin,
    );
  }

  return json(
    200,
    {
      success: true,
      text: transcriptionResult.text.trim(),
      detectedLanguage: transcriptionResult.detectedLanguage || "en",
      languageName: transcriptionResult.languageName || "Detected",
      confidence: transcriptionResult.confidence ?? 0.9,
      modelUsed: successfulModel,
    },
    origin,
  );
});
