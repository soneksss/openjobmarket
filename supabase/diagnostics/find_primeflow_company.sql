-- Find PRIMEFLOW HEATING & COOLING LTD in all profile tables

-- Check company_profiles
SELECT 'COMPANY_PROFILES' as table_name,
       id, user_id, company_name, industry, services,
       spoken_languages, location, latitude, longitude
FROM company_profiles
WHERE company_name ILIKE '%PRIMEFLOW%' OR company_name ILIKE '%HEATING%COOLING%';

-- Check contractor_profiles
SELECT 'CONTRACTOR_PROFILES' as table_name,
       id, user_id, company_name, services,
       languages, location, latitude, longitude
FROM contractor_profiles
WHERE company_name ILIKE '%PRIMEFLOW%'
   OR company_name ILIKE '%HEATING%COOLING%';

-- Check professional_profiles
SELECT 'PROFESSIONAL_PROFILES' as table_name,
       id, user_id, first_name, last_name, title, skills,
       spoken_languages, location, latitude, longitude
FROM professional_profiles
WHERE first_name ILIKE '%PRIMEFLOW%'
   OR last_name ILIKE '%PRIMEFLOW%'
   OR title ILIKE '%HEATING%'
   OR title ILIKE '%COOLING%';

-- Check what user type this company has
SELECT u.id, u.user_type, u.account_type, u.email,
       au.raw_user_meta_data->'services' as metadata_services,
       au.raw_user_meta_data->'spoken_languages' as metadata_languages
FROM users u
JOIN auth.users au ON au.id = u.id
WHERE u.email IN (
  SELECT u2.email FROM users u2
  JOIN company_profiles cp ON cp.user_id = u2.id
  WHERE cp.company_name ILIKE '%PRIMEFLOW%'

  UNION

  SELECT u2.email FROM users u2
  JOIN contractor_profiles ctp ON ctp.user_id = u2.id
  WHERE ctp.company_name ILIKE '%PRIMEFLOW%'
);
