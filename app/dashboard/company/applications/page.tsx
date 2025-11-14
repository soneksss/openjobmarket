import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import CompanyApplicationsManager from "@/components/company-applications-manager"

export default async function CompanyApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get company profile
  const { data: profile, error: profileError } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  console.log("🔎 DEBUG profile:", profile, "error:", profileError)

  if (!profile) {
    console.log("⚠️ No company profile found for user:", user.id)
    redirect("/onboarding")
  }

  // Get all applications for company jobs (support both professional and company applicants)
  const { data: applications, error: appsError } = await supabase
    .from("job_applications")
    .select(`
      *,
      jobs!inner (
        id,
        title,
        company_id
      ),
      professional_profiles (
        id,
        first_name,
        last_name,
        title,
        location,
        skills,
        experience_level,
        portfolio_url,
        linkedin_url,
        github_url,
        user_id,
        phone
      ),
      company_profiles!job_applications_company_id_fkey (
        id,
        company_name,
        industry,
        location,
        logo_url,
        user_id,
        company_size,
        website
      )
    `)
    .eq("jobs.company_id", profile.id)
    .order("applied_at", { ascending: false })

  console.log("🔎 DEBUG applications:", applications, "error:", appsError)

  return <CompanyApplicationsManager profile={profile} applications={applications || []} />
}
