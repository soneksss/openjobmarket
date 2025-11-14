import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import CompanyJobsManager from "@/components/company-jobs-manager"

export default async function CompanyJobsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get company profile
  const { data: profile } = await supabase.from("company_profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Get all company jobs
  const { data: jobs } = await supabase
    .from("job_status_view")
    .select("*")
    .eq("company_id", profile.id)
    .order("created_at", { ascending: false })

  // Get application counts for each job
  const jobIds = jobs?.map((job) => job.id) || []
  const { data: applicationCounts } = await supabase
    .from("job_applications")
    .select("job_id")
    .in("job_id", jobIds)

  // Count applications per job
  const applicationCountsMap = new Map()
  applicationCounts?.forEach((app) => {
    const count = applicationCountsMap.get(app.job_id) || 0
    applicationCountsMap.set(app.job_id, count + 1)
  })

  // Enrich jobs with application counts
  const enrichedJobs =
    jobs?.map((job) => ({
      ...job,
      applications_count: applicationCountsMap.get(job.id) || 0,
    })) || []

  return <CompanyJobsManager profile={profile} jobs={enrichedJobs} />
}
