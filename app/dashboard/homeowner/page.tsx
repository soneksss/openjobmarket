import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerDashboard } from "@/components/homeowner-dashboard"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function HomeownerDashboardPage() {
  console.log("[HOMEOWNER] Dashboard page loading...")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[HOMEOWNER] No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[HOMEOWNER] User found:", user.id)

  // Get homeowner profile
  let profile: any = null
  {
    const { data: profileData, error: profileError } = await supabase
      .from("homeowner_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileError) {
      console.warn("[HOMEOWNER] Profile error:", profileError)
    }

    if (!profileData) {
      // Profile missing — try to create it from auth metadata on the fly
      console.log("[HOMEOWNER] No profile found, attempting to create from signup data")
      await supabase.rpc("complete_user_profile_after_verification", { p_user_id: user.id })
      // Re-fetch after creation attempt
      const { data: retryData } = await supabase
        .from("homeowner_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!retryData) {
        // RPC failed — insert minimal profile directly from auth metadata
        console.log("[HOMEOWNER] RPC failed, inserting minimal profile directly")
        const metadata = user.user_metadata || {}
        const { data: insertedProfile, error: insertError } = await supabase
          .from("homeowner_profiles")
          .insert({
            user_id: user.id,
            first_name: metadata.first_name || metadata.name?.split(" ")[0] || "User",
            last_name: metadata.last_name || metadata.name?.split(" ").slice(1).join(" ") || user.email?.split("@")[0] || "User",
            location: metadata.location || null,
          })
          .select()
          .single()
        if (insertError) {
          console.error("[HOMEOWNER] Direct insert failed:", insertError)
        }
        profile = insertedProfile
      } else {
        profile = retryData
      }
    } else {
      profile = profileData
    }
  }

  if (!profile) {
    console.log("[HOMEOWNER] Could not create homeowner profile, redirecting to home")
    redirect("/?complete_profile=true")
  }

  console.log("[HOMEOWNER] Homeowner profile found:", profile.first_name, profile.last_name, "Profile ID:", profile.id, "User ID:", user.id)

  // Check profile completeness - but DON'T redirect, let dashboard handle it
  const missingFields: string[] = []
  if (!profile.first_name) missingFields.push("first_name")
  if (!profile.last_name) missingFields.push("last_name")
  if (!profile.location) missingFields.push("location")

  const isProfileComplete = missingFields.length === 0

  console.log("[HOMEOWNER] Profile validation:", {
    isProfileComplete,
    missingFields,
  })

  // Get homeowner's posted jobs/tasks from the jobs table
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      short_description,
      location,
      budget_min,
      budget_max,
      budget_period,
      is_active,
      expires_at,
      created_at,
      updated_at,
      is_tradespeople_job,
      work_location,
      applications_count,
      views_count
    `)
    .eq("homeowner_id", profile.id)
    .order("created_at", { ascending: false })

  if (jobsError) {
    console.log("[HOMEOWNER] Jobs error:", jobsError)
  }

  console.log("[HOMEOWNER] Jobs found:", jobs?.length || 0)

  // Get saved tradespeople
  const { data: savedRaw } = await supabase
    .from("saved_traders")
    .select(`
      id,
      professional_id,
      professional_profiles (
        id,
        user_id,
        first_name,
        last_name,
        nickname,
        title,
        location,
        profile_photo_url,
        skills,
        average_rating,
        reviews_count
      )
    `)
    .eq("homeowner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const savedTradespeople = (savedRaw || []).filter((s: any) => s.professional_profiles)

  return (
    <HomeownerDashboard
      user={user}
      profile={profile}
      jobs={jobs || []}
      savedTradespeople={savedTradespeople}
      isProfileComplete={isProfileComplete}
      missingFields={missingFields}
    />
  )
}
