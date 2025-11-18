// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import ContractorDashboard from "@/components/contractor-dashboard"

export default async function ContractorDashboardPage() {
  console.log("[CONTRACTOR] Dashboard page loading...")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[CONTRACTOR] No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[CONTRACTOR] User found:", user.id)

  // Get contractor profile
  const { data: profile, error: profileError } = await supabase
    .from("contractor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (profileError) {
    console.log("[CONTRACTOR] Profile error:", profileError)
  }

  if (!profile) {
    console.log("[CONTRACTOR] No contractor profile found, redirecting to onboarding")
    redirect("/onboarding")
  }

  console.log("[CONTRACTOR] Contractor profile found:", profile.company_name)

  // Check if profile is complete and valid
  const isProfileComplete = profile.company_name && profile.trade && profile.location

  if (!isProfileComplete) {
    console.log("[CONTRACTOR] Incomplete contractor profile detected, cleaning up old account")

    // Delete incomplete profile and related data
    try {
      // Delete profile
      await supabase.from("contractor_profiles").delete().eq("user_id", user.id)

      // Sign out and delete auth user
      await supabase.auth.signOut()

      console.log("[CONTRACTOR] Old contractor account cleaned up, redirecting to home")
      redirect("/")
    } catch (error) {
      console.error("[CONTRACTOR] Error cleaning up contractor account:", error)
      // If cleanup fails, redirect to onboarding to fix the profile
      redirect("/onboarding")
    }
  }

  // Get homeowner jobs/tasks (available work for contractors)
  const { data: homeownerJobs, error: homeownerJobsError } = await supabase
    .from("homeowner_jobs")
    .select("*")
    .eq("is_active", true)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(10)

  if (homeownerJobsError) {
    console.log("[CONTRACTOR] Homeowner jobs error:", homeownerJobsError)
  }

  console.log("[CONTRACTOR] Available homeowner jobs:", homeownerJobs?.length || 0)

  // Get stats
  const { count: totalJobs } = await supabase
    .from("homeowner_jobs")
    .select("*", { count: "exact", head: true })

  return (
    <ContractorDashboard
      user={user}
      profile={profile}
      homeownerJobs={homeownerJobs || []}
      stats={{
        availableJobs: homeownerJobs?.length || 0,
        totalJobs: totalJobs || 0,
      }}
    />
  )
}
