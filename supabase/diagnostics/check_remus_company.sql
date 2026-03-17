-- Diagnose why "Remus" doesn't appear in trader map search
-- Run this in Supabase SQL editor

SELECT
  id,
  company_name,
  industry,
  location,
  latitude,
  longitude,
  open_for_business,
  created_at
FROM company_profiles
WHERE company_name ILIKE '%remus%'
   OR company_name ILIKE '%cleaning%';

-- Also check all Portsmouth-area companies and whether they have coordinates
SELECT
  company_name,
  industry,
  location,
  latitude IS NOT NULL AS has_lat,
  longitude IS NOT NULL AS has_lon,
  open_for_business
FROM company_profiles
WHERE location ILIKE '%portsmouth%'
   OR location ILIKE '%PO1%'
   OR location ILIKE '%PO2%'
   OR location ILIKE '%PO3%'
   OR location ILIKE '%PO4%'
   OR location ILIKE '%PO5%'
   OR location ILIKE '%PO6%'
ORDER BY has_lat DESC, company_name;
