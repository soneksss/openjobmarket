import { createClient } from "@/lib/server"

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const supabase = await createClient()

  // Get user data
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", userId)
    .single()

  if (!userData?.user_type) {
    return false
  }

  // Check based on user type
  if (userData.user_type === "professional") {
    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("id, first_name, last_name, title")
      .eq("user_id", userId)
      .single()

    // Profile must exist and have required fields
    return !!(profile && profile.first_name && profile.last_name && profile.title)
  }

  if (userData.user_type === "homeowner") {
    const { data: profile } = await supabase
      .from("homeowner_profiles")
      .select("id")
      .eq("user_id", userId)
      .single()

    return !!profile
  }

  if (userData.user_type === "company") {
    const { data: profile } = await supabase
      .from("company_profiles")
      .select("id, company_name, industry, location")
      .eq("user_id", userId)
      .single()

    // Profile must exist and have required fields
    return !!(profile && profile.company_name && profile.industry && profile.location)
  }

  return false
}

export function getOnboardingUrl(locale?: string): string {
  const isBrazil = locale === 'pt-BR'
  return isBrazil ? '/br/onboarding' : '/onboarding'
}
