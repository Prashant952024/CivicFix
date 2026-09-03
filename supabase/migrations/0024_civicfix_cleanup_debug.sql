-- Migration 0024: Clean up temporary diagnostic functions

drop function if exists public.debug_inspect_worker_system();
drop function if exists public.debug_get_fkey_info();
drop function if exists public.debug_simulate_worker_query(text);
