-- ============================================================
-- V36: pricing tiers for alias reservations
--
-- Scarcity drives the price: a single emoji comes from a pool of roughly
-- 1 800, two emoji from ~3.2M combinations, and anything else (ASCII text,
-- text+emoji combos, 3-5 graphemes) is effectively unlimited.
--   single_emoji — exactly 1 grapheme, no letters/digits   (VIP)
--   double_emoji — exactly 2 graphemes, no letters/digits  (mid)
--   custom       — everything else, up to 5 graphemes      (Pro)
-- Category is derived server-side by classifyAlias() in lib/unicode-utils.ts,
-- never taken from the client, so it can't be downgraded to dodge a price.
-- ============================================================

ALTER TABLE public.aliases
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'custom';

ALTER TABLE public.aliases
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

-- Drop-then-add so re-running the migration can't fail on an existing
-- constraint with different contents.
ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_category_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_category_check
  CHECK (category IN ('single_emoji', 'double_emoji', 'custom'));

-- alias_hex already has a btree index from its UNIQUE constraint (that's the
-- redirect lookup path). This second index serves the human-readable column,
-- used by "is this alias free?" checks and any future admin/browse listing.
CREATE INDEX IF NOT EXISTS aliases_alias_normalized_idx
  ON public.aliases (alias_normalized);

-- Lets the dashboard list a user's aliases grouped by tier without a sort.
CREATE INDEX IF NOT EXISTS aliases_user_category_idx
  ON public.aliases (user_id, category);
