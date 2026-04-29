import { Suspense } from "react"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { HomeownerDashboard } from "@/components/homeowner-dashboard"
import { getHomeownerJobs, getHomeownerReviews, getSavedTradespeople } from "@/lib/queries"
import { getDashboardBootstrap } from "@/lib/bootstrap"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function HomeownerDashboardPage() {
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  } catch {
    // AbortError (timeout from createClient)
  }

  if (!user) redirect("/auth/login")

  // Guard: redirect non-homeowners to their correct dashboard
  const { data: userData } = await supabase.from("users").select("user_type").eq("id", user.id).single()
  if (userData?.user_type === "company") redirect("/dashboard/company")
  if (userData?.user_type === "professional") redirect("/dashboard/company")

  // Bootstrap: adminSettings + future featureFlags/permissions (cached, shared across requests)
  await getDashboardBootstrap(user.id)

  // Get homeowner profile (with create-if-missing fallback — NOT cached, has side effects)
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
    console.log("[HOMEOWNER] Could not create homeowner profile, redirecting to onboarding")
    redirect("/onboarding")
  }

  console.log("[HOMEOWNER] Profile found:", profile.first_name, profile.last_name, "ID:", profile.id)

  const missingFields: string[] = []
  if (!profile.first_name) missingFields.push("first_name")
  if (!profile.last_name) missingFields.push("last_name")
  if (!profile.location) missingFields.push("location")
  const isProfileComplete = missingFields.length === 0

  // Profile is ready — stream in the heavy data sections while showing skeleton
  return (
    <Suspense fallback={<DashboardSkeleton profile={profile} isProfileComplete={isProfileComplete} missingFields={missingFields} />}>
      <DashboardData
        user={user}
        profile={profile}
        isProfileComplete={isProfileComplete}
        missingFields={missingFields}
      />
    </Suspense>
  )
}

// ─── Async data section — streamed in after profile renders ─────────────────

async function DashboardData({
  user,
  profile,
  isProfileComplete,
  missingFields,
}: {
  user: any
  profile: any
  isProfileComplete: boolean
  missingFields: string[]
}) {
  // All three queries run in parallel, served from cache on repeat visits
  const [jobs, reviews, savedTradespeople] = await Promise.all([
    getHomeownerJobs(profile.id, user.id),
    getHomeownerReviews(user.id),
    getSavedTradespeople(profile.id, user.id),
  ])

  return (
    <HomeownerDashboard
      user={user}
      profile={profile}
      jobs={jobs}
      savedTradespeople={savedTradespeople}
      isProfileComplete={isProfileComplete}
      missingFields={missingFields}
      reviews={reviews}
    />
  )
}

// ─── Skeleton — shown instantly while DashboardData streams ─────────────────

function DashboardSkeleton({
  profile,
  isProfileComplete,
  missingFields,
}: {
  profile: any
  isProfileComplete: boolean
  missingFields: string[]
}) {
  const displayName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Homeowner"
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "HO"

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Profile incomplete banner */}
      {!isProfileComplete && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-amber-400/40 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Complete your profile</p>
            <p className="text-xs text-amber-400/70">Missing: {missingFields.join(", ")}</p>
          </div>
        </div>
      )}

      {/* Profile header — real data, shown instantly */}
      <div className="bg-slate-800 px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-emerald-400">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold truncate">{displayName}</p>
            <div className="h-3 w-32 bg-slate-700 rounded animate-pulse mt-1" />
          </div>
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-3">
            <div className="h-6 w-8 bg-slate-700 rounded animate-pulse mb-1" />
            <div className="h-3 w-14 bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Jobs list skeleton */}
      <div className="px-4 space-y-3">
        <div className="h-4 w-24 bg-slate-700 rounded animate-pulse mb-2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-4 space-y-2">
            <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-32 bg-slate-700/60 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
