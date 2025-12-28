import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import OnboardingFlow from "@/components/onboarding-flow"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

interface OnboardingPageProps {
  searchParams: Promise<{ verification_pending?: string }>
}

export default async function OnboardingPageBR({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?locale=pt-BR&returnUrl=/br/onboarding")
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
      await supabase.auth.updateUser({
        data: { user_type: dbUserType }
      })
      metadataWasUpdated = true
    } else if (!dbUserType && metadataUserType) {
      await supabase.from("users").update({ user_type: metadataUserType }).eq("id", user.id)
    } else if (dbUserType && metadataUserType && dbUserType !== metadataUserType) {
      await supabase.auth.updateUser({
        data: { user_type: dbUserType }
      })
      metadataWasUpdated = true
    }

    if (metadataWasUpdated) {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser()
      if (refreshedUser) {
        updatedUser = refreshedUser
      }
    }
  }

  if (existingUser) {
    if (existingUser.user_type === "professional") {
      const { data: professionalProfile } = await supabase
        .from("professional_profiles")
        .select("id, first_name, last_name, title")
        .eq("user_id", user.id)
        .single()

      if (professionalProfile && professionalProfile.first_name && professionalProfile.last_name && professionalProfile.title) {
        redirect("/br/dashboard/professional")
      }
    } else if (existingUser.user_type === "homeowner") {
      const { data: homeownerProfile } = await supabase
        .from("homeowner_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (homeownerProfile) {
        redirect("/br/dashboard/homeowner")
      }
    } else {
      const { data: companyProfile } = await supabase
        .from("company_profiles")
        .select("id, company_name, industry")
        .eq("user_id", user.id)
        .single()

      if (companyProfile && companyProfile.company_name && companyProfile.industry) {
        redirect("/br/dashboard/company")
      }
    }
  }

  const params = await searchParams
  const isVerificationPending = params.verification_pending === 'true'
  const isEmailVerified = user.email_confirmed_at !== null

  return <OnboardingFlow user={updatedUser} isVerificationPending={isVerificationPending} isEmailVerified={isEmailVerified} />
}
