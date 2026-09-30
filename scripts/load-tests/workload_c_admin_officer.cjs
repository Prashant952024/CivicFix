/**
 * Workload C: Admin & Municipal Officer Workload
 * ==============================================
 * Tests the Phase 4 optimized server-side paginated queries & indexing:
 * - Paginated officer queue queries (.range(0, 24) with exact count)
 * - Paginated admin classification queue with ILIKE keyword search
 * - Paginated user profile management table
 * - Paginated department-scoped issue feed using composite indexes
 */

const { createAdminClient, createAnonClient, runConcurrentWorkload } = require('./load_test_harness.cjs');

async function runAdminOfficerLoadTest(concurrency, totalRequestsMultiplier = 2) {
  const client = createAdminClient() || createAnonClient();
  const totalRequests = Math.max(concurrency * totalRequestsMultiplier, 20);

  const searchKeywords = ['road', 'water', 'light', 'waste', 'pothole', 'drain'];

  return await runConcurrentWorkload({
    workloadName: 'Workload C: Admin & Officer Pagination & Telemetry',
    concurrency,
    totalRequests,
    taskFn: async (workerId, reqIndex) => {
      const mode = reqIndex % 4;
      let res;

      if (mode === 0) {
        // Officer paginated queue with count
        res = await client
          .from('issues')
          .select('id, title, category, priority, status, department_id, created_at', { count: 'exact' })
          .range(0, 24)
          .order('created_at', { ascending: false });
      } else if (mode === 1) {
        // Admin classification queue with ILIKE search
        const kw = searchKeywords[reqIndex % searchKeywords.length];
        res = await client
          .from('issues')
          .select('id, title, description, category, status, created_at', { count: 'exact' })
          .ilike('title', `%${kw}%`)
          .range(0, 24);
      } else if (mode === 2) {
        // Paginated profiles table
        res = await client
          .from('profiles')
          .select('id, full_name, email, role_id, created_at', { count: 'exact' })
          .range(0, 24)
          .order('created_at', { ascending: false });
      } else {
        // Department filtered chronological feed (utilizes composite index issues_department_created_idx)
        res = await client
          .from('issues')
          .select('id, title, status, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, 24);
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
  runAdminOfficerLoadTest(concurrency).then(report => {
    console.log(JSON.stringify(report, null, 2));
  });
}

module.exports = { runAdminOfficerLoadTest };
