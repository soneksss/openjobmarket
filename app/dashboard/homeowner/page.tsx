import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerDashboard } from "@/components/homeowner-dashboard"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

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
    console.log("[HOMEOWNER] No homeowner profile found, redirecting to home with complete_profile prompt")
    redirect("/?complete_profile=true")
  }

  console.log("[HOMEOWNER] Homeowner profile found:", profile.first_name, profile.last_name, "Profile ID:", profile.id, "User ID:", user.id)

  // Check profile completeness - but DON'T redirect, let dashboard handle it
  const missingFields: string[] = []
  if (!profile.first_name) missingFields.push("first_name")
  if (!profile.last_name) missingFields.push("last_name")
  if (!profile.location) missingFields.push("location")

  const isProfileComplete = missingFields.length === 0

  console.log("[HOMEOWNER] Profile validation:", {
    isProfileComplete,
    missingFields,
  })

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
      isProfileComplete={isProfileComplete}
      missingFields={missingFields}
    />
  )
}
