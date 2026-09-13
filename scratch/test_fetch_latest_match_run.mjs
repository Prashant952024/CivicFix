const SUPABASE_URL = "https://fzatlgzittpguemzbdkm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_79XhVwdn8WpQYA2In1HjOQ_S7zYP05f";
const TEST_CHALLENGE_ID = "751c095b-8283-4de4-96db-9ceabd1c1ba6";

async function main() {
  console.log("Testing REST request for latest match run with order=created_at.desc...");
  const url = `${SUPABASE_URL}/rest/v1/institution_match_runs?select=*&challenge_id=eq.${TEST_CHALLENGE_ID}&order=created_at.desc&limit=1`;
  
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  console.log(`HTTP Status: ${res.status}`);
  const data = await res.json();

  if (!res.ok) {
    console.error("FAIL: Request returned error:", data);
    process.exit(1);
  }

  if (Array.isArray(data) && data.length > 0) {
    const run = data[0];
    console.log(`\n✓ SUCCESS! Retrieved latest match run without 400 error:`);
    console.log(`  ID: ${run.id}`);
    console.log(`  Challenge ID: ${run.challenge_id}`);
    console.log(`  Status: ${run.status}`);
    console.log(`  AI Model Version: ${run.ai_model_version}`);
    console.log(`  Eligible Candidates Count: ${run.eligible_candidates_count}`);
    console.log(`  Created At: ${run.created_at}`);

    // Fetch matches for this run with joined institutions
    console.log("\nTesting REST request for matches with joined institutions...");
    const matchesUrl = `${SUPABASE_URL}/rest/v1/institution_matches?select=*,institution:institutions(*)&match_run_id=eq.${run.id}&order=rank.asc&limit=10`;
    const matchesRes = await fetch(matchesUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    console.log(`Matches HTTP Status: ${matchesRes.status}`);
    const matches = await matchesRes.json();
    console.log(`✓ Retrieved ${matches.length} matches with joined institutions!`);
    for (const m of matches.slice(0, 5)) {
      console.log(`  #${m.rank} ${m.institution?.name} (${m.institution?.city}, ${m.institution?.state})`);
      console.log(`     Overall: ${m.overall_score} | Structured: ${m.structured_score} | AI: ${m.ai_score} | Role: ${m.recommended_role}`);
      console.log(`     Explanation: "${m.match_explanation?.slice(0, 80)}..."`);
    }
  } else {
    console.error("No match runs found.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
