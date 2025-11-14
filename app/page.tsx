import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UnifiedSearchPage } from "@/components/unified-search-page"
import { getAdminUser } from "@/lib/admin-auth"
import { OnboardingModal } from "@/components/onboarding/OnboardingModal"
import { CategoryCards } from "@/components/category-cards"
import BannerMap from "@/components/BannerMap"
import { GuestBanner } from "@/components/guest-banner"
import { createClient } from "@/lib/server"
import Link from "next/link"

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

  // Check if user is logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      {adminUser && (
        <div className="w-full bg-white border-b border-gray-200 py-2 sm:py-4">
          <div className="container mx-auto px-2 sm:px-4">
            <div className="flex justify-center">
              <Link href="/admin/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-semibold bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <section
        className="relative py-3 sm:py-6 md:py-12 overflow-hidden"
        style={{
          backgroundImage: 'url(/London-buildings.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat'
        }}
      >

        {/* Floating elements for visual interest */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-300/20 rounded-full blur-lg animate-pulse delay-500"></div>

        <div className="container mx-auto px-2 sm:px-4 relative z-10">
          <div className="text-center mb-2 sm:mb-4 md:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-4 md:mb-6 text-balance invisible">
              Find Your Dream Job
            </h1>
            <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-4 sm:mb-6 md:mb-8 text-pretty max-w-3xl mx-auto px-2 invisible">
              The world's first map-based job marketplace connecting talent with opportunity across the globe
            </p>
          </div>

          {/* Onboarding buttons above search - only for guests */}
          {!user && (
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4 max-w-3xl mx-auto px-4">
              <OnboardingModal action="provider" />
              <OnboardingModal action="hiring" />
            </div>
          )}

          <UnifiedSearchPage isSignedIn={!!user} />
        </div>
      </section>

      {/* Guest banner - only show for unregistered users, hide after search */}
      {!user && <GuestBanner hideOnSearch={true} />}

      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-balance text-blue-900">
              Success Stories
            </h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto text-pretty px-2">
              Real results from professionals and companies who found their perfect match just yesterday morning
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-emerald-100 to-emerald-200 relative overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%281%29%281%29%281%29-UAuvnlHA8UfziXp43l14u51SSVEFHh.png"
                  alt="Team celebrating successful job placement"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Yesterday
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">
                  TechTeam Solutions - HR Director
                </h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "Our entire development team found better positions through Open Job Market. The collaborative
                  approach helped us all transition together to a startup that valued our teamwork."
                </p>
                <div className="flex items-center text-emerald-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">👥</span>
                  <span>4 team members hired together</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image%281%29%281%29%281%29-rC8EooxhaNniFv0gUXUwir3AgEmlSx.png"
                  alt="Professional woman working late achieving success"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  This Morning
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">Maria R. - Data Scientist</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "Working late nights on my current project, I quietly searched for remote opportunities. Found my
                  dream role at a Fortune 500 company with full remote flexibility and better work-life balance."
                </p>
                <div className="flex items-center text-blue-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">🏠</span>
                  <span>100% remote position secured</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-200 relative overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/image.png%281%29%281%29%281%29-Lq3ft08YXKDBM29jKfdrWN0e8WQBWO.jpeg"
                  alt="Construction professional celebrating career advancement"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Yesterday
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">James K. - Project Manager</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "From construction sites to corporate leadership. The platform helped me transition my project
                  management skills into a senior role at a major infrastructure company."
                </p>
                <div className="flex items-center text-orange-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">⬆️</span>
                  <span>Career advancement to leadership</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center mt-8 md:mt-12">
            <p className="text-gray-500 text-base md:text-lg mb-4 md:mb-6">
              Join thousands who found their perfect match
            </p>
            <Button
              size="lg"
              className="px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
              asChild
            >
              <Link href="/onboarding">Start Your Success Story</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-white text-balance">
              Why Choose Open Job Market?
            </h2>
            <p className="text-base md:text-xl text-white/90 max-w-3xl mx-auto text-pretty px-2">
              Revolutionary features that transform how you find jobs and talent
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <div className="text-center text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Map-Based Discovery</h3>
              <p className="text-sm md:text-base text-white/90 leading-relaxed">
                Visualize opportunities geographically. Find jobs and talent based on location, commute preferences, and
                regional insights.
              </p>
            </div>

            <div className="text-center text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16V13C8,12.4 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Anonymous Job Search</h3>
              <p className="text-sm md:text-base text-white/90 leading-relaxed">
                Search for opportunities without revealing your identity. Your current employer will never know you're
                looking.
              </p>
            </div>

            <div className="text-center text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Global Reach</h3>
              <p className="text-sm md:text-base text-white/90 leading-relaxed">
                Connect with opportunities worldwide. Remote work, international positions, and local jobs all in one
                platform.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
