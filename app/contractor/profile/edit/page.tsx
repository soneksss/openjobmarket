import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { ContractorProfileEditForm } from "@/components/contractor-profile-edit-form"

export default async function ContractorProfileEditPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Get contractor profile
  const { data: profile } = await supabase
    .from("contractor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding/contractor")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorProfileEditForm userId={user.id} profile={profile} />
    </div>
  )
}
