-- ============================================================
-- V7: payments table — история платежей и учёт подписок
-- Запустить в Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- История каждого подтверждённого/отменённого платежа
CREATE TABLE IF NOT EXISTS payments (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  username     text        NOT NULL,
  plan         text        NOT NULL CHECK (plan IN ('monthly', 'annual')),
  amount       integer     NOT NULL,           -- в тенге
  days         integer     NOT NULL,
  method       text        NOT NULL DEFAULT 'manual',  -- 'kaspi' | 'halyk' | 'invoice' | 'gift' | 'manual'
  status       text        NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  notes        text,
  admin_tg_id  text,                           -- telegram chat_id кто подтвердил
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- Только service role имеет доступ (через getSupabaseAdmin)
-- Публичного чтения нет

CREATE INDEX IF NOT EXISTS payments_username_idx   ON payments (username);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments (created_at DESC);

-- ============================================================
-- Политика хранения данных (документация)
-- ============================================================
-- • Аккаунты пользователей: хранятся бессрочно
-- • Ссылки/кнопки: хранятся бессрочно (бесплатный план показывает только 3)
-- • Аватары (Storage): хранятся пока аккаунт активен
-- • payments: хранятся бессрочно (аудит и история)
-- • Username рекламация: возможна вручную через /archive после 18+ мес. полного бездействия
-- ============================================================
