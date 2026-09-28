const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const SUPABASE_URL = "https://fzatlgzittpguemzbdkm.supabase.co";
const ANON_KEY = "sb_publishable_79XhVwdn8WpQYA2In1HjOQ_S7zYP05f";

function generateSpeechWav(text, voice, outWavPath) {
  const aiffPath = outWavPath.replace(/\.wav$/, '.aiff');
  execSync(`say -v "${voice}" "${text}" -o "${aiffPath}"`);
  execSync(`afconvert -f WAVE -d LEI16 "${aiffPath}" "${outWavPath}"`);
  if (fs.existsSync(aiffPath)) fs.unlinkSync(aiffPath);
}

function callTranscribeVoice(audioBase64, mimeType, languageHint, fieldMode) {
  const payload = JSON.stringify({
    audioBase64,
    mimeType,
    languageHint,
    fieldMode
  });

  const url = new URL(`${SUPABASE_URL}/functions/v1/transcribe-voice`);
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, rawBody: body });
        } catch (e) {
          resolve({ status: res.statusCode, rawBody: body });
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("==================================================");
  console.log("  REAL RUNTIME GEMINI SPEECH TRANSCRIPTION TESTS  ");
  console.log("==================================================");

  const tmpDir = path.join(__dirname, '../.temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // TEST 1: Hindi Spoken Grievance with UI language set to Tamil ('ta')
  console.log("\n--- Test 1: Spoken Hindi with UI Language = Tamil ('ta') ---");
  const hindiWav = path.join(tmpDir, 'test_hindi.wav');
  const hindiText = "मुख्य बाजार के पास सड़क पर बहुत बड़े गड्ढे हो गए हैं। कृपया जल्द ठीक करें।";
  console.log(`Generating Hindi speech: "${hindiText}" using voice Lekha...`);
  generateSpeechWav(hindiText, "Lekha", hindiWav);

  const hindiBuffer = fs.readFileSync(hindiWav);
  const hindiBase64 = hindiBuffer.toString("base64");
  console.log(`Audio size: ${hindiBuffer.length} bytes. Sending to transcribe-voice...`);

  const res1 = await callTranscribeVoice(hindiBase64, "audio/wav", "ta", "description");
  console.log(`HTTP Status: ${res1.status}`);
  console.log(`Response:`, JSON.stringify(res1.data, null, 2));

  // TEST 2: Indian English Spoken Grievance with UI language set to Hindi ('hi')
  console.log("\n--- Test 2: Spoken English with UI Language = Hindi ('hi') ---");
  const enWav = path.join(tmpDir, 'test_en.wav');
  const enText = "The street light in front of ward number five has been broken for three days.";
  console.log(`Generating English speech: "${enText}" using voice Rishi...`);
  generateSpeechWav(enText, "Rishi", enWav);

  const enBuffer = fs.readFileSync(enWav);
  const enBase64 = enBuffer.toString("base64");
  console.log(`Audio size: ${enBuffer.length} bytes. Sending to transcribe-voice...`);

  const res2 = await callTranscribeVoice(enBase64, "audio/wav", "hi", "description");
  console.log(`HTTP Status: ${res2.status}`);
  console.log(`Response:`, JSON.stringify(res2.data, null, 2));

  // Cleanup
  if (fs.existsSync(hindiWav)) fs.unlinkSync(hindiWav);
  if (fs.existsSync(enWav)) fs.unlinkSync(enWav);

  console.log("\n==================================================");
  console.log("  REAL RUNTIME TESTS FINISHED                     ");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Runtime test failed:", err);
  process.exit(1);
});
