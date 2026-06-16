-- ============================================================
-- tapni.kz Migration V5 — run in Supabase SQL Editor
-- Fixes: icon_type constraint + new themes (blogger/business/seller)
-- ============================================================

-- 1. Drop the old theme CHECK constraint so new themes work
--    (PostgreSQL auto-names inline constraints as <table>_<column>_check)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_theme_check;

-- Add it back with all supported themes
ALTER TABLE public.profiles ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('dark', 'light', 'gradient', 'blogger', 'business', 'seller'));

-- 2. Drop the old icon_type CHECK constraint
--    (added in Migration V2, doesn't include kaspi_pay / kaspi_shop / text_block)
ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_icon_type_check;

-- Add it back with all current types
ALTER TABLE public.links ADD CONSTRAINT links_icon_type_check
  CHECK (icon_type IN (
    'whatsapp', 'telegram', 'instagram', 'tiktok', 'youtube',
    'kaspi', 'kaspi_pay', 'kaspi_shop',
    'twogis', 'website', 'phone', 'email',
    'kolesa', 'krisha', 'vk', 'facebook',
    'link', 'text_block'
  ));

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'theme';
