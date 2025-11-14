import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerOnboardingForm } from "@/components/homeowner-onboarding-form"

export default async function HomeownerOnboardingPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Check if user already has a homeowner profile
  const { data: profile } = await supabase
    .from("homeowner_profiles")
    .select("id, first_name, last_name")
    .eq("user_id", user.id)
    .single()

  // If profile is complete, redirect to dashboard
  if (profile?.first_name && profile?.last_name) {
    redirect("/dashboard/homeowner")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeownerOnboardingForm userId={user.id} existingProfile={profile} />
    </div>
  )
}
