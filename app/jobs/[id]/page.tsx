import { createClient, createAdminClient } from "@/lib/server"
import { notFound, permanentRedirect } from "next/navigation"
import { Metadata } from "next"
import JobDetailView from "@/components/job-detail-view"
import { generateJobPostingSchema } from "@/lib/schema-markup"
import { requireVacancyEnabledForJob } from "@/lib/vacancy-guard"
import { isUUID } from "@/lib/slug"

// Use FK column hints to disambiguate: jobs has two FKs to company_profiles
// (company_id and confirmed_tradesperson_id) — without a hint PostgREST errors.
const JOB_SELECT = `*, company_profiles!company_id (id, company_name, description, industry, company_size, website_url, location, logo_url, user_id), homeowner_profiles!homeowner_id (id, user_id, first_name, last_name, profile_photo_url)`

/**
 * Resolve a URL param (UUID or slug) to a job row.
 * Uses the admin client so RLS never hides a job from a tradesperson
 * who received a notification — job listings are public information.
 */
async function resolveJob(param: string) {
  const admin = createAdminClient()
  const filter = isUUID(param)
    ? { column: "id", value: param }
    : { column: "slug", value: param }

  const { data, error } = await admin
    .from("jobs")
    .select(JOB_SELECT)
    .eq(filter.column, filter.value)
    .maybeSingle()

  if (error) {
    console.error("[JOB-DETAIL] resolveJob query error:", error.message, {
      code: error.code,
      details: (error as any).details,
      hint: (error as any).hint,
      param,
    })
    // Fallback: fetch job without profile joins in case of relationship error
    const { data: bare, error: bareError } = await admin
      .from("jobs")
      .select("*, company_profiles!company_id(id, company_name, logo_url, user_id), homeowner_profiles!homeowner_id(id, user_id, first_name, last_name)")
      .eq(filter.column, filter.value)
      .maybeSingle()
    if (bareError) {
      console.error("[JOB-DETAIL] Fallback query also failed:", bareError.message)
      return null
    }
    return bare ?? null
  }

  return data ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  const job = await resolveJob(id)

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

  // Use admin client for job SELECT — job listings are public data, and RLS
  // would otherwise hide homeowner-posted trade jobs from company (tradesperson)
  // users who received a notification and are trying to view and apply.
  const job: any = await resolveJob(rawParam)

  if (!job) {
    console.log("[JOB-DETAIL] Job not found:", rawParam)
    notFound()
  }

  // Permanently redirect UUID → slug so Google indexes the canonical URL
  if (isUUID(rawParam) && job.slug) {
    permanentRedirect(`/jobs/${job.slug}`)
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
  let companyStatus = null        // poster activity status { isActive: true }
  let applicationStatus: string | null = null  // tradesperson's application status string
  let isJobOwner = false
  let jobApplications: any[] = []
  let serverUserType: string | null = null
  let hasReviewedHomeowner = false

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
        serverUserType = userData?.user_type ?? null
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
              .select("id, status")
              .eq("job_id", job.id)
              .eq("company_id", profile.id)
              .single()

            if (applicationError && applicationError.code !== 'PGRST116') {
              console.error("[JOB-DETAIL] Error checking application status:", applicationError)
            } else {
              hasApplied = !!application
              applicationStatus = application?.status ?? null

              // confirm_tradesperson() never changes the winner's application status
              // (it stays PENDING). Detect confirmation by checking confirmed_tradesperson_id.
              const isConfirmedTradesperson =
                ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(job.status) &&
                job.confirmed_tradesperson_id === profile.id
              if (isConfirmedTradesperson) {
                applicationStatus = job.status === "COMPLETED" ? "JOB_COMPLETED" : "CONFIRMED"
              }

              // Check if tradesperson already reviewed the homeowner for this job
              if (job.status === "COMPLETED" && job.homeowner_profiles?.user_id && isConfirmedTradesperson) {
                const { data: existingReview } = await supabase
                  .from("reviews")
                  .select("id")
                  .eq("job_id", job.id)
                  .eq("reviewer_id", user.id)
                  .eq("reviewed_id", job.homeowner_profiles.user_id)
                  .maybeSingle()
                hasReviewedHomeowner = !!existingReview
              }

              console.log("[JOB-DETAIL] Application status:", { hasApplied, applicationId: application?.id, status: applicationStatus, isConfirmedTradesperson })
            }
          }
        } else if (userData?.user_type === "homeowner") {
          // Homeowner — check if they own this job
          const { data: hp } = await supabase
            .from("homeowner_profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle()

          console.log("[JOB-DETAIL] Homeowner profile:", hp?.id, "job.homeowner_id:", job.homeowner_id)

          // String comparison guards against any UUID-type mismatch
          if (hp && String(job.homeowner_id) === String(hp.id)) {
            isJobOwner = true

            // Admin client bypasses RLS — never filter by user_id here
            try {
              const admin = createAdminClient()
              const { data: apps, error: appsError } = await admin
                .from("job_applications")
                .select(`
                  id, status, applied_at, cover_letter, tradesperson_id, company_id,
                  company_profiles!company_id (
                    id, user_id, company_name, logo_url, location, industry
                  )
                `)
                .eq("job_id", job.id)
                .not("status", "eq", "WITHDRAWN")
                .order("applied_at", { ascending: false })

              if (appsError) {
                console.error("[JOB-DETAIL] Applications query error:", appsError.message, appsError)
              } else {
                console.log("[JOB-DETAIL] Applications loaded:", apps?.length ?? 0)
              }

              jobApplications = apps ?? []
            } catch (adminErr) {
              console.error("[JOB-DETAIL] Admin client error (SUPABASE_SERVICE_ROLE_KEY missing?):", adminErr)
            }
          } else {
            console.log("[JOB-DETAIL] Homeowner profile mismatch or hp null — not setting isJobOwner")
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
        applicationStatus={applicationStatus}
        searchParams={search}
        companyRating={companyRating}
        companyReviews={companyReviews}
        isJobOwner={isJobOwner}
        jobApplications={jobApplications}
        serverUserType={serverUserType}
        hasReviewedHomeowner={hasReviewedHomeowner}
      />
    </>
  )
}
