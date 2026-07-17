-- Migration V10: Add paypal to links.icon_type CHECK constraint
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_icon_type_check;
ALTER TABLE public.links ADD CONSTRAINT links_icon_type_check
  CHECK (icon_type IN (
    'whatsapp', 'telegram', 'instagram', 'tiktok', 'youtube',
    'kaspi', 'kaspi_pay', 'kaspi_shop',
    'twogis', 'website', 'phone', 'email',
    'kolesa', 'krisha', 'vk', 'facebook',
    'link', 'text_block', 'product', 'lead_form',
    'android', 'ios', 'menu', 'paypal'
  ));
