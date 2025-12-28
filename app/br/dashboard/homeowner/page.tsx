import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import HomeownerDashboard from "@/components/homeowner-dashboard"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function HomeownerDashboardPageBR() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?locale=pt-BR&returnUrl=/br/dashboard/homeowner")
  }

  // Get homeowner profile
  const { data: profile } = await supabase.from("homeowner_profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/br/onboarding")
  }

  return <HomeownerDashboard user={user} profile={profile} />
}
