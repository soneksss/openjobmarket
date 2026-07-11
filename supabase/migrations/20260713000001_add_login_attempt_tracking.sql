-- Brute-force login protection: tracks failed password attempts per email
-- (server-side — client-side counters are trivially bypassed by reloading).
-- After 5 failures, the login form requires a CAPTCHA and enforces a
-- short cooldown before the next attempt is allowed.
CREATE TABLE IF NOT EXISTS public.login_attempts (
  email          TEXT PRIMARY KEY,
  failed_count   INT NOT NULL DEFAULT 0,
  locked_until   TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only ever written to by server-side API routes using the service role key —
-- no client-side access needed, so RLS stays default-deny.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
