import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        try {
          const allCookies = cookieStore.getAll()
          const authCookies = allCookies.filter(c => c.name.startsWith('sb-'))
          console.log("[SERVER-CLIENT] Retrieved cookies:", allCookies.length, "Auth cookies:", authCookies.length)
          if (authCookies.length > 0) {
            console.log("[SERVER-CLIENT] Auth cookie names:", authCookies.map(c => c.name).join(', '))
          }
          return allCookies
        } catch (error) {
          console.error("[SERVER-CLIENT] Error getting cookies:", error)
          return []
        }
      },
      setAll(cookiesToSet) {
        try {
          console.log("[SERVER-CLIENT] Setting cookies:", cookiesToSet.length)
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch (cookieError) {
              console.warn("[SERVER-CLIENT] Failed to set cookie:", name, (cookieError as any).message)
            }
          })
        } catch (error) {
          console.warn("[SERVER-CLIENT] Cookie setting failed (Server Component context):", (error as any).message)
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions, but we should log it for debugging
        }
      },
    },
  })
}

// Admin client with service role key for admin operations
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
      }
    }
  )
}
