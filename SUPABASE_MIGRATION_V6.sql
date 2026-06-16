-- ============================================================
-- tapni.kz Migration V6 — run in Supabase SQL Editor
-- Adds: click_count column on links + increment_link_click RPC
-- ============================================================

-- 1. Add click_count column (safe — no-op if already exists)
ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

-- 2. Create the RPC function used by /api/click
CREATE OR REPLACE FUNCTION public.increment_link_click(p_link_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.links
  SET click_count = click_count + 1
  WHERE id = p_link_id;
$$;

-- Grant execute to the anon/service roles
GRANT EXECUTE ON FUNCTION public.increment_link_click(uuid) TO anon, authenticated, service_role;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'links' AND column_name = 'click_count';
