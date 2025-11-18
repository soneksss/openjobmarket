"use client";

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FloatingMessageModal from "@/components/floating-message-modal"
import { Header } from "@/components/header"
import {
  Briefcase,
  MapPin,
  Search,
  List,
  Map,
  UserIcon,
  ExternalLink,
  Filter,
  DollarSign,
  Users,
  MessageCircle,
  Building,
  Bookmark,
  Store,
  UserCheck,
  Target,
  X,
  ChevronDown,
  Crown,
  Zap,
  Globe,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import ProfessionalMap from "@/components/professional-map"
import JobMap from "@/components/job-map"
import JobCard from "@/components/job-card"
import { LocationInput } from "@/components/location-input"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { createBrowserClient } from "@supabase/ssr"
import { CompactStarRating } from "@/components/compact-star-rating"
import { SignUpPromptModal } from "@/components/sign-up-prompt-modal"
import { getLanguageFlag } from "@/components/language-selector"

interface Professional {
  id: string
  first_name: string
  last_name: string
  title: string
  bio: string
  location: string
  latitude?: number
  longitude?: number
  experience_level: string
  skills: string[]
  portfolio_url?: string
  linkedin_url?: string
  github_url?: string
  salary_min?: number
  salary_max?: number
  created_at: string
  profile_photo_url?: string
  is_self_employed?: boolean
  isPremium?: boolean
  languages?: string[]
  ready_to_relocate?: boolean
  has_driving_licence?: boolean
  has_own_transport?: boolean
  employment_status?: string
  actively_looking?: boolean
  nickname?: string
}

interface Job {
  id: string
  title: string
  job_type: string
  work_location: string
  location: string
  latitude?: number
  longitude?: number
  salary_min?: number
  salary_max?: number
  created_at: string
  company_profiles: {
    company_name: string
    industry: string
  }
}

interface Company {
  id: string
  company_name: string
  description: string
  industry: string
  company_size: string
  website_url?: string
  location: string
  full_address?: string
  logo_url?: string
  latitude?: number
  longitude?: number
  open_for_business?: boolean
  is_hiring?: boolean
  services?: string[]
  price_list?: string
  spoken_languages?: string[]
  created_at: string
}

interface ProfessionalsPageContentProps {
  data: Professional[] | Job[] | Company[]
  user: any | null
  userType: "professional" | "company" | null
  searchParams: {
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
    open_for_business?: string
    hiring?: string
    traders?: string
    vacancies?: string
    jobs_tasks?: string
  }
  center: [number, number]
  isModal?: boolean
  onSearchUpdate?: (params: any) => void
  onModalClose?: () => void
}

export default function ProfessionalsPageContent({
  data,
  user,
  userType,
  searchParams,
  center,
  isModal = false,
  onSearchUpdate,
  onModalClose,
}: ProfessionalsPageContentProps) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")

  // Debug: Log user prop
  console.log("[PROFESSIONALS-PAGE-CONTENT] User prop:", user, "UserType:", userType)
  const [locationFilter, setLocationFilter] = useState(searchParams.location || "")
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lon: number } | null>(
    searchParams.lat && searchParams.lng
      ? { lat: parseFloat(searchParams.lat), lon: parseFloat(searchParams.lng) }
      : null
  )
  const [skillsFilter, setSkillsFilter] = useState(searchParams.skills || "")
  const [languageFilter, setLanguageFilter] = useState((searchParams as any).language || "")
  const [unemployedFilter, setUnemployedFilter] = useState((searchParams as any).unemployed === "true")
  const [employedFilter, setEmployedFilter] = useState((searchParams as any).employed === "true")
  const [relocateFilter, setRelocateFilter] = useState((searchParams as any).relocate === "true")
  const [cvFilter, setCvFilter] = useState((searchParams as any).cv === "true")
  const [drivingLicenseFilter, setDrivingLicenseFilter] = useState((searchParams as any).driving_license === "true")
  const [ownTransportFilter, setOwnTransportFilter] = useState((searchParams as any).own_transport === "true")
  const [selfEmployedFilter, setSelfEmployedFilter] = useState((searchParams as any).self_employed === "true")
  const [availableFilter, setAvailableFilter] = useState((searchParams as any).open_for_business === "true")
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"nearest" | "salary" | "best_match">("best_match")
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null)
  const professionalCardRefs = useRef<{[key: string]: HTMLElement | null}>({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Scroll to selected professional card
  useEffect(() => {
    if (selectedProfessionalId && professionalCardRefs.current[selectedProfessionalId]) {
      professionalCardRefs.current[selectedProfessionalId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedProfessionalId])

  // Full-screen map mode state
  const [isFullScreenMode, setIsFullScreenMode] = useState(false)

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [mapPickerRadius, setMapPickerRadius] = useState("10")

  // Floating message modal state
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean
    recipientId: string
    recipientName: string
    conversationId: string
  } | null>(null)

  // Banner state
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)

  // Sign-up prompt modal state
  const [signUpPrompt, setSignUpPrompt] = useState<{
    isOpen: boolean
    action: "message" | "filter" | "dashboard"
  }>({
    isOpen: false,
    action: "message",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const isEmployer = userType === "company"
  const isEmployee = userType === "professional"

  // Determine if we're showing companies (when professionals search with company filters)
  const hasCompanyFilters = searchParams.open_for_business || searchParams.hiring
  const isShowingCompanies = isEmployee && hasCompanyFilters && data.length > 0 && 'company_name' in data[0]

  // Determine if we're showing traders (self-employed professionals + companies open for business)
  const isShowingTraders = searchParams.traders === "true"

  // Determine if we're showing jobs (vacancies or jobs/tasks)
  const isShowingJobs = searchParams.vacancies === "true" || searchParams.jobs_tasks === "true"

  // Auto-trigger full-screen mode when search params exist (from homepage redirect)
  useEffect(() => {
    const hasSearchParams =
      searchParams.search ||
      searchParams.location ||
      searchParams.lat ||
      searchParams.lng ||
      searchParams.traders

    if (hasSearchParams) {
      setIsFullScreenMode(true)
    }
  }, [searchParams.search, searchParams.location, searchParams.lat, searchParams.lng, searchParams.traders])

  // Clear filter parameters for unregistered users
  useEffect(() => {
    if (!user) {
      const params = new URLSearchParams(currentSearchParams.toString())
      const filterParams = ['type', 'level', 'salaryMin', 'salaryMax', 'radius']
      let hasFilters = false

      // Check if any filter params exist
      filterParams.forEach(param => {
        if (params.has(param)) {
          hasFilters = true
          params.delete(param)
        }
      })

      // If filters were found, redirect to clean URL
      if (hasFilters) {
        router.replace(`/professionals?${params.toString()}`)
      }
    }
  }, [user, currentSearchParams, router])

  const updateSearchParams = (key: string, value: string) => {
    const params = new URLSearchParams(currentSearchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // If in modal mode, call callback instead of navigating
    if (isModal && onSearchUpdate) {
      onSearchUpdate(Object.fromEntries(params))
    } else {
      router.push(`/professionals?${params.toString()}`)
    }
  }

  const handleSearch = (customRadius?: string) => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (locationFilter) params.set("location", locationFilter)
    if (selectedLocationCoords) {
      params.set("lat", selectedLocationCoords.lat.toString())
      params.set("lng", selectedLocationCoords.lon.toString())
    }
    if (skillsFilter) params.set("skills", skillsFilter)
    if (languageFilter) params.set("language", languageFilter)
    if (unemployedFilter) params.set("unemployed", "true")
    if (employedFilter) params.set("employed", "true")
    if (relocateFilter) params.set("relocate", "true")
    if (cvFilter) params.set("cv", "true")
    if (drivingLicenseFilter) params.set("driving_license", "true")
    if (ownTransportFilter) params.set("own_transport", "true")
    if (selfEmployedFilter) params.set("self_employed", "true")
    if (availableFilter) params.set("open_for_business", "true")
    if (searchParams.level) params.set("level", searchParams.level)
    if (searchParams.type) params.set("type", searchParams.type)
    if (searchParams.salaryMin) params.set("salaryMin", searchParams.salaryMin)
    if (searchParams.open_for_business) params.set("open_for_business", searchParams.open_for_business)
    if (searchParams.hiring) params.set("hiring", searchParams.hiring)
    if (searchParams.traders) params.set("traders", searchParams.traders)
    // Include radius from map picker or existing search params
    const radiusToUse = customRadius || searchParams.radius || "20"
    params.set("radius", radiusToUse)

    // If in modal mode, call callback instead of navigating
    if (isModal && onSearchUpdate) {
      onSearchUpdate(Object.fromEntries(params))
    } else {
      router.push(`/professionals?${params.toString()}`)
    }
  }

  const handleLocationSelect = (locationName: string, lat: number, lon: number) => {
    setLocationFilter(locationName)
    setSelectedLocationCoords({ lat, lon })
  }

  const clearFilters = () => {
    setSearchTerm("")
    setLocationFilter("")
    setSelectedLocationCoords(null)
    setSkillsFilter("")
    setLanguageFilter("")
    setUnemployedFilter(false)
    setEmployedFilter(false)
    setRelocateFilter(false)
    setCvFilter(false)
    setDrivingLicenseFilter(false)
    setOwnTransportFilter(false)
    setSelfEmployedFilter(false)
    setAvailableFilter(false)

    // If in modal mode, call callback instead of navigating
    if (isModal && onSearchUpdate) {
      onSearchUpdate({})
    } else {
      router.push("/professionals")
    }
  }

  const handleFindTrades = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (locationFilter) params.set("location", locationFilter)
    if (selectedLocationCoords) {
      params.set("lat", selectedLocationCoords.lat.toString())
      params.set("lng", selectedLocationCoords.lon.toString())
    }
    if (skillsFilter) params.set("skills", skillsFilter)
    if (searchParams.level) params.set("level", searchParams.level)
    params.set("traders", "true")

    // If in modal mode, call callback instead of navigating
    if (isModal && onSearchUpdate) {
      onSearchUpdate(Object.fromEntries(params))
    } else {
      router.push(`/professionals?${params.toString()}`)
    }
  }

  const handleMapPickerClick = () => {
    setShowMapPicker(true)
  }

  const handleMapLocationPick = (lat: number, lon: number) => {
    setMapPickerLocation({
      lat,
      lon,
      name: `Location ${lat.toFixed(4)}, ${lon.toFixed(4)}`
    })
  }

  const confirmMapPickerLocation = () => {
    if (mapPickerLocation) {
      setLocationFilter(mapPickerLocation.name)
      setSelectedLocationCoords({ lat: mapPickerLocation.lat, lon: mapPickerLocation.lon })
      setShowMapPicker(false)
      // Trigger search with new location and selected radius
      handleSearch(mapPickerRadius)
    }
  }

  const cancelMapPicker = () => {
    setShowMapPicker(false)
    setMapPickerLocation(null)
    setMapPickerRadius("10")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  // Debug logging for coordinate data
  console.log("[PROFESSIONALS-PAGE] Data received:", data)
  console.log("[PROFESSIONALS-PAGE] First item coordinates:", data[0] ? {
    latitude: data[0].latitude,
    longitude: data[0].longitude,
    location: data[0].location
  } : "No data")

  const dataWithCoordinates = data.filter(
    (item) => "latitude" in item && "longitude" in item && item.latitude && item.longitude,
  )

  console.log("[PROFESSIONALS-PAGE] Data with coordinates:", dataWithCoordinates.length, "out of", data.length)

  // Always show map if we have center coordinates (from URL search parameters)
  const shouldShowMap = center[0] !== 51.5074 || center[1] !== -0.1278 || dataWithCoordinates.length > 0

  console.log("[PROFESSIONALS-PAGE] Should show map:", shouldShowMap, "Center:", center)

  // Sort data based on selected criteria
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === "nearest") {
      // Calculate distance from center coordinates
      const distanceA = a.latitude && a.longitude
        ? Math.sqrt(Math.pow(a.latitude - center[0], 2) + Math.pow(a.longitude - center[1], 2))
        : Infinity
      const distanceB = b.latitude && b.longitude
        ? Math.sqrt(Math.pow(b.latitude - center[0], 2) + Math.pow(b.longitude - center[1], 2))
        : Infinity
      return distanceA - distanceB
    } else if (sortBy === "salary") {
      const salaryA = "salary_min" in a ? (a.salary_min || 0) : 0
      const salaryB = "salary_min" in b ? (b.salary_min || 0) : 0
      return salaryB - salaryA // Higher salary first
    } else {
      // best_match - keep original order for now
      return 0
    }
  })


  const handleViewProfile = (profileId: string) => {
    window.open(`/professionals/${profileId}`, '_blank')
  }

  const handleSendInquiry = async (professionalProfileId: string, professionalName: string, professionalUserId?: string) => {
    if (!user) {
      setSignUpPrompt({ isOpen: true, action: "message" })
      return
    }

    setSendingMessage(professionalProfileId)
    try {
      // If user_id not provided, fetch it from the profile
      let recipientUserId = professionalUserId
      if (!recipientUserId) {
        console.log("[DEBUG] Fetching user_id for profile:", professionalProfileId)
        const { data: profileData } = await supabase
          .from('professional_profiles')
          .select('user_id')
          .eq('id', professionalProfileId)
          .single()

        if (profileData) {
          recipientUserId = profileData.user_id
          console.log("[DEBUG] Found user_id:", recipientUserId)
        } else {
          console.error("[ERROR] Could not find user_id for profile:", professionalProfileId)
          alert("Error: Could not find professional user. Please try again.")
          return
        }
      }

      // Skip subscription check - allow all messaging for now
      console.log("[DEBUG] Skipping subscription check, allowing all messaging for user:", user.id)

      // Skip block check - allow all messaging for now
      console.log("[DEBUG] Skipping block check, proceeding to open conversation")

      // Generate new conversation ID (will be created when first message is sent)
      const conversationId = crypto.randomUUID()
      console.log("[DEBUG] Creating new conversation:", conversationId)

      console.log("[DEBUG] Opening message modal for conversation:", conversationId)
      console.log("[DEBUG] Recipient user_id:", recipientUserId)

      // Open floating message modal instead of navigating
      setMessageModal({
        isOpen: true,
        recipientId: recipientUserId!,
        recipientName: professionalName,
        conversationId: conversationId
      })

      console.log("[DEBUG] Message modal opened successfully")
    } catch (error) {
      console.error("[ERROR] Error sending inquiry:", error)
      alert("Error sending message. Please try again.")
    } finally {
      console.log("[DEBUG] Cleaning up sendingMessage state")
      setSendingMessage(null)
    }
  }

  const handleApplyToJob = async (jobId: string) => {
    if (!user) {
      setSignUpPrompt({ isOpen: true, action: "message" })
      return
    }
    router.push(`/jobs/${jobId}`)
  }

  const handleSaveJob = async (jobId: string) => {
    if (!user) {
      setSignUpPrompt({ isOpen: true, action: "message" })
      return
    }
    // Implementation for saving job
    console.log("Saving job:", jobId)
  }

  // Check if search has been performed
  const hasSearchParams = searchParams.search || searchParams.location || searchParams.lat || searchParams.lng

  return (
    <div className="min-h-screen bg-background">
      {/* Info banner for unauthenticated users - hide after search or if dismissed */}
      {!user && !isBannerDismissed && !hasSearchParams && (
        <div className="bg-blue-600 text-white py-2 px-4 text-center text-sm relative">
          <span className="font-medium">Browsing as a guest.</span>
          {" "}
          <button
            onClick={() => setSignUpPrompt({ isOpen: true, action: "message" })}
            className="underline hover:text-blue-100 font-semibold"
          >
            Sign up free
          </button>
          {" "}to send messages and use filters.

          {/* Close button */}
          <button
            onClick={() => setIsBannerDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hero Section - Matching Main Page */}
      <section
        className="relative py-6 sm:py-12 md:py-24 overflow-hidden"
        style={{
          backgroundImage: 'url(/London-buildings.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Floating elements for visual interest */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-300/20 rounded-full blur-lg animate-pulse delay-500"></div>

        <div className="container mx-auto px-2 sm:px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Enhanced Search Component */}
            <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 shadow-xl border border-white/10">
              <h2 className="text-sm sm:text-base md:text-xl font-bold text-white mb-3 sm:mb-4 md:mb-6 text-center">
                {isShowingTraders
                  ? "Search for contractors worldwide"
                  : isEmployer
                  ? "Search professionals worldwide with advanced filters"
                  : "Search jobs and companies worldwide"}
              </h2>

              {/* Main Search Inputs */}
              <div className="flex flex-col sm:flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={
                      isShowingTraders
                        ? "e.g. Freelancer, Consultant, Trading Company"
                        : isEmployer
                        ? "e.g. Software Engineer, React Developer"
                        : "e.g. Marketing Manager, Sales"
                    }
                    className="h-10 md:h-12 text-sm md:text-base px-3 md:px-4 bg-white border-0 focus:ring-2 focus:ring-emerald-500/30 rounded-lg font-medium placeholder:text-gray-500 shadow-md"
                  />
                </div>
                <div className="flex-1 flex gap-2">
                  <div className="flex-1">
                    <LocationInput
                      value={locationFilter}
                      onChange={setLocationFilter}
                      onLocationSelect={handleLocationSelect}
                      placeholder="e.g. London, New York, or Remote"
                      error=""
                    />
                  </div>
                  <Button
                    onClick={handleMapPickerClick}
                    className="h-10 md:h-12 px-3 md:px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    title="Pick location on map"
                  >
                    <Map className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </div>

              {/* Search Button */}
              <div className="mb-4">
                <Button
                  onClick={() => {
                    handleSearch()
                    setShowAdvancedFilters(false) // Hide filters when entering full-screen mode
                    setIsFullScreenMode(true)
                  }}
                  className="w-full h-10 md:h-12 text-sm md:text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01]"
                >
                  <Search className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  {isEmployer ? "Find Talents" : "Search Jobs"}
                </Button>
              </div>

              {/* Advanced Filters - Rounded Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 relative">
                {/* Overlay for unauthenticated users */}
                {!user && (
                  <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px] rounded-lg z-10 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm mx-4 text-center">
                      <Filter className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-gray-900 mb-1">Sign Up to Use Filters</h3>
                      <p className="text-sm text-gray-600 mb-3">Create a free account to access advanced search filters</p>
                      <Button
                        onClick={() => setSignUpPrompt({ isOpen: true, action: "filter" })}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Sign Up Free
                      </Button>
                    </div>
                  </div>
                )}

                <div
                  className="flex items-center cursor-pointer mb-3"
                  onClick={() => !user ? setSignUpPrompt({ isOpen: true, action: "filter" }) : setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 text-white mr-2" />
                  <span className="text-white font-medium">Advanced Filters - Show only:</span>
                  <ChevronDown className={`h-4 w-4 text-white ml-auto transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                </div>

                {showAdvancedFilters && (
                  <div className={`space-y-4 ${!user ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* First Row - Experience Level, Job Type, Skills/Salary, Language */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Experience Level */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Experience Level</label>
                        <Select
                          value={searchParams.level || "all"}
                          onValueChange={(value) => updateSearchParams("level", value)}
                          disabled={!user}
                        >
                          <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="entry">Entry Level</SelectItem>
                            <SelectItem value="mid">Mid Level</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="executive">Executive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Job Type - Only for employees */}
                      {!isEmployer && (
                        <div>
                          <label className="block text-white text-sm font-medium mb-1">Job Type</label>
                          <Select
                            value={searchParams.type || "all"}
                            onValueChange={(value) => updateSearchParams("type", value)}
                            disabled={!user}
                          >
                            <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="full-time">Full-time</SelectItem>
                              <SelectItem value="part-time">Part-time</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="freelance">Freelance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Skills / Min Salary */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">
                          {isEmployer ? "Skills" : "Min Salary (£)"}
                        </label>
                        <Input
                          placeholder={isEmployer ? "React, Python" : "e.g. 30000"}
                          value={isEmployer ? skillsFilter : undefined}
                          type={isEmployer ? "text" : "number"}
                          onChange={(e) =>
                            isEmployer
                              ? setSkillsFilter(e.target.value)
                              : updateSearchParams("salaryMin", e.target.value)
                          }
                          disabled={!user}
                          className="h-10 text-sm bg-white border-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Language - Only for employers */}
                      {isEmployer && (
                        <div>
                          <label className="block text-white text-sm font-medium mb-1">Language</label>
                          <Input
                            placeholder="English, Spanish"
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            disabled={!user}
                            className="h-10 text-sm bg-white border-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      )}

                      {/* Search Radius */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Search Radius</label>
                        <Select
                          value={searchParams.radius || "20"}
                          onValueChange={(value) => updateSearchParams("radius", value)}
                          disabled={!user}
                        >
                          <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                              <SelectItem key={miles} value={miles.toString()}>
                                {miles} mile{miles !== 1 ? "s" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Second Row - Checkboxes (only for employers) */}
                    {isEmployer && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 border-t border-white/20">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unemployed"
                            checked={unemployedFilter}
                            onCheckedChange={(checked) => setUnemployedFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="unemployed" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Unemployed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="employed"
                            checked={employedFilter}
                            onCheckedChange={(checked) => setEmployedFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="employed" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="relocate"
                            checked={relocateFilter}
                            onCheckedChange={(checked) => setRelocateFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="relocate" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Ready to relocate
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="cv"
                            checked={cvFilter}
                            onCheckedChange={(checked) => setCvFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="cv" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            With CV
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="driving-license"
                            checked={drivingLicenseFilter}
                            onCheckedChange={(checked) => setDrivingLicenseFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="driving-license" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Valid Driving License
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="own-transport"
                            checked={ownTransportFilter}
                            onCheckedChange={(checked) => setOwnTransportFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="own-transport" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Own transport
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="self-employed"
                            checked={selfEmployedFilter}
                            onCheckedChange={(checked) => setSelfEmployedFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="self-employed" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Self-employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="available"
                            checked={availableFilter}
                            onCheckedChange={(checked) => setAvailableFilter(!!checked)}
                            disabled={!user}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="available" className={`text-sm text-white ${!user ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Available (Companies)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section - Only when no search */}
      {!(searchParams.search || searchParams.location || searchParams.level || searchParams.skills || searchParams.type || searchParams.salaryMin) && (
        <section className="py-12 md:py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-balance text-foreground">
                {isShowingTraders
                  ? "Find Traders"
                  : isEmployer
                  ? "Find Top Talent"
                  : isShowingCompanies
                  ? "Find Companies"
                  : "Discover Your Dream Job"}
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 text-pretty max-w-3xl mx-auto">
                {isShowingTraders
                  ? "Discover self-employed professionals and companies open for business - perfect for trading, partnerships, and collaborations"
                  : isEmployer
                  ? "Connect with skilled professionals using our advanced map-based search and filtering tools"
                  : isShowingCompanies
                  ? "Find companies that are open for business and actively hiring professionals"
                  : "Explore opportunities tailored to your skills and preferences with location-based discovery"}
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
              {isEmployer ? (
                <>
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Hire Faster</h3>
                    <p className="text-gray-600 leading-relaxed">See candidates on a live map and connect instantly with the right talent</p>
                  </Card>

                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Smart Matching</h3>
                    <p className="text-gray-600 leading-relaxed">Advanced filters by skills, experience, and location for perfect matches</p>
                  </Card>

                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <span className="text-2xl">💬</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Direct Contact</h3>
                    <p className="text-gray-600 leading-relaxed">Message professionals instantly without middlemen or delays</p>
                  </Card>

                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span className="text-2xl">💼</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Free to Start</h3>
                    <p className="text-gray-600 leading-relaxed">Post jobs and find candidates completely free - no hidden costs</p>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-2xl">🌍</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Global Reach</h3>
                    <p className="text-gray-600 leading-relaxed">Find opportunities anywhere in the world with location-based search</p>
                  </Card>

                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <span className="text-2xl">📍</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Jobs Near You</h3>
                    <p className="text-gray-600 leading-relaxed">Use precise location search to find opportunities close to home</p>
                  </Card>

                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <span className="text-2xl">🚀</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Apply Easily</h3>
                    <p className="text-gray-600 leading-relaxed">One-click applications or save jobs for later with smart tracking</p>
                  </Card>

                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span className="text-2xl">💡</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-800">Always Free</h3>
                    <p className="text-gray-600 leading-relaxed">100% free for job seekers - no premium subscriptions required</p>
                  </Card>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Search Results Section - Moved up to appear right after search card */}
      {!isFullScreenMode && (searchParams.search || searchParams.location || searchParams.level || searchParams.skills || searchParams.type || searchParams.salaryMin) ? (
        <section className="bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
              {/* Map Section */}
              <div className="flex-1">
                {shouldShowMap && (
                  <Card className="h-[500px] lg:h-[600px] overflow-hidden shadow-xl border-0 rounded-xl">
                    <CardContent className="p-0 h-full relative">
                      {isShowingJobs ? (
                        <JobMap
                          jobs={dataWithCoordinates as any}
                          center={[center[0], center[1]]}
                          zoom={10}
                          height="100%"
                          showRadius={!!selectedLocationCoords}
                          radiusCenter={selectedLocationCoords ? [selectedLocationCoords.lat, selectedLocationCoords.lon] : undefined}
                          radiusKm={parseInt(searchParams.radius || "20") * 1.60934}
                          selectedJobId={selectedProfessionalId}
                          onJobSelect={(job) => {
                            setSelectedProfessionalId(job?.id || null)
                          }}
                        />
                      ) : (
                        <ProfessionalMap
                          professionals={dataWithCoordinates.map((item: any) => ({
                            id: item.id,
                            name: isEmployer ? `${item.first_name || 'Professional'} ${item.last_name || 'User'}` : item.title || item.company_name || 'Unknown',
                            title: item.title || item.industry || 'Professional',
                            location: item.location || 'Location not specified',
                            coordinates: { lat: item.latitude, lon: item.longitude },
                            skills: item.skills || [],
                            experience: item.experience_level || 'Not specified',
                            avatar: item.profile_photo_url || item.logo_url || '/placeholder.svg',
                            isAvailable: item.available_for_work || item.open_for_business || item.is_hiring || true,
                            first_name: item.first_name,
                            last_name: item.last_name,
                            salary_min: item.salary_min,
                            salary_max: item.salary_max,
                            profile_photo_url: item.profile_photo_url || item.logo_url,
                            experience_level: item.experience_level
                          }))}
                          center={{ lat: center[0], lon: center[1] }}
                          zoom={10}
                          height="100%"
                          user={user}
                          showRadius={!!selectedLocationCoords}
                          radiusCenter={selectedLocationCoords ? [selectedLocationCoords.lat, selectedLocationCoords.lon] : undefined}
                          radiusKm={parseInt(searchParams.radius || "20") * 1.60934}
                          selectedProfessionalId={selectedProfessionalId}
                          onProfileSelect={(profile) => {
                            // Toggle selection: set ID if selecting, null if deselecting
                            setSelectedProfessionalId(profile?.id || null)
                          }}
                          onSendInquiry={(id, name) => handleSendInquiry(id, name)}
                        />
                      )}
                      {/* Results Counter Overlay */}
                      <div className="absolute top-4 left-4 z-[10]">
                        <div className="bg-white rounded-lg shadow-lg p-3 border">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-lg">
                              {data.length} {isEmployer ? "Professional" : isShowingCompanies ? "Company" : isShowingTraders ? "Trader" : "Professional"}{data.length !== 1 ? "s" : ""} Found
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Search Radius Control Overlay */}
                      <div className="absolute top-4 right-4 z-[10]">
                        <div className="bg-white rounded-lg shadow-lg p-3 border">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-emerald-600" />
                            <label className="text-sm font-medium text-gray-700">Search Radius:</label>
                            <Select
                              value={searchParams.radius || "20"}
                              onValueChange={(value) => updateSearchParams("radius", value)}
                            >
                              <SelectTrigger className="w-28 h-9 text-sm border-gray-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                                  <SelectItem key={miles} value={miles.toString()}>
                                    {miles} mile{miles !== 1 ? "s" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar - Professional List */}
              <div className="w-full lg:w-96">
                <Card className="h-[500px] lg:h-[600px] overflow-hidden shadow-xl border-0 rounded-xl">
                  {/* Professional List */}
                  <>
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {isEmployer ? "Professionals" : isShowingCompanies ? "Companies" : isShowingTraders ? "Traders" : "Results"}
                      </h2>
                      <p className="text-sm text-gray-600">Click on professionals below or map markers</p>
                    </div>

                      <div className="h-full overflow-y-auto">
                        {data.length === 0 ? (
                          <div className="text-center py-12 px-4">
                            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2 text-gray-900">No results found</h3>
                            <p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
                          </div>
                        ) : (
                          <div className="space-y-4 p-4">
                            {sortedData.map((item: any) => {
                              const isSelected = selectedProfessionalId === item.id

                              // If showing jobs, render JobCard instead
                              if (isShowingJobs) {
                                return (
                                  <JobCard
                                    key={item.id}
                                    ref={(el) => { professionalCardRefs.current[item.id] = el }}
                                    job={item}
                                    isLoggedIn={!!user}
                                    isSelected={isSelected}
                                    onSelect={() => {
                                      // Toggle selection
                                      setSelectedProfessionalId(isSelected ? null : item.id)
                                    }}
                                  />
                                )
                              }
                              return (
                              <Card
                                key={item.id}
                                ref={(el) => { professionalCardRefs.current[item.id] = el }}
                                className={`cursor-pointer transition-all rounded-lg ${
                                  isSelected
                                    ? "shadow-xl border-2 border-blue-500 bg-blue-50"
                                    : "hover:shadow-md border"
                                }`}
                                onClick={() => {
                                  // Toggle selection
                                  setSelectedProfessionalId(isSelected ? null : item.id)
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex gap-3">
                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                      <AvatarImage src={item.profile_photo_url || item.logo_url} alt={item.first_name || item.company_name} />
                                      <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
                                        {isEmployer
                                          ? `${(item.first_name || 'P').charAt(0)}${(item.last_name || 'R').charAt(0)}`
                                          : (item.company_name || item.title || 'C').substring(0, 2).toUpperCase()
                                        }
                                      </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                      {/* 1. Profession Title - Main heading */}
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`text-lg text-gray-900 font-bold truncate`}>
                                          {item.title || item.industry || 'Professional'}
                                        </h3>
                                        {item.isPremium && (
                                          <div className="flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                                            <Crown className="h-2.5 w-2.5" />
                                            <span className="text-[9px] font-bold">PREMIUM</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* 2. Nickname or Name */}
                                      <p className="text-sm text-gray-600 mb-2 font-medium">
                                        {item.nickname || `${item.first_name || 'Professional'} ${item.last_name || 'User'}`}
                                      </p>

                                      {/* Star Rating - Always visible with default 5 stars */}
                                      <div className="mb-2">
                                        <CompactStarRating
                                          rating={item.rating || 5}
                                          reviewCount={item.reviewCount || 0}
                                          size="sm"
                                          showCount={true}
                                        />
                                      </div>

                                      {formatSalary(item.salary_min, item.salary_max) && (
                                        <div className="text-sm font-semibold text-green-600 mb-2">
                                          {formatSalary(item.salary_min, item.salary_max)} {item.salary_frequency ? `(${item.salary_frequency})` : '(per year)'}
                                        </div>
                                      )}

                                      {/* Bio - Show short preview */}
                                      {item.bio && (
                                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                          {item.bio}
                                        </p>
                                      )}

                                      {/* Skills - Show first 3 */}
                                      {item.skills && item.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {item.skills.slice(0, 3).map((skill: string, idx: number) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                              {skill}
                                            </Badge>
                                          ))}
                                          {item.skills.length > 3 && (
                                            <Badge variant="outline" className="text-xs text-gray-500">
                                              +{item.skills.length - 3} more
                                            </Badge>
                                          )}
                                        </div>
                                      )}

                                      {/* Languages - Show with flags */}
                                      {item.languages && item.languages.length > 0 && (
                                        <div className="text-xs text-gray-600 mb-2 flex items-center flex-wrap gap-1">
                                          <Globe className="h-3 w-3 inline mr-1" />
                                          <span className="font-medium mr-1">Languages:</span>
                                          {item.languages.slice(0, 3).map((lang: string, idx: number) => (
                                            <span key={idx} className="inline-flex items-center">
                                              <span className="text-base mr-0.5">{getLanguageFlag(lang)}</span>
                                              <span>{lang}{idx < Math.min(2, item.languages.length - 1) ? ',' : ''}</span>
                                            </span>
                                          ))}
                                          {item.languages.length > 3 && <span className="ml-1">+{item.languages.length - 3} more</span>}
                                        </div>
                                      )}

                                      {/* Status Badges - Only essential ones */}
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        {item.actively_looking && (
                                          <Badge className="text-xs bg-gradient-to-r from-green-600 to-emerald-700 text-white font-semibold">
                                            <Target className="h-2.5 w-2.5 mr-0.5" />
                                            Actively Looking
                                          </Badge>
                                        )}
                                        {item.isPremium && (
                                          <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                                            <Zap className="h-2.5 w-2.5 mr-0.5" />
                                            Priority
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                          {formatDate(item.created_at)}
                                        </span>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSendInquiry(item.id, isEmployer ? `${item.first_name} ${item.last_name}` : item.company_name)
                                            }}
                                            disabled={sendingMessage === item.id}
                                          >
                                            <MessageCircle className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="h-8 px-3"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleViewProfile(item.id)
                                            }}
                                          >
                                            View
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Extended details - only show when selected */}
                                      {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                          {/* Full Bio - Only if longer than 2 lines */}
                                          {item.bio && item.bio.length > 150 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">Full Bio</h4>
                                              <p className="text-sm text-gray-600 leading-relaxed">
                                                {item.bio}
                                              </p>
                                            </div>
                                          )}

                                          {/* Address */}
                                          {item.location && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">Address</h4>
                                              <p className="text-sm text-gray-600">
                                                {item.location}
                                              </p>
                                            </div>
                                          )}

                                          {/* All Skills - Show if more than initially displayed (3) */}
                                          {item.skills && item.skills.length > 3 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">All Skills ({item.skills.length})</h4>
                                              <div className="flex flex-wrap gap-1">
                                                {item.skills.map((skill: string, index: number) => (
                                                  <Badge key={index} variant="outline" className="text-xs">
                                                    {skill}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* All Languages - Only if more than shown initially */}
                                          {item.languages && item.languages.length > 3 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">All Languages ({item.languages.length})</h4>
                                              <div className="flex flex-wrap gap-1">
                                                {item.languages.map((language: string, index: number) => (
                                                  <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                                                    <span className="text-sm">{getLanguageFlag(language)}</span>
                                                    {language}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Services Offered - For companies/traders */}
                                          {item.services && item.services.length > 0 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">Services Offered</h4>
                                              <div className="flex flex-wrap gap-1">
                                                {item.services.map((service: string, index: number) => (
                                                  <Badge key={index} variant="secondary" className="text-xs">
                                                    {service}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Price List - For companies/traders */}
                                          {item.price_list && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                Price List
                                              </h4>
                                              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                  {item.price_list}
                                                </p>
                                              </div>
                                            </div>
                                          )}

                                          {/* Additional Information - NEW INFO NOT SHOWN ABOVE */}
                                          {(item.ready_to_relocate || item.has_driving_licence || item.has_own_transport || item.employment_status || item.is_self_employed || item.experience_level) && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-2">Additional Information</h4>
                                              <div className="space-y-2">
                                                {item.employment_status && (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-700">Employment Status:</span>
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                      {item.employment_status.replace('_', ' ')}
                                                    </Badge>
                                                  </div>
                                                )}
                                                {item.experience_level && (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-700">Experience Level:</span>
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                      {item.experience_level.replace('_', ' ')}
                                                    </Badge>
                                                  </div>
                                                )}
                                                {item.has_driving_licence && (
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                                    <span className="text-sm text-gray-700">Has Driving Licence</span>
                                                  </div>
                                                )}
                                                {item.has_own_transport && (
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                                    <span className="text-sm text-gray-700">Has Own Transport</span>
                                                  </div>
                                                )}
                                                {item.ready_to_relocate && (
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                                                    <span className="text-sm text-gray-700">Ready to Relocate</span>
                                                  </div>
                                                )}
                                                {item.is_self_employed && (
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-3.5 w-3.5 text-purple-600" />
                                                    <span className="text-sm text-gray-700">Self-Employed</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Availability */}
                                          {item.availability && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">Availability</h4>
                                              <p className="text-sm text-green-600 font-medium">
                                                {item.availability === 'available_now' ? 'Available now' :
                                                 item.availability === 'available_week' ? 'Available within a week' :
                                                 item.availability === 'available_month' ? 'Available within a month' :
                                                 'Not specified'}
                                              </p>
                                            </div>
                                          )}

                                          {/* Professional Links */}
                                          {(item.website_url || item.portfolio_url || item.linkedin_url || item.github_url) && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-2">Professional Links</h4>
                                              <div className="flex flex-col gap-2">
                                                {item.website_url && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      window.open(item.website_url, '_blank')
                                                    }}
                                                  >
                                                    <Globe className="h-3 w-3 mr-2" />
                                                    Personal Website
                                                  </Button>
                                                )}
                                                {item.portfolio_url && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      window.open(item.portfolio_url, '_blank')
                                                    }}
                                                  >
                                                    <ExternalLink className="h-3 w-3 mr-2" />
                                                    Portfolio
                                                  </Button>
                                                )}
                                                {item.linkedin_url && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      window.open(item.linkedin_url, '_blank')
                                                    }}
                                                  >
                                                    <ExternalLink className="h-3 w-3 mr-2" />
                                                    LinkedIn Profile
                                                  </Button>
                                                )}
                                                {item.github_url && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      window.open(item.github_url, '_blank')
                                                    }}
                                                  >
                                                    <ExternalLink className="h-3 w-3 mr-2" />
                                                    GitHub Profile
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Action Buttons */}
                                          <div className="pt-3 border-t border-gray-200">
                                            <div className="flex gap-2">
                                              <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleSendInquiry(item.id, `${item.first_name} ${item.last_name}`)
                                                }}
                                                disabled={sendingMessage === item.id}
                                              >
                                                <MessageCircle className="h-4 w-4 mr-2" />
                                                Contact
                                              </Button>
                                              <Button
                                                className="flex-1"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleViewProfile(item.id)
                                                }}
                                              >
                                                <UserIcon className="h-4 w-4 mr-2" />
                                                View Profile
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                </Card>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-16">
            <CardContent>
              <div className="max-w-2xl mx-auto">
                <Briefcase className="h-16 w-16 mx-auto mb-6 text-primary opacity-50" />
                <h3 className="text-2xl font-bold mb-4 text-foreground">Ready to search?</h3>
                <p className="text-muted-foreground mb-6">
                  Use the search form above to find opportunities.
                </p>
                <Button onClick={() => handleSearch()} className="px-6">
                  Start Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Marketing Section - Moved to appear after search results */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-balance text-foreground">
              {isEmployer ? "Why Choose Our Platform for Hiring?" : "Why Job Seekers Love Us"}
            </h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
              {isEmployer
                ? "Revolutionary features that transform how you find and hire top talent"
                : "Innovative tools that help you discover your perfect career opportunity"}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
            {isEmployer ? (
              <>
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Hire Faster</h3>
                  <p className="text-gray-600 leading-relaxed">See candidates on a live map and connect instantly with the right talent</p>
                </Card>

                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Smart Matching</h3>
                  <p className="text-gray-600 leading-relaxed">Advanced filters by skills, experience, and location for perfect matches</p>
                </Card>

                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Direct Contact</h3>
                  <p className="text-gray-600 leading-relaxed">Message professionals instantly without middlemen or delays</p>
                </Card>

                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <span className="text-2xl">💼</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Free to Start</h3>
                  <p className="text-gray-600 leading-relaxed">Post jobs and find candidates completely free - no hidden costs</p>
                </Card>
              </>
            ) : (
              <>
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Global Reach</h3>
                  <p className="text-gray-600 leading-relaxed">Find opportunities anywhere in the world with location-based search</p>
                </Card>

                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <span className="text-2xl">📍</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Jobs Near You</h3>
                  <p className="text-gray-600 leading-relaxed">Use precise location search to find opportunities close to home</p>
                </Card>

                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Apply Easily</h3>
                  <p className="text-gray-600 leading-relaxed">One-click applications or save jobs for later with smart tracking</p>
                </Card>

                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <span className="text-2xl">💡</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Always Free</h3>
                  <p className="text-gray-600 leading-relaxed">100% free for job seekers - no premium subscriptions required</p>
                </Card>
              </>
            )}
          </div>
        </div>
      </section>


      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col relative z-[10000]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pick Location on Map</h3>
                <p className="text-sm text-gray-600">Click anywhere on the map to select your search location</p>
              </div>
              <Button
                onClick={cancelMapPicker}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
              <ProfessionalMap
                key={`picker-${Date.now()}`}
                professionals={[]}
                center={selectedLocationCoords ? { lat: selectedLocationCoords.lat, lon: selectedLocationCoords.lon } : { lat: 51.5074, lon: -0.1278 }}
                zoom={8}
                height="100%"
                showRadius={!!mapPickerLocation}
                radiusCenter={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
                radiusKm={parseInt(mapPickerRadius) * 1.60934} // Convert miles to km
                onMapClick={handleMapLocationPick}
                selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
              />

              {/* Radius Control Overlay - Top of Map */}
              <div className="absolute top-4 right-4 z-[10000]">
                <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-emerald-500">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <label className="text-sm font-semibold text-gray-900 whitespace-nowrap">Search Radius:</label>
                    <Select value={mapPickerRadius} onValueChange={(value) => {
                      console.log('[MAP-PICKER] Radius changed to:', value)
                      setMapPickerRadius(value)
                    }}>
                      <SelectTrigger className="w-28 h-9 text-sm font-medium border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] z-[10001]">
                        {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                          <SelectItem key={miles} value={miles.toString()}>
                            {miles} mile{miles !== 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Location Display Overlay - Top Left */}
              {mapPickerLocation && (
                <div className="absolute top-4 left-4 z-[1000]">
                  <div className="bg-white rounded-lg shadow-lg p-3 border">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">Selected Location</div>
                        <div className="text-gray-600">{mapPickerLocation.lat.toFixed(4)}, {mapPickerLocation.lon.toFixed(4)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Crosshair indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Target className="h-8 w-8 text-red-500 opacity-70" />
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="text-sm text-gray-600">
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

                <div className="flex gap-2">
                  <Button onClick={cancelMapPicker} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmMapPickerLocation}
                    disabled={!mapPickerLocation}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use This Location
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Message Modal */}
      {messageModal?.isOpen && user && (
        <FloatingMessageModal
          isOpen={messageModal.isOpen}
          onClose={() => setMessageModal(null)}
          recipientId={messageModal.recipientId}
          recipientName={messageModal.recipientName}
          conversationId={messageModal.conversationId}
          userId={user.id}
        />
      )}

      {/* Sign-up prompt modal for unauthenticated users */}
      <SignUpPromptModal
        isOpen={signUpPrompt.isOpen}
        onClose={() => setSignUpPrompt({ ...signUpPrompt, isOpen: false })}
        action={signUpPrompt.action}
      />

      {/* Full-Screen Map Mode (Google Maps Style) */}
      {isFullScreenMode && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Site Header */}
          <Header user={user} isModal={isModal} onModalClose={onModalClose} />

          {/* Top Search Bar (Fixed) */}
          <div className="sticky top-0 z-20 bg-white shadow-lg border-b">
            <div className="container mx-auto px-4 py-4">
              {/* Compact Search Bar */}
              <div className="flex items-center gap-3">
                {/* Search Input */}
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={
                    isShowingTraders
                      ? "e.g. Freelancer, Consultant, Trading Company"
                      : isEmployer
                      ? "e.g. Software Engineer, React Developer"
                      : "e.g. Marketing Manager, Sales"
                  }
                  className="h-12 flex-1 bg-white/95 shadow-lg border-2 font-medium text-base"
                />

                {/* Location Input */}
                <div className="flex-1 flex gap-2">
                  <div className="flex-1">
                    <LocationInput
                      value={locationFilter}
                      onChange={setLocationFilter}
                      onLocationSelect={handleLocationSelect}
                      placeholder="e.g. London, New York"
                      error=""
                      className="h-12 bg-white/95 shadow-lg border-2 text-base"
                    />
                  </div>
                  <Button
                    onClick={handleMapPickerClick}
                    className="h-12 px-3 bg-blue-500 hover:bg-blue-600 shadow-lg"
                    title="Pick location on map"
                  >
                    <Map className="h-5 w-5" />
                  </Button>
                </div>

                {/* Filters Button */}
                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant="outline"
                  className="h-12 px-4 bg-white shadow-lg"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>

                {/* Search Button */}
                <Button
                  onClick={() => handleSearch()}
                  className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg font-semibold"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </Button>

                {/* Exit Button */}
                <Button
                  onClick={() => {
                    setIsFullScreenMode(false)
                    if (isModal && onModalClose) {
                      onModalClose()
                    } else {
                      router.push('/professionals')
                    }
                  }}
                  variant="outline"
                  className="h-12 px-3 bg-red-600 hover:bg-red-700 text-white shadow-lg border-red-600"
                  title="Exit full-screen"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Advanced Filters Toggle */}
              {showAdvancedFilters && (
                <div className="mt-3 p-4 bg-white rounded-lg shadow-md border-2 border-gray-200">
                  <div className="space-y-4">
                    {/* First Row - Main Filters with Individual Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Experience Level */}
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <label className="block text-gray-900 text-sm font-semibold mb-2">Experience Level</label>
                        <Select
                          value={searchParams.level || "all"}
                          onValueChange={(value) => updateSearchParams("level", value)}
                        >
                          <SelectTrigger className="w-full h-10 text-sm bg-white font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="entry">Entry Level</SelectItem>
                            <SelectItem value="mid">Mid Level</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="executive">Executive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Job Type - Only for employees */}
                      {!isEmployer && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <label className="block text-gray-900 text-sm font-semibold mb-2">Job Type</label>
                          <Select
                            value={searchParams.type || "all"}
                            onValueChange={(value) => updateSearchParams("type", value)}
                          >
                            <SelectTrigger className="w-full h-10 text-sm bg-white font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="full-time">Full-time</SelectItem>
                              <SelectItem value="part-time">Part-time</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="freelance">Freelance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Skills / Min Salary */}
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <label className="block text-gray-900 text-sm font-semibold mb-2">
                          {isEmployer ? "Skills" : "Min Salary (£)"}
                        </label>
                        <Input
                          placeholder={isEmployer ? "React, Python" : "e.g. 30000"}
                          value={isEmployer ? skillsFilter : searchParams.salaryMin || ""}
                          type={isEmployer ? "text" : "number"}
                          onChange={(e) =>
                            isEmployer
                              ? setSkillsFilter(e.target.value)
                              : updateSearchParams("salaryMin", e.target.value)
                          }
                          className="h-10 text-sm bg-white font-medium"
                        />
                      </div>

                      {/* Language - Only for employers */}
                      {isEmployer && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <label className="block text-gray-900 text-sm font-semibold mb-2">Language</label>
                          <Input
                            placeholder="English, Spanish"
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            className="h-10 text-sm bg-white font-medium"
                          />
                        </div>
                      )}

                      {/* Search Radius */}
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <label className="block text-gray-900 text-sm font-semibold mb-2">Search Radius</label>
                        <Select value={searchParams.radius || "20"} onValueChange={(value) => updateSearchParams("radius", value)}>
                          <SelectTrigger className="w-full h-10 text-sm bg-white font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                              <SelectItem key={miles} value={miles.toString()}>
                                {miles} mile{miles !== 1 ? "s" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Second Row - Checkbox Filters (Only for employers) */}
                    {isEmployer && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unemployed-fullscreen"
                            checked={unemployedFilter}
                            onCheckedChange={(checked) => setUnemployedFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="unemployed-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            Unemployed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="employed-fullscreen"
                            checked={employedFilter}
                            onCheckedChange={(checked) => setEmployedFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="employed-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            Employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="relocate-fullscreen"
                            checked={relocateFilter}
                            onCheckedChange={(checked) => setRelocateFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="relocate-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            Ready to relocate
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="cv-fullscreen"
                            checked={cvFilter}
                            onCheckedChange={(checked) => setCvFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="cv-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            With CV
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="driving-license-fullscreen"
                            checked={drivingLicenseFilter}
                            onCheckedChange={(checked) => setDrivingLicenseFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="driving-license-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            Valid Driving License
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="own-transport-fullscreen"
                            checked={ownTransportFilter}
                            onCheckedChange={(checked) => setOwnTransportFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="own-transport-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            Own transport
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="self-employed-fullscreen"
                            checked={selfEmployedFilter}
                            onCheckedChange={(checked) => setSelfEmployedFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="self-employed-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            Self-employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="available-fullscreen"
                            checked={availableFilter}
                            onCheckedChange={(checked) => setAvailableFilter(!!checked)}
                            className="bg-white border-2 border-gray-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <label htmlFor="available-fullscreen" className="text-sm text-gray-700 cursor-pointer">
                            Available (Companies)
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Hide Filters Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => setShowAdvancedFilters(false)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600"
                      >
                        Hide Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content: Map + Sidebar with Resizable Panels */}
          <PanelGroup direction="horizontal" className="flex-1">
            {/* Map Panel */}
            <Panel defaultSize={60} minSize={30}>
              <div className="h-full relative">
              {shouldShowMap && (
                isShowingJobs ? (
                  <JobMap
                    jobs={dataWithCoordinates as any}
                    center={[center[0], center[1]]}
                    zoom={10}
                    height="100%"
                    showRadius={!!selectedLocationCoords}
                    radiusCenter={selectedLocationCoords ? [selectedLocationCoords.lat, selectedLocationCoords.lon] : undefined}
                    radiusKm={parseInt(searchParams.radius || "20") * 1.60934}
                    selectedJobId={selectedProfessionalId}
                    onJobSelect={(job) => {
                      setSelectedProfessionalId(job?.id || null)
                    }}
                  />
                ) : (
                  <ProfessionalMap
                    professionals={dataWithCoordinates.map((item: any) => ({
                      id: item.id,
                      name: isEmployer ? `${item.first_name || 'Professional'} ${item.last_name || 'User'}` : item.title || item.company_name || 'Unknown',
                      title: item.title || item.industry || 'Professional',
                      location: item.location || 'Location not specified',
                      coordinates: { lat: item.latitude, lon: item.longitude },
                      skills: item.skills || [],
                      experience: item.experience_level || 'Not specified',
                      avatar: item.profile_photo_url || item.logo_url || '/placeholder.svg',
                      isAvailable: item.available_for_work || item.open_for_business || item.is_hiring || true,
                      first_name: item.first_name,
                      last_name: item.last_name,
                      salary_min: item.salary_min,
                      salary_max: item.salary_max,
                      profile_photo_url: item.profile_photo_url || item.logo_url,
                      experience_level: item.experience_level
                    }))}
                    center={{ lat: center[0], lon: center[1] }}
                    zoom={10}
                    height="100%"
                    user={user}
                    showRadius={!!selectedLocationCoords}
                    radiusCenter={selectedLocationCoords ? [selectedLocationCoords.lat, selectedLocationCoords.lon] : undefined}
                    radiusKm={parseInt(searchParams.radius || "20") * 1.60934}
                    selectedProfessionalId={selectedProfessionalId}
                    onProfileSelect={(profile) => {
                      // Toggle selection
                      setSelectedProfessionalId(profile?.id || null)
                    }}
                    onSendInquiry={(id, name) => handleSendInquiry(id, name)}
                  />
                )
              )}

              {/* Results Counter (Top-Left) */}
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-white rounded-lg shadow-lg p-3 border">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-lg">
                      {data.length} {isEmployer ? "Professional" : isShowingCompanies ? "Company" : isShowingTraders ? "Trader" : "Professional"}{data.length !== 1 ? "s" : ""} Found
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Radius (Top-Right) */}
              <div className="absolute top-4 right-[420px] z-10">
                <div className="bg-white rounded-lg shadow-lg p-3 border">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-emerald-600" />
                    <label className="text-sm font-medium">Radius:</label>
                    <Select
                      value={searchParams.radius || "20"}
                      onValueChange={(value) => updateSearchParams("radius", value)}
                    >
                      <SelectTrigger className="w-28 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 5, 10, 15, 20, 25, 30, 40, 50].map((miles) => (
                          <SelectItem key={miles} value={miles.toString()}>
                            {miles} mi
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              </div>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

            {/* Right Sidebar - Scrollable Professional List Panel */}
            <Panel defaultSize={40} minSize={25}>
              <div className="h-full bg-white border-l shadow-xl flex flex-col">
              {/* Sidebar Header */}
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">
                  Results
                </h3>
                <p className="text-sm text-gray-600">
                  {data.length} {isEmployer ? "professional" : "result"}{data.length !== 1 ? "s" : ""} found - Click to expand
                </p>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                  <div className="divide-y">
                    {data.slice(0, 50).map((item: any) => {
                      const isSelected = selectedProfessionalId === item.id

                      // If showing jobs, render JobCard instead
                      if (isShowingJobs) {
                        return (
                          <JobCard
                            key={item.id}
                            ref={(el) => { professionalCardRefs.current[item.id] = el }}
                            job={item}
                            isLoggedIn={!!user}
                            isSelected={isSelected}
                            onSelect={() => {
                              // Toggle selection
                              setSelectedProfessionalId(isSelected ? null : item.id)
                            }}
                          />
                        )
                      }

                      const isProfessional = 'first_name' in item
                      const isCompany = 'company_name' in item

                      return (
                        <div
                          key={item.id}
                          ref={(el) => { professionalCardRefs.current[item.id] = el }}
                          className={`p-4 cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            // Toggle selection
                            setSelectedProfessionalId(isSelected ? null : item.id)
                          }}
                        >
                          <div className="flex gap-3">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={item.profile_photo_url || item.logo_url} alt={isProfessional ? item.first_name : item.company_name} />
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {isProfessional ? item.first_name?.charAt(0) : item.company_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              {/* 1. Profession Title - Main heading */}
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-base text-gray-900 font-bold truncate">
                                  {item.title || item.industry || 'Professional'}
                                </h4>
                                {item.isPremium && (
                                  <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                )}
                                {isCompany && item.open_for_business && (
                                  <span className="text-xs font-semibold text-green-600 ml-2">Available</span>
                                )}
                              </div>

                              {/* 2. Nickname or Name */}
                              <p className="text-sm text-gray-600 truncate font-medium">
                                {item.nickname || `${item.first_name} ${item.last_name}`}
                              </p>

                              {/* Skills Preview */}
                              {item.skills && item.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.skills.slice(0, 3).map((skill: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {item.skills.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{item.skills.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Salary Range with frequency */}
                              {formatSalary(item.salary_min, item.salary_max) && (
                                <p className="text-sm font-semibold text-green-600 mt-2">
                                  {formatSalary(item.salary_min, item.salary_max)} {item.salary_frequency ? `(${item.salary_frequency})` : '(per year)'}
                                </p>
                              )}

                              {/* Bio - Show short preview */}
                              {item.bio && (
                                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                  {item.bio}
                                </p>
                              )}

                              {/* Languages - Show with flags */}
                              {item.languages && item.languages.length > 0 && (
                                <div className="text-[10px] text-gray-600 mt-2 flex items-center flex-wrap gap-1">
                                  <Globe className="h-2.5 w-2.5 inline mr-1" />
                                  <span className="font-medium mr-1">Languages:</span>
                                  {item.languages.slice(0, 2).map((lang: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center">
                                      <span className="text-xs mr-0.5">{getLanguageFlag(lang)}</span>
                                      <span>{lang}{idx < Math.min(1, item.languages.length - 1) ? ',' : ''}</span>
                                    </span>
                                  ))}
                                  {item.languages.length > 2 && <span className="ml-1">+{item.languages.length - 2}</span>}
                                </div>
                              )}

                              {/* Status Badges - Only essential */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.actively_looking && (
                                  <Badge className="text-[10px] bg-green-600 text-white font-semibold py-0 px-1">
                                    <Target className="h-2 w-2 mr-0.5" />
                                    Active
                                  </Badge>
                                )}
                                {item.isPremium && (
                                  <Badge className="text-[10px] bg-amber-500 text-white py-0 px-1">
                                    <Crown className="h-2 w-2 mr-0.5" />
                                    Premium
                                  </Badge>
                                )}
                              </div>

                              {/* Extended details - only show when selected */}
                              {isSelected && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                  {/* Full Bio - Only if longer than preview */}
                                  {item.bio && item.bio.length > 100 && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-1">Full Bio</h4>
                                      <p className="text-sm text-gray-600 leading-relaxed">
                                        {item.bio}
                                      </p>
                                    </div>
                                  )}

                                  {/* Address */}
                                  {item.location && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-1">Address</h4>
                                      <p className="text-sm text-gray-600">
                                        {item.location}
                                      </p>
                                    </div>
                                  )}

                                  {/* All Skills */}
                                  {item.skills && item.skills.length > 3 && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-1">All Skills ({item.skills.length})</h4>
                                      <div className="flex flex-wrap gap-1">
                                        {item.skills.map((skill: string, index: number) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* All Languages */}
                                  {item.languages && item.languages.length > 2 && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-1">All Languages ({item.languages.length})</h4>
                                      <div className="flex flex-wrap gap-1">
                                        {item.languages.map((language: string, index: number) => (
                                          <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                                            <span className="text-sm">{getLanguageFlag(language)}</span>
                                            {language}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Additional Information */}
                                  {(item.ready_to_relocate || item.has_driving_licence || item.has_own_transport || item.employment_status || item.is_self_employed || item.experience_level) && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-2">Additional Information</h4>
                                      <div className="space-y-2">
                                        {item.employment_status && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Employment Status:</span>
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {item.employment_status.replace('_', ' ')}
                                            </Badge>
                                          </div>
                                        )}
                                        {item.experience_level && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Experience Level:</span>
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {item.experience_level.replace('_', ' ')}
                                            </Badge>
                                          </div>
                                        )}
                                        {item.has_driving_licence && (
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                            <span className="text-sm text-gray-700">Has Driving Licence</span>
                                          </div>
                                        )}
                                        {item.has_own_transport && (
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                            <span className="text-sm text-gray-700">Has Own Transport</span>
                                          </div>
                                        )}
                                        {item.ready_to_relocate && (
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                                            <span className="text-sm text-gray-700">Ready to Relocate</span>
                                          </div>
                                        )}
                                        {item.is_self_employed && (
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="h-3.5 w-3.5 text-purple-600" />
                                            <span className="text-sm text-gray-700">Self-Employed</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Availability */}
                                  {item.availability && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-1">Availability</h4>
                                      <p className="text-sm text-green-600 font-medium">
                                        {item.availability === 'available_now' ? 'Available now' :
                                         item.availability === 'available_week' ? 'Available within a week' :
                                         item.availability === 'available_month' ? 'Available within a month' :
                                         'Not specified'}
                                      </p>
                                    </div>
                                  )}

                                  {/* Professional Links */}
                                  {(item.website_url || item.portfolio_url || item.linkedin_url || item.github_url) && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-2">Professional Links</h4>
                                      <div className="flex flex-col gap-2">
                                        {item.website_url && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              window.open(item.website_url, '_blank')
                                            }}
                                          >
                                            <Globe className="h-3 w-3 mr-2" />
                                            Personal Website
                                          </Button>
                                        )}
                                        {item.portfolio_url && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              window.open(item.portfolio_url, '_blank')
                                            }}
                                          >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            Portfolio
                                          </Button>
                                        )}
                                        {item.linkedin_url && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              window.open(item.linkedin_url, '_blank')
                                            }}
                                          >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            LinkedIn Profile
                                          </Button>
                                        )}
                                        {item.github_url && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              window.open(item.github_url, '_blank')
                                            }}
                                          >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            GitHub Profile
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="pt-3 border-t border-gray-200">
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSendInquiry(item.id, `${item.first_name} ${item.last_name}`)
                                        }}
                                        disabled={sendingMessage === item.id}
                                      >
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        Contact
                                      </Button>
                                      <Button
                                        className="flex-1"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleViewProfile(item.id)
                                        }}
                                      >
                                        <UserIcon className="h-4 w-4 mr-2" />
                                        View Profile
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {data.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No results found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    )}
                  </div>
              </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      )}
    </div>
  )
}
