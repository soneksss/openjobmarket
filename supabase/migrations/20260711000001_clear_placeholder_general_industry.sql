-- company_profiles rows could be seeded with the literal placeholder 'General'
-- as industry (see app/dashboard/company/page.tsx rare-path profile creation).
-- 'General' isn't a real trade — it broke the "Jobs" nav search (matched no
-- real jobs) and showed a fake industry label. Null it out so these profiles
-- are treated as having no industry set, same as a fresh incomplete profile.
UPDATE public.company_profiles
SET industry = NULL
WHERE industry = 'General';
