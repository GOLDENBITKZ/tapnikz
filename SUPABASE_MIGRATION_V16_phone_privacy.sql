-- Migration V16: Hide phone from public anon API
-- Problem: Anyone with the public anon key can enumerate all users' phone numbers via:
--   GET https://ahsfumqlrpikkeriyngv.supabase.co/rest/v1/profiles?select=phone,username
--
-- Solution: Revoke column-level SELECT on phone from the anon role.
-- - anon (no JWT / public): phone column returns null / permission denied
-- - authenticated (with user JWT): CAN still read their OWN phone in dashboard (via RLS)
-- - service_role (admin/server): unaffected, full access
--
-- PostgREST respects PostgreSQL column-level privileges, so this is enforced at the DB level.

-- Step 1: Revoke phone from unauthenticated (anon) access
REVOKE SELECT (phone) ON public.profiles FROM anon;

-- Step 2: Verify the change (optional, run separately)
-- SELECT grantee, privilege_type, column_name
-- FROM information_schema.role_column_grants
-- WHERE table_name = 'profiles' AND column_name = 'phone'
-- ORDER BY grantee;
