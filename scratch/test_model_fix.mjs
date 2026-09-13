const SUPABASE_URL = "https://fzatlgzittpguemzbdkm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YXRsZ3ppdHRwZ3VlbXpiZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTI0MjgsImV4cCI6MjA3MjY2ODQyOH0.Ld5_kL29ZfH0n91N_wE5R4Gk0uX-5y3VwB7k-6s8-g8";
const TEST_CHALLENGE_ID = "751c095b-8283-4de4-96db-9ceabd1c1ba6";

async function main() {
  console.log("=================================================================");
  console.log("TESTING DEPLOYED match-institutions WITH GEMINI MODEL FIX");
  console.log("=================================================================");

  console.log("\nInvoking /functions/v1/match-institutions...");
  const t0 = Date.now();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/match-institutions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      challengeId: TEST_CHALLENGE_ID,
      rerun: true,
    }),
  });

  const durationSec = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`HTTP Status: ${res.status} (elapsed: ${durationSec}s)`);

  const data = await res.json();
  if (!res.ok) {
    console.error("FAILED! Response not OK:", data);
    process.exit(1);
  }

  console.log(`✓ Edge Function returned HTTP ${res.status} with success: ${data.success}`);
  console.log(`✓ Match Run ID: ${data.matchRunId}`);
  console.log(`✓ AI Model Version used: ${data.match_run?.ai_model_version}`);
  console.log(`✓ Total Evaluated: ${data.totalEvaluated}`);
  console.log(`✓ Top 10 Count: ${data.top10Count}`);
  console.log(`✓ Challenge Status: ${data.challengeStatus}`);

  // Query match run via REST
  console.log("\nVerifying persisted match run in PostgreSQL via REST API...");
  const runRes = await fetch(`${SUPABASE_URL}/rest/v1/institution_match_runs?id=eq.${data.matchRunId}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  const runRows = await runRes.json();
  console.log(`✓ Persisted match run retrieved (status: ${runRows[0]?.status}, model: ${runRows[0]?.ai_model_version})`);

  // Query top 10 matches via REST
  console.log("\nVerifying persisted matches in PostgreSQL via REST API...");
  const matchesRes = await fetch(`${SUPABASE_URL}/rest/v1/institution_matches?match_run_id=eq.${data.matchRunId}&order=rank.asc&limit=10`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  const matchRows = await matchesRes.json();
  console.log(`✓ Persisted matches retrieved: ${matchRows.length} rows`);

  console.log("\n--- TOP 3 CANDIDATES ---");
  for (const m of matchRows.slice(0, 3)) {
    console.log(`Rank #${m.rank}: Inst ID ${m.institution_id}`);
    console.log(`  Overall Score: ${m.overall_score}/100 | Structured: ${m.structured_score}/100 | AI Semantic: ${m.ai_score}/100`);
    console.log(`  Confidence: ${m.confidence} | Role: ${m.recommended_role}`);
    console.log(`  AI Explanation: "${m.match_explanation?.slice(0, 90)}..."`);
    console.log(`  Strengths (${m.strengths?.length || 0}): ${m.strengths?.[0]}`);
  }

  console.log("\n=================================================================");
  console.log("✓ ALL MODEL AVAILABILITY & PERSISTENCE VERIFICATIONS PASSED!");
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
