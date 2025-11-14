import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import JobPostingForm from "@/components/job-posting-form"

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // Get job details and verify ownership
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.id)
    .single()

  if (!job) {
    notFound()
  }

  return <JobPostingForm companyProfile={profile} existingJob={job} />
}
