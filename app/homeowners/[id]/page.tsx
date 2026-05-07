export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import HomeownerDetailView from "@/components/homeowner-detail-view"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const { data: homeowner } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (!homeowner) {
    return {
      title: "Homeowner Not Found",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
  const fullName = `${homeowner.first_name} ${homeowner.last_name}`

  return {
    title: `${fullName} - Homeowner in ${homeowner.location || 'UK'} | OpenJobMarket`,
    description: `${homeowner.bio?.substring(0, 150) || `${fullName} - Homeowner posting jobs on OpenJobMarket`}`,
    keywords: [
      fullName,
      homeowner.location,
      "homeowner",
      "jobs",
      "tasks"
    ].filter(Boolean),
    openGraph: {
      title: `${fullName} - Homeowner`,
      description: homeowner.bio?.substring(0, 200) || `Homeowner in ${homeowner.location}`,
      url: `${baseUrl}/homeowners/${id}`,
      type: "profile",
      siteName: "OpenJobMarket",
      images: homeowner.profile_photo_url ? [{ url: homeowner.profile_photo_url }] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  }
}

export default async function HomeownerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  console.log("[HOMEOWNER-DETAIL] Loading homeowner detail page:", { homeownerId: id })

  // Get homeowner profile details
  const { data: homeowner, error: homeownerError } = await supabase
    .from("homeowner_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (homeownerError) {
    console.error("[HOMEOWNER-DETAIL] Error fetching homeowner:", homeownerError)
    notFound()
  }

  if (!homeowner) {
    console.log("[HOMEOWNER-DETAIL] Homeowner not found:", id)
    notFound()
  }

  // Check if profile is visible and get messaging preference
  const { data: profileOwner } = await supabase
    .from("users")
    .select("profile_visible, allow_messages, id")
    .eq("id", homeowner.user_id)
    .single()

  // If profile is not visible and viewer is not the owner, show 404
  if (profileOwner && !profileOwner.profile_visible) {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser || currentUser.id !== profileOwner.id) {
      console.log("[HOMEOWNER-DETAIL] Profile is private")
      notFound()
    }
  }

  console.log("[HOMEOWNER-DETAIL] Homeowner loaded successfully:", {
    homeownerId: homeowner.id,
    name: `${homeowner.first_name} ${homeowner.last_name}`,
  })

  // Get current user to check if they can contact
  let user: any = null
  let userType = null
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.log("[HOMEOWNER-DETAIL] Auth error (non-fatal):", authError.message)
    } else {
      user = authData.user
      console.log("[HOMEOWNER-DETAIL] User session found:", {
        userId: user?.id,
        email: user?.email
      })

      if (user) {
        // Get user type
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .single()

        if (userError) {
          console.error("[HOMEOWNER-DETAIL] Error fetching user data:", userError)
        } else {
          userType = userData?.user_type
          console.log("[HOMEOWNER-DETAIL] User type:", userType)
        }
      }
    }
  } catch (error) {
    console.error("[HOMEOWNER-DETAIL] Critical auth error:", error)
  }

  return (
    <HomeownerDetailView
      homeowner={homeowner}
      user={user as any}
      userType={userType}
      allowMessaging={profileOwner?.allow_messages ?? true}
    />
  )
}
