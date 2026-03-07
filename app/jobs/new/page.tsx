// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"

export default async function NewJobPage() {
  console.log("[v0] New job page loading...")

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      console.error("Supabase getUser error:", userErr)
      redirect("/auth/login")
    }

    console.log("[v0] User found:", user.id)

    // First, check the user type from the users table
    const { data: userData } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .single()

    console.log("[v0] User type:", userData?.user_type)

    // Handle homeowner users - use the same JobWizardModal as companies
    if (userData?.user_type === "homeowner") {
      const { data: homeownerProfile, error: homeownerError } = await supabase
        .from("homeowner_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (homeownerError || !homeownerProfile) {
        console.error("Homeowner profile fetch error:", homeownerError?.message)
        redirect("/onboarding/homeowner")
      }

      // Use JobWizardModal for consistent design across all user types
      const { default: JobWizardModal } = await import("@/components/job-wizard-modal")

      return (
        <div className="min-h-screen bg-slate-900 md:bg-gray-50">
          <JobWizardModal companyProfile={homeownerProfile} userType="homeowner" />
        </div>
      )
    }

    // Handle company users
    if (userData?.user_type === "company") {
      const { data: profile, error: profileError } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (profileError) {
        console.error("Company profile fetch error:", profileError.message)
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 md:bg-gray-50">
            <div className="max-w-md w-full mx-4 bg-slate-800 md:bg-white rounded-xl border border-slate-700/50 md:border-0 md:shadow-lg p-6 text-center">
              <h1 className="text-2xl font-bold text-white md:text-gray-900 mb-4">Company Profile Required</h1>
              <p className="text-slate-400 md:text-gray-600 mb-6">You need to set up your company profile before posting jobs.</p>
              <a
                href="/dashboard/company/setup"
                className="inline-block bg-emerald-600 md:bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 md:hover:bg-blue-700 transition-colors"
              >
                Set Up Company Profile
              </a>
            </div>
          </div>
        )
      }

      console.log("[v0] Company profile found:", profile?.company_name)

      const { default: JobWizardModal } = await import("@/components/job-wizard-modal")

      return (
        <div className="min-h-screen bg-slate-900 md:bg-gray-50">
          <JobWizardModal companyProfile={profile} userType="company" />
        </div>
      )
    }

    // Handle contractor users - they can also post jobs for subcontractors (Business type)
    if (userData?.user_type === "contractor") {
      const { data: contractorProfile, error: contractorError } = await supabase
        .from("contractor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (contractorError || !contractorProfile) {
        console.error("Contractor profile fetch error:", contractorError?.message)
        redirect("/onboarding/contractor")
      }

      // Contractors use the job wizard with contractor type
      const { default: JobWizardModal } = await import("@/components/job-wizard-modal")

      return (
        <div className="min-h-screen bg-slate-900 md:bg-gray-50">
          <JobWizardModal companyProfile={contractorProfile} userType="contractor" />
        </div>
      )
    }

    // Handle professional users - they can post jobs (Individual type)
    // Professionals need a homeowner_profile to post jobs (due to FK constraint)
    if (userData?.user_type === "professional") {
      const { data: professionalProfile, error: professionalError } = await supabase
        .from("professional_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (professionalError || !professionalProfile) {
        console.error("Professional profile fetch error:", professionalError?.message)
        redirect("/onboarding/professional")
      }

      // Check if professional already has a homeowner_profile
      let { data: homeownerProfile } = await supabase
        .from("homeowner_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      // If no homeowner_profile exists, create one from professional_profile
      if (!homeownerProfile) {
        console.log("[v0] Creating homeowner_profile for professional user")
        const { data: newProfile, error: createError } = await supabase
          .from("homeowner_profiles")
          .insert({
            user_id: user.id,
            first_name: professionalProfile.first_name || "",
            last_name: professionalProfile.last_name || "",
            profile_photo_url: professionalProfile.profile_photo_url || professionalProfile.avatar_url,
            location: professionalProfile.location || "",
          })
          .select("*")
          .single()

        if (createError) {
          console.error("Failed to create homeowner_profile for professional:", createError.message)
          return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 md:bg-gray-50">
              <div className="max-w-md w-full mx-4 bg-slate-800 md:bg-white rounded-xl border border-slate-700/50 md:border-0 md:shadow-lg p-6 text-center">
                <h1 className="text-2xl font-bold text-white md:text-gray-900 mb-4">Setup Error</h1>
                <p className="text-slate-400 md:text-gray-600 mb-6">Could not set up your account for job posting. Please try again or contact support.</p>
                <a
                  href="/dashboard"
                  className="inline-block bg-emerald-600 md:bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 md:hover:bg-blue-700 transition-colors"
                >
                  Back to Dashboard
                </a>
              </div>
            </div>
          )
        }
        homeownerProfile = newProfile
      }

      // Use JobWizardModal for consistent design across all user types
      const { default: JobWizardModal } = await import("@/components/job-wizard-modal")

      return (
        <div className="min-h-screen bg-slate-900 md:bg-gray-50">
          <JobWizardModal companyProfile={homeownerProfile} userType="homeowner" />
        </div>
      )
    }

    // For unknown user types only, show an error
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 md:bg-gray-50">
        <div className="max-w-md w-full mx-4 bg-slate-800 md:bg-white rounded-xl border border-slate-700/50 md:border-0 md:shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-white md:text-gray-900 mb-4">Account Setup Required</h1>
          <p className="text-slate-400 md:text-gray-600 mb-6">
            Your account type ({userData?.user_type || 'unknown'}) needs to be set up before posting jobs.
          </p>
          <a
            href="/onboarding"
            className="inline-block bg-emerald-600 md:bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 md:hover:bg-blue-700 transition-colors"
          >
            Complete Setup
          </a>
        </div>
      </div>
    )
  } catch (error) {
    console.error("[v0] Error in NewJobPage:", error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 md:bg-gray-50">
        <div className="max-w-md w-full mx-4 bg-slate-800 md:bg-white rounded-xl border border-slate-700/50 md:border-0 md:shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-400 md:text-red-600 mb-4">Error</h1>
          <p className="text-slate-400 md:text-gray-600 mb-6">There was an error loading the job posting form.</p>
          <a
            href="/dashboard"
            className="inline-block bg-emerald-600 md:bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 md:hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }
}
