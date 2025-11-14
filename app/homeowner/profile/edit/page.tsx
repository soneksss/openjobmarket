import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerProfileEditForm } from "@/components/homeowner-profile-edit-form"

export default async function HomeownerProfileEditPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Get homeowner profile
  const { data: profile } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding/homeowner")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeownerProfileEditForm userId={user.id} profile={profile} />
    </div>
  )
}
