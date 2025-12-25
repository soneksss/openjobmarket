// Unified profile page that redirects to the appropriate user-type-specific profile
import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function UnifiedProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  console.log("[UNIFIED-PROFILE] Loading profile for user_id:", id)

  // First, check what type of user this is by checking the users table
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, user_type, is_active")
    .eq("id", id)
    .single()

  if (userError || !user) {
    console.error("[UNIFIED-PROFILE] Error fetching user:", userError)
    notFound()
  }

  // Check if user account is active
  if (!user.is_active) {
    console.log("[UNIFIED-PROFILE] User account is inactive")
    notFound()
  }

  console.log("[UNIFIED-PROFILE] User found:", { userId: user.id, userType: user.user_type })

  // Based on user type, get the profile_id and redirect to appropriate page
  switch (user.user_type) {
    case "professional": {
      const { data: profile } = await supabase
        .from("professional_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!profile) {
        notFound()
      }

      redirect(`/professionals/${profile.id}`)
    }

    case "company": {
      const { data: profile } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!profile) {
        notFound()
      }

      redirect(`/companies/${profile.id}`)
    }

    case "homeowner": {
      const { data: profile } = await supabase
        .from("homeowner_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!profile) {
        notFound()
      }

      redirect(`/homeowners/${profile.id}`)
    }

    case "contractor": {
      const { data: profile } = await supabase
        .from("contractor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (!profile) {
        notFound()
      }

      redirect(`/contractors/${profile.id}`)
    }

    default:
      console.error("[UNIFIED-PROFILE] Unknown user type:", user.user_type)
      notFound()
  }
}
