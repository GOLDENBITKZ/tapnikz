-- ============================================================
-- tapni.kz Migration V3  — run in Supabase SQL Editor
-- ============================================================

-- 1. Avatar URL on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Plan type for subscriptions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text
  CHECK (subscription_plan IN ('monthly', 'annual'))
  DEFAULT 'monthly';

-- 3. Create avatars storage bucket (public, 2 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies
-- Drop if exists (safe re-run)
DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatar_select" ON storage.objects;

-- Users can only upload into their own subfolder: avatars/{user_id}/...
CREATE POLICY "avatar_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatar_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatar_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public can read all avatars (they are public URLs)
CREATE POLICY "avatar_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');
