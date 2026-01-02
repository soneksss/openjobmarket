// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import JobWizardModal from "@/components/job-wizard-modal"

export default async function HomeownerPostJobPageBR() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login?locale=pt-BR&returnUrl=/br/dashboard/homeowner/post-job")
  }

  // Get homeowner profile
  const { data: profile } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/br/onboarding/homeowner")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <JobWizardModal companyProfile={profile} userType="homeowner" />
    </div>
  )
}
