-- ============================================================
-- V39: fix the alias_hex CHECK — it broke every reservation
--
-- V38 wrote CHECK (alias_hex ~ '^[0-9a-f]{2,510}$'). Postgres's POSIX regex
-- engine caps a {n,m} repetition count at 255 (RE_DUP_MAX), so 510 is
-- rejected with "invalid regular expression: invalid repetition count(s)".
--
-- The trap: the constraint was created without any error, because the table
-- was empty and the expression is only evaluated per row. The failure
-- surfaced on the first INSERT — every alias reservation returned HTTP 500
-- while the migration itself reported success.
--
-- Fix: separate the two concerns. A character-class test with no repetition
-- bound, plus an explicit char_length check, which has no such limit.
-- ============================================================

ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_alias_hex_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_alias_hex_check
  CHECK (alias_hex ~ '^[0-9a-f]+$' AND char_length(alias_hex) BETWEEN 2 AND 510);
