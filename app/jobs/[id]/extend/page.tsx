import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import JobExtensionForm from "@/components/job-extension-form"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function JobExtendPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id: jobId } = await params

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

  // Get job details with expiration status
  const { data: job, error } = await supabase
    .from("job_status_view")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", profile.id)
    .single()

  if (error || !job) {
    redirect("/dashboard/company/jobs")
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Extend Job Posting</h1>
          <p className="text-muted-foreground">Extend the visibility of your job posting with a new timeline</p>
        </div>
        <JobExtensionForm job={job} companyProfile={profile} />
      </div>
    </div>
  )
}
