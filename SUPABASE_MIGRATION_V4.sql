-- Migration V4: Telegram linking + new link types support
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Add telegram_chat_id to store Telegram user ID (as text to avoid bigint issues)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text DEFAULT NULL;

-- 2. Index for fast lookup by telegram_chat_id
CREATE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx ON profiles (telegram_chat_id);

-- 3. The link table already supports any text in icon_type — no schema change needed
--    New types kaspi_pay, kaspi_shop, text_block work automatically.
--    However, if you have a CHECK constraint on icon_type, update it:
--    (Check Dashboard → Table Editor → links → Constraints first)

-- Optional: if there's a CHECK constraint like:
-- ALTER TABLE links DROP CONSTRAINT IF EXISTS links_icon_type_check;
-- ALTER TABLE links ADD CONSTRAINT links_icon_type_check CHECK (
--   icon_type IN (
--     'whatsapp','telegram','instagram','tiktok','youtube',
--     'kaspi','kaspi_pay','kaspi_shop',
--     'twogis','website','phone','email',
--     'kolesa','krisha','vk','facebook','link','text_block'
--   )
-- );

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'telegram_chat_id';
