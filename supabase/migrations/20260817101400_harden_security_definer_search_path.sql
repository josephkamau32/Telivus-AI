-- Harden SECURITY DEFINER functions by setting search_path to '' (empty string).
--
-- Two functions currently use SET search_path = public:
--   1. handle_new_user()     — defined in 20251001144412_...sql
--   2. handle_updated_at()   — defined in 20251006112249_...sql
--
-- The Supabase security best practice is SET search_path = '' for SECURITY
-- DEFINER functions. Using 'public' is less dangerous than omitting the
-- clause entirely, but an empty search_path prevents any future search_path
-- injection if a malicious schema is placed earlier in the default path.
--
-- This matches the pattern already correctly used by:
--   - update_updated_at_column()  (fixed in 20251001144448_...sql)
--   - cleanup_expired_cache()     (created in 20251004080545_...sql)
--
-- Pre-change audit of function bodies:
--   handle_new_user():
--     - INSERT INTO public.profiles — already schema-qualified ✓
--     - COALESCE, split_part, now() — built-in functions, no schema needed ✓
--   handle_updated_at():
--     - NEW.updated_at, now() — no table references at all ✓


-- 1. Harden handle_new_user()
--    Original: SET search_path = public
--    All table references already schema-qualified (public.profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now(),
    now()
  );
  RETURN new;
END;
$$;


-- 2. Harden handle_updated_at()
--    Original: SET search_path = public
--    No table references in function body (only NEW record fields + now())
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
