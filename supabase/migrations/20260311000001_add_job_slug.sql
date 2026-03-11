-- Add SEO-friendly slug column to jobs table
-- Slugs are auto-generated on INSERT via trigger: {title}-{city}-{8-char-id}
-- Examples: plumber-portsmouth-948bac78, boiler-repair-southsea-f3a2b1c9

-- 1. Add column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug ON jobs (slug) WHERE slug IS NOT NULL;

-- 2. Helper: convert any string to a URL-safe slug fragment
CREATE OR REPLACE FUNCTION slugify(input text)
RETURNS text AS $$
BEGIN
  RETURN trim(both '-' from
    regexp_replace(
      regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Helper: extract the most relevant city from a UK address string
--    Iterates comma-separated parts and returns the first that:
--    - has no digits (not a street number or postcode)
--    - is longer than 2 chars
--    - is not a known country/region name
CREATE OR REPLACE FUNCTION extract_city_slug(loc text)
RETURNS text AS $$
DECLARE
  parts  text[];
  part   text;
  result text;
BEGIN
  IF loc IS NULL OR trim(loc) = '' THEN
    RETURN '';
  END IF;

  parts := string_to_array(loc, ',');

  FOREACH part IN ARRAY parts LOOP
    part := trim(part);
    -- Skip parts with digits (street numbers, postcodes)
    CONTINUE WHEN part ~ '\d';
    -- Skip very short parts
    CONTINUE WHEN length(part) < 3;
    -- Skip generic country/region names
    CONTINUE WHEN lower(part) IN (
      'england', 'uk', 'united kingdom', 'scotland', 'wales',
      'northern ireland', 'great britain'
    );
    result := slugify(substring(part from 1 for 30));
    IF result <> '' THEN
      RETURN result;
    END IF;
  END LOOP;

  RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Generate the full job slug
CREATE OR REPLACE FUNCTION generate_job_slug(job_id uuid, job_title text, job_location text)
RETURNS text AS $$
DECLARE
  title_part    text;
  city_part     text;
  id_short      text;
BEGIN
  -- Slugify title, cap at 45 chars, avoid splitting mid-word
  title_part := slugify(coalesce(job_title, 'job'));
  title_part := substring(title_part from 1 for 45);
  IF length(title_part) = 45 THEN
    -- Trim to last complete word
    title_part := regexp_replace(title_part, '-[^-]*$', '');
  END IF;

  city_part := extract_city_slug(coalesce(job_location, ''));

  -- First 8 hex chars of UUID (strip dashes)
  id_short := substring(replace(job_id::text, '-', '') from 1 for 8);

  IF city_part <> '' THEN
    RETURN title_part || '-' || city_part || '-' || id_short;
  ELSE
    RETURN title_part || '-' || id_short;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger function
CREATE OR REPLACE FUNCTION trg_set_job_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_job_slug(NEW.id, NEW.title, NEW.location);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach trigger (fires before INSERT, per row)
DROP TRIGGER IF EXISTS set_job_slug ON jobs;
CREATE TRIGGER set_job_slug
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_job_slug();
