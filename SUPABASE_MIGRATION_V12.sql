-- Migration V12: Payment automation — pending payments + auto-confirm tracking
-- Run in Supabase Dashboard → SQL Editor

-- Add payment tracking columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS auto_confirmed_at TIMESTAMPTZ;

-- Extend status CHECK to allow 'pending'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- Index for fast lookup of pending payments
CREATE INDEX IF NOT EXISTS payments_pending_idx
  ON public.payments (username, status, created_at)
  WHERE status = 'pending';
