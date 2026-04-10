import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import CompanyDashboard from "@/components/company-dashboard"
import { getDashboardBootstrap } from "@/lib/bootstrap"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export default async function CompanyDashboardPage() {
  console.log("[v0] Company dashboard page loading...")

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] User found:", user.id)

  // Bootstrap: adminSettings + future featureFlags/permissions (cached, shared across requests)
  await getDashboardBootstrap(user.id)

  // Get company profile
  let profile: any = null
  {
    const { data: profileData, error: profileError } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileError) {
      console.log("[v0] Profile error:", profileError)
    }

    if (!profileData) {
      // Profile missing — try RPC first
      console.log("[v0] No company profile found, attempting to create from signup data")
      await supabase.rpc("complete_user_profile_after_verification", { p_user_id: user.id })
      const { data: retryData } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!retryData) {
        // RPC failed — insert minimal profile directly from auth metadata
        console.log("[v0] RPC failed, inserting minimal company profile directly")
        const metadata = user.user_metadata || {}
        const { data: insertedProfile, error: insertError } = await supabase
          .from("company_profiles")
          .insert({
            user_id: user.id,
            company_name: metadata.company_name || metadata.first_name || user.email?.split("@")[0] || "My Business",
            industry: metadata.industry || metadata.trade || "General",
            location: metadata.location || null,
          })
          .select()
          .single()
        if (insertError) {
          console.error("[v0] Direct insert failed:", insertError)
        }
        profile = insertedProfile
      } else {
        profile = retryData
      }
    } else {
      profile = profileData
    }
  }

  // If still no profile after all attempts, redirect
  if (!profile) {
    console.log("[v0] No company profile found, redirecting to home with complete_profile prompt")
    redirect("/?complete_profile=true")
  }

  console.log("[v0] Company profile found:", profile.company_name)

  // Check profile completeness - but DON'T redirect, let dashboard handle it
  const missingFields: string[] = []
  if (!profile.company_name) missingFields.push("company_name")
  if (!profile.industry) missingFields.push("industry")
  if (!profile.location) missingFields.push("location")

  const isProfileComplete = missingFields.length === 0

  console.log("[v0] Profile validation check:", {
    isProfileComplete,
    missingFields,
  })

  // Get company rating
  const { data: ratingData } = await supabase
    .from("user_review_stats")
    .select("*")
    .eq("user_id", user.id)
    .single()

  const companyRating = {
    average_rating: ratingData?.average_rating || 0,
    total_reviews: ratingData?.total_reviews || 0,
  }

  // Get all reviews for the company
  let companyReviews: any[] = []
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
    .eq("reviewee_id", user.id)
    .order("created_at", { ascending: false })

  if (reviewsError) {
    console.warn("[COMPANY-DASHBOARD] Error fetching reviews:", reviewsError)
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

  const { data: jobs, error: jobsError } = await supabase
    .from("job_status_view")
    .select("*")
    .eq("company_id", profile.id)
    .order("created_at", { ascending: false })

  if (jobsError) {
    console.log("[v0] Jobs error:", jobsError)
  }

  console.log("[v0] Jobs found:", jobs?.length || 0)
  console.log("[v0] Jobs data with is_tradespeople_job:", jobs?.map(j => ({
    id: j.id,
    title: j.title,
    is_tradespeople_job: j.is_tradespeople_job,
    job_type: j.job_type
  })))

  // Get application counts for each job (with status breakdown)
  const jobIds = jobs?.map((job) => job.id) || []
  const { data: applicationCounts, error: countsError } = await supabase
    .from("job_applications")
    .select("job_id, status")
    .in("job_id", jobIds)

  if (countsError) {
    console.log("[v0] Application counts error:", countsError)
  }

  // Count applications per job (total and by status)
  const applicationCountsMap = new Map()
  const applicationStatusMap = new Map() // Map<job_id, Map<status, count>>

  applicationCounts?.forEach((app) => {
    // Total count
    const count = applicationCountsMap.get(app.job_id) || 0
    applicationCountsMap.set(app.job_id, count + 1)

    // Status breakdown
    if (!applicationStatusMap.has(app.job_id)) {
      applicationStatusMap.set(app.job_id, new Map())
    }
    const statusMap = applicationStatusMap.get(app.job_id)!
    const statusCount = statusMap.get(app.status) || 0
    statusMap.set(app.status, statusCount + 1)
  })

  // Get recent applications RECEIVED for jobs posted by this company (support both professional and company applicants)
  const { data: receivedApplications, error: applicationsError } = await supabase
    .from("job_applications")
    .select(`
      id,
      status,
      applied_at,
      job_id,
      professional_id,
      company_id
    `)
    .in("job_id", jobIds)
    .order("applied_at", { ascending: false })
    .limit(10)

  if (applicationsError) {
    console.log("[v0] Received applications error:", applicationsError)
  }

  console.log("[v0] Received applications found:", receivedApplications?.length || 0)

  // Get recent applications SUBMITTED by this company
  const { data: submittedApplications, error: submittedError } = await supabase
    .from("job_applications")
    .select(`
      id,
      status,
      applied_at,
      job_id
    `)
    .eq("company_id", profile.id)
    .order("applied_at", { ascending: false })
    .limit(5)

  if (submittedError) {
    console.log("[v0] Submitted applications error:", submittedError)
  }

  console.log("[v0] Submitted applications found:", submittedApplications?.length || 0)

  // Get job details for RECEIVED applications
  const applicationJobIds = receivedApplications?.map((app) => app.job_id) || []
  const professionalIds = receivedApplications?.map((app) => app.professional_id).filter((id): id is string => id !== null) || []
  const companyIds = receivedApplications?.map((app) => app.company_id).filter((id): id is string => id !== null) || []

  const { data: jobDetails } = await supabase.from("jobs").select("id, title").in("id", applicationJobIds)

  // Fetch both professional and company profiles
  const { data: professionalDetails } = await supabase
    .from("professional_profiles")
    .select("id, first_name, last_name, title, location, profile_photo_url, user_id")
    .in("id", professionalIds)

  const { data: companyDetails } = await supabase
    .from("company_profiles")
    .select("id, company_name, industry, location, logo_url, user_id")
    .in("id", companyIds)

  // Enrich RECEIVED applications with job and applicant details (professional or company)
  // Filter out applications from unknown/old user types (neither professional nor company)
  const enrichedReceivedApplications =
    receivedApplications
      ?.map((app) => {
        // Skip applications without a valid applicant type
        if (!app.professional_id && !app.company_id) {
          return null
        }

        const jobInfo = jobDetails?.find((job) => job.id === app.job_id) || {
          id: app.job_id,
          title: "Unknown Job",
        }

        // Determine applicant type and attach appropriate profile
        if (app.professional_id) {
          return {
            ...app,
            jobs: jobInfo,
            professional_profiles: professionalDetails?.find((prof) => prof.id === app.professional_id) || {
              id: app.professional_id || "unknown",
              first_name: "Unknown",
              last_name: "User",
              title: "Professional",
              location: "Unknown",
              profile_photo_url: undefined,
              user_id: undefined,
            },
            company_profiles: null,
            applicant_type: "professional" as const,
          }
        } else {
          // app.company_id must be set at this point
          return {
            ...app,
            jobs: jobInfo,
            professional_profiles: null,
            company_profiles: companyDetails?.find((comp) => comp.id === app.company_id) || {
              id: app.company_id || "unknown",
              company_name: "Unknown Company",
              industry: "Company",
              location: "Unknown",
              logo_url: undefined,
              user_id: undefined,
            },
            applicant_type: "company" as const,
          }
        }
      })
      .filter((app): app is NonNullable<typeof app> => app !== null) || []

  // Get job details for SUBMITTED applications
  const submittedJobIds = submittedApplications?.map((app) => app.job_id) || []
  const { data: submittedJobDetails } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      location,
      job_type,
      is_tradespeople_job,
      company_id,
      homeowner_id
    `)
    .in("id", submittedJobIds)

  // Get company and homeowner profiles for submitted job details
  const submittedCompanyIds = submittedJobDetails?.map((job) => job.company_id).filter((id): id is string => id !== null) || []
  const submittedHomeownerIds = submittedJobDetails?.map((job) => job.homeowner_id).filter((id): id is string => id !== null) || []

  const { data: submittedCompanyProfiles } = await supabase
    .from("company_profiles")
    .select("id, company_name, logo_url, user_id")
    .in("id", submittedCompanyIds)

  const { data: submittedHomeownerProfiles } = await supabase
    .from("homeowner_profiles")
    .select("id, first_name, last_name, user_id")
    .in("id", submittedHomeownerIds)

  // Enrich SUBMITTED applications with job details
  const enrichedSubmittedApplications =
    submittedApplications?.map((app) => {
      const jobInfo = submittedJobDetails?.find((job) => job.id === app.job_id)

      if (!jobInfo) {
        return {
          ...app,
          jobs: {
            id: app.job_id,
            title: "Unknown Job",
            location: "Unknown",
            job_type: "Unknown",
            is_tradespeople_job: false,
          },
          job_poster_name: "Unknown",
          job_poster_avatar: null,
        }
      }

      // Determine job poster
      let posterName = "Unknown"
      let posterAvatar: string | null = null

      if (jobInfo.company_id) {
        const companyProfile = submittedCompanyProfiles?.find((c) => c.id === jobInfo.company_id)
        posterName = companyProfile?.company_name || "Unknown Company"
        posterAvatar = companyProfile?.logo_url || null
      } else if (jobInfo.homeowner_id) {
        const homeownerProfile = submittedHomeownerProfiles?.find((h) => h.id === jobInfo.homeowner_id)
        posterName = homeownerProfile ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}` : "Unknown Homeowner"
        posterAvatar = null
      }

      return {
        ...app,
        jobs: jobInfo,
        job_poster_name: posterName,
        job_poster_avatar: posterAvatar,
      }
    }) || []

  const { count: totalApplications } = await supabase
    .from("job_applications")
    .select("*", { count: "exact", head: true })
    .in("job_id", jobIds)

  const { count: activeJobs } = await supabase
    .from("job_status_view")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.id)
    .eq("is_active", true)
    .neq("expiration_status", "expired")

  // Enrich jobs with application counts and status breakdown (jobs already have expiration info from view)
  const enrichedJobs =
    jobs?.map((job) => {
      const statusMap = applicationStatusMap.get(job.id) || new Map()
      return {
        ...job,
        applications_count: applicationCountsMap.get(job.id) || 0,
        status_breakdown: {
          pending: statusMap.get("pending") || 0,
          reviewed: statusMap.get("reviewed") || 0,
          interview: statusMap.get("interview") || 0,
          accepted: statusMap.get("accepted") || 0,
          rejected: statusMap.get("rejected") || 0,
        },
      }
    }) || []

  return (
    <CompanyDashboard
      user={user as any}
      profile={profile}
      jobs={enrichedJobs}
      receivedApplications={enrichedReceivedApplications}
      submittedApplications={enrichedSubmittedApplications}
      stats={{
        totalApplications: totalApplications || 0,
        activeJobs: activeJobs || 0,
        totalJobs: jobs?.length || 0,
      }}
      rating={companyRating}
      reviews={companyReviews}
      isProfileComplete={isProfileComplete}
      missingFields={missingFields}
    />
  )
}
