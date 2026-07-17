-- Migration V11: Onboarding sequence tracking
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_sent_at TIMESTAMPTZ;
