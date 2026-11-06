-- Seeded-listing claim security audit. READ-ONLY: this is one SELECT and changes nothing.
-- Run in the Supabase SQL Editor. It is a single statement because the editor only
-- shows the last result. Output has no emails, phones or tokens: counts and definitions only.

SELECT section, item, detail FROM (

  SELECT '1 rls' AS section, c.relname::text AS item,
         'enabled=' || c.relrowsecurity || ' forced=' || c.relforcerowsecurity AS detail
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('seeded_trades', 'company_profiles', 'users')

  UNION ALL
  SELECT '2 policy', tablename || ' / ' || policyname,
         permissive || ' roles=' || roles::text || ' cmd=' || cmd ||
         ' USING(' || COALESCE(qual, '') || ') CHECK(' || COALESCE(with_check, '') || ')'
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('seeded_trades', 'company_profiles', 'users')

  UNION ALL
  SELECT '3 table grant', table_name || ' / ' || grantee,
         string_agg(privilege_type, ',' ORDER BY privilege_type)
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
    AND table_name IN ('seeded_trades', 'seeded_trades_email_export')
  GROUP BY table_name, grantee

  UNION ALL
  SELECT '4 sensitive column grant', column_name || ' / ' || grantee,
         string_agg(privilege_type, ',' ORDER BY privilege_type)
  FROM information_schema.column_privileges
  WHERE table_schema = 'public' AND table_name = 'seeded_trades'
    AND grantee IN ('anon', 'authenticated', 'PUBLIC')
    AND column_name IN ('email', 'phone', 'claim_token', 'claim_url', 'claimed', 'claimed_by_user_id')
  GROUP BY column_name, grantee

  UNION ALL
  SELECT '5 function', p.oid::regprocedure::text,
         'security_definer=' || p.prosecdef || ' config=' || COALESCE(p.proconfig::text, '') ||
         ' acl=' || COALESCE(p.proacl::text, '(default: PUBLIC can execute)') || E'\n' || pg_get_functiondef(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND (p.prosrc ILIKE '%seeded_trades%' OR p.prosrc ILIKE '%claim_token%' OR p.proname = 'prevent_claim_field_edit')

  UNION ALL
  SELECT '6 view', c.relname::text,
         'options=' || COALESCE(c.reloptions::text, '(none: runs as owner)') ||
         ' acl=' || COALESCE(c.relacl::text, '') || E'\n' || pg_get_viewdef(c.oid)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
    AND (pg_get_viewdef(c.oid) ILIKE '%seeded_trades%' OR pg_get_viewdef(c.oid) ILIKE '%claim_token%')

  UNION ALL
  SELECT '7 trigger', c.relname || ' / ' || t.tgname, pg_get_triggerdef(t.oid)
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal AND n.nspname = 'public' AND c.relname IN ('seeded_trades', 'company_profiles')

  UNION ALL
  SELECT '8 listings', 'totals',
         'total=' || count(*) ||
         ' unclaimed=' || count(*) FILTER (WHERE NOT claimed) ||
         ' claimed=' || count(*) FILTER (WHERE claimed) ||
         ' unclaimed_null_email=' || count(*) FILTER (WHERE NOT claimed AND email IS NULL) ||
         ' unclaimed_blank_email=' || count(*) FILTER (WHERE NOT claimed AND email IS NOT NULL AND btrim(email) = '')
  FROM public.seeded_trades

  -- Has anyone already taken a listing? Each claimed listing, compared with its claimer.
  UNION ALL
  SELECT '9 past claim', s.id::text,
         'claimed_by_is_null=' || (s.claimed_by_user_id IS NULL) ||
         ' listing_email_null=' || (s.email IS NULL) ||
         ' email_matches=' || COALESCE((lower(btrim(s.email)) = lower(btrim(u.email)))::text, 'n/a') ||
         ' otp_or_oauth_verified=' || COALESCE((u.confirmation_sent_at IS NOT NULL OR COALESCE(u.raw_app_meta_data->>'provider', 'email') <> 'email')::text, 'n/a') ||
         ' company_profile_exists=' || EXISTS (SELECT 1 FROM public.company_profiles cp WHERE cp.user_id = s.claimed_by_user_id)
  FROM public.seeded_trades s LEFT JOIN auth.users u ON u.id = s.claimed_by_user_id
  WHERE s.claimed

  -- Does confirmation_sent_at separate verified signups from pre-confirmed admin-created accounts?
  UNION ALL
  SELECT '10 account types',
         'provider=' || COALESCE(raw_app_meta_data->>'provider', '?') || ' / confirmation_sent=' || (confirmation_sent_at IS NOT NULL),
         'users=' || count(*) || ' email_confirmed=' || count(email_confirmed_at)
  FROM auth.users
  GROUP BY raw_app_meta_data->>'provider', confirmation_sent_at IS NOT NULL

  -- Accounts already holding an unclaimed listing's email, by how they were created.
  UNION ALL
  SELECT '11 accounts on listing emails',
         'provider=' || COALESCE(u.raw_app_meta_data->>'provider', '?') || ' / confirmation_sent=' || (u.confirmation_sent_at IS NOT NULL),
         'accounts=' || count(*)
  FROM auth.users u JOIN public.seeded_trades s ON lower(btrim(s.email)) = lower(btrim(u.email)) AND NOT s.claimed
  GROUP BY u.raw_app_meta_data->>'provider', u.confirmation_sent_at IS NOT NULL

) audit
ORDER BY split_part(section, ' ', 1)::int, item;
