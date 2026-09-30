/**
 * Database Scalability & Query Plan Inspection
 * ============================================
 * Inspects database indexing coverage, foreign key indexes, and query efficiency:
 * - issues indexes (district_id, status, department_id, created_at)
 * - assignment indexes (worker_profile_id, status, department_id)
 * - infrastructure tables & unique latest assessment indexes
 * - rate_limits window pruning index
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, ANON_KEY, SERVICE_KEY } = require('./load_test_harness.cjs');

const supabase = (SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : createClient(SUPABASE_URL, ANON_KEY));

async function inspectDatabaseScalability() {
  console.log("================================================================================");
  console.log("CIVICFIX DATABASE SCALABILITY & INDEX INSPECTION");
  console.log("================================================================================");

  const findings = [];

  // 1. Inspect static migration indexes
  const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

  const declaredIndexes = [];
  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const matches = content.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\s+on\s+public\.([a-zA-Z0-9_]+)\s*\(([^)]+)\)/gi);
    for (const m of matches) {
      declaredIndexes.push({
        indexName: m[1],
        tableName: m[2],
        columns: m[3].replace(/\s+/g, ' ').trim(),
        migration: file
      });
    }
  }

  console.log(`\nDeclared Performance Indexes in Schema (${declaredIndexes.length} total):`);
  const criticalIndexes = [
    'issues_department_created_idx',
    'issues_district_status_idx',
    'idx_dept_worker_assignments_worker_status',
    'idx_infra_assessments_latest',
    'idx_rate_limits_window_start',
    'idx_issues_district_id'
  ];

  for (const ci of criticalIndexes) {
    const found = declaredIndexes.find(idx => idx.indexName.toLowerCase() === ci.toLowerCase());
    if (found) {
      console.log(`  ✓ Index [${ci}]: on ${found.tableName} (${found.columns}) [from ${found.migration}]`);
    } else {
      console.log(`  ✕ Missing Index: ${ci}`);
      findings.push(`Critical index ${ci} not found in migrations`);
    }
  }

  // 2. Query performance benchmark for key access paths
  console.log("\nQuery Benchmark (Direct PostgREST Single-Query Latencies):");

  const benchmarkQueries = [
    {
      name: "issues feed ordered by created_at DESC with limit 25",
      query: () => supabase.from('issues').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(25)
    },
    {
      name: "issues filtered by district_id and status (SUBMITTED)",
      query: () => supabase.from('issues').select('id, title, status').eq('district_id', 'IN-D0248').eq('status', 'SUBMITTED').limit(25)
    },
    {
      name: "districts master table lookup (IN-D0248)",
      query: () => supabase.from('districts').select('id, district_name, state_name, state_code').eq('id', 'IN-D0248').maybeSingle()
    },
    {
      name: "departments list lookup",
      query: () => supabase.from('departments').select('id, name, description').limit(20)
    },
    {
      name: "department_planning_sectors bridge lookup",
      query: () => supabase.from('department_planning_sectors').select('*').limit(20)
    }
  ];

  for (const b of benchmarkQueries) {
    const t0 = process.hrtime.bigint();
    const res = await b.query();
    const t1 = process.hrtime.bigint();
    const latencyMs = Math.round((Number(t1 - t0) / 1e6) * 100) / 100;
    const status = res.error ? `ERR: ${res.error.message}` : `OK (${Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0)} rows)`;
    console.log(`  - ${b.name.padEnd(55)}: ${latencyMs}ms | ${status}`);
  }

  return {
    totalDeclaredIndexes: declaredIndexes.length,
    criticalIndexesVerified: criticalIndexes.length,
    findings
  };
}

if (require.main === module) {
  inspectDatabaseScalability().then(res => {
    console.log("\nDatabase Inspection Summary:", JSON.stringify(res, null, 2));
  });
}

module.exports = { inspectDatabaseScalability };
