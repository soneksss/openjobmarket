import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerDashboard } from "@/components/homeowner-dashboard"

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
  const { data: profile, error: profileError } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (profileError) {
    console.log("[HOMEOWNER-BR] Profile error:", profileError)
  }

  if (!profile) {
    redirect("/br/onboarding")
  }

  // Check if profile is complete and valid
  const isProfileComplete = profile.first_name && profile.last_name && profile.location

  if (!isProfileComplete) {
    console.log("[HOMEOWNER-BR] Incomplete homeowner profile detected, cleaning up old account")

    // Delete incomplete profile and related data
    try {
      // Delete profile
      await supabase.from("homeowner_profiles").delete().eq("user_id", user.id)

      // Sign out and delete auth user
      await supabase.auth.signOut()

      console.log("[HOMEOWNER-BR] Old homeowner account cleaned up, redirecting to home")
      redirect("/br")
    } catch (error) {
      console.error("[HOMEOWNER-BR] Error cleaning up homeowner account:", error)
      // If cleanup fails, redirect to onboarding to fix the profile
      redirect("/br/onboarding")
    }
  }

  // Get homeowner's posted jobs/tasks from the jobs table
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      short_description,
      location,
      salary_min,
      salary_max,
      salary_frequency,
      is_active,
      expires_at,
      created_at,
      updated_at,
      is_tradespeople_job,
      work_location,
      applications_count,
      views_count
    `)
    .eq("homeowner_id", profile.id)
    .order("created_at", { ascending: false })

  if (jobsError) {
    console.log("[HOMEOWNER-BR] Jobs error:", jobsError)
  }

  // Get stats
  const { count: totalJobs } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("homeowner_id", profile.id)

  const { count: activeJobs } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("homeowner_id", profile.id)
    .eq("is_active", true)

  // Get completed jobs count
  const { count: completedJobs } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("homeowner_id", profile.id)
    .eq("status", "completed")

  return (
    <HomeownerDashboard
      user={user}
      profile={profile}
      jobs={jobs || []}
      stats={{
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        completedJobs: completedJobs || 0,
      }}
    />
  )
}
