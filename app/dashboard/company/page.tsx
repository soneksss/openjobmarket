import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import CompanyDashboard from "@/components/company-dashboard"
import { getDashboardBootstrap } from "@/lib/bootstrap"

export const dynamic = 'force-dynamic'

export default async function CompanyDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Phase 1 — parallel: bootstrap cache + company profile
  const [, profileResult] = await Promise.all([
    getDashboardBootstrap(user.id),
    supabase.from("company_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ])

  let profile = profileResult.data

  // Profile missing — attempt RPC then direct insert (rare path)
  if (!profile) {
    await supabase.rpc("complete_user_profile_after_verification", { p_user_id: user.id })
    const { data: retryData } = await supabase
      .from("company_profiles").select("*").eq("user_id", user.id).maybeSingle()

    if (!retryData) {
      const metadata = user.user_metadata || {}
      const { data: insertedProfile } = await supabase
        .from("company_profiles")
        .insert({
          user_id: user.id,
          company_name: metadata.company_name || metadata.first_name || user.email?.split("@")[0] || "My Business",
          industry: metadata.industry || metadata.trade || "General",
          location: metadata.location || null,
        })
        .select().single()
      profile = insertedProfile
    } else {
      profile = retryData
    }
  }

  if (!profile) redirect("/onboarding")

  const missingFields: string[] = []
  if (!profile.company_name) missingFields.push("company_name")
  if (!profile.industry) missingFields.push("industry")
  if (!profile.location) missingFields.push("location")
  const isProfileComplete = missingFields.length === 0

  // Phase 2 — parallel: reviews, jobs, submitted applications, my-jobs (confirmed/completed)
  const [reviewsResult, jobsResult, submittedResult, myJobsResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, rating, review_text, created_at, is_edited, reviewer_id")
      .eq("reviewee_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("job_status_view")
      .select("*")
      .eq("company_id", profile.id)
      .not("status", "in", '("COMPLETED","CANCELLED")')
      .order("created_at", { ascending: false }),

    supabase
      .from("job_applications")
      .select("id, status, applied_at, job_id")
      .eq("company_id", profile.id)
      .order("applied_at", { ascending: false }),

    supabase
      .from("jobs")
      .select(`
        id, title, location, budget_min, budget_max, status,
        confirmed_at, completed_at,
        homeowner_profiles!homeowner_id ( first_name, last_name, user_id )
      `)
      .eq("confirmed_tradesperson_id", profile.id)
      .in("status", ["CONFIRMED", "ACTIVE", "COMPLETED"])
      .order("confirmed_at", { ascending: false }),
  ])

  const reviewsData = reviewsResult.data ?? []
  const jobs = jobsResult.data ?? []
  const submittedApplications = submittedResult.data ?? []
  const myJobs = myJobsResult.data ?? []
  const jobIds = jobs.map((j) => j.id)

  // Phase 3 — parallel: enrich reviews (batch, not N+1) + job-related queries
  const reviewerIds = [...new Set(reviewsData.map((r) => r.reviewer_id).filter(Boolean))]
  const submittedJobIds = submittedApplications.map((a) => a.job_id)

  const [
    homeownerReviewers,
    companyReviewers,
    userReviewers,
    applicationCountsResult,
    receivedApplicationsResult,
    submittedJobDetailsResult,
    activeJobsResult,
    totalApplicationsResult,
  ] = await Promise.all([
    reviewerIds.length
      ? supabase.from("homeowner_profiles")
          .select("user_id, first_name, last_name, profile_photo_url")
          .in("user_id", reviewerIds)
      : Promise.resolve({ data: [] }),

    reviewerIds.length
      ? supabase.from("company_profiles")
          .select("user_id, company_name, logo_url")
          .in("user_id", reviewerIds)
      : Promise.resolve({ data: [] }),

    reviewerIds.length
      ? supabase.from("users").select("id, email").in("id", reviewerIds)
      : Promise.resolve({ data: [] }),

    jobIds.length
      ? supabase.from("job_applications").select("job_id, status").in("job_id", jobIds)
      : Promise.resolve({ data: [] }),

    jobIds.length
      ? supabase.from("job_applications")
          .select("id, status, applied_at, job_id, professional_id, company_id")
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),

    submittedJobIds.length
      ? supabase.from("jobs")
          .select("id, title, location, job_type, is_tradespeople_job, company_id, homeowner_id")
          .in("id", submittedJobIds)
      : Promise.resolve({ data: [] }),

    supabase.from("job_status_view")
      .select("*", { count: "exact", head: true })
      .eq("company_id", profile.id)
      .eq("is_active", true)
      .neq("expiration_status", "expired"),

    jobIds.length
      ? supabase.from("job_applications")
          .select("*", { count: "exact", head: true })
          .in("job_id", jobIds)
      : Promise.resolve({ count: 0 }),
  ])

  // Build reviews with reviewer names — pure in-memory join, no extra queries
  const homeownerMap = new Map((homeownerReviewers.data ?? []).map((h: any) => [h.user_id, h]))
  const companyMap   = new Map((companyReviewers.data ?? []).map((c: any) => [c.user_id, c]))
  const userMap      = new Map((userReviewers.data ?? []).map((u: any) => [u.id, u]))

  const companyReviews = reviewsData.map((review) => {
    const h = homeownerMap.get(review.reviewer_id)
    if (h) return { ...review, reviewer_name: `${h.first_name} ${h.last_name}`, reviewer_avatar: h.profile_photo_url }
    const c = companyMap.get(review.reviewer_id)
    if (c) return { ...review, reviewer_name: c.company_name, reviewer_avatar: c.logo_url }
    const u = userMap.get(review.reviewer_id)
    return { ...review, reviewer_name: u?.email?.split('@')[0] ?? 'Anonymous', reviewer_avatar: null }
  })

  const companyRating = {
    average_rating: companyReviews.length
      ? companyReviews.reduce((s, r) => s + r.rating, 0) / companyReviews.length
      : 0,
    total_reviews: companyReviews.length,
  }

  // Build application count maps
  const applicationCountsMap = new Map<string, number>()
  const applicationStatusMap = new Map<string, Map<string, number>>()
  ;(applicationCountsResult.data ?? []).forEach((app: any) => {
    applicationCountsMap.set(app.job_id, (applicationCountsMap.get(app.job_id) ?? 0) + 1)
    if (!applicationStatusMap.has(app.job_id)) applicationStatusMap.set(app.job_id, new Map())
    const sm = applicationStatusMap.get(app.job_id)!
    sm.set(app.status, (sm.get(app.status) ?? 0) + 1)
  })

  const receivedApplications = receivedApplicationsResult.data ?? []
  const submittedJobDetails  = submittedJobDetailsResult.data ?? []

  // Phase 4 — parallel: enrich received applications (applicant profiles)
  const professionalIds = [...new Set(receivedApplications.map((a: any) => a.professional_id).filter(Boolean))]
  const receivedCompanyIds = [...new Set(receivedApplications.map((a: any) => a.company_id).filter(Boolean))]
  const appJobIds = [...new Set(receivedApplications.map((a: any) => a.job_id))]
  const subCompanyIds = [...new Set(submittedJobDetails.map((j: any) => j.company_id).filter(Boolean))]
  const subHomeownerIds = [...new Set(submittedJobDetails.map((j: any) => j.homeowner_id).filter(Boolean))]

  const [
    appJobDetails,
    professionalDetails,
    receivedCompanyDetails,
    submittedCompanyProfiles,
    submittedHomeownerProfiles,
  ] = await Promise.all([
    appJobIds.length
      ? supabase.from("jobs").select("id, title").in("id", appJobIds)
      : Promise.resolve({ data: [] }),
    professionalIds.length
      ? supabase.from("professional_profiles")
          .select("id, first_name, last_name, title, location, profile_photo_url, user_id")
          .in("id", professionalIds)
      : Promise.resolve({ data: [] }),
    receivedCompanyIds.length
      ? supabase.from("company_profiles")
          .select("id, company_name, industry, location, logo_url, user_id")
          .in("id", receivedCompanyIds)
      : Promise.resolve({ data: [] }),
    subCompanyIds.length
      ? supabase.from("company_profiles")
          .select("id, company_name, logo_url, user_id")
          .in("id", subCompanyIds)
      : Promise.resolve({ data: [] }),
    subHomeownerIds.length
      ? supabase.from("homeowner_profiles")
          .select("id, first_name, last_name, user_id")
          .in("id", subHomeownerIds)
      : Promise.resolve({ data: [] }),
  ])

  // In-memory enrichment — no more sequential per-record queries
  const jobDetailsMap         = new Map((appJobDetails.data ?? []).map((j: any) => [j.id, j]))
  const profDetailsMap        = new Map((professionalDetails.data ?? []).map((p: any) => [p.id, p]))
  const recCompanyDetailsMap  = new Map((receivedCompanyDetails.data ?? []).map((c: any) => [c.id, c]))
  const subCompanyMap         = new Map((submittedCompanyProfiles.data ?? []).map((c: any) => [c.id, c]))
  const subHomeownerMap       = new Map((submittedHomeownerProfiles.data ?? []).map((h: any) => [h.id, h]))
  const subJobMap             = new Map(submittedJobDetails.map((j: any) => [j.id, j]))

  const enrichedReceivedApplications = receivedApplications
    .filter((app: any) => app.professional_id || app.company_id)
    .map((app: any) => {
      const jobInfo = jobDetailsMap.get(app.job_id) ?? { id: app.job_id, title: "Unknown Job" }
      if (app.professional_id) {
        return {
          ...app, jobs: jobInfo,
          professional_profiles: profDetailsMap.get(app.professional_id) ?? { id: app.professional_id, first_name: "Unknown", last_name: "User", title: "Professional", location: "Unknown", profile_photo_url: undefined, user_id: undefined },
          company_profiles: null,
          applicant_type: "professional" as const,
        }
      }
      return {
        ...app, jobs: jobInfo,
        professional_profiles: null,
        company_profiles: recCompanyDetailsMap.get(app.company_id) ?? { id: app.company_id, company_name: "Unknown Company", industry: "Company", location: "Unknown", logo_url: undefined, user_id: undefined },
        applicant_type: "company" as const,
      }
    })

  const enrichedSubmittedApplications = submittedApplications.map((app: any) => {
    const jobInfo = subJobMap.get(app.job_id)
    if (!jobInfo) return { ...app, jobs: { id: app.job_id, title: "Unknown Job", location: "Unknown", job_type: "Unknown", is_tradespeople_job: false }, job_poster_name: "Unknown", job_poster_avatar: null }
    const company   = jobInfo.company_id   ? subCompanyMap.get(jobInfo.company_id)   : null
    const homeowner = jobInfo.homeowner_id ? subHomeownerMap.get(jobInfo.homeowner_id) : null
    return {
      ...app, jobs: jobInfo,
      job_poster_name:   company ? company.company_name : homeowner ? `${homeowner.first_name} ${homeowner.last_name}` : "Unknown",
      job_poster_avatar: company?.logo_url ?? null,
    }
  })

  const enrichedJobs = jobs.map((job: any) => {
    const sm = applicationStatusMap.get(job.id) ?? new Map()
    return {
      ...job,
      applications_count: applicationCountsMap.get(job.id) ?? 0,
      status_breakdown: {
        pending:   sm.get("pending")   ?? 0,
        reviewed:  sm.get("reviewed")  ?? 0,
        interview: sm.get("interview") ?? 0,
        accepted:  sm.get("accepted")  ?? 0,
        rejected:  sm.get("rejected")  ?? 0,
      },
    }
  })

  return (
    <CompanyDashboard
      user={user as any}
      profile={profile}
      jobs={enrichedJobs}
      receivedApplications={enrichedReceivedApplications}
      submittedApplications={enrichedSubmittedApplications}
      myJobs={myJobs}
      stats={{
        totalApplications: totalApplicationsResult.count ?? 0,
        activeJobs: activeJobsResult.count ?? 0,
        totalJobs: jobs.length,
      }}
      rating={companyRating}
      reviews={companyReviews}
      isProfileComplete={isProfileComplete}
      missingFields={missingFields}
    />
  )
}
