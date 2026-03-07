import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import ApplicationDetailView from "./application-detail-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get company profile for the current user
  const { data: companyProfile } = await supabase
    .from("company_profiles")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!companyProfile) {
    redirect("/onboarding")
  }

  // Fetch the specific application, verifying it belongs to this company
  const { data: application } = await supabase
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
        phone,
        profile_photo_url,
        hide_email
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
    .eq("id", id)
    .eq("jobs.company_id", companyProfile.id)
    .maybeSingle()

  if (!application) {
    notFound()
  }

  return <ApplicationDetailView application={application} companyProfile={companyProfile} />
}