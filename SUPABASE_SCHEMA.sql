-- ============================================================
-- tapni.kz — Supabase schema
--
-- Reconciled against the live database on 2026-07-26 by dumping
-- pg_attribute / pg_constraint / pg_indexes / pg_policies / pg_proc /
-- pg_trigger and rewriting this file to match. The previous version had
-- drifted badly — most importantly it documented the username CHECK as
-- ^[a-z0-9-]{3,32}$ (no dots) when the live rule permits dots, which is
-- exactly how the brand profiles egov.kz / kolesa.kz / halyk.kz exist.
-- Anyone reasoning from the old file would have drawn a false conclusion.
--
-- This file is the reference snapshot of current state. Incremental changes
-- live in SUPABASE_MIGRATION_V*.sql and are applied in order; this is
-- idempotent and safe to re-run, but it does NOT recreate history.
-- ============================================================

-- ─── profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                text UNIQUE NOT NULL,
  business_name           text NOT NULL,
  bio                     text,
  phone                   text,
  address                 text,
  avatar_url              text,
  theme                   text NOT NULL DEFAULT 'dark',
  working_hours           jsonb,
  view_count              integer NOT NULL DEFAULT 0,
  is_premium              boolean NOT NULL DEFAULT false,
  is_promo                boolean NOT NULL DEFAULT false,
  subscription_plan       text DEFAULT 'monthly',
  subscription_expires_at timestamptz,
  telegram_chat_id        text,
  referred_by             text,
  referral_bonus_given    boolean DEFAULT false,
  onboarding_step         integer DEFAULT 0,
  onboarding_sent_at      timestamptz,
  is_manager              boolean DEFAULT false,
  manager_since           timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- NOTE: dots ARE allowed. Brand profiles (egov.kz, kolesa.kz, …) depend on it.
-- First character must be alphanumeric; total length 3–32.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_check
  CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_theme_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('dark', 'light', 'gradient', 'blogger', 'business', 'seller'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (subscription_plan IN ('monthly', 'annual'));

-- ─── links ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  url           text NOT NULL,
  icon_type     text NOT NULL DEFAULT 'link',
  sort_order    integer NOT NULL DEFAULT 0,
  click_count   integer NOT NULL DEFAULT 0,
  is_featured   boolean DEFAULT false,
  visible_from  timestamptz,
  visible_until timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.links DROP CONSTRAINT IF EXISTS links_icon_type_check;
ALTER TABLE public.links ADD CONSTRAINT links_icon_type_check CHECK (
  icon_type IN (
    'whatsapp','telegram','instagram','tiktok','youtube',
    'kaspi','kaspi_pay','kaspi_shop','kaspi_qr','ediny_qr','smart_qr',
    'twogis','website','phone','email','kolesa','krisha',
    'vk','facebook','twitter','link','text_block','product','lead_form',
    'android','ios','menu','paypal',
    'instagram_dm','instagram_reel','follow_gate','milestone','instagram_keyword',
    'countdown','pricelist','image','video','faq',
    'twitch','crypto_wallet','binance_pay'
  )
);

-- ─── aliases (emoji / symbol short links, Premium) ───────────
CREATE TABLE IF NOT EXISTS public.aliases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alias_raw        text NOT NULL,
  alias_normalized text NOT NULL,
  alias_hex        text NOT NULL UNIQUE,
  target_url       text NOT NULL,
  category         text NOT NULL DEFAULT 'custom',
  is_premium       boolean NOT NULL DEFAULT true,
  is_paid          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 510 hex chars = 255 bytes. Graphemes alone are not a safe bound: one
-- grapheme can be 25 bytes (ZWJ family emoji), so the byte ceiling backs up
-- the 32-grapheme limit enforced in src/lib/unicode-utils.ts.
--
-- Length is checked with char_length, NOT a {2,510} regex bound: Postgres's
-- POSIX engine caps a repetition count at 255, and an over-limit bound is
-- accepted at constraint-creation time (nothing evaluates it on an empty
-- table) then throws "invalid repetition count(s)" on the first INSERT.
ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_alias_hex_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_alias_hex_check
  CHECK (alias_hex ~ '^[0-9a-f]+$' AND char_length(alias_hex) BETWEEN 2 AND 510);

ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_alias_raw_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_alias_raw_check
  CHECK (char_length(alias_raw) BETWEEN 1 AND 255);

ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_alias_normalized_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_alias_normalized_check
  CHECK (char_length(alias_normalized) BETWEEN 1 AND 255);

ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_target_url_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_target_url_check
  CHECK (char_length(target_url) BETWEEN 1 AND 2048);

-- Tier by scarcity, derived server-side in classifyAlias() and never taken
-- from the client.
ALTER TABLE public.aliases DROP CONSTRAINT IF EXISTS aliases_category_check;
ALTER TABLE public.aliases ADD CONSTRAINT aliases_category_check
  CHECK (category IN ('single_emoji', 'double_emoji', 'custom'));

-- ─── click_events (time-series analytics) ───────────────────
CREATE TABLE IF NOT EXISTS public.click_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id    uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  source     text,
  created_at timestamptz DEFAULT now()
);

-- ─── lead_submissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  link_id    uuid REFERENCES public.links(id) ON DELETE SET NULL,
  name       text NOT NULL,
  phone      text NOT NULL,
  email      text,
  message    text,
  created_at timestamptz DEFAULT now()
);

-- ─── payments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username          text NOT NULL,
  plan              text NOT NULL,
  amount            integer NOT NULL,
  days              integer NOT NULL,
  method            text NOT NULL DEFAULT 'manual',
  status            text NOT NULL DEFAULT 'confirmed',
  provider          text DEFAULT 'manual',
  notes             text,
  admin_tg_id       text,
  receipt_url       text,
  transaction_id    text,
  auto_validated    boolean DEFAULT false,
  auto_confirmed_at timestamptz,
  groq_confidence   text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_plan_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_plan_check
  CHECK (plan IN ('monthly', 'annual'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- ─── sales_commissions (manager referral programme) ─────────
CREATE TABLE IF NOT EXISTS public.sales_commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_username  text NOT NULL,
  client_username   text NOT NULL,
  payment_id        uuid,
  plan              text,
  sale_amount       integer NOT NULL,
  commission_amount integer NOT NULL,
  commission_pct    integer NOT NULL DEFAULT 20,
  status            text NOT NULL DEFAULT 'pending',
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT sc_manager_client_unique UNIQUE (manager_username, client_username)
);

ALTER TABLE public.sales_commissions DROP CONSTRAINT IF EXISTS sales_commissions_status_check;
ALTER TABLE public.sales_commissions ADD CONSTRAINT sales_commissions_status_check
  CHECK (status IN ('pending', 'paid', 'cancelled'));

-- ─── gift_codes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username   text UNIQUE NOT NULL,
  days       integer NOT NULL DEFAULT 365,
  note       text,
  created_at timestamptz DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS links_profile_id_sort_idx        ON public.links (profile_id, sort_order);

CREATE INDEX IF NOT EXISTS aliases_alias_normalized_idx     ON public.aliases (alias_normalized);
-- alias_hex needs no explicit index: its UNIQUE constraint provides one, and
-- that is the redirect lookup path. (user_id, category) also serves lookups
-- by user_id alone, so no separate user_id index exists.
CREATE INDEX IF NOT EXISTS aliases_user_category_idx        ON public.aliases (user_id, category);

CREATE INDEX IF NOT EXISTS click_events_link_id_idx         ON public.click_events (link_id);
CREATE INDEX IF NOT EXISTS click_events_created_at_idx      ON public.click_events (created_at DESC);
CREATE INDEX IF NOT EXISTS click_events_link_created_idx    ON public.click_events (link_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lead_submissions_profile_id_idx  ON public.lead_submissions (profile_id);
CREATE INDEX IF NOT EXISTS lead_submissions_link_id_idx     ON public.lead_submissions (link_id);
CREATE INDEX IF NOT EXISTS lead_submissions_created_at_idx  ON public.lead_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS profiles_phone_idx               ON public.profiles (phone);
CREATE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx    ON public.profiles (telegram_chat_id);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx          ON public.profiles (updated_at DESC);
CREATE INDEX IF NOT EXISTS profiles_view_count_idx          ON public.profiles (view_count DESC);
CREATE INDEX IF NOT EXISTS profiles_is_premium_idx          ON public.profiles (is_premium, subscription_expires_at) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS profiles_is_manager_idx          ON public.profiles (is_manager) WHERE is_manager = true;
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx         ON public.profiles (referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_onboarding_idx          ON public.profiles (onboarding_step, onboarding_sent_at) WHERE onboarding_step > 0 AND onboarding_step < 4;

CREATE INDEX IF NOT EXISTS payments_username_idx            ON public.payments (username);
CREATE INDEX IF NOT EXISTS payments_created_at_idx          ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_pending_idx             ON public.payments (username, status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS payments_status_provider_idx     ON public.payments (status, provider) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS payments_pending_autovalidated_idx ON public.payments (created_at) WHERE status = 'pending' AND auto_validated = true AND receipt_url IS NOT NULL;
-- Idempotency for AI receipt auto-approval: one confirmation per transaction.
CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_unique ON public.payments (transaction_id) WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sc_manager_idx                   ON public.sales_commissions (manager_username);
CREATE INDEX IF NOT EXISTS sc_status_idx                    ON public.sales_commissions (status);
CREATE INDEX IF NOT EXISTS sc_created_idx                   ON public.sales_commissions (created_at DESC);
CREATE INDEX IF NOT EXISTS sales_commissions_manager_idx    ON public.sales_commissions (manager_username, status);

-- ─── Row Level Security ─────────────────────────────────────
-- Every table has RLS on. payments and gift_codes intentionally carry NO
-- policies: that denies all client access outright while the service-role
-- client (used by every API route) bypasses RLS entirely. Supabase's advisor
-- reports this as INFO "RLS enabled, no policy" — it is deliberate, not a gap.
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner  ON public.profiles;
DROP POLICY IF EXISTS profiles_update_owner  ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_owner  ON public.profiles;

CREATE POLICY profiles_select_public ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_owner  ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_owner  ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_delete_owner  ON public.profiles FOR DELETE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS links_select_public ON public.links;
DROP POLICY IF EXISTS links_insert_owner  ON public.links;
DROP POLICY IF EXISTS links_update_owner  ON public.links;
DROP POLICY IF EXISTS links_delete_owner  ON public.links;

CREATE POLICY links_select_public ON public.links FOR SELECT USING (true);

-- Enforces ownership, the 3-link free tier, and Premium-only link types at
-- the database, so a client writing directly cannot bypass the API's checks.
-- This list and the one in links_update_owner below are the only copies of
-- PREMIUM_ONLY_TYPES outside src/lib/link-types.ts, because SQL cannot import
-- it. Every other copy in the codebase was consolidated into that module; when
-- an eighth paid type is added, these two policies are what will not follow on
-- their own.
-- Premium is read the same way the API reads it — the is_premium column stays
-- true until the nightly cron clears it, so expiry has to be checked here too.
CREATE POLICY links_insert_owner ON public.links FOR INSERT WITH CHECK (
  (SELECT auth.uid()) = (SELECT id FROM public.profiles WHERE id = profile_id)
  AND (
    (SELECT is_premium AND (subscription_expires_at IS NULL OR subscription_expires_at > now())
       FROM public.profiles WHERE id = profile_id)
    OR (SELECT count(*) FROM public.links l WHERE l.profile_id = (SELECT auth.uid())) < 3
  )
  AND (
    icon_type <> ALL (ARRAY['product','smart_qr','countdown','pricelist','image','video','faq','crypto_wallet','binance_pay'])
    OR (SELECT is_premium AND (subscription_expires_at IS NULL OR subscription_expires_at > now())
          FROM public.profiles WHERE id = profile_id)
  )
);

-- The type check is repeated here: without it a free account could insert a
-- free link and then switch its icon_type to a Premium one.
CREATE POLICY links_update_owner ON public.links FOR UPDATE
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK (
    (SELECT auth.uid()) = profile_id
    AND (
      icon_type <> ALL (ARRAY['product','smart_qr','countdown','pricelist','image','video','faq','crypto_wallet','binance_pay'])
      OR (SELECT is_premium AND (subscription_expires_at IS NULL OR subscription_expires_at > now())
            FROM public.profiles WHERE id = profile_id)
    )
  );
CREATE POLICY links_delete_owner ON public.links FOR DELETE
  USING ((SELECT auth.uid()) = (SELECT id FROM public.profiles WHERE id = links.profile_id));

DROP POLICY IF EXISTS aliases_select_public ON public.aliases;
DROP POLICY IF EXISTS aliases_insert_owner  ON public.aliases;
DROP POLICY IF EXISTS aliases_update_owner  ON public.aliases;
DROP POLICY IF EXISTS aliases_delete_owner  ON public.aliases;

-- Public SELECT is required: the redirect lookups resolve any alias_hex.
CREATE POLICY aliases_select_public ON public.aliases FOR SELECT USING (true);
CREATE POLICY aliases_insert_owner  ON public.aliases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY aliases_update_owner  ON public.aliases FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY aliases_delete_owner  ON public.aliases FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can read own click events" ON public.click_events;
CREATE POLICY "Owner can read own click events" ON public.click_events FOR SELECT
  USING (link_id IN (SELECT id FROM public.links WHERE profile_id = (SELECT auth.uid())));

-- No INSERT policy: leads are written only by /api/leads via the service
-- role, which applies validation and rate limiting. An earlier
-- WITH CHECK (true) policy let anyone spam the table directly over REST and
-- was removed in V34.
DROP POLICY IF EXISTS "Owner can read own leads" ON public.lead_submissions;
CREATE POLICY "Owner can read own leads" ON public.lead_submissions FOR SELECT
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS manager_own_commissions_select ON public.sales_commissions;
CREATE POLICY manager_own_commissions_select ON public.sales_commissions FOR SELECT
  USING (manager_username = (SELECT username FROM public.profiles WHERE id = (SELECT auth.uid())));

-- ─── Table grants ───────────────────────────────────────────
-- anon deliberately has no SELECT on profiles or links: public profile pages
-- are rendered server-side through the service-role client, so the raw REST
-- API never needs to expose them. Removing the grant means a leaked anon key
-- cannot enumerate users or their links.
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.links    FROM anon;

-- Column privileges, because RLS cannot express them. profiles_update_owner
-- permits a user to write their own row, and "their own row" included
-- is_premium — a single PATCH through the public anon key granted Premium
-- until 2099. is_manager, is_promo, subscription_plan, view_count and the
-- referral columns were writable the same way. Users keep exactly the columns
-- the dashboard and signup write; billing, role and referral state is
-- service-role only.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated, PUBLIC;

GRANT UPDATE (
  username, business_name, bio, theme, phone, address,
  avatar_url, working_hours, updated_at
) ON public.profiles TO authenticated;

-- referred_by is insertable (signup carries the referral code) but not
-- updatable, so a bonus cannot be claimed after the fact. is_premium is
-- insertable only because older client bundles send it; the trigger below
-- discards the value.
GRANT INSERT (
  id, username, business_name, bio, theme, phone, address,
  avatar_url, working_hours, referred_by, is_premium
) ON public.profiles TO authenticated;

-- Aliases are written only by /api/aliases with the service role; the client
-- just SELECTs to check availability. Direct writes let a free account reserve
-- an alias with is_paid = true and skipped the word-required and reserved-word
-- rules, which exist only in the API.
REVOKE INSERT, UPDATE, DELETE ON public.aliases FROM anon, authenticated, PUBLIC;

-- These six had write grants and no write policy, so RLS alone refused them.
-- Unreachable privilege, and a trap: any permissive write policy added later
-- would expose them the same instant. Every write goes through a route handler
-- using the service role. profiles/links/aliases keep DELETE — users may
-- delete their own account, links and alias, covered by owner policies.
REVOKE INSERT, UPDATE, DELETE ON public.click_events       FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.gift_codes         FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.lead_submissions   FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.payments           FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.sales_commissions  FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.support_tickets    FROM anon, authenticated, PUBLIC;

-- SECURITY INVOKER is required, not incidental: under SECURITY DEFINER
-- current_user is the function owner, so the role test never matches and the
-- trigger silently does nothing.
CREATE OR REPLACE FUNCTION public.force_free_profile_on_client_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.is_premium := false;
    NEW.subscription_expires_at := NULL;
    NEW.subscription_plan := NULL;
    NEW.is_manager := false;
    NEW.manager_since := NULL;
    NEW.is_promo := false;
    NEW.view_count := 0;
    NEW.referral_bonus_given := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_force_free_on_client_insert ON public.profiles;
CREATE TRIGGER profiles_force_free_on_client_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.force_free_profile_on_client_insert();

-- ─── Functions ──────────────────────────────────────────────
-- SECURITY DEFINER with a pinned search_path (an unpinned one is hijackable).
-- EXECUTE is revoked from PUBLIC below, not just from anon/authenticated:
-- Postgres grants EXECUTE to PUBLIC by default and both roles inherit it
-- through PUBLIC, so revoking from the roles alone is a no-op — that mistake
-- left click inflation open until V34.
CREATE OR REPLACE FUNCTION public.increment_link_click(p_link_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.links SET click_count = click_count + 1 WHERE id = p_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_profile_view(p_username text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.profiles SET view_count = view_count + 1 WHERE username = p_username;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_link_click(uuid)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_view(text)  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_link_click(uuid)    TO service_role;
GRANT  EXECUTE ON FUNCTION public.increment_profile_view(text)  TO service_role;

-- ─── updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS aliases_set_updated_at ON public.aliases;
CREATE TRIGGER aliases_set_updated_at
  BEFORE UPDATE ON public.aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Also present in the live database ──────────────────────
-- public.rls_auto_enable() — a Supabase-managed event trigger that turns RLS
-- on for every newly created table in public. Not recreated here; it is
-- platform infrastructure, not application schema.
