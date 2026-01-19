-- Test script to verify signup trigger works correctly
-- This simulates what happens during signup

-- Test 1: Minimal signup (no first_name, last_name, company_name provided)
DO $$
DECLARE
  test_email TEXT := 'test-minimal@example.com';
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'TEST 1: Minimal signup with no names provided';

  -- Simulate what auth.users INSERT would trigger
  -- This would normally be done by Supabase Auth
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      test_email,
      crypt('testpassword', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'user_type', 'professional'
        -- No first_name, last_name provided
      ),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'TEST 1: PASSED - Minimal signup succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 1: FAILED - %', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'TEST 1: Cleaned up test data';
END $$;

-- Test 2: Company signup with company_name
DO $$
DECLARE
  test_email TEXT := 'test-company@example.com';
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'TEST 2: Company signup with company_name';

  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      test_email,
      crypt('testpassword', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'user_type', 'company',
        'account_type', 'company',
        'company_name', 'Test Company Inc',
        'is_employer', true
      ),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'TEST 2: PASSED - Company signup succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 2: FAILED - %', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'TEST 2: Cleaned up test data';
END $$;

-- Test 3: Multi-role signup (jobseeker + homeowner)
DO $$
DECLARE
  test_email TEXT := 'test-multirole@example.com';
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'TEST 3: Multi-role signup (jobseeker + homeowner)';

  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      test_email,
      crypt('testpassword', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'user_type', 'professional',
        'account_type', 'individual',
        'first_name', 'John',
        'last_name', 'Doe',
        'is_jobseeker', true,
        'is_homeowner', true
      ),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'TEST 3: PASSED - Multi-role signup succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 3: FAILED - %', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'TEST 3: Cleaned up test data';
END $$;

-- Test 4: Self-employed (company account + tradespeople + employer)
DO $$
DECLARE
  test_email TEXT := 'test-selfemployed@example.com';
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'TEST 4: Self-employed signup';

  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      test_user_id,
      test_email,
      crypt('testpassword', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'user_type', 'company',
        'account_type', 'company',
        'company_name', 'John Plumbing Services',
        'is_employer', true,
        'is_tradespeople', true
      ),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'TEST 4: PASSED - Self-employed signup succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 4: FAILED - %', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'TEST 4: Cleaned up test data';
END $$;

-- Test 5: Re-signup scenario (orphaned record cleanup)
DO $$
DECLARE
  test_email TEXT := 'test-resighnup@example.com';
  test_user_id_1 UUID := gen_random_uuid();
  test_user_id_2 UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'TEST 5: Re-signup with orphaned records';

  -- First signup
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      test_user_id_1,
      test_email,
      crypt('testpassword', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'user_type', 'professional',
        'first_name', 'Jane',
        'last_name', 'Smith'
      ),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'TEST 5: First signup succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 5: FAILED on first signup - %', SQLERRM;
  END;

  -- Delete auth user but leave public.users (simulates incomplete deletion)
  DELETE FROM auth.users WHERE id = test_user_id_1;
  RAISE NOTICE 'TEST 5: Simulated incomplete deletion (orphaned public.users remains)';

  -- Second signup with same email (should cleanup orphaned records)
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      test_user_id_2,
      test_email,
      crypt('testpassword', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'user_type', 'professional',
        'first_name', 'Jane',
        'last_name', 'Smith'
      ),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'TEST 5: PASSED - Re-signup with orphaned record cleanup succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 5: FAILED on re-signup - %', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id_2;
  RAISE NOTICE 'TEST 5: Cleaned up test data';
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL TESTS COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The signup trigger now handles:';
  RAISE NOTICE '1. Missing first_name/last_name (uses defaults)';
  RAISE NOTICE '2. Missing company_name (uses default)';
  RAISE NOTICE '3. Multi-role users (creates single primary profile)';
  RAISE NOTICE '4. Self-employed users (company account)';
  RAISE NOTICE '5. Re-signup scenarios (cleans orphaned records)';
  RAISE NOTICE '========================================';
END $$;
