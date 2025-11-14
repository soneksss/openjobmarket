import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import JobDescriptionForm from "@/components/job-description-form"

export default async function JobDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is a company
  const { data: userData } = await supabase.from("users").select("user_type").eq("id", user.id).single()

  if (!userData || userData.user_type !== "company") {
    redirect("/dashboard")
  }

  // Get company profile
  const { data: profile } = await supabase.from("company_profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Get the job
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.id)
    .single()

  if (!job) {
    redirect("/dashboard/company")
  }

  return <JobDescriptionForm job={job} companyProfile={profile} />
}
