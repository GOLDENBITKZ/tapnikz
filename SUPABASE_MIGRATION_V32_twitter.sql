-- V32: Add 'twitter' to icon_type CHECK constraint

ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_icon_type_check;
ALTER TABLE public.links ADD CONSTRAINT links_icon_type_check CHECK (
  icon_type IN (
    'whatsapp','telegram','instagram','tiktok','youtube',
    'kaspi','kaspi_pay','kaspi_shop','kaspi_qr','ediny_qr','smart_qr',
    'twogis','website','phone','email','kolesa','krisha',
    'vk','facebook','twitter','link','text_block','product','lead_form',
    'android','ios','menu','paypal',
    'instagram_dm','instagram_reel','follow_gate','milestone','instagram_keyword',
    'countdown','pricelist','image','video','faq'
  )
);
