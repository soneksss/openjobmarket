-- Quick fix for duplicate RLS policy error
-- Run this BEFORE running the migration if you get policy exists errors

-- Drop the old table completely (this also drops all its policies)
DROP TABLE IF EXISTS urgent_job_notifications CASCADE;

-- Drop the new dispatch alerts table if it exists (to start fresh)
DROP TABLE IF EXISTS urgent_job_dispatch_alerts CASCADE;

-- Now you can safely run the migration:
-- supabase/migrations/20260215000001_add_urgent_job_tracking.sql
