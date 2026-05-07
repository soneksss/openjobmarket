// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ industry?: string; service?: string; postcode?: string }> }) {
  const { industry: initialIndustry, service: initialService, postcode: initialPostcode } = await searchParams

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { default: JobWizardModal } = await import("@/components/job-wizard-modal")

    // ── Guest (unauthenticated) — show wizard with Step 4 account creation ───
    if (!user) {
      return (
        <div className="min-h-screen bg-slate-900">
          <JobWizardModal
            companyProfile={null}
            userType="homeowner"
            guestMode={true}
            initialPostcode={initialPostcode}
            initialIndustry={initialIndustry}
            initialService={initialService}
          />
        </div>
      )
    }

    const [{ data: userData }, { data: homeownerProfile }, { data: companyProfile }] = await Promise.all([
      supabase.from("users").select("user_type").eq("id", user.id).single(),
      supabase.from("homeowner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("company_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ])

    const userType = userData?.user_type ?? null

    if (userType === "company") redirect("/dashboard/company")

    if (userType === "homeowner") {
      if (!homeownerProfile) redirect("/onboarding/homeowner")
      return (
        <div className="min-h-screen bg-slate-900">
          <JobWizardModal
            companyProfile={homeownerProfile}
            userType="homeowner"
            initialPostcode={initialPostcode}
            initialIndustry={initialIndustry}
            initialService={initialService}
          />
        </div>
      )
    }

    if (companyProfile) {
      return (
        <div className="min-h-screen bg-slate-900">
          <JobWizardModal companyProfile={companyProfile} userType="company" initialIndustry={initialIndustry} initialService={initialService} />
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="max-w-md w-full mx-4 bg-slate-800 rounded-xl border border-slate-700/50 shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Account Setup Required</h1>
          <p className="text-slate-400 mb-6">
            Your account type ({userType || 'unknown'}) needs to be set up before posting jobs.
          </p>
          <a href="/onboarding" className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors">
            Complete Setup
          </a>
        </div>
      </div>
    )
  } catch (error) {
    console.error("[v0] Error in NewJobPage:", error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="max-w-md w-full mx-4 bg-slate-800 rounded-xl border border-slate-700/50 shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-slate-400 mb-6">There was an error loading the job posting form.</p>
          <a href="/dashboard" className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }
}
