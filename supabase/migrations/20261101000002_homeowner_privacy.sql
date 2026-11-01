-- Homeowner privacy. Applied manually in the Supabase SQL Editor on 2026-11-01.
--
-- Names, photos and ratings stay readable because job pages show them. Private columns can
-- only be read by the homeowner, through get_my_homeowner_profile(), or by the server.
--
-- Rollback, if something breaks:
--   GRANT SELECT ON public.homeowner_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_homeowner_profile()
RETURNS SETOF public.homeowner_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.homeowner_profiles WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_homeowner_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_homeowner_profile() TO authenticated, service_role;

BEGIN;

REVOKE ALL ON public.homeowner_profiles FROM anon;
REVOKE SELECT, TRUNCATE, REFERENCES, TRIGGER ON public.homeowner_profiles FROM authenticated;

-- Everything except: phone, location, full_address, address_line1, city,
-- latitude, longitude, latitude_approx, longitude_approx, cv_url.
GRANT SELECT (id, user_id, first_name, last_name, profile_photo_url, bio, on_market, title, skills,
              experience_level, salary_min, salary_max, portfolio_url, linkedin_url, available_for_work,
              created_at, updated_at, average_rating, reviews_count, total_rating_sum,
              onboarding_completed, first_review_prompt_shown)
  ON public.homeowner_profiles TO anon, authenticated;

COMMIT;
