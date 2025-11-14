import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { ContractorUpgradeForm } from "@/components/contractor-upgrade-form"

export default async function ContractorUpgradePage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Check user is actually a contractor
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (userData?.user_type !== "contractor") {
    redirect("/dashboard")
  }

  // Get contractor profile
  const { data: contractorProfile } = await supabase
    .from("contractor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!contractorProfile) {
    redirect("/onboarding/contractor")
  }

  // Check if already upgraded
  if (contractorProfile.can_hire) {
    redirect("/dashboard/employer")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorUpgradeForm userId={user.id} contractorProfile={contractorProfile} />
    </div>
  )
}
