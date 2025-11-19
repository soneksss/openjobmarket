"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LocationInput } from "@/components/location-input"
import { Search, Users, Hammer, Map, X, Target, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
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

interface MainPageSearchProps {
  onSearchStateChange?: (hasResults: boolean) => void
  externalSearchQuery?: string
}

export function MainPageSearch({ onSearchStateChange, externalSearchQuery }: MainPageSearchProps = {}) {
  const router = useRouter()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<"professional" | "company" | null>(null)

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [mapPickerRadius, setMapPickerRadius] = useState("10")
  const [mapPickerKey, setMapPickerKey] = useState(0)

  // Full-screen map modal state for all users
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapResults, setMapResults] = useState<any[]>([])
  const [searchType, setSearchType] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders" | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.5074, -0.1278])

  // Update search query from external source (e.g., category clicks)
  useEffect(() => {
    if (externalSearchQuery) {
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
      } else {
        setUserType(null)
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
      } else {
        setUserType(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

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
    if (!searchQuery.trim()) {
      return "Please enter a search term"
    }
    if (!location.trim()) {
      return "Please select a location"
    }
    if (!selectedLocation) {
      setLocationError("Please select a valid location from the list")
      return "Please select a valid location from the list"
    }
    return null
  }

  const handleSearch = async (type: "vacancies" | "jobs_tasks" | "talents" | "traders") => {
    console.log(`[MAIN-PAGE-SEARCH] handleSearch called with type: ${type}`)
    const error = validateSearch()
    if (error) {
      console.log(`[MAIN-PAGE-SEARCH] Validation error: ${error}`)
      return
    }

    console.log(`[MAIN-PAGE-SEARCH] Starting search for ${type}`)
    setIsSearching(true)
    setSearchType(type)

    // Always show modal for all users (registered and unregistered)
    try {
      let results: any[] = []

      if (type === "traders") {
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

        if (searchQuery.trim()) {
          profQuery = profQuery.or(`first_name.ilike.%${searchQuery.trim()}%,last_name.ilike.%${searchQuery.trim()}%,title.ilike.%${searchQuery.trim()}%`)
        }

        // Apply location-based radius filtering
        if (selectedLocation) {
          const radius = 10
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusKm = radius * 1.60934
          const latDelta = radiusKm / 111.0
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          profQuery = profQuery
            .gte("latitude", lat - latDelta)
            .lte("latitude", lat + latDelta)
            .gte("longitude", lon - lngDelta)
            .lte("longitude", lon + lngDelta)
        }

        const { data: profData } = await profQuery.limit(50)

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
          const radius = 10
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusKm = radius * 1.60934
          const latDelta = radiusKm / 111.0
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          companyQuery = companyQuery
            .gte("latitude", lat - latDelta)
            .lte("latitude", lat + latDelta)
            .gte("longitude", lon - lngDelta)
            .lte("longitude", lon + lngDelta)
        }

        const { data: companyData } = await companyQuery.limit(50)

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
      } else if (type === "talents") {
        // Fetch all professionals (not just self-employed)
        let query = supabase
          .from("professional_profiles")
          .select("*")
          .eq("profile_visible", true)
          .eq("available_for_work", true)

        if (searchQuery.trim()) {
          query = query.or(`first_name.ilike.%${searchQuery.trim()}%,last_name.ilike.%${searchQuery.trim()}%,title.ilike.%${searchQuery.trim()}%`)
        }

        // Apply location-based radius filtering if coordinates are available
        if (selectedLocation) {
          const radius = 10 // Default to 10 miles radius
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusKm = radius * 1.60934 // Convert miles to km

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          // Use .or() with and() format to avoid PostgREST errors with complex joins
          query = query.or(
            `and(latitude.gte.${lat - latDelta},latitude.lte.${lat + latDelta},longitude.gte.${lon - lngDelta},longitude.lte.${lon + lngDelta})`
          )
        }

        const { data, error } = await query.limit(50)

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

        // Apply location-based radius filtering if coordinates are available
        if (selectedLocation) {
          console.log(`[MAIN-PAGE-SEARCH] Applying location filter:`, selectedLocation)
          const radius = 10 // Default to 10 miles radius
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusKm = radius * 1.60934 // Convert miles to km

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
        const { data, error } = await query.limit(50)
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

      // Dispatch event to hide guest banner BEFORE showing modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mainPageSearch'))
      }

      console.log(`[MAIN-PAGE-SEARCH] Setting results: ${results.length}, center:`, center, `searchType: ${type}`)
      setMapResults(results)
      setMapCenter(center)
      setShowMapModal(true)
      console.log(`[MAIN-PAGE-SEARCH] Modal should now be visible`)
    } catch (error) {
      console.error("[MAIN-PAGE-SEARCH] Search error:", error)
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

      if (searchType === "traders") {
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

        const { data: profData } = await profQuery.limit(50)

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

        const { data: companyData } = await companyQuery.limit(50)

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
      } else if (searchType === "talents") {
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

        const { data, error } = await query.limit(50)

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
      } else if (searchType === "vacancies" || searchType === "jobs_tasks") {
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
          .eq("is_tradespeople_job", searchType === "jobs_tasks") // true for jobs/tasks, false for vacancies
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

        const { data, error } = await query.limit(50)

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
    <div className="w-full">
      <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg md:rounded-xl p-2 sm:p-3 md:p-4 shadow-xl border border-white/10">
        <h2 className="text-xs sm:text-sm md:text-base font-bold text-white mb-2 sm:mb-2.5 md:mb-3 text-center">
          Search and Compare
        </h2>

        <div className="flex flex-col sm:flex-col lg:flex-row gap-1.5 sm:gap-2 md:gap-3">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Software Engineer, Marketing, or Company name"
              className="h-7 sm:h-8 md:h-9 text-xs md:text-sm px-2 md:px-3 bg-white border-0 focus:ring-2 focus:ring-emerald-500/30 rounded-md md:rounded-lg font-medium placeholder:text-gray-500 shadow-md"
            />
          </div>
          <div className="flex-1 flex gap-1.5">
            <div className="flex-1">
              <LocationInput
                value={location}
                onChange={setLocation}
                onLocationSelect={handleLocationSelect}
                placeholder="e.g. London, New York, or Remote"
                error={locationError}
              />
            </div>
            <Button
              onClick={handleMapPickerClick}
              className="h-7 sm:h-8 md:h-9 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
              title="Pick location on map"
              type="button"
            >
              <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 mt-2 sm:mt-2.5">
          <Button
            onClick={() => handleSearch("vacancies")}
            disabled={isSearching}
            className="h-7 sm:h-8 md:h-9 text-xs sm:text-xs md:text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:transform-none"
          >
            <Search className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            {isSearching ? "Searching..." : "Find Vacancies"}
          </Button>
          <Button
            onClick={() => handleSearch("jobs_tasks")}
            disabled={isSearching}
            className="h-7 sm:h-8 md:h-9 text-xs sm:text-xs md:text-sm font-bold bg-purple-500 hover:bg-purple-600 text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:transform-none"
          >
            <Hammer className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            {isSearching ? "Searching..." : "Find Jobs (Tasks)"}
          </Button>
          <Button
            onClick={() => handleSearch("traders")}
            disabled={isSearching}
            className="h-7 sm:h-8 md:h-9 text-xs sm:text-xs md:text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:transform-none"
          >
            <Hammer className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            {isSearching ? "Searching..." : "Find Tradespeople"}
          </Button>
          <Button
            onClick={() => handleSearch("talents")}
            disabled={isSearching}
            className="h-7 sm:h-8 md:h-9 text-xs sm:text-xs md:text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:transform-none"
          >
            <Users className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            {isSearching ? "Searching..." : "Find Talent"}
          </Button>
        </div>

        {/* Map Picker Modal */}
        <Dialog open={showMapPicker} onOpenChange={(open) => {
          if (!open) cancelMapPicker()
        }}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-4xl max-h-[95vh] overflow-y-auto p-3 sm:p-6" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Pick Location on Map</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Click anywhere on the map to select your search location
              </DialogDescription>
            </DialogHeader>

            {/* Radius Control */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                <label className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Search Radius:</label>
                <Select value={mapPickerRadius} onValueChange={setMapPickerRadius}>
                  <SelectTrigger className="w-28 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm font-medium border-gray-300 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                      <SelectItem key={miles} value={miles.toString()}>
                        {miles} mile{miles !== 1 ? 's' : ''}
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
                    Click "Use This Location" to confirm your selection
                  </span>
                ) : (
                  <span>
                    Click anywhere on the map to select a location
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-center sm:justify-end">
                <Button onClick={cancelMapPicker} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button
                  onClick={confirmMapPickerLocation}
                  disabled={!mapPickerLocation}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                >
                  Use This Location
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Full-Screen Map Modal - Uses Same Component as Professionals Page */}
      {showMapModal && (
        <div className="fixed inset-0 bg-white z-[9999] overflow-auto">
          {/* Use the same ProfessionalsPageContent component */}
          <ProfessionalsPageContent
            data={mapResults}
            user={user}
            userType={userType}
            searchParams={{
              search: searchQuery,
              location: location,
              lat: selectedLocation?.lat.toString(),
              lng: selectedLocation?.lon.toString(),
              traders: searchType === "traders" ? "true" : undefined,
              vacancies: searchType === "vacancies" ? "true" : undefined,
              jobs_tasks: searchType === "jobs_tasks" ? "true" : undefined,
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
