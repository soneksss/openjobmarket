"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LocationInput } from "@/components/location-input"
import { Search, Users, Hammer, Map, X, Target, MapPin, SlidersHorizontal } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ProfessionalMap } from "@/components/professional-map"
import ProfessionalsPageContent from "@/components/professionals-page-content"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"

const RESULT_LIMIT = 100

interface MainPageSearchProps {
  onSearchStateChange?: (hasResults: boolean) => void
  externalSearchQuery?: string
}

export function MainPageSearch({ onSearchStateChange, externalSearchQuery }: MainPageSearchProps = {}) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<"professional" | "company" | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [selectedSearchType, setSelectedSearchType] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders">("vacancies")

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [mapPickerRadius, setMapPickerRadius] = useState("10")
  const [mapPickerKey, setMapPickerKey] = useState(0)

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false)

  // Filter values state
  const [jobType, setJobType] = useState("all")
  const [experienceLevel, setExperienceLevel] = useState("all")
  const [workLocation, setWorkLocation] = useState("all")
  const [salaryRange, setSalaryRange] = useState("all")
  const [noExperienceRequired, setNoExperienceRequired] = useState(false)
  const [drivingLicenseRequired, setDrivingLicenseRequired] = useState(false)
  const [ownTransportRequired, setOwnTransportRequired] = useState(false)
  const [tradeCategory, setTradeCategory] = useState("all")
  const [urgency, setUrgency] = useState("all")
  const [budgetRange, setBudgetRange] = useState("all")
  const [tradeJobType, setTradeJobType] = useState("all")
  const [distance, setDistance] = useState("10")
  const [employmentStatus, setEmploymentStatus] = useState("all")
  const [hasCVUploaded, setHasCVUploaded] = useState(false)
  const [hasDrivingLicense, setHasDrivingLicense] = useState(false)
  const [hasOwnTransport, setHasOwnTransport] = useState(false)
  const [willingToRelocate, setWillingToRelocate] = useState(false)
  const [availableForBusiness, setAvailableForBusiness] = useState(false)

  // Full-screen map modal state for all users
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapResults, setMapResults] = useState<any[]>([])
  const [searchType, setSearchType] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders" | null>(null)
  const [modalSearchType, setModalSearchType] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders" | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.5074, -0.1278])
  const [resultLimitReached, setResultLimitReached] = useState(false)

  // State for restoring search from "Back to Search"
  const [restoreSearch, setRestoreSearch] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders" | null>(null)

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  // Ref to track if we should skip showing autocomplete (e.g., when query comes from category click)
  const skipAutocompleteRef = useRef(false)

  // Debug: Component mount
  useEffect(() => {
    console.log('[AUTOCOMPLETE] Component mounted, search type:', selectedSearchType)
  }, [])

  // Get suggestions - unified list for all search types
  const getSuggestions = (): string[] => {
    return [
      // Professional & Office Jobs
      "Software Engineer", "Web Developer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
      "Mobile Developer", "DevOps Engineer", "Data Scientist", "Machine Learning Engineer",
      "Project Manager", "Product Manager", "Scrum Master", "Business Analyst", "Product Owner",
      "Marketing Manager", "Digital Marketer", "SEO Specialist", "Content Creator", "Social Media Manager",
      "UX/UI Designer", "Graphic Designer", "Product Designer", "Web Designer",
      "Sales Representative", "Sales Manager", "Account Manager", "Customer Success",
      "Accountant", "Financial Analyst", "Finance Manager",
      "HR Manager", "HR Specialist", "Recruiter",
      "Data Analyst", "Quality Assurance", "Test Engineer",
      "Network Engineer", "Network Administrator", "Database Administrator", "IT Support", "Security Analyst",
      "Legal Advisor", "Compliance Officer", "Risk Manager",
      "Operations Manager", "Supply Chain Manager", "Warehouse Manager", "Logistics Coordinator",
      "Customer Service", "Administrative Assistant", "Support Engineer",
      "Content Writer", "Copywriter", "Technical Writer", "Video Editor", "Photographer",
      "Teacher", "Nurse", "Pharmacist", "Physiotherapist",

      // Trades & Construction
      "Plumber", "Plumbing", "Emergency Plumber", "Gas Engineer", "Heating Engineer", "Boiler Installer",
      "Electrician", "Electrical Work", "Rewiring", "Consumer Unit Upgrade",
      "Carpenter", "Carpentry", "Kitchen Fitter", "Joiner",
      "Builder", "Construction Manager", "General Builder", "Site Manager",
      "Bricklayer", "Bricklaying", "Groundworker",
      "Plasterer", "Plastering", "Rendering Specialist",
      "Painter", "Painter & Decorator", "Painting & Decorating", "Decorator",
      "Roofer", "Roofing", "Roofing Repair", "Guttering",
      "Tiler", "Tiling", "Bathroom Fitter", "Bathroom Installation",
      "Flooring Specialist", "Flooring", "Carpet Fitter",
      "Window Fitter", "Window Installation", "Door Installation", "Glazier",
      "Kitchen Fitter", "Kitchen Installation",
      "Landscaper", "Gardener", "Garden Landscaping", "Tree Surgeon", "Tree Surgery",
      "Paving", "Paving Contractor", "Decking",
      "Fencing", "Fencing Contractor",
      "Handyman", "General Maintenance",
      "Locksmith", "Security Specialist",
      "CCTV Installer", "CCTV Installation", "Alarm Engineer", "Alarm System",
      "Drainage Specialist", "Drainage Work", "Blocked Drain",
      "Damp Proofing", "Waterproofing",
      "Scaffolder", "Scaffolding",
      "Architect", "Surveyor", "Interior Designer", "Structural Engineer",
      "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
      "Health & Safety Officer",
      "Solar Panel Installer", "Solar Panels", "Renewable Energy", "Air Conditioning",
      "Conservatory", "Loft Conversion", "Extension Building", "Garage Conversion",

      // Other Trades & Services
      "Mechanic", "Auto Electrician", "Vehicle Technician",
      "Warehouse Operative", "Driver", "Delivery Driver", "HGV Driver",
      "Cleaner", "Cleaning Services", "Deep Cleaning",
      "Pest Control", "Exterminator"
    ]
  }

  // Filter suggestions based on search query
  useEffect(() => {
    console.log('[AUTOCOMPLETE] useEffect running - searchQuery:', searchQuery)

    // Skip autocomplete if flag is set (e.g., query came from category click)
    if (skipAutocompleteRef.current) {
      console.log('[AUTOCOMPLETE] Skipping autocomplete - query from external source')
      skipAutocompleteRef.current = false // Reset the flag
      setShowSuggestions(false)
      setFilteredSuggestions([])
      return
    }

    if (searchQuery.trim().length >= 1) {
      const suggestions = getSuggestions()
      console.log('[AUTOCOMPLETE] Total suggestions available:', suggestions.length)
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase())
      )
      console.log('[AUTOCOMPLETE] Filtered suggestions:', filtered.length, filtered)
      setFilteredSuggestions(filtered.slice(0, 8)) // Show max 8 suggestions
      setShowSuggestions(filtered.length > 0)
      console.log('[AUTOCOMPLETE] Setting showSuggestions to:', filtered.length > 0)
    } else {
      console.log('[AUTOCOMPLETE] Search query empty, hiding suggestions')
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }, [searchQuery])

  // Update search query from external source (e.g., category clicks)
  useEffect(() => {
    if (externalSearchQuery) {
      // Set flag to skip autocomplete suggestions for this query
      skipAutocompleteRef.current = true
      setSearchQuery(externalSearchQuery)
      // If user clicked a category but hasn't selected a location, show a helpful message
      if (!selectedLocation) {
        setLocationError("Please select a location to search")
      }
    }
  }, [externalSearchQuery, selectedLocation])

  // Check auth state and user type
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .single()

        setUserType(userData?.user_type || null)

        // Fetch professional profile if user is a professional
        const { data: profileData } = await supabase
          .from("professional_profiles")
          .select("id, first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle()

        setUserProfile(profileData)
      } else {
        setUserType(null)
        setUserProfile(null)
      }
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", session.user.id)
          .single()

        setUserType(userData?.user_type || null)

        // Fetch professional profile if user is a professional
        const { data: profileData } = await supabase
          .from("professional_profiles")
          .select("id, first_name, last_name")
          .eq("user_id", session.user.id)
          .maybeSingle()

        setUserProfile(profileData)
      } else {
        setUserType(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Handle tab URL parameter and restore search state from "Back to Search"
  useEffect(() => {
    const tab = searchParams?.get('tab')
    console.log("[MAIN-PAGE-SEARCH] URL changed, all searchParams:", {
      tab,
      query: searchParams?.get('query'),
      location: searchParams?.get('location'),
      lat: searchParams?.get('lat'),
      lon: searchParams?.get('lon')
    })

    if (tab) {
      console.log("[MAIN-PAGE-SEARCH] Tab parameter detected:", tab)
      if (tab === 'vacancies' || tab === 'jobs_tasks' || tab === 'talents' || tab === 'traders') {
        setSelectedSearchType(tab)
        console.log("[MAIN-PAGE-SEARCH] Selected search type set to:", tab)

        // Check if we're returning from a job detail page with search params
        const query = searchParams?.get('query')
        const locationName = searchParams?.get('location')
        const lat = searchParams?.get('lat')
        const lon = searchParams?.get('lon')

        if (query && locationName && lat && lon) {
          console.log("[MAIN-PAGE-SEARCH] ✅ Restoring search from job detail return:", {
            query, locationName, lat, lon
          })
          // Restore search state
          setSearchQuery(query)
          setLocation(locationName)
          setSelectedLocation({ lat: parseFloat(lat), lon: parseFloat(lon) })
          // Set a flag to trigger search after state is updated
          setRestoreSearch(tab)
        } else {
          console.log("[MAIN-PAGE-SEARCH] ❌ Missing search params - not restoring:", {
            hasQuery: !!query,
            hasLocation: !!locationName,
            hasLat: !!lat,
            hasLon: !!lon
          })
        }
      }
    }
  }, [searchParams])

  // Separate effect to trigger search after state restoration
  useEffect(() => {
    if (restoreSearch && searchQuery && location && selectedLocation) {
      console.log("[MAIN-PAGE-SEARCH] State restored, triggering search for:", restoreSearch)
      handleSearch(restoreSearch)
      setRestoreSearch(null) // Clear the flag
    }
  }, [restoreSearch, searchQuery, location, selectedLocation])

  // Utility function to format address in short format
  const formatShortAddress = (suggestion: any): string => {
    if (!suggestion.address) {
      return suggestion.display_name
    }

    const parts: string[] = []
    const addr = suggestion.address

    // Add street (road + house number)
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`)
    } else if (addr.road) {
      parts.push(addr.road)
    }

    // Add town/city
    const locality = addr.city || addr.town || addr.village || addr.suburb
    if (locality) {
      parts.push(locality)
    }

    // Add postcode
    if (addr.postcode) {
      parts.push(addr.postcode)
    }

    // Add country
    if (addr.country) {
      parts.push(addr.country)
    }

    return parts.length > 0 ? parts.join(", ") : suggestion.display_name
  }

  useEffect(() => {
    const extractLocationFromQuery = async (query: string) => {
      const locationPatterns = [/\bin\s+([a-zA-Z\s,]+)$/i, /\bat\s+([a-zA-Z\s,]+)$/i, /,\s*([a-zA-Z\s,]+)$/i]

      for (const pattern of locationPatterns) {
        const match = query.match(pattern)
        if (match) {
          const extractedLocation = match[1].trim()
          if (extractedLocation.length > 2 && !location && !selectedLocation) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(extractedLocation)}&limit=1&countrycodes=gb,us,de,fr&addressdetails=1`,
              )
              const data = await response.json()
              if (data.length > 0) {
                const suggestion = data[0]
                const shortAddress = formatShortAddress(suggestion)
                setLocation(shortAddress)
                setSelectedLocation({
                  lat: Number.parseFloat(suggestion.lat),
                  lon: Number.parseFloat(suggestion.lon),
                })
                setSearchQuery(query.replace(pattern, "").trim())
              }
            } catch (error) {
              console.error("Auto location extraction failed:", error)
            }
          }
          break
        }
      }
    }

    if (searchQuery && !location && !selectedLocation) {
      extractLocationFromQuery(searchQuery)
    }
  }, [searchQuery]) // Removed location and selectedLocation from dependencies to prevent infinite loop

  const handleLocationSelect = (locationName: string, lat: number, lon: number) => {
    setLocation(locationName)
    setSelectedLocation({ lat, lon })
    setLocationError("")
  }

  const validateSearch = () => {
    // Allow empty search query if filters are selected OR "No experience required" is checked
    const hasVacancyFilters = jobType !== "all" || experienceLevel !== "all" || workLocation !== "all" ||
                              salaryRange !== "all" || noExperienceRequired || drivingLicenseRequired || ownTransportRequired
    const hasTradeJobFilters = tradeCategory !== "all" || urgency !== "all" || budgetRange !== "all" || tradeJobType !== "all"
    const hasTraderFilters = tradeCategory !== "all" || availableForBusiness
    const hasTalentFilters = experienceLevel !== "all" || employmentStatus !== "all" || hasCVUploaded ||
                             hasDrivingLicense || hasOwnTransport || willingToRelocate

    const canSkipSearchQuery =
      (selectedSearchType === "vacancies" && hasVacancyFilters) ||
      (selectedSearchType === "jobs_tasks" && hasTradeJobFilters) ||
      (selectedSearchType === "traders" && hasTraderFilters) ||
      (selectedSearchType === "talents" && hasTalentFilters)

    if (!searchQuery.trim() && !canSkipSearchQuery) {
      return t('mainSearch.enterSearchTerm')
    }

    // Allow empty location if work location is "Remote"
    const canSkipLocation = workLocation === "remote"

    if (!location.trim() && !canSkipLocation) {
      return t('mainSearch.selectLocation')
    }
    if (!selectedLocation && !canSkipLocation) {
      setLocationError(t('mainSearch.selectValidLocation'))
      return t('mainSearch.selectValidLocation')
    }
    return null
  }

  const handleSearch = async (type: "vacancies" | "jobs_tasks" | "talents" | "traders") => {
    console.log(`[MAIN-PAGE-SEARCH] handleSearch called with type: ${type}`)

    // Check if sign-in is required to search
    try {
      const { data: signinRequired, error: signinError } = await supabase.rpc('is_signin_required_to_search')

      if (signinError) {
        console.error('[MAIN-PAGE-SEARCH] Error checking signin requirement:', signinError)
      } else if (signinRequired && !user) {
        console.log('[MAIN-PAGE-SEARCH] Sign-in required but user not logged in. Redirecting...')
        // Redirect to sign-up page to encourage new user registration
        // Preserve locale when redirecting
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
        const isOnBrRoute = pathname?.startsWith('/br')
        const signUpUrl = isOnBrRoute
          ? `/auth/sign-up?locale=pt-BR&redirect=${returnUrl}`
          : `/auth/sign-up?redirect=${returnUrl}`
        router.push(signUpUrl)
        return
      }
    } catch (err) {
      console.error('[MAIN-PAGE-SEARCH] Exception checking signin requirement:', err)
      // Continue with search on error (fail open for better UX)
    }

    const error = validateSearch()
    if (error) {
      console.log(`[MAIN-PAGE-SEARCH] Validation error: ${error}`)
      return
    }

    console.log(`[MAIN-PAGE-SEARCH] Starting search for ${type}`)
    setIsSearching(true)
    setResultLimitReached(false) // Reset limit warning

    // Always show modal for all users (registered and unregistered)
    try {
      let results: any[] = []

      // Get radius value in miles
      const radiusMiles = parseInt(distance) || 10

      if (type === "traders") {
        console.log(`[MAIN-PAGE-SEARCH] Fetching traders/contractors`)
        // Fetch traders: contractors AND self-employed professionals AND companies who trade
        let contractorResults: any[] = []
        let professionalResults: any[] = []
        let companyResults: any[] = []

        // Fetch contractors (primary source for tradespeople)
        let contractorQuery = supabase
          .from("contractor_profiles")
          .select("*")

        if (searchQuery.trim()) {
          contractorQuery = contractorQuery.or(`company_name.ilike.%${searchQuery.trim()}%,industry.ilike.%${searchQuery.trim()}%`)
        }

        // Apply trader filters
        console.log(`[MAIN-PAGE-SEARCH] Applying trader filters:`, { tradeCategory, availableForBusiness, distance })

        // Trade Category filter
        if (tradeCategory !== "all") {
          let categoryValue = tradeCategory
          if (tradeCategory === "construction") categoryValue = "Construction"
          if (tradeCategory === "plumbing") categoryValue = "Plumbing"
          if (tradeCategory === "electrical") categoryValue = "Electrical"
          if (tradeCategory === "carpentry") categoryValue = "Carpentry"
          if (tradeCategory === "painting") categoryValue = "Painting"
          if (tradeCategory === "roofing") categoryValue = "Roofing"
          if (tradeCategory === "landscaping") categoryValue = "Landscaping"

          console.log(`[MAIN-PAGE-SEARCH] Filtering by industry: ${categoryValue}`)
          contractorQuery = contractorQuery.ilike("industry", `%${categoryValue}%`)
        }

        // 24/7 Service filter
        if (availableForBusiness) {
          console.log(`[MAIN-PAGE-SEARCH] Filtering by available_247: true`)
          contractorQuery = contractorQuery.eq("available_247", true)
        }

        // Apply location-based radius filtering
        if (selectedLocation) {
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusMiles = parseInt(distance) || 10
          const radiusKm = radiusMiles * 1.60934
          const latDelta = radiusKm / 111.0
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          console.log(`[MAIN-PAGE-SEARCH] Applying location filter: ${radiusMiles} miles radius`)

          contractorQuery = contractorQuery
            .gte("latitude", lat - latDelta)
            .lte("latitude", lat + latDelta)
            .gte("longitude", lon - lngDelta)
            .lte("longitude", lon + lngDelta)
        }

        console.log(`[MAIN-PAGE-SEARCH] Executing contractor query...`)
        const { data: contractorData, error: contractorError } = await contractorQuery.limit(RESULT_LIMIT + 1)

        if (contractorError) {
          console.error(`[MAIN-PAGE-SEARCH] Contractor query error:`, contractorError)
        } else {
          console.log(`[MAIN-PAGE-SEARCH] Contractor query returned ${contractorData?.length || 0} results`)
        }

        if (contractorData) {
          contractorResults = contractorData
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              name: item.company_name || 'Contractor',
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              },
              type: 'contractor'
            }))
        }

        // Fetch self-employed professionals as well
        let profQuery = supabase
          .from("professional_profiles")
          .select("*")
          .eq("profile_visible", true)
          .eq("available_for_work", true)
          .eq("is_self_employed", true)

        if (searchQuery.trim()) {
          profQuery = profQuery.or(`first_name.ilike.%${searchQuery.trim()}%,last_name.ilike.%${searchQuery.trim()}%,title.ilike.%${searchQuery.trim()}%`)
        }

        // Apply location-based radius filtering
        if (selectedLocation) {
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusMiles = parseInt(distance) || 10
          const radiusKm = radiusMiles * 1.60934
          const latDelta = radiusKm / 111.0
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          profQuery = profQuery
            .gte("latitude", lat - latDelta)
            .lte("latitude", lat + latDelta)
            .gte("longitude", lon - lngDelta)
            .lte("longitude", lon + lngDelta)
        }

        console.log(`[MAIN-PAGE-SEARCH] Executing professional query...`)
        const { data: profData, error: profError } = await profQuery.limit(RESULT_LIMIT + 1)

        if (profError) {
          console.error(`[MAIN-PAGE-SEARCH] Professional query error:`, profError)
        } else {
          console.log(`[MAIN-PAGE-SEARCH] Professional query returned ${profData?.length || 0} results`)
        }

        if (profData) {
          professionalResults = profData
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              },
              type: 'professional'
            }))
        }

        // Fetch companies who trade (open_for_business)
        let companyQuery = supabase
          .from("company_profiles")
          .select("*")
          .eq("open_for_business", true)

        if (searchQuery.trim()) {
          companyQuery = companyQuery.ilike("company_name", `%${searchQuery.trim()}%`)
        }

        // Apply location-based radius filtering
        if (selectedLocation) {
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusMiles = parseInt(distance) || 10
          const radiusKm = radiusMiles * 1.60934
          const latDelta = radiusKm / 111.0
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          companyQuery = companyQuery
            .gte("latitude", lat - latDelta)
            .lte("latitude", lat + latDelta)
            .gte("longitude", lon - lngDelta)
            .lte("longitude", lon + lngDelta)
        }

        console.log(`[MAIN-PAGE-SEARCH] Executing company query...`)
        const { data: companyData, error: companyError } = await companyQuery.limit(RESULT_LIMIT + 1)

        if (companyError) {
          console.error(`[MAIN-PAGE-SEARCH] Company query error:`, companyError)
        } else {
          console.log(`[MAIN-PAGE-SEARCH] Company query returned ${companyData?.length || 0} results`)
        }

        if (companyData) {
          companyResults = companyData
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              name: item.company_name,
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              },
              type: 'company'
            }))
        }

        // Combine all results
        console.log(`[MAIN-PAGE-SEARCH] Combining trader results: contractors=${contractorResults.length}, professionals=${professionalResults.length}, companies=${companyResults.length}`)
        results = [...contractorResults, ...professionalResults, ...companyResults]
        console.log(`[MAIN-PAGE-SEARCH] Total trader results: ${results.length}`)
      } else if (type === "talents") {
        console.log(`[MAIN-PAGE-SEARCH] Fetching talents/professionals`)
        // Fetch all professionals (not just self-employed)
        let query = supabase
          .from("professional_profiles")
          .select("*")
          .eq("profile_visible", true)
          .eq("available_for_work", true)

        if (searchQuery.trim()) {
          query = query.or(`first_name.ilike.%${searchQuery.trim()}%,last_name.ilike.%${searchQuery.trim()}%,title.ilike.%${searchQuery.trim()}%`)
        }

        // Apply talent filters
        console.log(`[MAIN-PAGE-SEARCH] Applying talent filters:`, { experienceLevel, employmentStatus, hasCVUploaded, hasDrivingLicense, hasOwnTransport, willingToRelocate })

        // Experience Level filter
        if (experienceLevel !== "all") {
          console.log(`[MAIN-PAGE-SEARCH] Filtering by experience_level: ${experienceLevel}`)
          query = query.eq("experience_level", experienceLevel)
        }

        // Employment Status filter
        if (employmentStatus !== "all") {
          console.log(`[MAIN-PAGE-SEARCH] Filtering by employment_status: ${employmentStatus}`)
          if (employmentStatus === "self-employed") {
            query = query.eq("is_self_employed", true)
          } else {
            query = query.eq("employment_status", employmentStatus)
          }
        }

        // Has CV uploaded filter
        if (hasCVUploaded) {
          console.log(`[MAIN-PAGE-SEARCH] Filtering by has CV uploaded`)
          // Note: CV is stored in separate cvs table, we'll filter this in post-processing
          // or we need to join with cvs table
        }

        // Has driving license filter
        if (hasDrivingLicense) {
          console.log(`[MAIN-PAGE-SEARCH] Filtering by has_driving_licence: true`)
          query = query.eq("has_driving_licence", true)
        }

        // Has own transport filter
        if (hasOwnTransport) {
          console.log(`[MAIN-PAGE-SEARCH] Filtering by has_own_transport: true`)
          query = query.eq("has_own_transport", true)
        }

        // Willing to relocate filter
        if (willingToRelocate) {
          console.log(`[MAIN-PAGE-SEARCH] Filtering by ready_to_relocate: true`)
          query = query.eq("ready_to_relocate", true)
        }

        // Apply location-based radius filtering if coordinates are available
        if (selectedLocation && distance !== "remote") {
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusMiles = parseInt(distance) || 10
          const radiusKm = radiusMiles * 1.60934 // Convert miles to km

          console.log(`[MAIN-PAGE-SEARCH] Applying location filter: ${radiusMiles} miles radius`)

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          // Use .or() with and() format to avoid PostgREST errors with complex joins
          query = query.or(
            `and(latitude.gte.${lat - latDelta},latitude.lte.${lat + latDelta},longitude.gte.${lon - lngDelta},longitude.lte.${lon + lngDelta})`
          )
        }

        const { data, error } = await query.limit(RESULT_LIMIT + 1)

        if (!error && data) {
          // Transform data to match ProfessionalMap expected format
          results = data
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              }
            }))
        }
      } else if (type === "vacancies" || type === "jobs_tasks") {
        console.log(`[MAIN-PAGE-SEARCH] Fetching jobs/vacancies, is_tradespeople_job=${type === "jobs_tasks"}`)
        // Fetch jobs - exclude expired ones
        // Vacancies = employee positions (is_tradespeople_job = false)
        // Jobs/Tasks = tradespeople work (is_tradespeople_job = true)
        let query = supabase
          .from("jobs")
          .select(`
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
          `)
          .eq("is_active", true)
          .eq("is_tradespeople_job", type === "jobs_tasks") // true for jobs/tasks, false for vacancies
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

        // Apply filters for vacancies (regular jobs)
        if (type === "vacancies") {
          console.log(`[MAIN-PAGE-SEARCH] Applying vacancy filters:`, { jobType, experienceLevel, workLocation, noExperienceRequired, salaryRange })

          // Job Type filter
          if (jobType !== "all") {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by job_type: ${jobType}`)
            query = query.eq("job_type", jobType)
          }

          // Experience Level filter
          if (experienceLevel !== "all") {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by experience_level: ${experienceLevel}`)
            query = query.eq("experience_level", experienceLevel)
          }

          // Work Location filter
          if (workLocation !== "all") {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by work_location: ${workLocation}`)
            query = query.eq("work_location", workLocation)
          }

          // No Experience Required filter
          if (noExperienceRequired) {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by no_experience_required: true`)
            query = query.eq("no_experience_required", true)
          }

          // Driving License Required filter
          if (drivingLicenseRequired) {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by driving license required`)
            // Filter for jobs where requirements array contains driving license
            // Using OR to match common variations
            query = query.or('requirements.cs.{"Driving License (Full UK)"},requirements.cs.{"Driving License"},requirements.cs.{"Driver\'s License"},requirements.cs.{"Full UK Driving License"}')
          }

          // Own Transport Required filter
          if (ownTransportRequired) {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by own transport required`)
            // Filter for jobs where requirements array contains own vehicle/transport
            query = query.or('requirements.cs.{"Own Vehicle"},requirements.cs.{"Own Transport"},requirements.cs.{"Own Tools/Equipment"}')
          }

          // Salary Range filter
          if (salaryRange !== "all") {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by salary range: ${salaryRange}`)
            switch (salaryRange) {
              case "0-30k":
                query = query.lte("salary_max", 30000)
                break
              case "30-50k":
                query = query.gte("salary_min", 30000).lte("salary_max", 50000)
                break
              case "50-75k":
                query = query.gte("salary_min", 50000).lte("salary_max", 75000)
                break
              case "75-100k":
                query = query.gte("salary_min", 75000).lte("salary_max", 100000)
                break
              case "100k+":
                query = query.gte("salary_min", 100000)
                break
            }
          }
        }

        // Apply filters for trade jobs
        if (type === "jobs_tasks") {
          console.log(`[MAIN-PAGE-SEARCH] Applying trade job filters:`, { tradeCategory, urgency, budgetRange, tradeJobType })

          // Trade Category filter
          if (tradeCategory !== "all") {
            // Map filter values to actual category values
            let categoryValue = tradeCategory
            if (tradeCategory === "construction") categoryValue = "Construction"
            if (tradeCategory === "plumbing") categoryValue = "Plumbing"
            if (tradeCategory === "electrical") categoryValue = "Electrical"
            if (tradeCategory === "carpentry") categoryValue = "Carpentry"
            if (tradeCategory === "painting") categoryValue = "Painting & Decorating"
            if (tradeCategory === "roofing") categoryValue = "Roofing"
            if (tradeCategory === "landscaping") categoryValue = "Gardening"

            console.log(`[MAIN-PAGE-SEARCH] Filtering by category: ${categoryValue}`)
            query = query.eq("category", categoryValue)
          }

          // Urgency filter
          if (urgency !== "all") {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by urgency: ${urgency}`)
            query = query.eq("urgency", urgency)
          }

          // Job Type filter
          if (tradeJobType !== "all") {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by job_type: ${tradeJobType}`)
            query = query.eq("job_type", tradeJobType)
          }

          // Budget Range filter
          if (budgetRange !== "all") {
            console.log(`[MAIN-PAGE-SEARCH] Filtering by budget range: ${budgetRange}`)
            switch (budgetRange) {
              case "0-500":
                query = query.lte("budget_max", 500)
                break
              case "500-1k":
                query = query.gte("budget_min", 500).lte("budget_max", 1000)
                break
              case "1k-5k":
                query = query.gte("budget_min", 1000).lte("budget_max", 5000)
                break
              case "5k-10k":
                query = query.gte("budget_min", 5000).lte("budget_max", 10000)
                break
              case "10k+":
                query = query.gte("budget_min", 10000)
                break
            }
          }
        }

        // Apply location-based radius filtering if coordinates are available
        if (selectedLocation) {
          console.log(`[MAIN-PAGE-SEARCH] Applying location filter with radius ${radiusMiles} miles:`, selectedLocation)
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusKm = radiusMiles * 1.60934 // Convert miles to km

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          // Apply location filters directly (AND logic)
          query = query
            .gte("latitude", lat - latDelta)
            .lte("latitude", lat + latDelta)
            .gte("longitude", lon - lngDelta)
            .lte("longitude", lon + lngDelta)
        }

        if (searchQuery.trim()) {
          console.log(`[MAIN-PAGE-SEARCH] Applying search filter: ${searchQuery.trim()}`)

          // Split search query by common delimiters (/, comma, space, parentheses) to handle searches like "Builder (Construction)"
          const searchTerms = searchQuery.trim()
            .split(/[\/,\s()]+/) // Split by /, comma, space, or parentheses
            .filter(term => term.length > 0) // Remove empty strings
            .map(term => term.trim()) // Trim whitespace

          console.log(`[MAIN-PAGE-SEARCH] Search terms after splitting:`, searchTerms)

          if (searchTerms.length > 1) {
            // For multiple terms (e.g., "Builder/Extension" -> ["Builder", "Extension"])
            // Search for ANY of the terms in title or description
            const orConditions = searchTerms.map(term =>
              `title.ilike.%${term}%,description.ilike.%${term}%`
            ).join(',')

            console.log(`[MAIN-PAGE-SEARCH] Using multi-term OR condition:`, orConditions)
            query = query.or(orConditions)
          } else {
            // Single term - use original logic
            query = query.or(`title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%`)
          }
        }

        console.log(`[MAIN-PAGE-SEARCH] Executing query...`)
        const { data, error } = await query.limit(RESULT_LIMIT + 1)
        console.log(`[MAIN-PAGE-SEARCH] Query completed. Error:`, error, `Data count:`, data?.length)

        if (error) {
          console.error(`[MAIN-PAGE-SEARCH] Query error:`, error)
        }

        if (!error && data) {
          console.log(`[MAIN-PAGE-SEARCH] Raw data received:`, data.length, 'jobs')
          // Enrich jobs with poster information
          results = data
            .filter(item => item.latitude && item.longitude)
            .map((job: any) => {
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

          console.log(`[MAIN-PAGE-SEARCH] Enriched ${results.length} jobs with poster data`)
        }
      }

      // Set center from selected location or first result
      let center: [number, number] = [51.5074, -0.1278]
      if (selectedLocation) {
        center = [selectedLocation.lat, selectedLocation.lon]
      } else if (results.length > 0) {
        const firstWithCoords = results.find((item: any) =>
          (item.latitude && item.longitude) || (item.coordinates?.lat && item.coordinates?.lon)
        )
        if (firstWithCoords) {
          if (firstWithCoords.coordinates) {
            center = [firstWithCoords.coordinates.lat, firstWithCoords.coordinates.lon]
          } else {
            center = [firstWithCoords.latitude, firstWithCoords.longitude]
          }
        }
      }

      // Check if result limit was reached and trim if necessary
      if (results.length > RESULT_LIMIT) {
        console.log(`[MAIN-PAGE-SEARCH] Result limit reached: ${results.length} results found, showing first ${RESULT_LIMIT}`)
        results = results.slice(0, RESULT_LIMIT)
        setResultLimitReached(true)
      } else {
        setResultLimitReached(false)
      }

      // Dispatch event to hide guest banner BEFORE showing modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mainPageSearch'))
      }

      console.log(`[MAIN-PAGE-SEARCH] Setting results: ${results.length}, center:`, center, `searchType: ${type}`)
      setMapResults(results)
      setMapCenter(center)
      setSearchType(type)
      setModalSearchType(type)  // Store the type specifically for modal display
      setShowMapModal(true)
      console.log(`[MAIN-PAGE-SEARCH] Modal should now be visible`)
    } catch (error) {
      console.error("[MAIN-PAGE-SEARCH] Search error:", error)
      // Ensure loading state is reset even on error
      alert(t('mainSearch.searchFailed'))
    } finally {
      setIsSearching(false)
      console.log(`[MAIN-PAGE-SEARCH] Search completed, isSearching set to false`)
    }
  }

  const handleMapPickerClick = () => {
    // Dispatch event to hide banners when map picker opens
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mainPageSearch'))
    }
    setMapPickerKey(prev => prev + 1) // Increment key to force fresh map instance
    setShowMapPicker(true)
  }

  const handleMapLocationPick = (lat: number, lon: number) => {
    setMapPickerLocation({
      lat,
      lon,
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    })
  }

  const confirmMapPickerLocation = () => {
    if (mapPickerLocation) {
      setLocation(mapPickerLocation.name)
      setSelectedLocation({ lat: mapPickerLocation.lat, lon: mapPickerLocation.lon })
      setDistance(mapPickerRadius) // Apply the selected radius to distance filter
      setShowMapPicker(false)
      setLocationError("")
    }
  }

  const cancelMapPicker = () => {
    setShowMapPicker(false)
    setMapPickerLocation(null)
    setMapPickerRadius("10")
  }

  // Handle search updates within modal without navigation
  const handleModalSearchUpdate = async (params: any) => {
    try {
      let results: any[] = []
      const searchTerm = params.search || ""
      const isTraders = params.traders === "true"

      // Get location from params or use the original selectedLocation
      const searchLat = params.lat ? parseFloat(params.lat) : selectedLocation?.lat
      const searchLng = params.lng ? parseFloat(params.lng) : selectedLocation?.lon

      if (modalSearchType === "traders") {
        // Fetch traders: self-employed professionals AND companies who trade
        let professionalResults: any[] = []
        let companyResults: any[] = []

        // Fetch self-employed professionals
        let profQuery = supabase
          .from("professional_profiles")
          .select("*")
          .eq("profile_visible", true)
          .eq("available_for_work", true)
          .eq("is_self_employed", true)

        if (searchTerm) {
          profQuery = profQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)
        }

        if (searchLat && searchLng) {
          const radius = 10
          const radiusKm = radius * 1.60934
          const latDelta = radiusKm / 111.0
          const lngDelta = radiusKm / (111.0 * Math.cos(searchLat * Math.PI / 180))

          profQuery = profQuery
            .gte("latitude", searchLat - latDelta)
            .lte("latitude", searchLat + latDelta)
            .gte("longitude", searchLng - lngDelta)
            .lte("longitude", searchLng + lngDelta)
        }

        const { data: profData } = await profQuery.limit(RESULT_LIMIT + 1)

        if (profData) {
          professionalResults = profData
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              },
              type: 'professional'
            }))
        }

        // Fetch companies who trade (open_for_business)
        let companyQuery = supabase
          .from("company_profiles")
          .select("*")
          .eq("open_for_business", true)

        if (searchTerm) {
          companyQuery = companyQuery.ilike("company_name", `%${searchTerm}%`)
        }

        if (searchLat && searchLng) {
          const radius = 10
          const radiusKm = radius * 1.60934
          const latDelta = radiusKm / 111.0
          const lngDelta = radiusKm / (111.0 * Math.cos(searchLat * Math.PI / 180))

          companyQuery = companyQuery
            .gte("latitude", searchLat - latDelta)
            .lte("latitude", searchLat + latDelta)
            .gte("longitude", searchLng - lngDelta)
            .lte("longitude", searchLng + lngDelta)
        }

        const { data: companyData } = await companyQuery.limit(RESULT_LIMIT + 1)

        if (companyData) {
          companyResults = companyData
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              name: item.company_name,
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              },
              type: 'company'
            }))
        }

        // Combine both results
        results = [...professionalResults, ...companyResults]
      } else if (modalSearchType === "talents") {
        // Fetch all professionals (not just self-employed)
        let query = supabase
          .from("professional_profiles")
          .select("*")
          .eq("profile_visible", true)
          .eq("available_for_work", true)

        if (searchTerm) {
          query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)
        }

        // Apply location-based radius filtering if coordinates are available
        if (searchLat && searchLng) {
          const radius = 10 // Default to 10 miles radius
          const radiusKm = radius * 1.60934 // Convert miles to km

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(searchLat * Math.PI / 180))

          query = query
            .gte("latitude", searchLat - latDelta)
            .lte("latitude", searchLat + latDelta)
            .gte("longitude", searchLng - lngDelta)
            .lte("longitude", searchLng + lngDelta)
        }

        const { data, error } = await query.limit(RESULT_LIMIT + 1)

        if (!error && data) {
          results = data
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              }
            }))
        }
      } else if (modalSearchType === "vacancies" || modalSearchType === "jobs_tasks") {
        // Fetch jobs - exclude expired ones
        // Vacancies = employee positions (is_tradespeople_job = false)
        // Jobs/Tasks = tradespeople work (is_tradespeople_job = true)
        let query = supabase
          .from("jobs")
          .select(`
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
          `)
          .eq("is_active", true)
          .eq("is_tradespeople_job", modalSearchType === "jobs_tasks") // true for jobs/tasks, false for vacancies
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        }

        // Apply location-based radius filtering if coordinates are available
        if (searchLat && searchLng) {
          const radius = 10 // Default to 10 miles radius
          const radiusKm = radius * 1.60934 // Convert miles to km

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(searchLat * Math.PI / 180))

          // Use .or() with and() format to avoid PostgREST errors with complex joins
          query = query.or(
            `and(latitude.gte.${searchLat - latDelta},latitude.lte.${searchLat + latDelta},longitude.gte.${searchLng - lngDelta},longitude.lte.${searchLng + lngDelta})`
          )
        }

        const { data, error } = await query.limit(RESULT_LIMIT + 1)

        if (error) {
          console.error(`[MAIN-PAGE-SEARCH-MODAL] Query error:`, error)
        }

        if (!error && data) {
          console.log(`[MAIN-PAGE-SEARCH-MODAL] Raw data received:`, data.length, 'jobs')
          // Enrich jobs with poster information
          results = data
            .filter(item => item.latitude && item.longitude)
            .map((job: any) => {
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

          console.log(`[MAIN-PAGE-SEARCH-MODAL] Enriched ${results.length} jobs with poster data`)
        }
      }

      setMapResults(results)

      // Update center if lat/lng provided
      if (params.lat && params.lng) {
        setMapCenter([parseFloat(params.lat), parseFloat(params.lng)])
      }
    } catch (error) {
      console.error("Modal search update error:", error)
    }
  }


  return (
    <div className="w-full relative z-[100]">
      <div className="max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-sm rounded-lg md:rounded-xl p-2 sm:p-3 md:p-4 shadow-xl border border-white/10">
        <h2 className="text-xs sm:text-sm md:text-base font-bold text-white mb-2 sm:mb-2.5 md:mb-3 text-center">
          {t('mainSearch.title')}
        </h2>

        {/* Selectable Search Type Buttons */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <button
            onClick={() => setSelectedSearchType("vacancies")}
            className={`h-8 sm:h-9 text-xs sm:text-sm font-semibold rounded-md md:rounded-lg transition-all duration-200 ${
              selectedSearchType === "vacancies"
                ? "bg-blue-500 text-white shadow-lg scale-[1.02]"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            {t('mainSearch.vacancies')}
          </button>
          <button
            onClick={() => setSelectedSearchType("jobs_tasks")}
            className={`h-8 sm:h-9 text-xs sm:text-sm font-semibold rounded-md md:rounded-lg transition-all duration-200 ${
              selectedSearchType === "jobs_tasks"
                ? "bg-purple-500 text-white shadow-lg scale-[1.02]"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            {t('mainSearch.tradeJobs')}
          </button>
          <button
            onClick={() => setSelectedSearchType("traders")}
            className={`h-8 sm:h-9 text-xs sm:text-sm font-semibold rounded-md md:rounded-lg transition-all duration-200 ${
              selectedSearchType === "traders"
                ? "bg-orange-500 text-white shadow-lg scale-[1.02]"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            {t('mainSearch.tradespeople')}
          </button>
          <button
            onClick={() => setSelectedSearchType("talents")}
            className={`h-8 sm:h-9 text-xs sm:text-sm font-semibold rounded-md md:rounded-lg transition-all duration-200 ${
              selectedSearchType === "talents"
                ? "bg-emerald-500 text-white shadow-lg scale-[1.02]"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            {t('mainSearch.talents')}
          </button>
        </div>

        {/* Search Inputs */}
        <div className="flex flex-col gap-2">
          {/* First row: Search input, Location input, Map picker */}
          <div className="flex gap-2 items-start">
            {/* Search input with autocomplete */}
            <div className="flex-1 h-8 sm:h-9 md:h-10 relative">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  console.log('[AUTOCOMPLETE-INPUT] onChange triggered:', e.target.value)
                  setSearchQuery(e.target.value)
                }}
                onKeyPress={(e) => e.key === "Enter" && handleSearch(selectedSearchType)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => {
                    setShowSuggestions(false)
                  }, 200)
                }}
                placeholder={t('mainSearch.searchPlaceholder')}
                className="h-full text-xs md:text-sm px-3 md:px-4 bg-white border-0 focus:ring-2 focus:ring-emerald-500/30 rounded-md md:rounded-lg font-medium placeholder:text-gray-500 shadow-md w-full"
              />

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] max-h-64 overflow-y-auto">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent blur event on input
                        e.preventDefault()
                        // Set flag to skip autocomplete when suggestion is selected
                        skipAutocompleteRef.current = true
                        setSearchQuery(suggestion)
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-gray-100 last:border-b-0"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location input */}
            <div className="flex-1 h-8 sm:h-9 md:h-10">
              <LocationInput
                value={location}
                onChange={setLocation}
                onLocationSelect={handleLocationSelect}
                placeholder={t('mainSearch.locationPlaceholder')}
                error={locationError}
              />
            </div>

            {/* Map picker button */}
            <Button
              onClick={handleMapPickerClick}
              className="h-8 sm:h-9 md:h-10 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
              title={t('mainSearch.pickLocationOnMap')}
              type="button"
            >
              <Map className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </Button>

            {/* Search button - desktop only */}
            <Button
              onClick={() => handleSearch(selectedSearchType)}
              disabled={isSearching}
              className={`hidden sm:flex h-8 sm:h-9 md:h-10 px-4 sm:px-6 text-xs sm:text-sm font-bold text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex-shrink-0 ${
                selectedSearchType === "vacancies" ? "bg-blue-600 hover:bg-blue-700" :
                selectedSearchType === "jobs_tasks" ? "bg-purple-600 hover:bg-purple-700" :
                selectedSearchType === "traders" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <Search className="h-4 w-4 mr-1.5" />
              {isSearching ? t('mainSearch.searching') : t('mainSearch.search')}
            </Button>

            {/* Filter button - desktop only */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`hidden sm:flex h-8 sm:h-9 md:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 ${
                selectedSearchType === "vacancies" ? "bg-blue-600 hover:bg-blue-700" :
                selectedSearchType === "jobs_tasks" ? "bg-purple-600 hover:bg-purple-700" :
                selectedSearchType === "traders" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-emerald-600 hover:bg-emerald-700"
              } ${showFilters ? "ring-2 ring-white/50" : ""}`}
              title={t('mainSearch.toggleFilters')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Second row: Search and Filter buttons - mobile only */}
          <div className="sm:hidden flex gap-2">
            <Button
              onClick={() => handleSearch(selectedSearchType)}
              disabled={isSearching}
              className={`flex-1 h-8 text-xs font-bold text-white rounded-md shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 ${
                selectedSearchType === "vacancies" ? "bg-blue-600 hover:bg-blue-700" :
                selectedSearchType === "jobs_tasks" ? "bg-purple-600 hover:bg-purple-700" :
                selectedSearchType === "traders" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <Search className="h-4 w-4 mr-1.5" />
              {isSearching ? t('mainSearch.searching') : t('mainSearch.search')}
            </Button>

            {/* Filter button - mobile */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 px-3 text-xs font-bold text-white rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 ${
                selectedSearchType === "vacancies" ? "bg-blue-600 hover:bg-blue-700" :
                selectedSearchType === "jobs_tasks" ? "bg-purple-600 hover:bg-purple-700" :
                selectedSearchType === "traders" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-emerald-600 hover:bg-emerald-700"
              } ${showFilters ? "ring-2 ring-white/50" : ""}`}
              title={t('mainSearch.toggleFilters')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Panel - shows when showFilters is true */}
          {showFilters && (
            <div className="mt-3 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
              <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {t('common.filters')}
                {selectedSearchType === "vacancies" && t('mainSearch.filtersJobVacancies')}
                {selectedSearchType === "jobs_tasks" && t('mainSearch.filtersTradeJobs')}
                {selectedSearchType === "traders" && t('mainSearch.filtersTradespeople')}
                {selectedSearchType === "talents" && t('mainSearch.filtersTalents')}
              </h3>

              {/* Vacancies Filters */}
              {selectedSearchType === "vacancies" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.jobType')}</label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTypes')}</SelectItem>
                        <SelectItem value="full-time">{t('mainSearch.fullTime')}</SelectItem>
                        <SelectItem value="part-time">{t('mainSearch.partTime')}</SelectItem>
                        <SelectItem value="contract">{t('mainSearch.contract')}</SelectItem>
                        <SelectItem value="temporary">{t('mainSearch.temporary')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.experienceLevel')}</label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allLevels')}</SelectItem>
                        <SelectItem value="entry">{t('mainSearch.entryLevel')}</SelectItem>
                        <SelectItem value="mid">{t('mainSearch.midLevel')}</SelectItem>
                        <SelectItem value="senior">{t('mainSearch.seniorLevel')}</SelectItem>
                        <SelectItem value="lead">{t('mainSearch.leadPrincipal')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.workLocation')}</label>
                    <Select value={workLocation} onValueChange={setWorkLocation}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allLocations')}</SelectItem>
                        <SelectItem value="remote">{t('mainSearch.remote')}</SelectItem>
                        <SelectItem value="onsite">{t('mainSearch.onsite')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.salaryRange')}</label>
                    <Select value={salaryRange} onValueChange={setSalaryRange}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anySalary')}</SelectItem>
                        <SelectItem value="0-30k">{t('mainSearch.under30k')}</SelectItem>
                        <SelectItem value="30-50k">{t('mainSearch.salary30to50k')}</SelectItem>
                        <SelectItem value="50-75k">{t('mainSearch.salary50to75k')}</SelectItem>
                        <SelectItem value="75-100k">{t('mainSearch.salary75to100k')}</SelectItem>
                        <SelectItem value="100k+">{t('mainSearch.salary100kPlus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skills Input */}
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.requiredSkills')}</label>
                    <Input
                      placeholder={t('mainSearch.skillsPlaceholder')}
                      className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Checkbox filters for Vacancies */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={noExperienceRequired}
                        onChange={(e) => setNoExperienceRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.noExperienceTraining')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={drivingLicenseRequired}
                        onChange={(e) => setDrivingLicenseRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.drivingLicenseRequired')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={ownTransportRequired}
                        onChange={(e) => setOwnTransportRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.ownTransportRequired')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Trade Jobs Filters */}
              {selectedSearchType === "jobs_tasks" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.industry')}</label>
                    <Select value={tradeCategory} onValueChange={setTradeCategory}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allIndustries')}</SelectItem>
                        <SelectItem value="construction">{t('mainSearch.construction')}</SelectItem>
                        <SelectItem value="plumbing">{t('mainSearch.plumbing')}</SelectItem>
                        <SelectItem value="electrical">{t('mainSearch.electrical')}</SelectItem>
                        <SelectItem value="carpentry">{t('mainSearch.carpentry')}</SelectItem>
                        <SelectItem value="painting">{t('mainSearch.paintingDecorating')}</SelectItem>
                        <SelectItem value="roofing">{t('mainSearch.roofing')}</SelectItem>
                        <SelectItem value="landscaping">{t('mainSearch.landscaping')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.urgency')}</label>
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyTime')}</SelectItem>
                        <SelectItem value="urgent">{t('mainSearch.urgentASAP')}</SelectItem>
                        <SelectItem value="week">{t('mainSearch.withinWeek')}</SelectItem>
                        <SelectItem value="month">{t('mainSearch.withinMonth')}</SelectItem>
                        <SelectItem value="flexible">{t('mainSearch.flexible')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.budgetRange')}</label>
                    <Select value={budgetRange} onValueChange={setBudgetRange}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyBudget')}</SelectItem>
                        <SelectItem value="0-500">{t('mainSearch.under500')}</SelectItem>
                        <SelectItem value="500-1k">{t('mainSearch.budget500to1k')}</SelectItem>
                        <SelectItem value="1k-5k">{t('mainSearch.budget1kto5k')}</SelectItem>
                        <SelectItem value="5k-10k">{t('mainSearch.budget5kto10k')}</SelectItem>
                        <SelectItem value="10k+">{t('mainSearch.budget10kPlus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.jobType')}</label>
                    <Select value={tradeJobType} onValueChange={setTradeJobType}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTypes')}</SelectItem>
                        <SelectItem value="one-off">{t('mainSearch.oneOffJob')}</SelectItem>
                        <SelectItem value="ongoing">{t('mainSearch.ongoingWork')}</SelectItem>
                        <SelectItem value="emergency">{t('mainSearch.emergency')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkbox filters for Trade Jobs */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={noExperienceRequired}
                        onChange={(e) => setNoExperienceRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.noExperienceRequired')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={drivingLicenseRequired}
                        onChange={(e) => setDrivingLicenseRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.drivingLicenseRequired')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={ownTransportRequired}
                        onChange={(e) => setOwnTransportRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.ownTransportRequired')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tradespeople Filters */}
              {selectedSearchType === "traders" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.distance')}</label>
                    <Select value={distance} onValueChange={setDistance}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">{t('mainSearch.within5Miles')}</SelectItem>
                        <SelectItem value="10">{t('mainSearch.within10Miles')}</SelectItem>
                        <SelectItem value="25">{t('mainSearch.within25Miles')}</SelectItem>
                        <SelectItem value="50">{t('mainSearch.within50Miles')}</SelectItem>
                        <SelectItem value="100">{t('mainSearch.within100Miles')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.urgency')}</label>
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyTime')}</SelectItem>
                        <SelectItem value="urgent">{t('mainSearch.urgentASAP')}</SelectItem>
                        <SelectItem value="week">{t('mainSearch.withinWeek')}</SelectItem>
                        <SelectItem value="month">{t('mainSearch.withinMonth')}</SelectItem>
                        <SelectItem value="flexible">{t('mainSearch.flexible')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.jobType')}</label>
                    <Select value={tradeJobType} onValueChange={setTradeJobType}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTypes')}</SelectItem>
                        <SelectItem value="one-off">{t('mainSearch.oneOffJob')}</SelectItem>
                        <SelectItem value="ongoing">{t('mainSearch.ongoingWork')}</SelectItem>
                        <SelectItem value="emergency">{t('mainSearch.emergency')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trade Category Input */}
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.tradeCategory')}</label>
                    <Select value={tradeCategory} onValueChange={setTradeCategory}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTrades')}</SelectItem>
                        <SelectItem value="construction">{t('mainSearch.construction')}</SelectItem>
                        <SelectItem value="plumbing">{t('mainSearch.plumbing')}</SelectItem>
                        <SelectItem value="electrical">{t('mainSearch.electrical')}</SelectItem>
                        <SelectItem value="carpentry">{t('mainSearch.carpentry')}</SelectItem>
                        <SelectItem value="painting">{t('mainSearch.paintingDecorating')}</SelectItem>
                        <SelectItem value="roofing">{t('mainSearch.roofing')}</SelectItem>
                        <SelectItem value="landscaping">{t('mainSearch.landscaping')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkbox filters for Tradespeople */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={availableForBusiness}
                        onChange={(e) => setAvailableForBusiness(e.target.checked)}
                      />
                      <span>{t('mainSearch.service247')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Talents Filters */}
              {selectedSearchType === "talents" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.experienceLevel')}</label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allLevels')}</SelectItem>
                        <SelectItem value="entry">{t('mainSearch.entryLevel02')}</SelectItem>
                        <SelectItem value="mid">{t('mainSearch.midLevel35')}</SelectItem>
                        <SelectItem value="senior">{t('mainSearch.senior610')}</SelectItem>
                        <SelectItem value="expert">{t('mainSearch.expert10Plus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.employmentStatus')}</label>
                    <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyStatus')}</SelectItem>
                        <SelectItem value="unemployed">{t('mainSearch.lookingForWork')}</SelectItem>
                        <SelectItem value="employed">{t('mainSearch.openToOpportunities')}</SelectItem>
                        <SelectItem value="self-employed">{t('mainSearch.selfEmployed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.distance')}</label>
                    <Select value={distance} onValueChange={setDistance}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">{t('mainSearch.within5Miles')}</SelectItem>
                        <SelectItem value="10">{t('mainSearch.within10Miles')}</SelectItem>
                        <SelectItem value="25">{t('mainSearch.within25Miles')}</SelectItem>
                        <SelectItem value="50">{t('mainSearch.within50Miles')}</SelectItem>
                        <SelectItem value="100">{t('mainSearch.within100Miles')}</SelectItem>
                        <SelectItem value="remote">{t('mainSearch.remoteAnyLocation')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkbox filters for Talents */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={hasCVUploaded}
                        onChange={(e) => setHasCVUploaded(e.target.checked)}
                      />
                      <span>{t('mainSearch.hasCVUploaded')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={hasDrivingLicense}
                        onChange={(e) => setHasDrivingLicense(e.target.checked)}
                      />
                      <span>{t('mainSearch.hasDrivingLicense')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={hasOwnTransport}
                        onChange={(e) => setHasOwnTransport(e.target.checked)}
                      />
                      <span>{t('mainSearch.hasOwnTransport')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={willingToRelocate}
                        onChange={(e) => setWillingToRelocate(e.target.checked)}
                      />
                      <span>{t('mainSearch.willingToRelocate')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Clear Filters Button */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                <Button
                  onClick={() => {
                    // Reset all filters to default values
                    setJobType("all")
                    setExperienceLevel("all")
                    setWorkLocation("all")
                    setSalaryRange("all")
                    setNoExperienceRequired(false)
                    setDrivingLicenseRequired(false)
                    setOwnTransportRequired(false)
                    setTradeCategory("all")
                    setUrgency("all")
                    setBudgetRange("all")
                    setTradeJobType("all")
                    setDistance("10")
                    setEmploymentStatus("all")
                    setHasCVUploaded(false)
                    setHasDrivingLicense(false)
                    setHasOwnTransport(false)
                    setWillingToRelocate(false)
                    setAvailableForBusiness(false)
                  }}
                  variant="outline"
                  className="flex-1 h-8 text-xs bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  {t('mainSearch.clearFilters')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Map Picker Modal - High z-index to appear above the search results modal */}
        <div style={{ zIndex: 10000, position: 'relative' }}>
          <Dialog open={showMapPicker} onOpenChange={(open) => {
            if (!open) cancelMapPicker()
          }}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-4xl max-h-[95vh] overflow-y-auto p-3 sm:p-6" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{t('mainSearch.mapPickerTitle')}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {t('mainSearch.mapPickerDescription')}
              </DialogDescription>
            </DialogHeader>

            {/* Radius Control */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                <label className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">{t('mainSearch.searchRadius')}</label>
                <Select value={mapPickerRadius} onValueChange={setMapPickerRadius}>
                  <SelectTrigger className="w-28 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm font-medium border-gray-300 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                      <SelectItem key={miles} value={miles.toString()}>
                        {miles} {miles !== 1 ? t('mainSearch.miles') : t('mainSearch.mile')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mapPickerLocation && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  <span className="font-mono">{mapPickerLocation.lat.toFixed(4)}, {mapPickerLocation.lon.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Map Area */}
            <div className="w-full h-[50vh] sm:h-[500px] rounded-lg overflow-hidden border border-gray-200">
              <ProfessionalMap
                key={`map-picker-${mapPickerKey}`}
                professionals={[]}
                center={selectedLocation ? { lat: selectedLocation.lat, lon: selectedLocation.lon } : { lat: 51.5074, lon: -0.1278 }}
                zoom={8}
                height="100%"
                showRadius={!!mapPickerLocation}
                radiusCenter={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
                radiusKm={parseInt(mapPickerRadius) * 1.60934} // Convert miles to km
                onMapClick={handleMapLocationPick}
                selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left mb-2 sm:mb-0 sm:flex-1">
                {mapPickerLocation ? (
                  <span className="font-medium text-gray-900">
                    {t('mainSearch.clickToConfirm')}
                  </span>
                ) : (
                  <span>
                    {t('mainSearch.clickMapToSelect')}
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-center sm:justify-end">
                <Button onClick={cancelMapPicker} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={confirmMapPickerLocation}
                  disabled={!mapPickerLocation}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                >
                  {t('mainSearch.useThisLocation')}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Full-Screen Map Modal - Uses Same Component as Professionals Page */}
      {showMapModal && (
        <div className="fixed inset-0 bg-white z-[9999]" style={{ zIndex: 9999 }}>
          {/* Warning banner when result limit is reached */}
          {resultLimitReached && (
            <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 text-center">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">{t('mainSearch.moreThan100Results')}</span> {t('mainSearch.showing100Results')}
              </p>
            </div>
          )}

          {/* Use the same ProfessionalsPageContent component */}
          <ProfessionalsPageContent
            data={mapResults}
            user={user}
            userType={userType}
            userProfile={userProfile}
            searchParams={{
              search: searchQuery,
              location: location,
              lat: selectedLocation?.lat.toString(),
              lng: selectedLocation?.lon.toString(),
              radius: distance,
              traders: modalSearchType === "traders" ? "true" : undefined,
              vacancies: modalSearchType === "vacancies" ? "true" : undefined,
              jobs_tasks: modalSearchType === "jobs_tasks" ? "true" : undefined,
              talents: modalSearchType === "talents" ? "true" : undefined,
              // Pass all filter values
              jobType: jobType !== "all" ? jobType : undefined,
              experienceLevel: experienceLevel !== "all" ? experienceLevel : undefined,
              workLocation: workLocation !== "all" ? workLocation : undefined,
              salaryRange: salaryRange !== "all" ? salaryRange : undefined,
              noExperienceRequired: noExperienceRequired ? "true" : undefined,
              drivingLicenseRequired: drivingLicenseRequired ? "true" : undefined,
              ownTransportRequired: ownTransportRequired ? "true" : undefined,
              tradeCategory: tradeCategory !== "all" ? tradeCategory : undefined,
              urgency: urgency !== "all" ? urgency : undefined,
              budgetRange: budgetRange !== "all" ? budgetRange : undefined,
              tradeJobType: tradeJobType !== "all" ? tradeJobType : undefined,
              employmentStatus: employmentStatus !== "all" ? employmentStatus : undefined,
              hasCVUploaded: hasCVUploaded ? "true" : undefined,
              hasDrivingLicense: hasDrivingLicense ? "true" : undefined,
              hasOwnTransport: hasOwnTransport ? "true" : undefined,
              willingToRelocate: willingToRelocate ? "true" : undefined,
              availableForBusiness: availableForBusiness ? "true" : undefined,
            } as any}
            center={mapCenter}
            isModal={true}
            onSearchUpdate={handleModalSearchUpdate}
            onModalClose={() => {
              setShowMapModal(false)
              // Dispatch event to show BannerMap again
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('mainPageSearchClose'))
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
