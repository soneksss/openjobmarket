// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import JobWizardModal from "@/components/job-wizard-modal"

export default async function ProfessionalPostJobPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/sign-in")
  }

  // Get professional profile
  const { data: profile } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  // Check if user has homeowner permission (is_homeowner flag)
  const { data: userData } = await supabase
    .from("users")
    .select("is_homeowner, is_jobseeker")
    .eq("id", user.id)
    .single()

  // Jobseekers with is_homeowner=true can post trade jobs
  if (!userData?.is_homeowner) {
    // Redirect to upgrade page or show message
    redirect("/dashboard/professional")
  }

  // Get or create homeowner profile for this user
  // (Professionals with is_homeowner=true should have a homeowner_profile)
  let { data: homeownerProfile } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  // If no homeowner profile exists, create one from professional profile
  if (!homeownerProfile) {
    const { data: newProfile, error: createError } = await supabase
      .from("homeowner_profiles")
      .insert({
        user_id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_photo_url: profile.profile_photo_url,
        location: profile.location || '',
      })
      .select()
      .single()

    if (createError) {
      console.error("Failed to create homeowner profile:", createError)
      redirect("/dashboard/professional")
    }

    homeownerProfile = newProfile
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <JobWizardModal
        companyProfile={homeownerProfile}
        userType="homeowner"
        redirectPath="/dashboard/professional"
      />
    </div>
  )
}
