-- V30: Smart QR deep-link — click_events source + icon_type + RLS + security fixes
-- Applied to production 2026-07-17

-- 1. Add source column to click_events (QR scans tagged 'qr_scan', clicks NULL/legacy)
ALTER TABLE public.click_events ADD COLUMN IF NOT EXISTS source text;

-- 2. Add smart_qr to icon_type CHECK constraint
ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_icon_type_check;
ALTER TABLE public.links ADD CONSTRAINT links_icon_type_check CHECK (
  icon_type IN (
    'whatsapp','telegram','instagram','tiktok','youtube',
    'kaspi','kaspi_pay','kaspi_shop','kaspi_qr','ediny_qr','smart_qr',
    'twogis','website','phone','email','kolesa','krisha',
    'vk','facebook','link','text_block','product','lead_form',
    'android','ios','menu','paypal',
    'instagram_dm','instagram_reel','follow_gate','milestone','instagram_keyword',
    'countdown','pricelist','image','video','faq'
  )
);

-- 3. Consolidate links INSERT policies (fixes multiple_permissive_policies advisor warning)
DROP POLICY IF EXISTS "links_insert_owner"        ON public.links;
DROP POLICY IF EXISTS "free_users_max_3_links"    ON public.links;
DROP POLICY IF EXISTS "product_type_premium_only" ON public.links;

CREATE POLICY "links_insert_owner" ON public.links
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = (
      SELECT profiles.id FROM public.profiles WHERE profiles.id = links.profile_id
    )
    AND (
      (SELECT profiles.is_premium FROM public.profiles WHERE profiles.id = links.profile_id) = true
      OR (SELECT count(*) FROM public.links l WHERE l.profile_id = (SELECT auth.uid())) < 3
    )
    AND (
      links.icon_type NOT IN ('product', 'smart_qr')
      OR (SELECT profiles.is_premium FROM public.profiles WHERE profiles.id = links.profile_id) = true
    )
  );

-- 4. Fix function search_path (function_search_path_mutable advisor warnings)
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_link_click(p_link_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_profile_view(p_username text) SET search_path = public, pg_temp;

-- 5. Revoke anon EXECUTE on SECURITY DEFINER functions
-- (called only via service role from Next.js server, not public REST API)
REVOKE EXECUTE ON FUNCTION public.increment_link_click(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_profile_view(text) FROM anon;
