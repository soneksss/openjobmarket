import { Button } from "@/components/ui/button"
import { HomepageLayout } from "@/components/homepage-layout"
import { createClient } from "@/lib/server"
import { getHomePageBootstrap } from "@/lib/bootstrap"
import Link from "next/link"
import { generateSEO } from "@/lib/seo"
import { HomeClientWrapper } from "@/components/home-client-wrapper"

export const dynamic = 'force-dynamic'

export const metadata = generateSEO({
  title: 'Open Job Market – The Free Local Jobs Portal',
  description: 'Hire a local tradesperson, find trade work, post a vacancy or find a job near you, all free on one live map. No lead fees and no middleman.',
  path: '/home',
  locale: 'en',
})

export default async function HomeMarketingPage() {
  const supabase = await createClient()

  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  } catch {
    // AbortError (timeout) or ECONNRESET — render as signed out
  }

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

      <footer className="hidden md:block py-3 bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-5 text-xs text-slate-500">
              <Link href="/about" className="hover:text-slate-300 transition-colors">About</Link>
              <Link href="/contact" className="hover:text-slate-300 transition-colors">Contact</Link>
              <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
            </div>
            <p className="text-xs text-slate-600">© 2025 Open Job Market Ltd.</p>
          </div>
        </div>
      </footer>
    </HomeClientWrapper>
  )
}
