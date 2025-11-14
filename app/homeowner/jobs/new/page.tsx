import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerJobForm } from "@/components/homeowner-job-form"

export default async function NewHomeownerJobPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Check user is a homeowner
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (userData?.user_type !== "homeowner") {
    redirect("/dashboard")
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
      <HomeownerJobForm userId={user.id} profile={profile} />
    </div>
  )
}
