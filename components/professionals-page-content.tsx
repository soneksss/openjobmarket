"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug = (...args: any[]) => { if (process.env.NODE_ENV === "development") console.log(...args) }

import { useState, useEffect, useRef, useMemo, memo } from "react"
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
  ChevronDown,
  PoundSterling,
  Users,
  MessageCircle,
  Building,
  Bookmark,
  Store,
  UserCheck,
  Target,
  X,
  Crown,
  Zap,
  Globe,
  CheckCircle,
  Eye,
  HardHat,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import ProfessionalMap from "@/components/professional-map"
import JobMap from "@/components/job-map"
import JobCard from "@/components/job-card"
import JobApplicationForm from "@/components/job-application-form"
import { LocationInput } from "@/components/location-input"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { createBrowserClient } from "@supabase/ssr"
import { CompactStarRating } from "@/components/compact-star-rating"
import { SignUpPromptModal } from "@/components/sign-up-prompt-modal"
import { getLanguageFlag } from "@/components/language-selector"
import { industries, allSubcategories } from "@/lib/data/industries"

// Searchable trades list for autocomplete
const searchableTrades = [...allSubcategories, ...industries.map((i: { title: string }) => i.title)]
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReviewsList } from "@/components/reviews-list"
import ProfessionalDetailView from "@/components/professional-detail-view"
import CompanyDetailView from "@/components/company-detail-view"
import { MobileMapBottomSheet, BottomSheetState } from "@/components/mobile-map-bottom-sheet"
import { MobilePreviewCard, PreviewData } from "@/components/mobile-preview-card"

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
  spoken_languages?: string[]
  ready_to_relocate?: boolean
  has_driving_licence?: boolean
  has_own_transport?: boolean
  employment_status?: string
  actively_looking?: boolean
  nickname?: string
  hide_personal_name?: boolean
  average_rating?: number
  reviews_count?: number
  phone?: string
  phone_visible?: boolean
  employed_open_to_offers?: boolean
  unemployed_seeking?: boolean
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
  expires_at?: string
  urgency_type?: "asap" | "today" | "flexible" | null
  is_tradespeople_job?: boolean
  company_profiles: {
    company_name: string
    industry: string
  }
}

interface Company {
  id: string
  user_id?: string
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
  average_rating?: number
  reviews_count?: number
}

interface ProfessionalsPageContentProps {
  data: Professional[] | Job[] | Company[]
  user: any | null
  userType: "professional" | "company" | "contractor" | "homeowner" | null
  userProfile?: any | null
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
  onViewAllJobs?: () => void
}

function ProfessionalsPageContent({
  data,
  user,
  userType,
  userProfile,
  searchParams,
  center,
  isModal = false,
  onSearchUpdate,
  onModalClose,
  onViewAllJobs,
}: ProfessionalsPageContentProps) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")

  // Track viewport to mount only one JobMap (mobile OR desktop) — never both simultaneously
  const [isDesktopLayout, setIsDesktopLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktopLayout(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktopLayout(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Local user state - falls back to fetching if prop is null
  const [currentUser, setCurrentUser] = useState<any>(user)
  const [currentUserType, setCurrentUserType] = useState<string | null>(userType)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(userProfile)

  // Fetch user data if props are null (timing issue fix)
  useEffect(() => {
    const fetchUserData = async () => {
      // If user prop is already set, use it
      if (user) {
        setCurrentUser(user)
        setCurrentUserType(userType)
        setCurrentUserProfile(userProfile)
        return
      }

      // Otherwise, fetch user data ourselves
      debug("[PROFESSIONALS-PAGE-CONTENT] User prop is null, fetching auth state...")
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        debug("[PROFESSIONALS-PAGE-CONTENT] Found authenticated user:", authUser.id)
        setCurrentUser(authUser)

        // Fetch user type
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", authUser.id)
          .single()

        const fetchedUserType = userData?.user_type || null
        setCurrentUserType(fetchedUserType)

        // Fetch appropriate profile
        let profileData = null
        if (fetchedUserType === 'professional') {
          const { data } = await supabase
            .from("professional_profiles")
            .select("id, first_name, last_name")
            .eq("user_id", authUser.id)
            .maybeSingle()
          profileData = data
        } else if (fetchedUserType === 'company') {
          const { data } = await supabase
            .from("company_profiles")
            .select("id, company_name")
            .eq("user_id", authUser.id)
            .maybeSingle()
          profileData = data
        } else if (fetchedUserType === 'homeowner') {
          const { data } = await supabase
            .from("homeowner_profiles")
            .select("id, first_name, last_name")
            .eq("user_id", authUser.id)
            .maybeSingle()
          profileData = data
        } else if (fetchedUserType === 'contractor') {
          const { data } = await supabase
            .from("contractor_profiles")
            .select("id, company_name")
            .eq("user_id", authUser.id)
            .maybeSingle()
          profileData = data
        }

        setCurrentUserProfile(profileData)
        debug("[PROFESSIONALS-PAGE-CONTENT] User data loaded:", { userId: authUser.id, userType: fetchedUserType })
      } else {
        debug("[PROFESSIONALS-PAGE-CONTENT] No authenticated user found")
      }
    }

    fetchUserData()
  }, [user, userType, userProfile])
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
  // Modal filter local state (applied on Search click, not on URL immediately)
  const [filterRadius, setFilterRadius] = useState(searchParams.radius || "5")
  const [filterCategory, setFilterCategory] = useState((searchParams as any).tradeCategory || "all")
  const [filterUrgency, setFilterUrgency] = useState((searchParams as any).urgency || "all")
  const [filterBudget, setFilterBudget] = useState("all")
  const [filterAvailability, setFilterAvailability] = useState("all")
  const [filterBusinessType, setFilterBusinessType] = useState(
    (searchParams as any).self_employed === "true" ? "self_employed" : "all"
  )
  const [filter247, setFilter247] = useState(false)
  const [searchApplied, setSearchApplied] = useState(isModal)
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)
  const [customLanguage, setCustomLanguage] = useState("")
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const [subjectDialog, setSubjectDialog] = useState<{ recipientUserId: string; recipientName: string } | null>(null)
  const [subjectInput, setSubjectInput] = useState("")
  const [sortBy, setSortBy] = useState<"nearest" | "salary" | "best_match">("best_match")
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null)
  const professionalCardRefs = useRef<{[key: string]: HTMLElement | null}>({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [tradeSuggestions, setTradeSuggestions] = useState<string[]>([])
  const [showTradeSuggestions, setShowTradeSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [viewProfileModalId, setViewProfileModalId] = useState<string | null>(null)
  const [viewProfileData, setViewProfileData] = useState<any | null>(null)
  const [viewCompanyModalId, setViewCompanyModalId] = useState<string | null>(null)
  const [viewCompanyData, setViewCompanyData] = useState<any | null>(null)

  // Application modal state
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [selectedJobForApplication, setSelectedJobForApplication] = useState<any | null>(null)

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

  // Mobile list view state - controls if list is full screen or split view
  const [isListFullScreen, setIsListFullScreen] = useState(false)

  // Mobile bottom sheet state (Airbnb-style)
  const [bottomSheetState, setBottomSheetState] = useState<BottomSheetState>("split")
  const [mobilePreviewData, setMobilePreviewData] = useState<PreviewData | null>(null)

  // Sign-up prompt modal state
  const [signUpPrompt, setSignUpPrompt] = useState<{
    isOpen: boolean
    action: "message" | "filter" | "dashboard"
  }>({
    isOpen: false,
    action: "message",
  })

  // Reviews modal state
  const [reviewsModal, setReviewsModal] = useState<{
    isOpen: boolean
    userId: string
    userType: "professional" | "company" | "contractor" | "homeowner"
    userName: string
  } | null>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isFullScreenMode || isModal) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [isFullScreenMode, isModal])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Determine if we're showing jobs (vacancies or jobs/tasks) — must be defined before isEmployer
  const isShowingJobs = searchParams.vacancies === "true" || searchParams.jobs_tasks === "true"

  // A company/tradesperson looking at trade jobs (jobs_tasks) is a job-seeker, not an employer.
  // isEmployer should only be true when a company searches for talent/professionals.
  const isEmployer = currentUserType === "company" && !isShowingJobs
  const isEmployee = currentUserType === "professional"

  // Determine if we're showing companies (when professionals search with company filters)
  const hasCompanyFilters = searchParams.open_for_business || searchParams.hiring
  const isShowingCompanies = isEmployee && hasCompanyFilters && data.length > 0 && 'company_name' in data[0]

  // Determine if we're showing traders (self-employed professionals + companies open for business)
  const isShowingTraders = searchParams.traders === "true"

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
      // In modal mode the filters start collapsed — user opens them manually
      if (!isModal) {
        setShowAdvancedFilters(true)
      }
    }
  }, [searchParams.search, searchParams.location, searchParams.lat, searchParams.lng, searchParams.traders, isModal])

  // Clear filter parameters for unregistered users
  // Skip this if in modal mode - we don't want to redirect when shown as a modal
  useEffect(() => {
    if (!currentUser && !isModal) {
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
  }, [currentUser, currentSearchParams, router, isModal])

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

  const handleSearch = (customRadius?: string, overrides?: { availability?: string; language?: string; is247?: boolean }) => {
    setSearchApplied(true)
    const params = new URLSearchParams()

    // Allow empty search or "any" if location is provided
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const isAnySearch = normalizedSearch === '' || normalizedSearch === 'any'

    if (searchTerm && !isAnySearch) {
      params.set("search", searchTerm)
    } else if (isAnySearch && (locationFilter || selectedLocationCoords)) {
      // Set "any" to indicate location-based search without specific query
      params.set("search", "any")
    }

    if (locationFilter) params.set("location", locationFilter)
    if (selectedLocationCoords) {
      params.set("lat", selectedLocationCoords.lat.toString())
      params.set("lng", selectedLocationCoords.lon.toString())
    }
    if (skillsFilter) params.set("skills", skillsFilter)
    const effectiveLanguage = overrides?.language !== undefined ? overrides.language : (languageFilter === "other" ? customLanguage.trim() : (languageFilter || ""))
    const finalLanguage = effectiveLanguage
    if (finalLanguage && finalLanguage !== "all") params.set("language", finalLanguage)
    if (unemployedFilter) params.set("unemployed", "true")
    if (employedFilter) params.set("employed", "true")
    if (relocateFilter) params.set("relocate", "true")
    if (cvFilter) params.set("cv", "true")
    if (drivingLicenseFilter) params.set("driving_license", "true")
    if (ownTransportFilter) params.set("own_transport", "true")
    if (searchParams.level) params.set("level", searchParams.level)
    if (searchParams.type) params.set("type", searchParams.type)
    if (searchParams.salaryMin) params.set("salaryMin", searchParams.salaryMin)
    if (searchParams.hiring) params.set("hiring", searchParams.hiring)
    if (searchParams.traders) params.set("traders", searchParams.traders)
    if ((searchParams as any).jobs_tasks) params.set("jobs_tasks", (searchParams as any).jobs_tasks)
    if ((searchParams as any).vacancies) params.set("vacancies", (searchParams as any).vacancies)
    if ((searchParams as any).autoSearch) params.set("autoSearch", (searchParams as any).autoSearch)
    if ((searchParams as any).tab) params.set("tab", (searchParams as any).tab)
    // Modal-specific filters (local state, applied on Search click)
    if (filterCategory !== "all") params.set("tradeCategory", filterCategory)
    if (filterUrgency !== "all") params.set("urgency", filterUrgency)
    if (filterBudget !== "all") params.set("budget", filterBudget)
    const effectiveAvailability = overrides?.availability !== undefined ? overrides.availability : filterAvailability
    const effective247 = overrides?.is247 !== undefined ? overrides.is247 : filter247
    if (effectiveAvailability === "available") params.set("open_for_business", "true")
    if (filterBusinessType === "self_employed") params.set("self_employed", "true")
    if (filterBusinessType === "company") params.set("company", "true")
    if (effective247) params.set("is_247", "true")
    // Non-modal legacy filters
    if (!isModal) {
      if (selfEmployedFilter) params.set("self_employed", "true")
      if (availableFilter) params.set("open_for_business", "true")
      if (searchParams.open_for_business) params.set("open_for_business", searchParams.open_for_business)
    }
    // Radius from map picker or local filter state
    const radiusToUse = customRadius || filterRadius || "5"
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

  const handleModalTradeSearchChange = (value: string) => {
    setSearchTerm(value)
    if (value.length >= 2) {
      const lowerValue = value.toLowerCase()
      const matches = searchableTrades.filter((trade: string) =>
        trade.toLowerCase().includes(lowerValue)
      ).slice(0, 8)
      setTradeSuggestions(matches)
      setShowTradeSuggestions(matches.length > 0)
    } else {
      setTradeSuggestions([])
      setShowTradeSuggestions(false)
    }
  }

  const handleModalTradeSuggestionSelect = (trade: string) => {
    setSearchTerm(trade)
    setTradeSuggestions([])
    setShowTradeSuggestions(false)
    searchInputRef.current?.blur()
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

  const formatAddress = (fullAddress?: string) => {
    if (!fullAddress) return ''

    // Split by comma
    const parts = fullAddress.split(',').map(p => p.trim())

    if (parts.length === 0) return fullAddress

    // Extract first part (street)
    const street = parts[0]

    // Find postcode (UK format: letters, numbers, space, numbers, letters)
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i
    const postcodeMatch = fullAddress.match(postcodeRegex)
    const postcode = postcodeMatch ? postcodeMatch[0] : null

    // Last part is usually the country
    const country = parts[parts.length - 1]

    // Build short address
    const addressParts = [street]
    if (postcode) addressParts.push(postcode)
    if (country && country.toLowerCase() !== street.toLowerCase()) addressParts.push(country)

    return addressParts.join(', ')
  }

  // Format short address for display - City + Postcode only (for compact views)
  const formatShortAddress = (location?: string) => {
    if (!location) return 'Location not specified'

    // Split by comma
    const parts = location.split(',').map(p => p.trim()).filter(p => p.length > 0)

    if (parts.length === 0) return location

    // Find postcode (UK format)
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i
    const postcodeMatch = location.match(postcodeRegex)
    const postcode = postcodeMatch ? postcodeMatch[0] : null

    // Words to skip (countries, regions)
    const skipWords = ['united kingdom', 'uk', 'england', 'scotland', 'wales', 'ireland', 'great britain']

    // Find city/town - look for a part that's not a street number and not a country
    let city = ''
    for (const part of parts) {
      const partLower = part.toLowerCase()
      // Skip if it's a country
      if (skipWords.includes(partLower)) continue
      // Skip if it's the postcode
      if (postcode && part.includes(postcode)) continue
      // Skip if it starts with a number (likely street address)
      if (/^\d/.test(part)) continue
      // This is likely the city
      city = part.replace(postcodeRegex, '').trim()
      if (city) break
    }

    // Build short address: City, Postcode
    if (city && postcode) {
      return `${city}, ${postcode}`
    } else if (city) {
      return city
    } else if (postcode) {
      return postcode
    }

    // Fallback: return first part
    return parts[0] || location
  }

  const dataWithCoordinates = useMemo(
    () => data.filter((item) => "latitude" in item && "longitude" in item && item.latitude && item.longitude),
    [data],
  )

  // Always show map in modal mode; otherwise show only when we have data or a non-default center
  const shouldShowMap = isModal || center[0] !== 50.8058 || center[1] !== -1.0872 || dataWithCoordinates.length > 0

  // Stable tuple for JobMap — avoids creating a new array reference every render
  const jobMapCenter = useMemo<[number, number]>(() => [center[0], center[1]], [center[0], center[1]])

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
    // Data is already fetched — find the item in the data prop directly.
    // This avoids 3 sequential Supabase queries (which are slow and may be
    // blocked by RLS for unauthenticated users, causing the UI to appear stuck).
    const item = (data as any[]).find((d: any) => d.id === profileId)

    if (!item) {
      console.error('[handleViewProfile] Item not found in data for id:', profileId)
      return
    }

    const isCompany = 'company_name' in item

    if (isCompany) {
      // Company or contractor — show CompanyDetailView modal
      setViewCompanyData({
        ...item,
        company_name: item.company_name || item.name || 'Contractor',
        description: item.description || item.bio || '',
        industry: item.industry || '',
        company_size: item.company_size || 'Individual',
        spoken_languages: item.spoken_languages || item.languages || [],
        service_24_7: item.service_24_7 || item.available_247 || false,
        logo_url: item.logo_url || item.profile_photo_url || null,
      })
      setViewCompanyModalId(item.id)
    } else {
      // Professional — show ProfessionalDetailView modal
      setViewProfileData(item)
      setViewProfileModalId(item.id)
    }
  }

  const openConversation = (recipientUserId: string, recipientName: string) => {
    if (!currentUser) {
      setSignUpPrompt({ isOpen: true, action: "message" })
      return
    }
    // Show subject dialog — homeowner provides context before starting a new thread
    setSubjectInput("")
    setSubjectDialog({ recipientUserId, recipientName })
  }

  const startConversation = async () => {
    if (!currentUser || !subjectDialog) return
    const subject = subjectInput.trim() || "General enquiry"
    const p1 = currentUser.id < subjectDialog.recipientUserId ? currentUser.id : subjectDialog.recipientUserId
    const p2 = currentUser.id < subjectDialog.recipientUserId ? subjectDialog.recipientUserId : currentUser.id
    const { data, error } = await supabase
      .from("conversations")
      .insert({ participant_1: p1, participant_2: p2, subject })
      .select("id")
      .single()
    setSubjectDialog(null)
    if (data?.id) router.push(`/messages/${data.id}`)
  }

  const handleSendInquiry = async (professionalProfileId: string, professionalName: string, professionalUserId?: string) => {
    if (!currentUser) {
      setSignUpPrompt({ isOpen: true, action: "message" })
      return
    }

    setSendingMessage(professionalProfileId)
    try {
      // If user_id not provided, fetch it from the profile
      let recipientUserId = professionalUserId
      if (!recipientUserId) {
        // Try professional_profiles first, then company_profiles
        let { data: profileData } = await supabase
          .from('professional_profiles')
          .select('user_id')
          .eq('id', professionalProfileId)
          .single()

        if (!profileData) {
          const { data: companyData } = await supabase
            .from('company_profiles')
            .select('user_id')
            .eq('id', professionalProfileId)
            .single()
          profileData = companyData
        }

        if (profileData) {
          recipientUserId = profileData.user_id
        } else {
          console.error("[ERROR] Could not find user_id for profile:", professionalProfileId)
          alert("Error: Could not find user. Please try again.")
          return
        }
      }

      openConversation(recipientUserId!, professionalName)
    } catch (error) {
      console.error("[ERROR] Error sending inquiry:", error)
      alert("Error sending message. Please try again.")
    } finally {
      setSendingMessage(null)
    }
  }

  const handleApplyToJob = async (jobId: string) => {
    if (!currentUser) {
      setSignUpPrompt({ isOpen: true, action: "message" })
      return
    }

    // Find the job in the data array
    const job = data.find((item: any) => item.id === jobId)
    if (!job) {
      console.error("[PROFESSIONALS-PAGE] Job not found:", jobId)
      return
    }

    debug("[PROFESSIONALS-PAGE] Opening application modal for job:", jobId)
    setSelectedJobForApplication(job)
    setShowApplicationModal(true)
  }

  const handleSaveJob = async (jobId: string) => {
    if (!currentUser) {
      setSignUpPrompt({ isOpen: true, action: "message" })
      return
    }
    // Implementation for saving job
    debug("Saving job:", jobId)
  }

  // Helper function to convert data item to PreviewData for mobile preview card
  const getPreviewDataForItem = (item: any): PreviewData | null => {
    if (!item) return null

    // Check if it's a job
    if (isShowingJobs) {
      return {
        type: "job" as const,
        id: item.id,
        title: item.title,
        companyName: item.company_profiles?.company_name,
        posterName: item.poster_first_name && item.poster_last_name
          ? `${item.poster_first_name} ${item.poster_last_name}`
          : undefined,
        location: item.location || "Location not specified",
        salaryMin: item.salary_min,
        salaryMax: item.salary_max,
        budgetMin: item.budget_min,
        budgetMax: item.budget_max,
        description: item.description,
        jobType: item.job_type,
        workLocation: item.work_location,
        createdAt: item.created_at,
        urgencyType: item.urgency_type ?? null,
        expiresAt: item.expires_at ?? null,
        isTradesJob: !!item.is_tradespeople_job,
      }
    }

    // Check if it's a company
    if ('company_name' in item) {
      return {
        type: "company" as const,
        id: item.id,
        companyName: item.company_name,
        industry: item.industry,
        description: item.description,
        location: item.location || "Location not specified",
        logoUrl: item.logo_url,
        services: item.services,
        openForBusiness: item.open_for_business,
        isHiring: item.is_hiring,
        phone: item.phone || item.phone_number,
        websiteUrl: item.website_url,
        spokenLanguages: item.spoken_languages,
        averageRating: item.average_rating,
        reviewsCount: item.reviews_count,
      }
    }

    // Otherwise it's a professional
    return {
      type: "professional" as const,
      id: item.id,
      firstName: item.first_name,
      lastName: item.last_name,
      title: item.title,
      bio: item.bio,
      location: item.location || "Location not specified",
      avatarUrl: item.profile_photo_url,
      salaryMin: item.salary_min,
      salaryMax: item.salary_max,
      salaryFrequency: item.salary_frequency,
      skills: item.skills,
      averageRating: item.average_rating,
      reviewsCount: item.reviews_count,
      experienceLevel: item.experience_level,
      isAvailable: item.available_for_work || item.actively_looking,
      isSelfEmployed: item.is_self_employed,
      spokenLanguages: item.spoken_languages,
    }
  }

  // Handle pin selection on mobile - show preview card
  const handleMobilePinSelect = (itemId: string | null) => {
    setSelectedProfessionalId(itemId)

    if (!itemId) {
      setMobilePreviewData(null)
      if (bottomSheetState === "previewCard") {
        setBottomSheetState("split")
      }
      return
    }

    // Find the item and create preview data
    const item = data.find((d: any) => d.id === itemId)
    if (item) {
      const previewData = getPreviewDataForItem(item)
      setMobilePreviewData(previewData)
      setBottomSheetState("previewCard")
    }
  }

  // Handle preview card close
  const handlePreviewClose = () => {
    setMobilePreviewData(null)
    setSelectedProfessionalId(null)
    setBottomSheetState("split")
  }

  // Handle preview card view details
  const handlePreviewViewDetails = (id: string) => {
    if (isShowingJobs) {
      // Navigate to job details page
      const params = new URLSearchParams()
      if (searchParams.search) params.set('returnQuery', searchParams.search)
      if (searchParams.location) params.set('returnLocation', searchParams.location)
      if (searchParams.lat) params.set('returnLat', searchParams.lat)
      if (searchParams.lng) params.set('returnLon', searchParams.lng)
      if (searchParams.radius) params.set('returnRadius', searchParams.radius)
      params.set('returnToSearch', 'true')
      const queryString = params.toString()
      router.push(`/jobs/${id}${queryString ? `?${queryString}` : ''}`)
    } else {
      handleViewProfile(id)
    }
  }

  // Handle preview card action (Apply/Message/Respond)
  const handlePreviewAction = (id: string, name: string) => {
    if (isShowingJobs) {
      const job = data.find((d: any) => d.id === id)
      if (job?.is_tradespeople_job) {
        // Trade jobs use UrgentJobApplySection on the detail page — navigate there
        router.push(`/jobs/${id}`)
        return
      }
      handleApplyToJob(id)
    } else {
      handleSendInquiry(id, name)
    }
  }

  // Check if search has been performed
  const hasSearchParams = searchParams.search || searchParams.location || searchParams.lat || searchParams.lng

  return (
    <div className="min-h-screen bg-background">
      {/* Skip hero section when in modal mode */}
      {!isModal && (
        <div>
          {/* Info banner for unauthenticated users - hide after search or if dismissed */}
          {!currentUser && !isBannerDismissed && !hasSearchParams && (
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
              <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2 mb-4">
                {/* Search Input */}
                <div className="sm:flex-1">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={
                      isShowingTraders
                        ? "e.g. Freelancer, Consultant"
                        : isEmployer
                        ? "e.g. Software Engineer"
                        : "e.g. Marketing Manager"
                    }
                    className="h-10 md:h-12 text-sm md:text-base px-3 md:px-4 bg-white border-0 focus:ring-2 focus:ring-emerald-500/30 rounded-lg font-medium placeholder:text-gray-500 shadow-md w-full"
                  />
                </div>

                {/* Location Input + Map Picker on mobile, separate on desktop */}
                <div className="flex gap-2 sm:flex-1">
                  <div className="flex-1">
                    <LocationInput
                      value={locationFilter}
                      onChange={setLocationFilter}
                      onLocationSelect={handleLocationSelect}
                      placeholder="e.g. London"
                      error=""
                    />
                  </div>

                  {/* Map Picker Button */}
                  <Button
                    onClick={handleMapPickerClick}
                    className="h-10 md:h-12 px-3 md:px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
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
                    setShowAdvancedFilters(true)
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
                {!currentUser && (
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
                  onClick={() => !currentUser ? setSignUpPrompt({ isOpen: true, action: "filter" }) : setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 text-white" />
                  <span className="text-white font-medium hidden sm:inline sm:ml-2">Advanced Filters - Show only:</span>
                  <ChevronDown className={`h-4 w-4 text-white ml-auto transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                </div>

                {showAdvancedFilters && (
                  <div className={`space-y-4 ${!currentUser ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* First Row - Experience Level, Job Type, Skills/Salary, Language */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Experience Level */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Experience Level</label>
                        <Select
                          value={searchParams.level || "all"}
                          onValueChange={(value) => updateSearchParams("level", value)}
                          disabled={!currentUser}
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
                            disabled={!currentUser}
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
                          disabled={!currentUser}
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
                            disabled={!currentUser}
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
                          disabled={!currentUser}
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
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="unemployed" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Unemployed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="employed"
                            checked={employedFilter}
                            onCheckedChange={(checked) => setEmployedFilter(!!checked)}
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="employed" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="relocate"
                            checked={relocateFilter}
                            onCheckedChange={(checked) => setRelocateFilter(!!checked)}
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="relocate" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Ready to relocate
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="cv"
                            checked={cvFilter}
                            onCheckedChange={(checked) => setCvFilter(!!checked)}
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="cv" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            With CV
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="driving-license"
                            checked={drivingLicenseFilter}
                            onCheckedChange={(checked) => setDrivingLicenseFilter(!!checked)}
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="driving-license" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Valid Driving License
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="own-transport"
                            checked={ownTransportFilter}
                            onCheckedChange={(checked) => setOwnTransportFilter(!!checked)}
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="own-transport" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Own transport
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="self-employed"
                            checked={selfEmployedFilter}
                            onCheckedChange={(checked) => setSelfEmployedFilter(!!checked)}
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="self-employed" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            Self-employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="available"
                            checked={availableFilter}
                            onCheckedChange={(checked) => setAvailableFilter(!!checked)}
                            disabled={!currentUser}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="available" className={`text-sm text-white ${!currentUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
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
      </div>
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
                          center={jobMapCenter}
                          zoom={10}
                          height="100%"
                          showRadius={!!selectedLocationCoords}
                          radiusCenter={selectedLocationCoords ? [selectedLocationCoords.lat, selectedLocationCoords.lon] : undefined}
                          radiusKm={parseInt(filterRadius || searchParams.radius || "20") * 1.60934}
                          selectedJobId={selectedProfessionalId}
                          onJobSelect={(job) => {
                            setSelectedProfessionalId(job?.id || null)
                          }}
                        />
                      ) : (
                        <ProfessionalMap
                          professionals={dataWithCoordinates.map((item: any) => ({
                            id: item.id,
                            // Show name for professionals (respecting privacy), company name for companies
                            name: ('first_name' in item)
                              ? (!item.hide_personal_name && (item.first_name || item.last_name)
                                  ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                                  : (item.nickname || 'Anonymous'))
                              : item.company_name || 'Unknown',
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
                          radiusKm={parseInt(filterRadius || searchParams.radius || "20") * 1.60934}
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
                <Card className="h-auto max-h-[calc(100vh-200px)] lg:h-[600px] flex flex-col shadow-xl border-0 rounded-xl">
                  {/* Professional List */}
                  <>
                    <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                        {isEmployer ? "Professionals" : isShowingCompanies ? "Companies" : isShowingTraders ? "Traders" : "Results"}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600">Click on professionals below or map markers</p>
                    </div>

                      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
                        {data.length === 0 ? (
                          <div className="py-8 px-5">
                            {isShowingJobs ? (
                              <>
                                <p className="text-sm font-medium text-gray-800 mb-1">
                                  No jobs matching your skills in this area right now.
                                </p>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Try:</p>
                                <ul className="space-y-1.5 text-sm text-gray-600 mb-5">
                                  <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span>Expanding your search radius</span></li>
                                  <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span>Adding more skills to your profile</span></li>
                                  <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span>Viewing all construction jobs nearby</span></li>
                                </ul>
                                {isModal && onViewAllJobs ? (
                                  <button
                                    type="button"
                                    onClick={onViewAllJobs}
                                    className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    View all jobs nearby
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  </button>
                                ) : (
                                  <a
                                    href="/jobs"
                                    className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    View all jobs nearby
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 text-center">
                                  {`No tradespeople found${locationFilter ? ` in ${locationFilter}` : ''}`}
                                </h3>
                                <p className="text-gray-600 text-center">Try expanding your search radius or searching for a different trade</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 p-3 sm:p-4">
                            {sortedData.map((item: any) => {
                              const isSelected = selectedProfessionalId === item.id

                              // If showing jobs, render JobCard instead
                              if (isShowingJobs) {
                                return (
                                  <JobCard
                                    key={item.id}
                                    ref={(el) => { professionalCardRefs.current[item.id] = el }}
                                    job={item}
                                    isLoggedIn={!!currentUser}
                                    isSelected={isSelected}
                                    userProfile={currentUserProfile}
                                    onSelect={() => {
                                      // Toggle selection
                                      setSelectedProfessionalId(isSelected ? null : item.id)
                                    }}
                                    onApply={handleApplyToJob}
                                  />
                                )
                              }
                              // Determine item type and contact permission
                              const isItemProfessional = 'first_name' in item
                              const isItemCompany = 'company_name' in item
                              // Anyone can contact companies that are open for business
                              // Only employers and tradespeople can contact professionals
                              const canContact = (isItemCompany && item.open_for_business) || currentUserType === "company" || currentUserType === "contractor"

                              return (
                              <Card
                                key={item.id}
                                ref={(el) => { professionalCardRefs.current[item.id] = el }}
                                className={`cursor-pointer transition-all rounded-lg touch-manipulation ${
                                  isSelected
                                    ? "shadow-xl border-2 border-emerald-500 bg-emerald-900/20"
                                    : "hover:shadow-md border bg-slate-800 border-slate-700"
                                }`}
                                onClick={() => {
                                  // Toggle selection
                                  setSelectedProfessionalId(isSelected ? null : item.id)
                                }}
                                onTouchEnd={(e) => {
                                  // Better mobile touch handling
                                  if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-content-area')) {
                                    e.preventDefault()
                                    setSelectedProfessionalId(isSelected ? null : item.id)
                                  }
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex gap-3 card-content-area">
                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                      <AvatarImage src={item.profile_photo_url || item.logo_url} alt={item.first_name || item.company_name} />
                                      <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
                                        {('first_name' in item)
                                          ? `${(item.first_name || 'P').charAt(0)}${(item.last_name || 'R').charAt(0)}`
                                          : (item.company_name || 'C').substring(0, 2).toUpperCase()
                                        }
                                      </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                      {/* 1. Profession Title - Main heading */}
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg text-white font-bold truncate">
                                          {item.title || item.industry || 'Professional'}
                                        </h3>
                                        {item.isPremium && (
                                          <div className="flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                                            <Crown className="h-2.5 w-2.5" />
                                            <span className="text-[9px] font-bold">PREMIUM</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* 2. Nickname or Name - respects hide_personal_name privacy setting */}
                                      <p className="text-sm text-slate-300 mb-2 font-medium">
                                        {!item.hide_personal_name && (item.first_name || item.last_name)
                                          ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                                          : (item.nickname || 'Anonymous')}
                                      </p>

                                      {/* Star Rating */}
                                      {'first_name' in item && (
                                        <div
                                          className="mb-2 cursor-pointer hover:opacity-70 transition-opacity w-fit"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (item.reviews_count && item.reviews_count > 0) {
                                              setReviewsModal({
                                                isOpen: true,
                                                userId: item.id,
                                                userType: 'professional',
                                                userName: `${item.first_name} ${item.last_name}`
                                              })
                                            }
                                          }}
                                          title={item.reviews_count && item.reviews_count > 0 ? "Click to view reviews" : "No reviews yet"}
                                        >
                                          <CompactStarRating
                                            rating={item.average_rating || 0}
                                            reviewCount={item.reviews_count || 0}
                                            size="sm"
                                            showCount={true}
                                          />
                                        </div>
                                      )}
                                      {isItemCompany && (
                                        <Link
                                          href={`/companies/${item.id}`}
                                          className="mb-2 hover:opacity-70 transition-opacity w-fit flex items-center"
                                          onClick={(e) => e.stopPropagation()}
                                          title="View company profile and reviews"
                                        >
                                          <CompactStarRating
                                            rating={item.average_rating || 0}
                                            reviewCount={item.reviews_count || 0}
                                            size="sm"
                                            showCount={true}
                                          />
                                        </Link>
                                      )}

                                      {formatSalary(item.salary_min, item.salary_max) && (
                                        <div className="text-sm font-semibold text-green-600 mb-2">
                                          {formatSalary(item.salary_min, item.salary_max)} {item.salary_frequency ? `(${item.salary_frequency})` : '(per year)'}
                                        </div>
                                      )}

                                      {/* Bio/Description - Show short preview */}
                                      {(item.bio || item.description) && (
                                        <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                                          {item.bio || item.description}
                                        </p>
                                      )}

                                      {/* Services for Companies (show in collapsed state) */}
                                      {isItemCompany && item.services && item.services.length > 0 && (
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-slate-300 mb-1">Services:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {item.services.slice(0, 3).map((service: string, idx: number) => (
                                              <Badge key={idx} className="text-xs bg-slate-700 text-slate-200 border-slate-600">
                                                {service}
                                              </Badge>
                                            ))}
                                            {item.services.length > 3 && (
                                              <Badge className="text-xs bg-transparent text-slate-400 border-slate-600">
                                                +{item.services.length - 3} more
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Skills for Professionals - Show first 3 */}
                                      {isItemProfessional && item.skills && item.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {item.skills.slice(0, 3).map((skill: string, idx: number) => (
                                            <Badge key={idx} className="text-xs bg-slate-700 text-slate-200 border-slate-600">
                                              {skill}
                                            </Badge>
                                          ))}
                                          {item.skills.length > 3 && (
                                            <Badge className="text-xs bg-transparent text-slate-400 border-slate-600">
                                              +{item.skills.length - 3} more
                                            </Badge>
                                          )}
                                        </div>
                                      )}

                                      {/* Languages - Show with flags */}
                                      {item.spoken_languages && item.spoken_languages.length > 0 && (
                                        <div className="text-xs text-slate-400 mb-2 flex items-center flex-wrap gap-1">
                                          <Globe className="h-3 w-3 inline mr-1" />
                                          <span className="font-medium mr-1">Languages:</span>
                                          {item.spoken_languages.slice(0, 3).map((lang: string, idx: number) => (
                                            <span key={idx} className="inline-flex items-center">
                                              <span className="text-base mr-0.5">{getLanguageFlag(lang)}</span>
                                              <span>{lang}{idx < Math.min(2, item.spoken_languages.length - 1) ? ',' : ''}</span>
                                            </span>
                                          ))}
                                          {item.spoken_languages.length > 3 && <span className="ml-1">+{item.spoken_languages.length - 3} more</span>}
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
                                        {item.employed_open_to_offers && !item.actively_looking && (
                                          <Badge className="text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold">
                                            <Briefcase className="h-2.5 w-2.5 mr-0.5" />
                                            Open to Offers
                                          </Badge>
                                        )}
                                        {item.unemployed_seeking && (
                                          <Badge className="text-xs bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold">
                                            <Users className="h-2.5 w-2.5 mr-0.5" />
                                            Seeking Work
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
                                        <span className="text-xs text-slate-500">
                                          {formatDate(item.created_at)}
                                        </span>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 min-w-[44px] px-2 sm:px-3 touch-manipulation"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (canContact) {
                                                const name = isItemProfessional
                                                  ? `${item.first_name} ${item.last_name}`
                                                  : item.company_name
                                                handleSendInquiry(item.id, name)
                                              }
                                            }}
                                            disabled={!canContact || sendingMessage === item.id}
                                            title="Send Message"
                                          >
                                            <MessageCircle className="h-4 w-4" />
                                            <span className="ml-1 hidden sm:inline">Message</span>
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="h-9 px-3 touch-manipulation min-w-[44px]"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleViewProfile(item.id)
                                            }}
                                            title="View Full Profile"
                                          >
                                            <Eye className="h-4 w-4 sm:mr-1" />
                                            <span className="hidden sm:inline">View</span>
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Permission explanation if contact is disabled (collapsed state) */}
                                      {currentUser && !canContact && (
                                        <p className="text-[10px] text-muted-foreground text-center mt-2">
                                          {isItemCompany
                                            ? "This company is not currently accepting inquiries"
                                            : "Only employers and tradespeople can contact professionals"}
                                        </p>
                                      )}

                                      {/* Extended details - only show when selected */}
                                      {isSelected && (
                                        <div className="mt-3 pt-3 border-t-2 border-blue-500 bg-blue-50/30 -mx-4 px-4 pb-3 space-y-3">
                                          <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-sm text-blue-900">
                                              {isItemCompany ? '📋 Full Company Details' : '👤 Full Profile'}
                                            </h3>
                                          </div>
                                          {/* Full Bio/Description - Show for companies or long bio */}
                                          {((item.bio && item.bio.length > 150) || (item.description)) && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                                                {isItemCompany ? 'Company Description' : 'Full Bio'}
                                              </h4>
                                              <p className="text-sm text-gray-600 leading-relaxed">
                                                {item.description || item.bio}
                                              </p>
                                            </div>
                                          )}

                                          {/* Industry - Show for companies */}
                                          {isItemCompany && item.industry && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">Industry</h4>
                                              <Badge variant="secondary" className="text-sm">
                                                {item.industry}
                                              </Badge>
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

                                          {/* Phone Number - Show for companies or if explicitly visible */}
                                          {(item.phone || item.phone_number) && (isItemCompany || item.phone_visible) && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">Phone</h4>
                                              <a
                                                href={`tel:${item.phone || item.phone_number}`}
                                                className="text-sm text-blue-600 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {item.phone || item.phone_number}
                                              </a>
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
                                          {item.spoken_languages && item.spoken_languages.length > 3 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">All Languages ({item.spoken_languages.length})</h4>
                                              <div className="flex flex-wrap gap-1">
                                                {item.spoken_languages.map((language: string, index: number) => (
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

                                          {/* Company Website */}
                                          {isItemCompany && item.website_url && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1">Website</h4>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full justify-start"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  window.open(item.website_url, '_blank')
                                                }}
                                              >
                                                <ExternalLink className="h-3 w-3 mr-2" />
                                                {item.website_url}
                                              </Button>
                                            </div>
                                          )}

                                          {/* Price List - For companies/traders */}
                                          {item.price_list && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                                                <PoundSterling className="h-4 w-4 text-green-600" />
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
                                                  if (canContact) {
                                                    const name = isItemProfessional
                                                      ? `${item.first_name} ${item.last_name}`
                                                      : item.company_name
                                                    handleSendInquiry(item.id, name)
                                                  }
                                                }}
                                                disabled={!canContact || sendingMessage === item.id}
                                              >
                                                <MessageCircle className="h-4 w-4 mr-2" />
                                                Send inquiry
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

                                            {/* Permission explanation if contact is disabled (expanded state) */}
                                            {currentUser && !canContact && (
                                              <p className="text-xs text-muted-foreground text-center mt-2">
                                                {isItemCompany
                                                  ? "This company is not currently accepting inquiries"
                                                  : "Only employers and tradespeople can contact professionals"}
                                              </p>
                                            )}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col relative z-[1000000]">
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
                center={selectedLocationCoords ? { lat: selectedLocationCoords.lat, lon: selectedLocationCoords.lon } : { lat: 50.8058, lon: -1.0872 }}
                zoom={8}
                height="100%"
                showRadius={!!mapPickerLocation}
                radiusCenter={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
                radiusKm={parseInt(mapPickerRadius) * 1.60934} // Convert miles to km
                onMapClick={handleMapLocationPick}
                selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
              />

              {/* Radius Control Overlay - Top of Map */}
              <div className="absolute top-4 right-4 z-[100]">
                <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-emerald-500">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <label className="text-sm font-semibold text-gray-900 whitespace-nowrap">Search Radius:</label>
                    <Select value={mapPickerRadius} onValueChange={setMapPickerRadius}>
                      <SelectTrigger className="w-28 h-9 text-sm font-medium border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] z-[101]">
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
      {messageModal?.isOpen && currentUser && (
        <FloatingMessageModal
          isOpen={messageModal.isOpen}
          onClose={() => setMessageModal(null)}
          recipientId={messageModal.recipientId}
          recipientName={messageModal.recipientName}
          conversationId={messageModal.conversationId}
          userId={currentUser.id}
        />
      )}

      {/* Sign-up prompt modal for unauthenticated users */}
      <SignUpPromptModal
        isOpen={signUpPrompt.isOpen}
        onClose={() => setSignUpPrompt({ ...signUpPrompt, isOpen: false })}
        action={signUpPrompt.action}
      />

      {/* Reviews Modal */}
      {reviewsModal && (
        <Dialog open={reviewsModal.isOpen} onOpenChange={(open) => !open && setReviewsModal(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reviews for {reviewsModal.userName}</DialogTitle>
            </DialogHeader>
            <ReviewsList
              userId={reviewsModal.userId}
              userType={reviewsModal.userType}
              title=""
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Job Application Modal - Mobile-friendly */}
      {selectedJobForApplication && currentUserProfile && (
        <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-2xl font-bold pr-8">
                Apply for {selectedJobForApplication.title}
              </DialogTitle>
            </DialogHeader>
            <JobApplicationForm
              job={selectedJobForApplication as any}
              userProfile={currentUserProfile as any}
              hasApplied={false}
              onApplicationSubmitted={() => {
                setShowApplicationModal(false)
                setSelectedJobForApplication(null)
                // Refresh the page to update application status
                router.refresh()
              }}
              onClose={() => {
                setShowApplicationModal(false)
                setSelectedJobForApplication(null)
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Professional Profile Modal */}
      {viewProfileModalId && viewProfileData && (
        <Dialog open={!!viewProfileModalId} onOpenChange={(open) => !open && setViewProfileModalId(null)}>
          <DialogContent aria-describedby={undefined} overlayClassName="z-[10001]" className="z-[10001] max-w-lg w-[95vw] max-h-[90vh] overflow-hidden p-0 bg-slate-900 border-slate-700">
            <DialogTitle className="sr-only">
              {viewProfileData.first_name} {viewProfileData.last_name} — Profile
            </DialogTitle>
            <div className="overflow-y-auto max-h-[90vh]">
              <ProfessionalDetailView
                professional={viewProfileData}
                user={currentUser}
                userType={currentUser ? currentUserType as "professional" | "company" | "contractor" | "homeowner" | null : null}
                isModal={true}
                onSignUpPrompt={() => {
                  setViewProfileModalId(null)
                  setSignUpPrompt({ isOpen: true, action: "message" })
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Company Profile Modal */}
      {viewCompanyModalId && viewCompanyData && (
        <Dialog open={!!viewCompanyModalId} onOpenChange={(open) => !open && setViewCompanyModalId(null)}>
          <DialogContent aria-describedby={undefined} overlayClassName="z-[10001]" className="z-[10001] max-w-lg w-[95vw] max-h-[90vh] overflow-hidden p-0 bg-slate-900 border-slate-700">
            <DialogTitle className="sr-only">
              {viewCompanyData.company_name} — Company Profile
            </DialogTitle>
            <div className="overflow-y-auto max-h-[90vh]">
              <CompanyDetailView
                company={viewCompanyData}
                user={currentUser}
                isModal={true}
                onSignUpPrompt={() => {
                  setViewCompanyModalId(null)
                  setSignUpPrompt({ isOpen: true, action: "message" })
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Subject Dialog — shown when starting a new (non-job) conversation from the map */}
      {subjectDialog && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setSubjectDialog(null) }}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white z-[10002]">
            <DialogHeader>
              <DialogTitle className="text-white">New Message to {subjectDialog.recipientName}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Add a subject so the tradesperson knows what this is about.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Subject (e.g. Bathroom renovation quote)"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") startConversation() }}
                className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSubjectDialog(null)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={startConversation}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start conversation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Full-Screen Map Mode (Google Maps Style) OR Modal Mode */}
      {(isFullScreenMode || isModal) && (
        <div className={`fixed inset-0 z-[9999] flex flex-col overflow-hidden h-screen max-h-screen ${isModal ? 'bg-slate-900' : 'bg-white'}`}>
          {/* Site Header - show in both full-screen and modal mode */}
          <Header user={currentUser} isModal={isModal} onModalClose={onModalClose} dark={true} />

          {/* ── Map fills full remaining height, search floats over it ── */}
          <div className="flex-1 relative overflow-hidden flex flex-col">

          {/* Floating Search Overlay (Airbnb-style popup card) */}
          {(isFullScreenMode || isModal) && <div className="absolute top-4 inset-x-3 z-[1001] overflow-visible pointer-events-none">
            <div className={`overflow-visible pointer-events-auto max-w-xl mx-auto ${isModal && !searchApplied ? 'bg-slate-950/98 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-[0_16px_48px_rgba(0,0,0,0.9)] p-4' : ''}`}>
            <div className="overflow-visible">
              {/* ── Compact bar (Airbnb-style) shown after first search in modal ── */}
              {isModal && searchApplied ? (
                <div className="flex items-center gap-2">
                  {/* Back arrow — exits modal */}
                  <button
                    onClick={() => {
                      setIsFullScreenMode(false)
                      if (isModal && onModalClose) onModalClose()
                      else router.push('/professionals')
                    }}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white flex-shrink-0 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  {/* Search summary pill — click to expand search + filters */}
                  <button
                    onClick={() => { setSearchApplied(false); setShowAdvancedFilters(true) }}
                    className="flex-1 flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full px-4 py-2 min-w-0 transition-colors shadow-sm"
                  >
                    <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="flex-1 min-w-0 text-white text-sm font-semibold truncate">
                        {searchTerm || currentSearchParams.get('industry') || (isShowingJobs ? "All jobs" : "All trades")}
                      </span>
                      <span className="text-slate-600 flex-shrink-0">·</span>
                      <span className="flex-1 min-w-0 text-slate-400 text-sm truncate text-right">
                        {locationFilter || "Any location"}
                      </span>
                    </div>
                  </button>
                </div>
              ) : (
                /* ── Full search bar — initial state or when re-editing ── */
                <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${isModal ? 'sm:gap-2' : 'sm:gap-3'}`}>
                  {/* Inputs — stack on mobile, side-by-side on sm+ */}
                  <div className={`flex flex-col gap-2 sm:flex-row sm:flex-1 ${isModal ? 'sm:gap-2' : 'sm:gap-3'}`}>
                    {/* Search Input with autocomplete + industry quick-pick */}
                    <div className="relative flex-1">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isModal ? 'h-4 w-4 text-slate-400' : 'h-4 w-4 text-gray-400'} z-10`} />
                      <Input
                        ref={searchInputRef}
                        value={searchTerm}
                        onChange={(e) => handleModalTradeSearchChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        onFocus={() => searchTerm.length >= 2 && tradeSuggestions.length > 0 && setShowTradeSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowTradeSuggestions(false), 200)
                          setTimeout(() => setShowIndustryDropdown(false), 200)
                        }}
                        placeholder={isShowingJobs ? "Job title, e.g. Electrician" : "Trade or skill, e.g. Plumber"}
                        className={`${isModal ? 'h-12 text-base pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/30' : 'h-12 text-base pl-10 bg-white/95 shadow-sm border'} font-medium`}
                      />
                      {/* Industry dropdown arrow — modal traders only */}
                      {isModal && isShowingTraders && (
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setShowIndustryDropdown(v => !v); setShowTradeSuggestions(false) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors z-10"
                          title="Browse industries"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showIndustryDropdown ? 'rotate-180 text-emerald-400' : ''}`} />
                        </button>
                      )}
                      {/* Industry pick dropdown */}
                      {isModal && isShowingTraders && showIndustryDropdown && (
                        <div className="absolute z-[100001] w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
                          <div className="px-3 py-2 border-b border-slate-700">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Popular Industries</p>
                          </div>
                          {[
                            { label: "🛠️ Plumbing", value: "Plumbing" },
                            { label: "⚡ Electrical", value: "Electrical" },
                            { label: "🧱 Construction", value: "Construction" },
                            { label: "🎨 Painting & Decorating", value: "Painting & Decorating" },
                            { label: "🏠 Roofing", value: "Roofing" },
                            { label: "🌿 Gardening", value: "Gardening" },
                            { label: "🧹 Cleaning", value: "Cleaning" },
                            { label: "🪵 Flooring", value: "Flooring" },
                            { label: "🚗 Automotive", value: "Automotive" },
                            { label: "💻 IT / Tech", value: "Technology" },
                          ].map(({ label, value }) => (
                            <button
                              key={value}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setSearchTerm(value)
                                setShowIndustryDropdown(false)
                                handleSearch()
                              }}
                              className={`w-full px-4 py-2.5 text-left border-b border-slate-700 last:border-b-0 transition-colors ${
                                searchTerm === value
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'text-slate-200 hover:bg-slate-700'
                              }`}
                            >
                              <span className="text-sm font-medium">{label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Autocomplete dropdown */}
                      {showTradeSuggestions && tradeSuggestions.length > 0 && (
                        <div className="absolute z-[100001] w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg max-h-52 overflow-auto shadow-xl">
                          {tradeSuggestions.map((suggestion: string, idx: number) => (
                            <button
                              key={`${suggestion}-${idx}`}
                              type="button"
                              className="w-full px-3 py-2.5 text-left hover:bg-emerald-500/20 focus:bg-emerald-500/20 focus:outline-none border-b border-slate-700 last:border-b-0 transition-colors"
                              onClick={() => handleModalTradeSuggestionSelect(suggestion)}
                            >
                              <div className="flex items-center gap-2">
                                <HardHat className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                <span className="text-sm text-slate-200 font-medium">{suggestion}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Location Input with Map Picker icon embedded on right */}
                    <div className="flex-1 relative overflow-visible">
                      <LocationInput
                        value={locationFilter}
                        onChange={setLocationFilter}
                        onLocationSelect={handleLocationSelect}
                        placeholder="Postcode or town"
                        error=""
                        className={`${isModal ? 'h-12 text-base bg-slate-700 border-slate-600 text-white' : ''} pr-8`}
                      />
                      <button
                        onClick={handleMapPickerClick}
                        type="button"
                        title="Pick location on map"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors z-10"
                      >
                        <Map className="h-4 w-4" />
                      </button>
                    </div>
                  </div>


                  {/* Action Buttons: non-modal only */}
                  {!isModal && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Search button */}
                      <button
                        onClick={handleSearch}
                        className="flex-shrink-0 h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Search</span>
                      </button>
                      {/* Back button */}
                      <button
                        onClick={() => {
                          setIsFullScreenMode(false)
                          if (isModal && onModalClose) onModalClose()
                          else router.push('/professionals')
                        }}
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                        title="Back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      {/* Round filter toggle */}
                      <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          showAdvancedFilters
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                        }`}
                        title="Filters"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}


              {/* Filters — toggle-controlled by showAdvancedFilters */}
              {showAdvancedFilters && (
                <div className={`mt-3 p-4 rounded-2xl shadow-xl border ${isModal ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}>
                  {/* Filter header with X button */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-sm tracking-wide">Filters</h3>
                    <button
                      onClick={() => { setShowAdvancedFilters(false); if (isModal) setSearchApplied(true) }}
                      className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                      title="Close filters"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {/* Modal Mode: Simplified filters for Traders/Trade Jobs */}
                    {isModal ? (
                      <>
                        {/* ── FOR HOMEOWNERS: Traders/professionals search ── */}
                        {isShowingTraders && (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {/* 1. Distance — auto-applies search on change */}
                              <div className="p-3 rounded-lg border bg-slate-800 border-slate-600">
                                <label className="block text-xs font-semibold mb-2 text-slate-300 uppercase tracking-wide">Distance</label>
                                <Select value={filterRadius} onValueChange={(value) => { setFilterRadius(value); handleSearch(value) }}>
                                  <SelectTrigger className="w-full h-9 text-sm bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600">
                                    {[2, 5, 10, 15, 20, 25, 30, 50].map((miles) => (
                                      <SelectItem key={miles} value={miles.toString()} className="text-white hover:bg-slate-700">
                                        Within {miles} miles
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* 2. Availability */}
                              <div className="p-3 rounded-lg border bg-slate-800 border-slate-600">
                                <label className="block text-xs font-semibold mb-2 text-slate-300 uppercase tracking-wide">Availability</label>
                                <Select value={filterAvailability} onValueChange={(v) => { setFilterAvailability(v); handleSearch(undefined, { availability: v }) }}>
                                  <SelectTrigger className="w-full h-9 text-sm bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600">
                                    <SelectItem value="all" className="text-white hover:bg-slate-700">All</SelectItem>
                                    <SelectItem value="available" className="text-white hover:bg-slate-700">Available now</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* 3. Preferred Language */}
                              <div className="p-3 rounded-lg border bg-slate-800 border-slate-600">
                                <label className="block text-xs font-semibold mb-2 text-slate-300 uppercase tracking-wide">Preferred Language</label>
                                <Select value={languageFilter || "all"} onValueChange={(v) => { const lang = v === "all" ? "" : v; setLanguageFilter(lang); if (v !== "other") { setCustomLanguage(""); handleSearch(undefined, { language: lang }) } }}>
                                  <SelectTrigger className="w-full h-9 text-sm bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder="Any language" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600 max-h-[220px]">
                                    <SelectItem value="all" className="text-white hover:bg-slate-700">Any language</SelectItem>
                                    {["English","Spanish","French","German","Italian","Portuguese","Polish","Romanian","Ukrainian","Russian","Arabic","Hindi","Urdu","Bengali","Mandarin"].map((lang) => (
                                      <SelectItem key={lang} value={lang} className="text-white hover:bg-slate-700">{lang}</SelectItem>
                                    ))}
                                    <SelectItem value="other" className="text-emerald-400 hover:bg-slate-700">Other (type below)…</SelectItem>
                                  </SelectContent>
                                </Select>
                                {languageFilter === "other" && (
                                  <Input
                                    placeholder="Type language name…"
                                    value={customLanguage}
                                    onChange={(e) => setCustomLanguage(e.target.value)}
                                    className="mt-2 h-8 text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                    autoFocus
                                  />
                                )}
                              </div>
                            </div>
                            {/* 6. 24/7 Service checkbox */}
                            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-600 mt-3">
                              <Checkbox
                                id="247-modal"
                                checked={filter247}
                                onCheckedChange={(checked) => { setFilter247(!!checked); handleSearch(undefined, { is247: !!checked }) }}
                                className="border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 bg-slate-700 border-slate-500 flex-shrink-0"
                              />
                              <div>
                                <label htmlFor="247-modal" className="text-sm font-medium text-white cursor-pointer">24/7 Service</label>
                                <p className="text-xs text-slate-400">Only show tradespeople available around the clock</p>
                              </div>
                            </div>
                          </>
                        )}

                        {/* ── FOR TRADESPEOPLE: Jobs search ── */}
                        {isShowingJobs && (
                          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                            {/* 1. Distance */}
                            <div className="p-3 rounded-lg border bg-slate-800 border-slate-600">
                              <label className="block text-xs font-semibold mb-2 text-slate-300 uppercase tracking-wide">Distance</label>
                              <Select value={filterRadius} onValueChange={setFilterRadius}>
                                <SelectTrigger className="w-full h-9 text-sm bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                  {[2, 5, 10, 15, 20, 25, 30, 50].map((miles) => (
                                    <SelectItem key={miles} value={miles.toString()} className="text-white hover:bg-slate-700">
                                      Within {miles} miles
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {/* 2. Job Urgency */}
                            <div className="p-3 rounded-lg border bg-slate-800 border-slate-600">
                              <label className="block text-xs font-semibold mb-2 text-slate-300 uppercase tracking-wide">Job Urgency</label>
                              <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                                <SelectTrigger className="w-full h-9 text-sm bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                  <SelectItem value="all" className="text-white hover:bg-slate-700">All</SelectItem>
                                  <SelectItem value="urgent" className="text-white hover:bg-slate-700">ASAP</SelectItem>
                                  <SelectItem value="today" className="text-white hover:bg-slate-700">Today</SelectItem>
                                  <SelectItem value="flexible" className="text-white hover:bg-slate-700">Flexible</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* 3. Job Budget */}
                            <div className="p-3 rounded-lg border bg-slate-800 border-slate-600">
                              <label className="block text-xs font-semibold mb-2 text-slate-300 uppercase tracking-wide">Job Budget</label>
                              <Select value={filterBudget} onValueChange={setFilterBudget}>
                                <SelectTrigger className="w-full h-9 text-sm bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                  <SelectItem value="all" className="text-white hover:bg-slate-700">Any budget</SelectItem>
                                  <SelectItem value="under_500" className="text-white hover:bg-slate-700">Under £500</SelectItem>
                                  <SelectItem value="500_1k" className="text-white hover:bg-slate-700">£500 – £1k</SelectItem>
                                  <SelectItem value="1k_5k" className="text-white hover:bg-slate-700">£1k – £5k</SelectItem>
                                  <SelectItem value="5k_plus" className="text-white hover:bg-slate-700">£5k+</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {/* 4. Preferred Language */}
                            <div className="p-3 rounded-lg border bg-slate-800 border-slate-600">
                              <label className="block text-xs font-semibold mb-2 text-slate-300 uppercase tracking-wide">Preferred Language</label>
                              <Select value={languageFilter || "all"} onValueChange={(v) => { setLanguageFilter(v === "all" ? "" : v); if (v !== "other") setCustomLanguage("") }}>
                                <SelectTrigger className="w-full h-9 text-sm bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Any language" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 max-h-[220px]">
                                  <SelectItem value="all" className="text-white hover:bg-slate-700">Any language</SelectItem>
                                  {["English","Spanish","French","German","Italian","Portuguese","Polish","Romanian","Ukrainian","Russian","Arabic","Hindi","Urdu","Bengali","Mandarin"].map((lang) => (
                                    <SelectItem key={lang} value={lang} className="text-white hover:bg-slate-700">{lang}</SelectItem>
                                  ))}
                                  <SelectItem value="other" className="text-emerald-400 hover:bg-slate-700">Other (type below)…</SelectItem>
                                </SelectContent>
                              </Select>
                              {languageFilter === "other" && (
                                <Input
                                  placeholder="Type language name…"
                                  value={customLanguage}
                                  onChange={(e) => setCustomLanguage(e.target.value)}
                                  className="mt-2 h-8 text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                  autoFocus
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Original filters for non-modal or non-trader/jobs searches */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Experience Level */}
                          <div className={`p-3 rounded-lg border ${isModal ? 'bg-slate-800 border-slate-600' : 'bg-blue-50 border-blue-200'}`}>
                            <label className={`block text-sm font-semibold mb-2 ${isModal ? 'text-white' : 'text-gray-900'}`}>Experience Level</label>
                            <Select
                              value={searchParams.level || "all"}
                              onValueChange={(value) => updateSearchParams("level", value)}
                            >
                              <SelectTrigger className={`w-full h-10 text-sm font-medium ${isModal ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={isModal ? 'bg-slate-800 border-slate-600' : ''}>
                                <SelectItem value="all" className={isModal ? 'text-white hover:bg-slate-700' : ''}>All Levels</SelectItem>
                                <SelectItem value="entry" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Entry Level</SelectItem>
                                <SelectItem value="mid" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Mid Level</SelectItem>
                                <SelectItem value="senior" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Senior</SelectItem>
                                <SelectItem value="lead" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Lead</SelectItem>
                                <SelectItem value="executive" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Executive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Job Type - Only for employees */}
                          {!isEmployer && (
                            <div className={`p-3 rounded-lg border ${isModal ? 'bg-slate-800 border-slate-600' : 'bg-purple-50 border-purple-200'}`}>
                              <label className={`block text-sm font-semibold mb-2 ${isModal ? 'text-white' : 'text-gray-900'}`}>Job Type</label>
                              <Select
                                value={searchParams.type || "all"}
                                onValueChange={(value) => updateSearchParams("type", value)}
                              >
                                <SelectTrigger className={`w-full h-10 text-sm font-medium ${isModal ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white'}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={isModal ? 'bg-slate-800 border-slate-600' : ''}>
                                  <SelectItem value="all" className={isModal ? 'text-white hover:bg-slate-700' : ''}>All Types</SelectItem>
                                  <SelectItem value="full-time" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Full-time</SelectItem>
                                  <SelectItem value="part-time" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Part-time</SelectItem>
                                  <SelectItem value="contract" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Contract</SelectItem>
                                  <SelectItem value="freelance" className={isModal ? 'text-white hover:bg-slate-700' : ''}>Freelance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Skills / Min Salary */}
                          <div className={`p-3 rounded-lg border ${isModal ? 'bg-slate-800 border-slate-600' : 'bg-emerald-50 border-emerald-200'}`}>
                            <label className={`block text-sm font-semibold mb-2 ${isModal ? 'text-white' : 'text-gray-900'}`}>
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
                              className={`h-10 text-sm font-medium ${isModal ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-white'}`}
                            />
                          </div>

                          {/* Language - Only for employers */}
                          {isEmployer && (
                            <div className={`p-3 rounded-lg border ${isModal ? 'bg-slate-800 border-slate-600' : 'bg-orange-50 border-orange-200'}`}>
                              <label className={`block text-sm font-semibold mb-2 ${isModal ? 'text-white' : 'text-gray-900'}`}>Language</label>
                              <Input
                                placeholder="English, Spanish"
                                value={languageFilter}
                                onChange={(e) => setLanguageFilter(e.target.value)}
                                className={`h-10 text-sm font-medium ${isModal ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-white'}`}
                              />
                            </div>
                          )}

                          {/* Search Radius */}
                          <div className={`p-3 rounded-lg border ${isModal ? 'bg-slate-800 border-slate-600' : 'bg-indigo-50 border-indigo-200'}`}>
                            <label className={`block text-sm font-semibold mb-2 ${isModal ? 'text-white' : 'text-gray-900'}`}>Search Radius</label>
                            <Select value={searchParams.radius || "20"} onValueChange={(value) => updateSearchParams("radius", value)}>
                              <SelectTrigger className={`w-full h-10 text-sm font-medium ${isModal ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={isModal ? 'bg-slate-800 border-slate-600' : ''}>
                                {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                                  <SelectItem key={miles} value={miles.toString()} className={isModal ? 'text-white hover:bg-slate-700' : ''}>
                                    {miles} mile{miles !== 1 ? "s" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Second Row - Checkbox Filters (Only for employers) */}
                        {isEmployer && (
                          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 border-t ${isModal ? 'border-slate-600' : 'border-gray-200'}`}>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="unemployed-fullscreen"
                                checked={unemployedFilter}
                                onCheckedChange={(checked) => setUnemployedFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="unemployed-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                Unemployed
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="employed-fullscreen"
                                checked={employedFilter}
                                onCheckedChange={(checked) => setEmployedFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="employed-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                Employed
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="relocate-fullscreen"
                                checked={relocateFilter}
                                onCheckedChange={(checked) => setRelocateFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="relocate-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                Ready to relocate
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="cv-fullscreen"
                                checked={cvFilter}
                                onCheckedChange={(checked) => setCvFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="cv-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                With CV
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="driving-license-fullscreen"
                                checked={drivingLicenseFilter}
                                onCheckedChange={(checked) => setDrivingLicenseFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="driving-license-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                Valid Driving License
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="own-transport-fullscreen"
                                checked={ownTransportFilter}
                                onCheckedChange={(checked) => setOwnTransportFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="own-transport-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                Own transport
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="self-employed-fullscreen"
                                checked={selfEmployedFilter}
                                onCheckedChange={(checked) => setSelfEmployedFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="self-employed-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                Self-employed
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="available-fullscreen"
                                checked={availableFilter}
                                onCheckedChange={(checked) => setAvailableFilter(!!checked)}
                                className={`border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${isModal ? 'bg-slate-700 border-slate-500' : 'bg-white border-gray-400'}`}
                              />
                              <label htmlFor="available-fullscreen" className={`text-sm cursor-pointer ${isModal ? 'text-slate-300' : 'text-gray-700'}`}>
                                Available (Companies)
                              </label>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Filter Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-600/50 mt-2">
                      {/* Hide Filters — non-modal: ghost; modal traders: outline button */}
                      {!isModal ? (
                        <Button
                          onClick={() => setShowAdvancedFilters(false)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 whitespace-nowrap"
                        >
                          Hide Filters
                        </Button>
                      ) : isShowingTraders && (
                        <Button
                          onClick={() => { setSearchApplied(true); setShowAdvancedFilters(false) }}
                          variant="ghost"
                          size="sm"
                          className="bg-slate-600 hover:bg-slate-500 text-white whitespace-nowrap"
                        >
                          Hide Filters
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          handleSearch()
                          setShowAdvancedFilters(false)
                        }}
                        size="sm"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>}

          {/* Mobile & Desktop Layouts */}
          <>
          {/* Mobile: Airbnb-style Bottom Sheet Layout */}
          <div className={`flex md:!hidden flex-col flex-1 overflow-hidden ${isModal ? 'bg-slate-900' : ''}`}>
            <MobileMapBottomSheet
              state={bottomSheetState}
              onStateChange={setBottomSheetState}
              resultsCount={data.length}
              resultsLabel={isShowingJobs ? "Jobs" : isEmployer ? "Professionals" : isShowingTraders ? "Traders" : "Results"}
              mapContent={
                !isDesktopLayout && shouldShowMap && (
                  isShowingJobs ? (
                    <JobMap
                      jobs={dataWithCoordinates as any}
                      center={jobMapCenter}
                      zoom={10}
                      height="100%"
                      showRadius={!!selectedLocationCoords}
                      radiusCenter={selectedLocationCoords ? [selectedLocationCoords.lat, selectedLocationCoords.lon] : undefined}
                      radiusKm={parseInt(searchParams.radius || "20") * 1.60934}
                      selectedJobId={selectedProfessionalId}
                      onJobSelect={(job) => {
                        handleMobilePinSelect(job?.id || null)
                      }}
                    />
                  ) : (
                    <ProfessionalMap
                      professionals={dataWithCoordinates.map((item: any) => ({
                        id: item.id,
                        // Show name for professionals (respecting privacy), company name for companies
                        name: ('first_name' in item)
                          ? (!item.hide_personal_name && (item.first_name || item.last_name)
                              ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                              : (item.nickname || 'Anonymous'))
                          : item.company_name || 'Unknown',
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
                        handleMobilePinSelect(profile?.id || null)
                      }}
                      onSendInquiry={(id, name) => handleSendInquiry(id, name)}
                    />
                  )
                )
              }
              previewCardContent={
                mobilePreviewData && (
                  <MobilePreviewCard
                    data={mobilePreviewData}
                    onClose={handlePreviewClose}
                    onViewDetails={handlePreviewViewDetails}
                    onAction={handlePreviewAction}
                    actionLabel={
                      isShowingJobs
                        ? (mobilePreviewData?.type === "job" && (mobilePreviewData as any).isTradesJob ? "Respond Now" : "Apply Now")
                        : "Message"
                    }
                    showAction={true}
                    isAuthenticated={!!currentUser}
                    onAuthRequired={() => setSignUpPrompt({ isOpen: true, action: "message" })}
                  />
                )
              }
              listContent={
                <div className="p-3 bg-slate-900 min-h-full">
                  <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wide mb-3">
                    {isEmployer ? "Professionals" : isShowingCompanies ? "Companies" : isShowingTraders ? "Traders" : isShowingJobs ? "Jobs" : "Results"}
                  </h3>

                  <div className="space-y-2">
                  {data.length === 0 && (
                    <div className="py-6 px-2">
                      {isShowingJobs ? (
                        <>
                          <p className="text-sm font-medium text-slate-200 mb-1">
                            No jobs matching your skills in this area right now.
                          </p>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Try:</p>
                          <ul className="space-y-1.5 text-sm text-slate-400 mb-5">
                            <li className="flex items-start gap-2"><span className="text-blue-400 font-bold mt-0.5">•</span><span>Expanding your search radius</span></li>
                            <li className="flex items-start gap-2"><span className="text-blue-400 font-bold mt-0.5">•</span><span>Adding more skills to your profile</span></li>
                            <li className="flex items-start gap-2"><span className="text-blue-400 font-bold mt-0.5">•</span><span>Viewing all construction jobs nearby</span></li>
                          </ul>
                          {isModal && onViewAllJobs ? (
                            <button
                              type="button"
                              onClick={onViewAllJobs}
                              className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                              View all jobs nearby
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          ) : (
                            <a
                              href="/jobs"
                              className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                              View all jobs nearby
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-400 text-center">
                          {`No tradespeople found${locationFilter ? ` in ${locationFilter}` : ''}. Try expanding your search radius.`}
                        </p>
                      )}
                    </div>
                  )}

                  {data.map((item: any) => {
                    const isExpanded = selectedProfessionalId === item.id

                    return (
                      <div
                        key={item.id}
                        ref={(el: HTMLDivElement | null) => { professionalCardRefs.current[item.id] = el }}
                        className={`bg-slate-800 rounded-xl border p-3 cursor-pointer transition-all ${
                          isExpanded ? 'border-emerald-500 shadow-md shadow-emerald-900/20' : 'border-slate-700 hover:border-slate-500'
                        }`}
                        onClick={() => {
                          // Toggle selection/expansion
                          setSelectedProfessionalId(isExpanded ? null : item.id)
                          if (isShowingJobs) {
                            setExpandedJobId(isExpanded ? null : item.id)
                          }
                        }}
                      >
                        {isShowingJobs ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-white line-clamp-2">{item.title}</h4>
                                <p className="text-xs text-slate-400">
                                  {item.company_profiles?.company_name || `${item.poster_first_name} ${item.poster_last_name}`}
                                </p>

                                {/* Description - show truncated or full based on expanded state */}
                                {item.description && (
                                  <p className={`text-xs text-slate-300 mt-2 whitespace-pre-line ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {item.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{formatShortAddress(item.location)}</span>
                                </div>
                                {(item.salary_min || item.salary_max || item.budget_min || item.budget_max) && (
                                  <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium mt-1">
                                    <PoundSterling className="h-3 w-3" />
                                    <span>
                                      {item.salary_min && item.salary_max
                                        ? `£${item.salary_min.toLocaleString()} - £${item.salary_max.toLocaleString()}`
                                        : item.salary_min
                                        ? `From £${item.salary_min.toLocaleString()}`
                                        : item.salary_max
                                        ? `Up to £${item.salary_max.toLocaleString()}`
                                        : item.budget_min && item.budget_max
                                        ? `£${item.budget_min.toLocaleString()} - £${item.budget_max.toLocaleString()}`
                                        : item.budget_min
                                        ? `From £${item.budget_min.toLocaleString()}`
                                        : item.budget_max
                                        ? `Up to £${item.budget_max.toLocaleString()}`
                                        : ''}
                                    </span>
                                  </div>
                                )}

                                {/* Show "Tap to expand/collapse" hint */}
                                {item.description && item.description.length > 100 && (
                                  <p className="text-xs text-emerald-500 mt-1">
                                    {isExpanded ? 'Tap to collapse' : 'Tap to see more'}
                                  </p>
                                )}

                                {/* Urgency indicator for ASAP trade jobs */}
                                {item.is_tradespeople_job && item.urgency_type === "asap" && item.expires_at && (() => {
                                  const diff = new Date(item.expires_at).getTime() - Date.now()
                                  if (diff <= 0) return null
                                  const h = Math.floor(diff / 3600000)
                                  const m = Math.floor((diff % 3600000) / 60000)
                                  return (
                                    <div key="urgency" className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 w-fit">
                                      <Zap className="h-3 w-3 text-red-400" />
                                      <span className="text-xs font-semibold text-red-400">
                                        URGENT · {h > 0 ? `${h}h ${m}m` : `${m}m`} left
                                      </span>
                                    </div>
                                  )
                                })()}

                                {/* Action Buttons - ALWAYS VISIBLE on mobile */}
                                <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    className="h-10 px-4 flex-1 text-sm touch-manipulation bg-blue-600 hover:bg-blue-700 text-white border-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Build URL with return context to enable "Back to Search"
                                      const params = new URLSearchParams()
                                      if (searchParams.search) params.set('returnQuery', searchParams.search)
                                      if (searchParams.location) params.set('returnLocation', searchParams.location)
                                      if (searchParams.lat) params.set('returnLat', searchParams.lat)
                                      if (searchParams.lng) params.set('returnLon', searchParams.lng)
                                      if (searchParams.radius) params.set('returnRadius', searchParams.radius)
                                      params.set('returnToSearch', 'true')
                                      const queryString = params.toString()
                                      router.push(`/jobs/${item.id}${queryString ? `?${queryString}` : ''}`)
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    className={`h-10 px-4 flex-1 text-sm font-medium touch-manipulation ${item.is_tradespeople_job ? "bg-orange-500 hover:bg-orange-600" : "bg-emerald-500 hover:bg-emerald-600"} text-white`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (item.is_tradespeople_job) {
                                        router.push(`/jobs/${item.id}`)
                                      } else if (currentUser) {
                                        handleApplyToJob(item.id)
                                      } else {
                                        setSignUpPrompt({ isOpen: true, action: "message" })
                                      }
                                    }}
                                  >
                                    {item.is_tradespeople_job ? (
                                      <><Zap className="h-4 w-4 mr-1.5" />Respond</>
                                    ) : "Apply Now"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <Avatar className={isExpanded ? "h-16 w-16" : "h-10 w-10"}>
                                <AvatarImage src={item.profile_photo_url || item.logo_url} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-xs">
                                  {('first_name' in item)
                                    ? `${item.first_name?.[0] || ''}${item.last_name?.[0] || ''}`
                                    : item.company_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-semibold text-white ${isExpanded ? 'text-base' : 'text-sm'}`}>
                                  {('first_name' in item)
                                    ? (!item.hide_personal_name && (item.first_name || item.last_name)
                                        ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                                        : (item.nickname || 'Anonymous'))
                                    : item.company_name || item.title}
                                </h4>
                                <p className={`text-xs text-slate-400 ${isExpanded ? '' : 'truncate'}`}>{item.title || item.industry}</p>

                                {/* Star Rating */}
                                {'first_name' in item && (
                                  <div
                                    className="mt-1 cursor-pointer hover:opacity-70 transition-opacity w-fit"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (item.reviews_count && item.reviews_count > 0) {
                                        setReviewsModal({
                                          isOpen: true,
                                          userId: item.id,
                                          userType: 'professional',
                                          userName: `${item.first_name} ${item.last_name}`
                                        })
                                      }
                                    }}
                                    title={item.reviews_count && item.reviews_count > 0 ? "Click to view reviews" : "No reviews yet"}
                                  >
                                    <CompactStarRating
                                      rating={item.average_rating || 0}
                                      reviewCount={item.reviews_count || 0}
                                      size="sm"
                                      showCount={true}
                                    />
                                  </div>
                                )}
                                {'company_name' in item && (
                                  <Link
                                    href={`/companies/${item.id}`}
                                    className="mt-1 hover:opacity-70 transition-opacity w-fit flex items-center"
                                    onClick={(e) => e.stopPropagation()}
                                    title="View company profile and reviews"
                                  >
                                    <CompactStarRating
                                      rating={item.average_rating || 0}
                                      reviewCount={item.reviews_count || 0}
                                      size="sm"
                                      showCount={true}
                                    />
                                  </Link>
                                )}

                                {/* Expected Salary - Show for professionals in short view */}
                                {'first_name' in item && !isExpanded && (item.salary_min || item.salary_max) && (
                                  <p className="text-xs font-semibold text-emerald-400 mt-1">
                                    {item.salary_min && item.salary_max
                                      ? `£${item.salary_min.toLocaleString()} - £${item.salary_max.toLocaleString()}`
                                      : item.salary_min
                                      ? `From £${item.salary_min.toLocaleString()}`
                                      : `Up to £${item.salary_max?.toLocaleString()}`}
                                    {item.salary_frequency ? ` (${item.salary_frequency})` : ' (per year)'}
                                  </p>
                                )}
                              </div>
                              {/* Available / Busy badge — right side of card */}
                              {(() => {
                                let isAvail: boolean | null = null
                                if ('company_name' in item) {
                                  // Trader/company: use open_for_business
                                  isAvail = item.open_for_business === true ? true
                                          : item.open_for_business === false ? false
                                          : null
                                } else {
                                  // Professional
                                  const hasTradeNotif = 'trade_job_notifications' in item
                                  const hasAvailNow = 'available_now' in item
                                  isAvail = hasTradeNotif
                                    ? (item as any).trade_job_notifications === true
                                    : hasAvailNow
                                    ? (item as any).available_now === true
                                    : null
                                }
                                if (isAvail === true) return (
                                  <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full whitespace-nowrap self-start mt-0.5">
                                    ● Available
                                  </span>
                                )
                                if (isAvail === false) return (
                                  <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold bg-slate-600/60 text-slate-400 border border-slate-600 px-1.5 py-0.5 rounded-full whitespace-nowrap self-start mt-0.5">
                                    ● Busy
                                  </span>
                                )
                                return null
                              })()}
                            </div>

                            {/* Show expanded details */}
                            {isExpanded && (() => {
                              const isItemProfessional = 'first_name' in item
                              const isItemCompany = 'company_name' in item
                              // Anyone can contact companies that are open for business
                              // Only employers and tradespeople can contact professionals
                              const canContact = (isItemCompany && item.open_for_business) || currentUserType === "company" || currentUserType === "contractor"

                              return (
                                <div className="space-y-3 pt-2 border-t border-slate-700">
                                  {/* Description/Bio */}
                                  {(item.description || item.bio) && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1">
                                        {isItemCompany ? 'Company Description' : 'About'}
                                      </h5>
                                      <p className="text-xs text-slate-300">{item.description || item.bio}</p>
                                    </div>
                                  )}

                                  {/* Industry - For companies */}
                                  {isItemCompany && item.industry && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1">Industry</h5>
                                      <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-200 border-slate-600">{item.industry}</Badge>
                                    </div>
                                  )}

                                  {/* Services - For companies */}
                                  {isItemCompany && item.services && item.services.length > 0 && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1.5">Services Offered</h5>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.services.map((service: string, idx: number) => (
                                          <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-200 border-slate-600">
                                            {service}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Skills - For professionals */}
                                  {isItemProfessional && item.skills && item.skills.length > 0 && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1.5">Skills</h5>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.skills.map((skill: string, idx: number) => (
                                          <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-200 border-slate-600">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Phone Number - For companies */}
                                  {isItemCompany && (item.phone || item.phone_number) && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1">Phone</h5>
                                      <a
                                        href={`tel:${item.phone || item.phone_number}`}
                                        className="text-xs text-emerald-400 hover:underline font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {item.phone || item.phone_number}
                                      </a>
                                    </div>
                                  )}

                                  {/* Website - For companies */}
                                  {isItemCompany && item.website_url && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1">Website</h5>
                                      <a
                                        href={item.website_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-emerald-400 hover:underline break-all"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {item.website_url}
                                      </a>
                                    </div>
                                  )}

                                  {/* Languages */}
                                  {item.spoken_languages && item.spoken_languages.length > 0 && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1.5">Languages</h5>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.spoken_languages.map((language: string, idx: number) => (
                                          <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1 border-slate-600 text-slate-300">
                                            <span className="text-sm">{getLanguageFlag(language)}</span>
                                            {language}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Price List - For companies */}
                                  {isItemCompany && item.price_list && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1 flex items-center gap-1">
                                        <PoundSterling className="h-3 w-3 text-emerald-400" />
                                        Price List
                                      </h5>
                                      <div className="bg-emerald-900/20 border border-emerald-700/30 rounded p-2">
                                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{item.price_list}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Location/Address */}
                                  {item.location && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1">Location</h5>
                                      <p className="text-xs text-slate-300">{formatShortAddress(item.location)}</p>
                                    </div>
                                  )}

                                  {(item.salary_min || item.salary_max) && (
                                    <div>
                                      <h5 className="font-semibold text-xs text-slate-400 mb-1">Expected Salary</h5>
                                      <p className="text-xs text-emerald-400 font-medium">
                                        {item.salary_min && item.salary_max
                                          ? `£${item.salary_min.toLocaleString()} - £${item.salary_max.toLocaleString()}`
                                          : item.salary_min
                                          ? `From £${item.salary_min.toLocaleString()}`
                                          : `Up to £${item.salary_max?.toLocaleString()}`}
                                      </p>
                                    </div>
                                  )}

                                  {/* Action Buttons - Always visible */}
                                  <div className="flex gap-2">
                                    <Button
                                      className="flex-1 text-xs py-2 h-10 bg-blue-600 hover:bg-blue-700 text-white"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openConversation(item.user_id, item.company_name || `${item.first_name || ''} ${item.last_name || ''}`.trim())
                                      }}
                                    >
                                      <MessageCircle className="h-3 w-3 mr-2" />
                                      Message
                                    </Button>
                                    <Button
                                      className="flex-1 text-xs py-2 h-10 bg-emerald-500 hover:bg-emerald-600 text-white"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (isItemCompany) {
                                          router.push(`/companies/${item.id}`)
                                        } else {
                                          handleViewProfile(item.id)
                                        }
                                      }}
                                    >
                                      <UserIcon className="h-3 w-3 mr-2" />
                                      View Profile
                                    </Button>
                                  </div>

                                  <p className="text-xs text-emerald-500 text-center">
                                    Tap to collapse
                                  </p>
                                </div>
                              )
                            })()}

                            {!isExpanded && (
                              <p className="text-xs text-emerald-500 text-center mt-1">
                                Tap to see more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  </div>
                </div>
              }
            />
          </div>

          {/* Desktop: Resizable Panels - Map on left, List on right */}
          <PanelGroup direction="horizontal" className="!hidden md:!flex flex-1 overflow-hidden">
            {/* Map Panel */}
            <Panel defaultSize={60} minSize={30} className="relative" style={{ minHeight: '400px' }}>
              <div className="absolute inset-0">
              {isDesktopLayout && shouldShowMap && (
                isShowingJobs ? (
                  <JobMap
                    jobs={dataWithCoordinates as any}
                    center={jobMapCenter}
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
                      // Show name for professionals (respecting privacy), company name for companies
                      name: ('first_name' in item)
                        ? (!item.hide_personal_name && (item.first_name || item.last_name)
                            ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                            : (item.nickname || 'Anonymous'))
                        : item.company_name || 'Unknown',
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
                <div className={`rounded-lg shadow-lg p-3 border ${isModal ? 'bg-slate-800 border-slate-600' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <UserIcon className={`h-5 w-5 ${isModal ? 'text-emerald-400' : 'text-blue-600'}`} />
                    <span className={`font-semibold text-lg ${isModal ? 'text-white' : ''}`}>
                      {data.length} {isEmployer ? "Professional" : isShowingCompanies ? "Company" : isShowingTraders ? "Trader" : "Professional"}{data.length !== 1 ? "s" : ""} Found
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Radius (Top-Right) */}
              <div className="absolute top-4 right-[420px] z-10">
                <div className={`rounded-lg shadow-lg p-3 border ${isModal ? 'bg-slate-800 border-slate-600' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-emerald-600" />
                    <label className={`text-sm font-medium ${isModal ? 'text-white' : ''}`}>Radius:</label>
                    <Select
                      value={searchParams.radius || "20"}
                      onValueChange={(value) => updateSearchParams("radius", value)}
                    >
                      <SelectTrigger className={`w-28 h-9 ${isModal ? 'bg-slate-700 border-slate-600 text-white' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isModal ? 'bg-slate-800 border-slate-600' : ''}>
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
            <PanelResizeHandle className={`w-2 transition-colors cursor-col-resize ${isModal ? 'bg-slate-700 hover:bg-emerald-500' : 'bg-gray-200 hover:bg-blue-400'}`} />

            {/* Right Sidebar - Scrollable Professional List Panel */}
            <Panel defaultSize={40} minSize={25}>
              <div className={`h-full border-l shadow-xl flex flex-col ${isModal ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
              {/* Sidebar Header */}
              <div className={`p-4 border-b ${isModal ? 'bg-slate-700 border-slate-600' : 'bg-gray-50'}`}>
                <h3 className={`font-semibold text-lg ${isModal ? 'text-white' : ''}`}>
                  Results
                </h3>
                <p className={`text-sm ${isModal ? 'text-slate-400' : 'text-gray-600'}`}>
                  {data.length} {isEmployer ? "professional" : "tradesperson"}{data.length !== 1 ? "s" : ""} found — click to expand
                </p>
              </div>

              {/* Scrollable Content */}
              <div className={`flex-1 overflow-y-auto ${isModal ? 'bg-slate-800' : ''}`}>
                  <div className={`divide-y ${isModal ? 'divide-slate-700' : ''}`}>
                    {data.slice(0, 50).map((item: any) => {
                      const isSelected = selectedProfessionalId === item.id

                      // If showing jobs, render JobCard instead
                      if (isShowingJobs) {
                        return (
                          <JobCard
                            key={item.id}
                            ref={(el) => { professionalCardRefs.current[item.id] = el }}
                            job={item}
                            isLoggedIn={!!currentUser}
                            isSelected={isSelected}
                            userProfile={currentUserProfile}
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
                            isSelected
                              ? (isModal ? "bg-emerald-900/30 border-l-4 border-emerald-500" : "bg-blue-50 border-l-4 border-blue-500")
                              : (isModal ? "hover:bg-slate-700" : "hover:bg-gray-50")
                          }`}
                          onClick={() => {
                            // Toggle selection
                            setSelectedProfessionalId(isSelected ? null : item.id)
                          }}
                        >
                          <div className="flex gap-3">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={item.profile_photo_url || item.logo_url} alt={isProfessional ? item.first_name : item.company_name} />
                              <AvatarFallback className={isModal ? "bg-slate-600 text-emerald-400" : "bg-blue-100 text-blue-600"}>
                                {isProfessional ? item.first_name?.charAt(0) : item.company_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              {/* 1. Profession Title - Main heading */}
                              <div className="flex items-center gap-1.5">
                                <h4 className={`text-base font-bold truncate ${isModal ? 'text-white' : 'text-gray-900'}`}>
                                  {item.title || item.industry || 'Professional'}
                                </h4>
                                {item.isPremium && (
                                  <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                )}
                              </div>

                              {/* 2. Nickname or Name - respects hide_personal_name privacy setting */}
                              <p className={`text-sm truncate font-medium ${isModal ? 'text-slate-300' : 'text-gray-600'}`}>
                                {isProfessional
                                  ? (!item.hide_personal_name && (item.first_name || item.last_name)
                                      ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                                      : (item.nickname || 'Anonymous'))
                                  : item.company_name
                                }
                              </p>

                              {/* Star Rating - professionals open modal, companies navigate to profile */}
                              {isProfessional ? (
                                <div
                                  className="mt-1 cursor-pointer hover:opacity-70 transition-opacity w-fit"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (item.reviews_count && item.reviews_count > 0) {
                                      setReviewsModal({
                                        isOpen: true,
                                        userId: item.id,
                                        userType: 'professional',
                                        userName: `${item.first_name} ${item.last_name}`
                                      })
                                    }
                                  }}
                                  title={item.reviews_count && item.reviews_count > 0 ? "Click to view reviews" : "No reviews yet"}
                                >
                                  <CompactStarRating
                                    rating={item.average_rating || 0}
                                    reviewCount={item.reviews_count || 0}
                                    size="sm"
                                    showCount={true}
                                  />
                                </div>
                              ) : (
                                <Link
                                  href={`/companies/${item.id}`}
                                  className="mt-1 hover:opacity-70 transition-opacity w-fit flex items-center"
                                  onClick={(e) => e.stopPropagation()}
                                  title="View company profile and reviews"
                                >
                                  <CompactStarRating
                                    rating={item.average_rating || 0}
                                    reviewCount={item.reviews_count || 0}
                                    size="sm"
                                    showCount={true}
                                  />
                                </Link>
                              )}

                              {/* Expected Salary - Show for professionals in short view */}
                              {isProfessional && !isSelected && (item.salary_min || item.salary_max) && (
                                <p className="text-sm font-semibold text-green-600 mt-1.5">
                                  {item.salary_min && item.salary_max
                                    ? `£${item.salary_min.toLocaleString()} - £${item.salary_max.toLocaleString()}`
                                    : item.salary_min
                                    ? `From £${item.salary_min.toLocaleString()}`
                                    : `Up to £${item.salary_max?.toLocaleString()}`}
                                  {item.salary_frequency ? ` (${item.salary_frequency})` : ' (per year)'}
                                </p>
                              )}

                              {/* Skills Preview */}
                              {item.skills && item.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.skills.slice(0, 3).map((skill: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className={`text-xs ${isModal ? 'border-slate-600 text-slate-300' : ''}`}>
                                      {skill}
                                    </Badge>
                                  ))}
                                  {item.skills.length > 3 && (
                                    <Badge variant="outline" className={`text-xs ${isModal ? 'border-slate-600 text-slate-300' : ''}`}>
                                      +{item.skills.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Bio - Show short preview */}
                              {item.bio && (
                                <p className={`text-xs mt-2 line-clamp-2 ${isModal ? 'text-slate-400' : 'text-gray-600'}`}>
                                  {item.bio}
                                </p>
                              )}

                              {/* Languages - Show with flags */}
                              {item.spoken_languages && item.spoken_languages.length > 0 && (
                                <div className={`text-[10px] mt-2 flex items-center flex-wrap gap-1 ${isModal ? 'text-slate-400' : 'text-gray-600'}`}>
                                  <Globe className="h-2.5 w-2.5 inline mr-1" />
                                  <span className="font-medium mr-1">Languages:</span>
                                  {item.spoken_languages.slice(0, 2).map((lang: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center">
                                      <span className="text-xs mr-0.5">{getLanguageFlag(lang)}</span>
                                      <span>{lang}{idx < Math.min(1, item.spoken_languages.length - 1) ? ',' : ''}</span>
                                    </span>
                                  ))}
                                  {item.spoken_languages.length > 2 && <span className="ml-1">+{item.spoken_languages.length - 2}</span>}
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

                              {/* Available / Busy badge */}
                              {(() => {
                                const isItemCompany = 'company_name' in item
                                let isAvail: boolean | null = null
                                if (isItemCompany) {
                                  isAvail = 'open_for_business' in item ? (item as any).open_for_business === true : null
                                } else {
                                  const hasTradeNotif = 'trade_job_notifications' in item
                                  const hasAvailNow = 'available_now' in item
                                  isAvail = hasTradeNotif ? (item as any).trade_job_notifications === true
                                    : hasAvailNow ? (item as any).available_now === true : null
                                }
                                if (isAvail === true) return (
                                  <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full whitespace-nowrap mt-1 w-fit">
                                    ● Available
                                  </span>
                                )
                                if (isAvail === false) return (
                                  <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full whitespace-nowrap mt-1 w-fit">
                                    ● Busy
                                  </span>
                                )
                                return null
                              })()}

                              {isSelected && (() => {
                                const isItemCompany = 'company_name' in item
                                const canContact = (isItemCompany && item.open_for_business) || currentUserType === "company" || currentUserType === "contractor"

                                const hClass = isModal ? 'text-slate-200' : 'text-gray-900'
                                const tClass = isModal ? 'text-slate-300' : 'text-gray-600'
                                const bdrClass = isModal ? 'border-slate-600' : 'border-gray-200'
                                const badgeCls = `text-xs ${isModal ? 'border-slate-600 text-slate-300' : ''}`

                                return (
                                <div className={`mt-3 pt-3 border-t ${bdrClass} space-y-3`}>

                                  {isItemCompany ? (
                                    // ── Company expanded view ──────────────────────────────
                                    <>
                                      {/* About */}
                                      {item.description && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>About</h4>
                                          <p className={`text-sm ${tClass} leading-relaxed`}>{item.description}</p>
                                        </div>
                                      )}

                                      {/* Industry */}
                                      {item.industry && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Industry</h4>
                                          <p className={`text-sm ${tClass}`}>{item.industry}</p>
                                        </div>
                                      )}

                                      {/* Services */}
                                      {item.skills && item.skills.length > 0 && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Services</h4>
                                          <div className="flex flex-wrap gap-1">
                                            {item.skills.map((skill: string, idx: number) => (
                                              <Badge key={idx} variant="outline" className={badgeCls}>{skill}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Languages */}
                                      {item.spoken_languages && item.spoken_languages.length > 0 && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Languages</h4>
                                          <div className="flex flex-wrap gap-1">
                                            {item.spoken_languages.map((lang: string, idx: number) => (
                                              <Badge key={idx} variant="outline" className={`${badgeCls} flex items-center gap-1`}>
                                                <span className="text-sm">{getLanguageFlag(lang)}</span>{lang}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Website */}
                                      {item.website_url && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Website</h4>
                                          <a
                                            href={item.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`text-sm break-all ${isModal ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-600 hover:text-blue-800'} underline`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {item.website_url.replace(/^https?:\/\//, '')}
                                          </a>
                                        </div>
                                      )}

                                      {/* Address */}
                                      {item.location && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Address</h4>
                                          <p className={`text-sm ${tClass}`}>{formatAddress(item.location)}</p>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    // ── Professional expanded view ─────────────────────────
                                    <>
                                      {item.bio && item.bio.length > 100 && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Full Bio</h4>
                                          <p className={`text-sm ${tClass} leading-relaxed`}>{item.bio}</p>
                                        </div>
                                      )}
                                      {item.location && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Address</h4>
                                          <p className={`text-sm ${tClass}`}>{formatAddress(item.location)}</p>
                                        </div>
                                      )}
                                      {item.skills && item.skills.length > 3 && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>All Skills ({item.skills.length})</h4>
                                          <div className="flex flex-wrap gap-1">
                                            {item.skills.map((skill: string, index: number) => (
                                              <Badge key={index} variant="outline" className={badgeCls}>{skill}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {item.spoken_languages && item.spoken_languages.length > 2 && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>All Languages ({item.spoken_languages.length})</h4>
                                          <div className="flex flex-wrap gap-1">
                                            {item.spoken_languages.map((language: string, index: number) => (
                                              <Badge key={index} variant="outline" className={`${badgeCls} flex items-center gap-1`}>
                                                <span className="text-sm">{getLanguageFlag(language)}</span>{language}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {item.availability && (
                                        <div>
                                          <h4 className={`font-semibold text-sm ${hClass} mb-1`}>Availability</h4>
                                          <p className="text-sm text-green-500 font-medium">
                                            {item.availability === 'available_now' ? 'Available now' :
                                             item.availability === 'available_week' ? 'Available within a week' :
                                             item.availability === 'available_month' ? 'Available within a month' :
                                             'Not specified'}
                                          </p>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Action Buttons */}
                                  <div className={`pt-3 border-t ${bdrClass}`}>
                                    <div className="flex gap-2">
                                      <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openConversation(item.user_id, item.company_name || `${item.first_name || ''} ${item.last_name || ''}`.trim())
                                        }}
                                      >
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        Message
                                      </Button>
                                      <Button
                                        className={`flex-1 ${isModal ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (isItemCompany) {
                                            router.push(`/companies/${item.id}`)
                                          } else {
                                            handleViewProfile(item.id)
                                          }
                                        }}
                                      >
                                        <UserIcon className="h-4 w-4 mr-2" />
                                        View Profile
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {data.length === 0 && (
                      <div className="p-5">
                        {isShowingJobs ? (
                          <>
                            <p className="text-sm font-medium text-gray-800 mb-1">
                              No jobs matching your skills in this area right now.
                            </p>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Try:</p>
                            <ul className="space-y-1.5 text-sm text-gray-600 mb-5">
                              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span>Expanding your search radius</span></li>
                              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span>Adding more skills to your profile</span></li>
                              <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span>Viewing all construction jobs nearby</span></li>
                            </ul>
                            {isModal && onViewAllJobs ? (
                              <button
                                type="button"
                                onClick={onViewAllJobs}
                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                View all jobs nearby
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            ) : (
                              <a
                                href="/jobs"
                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                View all jobs nearby
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-50 text-gray-400" />
                            <p className="font-medium text-center text-gray-500">
                              {`No tradespeople found${locationFilter ? ` in ${locationFilter}` : ''}`}
                            </p>
                            <p className="text-sm mt-1 text-center text-gray-400">Try expanding your search radius or searching for a different trade</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
              </div>
              </div>
            </Panel>
          </PanelGroup>
          </>
          </div>{/* flex-1 relative overflow-hidden wrapper */}
        </div>
      )}
    </div>
  )
}

export default memo(ProfessionalsPageContent)
