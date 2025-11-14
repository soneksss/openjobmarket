import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import ProfessionalDetailView from "@/components/professional-detail-view"
import { generateLocalBusinessSchema } from "@/lib/schema-markup"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const { data: professional } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (!professional) {
    return {
      title: "Professional Not Found",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
  const fullName = `${professional.first_name} ${professional.last_name}`

  return {
    title: `${fullName} - ${professional.title} in ${professional.location} | OpenJobMarket`,
    description: `${professional.title} based in ${professional.location}. ${
      professional.bio?.substring(0, 150) || `Experienced ${professional.title} available for hire.`
    }`,
    keywords: [
      professional.title,
      professional.location,
      professional.experience_level,
      ...(professional.skills || []),
      fullName,
    ].filter(Boolean),
    openGraph: {
      title: `${fullName} - ${professional.title}`,
      description: professional.bio?.substring(0, 200) || `${professional.title} in ${professional.location}`,
      url: `${baseUrl}/professionals/${id}`,
      type: "profile",
      siteName: "OpenJobMarket",
      images: professional.profile_photo_url ? [{ url: professional.profile_photo_url }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${fullName} - ${professional.title}`,
      description: professional.bio?.substring(0, 200) || `${professional.title} in ${professional.location}`,
      images: professional.profile_photo_url ? [professional.profile_photo_url] : undefined,
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

export default async function ProfessionalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  console.log("[PROFESSIONAL-DETAIL] Loading professional detail page:", { professionalId: id })

  // Get professional profile details
  const { data: professional, error: professionalError } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (professionalError) {
    console.error("[PROFESSIONAL-DETAIL] Error fetching professional:", professionalError)
    notFound()
  }

  if (!professional) {
    console.log("[PROFESSIONAL-DETAIL] Professional not found:", id)
    notFound()
  }

  console.log("[PROFESSIONAL-DETAIL] Professional loaded successfully:", {
    professionalId: professional.id,
    name: `${professional.first_name} ${professional.last_name}`,
    title: professional.title
  })

  // Get current user to check if they can contact
  let user = null
  let userType = null
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.log("[PROFESSIONAL-DETAIL] Auth error (non-fatal):", authError.message)
    } else {
      user = authData.user
      console.log("[PROFESSIONAL-DETAIL] User session found:", {
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
          console.error("[PROFESSIONAL-DETAIL] Error fetching user data:", userError)
        } else {
          userType = userData?.user_type
          console.log("[PROFESSIONAL-DETAIL] User type:", userType)
        }
      }
    }
  } catch (error) {
    console.error("[PROFESSIONAL-DETAIL] Critical auth error:", error)
    // Continue without user - page should still work for anonymous users
  }

  // Fetch review statistics for schema markup
  let reviewStats = null
  try {
    const { data: stats } = await supabase
      .from("user_review_stats")
      .select("*")
      .eq("user_id", professional.user_id)
      .single()

    reviewStats = stats
  } catch (error) {
    // Reviews may not exist yet - that's OK
    console.log("[PROFESSIONAL-DETAIL] No review stats found (expected if reviews not implemented yet)")
  }

  // Generate schema markup for SEO
  const schemaMarkup = generateLocalBusinessSchema({
    id: professional.id,
    first_name: professional.first_name,
    last_name: professional.last_name,
    title: professional.title,
    bio: professional.bio || "",
    location: professional.location,
    skills: professional.skills || [],
    experience_level: professional.experience_level,
    profile_photo_url: professional.profile_photo_url,
    average_rating: reviewStats?.average_rating,
    review_count: reviewStats?.total_reviews,
  })

  return (
    <>
      {/* JSON-LD Schema Markup for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaMarkup }}
      />

      <ProfessionalDetailView
        professional={professional}
        user={user as any}
        userType={userType}
      />
    </>
  )
}