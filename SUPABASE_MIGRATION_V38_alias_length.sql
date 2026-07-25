-- ============================================================
-- V38: raise the alias length ceiling
--
-- The original 5-grapheme cap was too tight: an alias should be able to be a
-- readable name, not just a symbol, and usernames on this service already go
-- up to 32 characters. The limit now matches that — 32 graphemes.
--
-- Graphemes alone are not a safe bound for storage, because one grapheme can
-- be many bytes: 🚀 is 4, 🇰🇿 is 8, and a ZWJ family like 👨‍👩‍👧‍👦 is 25. Thirty-two
-- of the last would be 800 bytes and a 1 600-character index key. So a byte
-- ceiling of 255 backs it up (510 hex characters). That is generous for every
-- realistic alias — all 32 ASCII characters, or 63 simple emoji — and only
-- binds on long chains of composite emoji.
--
-- Tiers are unchanged: 1 grapheme = single_emoji, 2 = double_emoji, 3+ = custom.
-- ============================================================

ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_alias_hex_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_alias_hex_check
  CHECK (alias_hex ~ '^[0-9a-f]{2,510}$');

ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_alias_raw_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_alias_raw_check
  CHECK (char_length(alias_raw) BETWEEN 1 AND 255);

ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_alias_normalized_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_alias_normalized_check
  CHECK (char_length(alias_normalized) BETWEEN 1 AND 255);
