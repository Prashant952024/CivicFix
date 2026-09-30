/**
 * Workload D: Infrastructure Multi-Dataset Context RPC Workload
 * =============================================================
 * Tests analytical infrastructure dataset queries and aggregation:
 * - Datasets D1 (Demographics), D3 (Geography), D4 (Assets), D5 (Accessibility), D6 (Socioeconomic), D7 (Projects)
 * - Evaluates response times across diverse Indian districts & planning sectors
 * - Measures throughput and latency under progressive concurrency
 */

const { createAdminClient, createAnonClient, runConcurrentWorkload } = require('./load_test_harness.cjs');

async function runInfrastructureContextLoadTest(concurrency, totalRequestsMultiplier = 2) {
  const adminClient = createAdminClient();
  const anonClient = createAnonClient();
  const totalRequests = Math.max(concurrency * totalRequestsMultiplier, 20);

  const districts = ['IN-D0248', 'IN-D0241', 'IN-D0240', 'IN-D0244', 'IN-D0246'];
  const sectors = ['DEPT-01', 'DEPT-02', 'DEPT-03', 'DEPT-04', 'DEPT-05'];

  return await runConcurrentWorkload({
    workloadName: 'Workload D: Infrastructure Context Analytical Operations',
    concurrency,
    totalRequests,
    taskFn: async (workerId, reqIndex) => {
      const dist = districts[reqIndex % districts.length];
      const sec = sectors[reqIndex % sectors.length];

      let res;
      if (adminClient) {
        res = await adminClient.rpc('get_district_infrastructure_context', {
          p_district_id: dist,
          p_planning_sector_code: sec,
          p_financial_year: '2024-25',
          p_infrastructure_id: null
        });
      } else {
        // Benchmark the public infrastructure and planning sector tables
        const mode = reqIndex % 3;
        if (mode === 0) {
          res = await anonClient.from('districts').select('id, district_name, state_name').eq('id', dist).maybeSingle();
        } else if (mode === 1) {
          res = await anonClient.from('department_planning_sectors').select('*').eq('planning_sector_code', sec);
        } else {
          res = await anonClient.from('districts').select('id, district_name').limit(15);
        }
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
  runInfrastructureContextLoadTest(concurrency).then(report => {
    console.log(JSON.stringify(report, null, 2));
  });
}

module.exports = { runInfrastructureContextLoadTest };
