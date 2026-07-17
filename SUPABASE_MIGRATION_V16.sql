-- V16: Payment auto-validation columns
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS auto_validated BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS groq_confidence TEXT; -- 'high' | 'low'

-- Prevent same transaction ID from being used twice
CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_unique
  ON public.payments (transaction_id)
  WHERE transaction_id IS NOT NULL;
