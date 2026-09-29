-- =====================================================================
-- Migration 0073: Server-side Atomic Rate Limiting & Abuse Protection
-- =====================================================================
-- Provides durable, distributed, atomic rate-limit state tracking across
-- Supabase Edge Function instances without external Redis dependencies.
-- Enforces row-level serialization via PostgreSQL UPSERT and atomic RPC.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  rate_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rate_key, window_start)
);

-- Index for window pruning and range queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits (window_start);

-- Strict RLS: prevent direct client access (anon/authenticated cannot read or manipulate rate limits)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rate_limits FROM PUBLIC;
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;
GRANT ALL ON public.rate_limits TO service_role;

-- =====================================================================
-- Atomic RPC: check_and_increment_rate_limit
-- =====================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_rate_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
  v_reset_epoch NUMERIC;
  v_retry_after INTEGER;
  v_sanitized_key TEXT;
BEGIN
  -- Input validation
  IF p_rate_key IS NULL OR length(trim(p_rate_key)) = 0 THEN
    RAISE EXCEPTION 'p_rate_key cannot be null or empty';
  END IF;

  v_sanitized_key := trim(p_rate_key);

  IF p_limit IS NULL OR p_limit <= 0 THEN
    p_limit := 1;
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    p_window_seconds := 60;
  END IF;

  -- Compute deterministic window start aligned to epoch
  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  -- Atomic UPSERT with row-level lock serialization
  INSERT INTO public.rate_limits (rate_key, window_start, request_count, created_at, updated_at)
  VALUES (v_sanitized_key, v_window_start, 1, v_now, v_now)
  ON CONFLICT (rate_key, window_start)
  DO UPDATE SET
    request_count = public.rate_limits.request_count + 1,
    updated_at = v_now
  RETURNING public.rate_limits.request_count INTO v_current_count;

  -- Calculate quota & retry window
  v_allowed := (v_current_count <= p_limit);
  v_remaining := GREATEST(0, p_limit - v_current_count);
  v_reset_epoch := extract(epoch from (v_window_start + (p_window_seconds || ' seconds')::interval));
  v_retry_after := GREATEST(1, ceil(v_reset_epoch - extract(epoch from v_now))::integer);

  -- Opportunistic pruning of expired buckets (> 24 hours old) on periodic requests
  IF (v_current_count % 500 = 0) THEN
    DELETE FROM public.rate_limits WHERE window_start < (v_now - interval '24 hours');
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_current_count,
    'remaining', v_remaining,
    'limit', p_limit,
    'retry_after_seconds', v_retry_after,
    'window_seconds', p_window_seconds
  );
END;
$$;

-- Secure execution permissions
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
