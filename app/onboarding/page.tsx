import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import OnboardingFlow from "@/components/onboarding-flow"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

interface OnboardingPageProps {
  searchParams: Promise<{ verification_pending?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is an admin first
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (adminUser) {
    redirect("/admin/dashboard")
  }

  // Check if user already has a profile
  const { data: existingUser } = await supabase.from("users").select("user_type").eq("id", user.id).single()

  // Sync metadata and database user_type
  let updatedUser = user
  if (existingUser) {
    const dbUserType = existingUser.user_type
    const metadataUserType = user.user_metadata?.user_type
    let metadataWasUpdated = false

    if (dbUserType && !metadataUserType) {
      // Database has user_type but metadata doesn't - sync metadata
      console.log("Syncing user_type to metadata:", dbUserType)
      await supabase.auth.updateUser({
        data: { user_type: dbUserType }
      })
      metadataWasUpdated = true
    } else if (!dbUserType && metadataUserType) {
      // Metadata has user_type but database doesn't - sync database
      console.log("Syncing user_type to database:", metadataUserType)
      await supabase.from("users").update({ user_type: metadataUserType }).eq("id", user.id)
    } else if (dbUserType && metadataUserType && dbUserType !== metadataUserType) {
      // Conflict - database wins, update metadata
      console.log("Resolving user_type conflict, using database value:", dbUserType)
      await supabase.auth.updateUser({
        data: { user_type: dbUserType }
      })
      metadataWasUpdated = true
    }

    // If metadata was updated, refresh the user object
    if (metadataWasUpdated) {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser()
      if (refreshedUser) {
        updatedUser = refreshedUser
      }
    }
  }

  if (existingUser) {
    // User already onboarded, check if they have the required profile
    if (existingUser.user_type === "professional") {
      // Check if professional profile exists and is complete
      const { data: professionalProfile } = await supabase
        .from("professional_profiles")
        .select("id, first_name, last_name, title")
        .eq("user_id", user.id)
        .single()

      // Only redirect if profile exists AND is complete
      if (professionalProfile && professionalProfile.first_name && professionalProfile.last_name && professionalProfile.title) {
        redirect("/dashboard/professional")
      }
      // If no professional profile or incomplete, continue with onboarding
    } else if (existingUser.user_type === "homeowner") {
      // Check if homeowner profile exists
      const { data: homeownerProfile } = await supabase
        .from("homeowner_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (homeownerProfile) {
        redirect("/dashboard/homeowner")
      }
      // If no homeowner profile, continue with onboarding
    } else {
      // Check if company profile exists and is complete
      const { data: companyProfile } = await supabase
        .from("company_profiles")
        .select("id, company_name, industry, location")
        .eq("user_id", user.id)
        .single()

      // Only redirect if profile exists AND is complete
      if (companyProfile && companyProfile.company_name && companyProfile.industry && companyProfile.location) {
        redirect("/dashboard/company")
      }
      // If no company profile or incomplete, continue with onboarding
    }
  }

  const params = await searchParams
  const isVerificationPending = params.verification_pending === "true"
  const isEmailVerified = !!user.email_confirmed_at

  return (
    <div className="min-h-screen bg-muted/50">
      <OnboardingFlow user={updatedUser as any} isVerificationPending={isVerificationPending} isEmailVerified={isEmailVerified} />
    </div>
  )
}
