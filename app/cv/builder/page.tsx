import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import CVBuilderForm from "@/components/cv-builder-form"

export default async function CVBuilderPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get user data and professional profile
  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (userData?.user_type !== "professional") {
    redirect("/dashboard/company")
  }

  const { data: professionalProfile } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!professionalProfile) {
    redirect("/profile/edit")
  }

  // Prepare initial profile data for pre-populating CV
  const initialProfileData = {
    firstName: professionalProfile.first_name || "",
    lastName: professionalProfile.last_name || "",
    title: professionalProfile.title || "",
    location: professionalProfile.location || "",
    email: user.email || "",
    phone: userData.phone || professionalProfile.phone || "",
    bio: professionalProfile.bio || "",
    skills: professionalProfile.skills || [],
    portfolioUrl: professionalProfile.portfolio_url || "",
    linkedinUrl: professionalProfile.linkedin_url || "",
    githubUrl: professionalProfile.github_url || "",
  }

  return (
    <CVBuilderForm
      userId={user.id}
      professionalId={professionalProfile.id}
      initialProfileData={initialProfileData}
    />
  )
}
