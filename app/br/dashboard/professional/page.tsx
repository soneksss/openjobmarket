import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import ProfessionalDashboard from "@/components/professional-dashboard"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function ProfessionalDashboardPageBR() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?locale=pt-BR&returnUrl=/br/dashboard/professional")
  }

  // Get professional profile
  const { data: profile } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/br/onboarding")
  }

  // Check if profile is complete and valid
  const isProfileComplete = profile.first_name && profile.last_name && profile.title

  if (!isProfileComplete) {
    // Delete incomplete profile and related data
    try {
      await supabase.from("professional_profiles").delete().eq("user_id", user.id)
      await supabase.auth.signOut()
      redirect("/br")
    } catch (error) {
      redirect("/br/onboarding")
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
