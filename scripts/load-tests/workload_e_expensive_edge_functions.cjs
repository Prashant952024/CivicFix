/**
 * Workload E: Expensive Edge Functions & Rate Limiting Verification
 * =================================================================
 * Tests Edge Functions under controlled concurrency:
 * - analyze-issue
 * - detect-duplicates
 * - generate-challenge
 * - match-institutions
 * 
 * Validates:
 * 1. Edge Function container response latency and throughput
 * 2. Durable atomic rate limiter behavior (HTTP 429 when threshold exceeded)
 * 3. Cryptographic authentication barrier enforcement (HTTP 401/403)
 */

const { SUPABASE_URL, ANON_KEY, SERVICE_KEY, runConcurrentWorkload } = require('./load_test_harness.cjs');

async function runExpensiveEdgeFunctionsLoadTest(concurrency, totalRequestsMultiplier = 1) {
  const totalRequests = Math.max(concurrency * totalRequestsMultiplier, 10);
  const functions = ['analyze-issue', 'detect-duplicates', 'generate-challenge', 'match-institutions'];

  const headers = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${SERVICE_KEY || ANON_KEY}`
  };

  return await runConcurrentWorkload({
    workloadName: 'Workload E: Edge Functions & Rate Limiting',
    concurrency,
    totalRequests,
    taskFn: async (workerId, reqIndex) => {
      const fnName = functions[reqIndex % functions.length];
      const url = `${SUPABASE_URL}/functions/v1/${fnName}`;

      let payload = {};
      if (fnName === 'analyze-issue') {
        payload = { title: `Load Test Issue ${reqIndex}`, description: 'Pothole on Main Road causing traffic congestion.' };
      } else if (fnName === 'detect-duplicates') {
        payload = { title: `Water Leakage ${reqIndex}`, description: 'Pipe burst in district center.', latitude: 23.3441, longitude: 85.3096 };
      } else if (fnName === 'generate-challenge') {
        payload = { problem_statement: 'Develop solar-powered low-cost water purification units for rural wards.' };
      } else {
        payload = { challenge_id: 'c11c0000-0000-0000-0000-000000000001', max_candidates: 3 };
      }

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const status = resp.status;
        const isRateLimited = status === 429;
        const isAuthProtected = status === 401 || status === 403;

        return {
          status,
          isRateLimited,
          isAuthProtected,
          error: status >= 500 ? `HTTP ${status}` : null
        };
      } catch (err) {
        return {
          status: 500,
          error: err.message
        };
      }
    }
  });
}

if (require.main === module) {
  const concurrency = parseInt(process.argv[2], 10) || 10;
  runExpensiveEdgeFunctionsLoadTest(concurrency).then(report => {
    console.log(JSON.stringify(report, null, 2));
  });
}

module.exports = { runExpensiveEdgeFunctionsLoadTest };
