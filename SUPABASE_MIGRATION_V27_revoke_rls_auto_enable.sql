-- ================================================================
-- V27: Revoke PUBLIC EXECUTE grant on rls_auto_enable
-- Applied: 2026-07-17 via Supabase MCP
--
-- rls_auto_enable is an event trigger function (RETURNS event_trigger).
-- PostgreSQL prevents direct invocation of event trigger functions, so
-- this is effectively a false positive from Supabase advisor — but
-- revoke PUBLIC grant to clear the advisory warning.
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;
