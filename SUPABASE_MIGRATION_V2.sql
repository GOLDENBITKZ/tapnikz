-- ============================================================
-- tapni.kz — Migration V2 (idempotent, run AFTER initial schema)
-- Supabase → SQL Editor
-- ============================================================

-- Add address and subscription fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- Expand icon_type constraint on links to support all new types
ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_icon_type_check;
ALTER TABLE public.links ADD CONSTRAINT links_icon_type_check
  CHECK (icon_type IN (
    'whatsapp', 'telegram', 'instagram', 'tiktok', 'youtube',
    'kaspi', 'twogis', 'website', 'phone', 'email',
    'kolesa', 'krisha', 'vk', 'facebook', 'link'
  ));
