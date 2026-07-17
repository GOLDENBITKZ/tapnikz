-- ============================================================
-- V18: Sales Manager Commission System
-- Apply in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add manager flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false;

-- 2. Create sales_commissions table
CREATE TABLE IF NOT EXISTS public.sales_commissions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_username  TEXT        NOT NULL,
  client_username   TEXT        NOT NULL,
  payment_id        UUID,                          -- reference to payments.id
  plan              TEXT,                          -- 'monthly' | 'annual'
  sale_amount       INTEGER     NOT NULL,          -- full payment amount (₸)
  commission_amount INTEGER     NOT NULL,          -- 20% of sale_amount
  commission_pct    INTEGER     NOT NULL DEFAULT 20,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS sc_manager_idx ON public.sales_commissions (manager_username);
CREATE INDEX IF NOT EXISTS sc_status_idx  ON public.sales_commissions (status);
CREATE INDEX IF NOT EXISTS sc_created_idx ON public.sales_commissions (created_at DESC);

-- 4. RLS: managers see only their own rows
ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manager_own_commissions_select"
  ON public.sales_commissions FOR SELECT
  USING (
    manager_username = (
      SELECT username FROM public.profiles WHERE id = auth.uid()
    )
  );

-- service_role (used by getSupabaseAdmin) bypasses RLS automatically
