-- ============================================================
-- tapni.kz — Supabase Schema (idempotent, safe to re-run)
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ─── profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9-]{3,32}$'),
  business_name text NOT NULL,
  bio           text,
  phone         text,
  theme         text NOT NULL DEFAULT 'dark'
                  CHECK (theme IN ('dark', 'light', 'gradient')),
  is_premium    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Add phone column if table already exists (safe re-run)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- ─── links ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  url         text NOT NULL,
  icon_type   text NOT NULL DEFAULT 'link'
                CHECK (icon_type IN ('whatsapp', 'kaspi', 'twogis', 'link')),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS links_profile_id_sort_idx
  ON public.links (profile_id, sort_order);

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links    ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe re-run)
DROP POLICY IF EXISTS profiles_select_public  ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner   ON public.profiles;
DROP POLICY IF EXISTS profiles_update_owner   ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_owner   ON public.profiles;

DROP POLICY IF EXISTS links_select_public ON public.links;
DROP POLICY IF EXISTS links_insert_owner  ON public.links;
DROP POLICY IF EXISTS links_delete_owner  ON public.links;

-- profiles: public read, owner write
CREATE POLICY profiles_select_public
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY profiles_insert_owner
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_owner
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete_owner
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- links: public read, owner write
CREATE POLICY links_select_public
  ON public.links FOR SELECT USING (true);

CREATE POLICY links_insert_owner
  ON public.links FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT id FROM public.profiles WHERE id = profile_id
    )
  );

CREATE POLICY links_delete_owner
  ON public.links FOR DELETE
  USING (
    auth.uid() = (
      SELECT id FROM public.profiles WHERE id = profile_id
    )
  );

-- ─── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
