# CivicFix Production Readiness — Load Testing Framework

This directory contains the automated, progressive concurrency load testing and scalability measurement framework for CivicFix.

---

## 1. Prerequisites & Environment Variables

The load test harness requires access to a target Supabase instance (staging or local preferred, or live target).

Required environment variables in `.env`:
```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... # Optional for privileged RPC queries
```

> **Security Notice**: Never hardcode or commit secret keys or API tokens into test runners or result outputs.

---

## 2. Tested Workloads

The suite evaluates five core operational workflows across progressive concurrency levels (10, 25, 50, 100, 250 virtual clients):

| Workload ID | Name | Target Backend Paths |
| :--- | :--- | :--- |
| **Workload A** | Public & Basic Browsing | `districts`, `departments`, `department_planning_sectors`, `innovation_challenges` |
| **Workload B** | Authenticated Civic Operations | Chronological `issues` feed, deep issue detail with `issue_images` / `issue_status_history`, `issue_department_assignments` |
| **Workload C** | Admin/Officer Pagination & Analytics | Paginated officer queue (`.range(0, 24)`), ILIKE search, user management, `get_admin_analytics_telemetry` aggregation RPC |
| **Workload D** | Infrastructure Multi-Dataset Context RPC | `get_district_infrastructure_context` multi-dataset aggregation (D1–D7) across 5 Indian districts |
| **Workload E** | Expensive Edge Functions & Rate Limiting | Controlled invocation of `analyze-issue`, `detect-duplicates`, `generate-challenge`, `match-institutions` validating atomic rate-limiting (429) |

---

## 3. How to Start a Test

### Run All Workloads (Progressive Concurrency)
```bash
npm run load-test
# or directly:
node scripts/load-tests/run_all_load_tests.cjs
```

### Run an Individual Workload
```bash
# Run Workload A with 25 concurrent virtual users
node scripts/load-tests/workload_a_public_browsing.cjs 25

# Run Workload D with 50 concurrent virtual users
node scripts/load-tests/workload_d_infrastructure_context.cjs 50
```

---

## 4. How Results Are Collected & Computed

The load test engine ([`load_test_harness.cjs`](load_test_harness.cjs)) collects high-precision timing using `process.hrtime.bigint()` for each request:
- **Throughput**: Sustained requests per second (req/s).
- **Latency Percentiles**: min, p50 (median), p95, p99, max in milliseconds.
- **HTTP Status Code Distribution**: Detailed response code counts (`200`, `429`, `500`, timeouts).
- **Machine-Readable Export**: Persisted to `scripts/load-tests/results.json`.

---

## 5. How to Stop a Test Safely

- Press `Ctrl+C` in your terminal to immediately cancel running worker promises.
- The harness operates non-destructively on query paths and read RPCs; stopping a test does not leave orphaned records or mutate production state.

---

## 6. How to Interpret Results & Bottlenecks

- **p50 < 300ms & p95 < 1500ms**: Healthy low-latency operational throughput.
- **p95 > 3000ms**: High latency tail; indicates network or complex database aggregation.
- **Timeouts > 0**: PostgREST / PostgreSQL connection pool saturation.
- **HTTP 429**: Expected rate-limiter activation on high-frequency Edge Function calls.
