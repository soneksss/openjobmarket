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
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-800 mb-2">Error Loading Profile</h1>
          <p className="text-red-700 mb-4">
            Failed to load company profile: {profileError.message}
          </p>
          <a
            href="/dashboard/company"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </a>
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
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <CompanyProfileEditForm user={user as any} profile={companyProfile} />
    </div>
  )
}
