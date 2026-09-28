// Test Live Remote Deployed Edge Function
const https = require('https');

function generateSimpleWavBase64(durationSeconds = 2, sampleRate = 16000, frequency = 440) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate sine wave audio data
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3; // 30% volume
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer.toString("base64");
}

async function testRemoteEdgeFunction() {
  const audioBase64 = generateSimpleWavBase64(2, 16000, 300);
  const payload = JSON.stringify({
    audioBase64,
    mimeType: "audio/wav",
    languageHint: "hi",
    fieldMode: "description"
  });

  const url = new URL("https://fzatlgzittpguemzbdkm.supabase.co/functions/v1/transcribe-voice");
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": "sb_publishable_79XhVwdn8WpQYA2In1HjOQ_S7zYP05f",
      "Authorization": "Bearer sb_publishable_79XhVwdn8WpQYA2In1HjOQ_S7zYP05f",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  console.log("Sending request to deployed transcribe-voice Edge Function...");

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        console.log(`HTTP Status: ${res.statusCode}`);
        console.log(`Response Body: ${body}`);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on("error", (err) => {
      console.error("Network Error:", err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

testRemoteEdgeFunction()
  .then(() => console.log("Test completed."))
  .catch((e) => console.error("Test failed:", e));
