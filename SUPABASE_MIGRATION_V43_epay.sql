-- V43: поддержка онлайн-оплаты картой через EPAY (Halyk Bank)
-- Apply in Supabase Dashboard → SQL Editor

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS epay_invoice_id text,
  ADD COLUMN IF NOT EXISTS epay_secret_hash text;

COMMENT ON COLUMN public.payments.epay_invoice_id IS
  'invoiceId, отправленный в EPAY (6-15 цифр). Используется для сопоставления postLink-вебхука и check-status с этой записью.';
COMMENT ON COLUMN public.payments.epay_secret_hash IS
  'Секрет, сгенерированный нами при создании платежа. Сверяется со значением из postLink, чтобы подтвердить подлинность вебхука EPAY.';

-- Быстрый и уникальный поиск платежа по invoiceId при обработке вебхука
CREATE UNIQUE INDEX IF NOT EXISTS payments_epay_invoice_id_idx
  ON public.payments (epay_invoice_id)
  WHERE epay_invoice_id IS NOT NULL;

-- Также добавить переменные окружения в Vercel:
--   EPAY_CLIENT_ID, EPAY_CLIENT_SECRET, EPAY_TERMINAL_ID
--   EPAY_ENV = 'prod' (боевой контур) или не задавать / 'test' (тестовый контур EPAY)
