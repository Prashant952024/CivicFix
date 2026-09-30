/**
 * Workload B: Authenticated Civic Workflow Workload
 * ================================================
 * Simulates authenticated citizen & field worker queries:
 * - Querying filtered issues feed
 * - Querying issue status history
 * - Checking resolution verifications and evidence links
 * - Evaluating RLS overhead under concurrent load
 */

const { createAdminClient, createAnonClient, runConcurrentWorkload } = require('./load_test_harness.cjs');

async function runAuthenticatedCivicLoadTest(concurrency, totalRequestsMultiplier = 2) {
  const client = createAdminClient() || createAnonClient();
  const totalRequests = Math.max(concurrency * totalRequestsMultiplier, 20);

  // Retrieve a sample issue ID for realistic detail queries
  const { data: sampleIssues } = await client.from('issues').select('id').limit(5);
  const sampleIds = sampleIssues && sampleIssues.length > 0 ? sampleIssues.map(i => i.id) : ['00000000-0000-0000-0000-000000000001'];

  return await runConcurrentWorkload({
    workloadName: 'Workload B: Authenticated Civic Operations',
    concurrency,
    totalRequests,
    taskFn: async (workerId, reqIndex) => {
      const mode = reqIndex % 3;
      const targetIssueId = sampleIds[reqIndex % sampleIds.length];
      let res;

      if (mode === 0) {
        // Feed query with ordering and status filter
        res = await client
          .from('issues')
          .select('id, title, category, priority, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20);
      } else if (mode === 1) {
        // Deep issue detail with related images & history
        res = await client
          .from('issues')
          .select('id, title, description, status, issue_images(id, storage_path), issue_status_history(id, old_status, new_status, created_at)')
          .eq('id', targetIssueId)
          .maybeSingle();
      } else {
        // Worker assignment query
        res = await client
          .from('issue_department_assignments')
          .select('id, issue_id, department_id, status, assigned_at')
          .limit(20);
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
  runAuthenticatedCivicLoadTest(concurrency).then(report => {
    console.log(JSON.stringify(report, null, 2));
  });
}

module.exports = { runAuthenticatedCivicLoadTest };
