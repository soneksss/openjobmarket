import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { ContractorOnboardingForm } from "@/components/contractor-onboarding-form"

export default async function ContractorOnboardingPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Check if user already has a contractor profile
  const { data: profile } = await supabase
    .from("contractor_profiles")
    .select("id, company_name")
    .eq("user_id", user.id)
    .single()

  // If profile is complete, redirect to dashboard
  if (profile?.company_name) {
    redirect("/dashboard/contractor")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorOnboardingForm userId={user.id} existingProfile={profile} />
    </div>
  )
}
