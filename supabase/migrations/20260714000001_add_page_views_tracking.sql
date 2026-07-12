-- First-party pageview tracking — powers the admin "Website Visitors" chart.
-- No PII: visitor_id is a random ID generated client-side and stored in
-- localStorage, not tied to any account. Written only via the service-role
-- key from the tracking API route, so RLS stays default-deny.
CREATE TABLE IF NOT EXISTS public.page_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id  TEXT NOT NULL,
  path        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON public.page_views (visitor_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
