import { Button } from "@/components/ui/button"
import { LandingPage } from "@/components/landing-page"
import { getAdminUser } from "@/lib/admin-auth"
import { createClient } from "@/lib/server"
import Link from "next/link"
import { generateSEO } from "@/lib/seo"
import { HomeClientWrapper } from "@/components/home-client-wrapper"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

// SEO Metadata
export const metadata = generateSEO({
  title: 'Find Local Tradespeople & Post Jobs | Open Job Market',
  description: 'The fastest way to connect homeowners with local tradespeople. Post jobs in seconds, get fast replies from nearby trades. Free to post, no subscription required.',
  path: '/',
  locale: 'en',
})

export default async function HomePage() {
  console.log("[v0] HomePage rendering")

  // Check if current user is an admin - don't block page rendering if this fails
  let adminUser = null
  try {
    adminUser = await getAdminUser()
  } catch (error) {
    console.error("Failed to check admin user:", error)
    // Continue rendering page without admin check
  }

  // Check if user is logged in and get user type
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userType: string | null = null
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .single()

    userType = userData?.user_type || null
  }

  return (
    <HomeClientWrapper>
      {adminUser && (
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

      <LandingPage
        isSignedIn={!!user}
        user={user}
        userType={userType}
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
