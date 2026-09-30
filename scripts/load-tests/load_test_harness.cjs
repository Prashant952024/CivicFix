/**
 * CivicFix Phase 5.5 Load Test Engine & Metric Collector
 * ======================================================
 * High-precision concurrent load testing harness with percentile computation,
 * throughput measurement, HTTP status tracking, and bottleneck classification.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        env[k] = v;
      }
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || "https://fzatlgzittpguemzbdkm.supabase.co";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_79XhVwdn8WpQYA2In1HjOQ_S7zYP05f";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) {
    return { min: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  };
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min: Math.round(sorted[0] * 100) / 100,
    p50: Math.round(getP(50) * 100) / 100,
    p95: Math.round(getP(95) * 100) / 100,
    p99: Math.round(getP(99) * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg: Math.round((sum / sorted.length) * 100) / 100
  };
}

/**
 * Runs a load test for a specific task function across a given concurrency level.
 * @param {Object} options
 * @param {string} options.workloadName
 * @param {number} options.concurrency - Number of simulated concurrent workers
 * @param {number} options.totalRequests - Total requests to distribute
 * @param {number} [options.timeoutMs=15000] - Request timeout in ms
 * @param {Function} options.taskFn - Async worker function `async (workerId, reqIndex) => { status, error, isRateLimited }`
 */
async function runConcurrentWorkload({
  workloadName,
  concurrency,
  totalRequests,
  timeoutMs = 15000,
  taskFn
}) {
  const latencies = [];
  const statusDistribution = {};
  let successfulRequests = 0;
  let failedRequests = 0;
  let rateLimitedRequests = 0;
  let timeoutCount = 0;
  let currentIndex = 0;

  const startTime = Date.now();

  async function worker(workerId) {
    while (true) {
      const reqIndex = currentIndex++;
      if (reqIndex >= totalRequests) break;

      const reqStart = process.hrtime.bigint();
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        );

        const result = await Promise.race([taskFn(workerId, reqIndex), timeoutPromise]);
        const reqEnd = process.hrtime.bigint();
        const latencyMs = Number(reqEnd - reqStart) / 1e6;
        latencies.push(latencyMs);

        const status = result?.status || (result?.error ? 'ERROR' : 200);
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;

        if (status === 429 || result?.isRateLimited) {
          rateLimitedRequests++;
        }

        if (status >= 200 && status < 400) {
          successfulRequests++;
        } else if (status === 429 || status === 401 || status === 403 || result?.isAuthProtected || result?.isRateLimited) {
          // Expected security barrier or rate-limit counts as handled response
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch (err) {
        const reqEnd = process.hrtime.bigint();
        const latencyMs = Number(reqEnd - reqStart) / 1e6;
        latencies.push(latencyMs);

        if (err.message === 'TIMEOUT') {
          timeoutCount++;
          statusDistribution['TIMEOUT'] = (statusDistribution['TIMEOUT'] || 0) + 1;
        } else {
          const errCode = err.code || 'ERR';
          statusDistribution[errCode] = (statusDistribution[errCode] || 0) + 1;
        }
        failedRequests++;
      }
    }
  }

  const workerPromises = [];
  for (let i = 0; i < concurrency; i++) {
    workerPromises.push(worker(i));
  }
  await Promise.all(workerPromises);

  const durationSec = (Date.now() - startTime) / 1000;
  const throughput = Math.round((totalRequests / Math.max(durationSec, 0.001)) * 100) / 100;
  const percentiles = calculatePercentiles(latencies);
  const errorRate = Math.round((failedRequests / totalRequests) * 10000) / 100;

  // Diagnostic Bottleneck Classification
  let primaryBottleneck = 'None (Healthy)';
  if (errorRate > 20) {
    primaryBottleneck = 'Server Error / RLS Rejection Rate Spike';
  } else if (timeoutCount > 0) {
    primaryBottleneck = 'Database Connection Contention / Query Timeout';
  } else if (percentiles.p95 > 3000) {
    primaryBottleneck = 'High Latency Tail (Network or Upstream RPC)';
  } else if (rateLimitedRequests > totalRequests * 0.5) {
    primaryBottleneck = 'Atomic Rate Limiter (Expected Threshold Saturation)';
  } else if (concurrency >= 100 && throughput < 20) {
    primaryBottleneck = 'PostgREST Connection Pool Concurrency Ceiling';
  }

  return {
    workloadName,
    concurrency,
    totalRequests,
    successfulRequests,
    failedRequests,
    rateLimitedRequests,
    timeoutCount,
    errorRate,
    durationSec: Math.round(durationSec * 100) / 100,
    throughputRps: throughput,
    percentiles,
    statusDistribution,
    primaryBottleneck
  };
}

module.exports = {
  SUPABASE_URL,
  ANON_KEY,
  SERVICE_KEY,
  createAnonClient: () => createClient(SUPABASE_URL, ANON_KEY),
  createAdminClient: () => SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null,
  runConcurrentWorkload,
  calculatePercentiles
};
