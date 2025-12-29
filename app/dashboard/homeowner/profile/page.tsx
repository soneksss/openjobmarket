import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerProfileForm } from "@/components/homeowner-profile-form"

export default async function HomeownerProfilePage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  console.log("[HOMEOWNER-PROFILE] Fetching profile for user:", user.id, "Email:", user.email)

  // Get homeowner profile
  const { data: profile, error: profileError } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (profileError) {
    console.error("[HOMEOWNER-PROFILE] Error fetching profile:", profileError)
  }

  if (!profile) {
    console.log("[HOMEOWNER-PROFILE] No profile found for user:", user.id)
    redirect("/onboarding/homeowner")
  }

  console.log("[HOMEOWNER-PROFILE] Profile loaded:", profile.first_name, profile.last_name, "Profile ID:", profile.id, "User ID:", user.id, "Photo URL:", profile.profile_photo_url ? "exists" : "missing")

  return <HomeownerProfileForm profile={profile} userId={user.id} />
}
