-- V29: Add 'ediny_qr' to links icon_type CHECK constraint
-- Enables the Единый QR block (unified inter-bank QR payment, launched July 19 2026)
-- Applied to production 2026-07-17

ALTER TABLE links DROP CONSTRAINT IF EXISTS links_icon_type_check;

ALTER TABLE links ADD CONSTRAINT links_icon_type_check CHECK (
  icon_type IN (
    'whatsapp','telegram','instagram','tiktok','youtube',
    'kaspi','kaspi_pay','kaspi_shop','kaspi_qr','ediny_qr',
    'twogis','website','phone','email','kolesa','krisha',
    'vk','facebook','link','text_block','product','lead_form',
    'android','ios','menu','paypal',
    'instagram_dm','instagram_reel','follow_gate','milestone','instagram_keyword',
    'countdown','pricelist','image','video','faq'
  )
);
