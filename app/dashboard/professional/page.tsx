import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import ProfessionalDashboard from "@/components/professional-dashboard"

export default async function ProfessionalDashboardPage() {
  console.log("[PROFESSIONAL-DASHBOARD-PAGE] Loading...")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[PROFESSIONAL-DASHBOARD-PAGE] User data:", { hasUser: !!user, userEmail: user?.email, userId: user?.id })

  if (!user) {
    console.log("[PROFESSIONAL-DASHBOARD-PAGE] No user found, redirecting to login")
    redirect("/auth/login")
  }

  // Get professional profile
  const { data: profile, error: profileError } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    console.log("[PROFESSIONAL-DASHBOARD-PAGE] No profile found, redirecting to onboarding")
    redirect("/onboarding")
  }

  // Check if profile is complete and valid
  const isProfileComplete = profile.first_name && profile.last_name && profile.title

  if (!isProfileComplete) {
    console.log("[PROFESSIONAL-DASHBOARD-PAGE] Incomplete profile detected, cleaning up old account")

    // Delete incomplete profile and related data
    try {
      // Delete profile
      await supabase.from("professional_profiles").delete().eq("user_id", user.id)

      // Sign out and delete auth user
      await supabase.auth.signOut()

      console.log("[PROFESSIONAL-DASHBOARD-PAGE] Old account cleaned up, redirecting to home")
      redirect("/")
    } catch (error) {
      console.error("[PROFESSIONAL-DASHBOARD-PAGE] Error cleaning up account:", error)
      // If cleanup fails, redirect to onboarding to fix the profile
      redirect("/onboarding")
    }
  }

  // Get recent job applications
  const { data: applications } = await supabase
    .from("job_applications")
    .select(`
      *,
      jobs (
        id,
        title,
        company_profiles (
          company_name
        )
      )
    `)
    .eq("professional_id", profile.id)
    .order("applied_at", { ascending: false })
    .limit(5)

  // Get saved jobs
  const { data: savedJobs } = await supabase
    .from("saved_jobs")
    .select(`
      *,
      jobs (
        id,
        title,
        location,
        job_type,
        company_profiles (
          company_name
        )
      )
    `)
    .eq("professional_id", profile.id)
    .order("saved_at", { ascending: false })
    .limit(5)

  // Check if CV exists
  const { data: cvRecord } = await supabase
    .from("professional_cvs")
    .select("id")
    .eq("professional_id", profile.id)
    .single()

  console.log("[PROFESSIONAL-DASHBOARD-PAGE] Passing user to component:", {
    hasUser: !!user,
    userEmail: user?.email,
    userEmailExists: !!user?.email,
    userObject: user,
    userKeys: user ? Object.keys(user) : []
  })

  return (
    <ProfessionalDashboard
      user={user as any}
      profile={profile}
      applications={applications || []}
      savedJobs={savedJobs || []}
      hasCV={!!cvRecord}
    />
  )
}
