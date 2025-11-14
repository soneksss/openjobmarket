import { createClient } from "@/lib/server"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import JobDetailView from "@/components/job-detail-view"
import { generateJobPostingSchema } from "@/lib/schema-markup"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClient()
  const { id } = await params

  const { data: job } = await supabase
    .from("jobs")
    .select(`
      *,
      company_profiles (company_name, location),
      homeowner_profiles (first_name, last_name)
    `)
    .eq("id", id)
    .single()

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
    job.salary_min && job.salary_max
      ? `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()}`
      : ""

  return {
    title: `${job.title} at ${posterName} | OpenJobMarket`,
    description: `${job.title} job in ${job.location}. ${job.job_type} position${
      salaryText ? ` - ${salaryText}` : ""
    }. ${job.description?.substring(0, 150)}...`,
    keywords: [
      job.title,
      job.location,
      job.job_type,
      job.work_location,
      posterName,
      "jobs",
      "vacancies",
      "careers",
    ].filter(Boolean),
    openGraph: {
      title: `${job.title} at ${posterName}`,
      description: job.description?.substring(0, 200),
      url: `${baseUrl}/jobs/${id}`,
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
  const supabase = await createClient()
  const { id } = await params
  const search = await searchParams

  console.log("[JOB-DETAIL] Loading job detail page:", { jobId: id, searchParams: search })

  // Get job details with company and homeowner information
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      *,
      company_profiles (
        id,
        company_name,
        description,
        industry,
        company_size,
        website_url,
        location,
        logo_url,
        user_id
      ),
      homeowner_profiles (
        id,
        user_id,
        first_name,
        last_name,
        profile_photo_url
      )
    `)
    .eq("id", id)
    .single()

  if (jobError) {
    console.error("[JOB-DETAIL] Error fetching job:", jobError)
    notFound()
  }

  if (!job) {
    console.log("[JOB-DETAIL] Job not found:", id)
    notFound()
  }

  console.log("[JOB-DETAIL] Job loaded successfully:", {
    jobId: job.id,
    title: job.title,
    companyId: job.company_profiles?.id,
    hasJobPhoto: !!job.job_photo_url,
    jobPhotoUrl: job.job_photo_url
  })

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

        // For tasks (is_tradespeople_job = true), companies apply
        // For regular jobs (is_tradespeople_job = false), professionals apply
        if (job.is_tradespeople_job && userData?.user_type === "company") {
          // Fetch company profile for task applications
          const { data: profile, error: profileError } = await supabase
            .from("company_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single()

          if (profileError) {
            console.error("[JOB-DETAIL] Error fetching company profile:", profileError)
          } else if (profile) {
            // Transform company profile to match UserProfile interface expected by JobApplicationForm
            // Use user.email since we already have the authenticated user object
            userProfile = {
              ...profile,
              email: user.email || "",
              phone: profile.phone_number || null,
              // Map company fields to professional fields for compatibility
              first_name: profile.company_name || "Company",
              last_name: "", // Companies don't have last names
              title: profile.industry || "Company",
              bio: profile.description || "",
              skills: [], // Companies don't have skills array
              location: profile.location || "",
              full_address: profile.location || "",
              nickname: profile.nickname || profile.company_name,
              hide_email: false,
              hide_personal_name: false,
            }
            console.log("[JOB-DETAIL] Company profile loaded and transformed for task:", profile?.id)

            // Check if company has already applied (checking professional_id as fallback if no company_id field exists)
            if (profile) {
              const { data: application, error: applicationError } = await supabase
                .from("job_applications")
                .select("id")
                .eq("job_id", job.id)
                .eq("professional_id", profile.id) // Using professional_id field for now
                .single()

              if (applicationError && applicationError.code !== 'PGRST116') {
                console.error("[JOB-DETAIL] Error checking company application status:", applicationError)
              } else {
                hasApplied = !!application
                console.log("[JOB-DETAIL] Company application status:", { hasApplied, applicationId: application?.id })
              }
            }
          }
        } else if (!job.is_tradespeople_job && userData?.user_type === "professional") {
          // Fetch professional profile for regular job applications
          const { data: profile, error: profileError} = await supabase
            .from("professional_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single()

          if (profileError) {
            console.error("[JOB-DETAIL] Error fetching professional profile:", profileError)
          } else if (profile) {
            // Add email from authenticated user object
            userProfile = {
              ...profile,
              email: user.email || "",
              phone: profile.phone
            }
            console.log("[JOB-DETAIL] Professional profile loaded:", profile?.id)

            // Check if user has already applied
            if (profile) {
              const { data: application, error: applicationError } = await supabase
                .from("job_applications")
                .select("id")
                .eq("job_id", job.id)
                .eq("professional_id", profile.id)
                .single()

              if (applicationError && applicationError.code !== 'PGRST116') {
                console.error("[JOB-DETAIL] Error checking application status:", applicationError)
              } else {
                hasApplied = !!application
                console.log("[JOB-DETAIL] Application status:", { hasApplied, applicationId: application?.id })
              }
            }
          }
        } else {
          console.log("[JOB-DETAIL] User type doesn't match job type - no profile loaded")
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
      // Fetch reviewer names and avatars from all possible profile types
      const reviewsWithNames = await Promise.all(
        reviewsData.map(async (review) => {
          let reviewerName = "Anonymous"
          let reviewerAvatar: string | null = null

          // Try professional profile first
          const { data: profProfile } = await supabase
            .from("professional_profiles")
            .select("first_name, last_name, profile_photo_url")
            .eq("user_id", review.reviewer_id)
            .single()

          if (profProfile) {
            reviewerName = `${profProfile.first_name} ${profProfile.last_name}`
            reviewerAvatar = profProfile.profile_photo_url
          } else {
            // Try company profile
            const { data: companyProfile } = await supabase
              .from("company_profiles")
              .select("company_name, logo_url")
              .eq("user_id", review.reviewer_id)
              .single()

            if (companyProfile) {
              reviewerName = companyProfile.company_name
              reviewerAvatar = companyProfile.logo_url
            } else {
              // Try contractor profile
              const { data: contractorProfile } = await supabase
                .from("contractor_profiles")
                .select("business_name, profile_picture")
                .eq("user_id", review.reviewer_id)
                .single()

              if (contractorProfile) {
                reviewerName = contractorProfile.business_name
                reviewerAvatar = contractorProfile.profile_picture
              } else {
                // Fallback to user email
                const { data: userData } = await supabase
                  .from("users")
                  .select("email")
                  .eq("id", review.reviewer_id)
                  .single()

                if (userData?.email) {
                  // Use email username as name (before @)
                  reviewerName = userData.email.split('@')[0]
                }
              }
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

  // Generate schema markup for SEO
  const posterName = job.company_profiles?.company_name ||
    (job.homeowner_profiles ? `${job.homeowner_profiles.first_name} ${job.homeowner_profiles.last_name}` : "Poster")

  const schemaMarkup = generateJobPostingSchema({
    id: job.id,
    title: job.title,
    description: job.description,
    company_name: posterName,
    location: job.location,
    job_type: job.job_type,
    work_location: job.work_location,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    created_at: job.created_at,
    expires_at: job.expires_at,
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
