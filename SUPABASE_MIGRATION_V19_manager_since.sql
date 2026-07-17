-- ============================================================
-- V19: Manager self-activation timestamp
-- Apply in Supabase Dashboard → SQL Editor
-- ============================================================

-- Tracks when a user activated manager status.
-- Used by cron to detect and deactivate inactive managers (0 clients after 60 days).
-- Set to NOW() on self-activation and on re-activation.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_since TIMESTAMPTZ;
