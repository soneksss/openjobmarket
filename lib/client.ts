import { createBrowserClient } from "@supabase/ssr"

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (_client) return _client

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )

  // Clear corrupt sessions — stale refresh token triggers this event
  _client.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESH_FAILED') {
      _client!.auth.signOut().catch(() => {})
    }
  })

  return _client
}
