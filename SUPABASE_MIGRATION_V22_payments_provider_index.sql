-- V22: Index on payments.provider for fast real-revenue queries
-- Apply in Supabase Dashboard → SQL Editor

-- Index to speed up /revenue command filtering by status + provider
CREATE INDEX IF NOT EXISTS payments_status_provider_idx
  ON public.payments (status, provider)
  WHERE status = 'confirmed';

-- Also ensure VCARD_SECRET env var is set in Vercel
-- (vcard-token.ts no longer falls back to SUPABASE_SERVICE_ROLE_KEY)
