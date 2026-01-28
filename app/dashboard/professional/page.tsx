import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import ProfessionalDashboard from "@/components/professional-dashboard"
import { formatAccountTypeLabel } from "@/lib/account-type-label"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function ProfessionalDashboardPage() {
  console.log("[PROFESSIONAL-DASHBOARD-PAGE] Loading...")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[PROFESSIONAL-DASHBOARD-PAGE] User data:", { hasUser: !!user, userEmail: user?.email, userId: user?.id })

  if (!user) {
    console.log("[PROFESSIONAL-DASHBOARD-PAGE] No user found, redirecting to login")
    redirect("/auth/login")
  }

  // Get professional profile
  const { data: profile, error: profileError } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).single()

  // If no profile exists at all, redirect to complete profile
  if (!profile) {
    console.log("[PROFESSIONAL-DASHBOARD-PAGE] No profile found, redirecting to home with complete_profile prompt")
    redirect("/?complete_profile=true")
  }

  // Check profile completeness - but DON'T redirect, let dashboard handle it
  const missingFields: string[] = []
  if (!profile.first_name) missingFields.push("first_name")
  if (!profile.last_name) missingFields.push("last_name")
  if (!profile.title) missingFields.push("title")

  const isProfileComplete = missingFields.length === 0

  console.log("[PROFESSIONAL-DASHBOARD-PAGE] Profile validation:", {
    isProfileComplete,
    missingFields,
  })

  // Get recent job applications
  const { data: applications } = await supabase
    .from("job_applications")
    .select(`
      *,
      jobs (
        id,
        title,
        company_profiles (
          company_name
        )
      )
    `)
    .eq("professional_id", profile.id)
    .order("applied_at", { ascending: false })
    .limit(5)

  // Get saved jobs
  const { data: savedJobs } = await supabase
    .from("saved_jobs")
    .select(`
      *,
      jobs (
        id,
        title,
        location,
        job_type,
        company_profiles (
          company_name
        )
      )
    `)
    .eq("professional_id", profile.id)
    .order("saved_at", { ascending: false })
    .limit(5)

  // Get posted trade jobs (for jobseekers with is_homeowner=true)
  let postedTradeJobs: any[] = []
  const { data: homeownerProfile } = await supabase
    .from("homeowner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (homeownerProfile) {
    const { data: tradeJobs } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        description,
        location,
        category,
        urgency,
        budget_min,
        budget_max,
        status,
        created_at,
        expires_at,
        is_tradespeople_job
      `)
      .eq("homeowner_id", homeownerProfile.id)
      .eq("is_tradespeople_job", true)
      .order("created_at", { ascending: false })
      .limit(10)

    postedTradeJobs = tradeJobs || []
  }

  // Check if CV exists
  const { data: cvRecord } = await supabase
    .from("professional_cvs")
    .select("id")
    .eq("professional_id", profile.id)
    .single()

  // Get user roles for account type display
  const { data: userData } = await supabase
    .from("users")
    .select("account_type, is_jobseeker, is_homeowner, is_employer, is_tradespeople, user_type")
    .eq("id", user.id)
    .single()

  const accountTypeLabel = userData ? formatAccountTypeLabel(userData) : 'Individual - User'

  console.log("[PROFESSIONAL-DASHBOARD-PAGE] Passing user to component:", {
    hasUser: !!user,
    userEmail: user?.email,
    userEmailExists: !!user?.email,
    userObject: user,
    userKeys: user ? Object.keys(user) : [],
    accountTypeLabel
  })

  console.log("[PROFESSIONAL-DASHBOARD-PAGE] Profile data:", {
    hasProfile: !!profile,
    profilePhotoUrl: profile?.profile_photo_url,
    firstName: profile?.first_name,
    lastName: profile?.last_name
  })

  return (
    <ProfessionalDashboard
      user={user as any}
      profile={profile}
      applications={applications || []}
      savedJobs={savedJobs || []}
      postedTradeJobs={postedTradeJobs}
      hasCV={!!cvRecord}
      accountTypeLabel={accountTypeLabel}
      canPostTradeJobs={userData?.is_homeowner || false}
      isProfileComplete={isProfileComplete}
      missingFields={missingFields}
    />
  )
}
