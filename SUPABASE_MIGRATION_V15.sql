-- SUPABASE_MIGRATION_V15.sql
-- Linktree feature parity: email capture, link scheduling, featured link
-- Apply manually in: Supabase Dashboard → SQL Editor → project ahsfumqlrpikkeriyngv

-- 1. Email capture in lead submissions
ALTER TABLE public.lead_submissions ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Link scheduling (show/hide by datetime)
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS visible_from  TIMESTAMPTZ;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS visible_until TIMESTAMPTZ;

-- 3. Featured/spotlight link (one per profile)
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
