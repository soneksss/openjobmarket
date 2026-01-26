-- Quick Test for extend_job Function
-- This is a single query you can run in Supabase SQL Editor
-- It will automatically find and test with an expired/expiring job

DO $$
DECLARE
  test_job_id UUID;
  test_job_title TEXT;
  old_expires_at TIMESTAMPTZ;
  old_timeline TEXT;
  old_price NUMERIC;
  new_expires_at TIMESTAMPTZ;
  new_timeline TEXT;
  new_price NUMERIC;
  result BOOLEAN;
BEGIN
  -- Find an expired or expiring job
  SELECT id, title, expires_at, recruitment_timeline, price
  INTO test_job_id, test_job_title, old_expires_at, old_timeline, old_price
  FROM jobs
  WHERE expires_at IS NOT NULL
    AND (expires_at < NOW() OR expires_at < NOW() + INTERVAL '7 days')
  ORDER BY expires_at ASC
  LIMIT 1;

  IF test_job_id IS NULL THEN
    RAISE NOTICE '❌ No expired or expiring jobs found to test with.';
    RAISE NOTICE 'Create a job or wait for one to expire before testing.';
  ELSE
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TESTING extend_job FUNCTION';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Job Details:';
    RAISE NOTICE '   ID: %', test_job_id;
    RAISE NOTICE '   Title: %', test_job_title;
    RAISE NOTICE '';
    RAISE NOTICE '📅 BEFORE Extension:';
    RAISE NOTICE '   Expires At: %', old_expires_at;
    RAISE NOTICE '   Timeline: %', old_timeline;
    RAISE NOTICE '   Price: £%', old_price;
    RAISE NOTICE '   Days Until Expiration: %', ROUND(EXTRACT(EPOCH FROM (old_expires_at - NOW())) / 86400, 1);
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Extending job by 7 days...';

    -- Test the function
    SELECT extend_job(test_job_id, '7_days', 10) INTO result;

    IF NOT result THEN
      RAISE NOTICE '❌ FAILED: extend_job returned FALSE';
      RAISE NOTICE 'This usually means:';
      RAISE NOTICE '  - RLS policy denied the update';
      RAISE NOTICE '  - Job ID does not exist';
      RAISE NOTICE '  - Database permissions issue';
    ELSE
      -- Get the updated values
      SELECT expires_at, recruitment_timeline, price
      INTO new_expires_at, new_timeline, new_price
      FROM jobs
      WHERE id = test_job_id;

      RAISE NOTICE '✅ SUCCESS: Job extended!';
      RAISE NOTICE '';
      RAISE NOTICE '📅 AFTER Extension:';
      RAISE NOTICE '   Expires At: %', new_expires_at;
      RAISE NOTICE '   Timeline: %', new_timeline;
      RAISE NOTICE '   Price: £%', new_price;
      RAISE NOTICE '   Days Until Expiration: %', ROUND(EXTRACT(EPOCH FROM (new_expires_at - NOW())) / 86400, 1);
      RAISE NOTICE '';
      RAISE NOTICE '📊 Changes:';
      RAISE NOTICE '   Days Added: %', ROUND(EXTRACT(EPOCH FROM (new_expires_at - old_expires_at)) / 86400, 1);
      RAISE NOTICE '   Timeline Changed: % → %', old_timeline, new_timeline;
      RAISE NOTICE '   Price Changed: £% → £%', old_price, new_price;
      RAISE NOTICE '';
      RAISE NOTICE '==========================================';
      RAISE NOTICE '✅ TEST COMPLETED SUCCESSFULLY';
      RAISE NOTICE '==========================================';
    END IF;
  END IF;
END $$;
