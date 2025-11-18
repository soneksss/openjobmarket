import { createClient } from "@/lib/server"
import { Metadata } from "next"
import JobMapView from "@/components/job-map-view"
import { convertToAnnualSalary, type SalaryFrequency } from "@/lib/salary-utils"

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Find Jobs Near You | Search Vacancies on the Map | OpenJobMarket",
  description:
    "Search for jobs and vacancies near you. Browse thousands of job postings on an interactive map. Filter by location, salary, job type, and more. Find your next career opportunity today.",
  keywords: [
    "jobs near me",
    "vacancies",
    "job search",
    "careers",
    "employment",
    "job map",
    "find jobs",
    "job listings",
    "job postings",
  ],
  openGraph: {
    title: "Find Jobs Near You | OpenJobMarket",
    description: "Search for jobs and vacancies on an interactive map. Filter by location, salary, and job type.",
    type: "website",
    siteName: "OpenJobMarket",
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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    location?: string
    type?: string
    level?: string
    lat?: string
    lng?: string
    radius?: string
    salaryMin?: string
    salaryMax?: string
    salaryPeriod?: string
    saved?: string
    trainingProvided?: string
    noExperienceRequired?: string
  }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  // Check if this is a saved jobs request
  const isSavedJobsView = params.saved === 'true'

  // Get current user - but don't fail if not authenticated
  let user = null
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (!authError && authUser) {
      user = authUser
    }
  } catch (error) {
    console.error("[JOBS-PAGE] Error getting user:", error)
  }

  // Check if there are any search parameters
  const hasSearchParams = Boolean(
    params.search ||
    params.location ||
    params.type ||
    params.level ||
    params.lat ||
    params.lng ||
    params.salaryMin ||
    params.salaryMax ||
    isSavedJobsView
  )

  let jobs: any[] = []

  // Handle saved jobs view
  if (isSavedJobsView) {
    if (!user) {
      console.log("[JOBS-PAGE] No user for saved jobs, showing empty")
      jobs = []
    } else {
      console.log("[JOBS-PAGE] Fetching saved jobs for user:", user.id)

      try {
        // Get user's professional profile
        const { data: profile, error: profileError } = await supabase
          .from("professional_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (profileError || !profile) {
          console.log("[JOBS-PAGE] No professional profile found:", profileError?.message)
          jobs = []
        } else {
          // Get saved jobs with full job details
          const { data: savedJobs, error: savedJobsError } = await supabase
            .from("saved_jobs")
            .select(`
              id,
              saved_at,
              job_id,
              jobs!inner (
                *,
                company_profiles (
                  company_name,
                  location,
                  industry,
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
              )
            `)
            .eq("professional_id", profile.id)
            .order("saved_at", { ascending: false })

          if (savedJobsError) {
            console.error("[JOBS-PAGE] Error fetching saved jobs:", savedJobsError)
            jobs = []
          } else {
            // Extract jobs from saved_jobs and filter only active jobs
            jobs = (savedJobs || [])
              .map((savedJob: any) => {
                const job = savedJob.jobs
                // Extract homeowner profile information if it exists
                const homeownerProfile = job.homeowner_profiles

                return {
                  ...job,
                  // Add poster information from homeowner profile if available
                  poster_first_name: homeownerProfile?.first_name || null,
                  poster_last_name: homeownerProfile?.last_name || null,
                  poster_nickname: null, // Homeowners don't have nicknames
                  poster_logo_url: homeownerProfile?.profile_photo_url || null,
                }
              })
              .filter((job: any) => {
                // Only show active jobs that haven't expired
                if (!job.is_active) return false
                if (job.expires_at && new Date(job.expires_at) < new Date()) return false
                return true
              })

            console.log("[JOBS-PAGE] Found", jobs.length, "saved active jobs")
          }
        }
      } catch (error) {
        console.error("[JOBS-PAGE] Error in saved jobs logic:", error)
        jobs = []
      }
    }
  } else if (hasSearchParams) {
    console.log("[JOBS-PAGE] Building query with params:", {
      search: params.search,
      location: params.location,
      type: params.type,
      level: params.level,
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
      salaryMin: params.salaryMin,
      salaryMax: params.salaryMax
    })

    // Build query based on search parameters
    let query = supabase
      .from("jobs")
      .select(`
        *,
        company_profiles (
          company_name,
          location,
          industry,
          logo_url,
          nickname,
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
      .eq("is_active", true)
      .eq("is_tradespeople_job", false) // Only show vacancies, not tasks
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })

    // Debug: Get ALL jobs first (to check RLS)
    const { data: allJobs, error: allJobsError } = await supabase
      .from("jobs")
      .select("id, title, location, latitude, longitude, is_active, expires_at, created_at, company_id")

    console.log("[JOBS-DEBUG] ALL jobs query error:", allJobsError)
    console.log("[JOBS-DEBUG] Total jobs in database (all):", allJobs?.length || 0)
    if (allJobs && allJobs.length > 0) {
      console.log("[JOBS-DEBUG] All jobs:", allJobs.map(j => ({
        id: j.id.substring(0, 8),
        title: j.title,
        location: j.location?.substring(0, 30),
        is_active: j.is_active,
        expires_at: j.expires_at,
        hasCoords: !!(j.latitude && j.longitude),
        company_id: j.company_id?.substring(0, 8)
      })))
    }

    // Debug: Get total active non-expired jobs
    const { data: totalActiveJobs } = await supabase
      .from("jobs")
      .select("id, title, location, latitude, longitude")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    console.log("[JOBS-DEBUG] Current timestamp:", new Date().toISOString())
    console.log("[JOBS-DEBUG] Total active non-expired jobs:", totalActiveJobs?.length || 0)
    if (totalActiveJobs && totalActiveJobs.length > 0) {
      console.log("[JOBS-DEBUG] Active job details:", totalActiveJobs.map(j => ({
        id: j.id.substring(0, 8),
        title: j.title,
        location: j.location,
        hasCoords: !!(j.latitude && j.longitude)
      })))
    }

  // Apply filters
  if (params.search) {
    const searchTerm = params.search.trim().toLowerCase()
    console.log("[JOBS-PAGE] Applying search filter:", searchTerm)

    // Special case: "any" search shows all jobs with other filters applied
    if (searchTerm !== "any") {
      // Use ilike for case-insensitive search, search in multiple fields
      // Note: Removed company_profiles.company_name from .or() as it causes query errors with joins
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

      // Debug: Check how many jobs match search term
      const { data: searchResults } = await supabase
        .from("jobs")
        .select("id, title, description")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

      console.log("[JOBS-DEBUG] Jobs matching search term:", searchResults?.length || 0)
      if (searchResults && searchResults.length > 0) {
        console.log("[JOBS-DEBUG] Sample matching titles:", searchResults.slice(0, 3).map(j => j.title))
      } else {
        console.log("[JOBS-DEBUG] No jobs found for search term. Checking all active job titles...")
        const { data: allJobs } = await supabase
          .from("jobs")
          .select("title")
          .eq("is_active", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

        console.log("[JOBS-DEBUG] All active job titles in database:", allJobs?.map(j => j.title) || [])
      }
    } else {
      console.log("[JOBS-PAGE] 'Any' search detected - showing all jobs with filters applied")
    }
  }

  if (params.location) {
    console.log("[JOBS-PAGE] Applying location filter:", params.location)

    // If we have coordinates, use geographic filtering (default radius if not provided)
    if (params.lat && params.lng) {
      const radius = params.radius || "10" // Default to 10 miles if no radius provided
      const lat = parseFloat(params.lat)
      const lng = parseFloat(params.lng)
      const radiusKm = parseFloat(radius) * 1.60934 // Convert miles to km

      console.log("[JOBS-PAGE] Using radius-based location search:", {
        lat, lng, radiusKm, radiusMiles: radius, defaultUsed: !params.radius
      })

      // Use PostGIS ST_DWithin for radius search (if supported)
      // For now, we'll use a simple bounding box approximation
      const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
      const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

      // Check if location parameter is raw coordinates (starts with "Location")
      const isRawCoordinates = params.location.startsWith('Location ')

      if (isRawCoordinates) {
        // Use ONLY geographic filtering for raw coordinate searches
        // Don't do text matching because location field contains different coordinates
        query = query
          .gte("latitude", lat - latDelta)
          .lte("latitude", lat + latDelta)
          .gte("longitude", lng - lngDelta)
          .lte("longitude", lng + lngDelta)

        console.log("[JOBS-PAGE] Using geographic-only search (raw coordinates)")
      } else {
        // For named locations, use geographic + text fallback
        const locationParts = params.location.split(',').map(part => part.trim())
        const mainLocation = locationParts[0] // Get the main city/area name

        // Match jobs either by:
        // 1. Geographic coordinates within radius OR
        // 2. Location text match (for jobs without coordinates)
        query = query.or(
          `and(latitude.gte.${lat - latDelta},latitude.lte.${lat + latDelta},longitude.gte.${lng - lngDelta},longitude.lte.${lng + lngDelta}),location.ilike.%${mainLocation}%`
        )

        console.log("[JOBS-PAGE] Using geographic + text search for:", mainLocation)
      }

      // Debug: Check how many jobs match this location
      let debugQuery = supabase
        .from("jobs")
        .select("id, title, location, latitude, longitude")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      if (isRawCoordinates) {
        debugQuery = debugQuery
          .gte("latitude", lat - latDelta)
          .lte("latitude", lat + latDelta)
          .gte("longitude", lng - lngDelta)
          .lte("longitude", lng + lngDelta)
      } else {
        const mainLocation = params.location.split(',')[0].trim()
        debugQuery = debugQuery.or(
          `and(latitude.gte.${lat - latDelta},latitude.lte.${lat + latDelta},longitude.gte.${lng - lngDelta},longitude.lte.${lng + lngDelta}),location.ilike.%${mainLocation}%`
        )
      }

      const { data: locationResults } = await debugQuery

      console.log("[JOBS-DEBUG] Jobs matching location:", locationResults?.length || 0)
      if (locationResults && locationResults.length > 0) {
        console.log("[JOBS-DEBUG] Sample matching jobs:", locationResults.slice(0, 3).map(j => ({
          title: j.title,
          location: j.location,
          coords: j.latitude && j.longitude ? [j.latitude, j.longitude] : 'No coords'
        })))
      }
    } else {
      // Make location search more flexible by searching for key parts
      const locationParts = params.location.split(',').map(part => part.trim())
      const mainLocation = locationParts[0] // Get the main city/area name
      console.log("[JOBS-PAGE] Using flexible location search for:", mainLocation)
      query = query.ilike("location", `%${mainLocation}%`)
    }
  }

  if (params.type && params.type !== "all") {
    console.log("[JOBS-PAGE] Applying job type filter:", params.type)
    // Use the job type directly (already in correct format: "full-time", "remote", etc.)
    const jobType = params.type
    query = query.eq("job_type", jobType)

    // Debug: Check how many jobs match this job type
    const { data: typeResults } = await supabase
      .from("jobs")
      .select("id, title, job_type")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .eq("job_type", jobType)

    console.log("[JOBS-DEBUG] Jobs matching job type '" + jobType + "':", typeResults?.length || 0)

    // Also check what job types exist in the database
    const { data: allTypes } = await supabase
      .from("jobs")
      .select("job_type")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    if (allTypes) {
      const uniqueTypes = [...new Set(allTypes.map(j => j.job_type))].filter(Boolean)
      console.log("[JOBS-DEBUG] Available job types in database:", uniqueTypes)
    }
  }

  if (params.level && params.level !== "all") {
    query = query.eq("experience_level", params.level)
  }

  // No experience required (Training provided) filter
  if (params.noExperienceRequired === "true") {
    console.log("[JOBS-PAGE] Applying no experience required filter")
    query = query.eq("no_experience_required", true)
  }

  // Enhanced salary filtering with frequency conversion
  if (params.salaryMin || params.salaryMax) {
    const searchFrequency = (params.salaryPeriod as SalaryFrequency) || 'per_year'

    // Convert search criteria to annual for comparison
    if (params.salaryMin) {
      const searchMinSalary = Number.parseInt(params.salaryMin)
      if (!Number.isNaN(searchMinSalary)) {
        const searchMinAnnual = convertToAnnualSalary(searchMinSalary, searchFrequency)

        // Try to use annual salary columns first (more efficient), fallback to conversion
        try {
          query = query.gte("salary_max_annual", searchMinAnnual)
        } catch {
          // Fallback: filter by converting job salaries
          const tempQuery = supabase
            .from("jobs")
            .select("id, salary_min, salary_max, salary_frequency")
            .eq("is_active", true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

          const { data: salaryData } = await tempQuery

          if (salaryData) {
            const matchingJobIds = salaryData
              .filter((job) => {
                if (!job.salary_min || !job.salary_max || !job.salary_frequency) return false
                const jobMaxAnnual = convertToAnnualSalary(job.salary_max, job.salary_frequency as SalaryFrequency)
                return jobMaxAnnual >= searchMinAnnual
              })
              .map((job) => job.id)

            if (matchingJobIds.length > 0) {
              query = query.in("id", matchingJobIds)
            } else {
              query = query.eq("id", -1)
            }
          }
        }
      }
    }

    if (params.salaryMax) {
      const searchMaxSalary = Number.parseInt(params.salaryMax)
      if (!Number.isNaN(searchMaxSalary)) {
        const searchMaxAnnual = convertToAnnualSalary(searchMaxSalary, searchFrequency)

        // Try to use annual salary columns first (more efficient), fallback to conversion
        try {
          query = query.lte("salary_min_annual", searchMaxAnnual)
        } catch {
          // Fallback: filter by converting job salaries
          const tempQuery = supabase
            .from("jobs")
            .select("id, salary_min, salary_max, salary_frequency")
            .eq("is_active", true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

          const { data: salaryData } = await tempQuery

          if (salaryData) {
            const matchingJobIds = salaryData
              .filter((job) => {
                if (!job.salary_min || !job.salary_max || !job.salary_frequency) return false
                const jobMinAnnual = convertToAnnualSalary(job.salary_min, job.salary_frequency as SalaryFrequency)
                return jobMinAnnual <= searchMaxAnnual
              })
              .map((job) => job.id)

            if (matchingJobIds.length > 0) {
              query = query.in("id", matchingJobIds)
            } else {
              query = query.eq("id", -1)
            }
          }
        }
      }
    }
  }

    // Apply limit for "Any" searches (51 to detect if there are more)
    const isAnySearch = params.search?.trim().toLowerCase() === "any"
    if (isAnySearch) {
      query = query.limit(51)
      console.log("[JOBS-PAGE] 'Any' search - limiting to 51 results (to detect overflow)")
    }

    const { data: queryResults, error } = await query

    if (error) {
      console.error("[JOBS-PAGE] Query error:", error)
      jobs = []
    } else {
      jobs = queryResults || []

      // For "Any" searches, check if results exceed limit
      if (isAnySearch && jobs.length > 50) {
        console.log("[JOBS-PAGE] 'Any' search exceeded 50 results, truncating to 50")
        jobs = jobs.slice(0, 50)
        // Add a flag to indicate truncation
        ;(jobs as any).isAnySearchTruncated = true
      }
    }

    console.log("[JOBS-PAGE] Query executed. Jobs found:", jobs.length)
    console.log("[JOBS-PAGE] Search params:", params)
    if (jobs.length > 0) {
      console.log("[JOBS-PAGE] First few job titles:", jobs.slice(0, 3).map(j => j.title))
      console.log("[JOBS-PAGE] First few job types:", jobs.slice(0, 3).map(j => j.job_type))
      console.log("[JOBS-PAGE] First few job locations:", jobs.slice(0, 3).map(j => j.location))
    }

    // Debug: Run a test query to see what jobs exist with relaxed filters
    if (jobs.length === 0 && params.search) {
      console.log("[JOBS-DEBUG] Testing relaxed search to debug...")

      // Test 1: Just search term without other filters
      const testQuery1 = await supabase
        .from("jobs")
        .select("id, title, job_type, location")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
        .limit(5)

      console.log("[JOBS-DEBUG] Jobs matching search term only:", testQuery1.data?.length || 0)
      if (testQuery1.data && testQuery1.data.length > 0) {
        console.log("[JOBS-DEBUG] Sample jobs with search term:", testQuery1.data.map(j => ({
          title: j.title,
          type: j.job_type,
          location: j.location
        })))
      }

      // Test 2: Just job type filter
      if (params.type) {
        const jobType = params.type.replace('-', '_')
        const testQuery2 = await supabase
          .from("jobs")
          .select("id, title, job_type, location")
          .eq("is_active", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .eq("job_type", jobType)
          .limit(5)

        console.log("[JOBS-DEBUG] Jobs matching job type only:", testQuery2.data?.length || 0)
        if (testQuery2.data && testQuery2.data.length > 0) {
          console.log("[JOBS-DEBUG] Sample jobs with job type:", testQuery2.data.map(j => ({
            title: j.title,
            type: j.job_type,
            location: j.location
          })))
        }
      }
    }
  } else {
    console.log("[JOBS-PAGE] No search parameters provided, showing empty map")
  }

  // Fetch ratings for all companies in the job results
  const companyUserIds = jobs
    .map((job) => job.company_profiles?.user_id)
    .filter(Boolean)

  let companyRatings: { [key: string]: { average_rating: number; total_reviews: number } } = {}

  if (companyUserIds.length > 0) {
    const { data: ratingsData } = await supabase
      .from("user_review_stats")
      .select("user_id, average_rating, total_reviews")
      .in("user_id", companyUserIds)

    if (ratingsData) {
      companyRatings = ratingsData.reduce((acc, rating) => {
        acc[rating.user_id] = {
          average_rating: rating.average_rating || 0,
          total_reviews: rating.total_reviews || 0,
        }
        return acc
      }, {} as { [key: string]: { average_rating: number; total_reviews: number } })
    }
  }

  // Enrich jobs with rating data and extract poster information
  const jobsWithRatings = jobs.map((job, index) => {
    // Extract homeowner profile information if it exists
    const homeownerProfile = (job as any).homeowner_profiles

    const enrichedJob = {
      ...job,
      company_rating: job.company_profiles?.user_id
        ? companyRatings[job.company_profiles.user_id] || { average_rating: 0, total_reviews: 0 }
        : { average_rating: 0, total_reviews: 0 },
      // Add poster information from homeowner profile if available
      poster_first_name: homeownerProfile?.first_name || null,
      poster_last_name: homeownerProfile?.last_name || null,
      poster_nickname: null, // Homeowners don't have nicknames
      poster_logo_url: homeownerProfile?.profile_photo_url || null,
    }

    // Debug logging for all jobs
    console.log(`[JOBS-PAGE-DEBUG] Job "${job.title}" poster info:`, {
      has_company: !!job.company_profiles,
      has_homeowner: !!homeownerProfile,
      homeowner_first_name: homeownerProfile?.first_name,
      homeowner_last_name: homeownerProfile?.last_name,
      extracted_first: enrichedJob.poster_first_name,
      extracted_last: enrichedJob.poster_last_name,
      company_name: job.company_profiles?.company_name
    })

    return enrichedJob
  })

  // Filter jobs with coordinates for map display
  const jobsWithCoords = jobsWithRatings.filter((job) => job.latitude && job.longitude)
  console.log("[JOBS-PAGE] Jobs with coordinates:", jobsWithCoords.length, "out of", jobsWithRatings.length)

  // Determine map center
  let center: [number, number] = [51.5074, -0.1278] // Default to London
  if (params.lat && params.lng) {
    center = [Number.parseFloat(params.lat), Number.parseFloat(params.lng)]
  } else if (jobsWithCoords.length > 0) {
    // Center on first job with coordinates
    center = [jobsWithCoords[0].latitude, jobsWithCoords[0].longitude]
  }

  // Determine if we should show the "Any" search limit warning
  const showAnySearchWarning = params.search?.trim().toLowerCase() === "any" && jobsWithRatings.length >= 50

  return (
    <JobMapView
      jobs={jobsWithRatings}
      user={user as any}
      searchParams={params}
      center={center}
      warningMessage={showAnySearchWarning ? "Showing first 50 results. Please reduce the search radius or use filters to refine your search." : undefined}
    />
  )
}
