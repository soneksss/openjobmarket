-- Compact version of claim_security_audit.sql, small enough to paste into a chat.
-- READ-ONLY: one SELECT, changes nothing. Returns ONE cell. No emails, phones or tokens.

SELECT string_agg(section || ' | ' || item || ' | ' || COALESCE(detail, ''), E'\n' ORDER BY split_part(section, ' ', 1)::int, item) AS audit
FROM (

  SELECT '1 rls' AS section, c.relname::text AS item,
         'enabled=' || c.relrowsecurity || ' forced=' || c.relforcerowsecurity AS detail
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('seeded_trades', 'homeowner_profiles')

  UNION ALL
  SELECT '2 policy', tablename || ' / ' || policyname,
         'roles=' || roles::text || ' cmd=' || cmd ||
         ' USING(' || COALESCE(qual, '') || ') CHECK(' || COALESCE(with_check, '') || ')'
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('seeded_trades', 'homeowner_profiles')

  UNION ALL
  SELECT '3 table grant', table_name || ' / ' || grantee,
         string_agg(privilege_type, ',' ORDER BY privilege_type)
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
    AND table_name IN ('seeded_trades', 'seeded_trades_email_export')
  GROUP BY table_name, grantee

  -- Full source for the claim function only; the rest report settings and the key fact.
  UNION ALL
  SELECT '5 function', p.oid::regprocedure::text,
         'definer=' || p.prosecdef || ' config=' || COALESCE(p.proconfig::text, '') ||
         ' acl=' || COALESCE(p.proacl::text, '(default: PUBLIC can execute)') ||
         ' returns_token=' || (p.prosrc ILIKE '%st.claim_token%') ||
         CASE WHEN p.proname = 'claim_seeded_business'
              THEN E'\n' || regexp_replace(p.prosrc, '\s+', ' ', 'g') ELSE '' END
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND (p.prosrc ILIKE '%seeded_trades%' OR p.prosrc ILIKE '%claim_token%')

  UNION ALL
  SELECT '6 view', c.relname::text,
         'options=' || COALESCE(c.reloptions::text, '(none: runs as owner)') || ' acl=' || COALESCE(c.relacl::text, '')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
    AND (pg_get_viewdef(c.oid) ILIKE '%seeded_trades%' OR pg_get_viewdef(c.oid) ILIKE '%claim_token%')

  UNION ALL
  SELECT '7 trigger', c.relname || ' / ' || t.tgname, regexp_replace(pg_get_triggerdef(t.oid), '\s+', ' ', 'g')
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal AND n.nspname = 'public' AND c.relname = 'seeded_trades'

  UNION ALL
  SELECT '8 listings', 'totals',
         'total=' || count(*) ||
         ' unclaimed=' || count(*) FILTER (WHERE NOT claimed) ||
         ' claimed=' || count(*) FILTER (WHERE claimed) ||
         ' unclaimed_null_email=' || count(*) FILTER (WHERE NOT claimed AND email IS NULL) ||
         ' unclaimed_blank_email=' || count(*) FILTER (WHERE NOT claimed AND email IS NOT NULL AND btrim(email) = '')
  FROM public.seeded_trades

  -- Has anyone already taken a listing? Summarised rather than one row per listing.
  UNION ALL
  SELECT '9 past claims',
         'claimer_recorded=' || (s.claimed_by_user_id IS NOT NULL) ||
         ' listing_email_null=' || (s.email IS NULL) ||
         ' email_matches=' || COALESCE((lower(btrim(s.email)) = lower(btrim(u.email)))::text, 'n/a') ||
         ' otp_or_oauth_verified=' || COALESCE((u.confirmation_sent_at IS NOT NULL OR COALESCE(u.raw_app_meta_data->>'provider', 'email') <> 'email')::text, 'n/a'),
         'listings=' || count(*)
  FROM public.seeded_trades s LEFT JOIN auth.users u ON u.id = s.claimed_by_user_id
  WHERE s.claimed
  GROUP BY 2

  -- Does confirmation_sent_at separate verified signups from pre-confirmed admin-created accounts?
  UNION ALL
  SELECT '10 account types',
         'provider=' || COALESCE(raw_app_meta_data->>'provider', '?') || ' confirmation_sent=' || (confirmation_sent_at IS NOT NULL),
         'users=' || count(*) || ' email_confirmed=' || count(email_confirmed_at)
  FROM auth.users
  GROUP BY 2

  -- Accounts already holding an unclaimed listing's email, by how they were created.
  UNION ALL
  SELECT '11 accounts on listing emails',
         'provider=' || COALESCE(u.raw_app_meta_data->>'provider', '?') || ' confirmation_sent=' || (u.confirmation_sent_at IS NOT NULL),
         'accounts=' || count(*)
  FROM auth.users u JOIN public.seeded_trades s ON lower(btrim(s.email)) = lower(btrim(u.email)) AND NOT s.claimed
  GROUP BY 2

) audit;
