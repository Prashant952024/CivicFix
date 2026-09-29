/// <reference path="../deno.d.ts" />

import type { SupabaseClient } from "npm:@supabase/supabase-js";

export type RateLimitScope = "ip" | "user" | "global";

export type RateLimitRule = {
  scope: RateLimitScope;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
  ruleScope?: RateLimitScope;
};

/**
 * Extracts client IP from standard proxy/CDN headers.
 */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  const fwd = request.headers.get("x-forwarded-for");
  if (fwd && fwd.trim()) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }

  return "anonymous-ip";
}

/**
 * Evaluates rate limit rules using atomic database RPC.
 */
export async function checkRateLimits(
  supabaseAdmin: SupabaseClient,
  options: {
    endpoint: string;
    userId?: string | null;
    clientIp?: string | null;
    isServiceRole?: boolean;
    rules: RateLimitRule[];
    failClosedOnDbError?: boolean;
  }
): Promise<RateLimitResult> {
  const { endpoint, userId, clientIp, isServiceRole, rules, failClosedOnDbError } = options;

  // Bypass rate limiting for verified internal service-role callers
  if (isServiceRole) {
    return {
      allowed: true,
      remaining: 9999,
      retryAfterSeconds: 0,
      limit: 9999,
    };
  }

  let minRemaining = Infinity;
  let maxLimit = 0;

  for (const rule of rules) {
    let keySuffix = "";
    if (rule.scope === "ip") {
      const ip = clientIp || "anonymous-ip";
      keySuffix = `ip:${ip}`;
    } else if (rule.scope === "user") {
      if (!userId) continue; // Skip user-scoped limit if caller has no user identity
      keySuffix = `user:${userId}`;
    } else {
      keySuffix = "global";
    }

    const rateKey = `rate:${endpoint}:${keySuffix}`;

    try {
      const { data, error } = await supabaseAdmin.rpc("check_and_increment_rate_limit", {
        p_rate_key: rateKey,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
      });

      if (error) {
        console.error(`[RateLimiter] Error evaluating rate limit for ${rateKey}:`, error.message);
        if (failClosedOnDbError) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: 60,
            limit: rule.limit,
            ruleScope: rule.scope,
          };
        }
        continue;
      }

      if (data && typeof data === "object") {
        const allowed = Boolean(data.allowed);
        const remaining = typeof data.remaining === "number" ? data.remaining : 0;
        const retryAfter = typeof data.retry_after_seconds === "number" ? data.retry_after_seconds : 60;

        if (!allowed) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: retryAfter,
            limit: rule.limit,
            ruleScope: rule.scope,
          };
        }

        minRemaining = Math.min(minRemaining, remaining);
        maxLimit = Math.max(maxLimit, rule.limit);
      }
    } catch (err) {
      console.error(`[RateLimiter] Unexpected error checking ${rateKey}:`, err);
      if (failClosedOnDbError) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: 60,
          limit: rule.limit,
          ruleScope: rule.scope,
        };
      }
    }
  }

  return {
    allowed: true,
    remaining: minRemaining === Infinity ? 100 : minRemaining,
    retryAfterSeconds: 0,
    limit: maxLimit,
  };
}

/**
 * Standard HTTP 429 Too Many Requests response builder.
 */
export function createRateLimitResponse(
  retryAfterSeconds: number,
  origin: string | null = "*",
  customMessage?: string
): Response {
  const retrySec = Math.max(1, retryAfterSeconds);
  return new Response(
    JSON.stringify({
      success: false,
      errorCode: "RATE_LIMITED",
      userMessage:
        customMessage || `Too many requests. Please slow down and try again in ${retrySec} second${retrySec === 1 ? "" : "s"}.`,
      retryAfterSeconds: retrySec,
    }),
    {
      status: 429,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Credentials": "true",
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(retrySec),
        Vary: "Origin",
      },
    }
  );
}
