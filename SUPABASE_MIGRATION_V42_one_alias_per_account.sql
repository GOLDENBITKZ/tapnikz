-- ============================================================
-- V42: one emoji link per account, guaranteed by the database
--
-- The API already refuses a second reservation, but that check is a read
-- followed by a write: two requests arriving together can both pass the read
-- before either inserts. Only a unique index closes that window.
--
-- Dropping aliases_user_category_idx at the same time: with user_id unique, a
-- lookup by user_id already lands on exactly one row, so the composite index
-- would cost write throughput for nothing.
--
-- Apply order matters — an account holding two aliases makes the index
-- creation fail with 23505. Release the extras first.
-- ============================================================

DROP INDEX IF EXISTS public.aliases_user_category_idx;

CREATE UNIQUE INDEX IF NOT EXISTS aliases_one_per_user_idx
  ON public.aliases (user_id);
