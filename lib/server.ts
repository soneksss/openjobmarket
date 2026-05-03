import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Applied ONLY to createAdminClient (lib/queries.ts data reads).
// Auth requests (createClient → auth.getUser, signIn, session refresh) must
// never be aborted — a timeout there causes login failures and 401 loops.
//
// ECONNRESET recovery strategy:
//   1. Retry once with a fresh connection — works in >99% of cases because
//      ECONNRESET means Supabase closed an idle TCP socket, not a real failure.
//   2. If retry also fails, return a synthetic empty-array response so the
//      RSC stream does NOT crash. lib/queries.ts cached functions already fall
//      back to [] / null via their own try/catch, so the UI renders empty state
//      instead of freezing.
//
// Note: `[]` is used (not `{ data: null, error: "..." }`) because PostgREST
// queries return JSON arrays — the Supabase client can parse [] as { data: [], error: null }.
const safeFetch: typeof fetch = async (url, options = {}) => {
  const run = (signal: AbortSignal) => fetch(url, { ...options, signal })

  try {
    return await run(AbortSignal.timeout(10000))
  } catch (err: any) {
    const isConnReset =
      err?.cause?.code === 'ECONNRESET' ||
      err?.code === 'ECONNRESET' ||
      String(err?.cause?.message ?? err?.message ?? '').includes('ECONNRESET')

    if (isConnReset) {
      console.warn('[Supabase] ECONNRESET — retrying with fresh connection')
      try {
        return await run(AbortSignal.timeout(10000))
      } catch (retryErr) {
        console.error('[Supabase] Retry also failed:', retryErr)
      }
    } else {
      console.error('[Supabase] Fetch error:', err)
    }

    // Synthetic empty-array — PostgREST-compatible fallback, prevents RSC crash
    return new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── Auth client — NO timeout ────────────────────────────────────────────────
// Used by every page / API route for auth.getUser() and small ownership checks.
// Must not abort: an aborted auth call cascades into login failures & 401 loops.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // handles session refresh.
          }
        },
      },
      // No global.fetch override — auth requests must complete without a deadline.
    }
  )
}

// ─── Data client — ECONNRESET-safe + 10 s timeout ───────────────────────────
// Used only via lib/queries.ts (createAdminClient) for bulk SELECT queries.
// safeFetch retries on ECONNRESET and returns [] on total failure so the
// RSC stream never crashes and the UI degrades gracefully.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: { fetch: safeFetch },
    }
  )
}

// Admin client for write operations (INSERT/UPDATE/DELETE).
// Does NOT use safeFetch — mutation errors must propagate, not be silently
// swallowed by the [] fallback that safeFetch uses for SELECT resilience.
export function createAdminWriteClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
    }
  )
}
