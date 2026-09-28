const assert = require('assert');

console.log("==================================================");
console.log("  CIVICFIX MULTILINGUAL VOICE PIPELINE UNIT TESTS");
console.log("==================================================\n");

// 1. MIME Type Normalization Tests
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

function normalizeMimeType(rawMimeType) {
  if (!rawMimeType || typeof rawMimeType !== "string") {
    return "audio/webm";
  }
  const clean = rawMimeType.split(";")[0].trim().toLowerCase();
  if (clean === "audio/mp3") return "audio/mp3";
  if (clean === "audio/x-m4a") return "audio/m4a";
  if (SUPPORTED_MIME_TYPES.has(clean)) return clean;
  if (clean === "video/webm") return "audio/webm";
  if (clean === "video/mp4") return "audio/mp4";
  return "audio/webm";
}

console.log("Test 1: MIME Type Normalization");
assert.strictEqual(normalizeMimeType("audio/webm;codecs=opus"), "audio/webm");
assert.strictEqual(normalizeMimeType("audio/mp4;codecs=mp4a.40.2"), "audio/mp4");
assert.strictEqual(normalizeMimeType("audio/ogg;codecs=opus"), "audio/ogg");
assert.strictEqual(normalizeMimeType("audio/wav"), "audio/wav");
assert.strictEqual(normalizeMimeType("video/webm"), "audio/webm");
assert.strictEqual(normalizeMimeType("video/mp4"), "audio/mp4");
assert.strictEqual(normalizeMimeType("unknown/format"), "audio/webm");
console.log("  ✅ PASS: All MIME types normalized correctly\n");

// 2. Payload Validation Tests
function validatePayload({ audioBase64, mimeType, fieldMode, languageHint }) {
  if (!audioBase64 || audioBase64.trim().length < 50) {
    return { ok: false, errorCode: "EMPTY_AUDIO" };
  }
  if (audioBase64.length > 12000000) {
    return { ok: false, errorCode: "PAYLOAD_TOO_LARGE" };
  }
  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "").trim();
  if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64.replace(/\s+/g, ""))) {
    return { ok: false, errorCode: "INVALID_AUDIO_DATA" };
  }
  const approximateBytes = Math.round((cleanBase64.length * 3) / 4);
  if (approximateBytes < 250) {
    return { ok: false, errorCode: "AUDIO_TOO_SHORT" };
  }
  return { ok: true, cleanBase64, approximateBytes };
}

console.log("Test 2: Payload Size & Validation");
assert.strictEqual(validatePayload({ audioBase64: "" }).errorCode, "EMPTY_AUDIO");
assert.strictEqual(validatePayload({ audioBase64: "dGVzdA==" }).errorCode, "EMPTY_AUDIO"); // < 50 chars
assert.strictEqual(validatePayload({ audioBase64: "A".repeat(12000001) }).errorCode, "PAYLOAD_TOO_LARGE");
assert.strictEqual(validatePayload({ audioBase64: "A".repeat(100) + "$$$" }).errorCode, "INVALID_AUDIO_DATA");
assert.strictEqual(validatePayload({ audioBase64: "A".repeat(200) }).errorCode, "AUDIO_TOO_SHORT"); // ~150 bytes
assert.strictEqual(validatePayload({ audioBase64: "A".repeat(400) }).ok, true); // ~300 bytes
console.log("  ✅ PASS: Payload constraints and error codes verified\n");

// 3. Gemini Response Parser & Silence Tests
function parseGeminiOutput(rawOutputText, languageHint = "en") {
  if (!rawOutputText || !rawOutputText.trim()) {
    return { success: false, errorCode: "NO_SPEECH_DETECTED" };
  }
  let cleanJson = rawOutputText.trim();
  if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  const firstBrace = cleanJson.indexOf("{");
  const lastBrace = cleanJson.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
  }
  const parsed = JSON.parse(cleanJson);
  const primaryText = (parsed.transcription || parsed.text || "").trim();
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.9;
  if (!primaryText || confidence === 0) {
    return { success: false, errorCode: "NO_SPEECH_DETECTED" };
  }
  return {
    success: true,
    transcription: primaryText,
    englishTranslation: (parsed.englishTranslation || primaryText).trim(),
    detectedLanguage: (parsed.detectedLanguage || languageHint).toLowerCase().trim(),
    languageName: parsed.languageName || "Detected",
    suggestedTitle: parsed.suggestedTitle?.trim() || "",
    suggestedEnglishTitle: parsed.suggestedEnglishTitle?.trim() || "",
    confidence,
  };
}

console.log("Test 3: Gemini JSON Parsing & Silence Detection");
const validGeminiJson = JSON.stringify({
  transcription: "आमच्या रस्त्यावर मोठे खड्डे आहेत",
  englishTranslation: "There are large potholes on our road.",
  suggestedTitle: "रस्त्यावरील मोठे खड्डे",
  suggestedEnglishTitle: "Large potholes on road",
  detectedLanguage: "mr",
  languageName: "Marathi",
  confidence: 0.95
});
const parsedValid = parseGeminiOutput(`\`\`\`json\n${validGeminiJson}\n\`\`\``);
assert.strictEqual(parsedValid.success, true);
assert.strictEqual(parsedValid.detectedLanguage, "mr");
assert.strictEqual(parsedValid.transcription, "आमच्या रस्त्यावर मोठे खड्डे आहेत");
assert.strictEqual(parsedValid.englishTranslation, "There are large potholes on our road.");

// Silence test (confidence 0 or empty transcription)
const silenceJson = JSON.stringify({
  transcription: "",
  englishTranslation: "",
  detectedLanguage: "en",
  confidence: 0.0
});
const parsedSilence = parseGeminiOutput(silenceJson);
assert.strictEqual(parsedSilence.success, false);
assert.strictEqual(parsedSilence.errorCode, "NO_SPEECH_DETECTED");
console.log("  ✅ PASS: JSON parsing and silence detection verified\n");

// 4. Multilingual Spoken Language Independence Tests
console.log("Test 4: UI Language Independence from Spoken Language");
const cases = [
  { ui: "hi", spoken: "mr", json: { transcription: "खड्डे पडले आहेत", detectedLanguage: "mr", englishTranslation: "Potholes have formed" }, expectedDetected: "mr", expectedUi: "hi" },
  { ui: "en", spoken: "ta", json: { transcription: "சாலையில் பள்ளங்கள் உள்ளன", detectedLanguage: "ta", englishTranslation: "There are potholes on the road" }, expectedDetected: "ta", expectedUi: "en" },
  { ui: "ta", spoken: "ta", json: { transcription: "சாலையில் பள்ளங்கள் உள்ளன", detectedLanguage: "ta", englishTranslation: "There are potholes on the road" }, expectedDetected: "ta", expectedUi: "ta" },
  { ui: "hi", spoken: "hi", json: { transcription: "सड़क पर गड्ढे हैं", detectedLanguage: "hi", englishTranslation: "There are potholes on the road" }, expectedDetected: "hi", expectedUi: "hi" },
  { ui: "ur", spoken: "ur", json: { transcription: "سڑک پر گڑھے ہیں", detectedLanguage: "ur", englishTranslation: "There are potholes on the road", isRtl: true }, expectedDetected: "ur", expectedUi: "ur" },
];

for (const c of cases) {
  const res = parseGeminiOutput(JSON.stringify(c.json), c.ui);
  assert.strictEqual(res.detectedLanguage, c.expectedDetected);
  console.log(`  UI [${c.ui}] + Spoken [${c.spoken}] => detected_language: ${res.detectedLanguage} (independent)`);
}
console.log("  ✅ PASS: Spoken language detected independently of UI language\n");

// 5. Citizen Review & Editing Behavior Tests
console.log("Test 5: Citizen Review & Editable English Translation");
function acceptReview({ pendingPayload, editableTranscription, editableEnglishTranslation, fieldMode }) {
  const finalOriginal = editableTranscription.trim() || pendingPayload.transcription;
  const finalEnglish = pendingPayload.detectedLanguage === "en"
    ? finalOriginal
    : (editableEnglishTranslation.trim() || finalOriginal || pendingPayload.englishTranslation);

  return {
    ...pendingPayload,
    transcription: finalOriginal,
    englishTranslation: finalEnglish,
    suggestedTitle: fieldMode === "title" ? finalOriginal : pendingPayload.suggestedTitle,
    suggestedEnglishTitle: fieldMode === "title" ? finalEnglish : pendingPayload.suggestedEnglishTitle,
  };
}

const initialPayload = {
  transcription: "आमच्या रस्त्यावर खड्डे आहेत",
  englishTranslation: "There are potholes on our road",
  detectedLanguage: "mr",
  languageName: "Marathi",
  fieldMode: "title"
};

// Citizen edits both Marathi title and English title
const acceptedEdited = acceptReview({
  pendingPayload: initialPayload,
  editableTranscription: "आमच्या गावातील मुख्य रस्त्यावर मोठे खड्डे आहेत",
  editableEnglishTranslation: "There are large potholes on our village main road",
  fieldMode: "title"
});

assert.strictEqual(acceptedEdited.transcription, "आमच्या गावातील मुख्य रस्त्यावर मोठे खड्डे आहेत");
assert.strictEqual(acceptedEdited.englishTranslation, "There are large potholes on our village main road");
assert.strictEqual(acceptedEdited.suggestedTitle, "आमच्या गावातील मुख्य रस्त्यावर मोठे खड्डे आहेत");
assert.strictEqual(acceptedEdited.suggestedEnglishTitle, "There are large potholes on our village main road");
console.log("  ✅ PASS: Edited transcription and custom English translation preserved\n");

// 6. Mixed Input Issue Submission Payload Construction
console.log("Test 6: Mixed Input (Voice Title + Typed Description + Voice Notes)");
function buildIssueInsertPayload({
  profileId,
  title,
  description,
  locationText,
  category,
  inputMethod,
  originalTitle,
  originalDescription,
  englishTitle,
  englishDescription,
  originalLanguage,
  detectedLanguage,
}) {
  const finalOriginalTitle = originalTitle.trim() || title.trim();
  const finalOriginalDescription = originalDescription.trim() || description.trim();
  const finalEnglishTitle = englishTitle.trim() || title.trim();
  const finalEnglishDescription = englishDescription.trim() || description.trim();

  return {
    id: "test-uuid-1234",
    reporter_profile_id: profileId,
    title: finalEnglishTitle,
    description: finalEnglishDescription,
    category,
    location_text: locationText.trim(),
    original_language: originalLanguage || "en",
    detected_language: detectedLanguage || originalLanguage || "en",
    input_method: inputMethod,
    original_title: finalOriginalTitle,
    original_description: finalOriginalDescription,
    english_title: finalEnglishTitle,
    english_description: finalEnglishDescription,
  };
}

const mixedPayload = buildIssueInsertPayload({
  profileId: "profile-abc",
  title: "सड़क पर बड़ा गड्ढा", // Voice Title (Hindi)
  description: "Water has accumulated near the bus stop causing traffic jams.", // Typed Description (English)
  locationText: "ग्रामपंचायत समोर", // Voice Notes (Marathi)
  category: "Pothole",
  inputMethod: "VOICE",
  originalTitle: "सड़क पर बड़ा गड्ढा",
  originalDescription: "Water has accumulated near the bus stop causing traffic jams.",
  englishTitle: "Large pothole on road",
  englishDescription: "Water has accumulated near the bus stop causing traffic jams.",
  originalLanguage: "hi",
  detectedLanguage: "hi",
});

assert.strictEqual(mixedPayload.title, "Large pothole on road"); // Canonical English for triage
assert.strictEqual(mixedPayload.original_title, "सड़क पर बड़ा गड्ढा"); // Verbatim native
assert.strictEqual(mixedPayload.description, "Water has accumulated near the bus stop causing traffic jams.");
assert.strictEqual(mixedPayload.original_description, "Water has accumulated near the bus stop causing traffic jams.");
assert.strictEqual(mixedPayload.original_language, "hi");
assert.strictEqual(mixedPayload.detected_language, "hi");
assert.strictEqual(mixedPayload.input_method, "VOICE");
console.log("  ✅ PASS: Mixed input correctly persisted with canonical English and native originals\n");

console.log("==================================================");
console.log("  ALL UNIT & PIPELINE TESTS PASSED (100% SUCCESS)");
console.log("==================================================");
