-- V24: Missing indexes for cron performance and admin /find command
--
-- Without these, every daily cron run does full-table scans on profiles
-- for onboarding queries, and admin /find by phone does full-table scan too.
-- At 10K+ users these become noticeably slow.

-- Index for admin /find @phone search (was doing full table scan)
CREATE INDEX IF NOT EXISTS profiles_phone_idx
  ON public.profiles (phone);

-- Composite index for onboarding cron queries (3 queries per cron run):
-- WHERE onboarding_step = X AND onboarding_sent_at BETWEEN Y AND Z
-- Partial: only index users actively in onboarding (step > 0)
CREATE INDEX IF NOT EXISTS profiles_onboarding_idx
  ON public.profiles (onboarding_step, onboarding_sent_at)
  WHERE onboarding_step > 0 AND onboarding_step < 4;
