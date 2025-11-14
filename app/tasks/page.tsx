import { createClient } from "@/lib/server"
import { Metadata } from "next"
import { TasksPageWrapper } from "@/components/tasks-page-wrapper"
import { convertToAnnualSalary, type SalaryFrequency } from "@/lib/salary-utils"

export const metadata: Metadata = {
  title: "Find Jobs (Tasks) Near You | Search Tasks on the Map | OpenJobMarket",
  description:
    "Search for jobs and tasks for tradespeople near you. Browse thousands of task postings on an interactive map. Filter by location, price, job type, and more. Find your next project today.",
  keywords: [
    "tasks near me",
    "tradespeople jobs",
    "contractor jobs",
    "freelance tasks",
    "home services",
    "task search",
    "find tasks",
    "task listings",
  ],
  openGraph: {
    title: "Find Jobs (Tasks) for Tradespeople | OpenJobMarket",
    description: "Search for jobs and tasks for tradespeople on an interactive map. Filter by location, price, and job type.",
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

export default async function TasksPage({
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
    posted?: string
  }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  // Get current user - but don't fail if not authenticated
  let user = null
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (!authError && authUser) {
      user = authUser
    }
  } catch (error) {
    console.error("[TASKS-PAGE] Error getting user:", error)
  }

  // Check if there are any search parameters
  // IMPORTANT: Search should only execute if user has provided location (lat/lng)
  // Having just a search term should pre-fill the search box but not execute the query
  const hasSearchParams = Boolean(
    (params.lat && params.lng) || // Location coordinates are required for search to execute
    params.location // Or at least a location string
  )

  let jobs: any[] = []

  // Only fetch jobs if user has performed a search (has search parameters)
  if (hasSearchParams) {
    console.log("[TASKS-PAGE] User has search params, building query...")
    console.log("[TASKS-PAGE] Search params:", params)

    // Build query - Only fetch tasks (is_tradespeople_job = true)
    // Match logic from main-page-search.tsx for consistency
    let query = supabase
      .from("jobs")
      .select(
        `
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
      `
      )
      .eq("is_active", true)
      .eq("is_tradespeople_job", true) // Only show tasks/jobs for tradespeople, NOT vacancies
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`) // Exclude expired jobs

    console.log("[TASKS-PAGE] Base query built with is_tradespeople_job=true (tasks/small contract jobs only)")

    // DEBUG: Check if there are ANY jobs with this search term and is_tradespeople_job=true
    if (params.search) {
      const debugQuery = await supabase
        .from("jobs")
        .select("id, title, is_tradespeople_job, is_active, latitude, longitude, location")
        .eq("is_active", true)
        .eq("is_tradespeople_job", true)
        .or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
        .limit(10)

      console.log("[TASKS-PAGE-DEBUG] All jobs matching search term with is_tradespeople_job=true:", debugQuery.data?.length)
      if (debugQuery.data && debugQuery.data.length > 0) {
        debugQuery.data.forEach((j, idx) => {
          console.log(`[TASKS-PAGE-DEBUG] Job ${idx + 1}:`, {
            id: j.id.substring(0, 8),
            title: j.title,
            location: j.location?.substring(0, 60),
            hasCoords: !!(j.latitude && j.longitude),
            lat: j.latitude,
            lng: j.longitude
          })
        })
      }
    }

    // Apply search filters - EXACTLY like main-page-search.tsx
    if (params.search) {
      console.log("[TASKS-PAGE] Applying search filter:", params.search)
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
    }

    // Apply location-based radius filtering if coordinates are available
    // EXACTLY like main-page-search.tsx (lines 627-640)
    if (params.lat && params.lng) {
      const lat = parseFloat(params.lat)
      const lon = parseFloat(params.lng)
      const radius = parseFloat(params.radius || "10") // Default to 10 miles
      const radiusKm = radius * 1.60934 // Convert miles to km

      // Use bounding box approximation for radius search
      const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
      const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

      console.log("[TASKS-PAGE] Applying radius filter:", {
        lat, lon, radius, radiusKm,
        latRange: [lat - latDelta, lat + latDelta],
        lngRange: [lon - lngDelta, lon + lngDelta]
      })

      // Use .or() with and() format - EXACTLY like main page
      query = query.or(
        `and(latitude.gte.${lat - latDelta},latitude.lte.${lat + latDelta},longitude.gte.${lon - lngDelta},longitude.lte.${lon + lngDelta})`
      )
    }

    // Other filters (kept for future use)
    if (params.type) {
      query = query.eq("job_type", params.type)
    }

    if (params.level) {
      query = query.eq("experience_level", params.level)
    }

    // Date filter for "posted" parameter
    if (params.posted && params.posted !== 'all') {
      const now = new Date()
      let startDate = new Date()

      switch (params.posted) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case '3days':
          startDate.setDate(now.getDate() - 3)
          break
        case '5days':
          startDate.setDate(now.getDate() - 5)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case '2weeks':
          startDate.setDate(now.getDate() - 14)
          break
      }

      console.log("[TASKS-PAGE] Applying date filter:", params.posted, "Start date:", startDate.toISOString())
      query = query.gte("created_at", startDate.toISOString())
    }

    // Apply minimum price filter
    // Show jobs where the maximum price is at least the user's minimum requirement
    // This way, a job with range 500-1000 will show when searching for min 600
    if (params.salaryMin) {
      const minPrice = parseInt(params.salaryMin)
      if (!isNaN(minPrice)) {
        console.log("[TASKS-PAGE] Applying minimum price filter:", minPrice)
        query = query.gte("salary_max", minPrice)
      }
    }

    // Execute query
    const { data, error } = await query.order("created_at", { ascending: false }).limit(100)

    if (error) {
      console.error("[TASKS-PAGE] Error fetching tasks:", error)
      jobs = []
    } else {
      jobs = data || []
    }

    console.log(`[TASKS-PAGE] Fetched ${jobs.length} tasks`)
  } else {
    console.log("[TASKS-PAGE] No search parameters provided, showing empty map")
  }

  // Enrich jobs with poster information and ratings for JobMapView display
  const jobsWithRatings = await Promise.all(
    jobs
      .filter(item => item.latitude && item.longitude) // Filter for coords first
      .map(async (job: any) => {
        const homeownerProfile = job.homeowner_profiles
        let company_rating = null

        // Get company rating if job was posted by a company (for star display)
        if (job.company_profiles?.user_id) {
          const { data: ratingData } = await supabase
            .from("user_review_stats")
            .select("average_rating, total_reviews")
            .eq("user_id", job.company_profiles.user_id)
            .single()

          if (ratingData) {
            company_rating = ratingData
          }
        }

        // Shorten location to show only city/area (first 2-3 parts of address)
        const shortLocation = job.location
          ? job.location.split(',').slice(0, 3).join(',').trim()
          : job.location

        return {
          ...job,
          company_rating,
          // Store full address but also provide short version
          full_address: job.location,
          location: shortLocation, // Override with shortened version
          // Add poster information from homeowner profile if available
          poster_first_name: homeownerProfile?.first_name || null,
          poster_last_name: homeownerProfile?.last_name || null,
          poster_nickname: null, // Homeowners don't have nicknames
          poster_logo_url: homeownerProfile?.profile_photo_url || null,
        }
      })
  )

  console.log(`[TASKS-PAGE] Enriched ${jobsWithRatings.length} tasks with poster data and ratings`)
  console.log("[TASKS-PAGE] Tasks with coordinates:", jobsWithRatings.length, "out of", jobs.length)

  // Determine map center
  let center: [number, number] = [51.5074, -0.1278] // Default to London
  if (params.lat && params.lng) {
    center = [Number.parseFloat(params.lat), Number.parseFloat(params.lng)]
  } else if (jobsWithRatings.length > 0) {
    // Center on first job with coordinates
    center = [jobsWithRatings[0].latitude, jobsWithRatings[0].longitude]
  }

  return <TasksPageWrapper jobs={jobsWithRatings} user={user as any} searchParams={params} center={center} />
}
