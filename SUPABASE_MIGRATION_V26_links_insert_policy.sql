-- ================================================================
-- V26: Consolidate 3 permissive INSERT policies on links into one.
-- Applied: 2026-07-17 via Supabase MCP
--
-- Bug: 3 separate permissive policies combine with OR in PostgreSQL,
-- meaning ANY ONE passing would allow insert — even from anon users.
-- Fix: merge with AND logic into a single policy.
-- Also: revoke REST-callable EXECUTE on event-trigger function.
-- ================================================================

-- Drop the three separate INSERT policies
DROP POLICY IF EXISTS "links_insert_owner"        ON public.links;
DROP POLICY IF EXISTS "free_users_max_3_links"    ON public.links;
DROP POLICY IF EXISTS "product_type_premium_only" ON public.links;

-- Single consolidated INSERT policy (all conditions must hold)
CREATE POLICY "links_insert_owner" ON public.links
  FOR INSERT WITH CHECK (
    -- 1. Must be the authenticated owner
    (select auth.uid()) = (
      SELECT profiles.id FROM public.profiles WHERE profiles.id = links.profile_id
    )
    -- 2. Must be premium or within the 3-link free limit
    AND (
      (SELECT profiles.is_premium FROM public.profiles WHERE profiles.id = links.profile_id) = true
      OR (SELECT count(*) FROM public.links l WHERE l.profile_id = (select auth.uid())) < 3
    )
    -- 3. Product-type links require premium
    AND (
      links.icon_type <> 'product'
      OR (SELECT profiles.is_premium FROM public.profiles WHERE profiles.id = links.profile_id) = true
    )
  );

-- Revoke direct REST-callable EXECUTE on the event-trigger helper
-- (rls_auto_enable is an event trigger — cannot be called via RPC,
--  but stripping the grant removes it from the exposed API surface)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
