-- Migration: Create Supabase Storage bucket for CV documents
-- Date: 2026-01-06
-- Description: Storage bucket for PDF/DOC/DOCX uploads
-- NOTE: RLS policies for storage.objects must be created separately via Dashboard or SQL Editor

-- Create CV documents bucket (PRIVATE, not public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-documents',
  'cv-documents',
  false, -- NOT public - controlled access only
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword', -- .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' -- .docx
  ]
)
ON CONFLICT (id) DO NOTHING;

-- NOTE: After running this migration, you must create the following RLS policies
-- manually in the Supabase Dashboard (Storage → cv-documents → Policies)
-- or run the SQL file: supabase/storage-policies/cv_documents_policies.sql
-- in the Supabase SQL Editor.
--
-- This is required because storage.objects is owned by supabase_storage_admin
-- and regular migrations don't have permission to create policies on it.
