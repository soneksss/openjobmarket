-- Normalize all legacy user types to 2-role system
UPDATE public.users
SET user_type = 'company'
WHERE user_type IN ('professional', 'contractor', 'employer');

UPDATE public.users
SET user_type = 'homeowner'
WHERE user_type = 'jobseeker';

-- Enforce allowed roles going forward
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS user_type_check;

ALTER TABLE public.users
  ADD CONSTRAINT user_type_check
  CHECK (user_type IN ('homeowner', 'company', 'admin'));
