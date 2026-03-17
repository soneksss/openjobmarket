-- ============================================================
-- Migration: SEO hardening — slugs, indexing, sitemap
-- ============================================================

-- 1. Backfill: replace NULL / empty / literal "null" slugs with id
UPDATE jobs
SET slug = id::text
WHERE slug IS NULL
   OR slug = ''
   OR slug = 'null';

-- 2. Unique index on slug (prevents duplicate URL collisions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug_unique
ON jobs (slug);

-- 3. Composite index for fast sitemap queries (is_active, status)
CREATE INDEX IF NOT EXISTS idx_jobs_active_posted
ON jobs (is_active, status);

-- 4. Auto-set slug on INSERT if missing
CREATE OR REPLACE FUNCTION public.set_job_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR NEW.slug = 'null' THEN
    NEW.slug := NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_job_slug ON jobs;

CREATE TRIGGER trg_set_job_slug
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_job_slug();

-- 5. Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at ON jobs;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
