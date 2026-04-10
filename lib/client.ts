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

  return _client
}
