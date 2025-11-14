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

    const { data: profile, error: profileError } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (profileError) {
      console.error("Company profile fetch error:", profileError.message)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Profile Required</h1>
            <p className="text-gray-600 mb-6">You need to set up your company profile before posting jobs.</p>
            <a
              href="/dashboard/company/setup"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
      <div className="min-h-screen bg-gray-50">
        <JobWizardModal companyProfile={profile} userType="company" />
      </div>
    )
  } catch (error) {
    console.error("[v0] Error in NewJobPage:", error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">There was an error loading the job posting form.</p>
          <a
            href="/dashboard/company"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }
}
