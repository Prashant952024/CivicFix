/**
 * CivicFix Phase 5.5 Master Load & Scalability Test Runner
 * ========================================================
 * Orchestrates progressive concurrency load tests across all core workloads:
 * - Workload A: Public Browsing
 * - Workload B: Authenticated Civic Workflow
 * - Workload C: Admin/Officer Pagination & Telemetry
 * - Workload D: Infrastructure Multi-Dataset RPC
 * - Workload E: Expensive Edge Functions & Rate Limiter
 * 
 * Generates machine-readable results in scripts/load-tests/results.json.
 */

const fs = require('fs');
const path = require('path');
const { runPublicBrowsingLoadTest } = require('./workload_a_public_browsing.cjs');
const { runAuthenticatedCivicLoadTest } = require('./workload_b_authenticated_civic.cjs');
const { runAdminOfficerLoadTest } = require('./workload_c_admin_officer.cjs');
const { runInfrastructureContextLoadTest } = require('./workload_d_infrastructure_context.cjs');
const { runExpensiveEdgeFunctionsLoadTest } = require('./workload_e_expensive_edge_functions.cjs');
const { inspectDatabaseScalability } = require('./database_scalability_inspection.cjs');
const { analyzeFrontendPerformance } = require('./frontend_performance_analysis.cjs');

async function runAllLoadTests() {
  console.log("================================================================================");
  console.log("CIVICFIX PHASE 5.5: COMPREHENSIVE SCALABILITY & LOAD TEST RUNNER");
  console.log("================================================================================");
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);

  const results = {
    timestamp: new Date().toISOString(),
    concurrencyLevels: [10, 25, 50, 100, 250],
    workloadResults: {},
    databaseInspection: null,
    frontendAnalysis: null
  };

  // 1. Run Database & Frontend Inspections
  console.log("\n>>> [1/3] EXECUTING DATABASE & FRONTEND STRUCTURAL INSPECTIONS...");
  results.databaseInspection = await inspectDatabaseScalability();
  results.frontendAnalysis = analyzeFrontendPerformance();

  // 2. Progressive Concurrency Workloads
  console.log("\n>>> [2/3] EXECUTING PROGRESSIVE CONCURRENCY WORKLOADS...");

  const workloads = [
    { id: 'workload_a', name: 'Workload A (Public Browsing)', runner: runPublicBrowsingLoadTest, maxMultiplier: 2 },
    { id: 'workload_b', name: 'Workload B (Authenticated Civic)', runner: runAuthenticatedCivicLoadTest, maxMultiplier: 2 },
    { id: 'workload_c', name: 'Workload C (Admin/Officer Pagination & Telemetry)', runner: runAdminOfficerLoadTest, maxMultiplier: 2 },
    { id: 'workload_d', name: 'Workload D (Infrastructure Context RPC)', runner: runInfrastructureContextLoadTest, maxMultiplier: 2 },
    { id: 'workload_e', name: 'Workload E (Edge Functions & Rate Limiting)', runner: runExpensiveEdgeFunctionsLoadTest, maxMultiplier: 1 }
  ];

  for (const w of workloads) {
    console.log(`\n================================================================================`);
    console.log(`TESTING WORKLOAD: ${w.name}`);
    console.log(`================================================================================`);

    results.workloadResults[w.id] = [];

    for (const concurrency of results.concurrencyLevels) {
      // Workload E is rate-limited and cost-sensitive, cap at concurrency 50
      if (w.id === 'workload_e' && concurrency > 50) {
        console.log(`  [Skip] ${w.name} capped at concurrency 50 to respect external provider rate limits.`);
        break;
      }

      console.log(`  -> Running concurrency level: ${concurrency} virtual clients...`);
      try {
        const res = await w.runner(concurrency, w.maxMultiplier);
        results.workloadResults[w.id].push(res);

        console.log(`     Completed ${res.totalRequests} reqs in ${res.durationSec}s | Throughput: ${res.throughputRps} req/s | p50: ${res.percentiles.p50}ms | p95: ${res.percentiles.p95}ms | p99: ${res.percentiles.p99}ms | Errors: ${res.errorRate}% | Bottleneck: ${res.primaryBottleneck}`);

        // Safety stopping condition: if error rate exceeds 25%, halt further ramping for this workload
        if (res.errorRate > 25) {
          console.warn(`     [Warning] High error rate (${res.errorRate}%) encountered at concurrency ${concurrency}. Halting further concurrency ramping for ${w.name}.`);
          break;
        }
      } catch (err) {
        console.error(`     [Error] Concurrency ${concurrency} failed: ${err.message}`);
        results.workloadResults[w.id].push({
          workloadName: w.name,
          concurrency,
          error: err.message,
          errorRate: 100
        });
        break;
      }
    }
  }

  // 3. Save Machine-Readable JSON Output
  const outputPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n>>> [3/3] Machine-readable load test metrics persisted to: ${outputPath}`);

  console.log("\n================================================================================");
  console.log("CIVICFIX PHASE 5.5 LOAD TESTING COMPLETED SUCCESSFULLY");
  console.log("================================================================================");

  return results;
}

if (require.main === module) {
  runAllLoadTests().catch(err => {
    console.error("FATAL ERROR IN LOAD TEST RUNNER:", err);
    process.exit(1);
  });
}

module.exports = { runAllLoadTests };
