-- ============================================================
-- V17: Security hardening
-- Apply in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Revoke anon access to increment_link_click RPC
--    (prevents anonymous click-count inflation, bypassing /api/click rate limit)
REVOKE EXECUTE ON FUNCTION public.increment_link_click(UUID) FROM anon;

-- 2. Hide telegram_chat_id from anonymous reads
--    (it's a sensitive identifier — only owner and service_role should see it)
REVOKE SELECT (telegram_chat_id) ON public.profiles FROM anon;
REVOKE SELECT (telegram_chat_id) ON public.profiles FROM authenticated;

-- 3. Ensure phone is not readable by anon (idempotent with V16)
REVOKE SELECT (phone) ON public.profiles FROM anon;
REVOKE SELECT (phone) ON public.profiles FROM authenticated;
