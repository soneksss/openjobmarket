import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Metadata } from "next"
import ProfessionalsPageContent from "@/components/professionals-page-content"

export const metadata: Metadata = {
  title: "Find Tradespeople & Professionals Near You | OpenJobMarket",
  description:
    "Search for verified tradespeople and professionals near you. Browse plumbers, electricians, carpenters, builders and more. Read reviews and contact directly.",
  keywords: [
    "tradespeople near me",
    "professionals",
    "plumber",
    "electrician",
    "carpenter",
    "builder",
    "find trades",
    "local tradespeople",
    "skilled workers",
  ],
  openGraph: {
    title: "Find Tradespeople & Professionals Near You | OpenJobMarket",
    description: "Search for verified tradespeople and professionals. Read reviews and contact directly.",
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

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    location?: string
    level?: string
    skills?: string
    lat?: string
    lng?: string
    radius?: string
    self_employed?: string
    type?: string
    salaryMin?: string
    salaryMax?: string
    open_for_business?: string
    hiring?: string
    traders?: string
  }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Block unauthenticated users - they should use the modal from homepage
  if (!user) {
    redirect("/")
  }

  // Get user type to determine the experience for authenticated users
  const { data: userData } = await supabase.from("users").select("user_type").eq("id", user.id).single()

  if (!userData) {
    redirect("/dashboard")
  }

  const isEmployer = userData.user_type === "company"
  const isEmployee = userData.user_type === "professional"

  let data: any[] = []
  let center: [number, number] = [51.5074, -0.1278] // London default

  // For unregistered users, ignore filter parameters (only allow search, location, traders)
  const effectiveParams = user ? params : {
    search: params.search,
    location: params.location,
    lat: params.lat,
    lng: params.lng,
    traders: params.traders,
    // Ignore type, level, salaryMin, salaryMax, radius, etc. for unregistered users
  }

  const hasSearchParams =
    effectiveParams.search ||
    effectiveParams.location ||
    effectiveParams.level ||
    effectiveParams.skills ||
    effectiveParams.type ||
    effectiveParams.salaryMin ||
    effectiveParams.open_for_business ||
    effectiveParams.hiring ||
    effectiveParams.traders

  const hasCompanyFilters = effectiveParams.open_for_business || effectiveParams.hiring
  const isSearchingTraders = effectiveParams.traders === "true"

  console.log("[PROFESSIONALS-DEBUG] Route info:", {
    hasSearchParams,
    isEmployer,
    isEmployee,
    userType: userData?.user_type || 'guest',
    isGuest: !user,
    originalParams: params,
    effectiveParams: effectiveParams
  })

  if (hasSearchParams) {
    if (isSearchingTraders) {
      // When searching for traders, combine self-employed professionals and companies open for business
      const [professionalsResponse, companiesResponse] = await Promise.all([
        // Get self-employed professionals
        supabase
          .from("professional_profiles")
          .select("*")
          .eq("available_for_work", true)
          .eq("is_self_employed", true)
          .then(async (response) => {
            let query = response
            if (params.search) {
              query = await supabase
                .from("professional_profiles")
                .select("*")
                .eq("available_for_work", true)
                .eq("is_self_employed", true)
                .or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,title.ilike.%${params.search}%`)
            }
            if (params.location && !params.location.match(/^Location\s+[-\d.]+,\s*[-\d.]+$/)) {
              query = await supabase
                .from("professional_profiles")
                .select("*")
                .eq("available_for_work", true)
                .eq("is_self_employed", true)
                .ilike("location", `%${params.location}%`)
                .or(params.search ? `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,title.ilike.%${params.search}%` : "")
            }
            return query
          }),

        // Get companies open for business
        supabase
          .from("company_profiles")
          .select("*")
          .eq("open_for_business", true)
          .then(async (response) => {
            let query = response
            if (params.search) {
              query = await supabase
                .from("company_profiles")
                .select("*")
                .eq("open_for_business", true)
                .or(`company_name.ilike.%${params.search}%,description.ilike.%${params.search}%,industry.ilike.%${params.search}%`)
            }
            if (params.location && !params.location.match(/^Location\s+[-\d.]+,\s*[-\d.]+$/)) {
              query = await supabase
                .from("company_profiles")
                .select("*")
                .eq("open_for_business", true)
                .ilike("location", `%${params.location}%`)
                .or(params.search ? `company_name.ilike.%${params.search}%,description.ilike.%${params.search}%,industry.ilike.%${params.search}%` : "")
            }
            return query
          })
      ])

      // Combine both datasets
      const professionals = professionalsResponse.data || []
      const companies = companiesResponse.data || []

      // Fetch review stats for professionals
      let professionalsWithStats = professionals
      if (professionals.length > 0) {
        const professionalUserIds = professionals.map(p => p.user_id)
        const { data: professionalReviewStats } = await supabase
          .from("user_review_stats")
          .select("user_id, total_reviews, average_rating")
          .in("user_id", professionalUserIds)

        professionalsWithStats = professionals.map(prof => {
          const stats = professionalReviewStats?.find(s => s.user_id === prof.user_id)
          return {
            ...prof,
            rating: stats?.average_rating || null,
            reviewCount: stats?.total_reviews || 0
          }
        })
      }

      // Fetch review stats for companies
      let companiesWithStats = companies
      if (companies.length > 0) {
        const companyUserIds = companies.map(c => c.user_id)
        const { data: companyReviewStats } = await supabase
          .from("user_review_stats")
          .select("user_id, total_reviews, average_rating")
          .in("user_id", companyUserIds)

        companiesWithStats = companies.map(comp => {
          const stats = companyReviewStats?.find(s => s.user_id === comp.user_id)
          return {
            ...comp,
            rating: stats?.average_rating || null,
            reviewCount: stats?.total_reviews || 0
          }
        })
      }

      // Mark the type for the frontend to distinguish
      let tradersData = [
        ...professionalsWithStats.map(p => ({ ...p, _type: 'professional' })),
        ...companiesWithStats.map(c => ({ ...c, _type: 'company' }))
      ]

      // Apply self-employed filter if specified
      if (effectiveParams.self_employed === "true") {
        // Show only self-employed professionals (filter out companies)
        tradersData = tradersData.filter(item => item._type === 'professional')
      }

      // Apply search term filtering with relevance scoring for traders
      if (effectiveParams.search && effectiveParams.search.trim()) {
        const searchTerm = effectiveParams.search.trim().toLowerCase()

        const scoredTraders = tradersData.map(trader => {
          let score = 0

          if (trader._type === 'professional') {
            const title = (trader.title || '').toLowerCase()
            const firstName = (trader.first_name || '').toLowerCase()
            const lastName = (trader.last_name || '').toLowerCase()
            const skills = (trader.skills || []).map((s: string) => s.toLowerCase())

            // Score 4: Title exact match
            if (title === searchTerm) {
              score = 4
            }
            // Score 3: Title contains search term
            else if (title.includes(searchTerm)) {
              score = 3
            }
            // Score 2: Skill exact match
            else if (skills.includes(searchTerm)) {
              score = 2
            }
            // Score 1: Skill partial match
            else if (skills.some((skill: string) => skill.includes(searchTerm))) {
              score = 1
            }
            // Score 0.5: Name match
            else if (firstName.includes(searchTerm) || lastName.includes(searchTerm)) {
              score = 0.5
            }
          } else {
            // For companies, check company_name, description, industry
            const companyName = (trader.company_name || '').toLowerCase()
            const description = (trader.description || '').toLowerCase()
            const industry = (trader.industry || '').toLowerCase()

            if (companyName.includes(searchTerm) || description.includes(searchTerm) || industry.includes(searchTerm)) {
              score = 1
            }
          }

          return { ...trader, _relevanceScore: score }
        })

        // Filter out non-matching results and sort by relevance
        tradersData = scoredTraders
          .filter(trader => trader._relevanceScore > 0)
          .sort((a, b) => {
            if (b._relevanceScore !== a._relevanceScore) {
              return b._relevanceScore - a._relevanceScore
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
      }

      data = tradersData

      // Set center
      if (params.lat && params.lng) {
        center = [Number.parseFloat(params.lat), Number.parseFloat(params.lng)]
      } else if (data.length > 0) {
        const firstWithCoords = data.find((item) => item.latitude && item.longitude)
        if (firstWithCoords) {
          center = [firstWithCoords.latitude, firstWithCoords.longitude]
        }
      }

      console.log("[PROFESSIONALS-DEBUG] Traders search:", {
        professionalsFound: professionals.length,
        companiesFound: companies.length,
        totalTraders: data.length
      })
    } else if (isEmployer) {
      let query = supabase
        .from("professional_profiles")
        .select("*")
        .eq("available_for_work", true)
        .order("created_at", { ascending: false })

      // Note: Skills matching is done post-query for better relevance scoring

      // Location filtering with coordinate-based radius search
      if (params.lat && params.lng) {
        // Use coordinate-based radius search (20 miles = ~32 km)
        const searchLat = parseFloat(params.lat)
        const searchLng = parseFloat(params.lng)
        const radiusKm = 32 // 20 miles in kilometers

        // Calculate bounding box for efficient querying
        const latDelta = radiusKm / 111.32 // ~111.32 km per degree latitude
        const lngDelta = radiusKm / (111.32 * Math.cos(searchLat * Math.PI / 180))

        query = query
          .gte('latitude', searchLat - latDelta)
          .lte('latitude', searchLat + latDelta)
          .gte('longitude', searchLng - lngDelta)
          .lte('longitude', searchLng + lngDelta)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
      } else if (params.location) {
        // Fallback to text-based location filtering
        if (!params.location.match(/^Location\s+[-\d.]+,\s*[-\d.]+$/)) {
          // Try multiple location matching strategies
          const locationParts = params.location.split(',').map(part => part.trim())
          const mainLocation = locationParts[0] // e.g., "Havant" from "Havant, Hampshire, England, United Kingdom"

          // Create an OR condition for multiple location matches
          const locationConditions = [
            `location.ilike.%${params.location}%`, // Full location
            `location.ilike.%${mainLocation}%`     // Main city/area name
          ]

          // Add county/state if available
          if (locationParts.length > 1) {
            const county = locationParts[1]
            locationConditions.push(`location.ilike.%${county}%`)
          }

          query = query.or(locationConditions.join(','))
        }
      }

      if (params.level) {
        query = query.eq("experience_level", params.level)
      }

      if (params.skills) {
        const skills = params.skills.split(",")
        query = query.overlaps("skills", skills)
      }

      if (params.self_employed && params.self_employed !== "all") {
        const isSelfEmployed = params.self_employed === "true"
        query = query.eq("is_self_employed", isSelfEmployed)
      }

      const { data: professionals } = await query
      let filteredProfessionals = professionals || []

      // Fetch premium subscription status for each professional
      if (filteredProfessionals.length > 0) {
        const professionalIds = filteredProfessionals.map(p => p.user_id)
        const { data: subscriptions } = await supabase
          .from("user_subscriptions")
          .select(`
            user_id,
            subscription_plans!inner(name, price)
          `)
          .in("user_id", professionalIds)
          .eq("status", "active")
          .gt("end_date", new Date().toISOString())

        // Add premium status to each professional
        filteredProfessionals = filteredProfessionals.map((prof: any) => {
          const subscription: any = subscriptions?.find((s: any) => s.user_id === prof.user_id)
          const isPremium = subscription && (
            subscription.subscription_plans.name?.toLowerCase().includes("premium") ||
            (subscription.subscription_plans.price && subscription.subscription_plans.price > 0)
          )
          return { ...prof, isPremium: !!isPremium }
        })

        // Sort to prioritize premium users
        filteredProfessionals = filteredProfessionals.sort((a, b) => {
          // Premium users first
          if (a.isPremium && !b.isPremium) return -1
          if (!a.isPremium && b.isPremium) return 1
          // Then by relevance score if it exists
          if (a._relevanceScore && b._relevanceScore && a._relevanceScore !== b._relevanceScore) {
            return b._relevanceScore - a._relevanceScore
          }
          // Finally by created_at
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      }

      // If using coordinate search, filter by exact distance
      if (params.lat && params.lng && filteredProfessionals.length > 0) {
        const searchLat = parseFloat(params.lat)
        const searchLng = parseFloat(params.lng)
        const maxDistanceKm = 32 // 20 miles

        filteredProfessionals = filteredProfessionals.filter(prof => {
          if (!prof.latitude || !prof.longitude) return false

          const distance = calculateDistance(
            searchLat,
            searchLng,
            parseFloat(prof.latitude),
            parseFloat(prof.longitude)
          )
          return distance <= maxDistanceKm
        })
      }

      // Apply search term filtering with relevance scoring
      if (params.search && params.search.trim()) {
        const searchTerm = params.search.trim().toLowerCase()

        // Filter and score professionals
        const scoredProfessionals = filteredProfessionals.map(prof => {
          let score = 0
          const title = (prof.title || '').toLowerCase()
          const firstName = (prof.first_name || '').toLowerCase()
          const lastName = (prof.last_name || '').toLowerCase()
          const skills = (prof.skills || []).map((s: string) => s.toLowerCase())

          // Helper function for fuzzy matching (Levenshtein distance approximation)
          const fuzzyMatch = (str: string, term: string) => {
            if (str.includes(term)) return true
            // Check if words start with the search term
            const words = str.split(/\s+/)
            return words.some(word => word.startsWith(term))
          }

          // Score 4: Title exact match
          if (title === searchTerm) {
            score = 4
          }
          // Score 3: Title contains search term or starts with it
          else if (fuzzyMatch(title, searchTerm)) {
            score = 3
          }
          // Score 2.5: Title words match (e.g., "dev" matches "developer")
          else if (title.split(/\s+/).some((word: string) => word.includes(searchTerm) || searchTerm.includes(word))) {
            score = 2.5
          }
          // Score 2: Skill exact match
          else if (skills.includes(searchTerm)) {
            score = 2
          }
          // Score 1.5: Skill fuzzy match
          else if (skills.some((skill: string) => fuzzyMatch(skill, searchTerm))) {
            score = 1.5
          }
          // Score 1: Skill word match
          else if (skills.some((skill: string) => skill.split(/\s+/).some(word => word.includes(searchTerm)))) {
            score = 1
          }
          // Score 0.5: Name match
          else if (fuzzyMatch(firstName, searchTerm) || fuzzyMatch(lastName, searchTerm)) {
            score = 0.5
          }

          return { ...prof, _relevanceScore: score }
        })

        // Filter out non-matching results and sort by relevance (with premium priority)
        filteredProfessionals = scoredProfessionals
          .filter(prof => prof._relevanceScore > 0)
          .sort((a, b) => {
            // Premium users first
            if (a.isPremium && !b.isPremium) return -1
            if (!a.isPremium && b.isPremium) return 1
            // Then by relevance score DESC
            if (b._relevanceScore !== a._relevanceScore) {
              return b._relevanceScore - a._relevanceScore
            }
            // Finally by created_at DESC
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
      }

      // Fetch review stats for all professionals
      if (filteredProfessionals.length > 0) {
        const userIds = filteredProfessionals.map(p => p.user_id)
        const { data: reviewStats } = await supabase
          .from("user_review_stats")
          .select("user_id, total_reviews, average_rating")
          .in("user_id", userIds)

        // Add review stats to each professional
        filteredProfessionals = filteredProfessionals.map(prof => {
          const stats = reviewStats?.find(s => s.user_id === prof.user_id)
          return {
            ...prof,
            rating: stats?.average_rating || null,
            reviewCount: stats?.total_reviews || 0
          }
        })
      }

      data = filteredProfessionals

      console.log("[PROFESSIONALS-DEBUG] Professional search details:", {
        search: params.search,
        location: params.location,
        lat: params.lat,
        lng: params.lng,
        isCoordinateLocation: params.location?.match(/^Location\s+[-\d.]+,\s*[-\d.]+$/),
        usingCoordinateSearch: !!(params.lat && params.lng),
        locationParts: params.location ? params.location.split(',').map(p => p.trim()) : [],
        rawResultsFound: professionals?.length || 0,
        filteredResultsFound: data.length,
        searchFilters: {
          hasSearch: !!params.search,
          hasLocation: !!params.location,
          hasCoordinates: !!(params.lat && params.lng),
          hasLevel: !!params.level,
          hasSkills: !!params.skills,
          selfEmployedFilter: params.self_employed
        }
      })

      // Log some sample results for debugging
      if (data.length > 0) {
        console.log("[PROFESSIONALS-DEBUG] Sample results:",
          data.slice(0, 3).map(prof => ({
            id: prof.id,
            name: `${prof.first_name} ${prof.last_name}`,
            title: prof.title,
            location: prof.location,
            coordinates: prof.latitude && prof.longitude ? [prof.latitude, prof.longitude] : null,
            available: prof.available_for_work
          }))
        )
      }

      // Set center for professionals
      if (params.lat && params.lng) {
        center = [Number.parseFloat(params.lat), Number.parseFloat(params.lng)]
      } else if (data.length > 0) {
        const firstProfWithCoords = data.find((prof) => prof.latitude && prof.longitude)
        if (firstProfWithCoords) {
          center = [firstProfWithCoords.latitude, firstProfWithCoords.longitude]
        }
      }
    } else if (isEmployee) {
      // If company-specific filters are used, search companies instead of jobs
      if (hasCompanyFilters) {
        let query = supabase
          .from("company_profiles")
          .select("*")
          .order("created_at", { ascending: false })

        // Apply company search filters
        if (params.search) {
          query = query.or(`company_name.ilike.%${params.search}%,description.ilike.%${params.search}%,industry.ilike.%${params.search}%`)
        }

        if (params.location) {
          // Skip coordinate-based location strings (e.g. "Location 51.5046, -0.1263")
          if (!params.location.match(/^Location\s+[-\d.]+,\s*[-\d.]+$/)) {
            query = query.ilike("location", `%${params.location}%`)
          }
        }

        if (params.open_for_business && params.open_for_business !== "all") {
          const isOpen = params.open_for_business === "true"
          query = query.eq("open_for_business", isOpen)
        }

        if (params.hiring && params.hiring !== "all") {
          const isHiring = params.hiring === "true"
          query = query.eq("is_hiring", isHiring)
        }

        const { data: companies } = await query
        data = companies || []

        // Set center for companies
        if (params.lat && params.lng) {
          center = [Number.parseFloat(params.lat), Number.parseFloat(params.lng)]
        } else if (data.length > 0) {
          const firstCompanyWithCoords = data.find((company) => company.latitude && company.longitude)
          if (firstCompanyWithCoords) {
            center = [firstCompanyWithCoords.latitude, firstCompanyWithCoords.longitude]
          }
        }
      } else {
        // Default job search for professionals
        let query = supabase
          .from("jobs")
          .select(`
            *,
            company_profiles (
              company_name,
              location,
              industry
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        // Apply job search filters
        if (params.search) {
          query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
        }

        if (params.location) {
          // Skip coordinate-based location strings (e.g. "Location 51.5046, -0.1263")
          if (!params.location.match(/^Location\s+[-\d.]+,\s*[-\d.]+$/)) {
            query = query.ilike("location", `%${params.location}%`)
          }
        }

        if (params.type) {
          query = query.eq("job_type", params.type)
        }

        if (params.level) {
          query = query.eq("experience_level", params.level)
        }

        if (params.salaryMin) {
          const minSalary = Number.parseInt(params.salaryMin)
          if (!Number.isNaN(minSalary)) {
            query = query.gte("salary_min", minSalary)
          }
        }

        const { data: jobs } = await query
        data = jobs || []

        // Set center for jobs
        if (params.lat && params.lng) {
          center = [Number.parseFloat(params.lat), Number.parseFloat(params.lng)]
        } else if (data.length > 0) {
          const firstJobWithCoords = data.find((job) => job.latitude && job.longitude)
          if (firstJobWithCoords) {
            center = [firstJobWithCoords.latitude, firstJobWithCoords.longitude]
          }
        }
      }
    }
  }

  return (
    <ProfessionalsPageContent
      data={data}
      user={user}
      userType={userData?.user_type || null}
      searchParams={effectiveParams}
      center={center}
    />
  )
}
