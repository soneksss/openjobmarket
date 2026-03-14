import { createClient } from "@/lib/server"
import { notFound, permanentRedirect } from "next/navigation"
import { Metadata } from "next"
import JobDetailView from "@/components/job-detail-view"
import { generateJobPostingSchema } from "@/lib/schema-markup"
import { requireVacancyEnabledForJob } from "@/lib/vacancy-guard"
import { isUUID } from "@/lib/slug"

/** Resolve a URL param (UUID or slug) to a job row */
async function resolveJob(supabase: Awaited<ReturnType<typeof createClient>>, param: string) {
  if (isUUID(param)) {
    const { data } = await supabase
      .from("jobs")
      .select(`*, company_profiles (company_name, location), homeowner_profiles (first_name, last_name)`)
      .eq("id", param)
      .single()
    return data
  }
  // Slug lookup
  const { data } = await supabase
    .from("jobs")
    .select(`*, company_profiles (company_name, location), homeowner_profiles (first_name, last_name)`)
    .eq("slug", param)
    .single()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const job = await resolveJob(supabase, id)

  if (!job) {
    return {
      title: "Job Not Found",
    }
  }

  // Get poster name (company or homeowner)
  const posterName = job.company_profiles?.company_name ||
    (job.homeowner_profiles ? `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name}` : "Poster")

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openjobmarket.com"
  const salaryText =
    job.budget_min && job.budget_max
      ? `£${job.budget_min.toLocaleString()} - £${job.budget_max.toLocaleString()}`
      : ""

  return {
    title: `${job.title} at ${posterName} | OpenJobMarket`,
    description: `${job.title} job in ${job.location}. ${
      salaryText ? ` - ${salaryText}` : ""
    }. ${job.description?.substring(0, 150)}...`,
    keywords: [
      job.title,
      job.location,
      job.work_location,
      posterName,
      "trade jobs",
      "local tradespeople",
    ].filter(Boolean),
    openGraph: {
      title: `${job.title} at ${posterName}`,
      description: job.description?.substring(0, 200),
      url: `${baseUrl}/jobs/${job.slug ?? job.id}`,
      type: "website",
      siteName: "OpenJobMarket",
    },
    twitter: {
      card: "summary_large_image",
      title: `${job.title} at ${posterName}`,
      description: job.description?.substring(0, 200),
    },
    robots: {
      index: job.is_active,
      follow: true,
      googleBot: {
        index: job.is_active,
        follow: true,
      },
    },
  }
}

export default async function JobDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id: rawParam } = await params
  const supabase = await createClient()
  const search = await searchParams

  console.log("[JOB-DETAIL] Loading job detail page:", { param: rawParam })

  let job: any = null

  if (isUUID(rawParam)) {
    // Legacy UUID URL — look up by id, then redirect to slug URL
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        company_profiles (id, company_name, description, industry, company_size, website_url, location, logo_url, user_id),
        homeowner_profiles (id, user_id, first_name, last_name, profile_photo_url)
      `)
      .eq("id", rawParam)
      .single()

    if (error || !data) {
      console.log("[JOB-DETAIL] Job not found by UUID:", rawParam)
      notFound()
    }

    job = data

    // Permanently redirect to slug URL so Google indexes the keyword-rich URL
    if (job.slug) {
      permanentRedirect(`/jobs/${job.slug}`)
    }
  } else {
    // Slug URL — look up by slug
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        company_profiles (id, company_name, description, industry, company_size, website_url, location, logo_url, user_id),
        homeowner_profiles (id, user_id, first_name, last_name, profile_photo_url)
      `)
      .eq("slug", rawParam)
      .single()

    if (error || !data) {
      console.log("[JOB-DETAIL] Job not found by slug:", rawParam)
      notFound()
    }

    job = data
  }

  await requireVacancyEnabledForJob(job.id)

  console.log("[JOB-DETAIL] Job loaded:", { jobId: job.id, slug: job.slug, title: job.title })

  // Get current user to check if they can apply
  let user = null
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.log("[JOB-DETAIL] Auth error (non-fatal):", authError.message)
    } else {
      user = authData.user
      console.log("[JOB-DETAIL] User session found:", {
        userId: user?.id,
        email: user?.email
      })
    }
  } catch (error) {
    console.error("[JOB-DETAIL] Critical auth error:", error)
    // Continue without user - page should still work for anonymous users
  }

  let userProfile = null
  let hasApplied = false
  let companyStatus = null

  if (user) {
    try {
      console.log("[JOB-DETAIL] Fetching user profile for:", user.id)

      // Check user type and get profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .single()

      if (userError) {
        console.error("[JOB-DETAIL] Error fetching user data:", userError)
      } else {
        console.log("[JOB-DETAIL] User type:", userData?.user_type, "Job is task:", job.is_tradespeople_job)

        // In the 2-role model, only company (tradesperson) users can apply to trade jobs
        if (userData?.user_type === "company") {
          const { data: profile, error: profileError } = await supabase
            .from("company_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single()

          if (profileError) {
            console.error("[JOB-DETAIL] Error fetching company profile:", profileError)
          } else if (profile) {
            userProfile = {
              ...profile,
              email: user.email || "",
              phone: profile.phone_number || null,
              first_name: profile.company_name || "Company",
              last_name: "",
              title: profile.industry || "Company",
              bio: profile.description || "",
              skills: [],
              location: profile.location || "",
              full_address: profile.location || "",
              nickname: profile.nickname || profile.company_name,
              hide_email: false,
              hide_personal_name: false,
              company_name: profile.company_name,
            }
            console.log("[JOB-DETAIL] Company profile loaded:", profile?.id)

            const { data: application, error: applicationError } = await supabase
              .from("job_applications")
              .select("id")
              .eq("job_id", job.id)
              .eq("company_id", profile.id)
              .single()

            if (applicationError && applicationError.code !== 'PGRST116') {
              console.error("[JOB-DETAIL] Error checking application status:", applicationError)
            } else {
              hasApplied = !!application
              console.log("[JOB-DETAIL] Application status:", { hasApplied, applicationId: application?.id })
            }
          }
        } else {
          console.log("[JOB-DETAIL] User type is not company — no profile loaded")
        }
      }
    } catch (error) {
      console.error("[JOB-DETAIL] Error in user profile flow:", error)
    }
  }

  // Get poster status (company or homeowner)
  const posterUserId = job.company_profiles?.user_id || job.homeowner_profiles?.user_id

  try {
    if (posterUserId) {
      const { data: posterUser, error: posterError } = await supabase
        .from("users")
        .select("id")
        .eq("id", posterUserId)
        .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (posterError) {
        console.error("[JOB-DETAIL] Error fetching poster user:", posterError)
        // Set default status even if user fetch fails
        companyStatus = { isActive: true }
      } else if (posterUser) {
        companyStatus = { isActive: true } // Poster is active by default
        console.log("[JOB-DETAIL] Poster status set as active")
      } else {
        // User not found in users table, but job exists - still show as active
        console.log("[JOB-DETAIL] Poster user not found, but setting as active anyway")
        companyStatus = { isActive: true }
      }
    } else {
      // No poster user ID found, but job exists - set as active
      companyStatus = { isActive: true }
    }
  } catch (error) {
    console.error("[JOB-DETAIL] Error in poster status flow:", error)
    // Even on error, set status as active so the page doesn't break
    companyStatus = { isActive: true }
  }

  // Fetch poster rating and reviews
  let companyRating = { average_rating: 0, total_reviews: 0 }
  let companyReviews: any[] = []

  if (posterUserId) {
    // Get rating stats
    const { data: ratingData } = await supabase
      .from("user_review_stats")
      .select("average_rating, total_reviews")
      .eq("user_id", posterUserId)
      .single()

    if (ratingData) {
      companyRating = {
        average_rating: ratingData.average_rating || 0,
        total_reviews: ratingData.total_reviews || 0,
      }
    }

    // Get all reviews for the poster
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        review_text,
        created_at,
        is_edited,
        reviewer_id
      `)
      .eq("reviewee_id", posterUserId)
      .order("created_at", { ascending: false })

    if (reviewsError) {
      console.error("[JOB-DETAIL] Error fetching reviews:", reviewsError)
    }

    if (reviewsData) {
      // Fetch reviewer names — 2-role model: company_profiles (tradespeople) or homeowner_profiles
      const reviewsWithNames = await Promise.all(
        reviewsData.map(async (review) => {
          let reviewerName = "Anonymous"
          let reviewerAvatar: string | null = null

          const { data: companyProfile } = await supabase
            .from("company_profiles")
            .select("company_name, logo_url")
            .eq("user_id", review.reviewer_id)
            .single()

          if (companyProfile) {
            reviewerName = companyProfile.company_name
            reviewerAvatar = companyProfile.logo_url
          } else {
            const { data: homeownerProfile } = await supabase
              .from("homeowner_profiles")
              .select("first_name, last_name, profile_photo_url")
              .eq("user_id", review.reviewer_id)
              .single()

            if (homeownerProfile) {
              reviewerName = `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim()
              reviewerAvatar = homeownerProfile.profile_photo_url ?? null
            }
          }

          return {
            ...review,
            reviewer_name: reviewerName,
            reviewer_avatar: reviewerAvatar,
          }
        })
      )

      companyReviews = reviewsWithNames
    }
  }

  // Generate schema markup for SEO — trade jobs are posted by homeowners
  const posterName = job.homeowner_profiles
    ? `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name}`.trim()
    : "Open Job Market"

  const schemaMarkup = generateJobPostingSchema({
    id: job.id,
    title: job.title,
    description: job.description,
    company_name: posterName,
    location: job.location,
    work_location: job.work_location,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
    created_at: job.created_at,
    expires_at: job.expires_at,
    is_tradespeople_job: job.is_tradespeople_job,
  })

  return (
    <>
      {/* JSON-LD Schema Markup for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaMarkup }}
      />

      <JobDetailView
        job={job}
        user={user as any}
        userProfile={userProfile}
        hasApplied={hasApplied}
        companyStatus={companyStatus}
        searchParams={search}
        companyRating={companyRating}
        companyReviews={companyReviews}
      />
    </>
  )
}
