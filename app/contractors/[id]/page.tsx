export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import ContractorDetailView from "@/components/contractor-detail-view"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const { data: contractor } = await supabase
    .from("contractor_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (!contractor) {
    return {
      title: "Contractor Not Found",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"

  return {
    title: `${contractor.company_name} - ${contractor.industry || 'Contractor'} in ${contractor.location || 'UK'} | OpenJobMarket`,
    description: `${contractor.description?.substring(0, 150) || `${contractor.company_name} - Professional contractor services`}`,
    keywords: [
      contractor.company_name,
      contractor.industry,
      contractor.location,
      ...(contractor.services || [])
    ].filter(Boolean),
    openGraph: {
      title: `${contractor.company_name} - ${contractor.industry || 'Contractor'}`,
      description: contractor.description?.substring(0, 200) || `Professional contractor in ${contractor.location}`,
      url: `${baseUrl}/contractors/${id}`,
      type: "website",
      siteName: "OpenJobMarket",
      images: contractor.profile_photo_url ? [{ url: contractor.profile_photo_url }] : undefined,
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

export default async function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  console.log("[CONTRACTOR-DETAIL] Loading contractor detail page:", { contractorId: id })

  // Get contractor profile details
  const { data: contractor, error: contractorError } = await supabase
    .from("contractor_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (contractorError) {
    console.error("[CONTRACTOR-DETAIL] Error fetching contractor:", contractorError)
    notFound()
  }

  if (!contractor) {
    console.log("[CONTRACTOR-DETAIL] Contractor not found:", id)
    notFound()
  }

  // Check if profile is visible and get messaging preference
  const { data: profileOwner } = await supabase
    .from("users")
    .select("profile_visible, allow_messages, id")
    .eq("id", contractor.user_id)
    .single()

  // If profile is not visible and viewer is not the owner, show 404
  if (profileOwner && !profileOwner.profile_visible) {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser || currentUser.id !== profileOwner.id) {
      console.log("[CONTRACTOR-DETAIL] Profile is private")
      notFound()
    }
  }

  console.log("[CONTRACTOR-DETAIL] Contractor loaded successfully:", {
    contractorId: contractor.id,
    name: contractor.company_name,
  })

  // Get current user to check if they can contact
  let user = null
  let userType = null
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.log("[CONTRACTOR-DETAIL] Auth error (non-fatal):", authError.message)
    } else {
      user = authData.user
      console.log("[CONTRACTOR-DETAIL] User session found:", {
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
          console.error("[CONTRACTOR-DETAIL] Error fetching user data:", userError)
        } else {
          userType = userData?.user_type
          console.log("[CONTRACTOR-DETAIL] User type:", userType)
        }
      }
    }
  } catch (error) {
    console.error("[CONTRACTOR-DETAIL] Critical auth error:", error)
  }

  return (
    <ContractorDetailView
      contractor={contractor}
      user={user as any}
      userType={userType}
      allowMessaging={profileOwner?.allow_messages ?? true}
    />
  )
}
