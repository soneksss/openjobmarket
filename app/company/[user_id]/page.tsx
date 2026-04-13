// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import CompanyDetailView from "@/components/company-detail-view"

interface PageProps {
  params: Promise<{ user_id: string }>
}

export default async function CompanyProfilePage({ params }: PageProps) {
  const { user_id } = await params
  const supabase = await createClient()

  console.log("[COMPANY-PROFILE] Loading company for user_id:", user_id)

  // Get current user (might be null if not logged in)
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch company profile by user_id
  const { data: companyProfile, error: profileError } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user_id)
    .single()

  if (profileError || !companyProfile) {
    console.error("[COMPANY-PROFILE] Error loading company profile:", profileError)
    notFound()
  }

  // Check visibility - only allow access if:
  // 1. User is viewing their own profile, OR
  // 2. User has profile_visible = true in users table, OR
  // 3. Company has open_for_business = true in company_profiles table
  const isOwnProfile = user?.id === user_id

  // Fetch user visibility settings
  const { data: userSettings } = await supabase
    .from("users")
    .select("profile_visible")
    .eq("id", user_id)
    .single()

  const isVisible = userSettings?.profile_visible === true ||
                    companyProfile.open_for_business === true ||
                    companyProfile.profile_visible === true

  console.log("[COMPANY-PROFILE] Visibility check:", {
    isOwnProfile,
    userProfileVisible: userSettings?.profile_visible,
    companyOpenForBusiness: companyProfile.open_for_business,
    companyProfileVisible: companyProfile.profile_visible,
    finalIsVisible: isVisible
  })

  if (!isOwnProfile && !isVisible) {
    console.log("[COMPANY-PROFILE] Profile not visible, user:", user?.id, "owner:", user_id)
    // Return a "Profile is private" message instead of 404
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Private Profile</h1>
          <p className="text-gray-700 mb-4">
            This company profile is currently set to private and is not visible to the public.
          </p>
          <a
            href="/search"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Search
          </a>
        </div>
      </div>
    )
  }

  // Fetch portfolio photos
  const { data: portfolioPhotos } = await supabase
    .from("trades_portfolio_photos")
    .select("id, photo_url")
    .eq("tradesperson_id", companyProfile.id)
    .order("display_order", { ascending: true })
    .limit(6)

  console.log("[COMPANY-PROFILE] Profile loaded successfully:", companyProfile.company_name)

  return (
    <div className="min-h-screen bg-background">
      <CompanyDetailView
        company={companyProfile}
        user={user as any}
        isModal={false}
        portfolioPhotos={portfolioPhotos ?? []}
      />
    </div>
  )
}
