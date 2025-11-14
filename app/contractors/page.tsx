import { createClient } from "@/lib/server"
import ContractorMapView from "@/components/contractor-map-view"

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    location?: string
    lat?: string
    lng?: string
    radius?: string
    self_employed?: string
    company?: string
    language?: string
    service_24_7?: string
    skills?: string
  }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  // Check if there are any search parameters
  const hasSearchParams = Boolean(
    params.search ||
    params.location ||
    params.lat ||
    params.lng ||
    params.self_employed ||
    params.company ||
    params.language ||
    params.service_24_7 ||
    params.skills
  )

  let contractors: any[] = []

  // Only query contractors if there are search parameters
  if (hasSearchParams) {
    console.log("[CONTRACTORS-PAGE] Building query with params:", {
      search: params.search,
      location: params.location,
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
      self_employed: params.self_employed,
      company: params.company,
      language: params.language,
      service_24_7: params.service_24_7,
      skills: params.skills
    })

    // Build union query for both professionals and companies
    let professionalQuery = supabase
      .from("professional_profiles")
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        nickname,
        title,
        bio,
        location,
        skills,
        spoken_languages,
        is_self_employed,
        ready_to_relocate,
        latitude,
        longitude,
        profile_photo_url,
        created_at,
        users!inner(email, user_type)
      `)
      .eq("users.user_type", "professional")

    let companyQuery = supabase
      .from("company_profiles")
      .select(`
        id,
        user_id,
        company_name,
        description,
        industry,
        location,
        spoken_languages,
        service_24_7,
        latitude,
        longitude,
        logo_url,
        created_at
      `)

    // Note: Search filtering is done post-query for better relevance scoring

    // Apply location filters
    if (params.location) {
      console.log("[CONTRACTORS-PAGE] Applying location filter:", params.location)

      if (params.lat && params.lng) {
        const radius = params.radius || "10" // Default to 10 miles
        const lat = parseFloat(params.lat)
        const lng = parseFloat(params.lng)
        const radiusKm = parseFloat(radius) * 1.60934 // Convert miles to km

        console.log("[CONTRACTORS-PAGE] Using radius-based location search:", {
          lat, lng, radiusKm, radiusMiles: radius
        })

        // Use bounding box approximation
        const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
        const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

        professionalQuery = professionalQuery
          .gte("latitude", lat - latDelta)
          .lte("latitude", lat + latDelta)
          .gte("longitude", lng - lngDelta)
          .lte("longitude", lng + lngDelta)

        companyQuery = companyQuery
          .gte("latitude", lat - latDelta)
          .lte("latitude", lat + latDelta)
          .gte("longitude", lng - lngDelta)
          .lte("longitude", lng + lngDelta)
      } else {
        // Flexible location search
        const locationParts = params.location.split(',').map(part => part.trim())
        const mainLocation = locationParts[0]
        console.log("[CONTRACTORS-PAGE] Using flexible location search for:", mainLocation)
        professionalQuery = professionalQuery.ilike("location", `%${mainLocation}%`)
        companyQuery = companyQuery.ilike("location", `%${mainLocation}%`)
      }
    }

    // Apply contractor type filters
    if (params.self_employed === "true") {
      professionalQuery = professionalQuery.eq("is_self_employed", true)
    }

    // Apply language filter (case-insensitive by capitalizing first letter)
    if (params.language) {
      const languageCapitalized = params.language.charAt(0).toUpperCase() + params.language.slice(1).toLowerCase()
      console.log("[CONTRACTORS-PAGE] Applying language filter:", params.language, "→", languageCapitalized)
      professionalQuery = professionalQuery.contains("spoken_languages", [languageCapitalized])
      companyQuery = companyQuery.contains("spoken_languages", [languageCapitalized])
    }

    // Apply 24/7 service filter
    if (params.service_24_7 === "true") {
      companyQuery = companyQuery.eq("service_24_7", true)
    }

    // Apply skills filter (case-insensitive by capitalizing first letter)
    if (params.skills) {
      const skillsCapitalized = params.skills.charAt(0).toUpperCase() + params.skills.slice(1).toLowerCase()
      console.log("[CONTRACTORS-PAGE] Applying skills filter:", params.skills, "→", skillsCapitalized)
      professionalQuery = professionalQuery.contains("skills", [skillsCapitalized])
    }

    // Execute queries
    const [professionalResults, companyResults] = await Promise.all([
      params.self_employed === "true" || !params.company ? professionalQuery : Promise.resolve({ data: [], error: null }),
      params.company === "true" || !params.self_employed ? companyQuery : Promise.resolve({ data: [], error: null })
    ])

    if (professionalResults.error) {
      console.error("[CONTRACTORS-PAGE] Professional query error:", professionalResults.error)
    }

    if (companyResults.error) {
      console.error("[CONTRACTORS-PAGE] Company query error:", companyResults.error)
    }

    // Fetch profile statistics for ratings and reviews
    const allUserIds = [
      ...(professionalResults.data || []).map((p: any) => p.user_id),
      ...(companyResults.data || []).map((c: any) => c.user_id)
    ]

    let ratingsMap: Record<string, { average_rating: number | null; total_reviews: number }> = {}

    if (allUserIds.length > 0) {
      try {
        const { data: statsData, error: statsError } = await supabase
          .from("profile_statistics")
          .select("user_id, total_reviews, average_rating")
          .in("user_id", allUserIds)

        if (statsError) {
          console.log("[CONTRACTORS-PAGE] Profile statistics not available:", statsError.message)
        } else if (statsData) {
          ratingsMap = statsData.reduce((acc: any, stat: any) => {
            acc[stat.user_id] = {
              average_rating: stat.average_rating,
              total_reviews: stat.total_reviews
            }
            return acc
          }, {})
        }
      } catch (error) {
        console.log("[CONTRACTORS-PAGE] Error fetching profile statistics:", error)
        // Continue without ratings - they'll default to null/0
      }
    }

    // Combine and normalize results
    const professionals = (professionalResults.data || []).map((item: any) => {
      const stats = ratingsMap[item.user_id] || { average_rating: null, total_reviews: 0 }
      return {
        ...item,
        type: 'professional',
        name: item.nickname || `${item.first_name} ${item.last_name}`,
        display_name: item.nickname || `${item.first_name} ${item.last_name}`,
        description: item.bio,
        photo_url: item.profile_photo_url,
        rating: stats.average_rating,
        reviewCount: stats.total_reviews
      }
    })

    const companies = (companyResults.data || []).map((item: any) => {
      const stats = ratingsMap[item.user_id] || { average_rating: null, total_reviews: 0 }
      return {
        ...item,
        type: 'company',
        name: item.company_name,
        display_name: item.company_name,
        description: item.description,
        photo_url: item.logo_url,
        rating: stats.average_rating,
        reviewCount: stats.total_reviews
      }
    })

    contractors = [...professionals, ...companies]

    // Apply search term filtering with relevance scoring
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.trim().toLowerCase()
      console.log("[CONTRACTORS-PAGE] Applying search term with relevance scoring:", searchTerm)

      const scoredContractors = contractors.map(contractor => {
        let score = 0

        if (contractor.type === 'professional') {
          const title = (contractor.title || '').toLowerCase()
          const firstName = (contractor.first_name || '').toLowerCase()
          const lastName = (contractor.last_name || '').toLowerCase()
          const nickname = (contractor.nickname || '').toLowerCase()
          const bio = (contractor.bio || '').toLowerCase()
          const skills = (contractor.skills || []).map((s: string) => s.toLowerCase())

          // Score 4: Title exact match
          if (title === searchTerm) {
            score = 4
          }
          // Score 3: Title partial match
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
          // Score 0.5: Name or bio match
          else if (firstName.includes(searchTerm) || lastName.includes(searchTerm) || nickname.includes(searchTerm) || bio.includes(searchTerm)) {
            score = 0.5
          }
        } else {
          // For companies
          const companyName = (contractor.company_name || '').toLowerCase()
          const description = (contractor.description || '').toLowerCase()
          const industry = (contractor.industry || '').toLowerCase()
          const services = (contractor.services || []).map((s: string) => s.toLowerCase())

          // Score 5: Company name exact match
          if (companyName === searchTerm) {
            score = 5
          }
          // Score 4: Company name partial match
          else if (companyName.includes(searchTerm)) {
            score = 4
          }
          // Score 3: Services exact match (highest priority for functionality)
          else if (services.includes(searchTerm)) {
            score = 3
          }
          // Score 2: Services partial match
          else if (services.some((service: string) => service.includes(searchTerm))) {
            score = 2
          }
          // Score 1: Industry match
          else if (industry === searchTerm || industry.includes(searchTerm)) {
            score = 1
          }
          // Score 0.5: Description match
          else if (description.includes(searchTerm)) {
            score = 0.5
          }
        }

        return { ...contractor, _relevanceScore: score }
      })

      // Filter out non-matching results and sort by relevance
      contractors = scoredContractors
        .filter(contractor => contractor._relevanceScore > 0)
        .sort((a, b) => {
          // Sort by score DESC, then by created_at DESC
          if (b._relevanceScore !== a._relevanceScore) {
            return b._relevanceScore - a._relevanceScore
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

      console.log("[CONTRACTORS-PAGE] After relevance filtering:", contractors.length, "contractors")
    }

    console.log("[CONTRACTORS-PAGE] Query executed. Contractors found:", contractors.length)
    console.log("[CONTRACTORS-PAGE] Professionals:", professionals.length, "Companies:", companies.length)
  } else {
    console.log("[CONTRACTORS-PAGE] No search parameters provided, showing empty map")
  }

  // Get current user for personalization
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Filter contractors with coordinates for map display
  const contractorsWithCoords = contractors.filter((contractor) => contractor.latitude && contractor.longitude)
  console.log("[CONTRACTORS-PAGE] Contractors with coordinates:", contractorsWithCoords.length, "out of", contractors.length)

  // Determine map center
  let center: [number, number] = [51.5074, -0.1278] // Default to London
  if (params.lat && params.lng) {
    center = [Number.parseFloat(params.lat), Number.parseFloat(params.lng)]
  } else if (contractorsWithCoords.length > 0) {
    // Center on first contractor with coordinates
    center = [contractorsWithCoords[0].latitude, contractorsWithCoords[0].longitude]
  }

  return <ContractorMapView contractors={contractors} user={user} searchParams={params} center={center} />
}