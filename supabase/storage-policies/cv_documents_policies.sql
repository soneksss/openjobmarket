-- Storage RLS Policies for cv-documents bucket
-- Date: 2026-01-06
--
-- INSTRUCTIONS:
-- Run this SQL in the Supabase SQL Editor (NOT in migrations)
-- Dashboard → SQL Editor → New Query → Paste this → Run
--
-- This creates RLS policies for the cv-documents storage bucket
-- These cannot be run in regular migrations due to permission restrictions

-- RLS Policy 1: Professionals can upload their own CVs
CREATE POLICY "Professionals upload own CVs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cv-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND auth.uid() IN (
    SELECT id FROM users WHERE user_type = 'professional'
  )
);

-- RLS Policy 2: Professionals can update their own CVs
CREATE POLICY "Professionals update own CVs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'cv-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy 3: Professionals can delete their own CVs
CREATE POLICY "Professionals delete own CVs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cv-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy 4: Controlled read access based on visibility settings
CREATE POLICY "Controlled CV read access"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cv-documents'
  AND (
    -- Owner can always read their own CV
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Employers/Companies can read based on visibility settings
    (
      auth.uid() IN (SELECT id FROM users WHERE user_type IN ('company', 'homeowner'))
      AND EXISTS (
        SELECT 1 FROM professional_profiles pp
        WHERE pp.user_id::text = (storage.foldername(name))[1]
        AND (
          -- Public CVs are visible to all
          pp.cv_visibility = 'public'
          OR
          -- Employers Only CVs visible to employers with privacy permissions
          (
            pp.cv_visibility = 'employers_only'
            AND EXISTS (
              SELECT 1 FROM employer_privacy_permissions epp
              WHERE epp.professional_id = pp.id
              AND epp.employer_id IN (
                SELECT id FROM company_profiles WHERE user_id = auth.uid()
                UNION
                SELECT id FROM homeowner_profiles WHERE user_id = auth.uid()
              )
              AND epp.can_see_personal_info = true
            )
          )
        )
      )
    )
  )
);

-- Add comment to document the admin restriction
COMMENT ON POLICY "Controlled CV read access" ON storage.objects IS
  'Employers can only read CVs if visibility allows: public, or employers_only with privacy permission. Admins are explicitly excluded for GDPR/LGPD compliance.';
