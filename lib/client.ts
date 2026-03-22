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
      global: {
        fetch: async (url, options) => {
          try {
            const res = await fetch(url, options)
            // Silently clear stale tokens when the refresh endpoint returns 400
            if (
              res.status === 400 &&
              typeof url === 'string' &&
              url.includes('grant_type=refresh_token')
            ) {
              if (typeof window !== 'undefined') {
                Object.keys(localStorage).forEach((key) => {
                  if (key.startsWith('sb-') && key.includes('-auth-token')) {
                    localStorage.removeItem(key)
                  }
                })
              }
            }
            return res
          } catch (err) {
            throw err
          }
        },
      },
    }
  )

  return _client
}
