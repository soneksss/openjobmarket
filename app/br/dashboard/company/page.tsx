import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import CompanyDashboard from "@/components/company-dashboard"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function CompanyDashboardPageBR() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?locale=pt-BR&returnUrl=/br/dashboard/company")
  }

  // Get company profile
  const { data: profile } = await supabase.from("company_profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/br/onboarding")
  }

  return <CompanyDashboard user={user} profile={profile} />
}
