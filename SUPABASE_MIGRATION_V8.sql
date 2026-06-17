-- ============================================================
-- V8: Аналитика, лиды, рабочие часы, рефералы
-- Запустить в Supabase SQL Editor: https://supabase.com/dashboard
-- Все команды идемпотентны (IF NOT EXISTS / IF NOT ALREADY).
-- ============================================================

-- ── A. Аналитика: time-series клики ─────────────────────────
CREATE TABLE IF NOT EXISTS click_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id    uuid   NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
-- Только service role (запись через /api/click); анонимному доступа нет
CREATE INDEX IF NOT EXISTS click_events_link_id_idx ON click_events (link_id);
CREATE INDEX IF NOT EXISTS click_events_created_at_idx ON click_events (created_at DESC);

-- ── A. Аналитика: счётчик просмотров профиля ────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL;

-- RPC для атомарного инкремента просмотров
CREATE OR REPLACE FUNCTION increment_profile_view(p_username text)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET view_count = view_count + 1 WHERE username = p_username;
$$;

-- ── B. Захват лидов ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_submissions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  link_id    uuid        REFERENCES links(id) ON DELETE SET NULL,
  name       text        NOT NULL,
  phone      text        NOT NULL,
  message    text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;

-- Владелец профиля может читать свои заявки
CREATE POLICY IF NOT EXISTS "Owner can read own leads"
  ON lead_submissions FOR SELECT
  USING (profile_id = (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));
-- Анонимные пользователи могут вставлять (оставить заявку без регистрации)
CREATE POLICY IF NOT EXISTS "Anyone can submit lead"
  ON lead_submissions FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS lead_submissions_profile_id_idx ON lead_submissions (profile_id);
CREATE INDEX IF NOT EXISTS lead_submissions_created_at_idx ON lead_submissions (created_at DESC);

-- ── E. Рабочие часы ─────────────────────────────────────────
-- Структура: {"mon":"09:00-20:00","tue":"09:00-20:00",...,"sun":null}
-- null = выходной, отсутствие ключа = нет данных
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS working_hours JSONB;

-- ── F. Реферальная программа ────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_bonus_given BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON profiles (referred_by) WHERE referred_by IS NOT NULL;

-- ============================================================
-- Готово. Примените до деплоя фронтенда.
-- ============================================================
