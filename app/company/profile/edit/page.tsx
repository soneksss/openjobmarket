// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import CompanyProfileEditForm from "@/components/company-profile-edit-form"

export default async function CompanyProfileEditPage() {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("[COMPANY-PROFILE-EDIT] Auth error:", authError)
    redirect("/auth/login")
  }

  if (!user) {
    console.log("[COMPANY-PROFILE-EDIT] No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[COMPANY-PROFILE-EDIT] Loading profile for user:", user.id)

  // Get company profile
  const { data: companyProfile, error: profileError } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (profileError) {
    console.error("[COMPANY-PROFILE-EDIT] Profile error:", profileError)

    if (profileError.code === 'PGRST116') {
      // No rows returned - profile doesn't exist
      console.log("[COMPANY-PROFILE-EDIT] No profile found, redirecting to setup")
      redirect("/dashboard/company/setup")
    }

    // Other database error - show error page
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-400 mb-2">Error Loading Profile</h1>
            <p className="text-red-300 mb-4">
              Failed to load company profile: {profileError.message}
            </p>
            <a
              href="/dashboard/company"
              className="inline-block px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!companyProfile) {
    console.log("[COMPANY-PROFILE-EDIT] Profile is null, redirecting to setup")
    redirect("/dashboard/company/setup")
  }

  console.log("[COMPANY-PROFILE-EDIT] Profile loaded successfully:", companyProfile.company_name)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <CompanyProfileEditForm user={user as any} profile={companyProfile} />
      </div>
    </div>
  )
}
