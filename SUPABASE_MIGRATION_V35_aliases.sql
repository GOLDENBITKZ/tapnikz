-- ============================================================
-- V35: Premium alias reservations
-- tapni.kz/{alias} and tapni.kz/tapni.kz/{alias} both resolve the
-- same reservation — one row, two access URLs (confirmed with user).
-- Reserving requires an active Premium subscription at creation time;
-- once created, an alias keeps redirecting even if Premium later lapses
-- (matches existing convention: premium-gated content isn't deleted on expiry).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.aliases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alias_raw        text NOT NULL CHECK (char_length(alias_raw) BETWEEN 1 AND 64),
  alias_normalized text NOT NULL,
  -- UTF-8 hex of the normalized alias — exact-byte lookup key, immune to
  -- Unicode normalization/encoding ambiguity. UNIQUE already gives this a
  -- btree index, no separate CREATE INDEX needed for lookups.
  alias_hex        text NOT NULL UNIQUE CHECK (alias_hex ~ '^[0-9a-f]{2,64}$'),
  target_url       text NOT NULL CHECK (char_length(target_url) BETWEEN 1 AND 2048),
  is_premium       boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Only user_id needs an explicit index (for a future "my aliases" list) —
-- alias_hex's lookup index already comes from the UNIQUE constraint above.
CREATE INDEX IF NOT EXISTS aliases_user_id_idx ON public.aliases (user_id);

ALTER TABLE public.aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aliases_select_public ON public.aliases;
DROP POLICY IF EXISTS aliases_insert_owner  ON public.aliases;
DROP POLICY IF EXISTS aliases_update_owner  ON public.aliases;
DROP POLICY IF EXISTS aliases_delete_owner  ON public.aliases;

-- Public read: the redirect lookups in [username]/page.tsx and
-- tapni.kz/[slug]/page.tsx need to resolve any alias_hex without auth.
CREATE POLICY aliases_select_public
  ON public.aliases FOR SELECT USING (true);

-- Owner-only write, same idiom as profiles_insert_owner /
-- profiles_update_owner in SUPABASE_SCHEMA.sql (direct auth.uid() = user_id,
-- since user_id references profiles.id which IS auth.uid() for its owner).
-- Actual enforcement at launch happens in /api/aliases (service-role write,
-- bypasses RLS) — these policies are the safety net for any future
-- client-side direct-write path, matching how links/profiles are set up.
CREATE POLICY aliases_insert_owner
  ON public.aliases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY aliases_update_owner
  ON public.aliases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY aliases_delete_owner
  ON public.aliases FOR DELETE
  USING (auth.uid() = user_id);

-- Reuses the existing public.set_updated_at() trigger function
-- (defined in SUPABASE_SCHEMA.sql, hardened with search_path in V25/V30).
DROP TRIGGER IF EXISTS aliases_set_updated_at ON public.aliases;
CREATE TRIGGER aliases_set_updated_at
  BEFORE UPDATE ON public.aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
