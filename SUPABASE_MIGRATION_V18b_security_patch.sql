-- ============================================================
-- V18b: Sales Commissions Security Patch
-- Apply AFTER V18 in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Unique constraint: one payment = one commission row maximum
--    Prevents duplicate commissions if activatePremium is called twice
ALTER TABLE public.sales_commissions
  ADD CONSTRAINT sc_payment_unique UNIQUE (payment_id);

-- 2. Explicit deny policies for INSERT/UPDATE/DELETE
--    RLS default-deny already covers this, but explicit policies
--    prevent future API mistakes and document intent clearly.
CREATE POLICY "no_insert_commissions"
  ON public.sales_commissions FOR INSERT
  WITH CHECK (false);

CREATE POLICY "no_update_commissions"
  ON public.sales_commissions FOR UPDATE
  USING (false);

CREATE POLICY "no_delete_commissions"
  ON public.sales_commissions FOR DELETE
  USING (false);
