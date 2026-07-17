-- V31: Performance indexes identified in full audit
-- Apply via: Supabase Dashboard → SQL Editor
-- Note: no CONCURRENTLY — SQL Editor runs inside a transaction block

-- 1. Composite index on click_events (link_id, created_at DESC)
--    Covers range queries in dashboard analytics and weekly digest cron:
--    .in('link_id', ids).gte('created_at', weekAgo)
CREATE INDEX IF NOT EXISTS click_events_link_created_idx
  ON public.click_events (link_id, created_at DESC);

-- 2. Index on profiles.updated_at DESC
--    Covers sitemap generation: ORDER BY updated_at DESC LIMIT 5000
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx
  ON public.profiles (updated_at DESC);

-- 3. Index on profiles.view_count DESC
--    Covers discover page: ORDER BY view_count DESC LIMIT 48
CREATE INDEX IF NOT EXISTS profiles_view_count_idx
  ON public.profiles (view_count DESC);

-- 4. Partial index on payments for cron auto-confirm query
--    Covers: status='pending' AND auto_validated=true AND receipt_url IS NOT NULL
CREATE INDEX IF NOT EXISTS payments_pending_autovalidated_idx
  ON public.payments (created_at)
  WHERE status = 'pending' AND auto_validated = true AND receipt_url IS NOT NULL;
