-- First Completed Job -> Trustpilot Review Prompt
-- Tracks whether a homeowner has ever been shown the post-completion
-- "Are you happy with Open Job Market?" prompt, so it only ever appears once.
ALTER TABLE public.homeowner_profiles
  ADD COLUMN IF NOT EXISTS first_review_prompt_shown BOOLEAN DEFAULT false NOT NULL;
