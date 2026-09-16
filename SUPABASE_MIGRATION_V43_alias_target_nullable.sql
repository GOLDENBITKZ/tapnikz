-- V43: aliases without a target resolve to the owner's current profile page.
-- V35 declared target_url NOT NULL before the API supported this behavior.
ALTER TABLE public.aliases
  ALTER COLUMN target_url DROP NOT NULL;

ALTER TABLE public.aliases
  DROP CONSTRAINT IF EXISTS aliases_target_url_check;

ALTER TABLE public.aliases
  ADD CONSTRAINT aliases_target_url_check
  CHECK (target_url IS NULL OR char_length(target_url) BETWEEN 1 AND 2048);