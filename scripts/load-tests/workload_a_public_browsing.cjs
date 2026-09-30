/**
 * Workload A: Public & Basic Browsing Workload
 * ============================================
 * Simulates concurrent unauthenticated & lightweight public browsing:
 * - Loading canonical districts master list
 * - Loading municipal departments
 * - Loading department planning sector mappings
 * - Searching districts by state code / query
 */

const { createAnonClient, runConcurrentWorkload } = require('./load_test_harness.cjs');

async function runPublicBrowsingLoadTest(concurrency, totalRequestsMultiplier = 2) {
  const supabase = createAnonClient();
  const totalRequests = Math.max(concurrency * totalRequestsMultiplier, 20);

  const states = ['JH', 'MH', 'DL', 'KA', 'TN'];

  return await runConcurrentWorkload({
    workloadName: 'Workload A: Public & Basic Browsing',
    concurrency,
    totalRequests,
    taskFn: async (workerId, reqIndex) => {
      const mode = reqIndex % 4;
      let res;

      if (mode === 0) {
        res = await supabase.from('districts').select('id, district_name, state_name, state_code').limit(25);
      } else if (mode === 1) {
        res = await supabase.from('departments').select('id, name, description').limit(20);
      } else if (mode === 2) {
        res = await supabase.from('department_planning_sectors').select('*').limit(20);
      } else {
        const stateCode = states[reqIndex % states.length];
        res = await supabase.from('districts').select('id, district_name, state_name').eq('state_code', stateCode).limit(10);
      }

      return {
        status: res.error ? 500 : 200,
        error: res.error ? res.error.message : null
      };
    }
  });
}

if (require.main === module) {
  const concurrency = parseInt(process.argv[2], 10) || 10;
  runPublicBrowsingLoadTest(concurrency).then(report => {
    console.log(JSON.stringify(report, null, 2));
  });
}

module.exports = { runPublicBrowsingLoadTest };
