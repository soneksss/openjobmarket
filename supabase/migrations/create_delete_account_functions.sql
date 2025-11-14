-- Function to delete a professional account and all related data
CREATE OR REPLACE FUNCTION delete_professional_account(
  professional_profile_id UUID,
  user_auth_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Delete in order to respect foreign key constraints

  -- Delete job applications
  DELETE FROM job_applications WHERE professional_id = professional_profile_id;

  -- Delete saved jobs
  DELETE FROM saved_jobs WHERE professional_id = professional_profile_id;

  -- Delete CV work experience
  DELETE FROM cv_work_experience WHERE cv_id IN (
    SELECT id FROM cvs WHERE professional_id = professional_profile_id
  );

  -- Delete CV education
  DELETE FROM cv_education WHERE cv_id IN (
    SELECT id FROM cvs WHERE professional_id = professional_profile_id
  );

  -- Delete CVs
  DELETE FROM cvs WHERE professional_id = professional_profile_id;

  -- Delete messages where user is sender or recipient
  DELETE FROM messages WHERE sender_id = user_auth_id OR recipient_id = user_auth_id;

  -- Delete conversations where user is participant
  DELETE FROM conversations WHERE participant_1 = user_auth_id OR participant_2 = user_auth_id;

  -- Delete professional profile
  DELETE FROM professional_profiles WHERE id = professional_profile_id;

  -- Delete user record from users table
  DELETE FROM users WHERE id = user_auth_id;

  -- Note: Auth user deletion is handled by the server-side admin API
  -- Cannot delete from auth.users from a database function

  result := json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;

-- Function to delete a company account and all related data
CREATE OR REPLACE FUNCTION delete_company_account(
  company_profile_id UUID,
  user_auth_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Delete job posts and related data
  DELETE FROM job_applications WHERE job_id IN (
    SELECT id FROM jobs WHERE company_id = company_profile_id
  );

  DELETE FROM saved_jobs WHERE job_id IN (
    SELECT id FROM jobs WHERE company_id = company_profile_id
  );

  DELETE FROM jobs WHERE company_id = company_profile_id;

  -- Delete messages where user is sender or recipient
  DELETE FROM messages WHERE sender_id = user_auth_id OR recipient_id = user_auth_id;

  -- Delete conversations where user is participant
  DELETE FROM conversations WHERE participant_1 = user_auth_id OR participant_2 = user_auth_id;

  -- Delete company profile
  DELETE FROM company_profiles WHERE id = company_profile_id;

  -- Delete user record from users table
  DELETE FROM users WHERE id = user_auth_id;

  -- Note: Auth user deletion is handled by the server-side admin API

  result := json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;

-- Function to delete a homeowner account and all related data
CREATE OR REPLACE FUNCTION delete_homeowner_account(
  homeowner_profile_id UUID,
  user_auth_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Delete messages where user is sender or recipient
  DELETE FROM messages WHERE sender_id = user_auth_id OR recipient_id = user_auth_id;

  -- Delete conversations where user is participant
  DELETE FROM conversations WHERE participant_1 = user_auth_id OR participant_2 = user_auth_id;

  -- Delete homeowner profile
  DELETE FROM homeowner_profiles WHERE id = homeowner_profile_id;

  -- Delete user record from users table
  DELETE FROM users WHERE id = user_auth_id;

  -- Note: Auth user deletion is handled by the server-side admin API

  result := json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;

-- Function to delete a contractor account and all related data
CREATE OR REPLACE FUNCTION delete_contractor_account(
  contractor_profile_id UUID,
  user_auth_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Delete messages where user is sender or recipient
  DELETE FROM messages WHERE sender_id = user_auth_id OR recipient_id = user_auth_id;

  -- Delete conversations where user is participant
  DELETE FROM conversations WHERE participant_1 = user_auth_id OR participant_2 = user_auth_id;

  -- Delete contractor profile
  DELETE FROM contractor_profiles WHERE id = contractor_profile_id;

  -- Delete user record from users table
  DELETE FROM users WHERE id = user_auth_id;

  -- Note: Auth user deletion is handled by the server-side admin API

  result := json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;
