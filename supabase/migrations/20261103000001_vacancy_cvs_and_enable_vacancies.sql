-- ============================================================
-- Vacancies launch
--   1. Private storage bucket for CVs attached to vacancy applications.
--      No storage policies are added: only the server (service role) reads
--      and writes it, and hands out short-lived signed links to the
--      applicant and the employer of that vacancy.
--   2. Turn on the vacancy_system feature flag (created disabled in
--      20260303000004) so the Vacancies tab, posting and applying work.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vacancy-cvs',
  'vacancy-cvs',
  false,
  5242880, -- 5 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = false,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE public.feature_flags
   SET enabled = true
 WHERE key = 'vacancy_system';

-- Check: both rows should come back, bucket private and flag on.
SELECT 'vacancy-cvs bucket' AS item, (NOT public)::text AS ok FROM storage.buckets WHERE id = 'vacancy-cvs'
UNION ALL
SELECT 'vacancy_system flag', enabled::text FROM public.feature_flags WHERE key = 'vacancy_system';
