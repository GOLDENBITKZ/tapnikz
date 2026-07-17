-- ================================================================
-- V25: Security & Performance hardening
-- Applied: 2026-07-17 via Supabase MCP
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Fix mutable search_path on SECURITY DEFINER functions
--    Prevents search_path injection attacks
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_link_click(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.links
  SET click_count = click_count + 1
  WHERE id = p_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_profile_view(p_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET view_count = view_count + 1 WHERE username = p_username;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 2. Fix RLS auth_initplan: replace bare auth.uid() calls with
--    (select auth.uid()) so the session UID is evaluated once per
--    query instead of once per row — major perf gain at scale
-- ────────────────────────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "profiles_delete_owner" ON public.profiles;
CREATE POLICY "profiles_delete_owner" ON public.profiles
  FOR DELETE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_insert_owner" ON public.profiles;
CREATE POLICY "profiles_insert_owner" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- links
DROP POLICY IF EXISTS "links_delete_owner" ON public.links;
CREATE POLICY "links_delete_owner" ON public.links
  FOR DELETE USING (
    (select auth.uid()) = (
      SELECT profiles.id FROM public.profiles WHERE profiles.id = links.profile_id
    )
  );

DROP POLICY IF EXISTS "links_insert_owner" ON public.links;
CREATE POLICY "links_insert_owner" ON public.links
  FOR INSERT WITH CHECK (
    (select auth.uid()) = (
      SELECT profiles.id FROM public.profiles WHERE profiles.id = links.profile_id
    )
  );

DROP POLICY IF EXISTS "links_update_owner" ON public.links;
CREATE POLICY "links_update_owner" ON public.links
  FOR UPDATE
  USING ((select auth.uid()) = profile_id)
  WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "free_users_max_3_links" ON public.links;
CREATE POLICY "free_users_max_3_links" ON public.links
  FOR INSERT WITH CHECK (
    (SELECT profiles.is_premium FROM public.profiles WHERE profiles.id = links.profile_id) = true
    OR (SELECT count(*) FROM public.links links_1 WHERE links_1.profile_id = (select auth.uid())) < 3
  );

-- click_events
DROP POLICY IF EXISTS "Owner can read own click events" ON public.click_events;
CREATE POLICY "Owner can read own click events" ON public.click_events
  FOR SELECT USING (
    link_id IN (
      SELECT links.id FROM public.links WHERE links.profile_id = (select auth.uid())
    )
  );

-- lead_submissions
DROP POLICY IF EXISTS "Owner can read own leads" ON public.lead_submissions;
CREATE POLICY "Owner can read own leads" ON public.lead_submissions
  FOR SELECT USING (profile_id = (select auth.uid()));

-- sales_commissions
DROP POLICY IF EXISTS "manager_own_commissions_select" ON public.sales_commissions;
CREATE POLICY "manager_own_commissions_select" ON public.sales_commissions
  FOR SELECT USING (
    manager_username = (
      SELECT profiles.username FROM public.profiles
      WHERE profiles.id = (select auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 3. Add missing index on lead_submissions.link_id FK
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS lead_submissions_link_id_idx
  ON public.lead_submissions (link_id);
