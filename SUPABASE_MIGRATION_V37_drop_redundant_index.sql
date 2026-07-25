-- ============================================================
-- V37: remove a redundant index on aliases
--
-- aliases_user_category_idx is (user_id, category). A btree index serves
-- queries on any leftmost prefix, so it already answers everything
-- aliases_user_id_idx did. Keeping both only cost write throughput and
-- storage on every insert/update.
-- ============================================================

DROP INDEX IF EXISTS public.aliases_user_id_idx;
