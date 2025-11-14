import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerDashboard } from "@/components/homeowner-dashboard"

export default async function HomeownerDashboardPage() {
  console.log("[HOMEOWNER] Dashboard page loading...")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[HOMEOWNER] No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[HOMEOWNER] User found:", user.id)

  // Get homeowner profile
  const { data: profile, error: profileError } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (profileError) {
    console.log("[HOMEOWNER] Profile error:", profileError)
  }

  if (!profile) {
    console.log("[HOMEOWNER] No homeowner profile found, redirecting to onboarding")
    redirect("/onboarding")
  }

  console.log("[HOMEOWNER] Homeowner profile found:", profile.first_name)

  // Check if profile is complete and valid
  const isProfileComplete = profile.first_name && profile.last_name && profile.location

  if (!isProfileComplete) {
    console.log("[HOMEOWNER] Incomplete homeowner profile detected, cleaning up old account")

    // Delete incomplete profile and related data
    try {
      // Delete profile
      await supabase.from("homeowner_profiles").delete().eq("user_id", user.id)

      // Sign out and delete auth user
      await supabase.auth.signOut()

      console.log("[HOMEOWNER] Old homeowner account cleaned up, redirecting to home")
      redirect("/")
    } catch (error) {
      console.error("[HOMEOWNER] Error cleaning up homeowner account:", error)
      // If cleanup fails, redirect to onboarding to fix the profile
      redirect("/onboarding")
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
      work_location
    `)
    .eq("homeowner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (jobsError) {
    console.log("[HOMEOWNER] Jobs error:", jobsError)
  }

  console.log("[HOMEOWNER] Jobs found:", jobs?.length || 0)

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
