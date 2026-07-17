-- V20: Performance indexes for frequently queried boolean columns
-- Apply in Supabase Dashboard → SQL Editor
-- NOTE: Apply V19 (manager_since column) BEFORE this migration

-- Partial index on is_premium (only premium users — far fewer rows than total)
-- Used by cron: find expired/expiring premiums (3 queries per run)
CREATE INDEX IF NOT EXISTS profiles_is_premium_idx
  ON public.profiles (is_premium, subscription_expires_at)
  WHERE is_premium = true;

-- Partial index on is_manager (only active managers)
-- Used by cron: manager inactivity check, and by /api/manager/* endpoints
CREATE INDEX IF NOT EXISTS profiles_is_manager_idx
  ON public.profiles (is_manager)
  WHERE is_manager = true;

-- Index on referred_by for manager client lookups
-- Used by cron batch query and /api/manager GET
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx
  ON public.profiles (referred_by)
  WHERE referred_by IS NOT NULL;

-- Index on sales_commissions by manager_username
-- Used by /api/manager GET and /api/telegram-bot /managers, /commissions, /paid
CREATE INDEX IF NOT EXISTS sales_commissions_manager_idx
  ON public.sales_commissions (manager_username, status);
