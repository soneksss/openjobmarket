import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerUpgradeForm } from "@/components/homeowner-upgrade-form"

export default async function HomeownerUpgradePage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Check user is actually a homeowner
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (userData?.user_type !== "homeowner") {
    redirect("/dashboard")
  }

  // Get homeowner profile
  const { data: homeownerProfile } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!homeownerProfile) {
    redirect("/onboarding/homeowner")
  }

  // Check if already has professional profile
  const { data: professionalProfile } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (professionalProfile) {
    redirect("/dashboard/professional")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeownerUpgradeForm userId={user.id} homeownerProfile={homeownerProfile} />
    </div>
  )
}
