import { Button } from "@/components/ui/button"
import { HomepageLayout } from "@/components/homepage-layout"
import { createClient } from "@/lib/server"
import { getHomePageBootstrap } from "@/lib/bootstrap"
import Link from "next/link"
import { generateSEO } from "@/lib/seo"
import { HomeClientWrapper } from "@/components/home-client-wrapper"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export const metadata = generateSEO({
  title: 'Find Local Tradespeople & Post Jobs | Open Job Market',
  description: 'The fastest way to connect homeowners with local tradespeople. Post jobs in seconds, get fast replies from nearby trades. Free to post, no subscription required.',
  path: '/',
  locale: 'en',
})

export default async function HomePage() {
  // createClient() has AbortSignal.timeout(3000) on every fetch — no separate withTimeout needed
  const supabase = await createClient()

  // Round-trip 1: auth
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  } catch {
    // AbortError (timeout) or ECONNRESET — render as signed out
  }

  // Round-trip 2+: profile + adminSettings — served from cache, Supabase only on miss
  const bootstrap = await getHomePageBootstrap(user)
  const { adminSettings, featureFlags, userType, profileLocation, profileSkills, profileIndustry, profileServices } = bootstrap
  const isAdmin = userType === 'admin'

  return (
    <HomeClientWrapper>
      {isAdmin && (
        <div className="w-full bg-slate-800 border-b border-slate-700 py-1.5">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <Link href="/admin/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
                >
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <HomepageLayout
        version={adminSettings.layoutVersion}
        isSignedIn={!!user}
        user={user}
        userType={userType}
        adminSettings={adminSettings}
        profileLocation={profileLocation}
        profileSkills={profileSkills}
        profileIndustry={profileIndustry}
        profileServices={profileServices}
      />

      {/* Compact Footer - Hidden on mobile (links in Account dashboard) */}
      <footer className="hidden md:block py-3 bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-5 text-xs text-slate-500">
              <Link href="/about" className="hover:text-slate-300 transition-colors">
                About
              </Link>
              <Link href="/contact" className="hover:text-slate-300 transition-colors">
                Contact
              </Link>
              <Link href="/terms" className="hover:text-slate-300 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-slate-300 transition-colors">
                Privacy
              </Link>
            </div>
            <p className="text-xs text-slate-600">
              © 2025 Open Job Market Ltd.
            </p>
          </div>
        </div>
      </footer>
    </HomeClientWrapper>
  )
}
