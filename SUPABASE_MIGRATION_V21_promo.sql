-- V21: Promo users flag — distinguish real paying customers from promo/test accounts
-- Apply in Supabase Dashboard → SQL Editor

-- Add is_promo column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_promo BOOLEAN NOT NULL DEFAULT false;

-- Mark all existing premium users as promo EXCEPT the known real paying customers.
-- Real paying customers: trisamuraya, fitzarinass, luiza, tapnikz
-- All other premium users received free activation (testing/gifts/partnerships).
UPDATE public.profiles
SET is_promo = true
WHERE is_premium = true
  AND username NOT IN ('trisamuraya', 'fitzarinass', 'luiza', 'tapnikz');

-- RLS: admins can update is_promo (via service role — already unrestricted)
-- Regular users cannot change their own is_promo flag
-- No additional policy needed — existing owner-only update policy covers this,
-- and is_promo is set only by the admin via service role client.
