import { Suspense } from "react"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { SearchPageClient } from "@/components/search-page-client"
import JobRecommendations from "@/components/job-recommendations"

export default async function SearchPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile for recommendations
  const { data: profile } = await supabase
    .from("professional_profiles")
    .select("skills, location, experience_level")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <section
        className="relative py-6 sm:py-12 md:py-24 overflow-hidden"
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

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <SearchPageClient />
            </div>
            <div>
              <Suspense fallback={<div>Loading recommendations...</div>}>
                <JobRecommendations
                  userId={user.id}
                  userSkills={profile?.skills || []}
                  userLocation={profile?.location || ""}
                  userExperience={profile?.experience_level || ""}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
