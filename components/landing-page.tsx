"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  MapPin,
  HardHat,
  CheckCircle,
  Wrench,
  Zap,
  PaintBucket,
  Sparkles,
  Tv,
  Droplets,
  Home,
  MessageCircle,
  Plus,
  Bookmark,
  User,
  ArrowLeft,
  Map,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  X,
  Send,
  Target,
  LogIn,
  Info,
  Briefcase,
  Flame,
  BatteryCharging,
  Building2,
  Layers,
  Paintbrush,
  LayoutGrid,
  Hammer,
  UtensilsCrossed,
  Leaf,
  TreePine,
  Grid3x3,
  Key,
  Package,
  Trash2,
  Truck,
  DoorOpen,
  Shield,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"
import { LocationInput } from "@/components/location-input"
import { MainPageSearch } from "@/components/main-page-search"
import ActivityTickerCard from "@/components/activity-ticker-card"
import { industries, allSubcategories } from "@/lib/data/industries"
import dynamic from "next/dynamic"
const ProfessionalMap = dynamic(
  () => import("@/components/professional-map").then(m => m.ProfessionalMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-800 animate-pulse rounded-xl" /> }
)
const JobWizardModal = dynamic(() => import("@/components/job-wizard-modal"), { ssr: false })
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface LandingPageProps {
  isSignedIn: boolean
  user?: any
  userType?: string | null
  adminSettings?: { vacanciesJobseekersEnabled: boolean }
  profileLocation?: { location: string; latitude: number; longitude: number } | null
  profileSkills?: string[]
  profileIndustry?: string | null
  profileServices?: string[]
}

// Problem-based help items — industry/service values match TRADE_INDUSTRIES exactly
const helpItems = [
  // Plumbing & Heating
  { label: "Fix a leak",         icon: Droplets,        category: "Plumbing",          industry: "Plumbing & Heating",      service: "Plumber",                 iconBg: "bg-blue-500/20",    iconColor: "text-blue-400",    border: "hover:border-blue-500/40",    shadow: "group-hover:shadow-blue-500/10"    },
  { label: "Boiler repair",      icon: Flame,           category: "Plumbing",          industry: "Plumbing & Heating",      service: "Boiler Repair",           iconBg: "bg-blue-500/20",    iconColor: "text-blue-400",    border: "hover:border-blue-500/40",    shadow: "group-hover:shadow-blue-500/10"    },
  // Electrical
  { label: "Electrician",        icon: Zap,             category: "Electrical",        industry: "Electrical",              service: "Electrician",             iconBg: "bg-yellow-500/20",  iconColor: "text-yellow-400",  border: "hover:border-yellow-500/40",  shadow: "group-hover:shadow-yellow-500/10"  },
  { label: "EV charger",         icon: BatteryCharging, category: "Electrical",        industry: "Electrical",              service: "EV Charger Installation", iconBg: "bg-yellow-500/20",  iconColor: "text-yellow-400",  border: "hover:border-yellow-500/40",  shadow: "group-hover:shadow-yellow-500/10"  },
  // Construction & Renovation
  { label: "Extension",          icon: Building2,       category: "Construction",      industry: "Construction & Renovation", service: "Extension Specialist",  iconBg: "bg-stone-500/20",   iconColor: "text-stone-400",   border: "hover:border-stone-500/40",   shadow: "group-hover:shadow-stone-500/10"   },
  { label: "Bricklaying",        icon: Layers,          category: "Construction",      industry: "Construction & Renovation", service: "Bricklayer",            iconBg: "bg-stone-500/20",   iconColor: "text-stone-400",   border: "hover:border-stone-500/40",   shadow: "group-hover:shadow-stone-500/10"   },
  // Plastering & Rendering
  { label: "Plastering",         icon: Paintbrush,      category: "Plastering",        industry: "Plastering & Rendering",  service: "Plasterer",               iconBg: "bg-amber-500/20",   iconColor: "text-amber-400",   border: "hover:border-amber-500/40",   shadow: "group-hover:shadow-amber-500/10"   },
  { label: "Rendering",          icon: LayoutGrid,      category: "Plastering",        industry: "Plastering & Rendering",  service: "Rendering Specialist",    iconBg: "bg-amber-500/20",   iconColor: "text-amber-400",   border: "hover:border-amber-500/40",   shadow: "group-hover:shadow-amber-500/10"   },
  // Painting & Decorating
  { label: "Painting",           icon: PaintBucket,     category: "Painting & Decorating", industry: "Painting & Decorating", service: "Painter & Decorator",  iconBg: "bg-pink-500/20",    iconColor: "text-pink-400",    border: "hover:border-pink-500/40",    shadow: "group-hover:shadow-pink-500/10"    },
  { label: "Wallpapering",       icon: LayoutGrid,      category: "Painting & Decorating", industry: "Painting & Decorating", service: "Wallpapering",         iconBg: "bg-pink-500/20",    iconColor: "text-pink-400",    border: "hover:border-pink-500/40",    shadow: "group-hover:shadow-pink-500/10"    },
  // Roofing
  { label: "Roof repair",        icon: HardHat,         category: "Roofing",           industry: "Roofing",                 service: "Roof Repair",             iconBg: "bg-cyan-500/20",    iconColor: "text-cyan-400",    border: "hover:border-cyan-500/40",    shadow: "group-hover:shadow-cyan-500/10"    },
  { label: "Guttering",          icon: Home,            category: "Roofing",           industry: "Roofing",                 service: "Guttering",               iconBg: "bg-cyan-500/20",    iconColor: "text-cyan-400",    border: "hover:border-cyan-500/40",    shadow: "group-hover:shadow-cyan-500/10"    },
  // Carpentry & Joinery
  { label: "Carpentry",          icon: Hammer,          category: "Carpentry",         industry: "Carpentry & Joinery",     service: "Carpenter",               iconBg: "bg-orange-500/20",  iconColor: "text-orange-400",  border: "hover:border-orange-500/40",  shadow: "group-hover:shadow-orange-500/10"  },
  { label: "Kitchen fitting",    icon: UtensilsCrossed, category: "Carpentry",         industry: "Carpentry & Joinery",     service: "Kitchen Fitter",          iconBg: "bg-orange-500/20",  iconColor: "text-orange-400",  border: "hover:border-orange-500/40",  shadow: "group-hover:shadow-orange-500/10"  },
  // Gardening & Landscaping
  { label: "Gardening",          icon: Leaf,            category: "Gardening",         industry: "Gardening & Landscaping", service: "Gardener",                iconBg: "bg-green-500/20",   iconColor: "text-green-400",   border: "hover:border-green-500/40",   shadow: "group-hover:shadow-green-500/10"   },
  { label: "Landscaping",        icon: TreePine,        category: "Gardening",         industry: "Gardening & Landscaping", service: "Landscaper",              iconBg: "bg-green-500/20",   iconColor: "text-green-400",   border: "hover:border-green-500/40",   shadow: "group-hover:shadow-green-500/10"   },
  // Flooring & Tiling
  { label: "Tiling",             icon: Grid3x3,         category: "Flooring",          industry: "Flooring & Tiling",       service: "Tiler",                   iconBg: "bg-teal-500/20",    iconColor: "text-teal-400",    border: "hover:border-teal-500/40",    shadow: "group-hover:shadow-teal-500/10"    },
  { label: "Flooring",           icon: Layers,          category: "Flooring",          industry: "Flooring & Tiling",       service: "Flooring Specialist",     iconBg: "bg-teal-500/20",    iconColor: "text-teal-400",    border: "hover:border-teal-500/40",    shadow: "group-hover:shadow-teal-500/10"    },
  // Cleaning
  { label: "Cleaning",           icon: Sparkles,        category: "Cleaning",          industry: "Cleaning",                service: "Domestic Cleaner",        iconBg: "bg-violet-500/20",  iconColor: "text-violet-400",  border: "hover:border-violet-500/40",  shadow: "group-hover:shadow-violet-500/10"  },
  { label: "End of tenancy",     icon: Key,             category: "Cleaning",          industry: "Cleaning",                service: "End of Tenancy Cleaner",  iconBg: "bg-violet-500/20",  iconColor: "text-violet-400",  border: "hover:border-violet-500/40",  shadow: "group-hover:shadow-violet-500/10"  },
  // Handyman / Small Jobs
  { label: "Handyman",           icon: Wrench,          category: "General Handyman",  industry: "Handyman / Small Jobs",   service: "Handyman",                iconBg: "bg-slate-500/25",   iconColor: "text-slate-300",   border: "hover:border-slate-400/40",   shadow: "group-hover:shadow-slate-500/10"   },
  { label: "Furniture assembly", icon: Package,         category: "General Handyman",  industry: "Handyman / Small Jobs",   service: "Furniture Assembly",      iconBg: "bg-slate-500/25",   iconColor: "text-slate-300",   border: "hover:border-slate-400/40",   shadow: "group-hover:shadow-slate-500/10"   },
  // Waste Removal
  { label: "House clearance",    icon: Trash2,          category: "General Handyman",  industry: "Waste Removal",           service: "House Clearance",         iconBg: "bg-red-500/15",     iconColor: "text-red-400",     border: "hover:border-red-500/40",     shadow: "group-hover:shadow-red-500/10"     },
  { label: "Man & Van",          icon: Truck,           category: "General Handyman",  industry: "Waste Removal",           service: "Man & Van",               iconBg: "bg-red-500/15",     iconColor: "text-red-400",     border: "hover:border-red-500/40",     shadow: "group-hover:shadow-red-500/10"     },
  // Fencing & Gates
  { label: "Fencing",            icon: Shield,          category: "Carpentry",         industry: "Fencing & Gates",         service: "Fence Installer",         iconBg: "bg-emerald-500/20", iconColor: "text-emerald-400", border: "hover:border-emerald-500/40", shadow: "group-hover:shadow-emerald-500/10" },
  { label: "Gate installation",  icon: DoorOpen,        category: "Carpentry",         industry: "Fencing & Gates",         service: "Gate Installation",       iconBg: "bg-emerald-500/20", iconColor: "text-emerald-400", border: "hover:border-emerald-500/40", shadow: "group-hover:shadow-emerald-500/10" },
]

// Build searchable list: subcategories + industry titles
const searchableTrades = [...allSubcategories, ...industries.map(i => i.title)]

// Top 20 most popular languages for dropdown
const popularLanguages = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Polish",
  "Romanian", "Dutch", "Greek", "Turkish", "Arabic", "Hindi", "Urdu", "Bengali",
  "Punjabi", "Gujarati", "Tamil", "Mandarin", "Cantonese"
]

// Extended list of 50+ languages for autocomplete
const allLanguages = [
  ...popularLanguages,
  "Russian", "Ukrainian", "Czech", "Slovak", "Hungarian", "Bulgarian", "Croatian",
  "Serbian", "Slovenian", "Albanian", "Lithuanian", "Latvian", "Estonian", "Finnish",
  "Swedish", "Norwegian", "Danish", "Icelandic", "Japanese", "Korean", "Vietnamese",
  "Thai", "Indonesian", "Malay", "Filipino", "Swahili", "Amharic", "Somali", "Yoruba",
  "Igbo", "Hausa", "Zulu", "Afrikaans", "Hebrew", "Persian", "Kurdish", "Pashto",
  "Nepali", "Sinhala", "Burmese", "Khmer", "Lao", "Mongolian", "Kazakh", "Uzbek",
  "Azerbaijani", "Georgian", "Armenian", "Maltese", "Welsh", "Irish", "Scottish Gaelic"
].sort()

export function LandingPage({ isSignedIn, user, userType, adminSettings, profileLocation: serverProfileLocation, profileSkills = [], profileIndustry = null, profileServices = [] }: LandingPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useTranslation()
  const supabase = createClient()

  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [activeTab, setActiveTab] = useState<"jobs" | "tradespeople">(
    userType === "company" || userType === "employer" ? "jobs" : "tradespeople"
  )

  // Autocomplete state
  const [tradeSuggestions, setTradeSuggestions] = useState<string[]>([])
  const [showTradeSuggestions, setShowTradeSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showLikeFeedbackModal, setShowLikeFeedbackModal] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<"like" | "dislike" | null>(null)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const scrollCategories = (dir: "left" | "right") => {
    categoryScrollRef.current?.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" })
  }

  // Map Picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [mapPickerRadius, setMapPickerRadius] = useState("10")
  const [mapPickerKey, setMapPickerKey] = useState(0)

  // Filters state
  const [showFilters, setShowFilters] = useState(false)
  const [distance, setDistance] = useState("5")
  const [tradeCategory, setTradeCategory] = useState("all")
  const [urgency, setUrgency] = useState("all")
  const [is24_7, setIs24_7] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState("all")
  const [languageSearch, setLanguageSearch] = useState("")
  const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false)
  const languageInputRef = useRef<HTMLInputElement>(null)
  const [jobType, setJobType] = useState<"trade_jobs" | "vacancies">("trade_jobs")

  // Availability toggle for tradespeople (business = company in simple mode; also legacy professional/contractor)
  const isTradesPerson = userType === "company" || userType === "professional" || userType === "contractor"
  const [availableForWork, setAvailableForWork] = useState(true)
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false)

  // User profile location — initialised from server prop (no async race condition)
  const [userProfileLocation, setUserProfileLocation] = useState<{
    location: string
    latitude: number
    longitude: number
  } | null>(serverProfileLocation ?? null)

  // Fetch availability for tradespeople
  useEffect(() => {
    if (!isSignedIn || !user?.id || !isTradesPerson) return
    const fetchAvailability = async () => {
      try {
        if (userType === "company") {
          const { data } = await supabase
            .from("company_profiles")
            .select("trade_job_notifications")
            .eq("user_id", user.id)
            .maybeSingle()
          if (data) setAvailableForWork(data.trade_job_notifications ?? true)
        } else {
          const { data } = await supabase
            .from("professional_profiles")
            .select("available_for_work")
            .eq("user_id", user.id)
            .maybeSingle()
          if (data) setAvailableForWork(data.available_for_work ?? true)
        }
      } catch {}
    }
    fetchAvailability()
  }, [isSignedIn, user?.id, isTradesPerson, userType, supabase])

  const handleToggleAvailability = async (newValue: boolean) => {
    if (!user?.id || isTogglingAvailability) return
    setIsTogglingAvailability(true)
    setAvailableForWork(newValue)
    try {
      if (userType === "company") {
        const { error } = await supabase
          .from("company_profiles")
          .update({
            trade_job_notifications: newValue,
            flexible_job_notifications: newValue,
            availability_last_updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
        if (error) setAvailableForWork(!newValue)
      } else {
        const { error } = await supabase
          .from("professional_profiles")
          .update({ available_for_work: newValue })
          .eq("user_id", user.id)
        if (error) setAvailableForWork(!newValue)
      }
    } catch {
      setAvailableForWork(!newValue)
    }
    setIsTogglingAvailability(false)
  }

  // Helper to get browse jobs URL params
  const getBrowseJobsParams = () => {
    const params = new URLSearchParams()

    if (userProfileLocation) {
      params.set("location", "Near Me")
      params.set("lat", userProfileLocation.latitude.toString())
      params.set("lng", userProfileLocation.longitude.toString())
      params.set("radius", "5")
    } else {
      params.set("location", "Near Me")
    }

    // Prefer industry/services (exact matching) over legacy skills (ilike)
    if (profileIndustry) {
      params.set("industry", profileIndustry)
      if (profileServices.length > 0) {
        params.set("services", profileServices.slice(0, 10).join(","))
      }
    } else if (profileSkills.length > 0) {
      params.set("skills", profileSkills.slice(0, 10).join(","))
    }

    params.set("tab", "jobs_tasks")
    params.set("autoSearch", "true")
    return params
  }

  // Check if we have search params (user is searching)
  const hasSearchParams = searchParams?.get("autoSearch") || searchParams?.get("returnToSearch")

  const handleSearch = () => {
    // Auto-fill Portsmouth if no location provided
    let searchLat = selectedLocation?.lat || 50.8058
    let searchLon = selectedLocation?.lon || -1.0872
    let searchLocation = location || "Portsmouth, UK"

    const params = new URLSearchParams()
    params.set("search", searchQuery)
    params.set("location", searchLocation)
    params.set("lat", searchLat.toString())
    params.set("lng", searchLon.toString())
    params.set("tab", activeTab === "jobs" ? "jobs_tasks" : "traders")
    params.set("radius", distance)
    params.set("autoSearch", "true")

    // Add filters if set
    if (tradeCategory !== "all") {
      params.set("category", tradeCategory)
    }
    if (urgency !== "all") {
      params.set("urgency", urgency)
    }
    if (is24_7) {
      params.set("24_7", "true")
    }
    if (selectedLanguage !== "all") {
      params.set("language", selectedLanguage)
    }
    // Add job type filter for Jobs tab
    if (activeTab === "jobs") {
      params.set("jobType", jobType)
    }

    router.push(`/?${params.toString()}`)
  }

  const handleCategoryClick = (category: string, industry?: string, service?: string) => {
    if (userType === "company") return
    setWizardIndustry(industry ?? category)
    setWizardService(service)
    setShowJobWizard(true)
  }

  const handleHelpItemClick = (searchTerm: string) => {
    const params = new URLSearchParams()
    params.set("search", searchTerm)
    params.set("location", "London, UK")
    params.set("lat", "51.5074")
    params.set("lng", "-0.1278")
    params.set("tab", "traders")
    params.set("autoSearch", "true")
    router.push(`/?${params.toString()}`)
  }

  const [heroPostcode, setHeroPostcode] = useState("")
  const [postcodeError, setPostcodeError] = useState(false)
  const [pendingIndustry, setPendingIndustry] = useState<string | null>(null)
  const [pendingMapRoute, setPendingMapRoute] = useState<"/find" | "/find-jobs">("/find")
  const [showJobWizard,   setShowJobWizard]   = useState(false)
  const [wizardIndustry,  setWizardIndustry]  = useState<string | undefined>(undefined)
  const [wizardService,   setWizardService]   = useState<string | undefined>(undefined)
  const [showPostcodeModal, setShowPostcodeModal] = useState(false)
  const [modalPostcode, setModalPostcode] = useState("")
  const handlePostcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!heroPostcode.trim()) { setPostcodeError(true); return }
    setPostcodeError(false)
    if (userType === "company") return
    router.push(`/find?postcode=${encodeURIComponent(heroPostcode.trim())}`)
  }
  const handleJobsPostcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!heroPostcode.trim()) { setPostcodeError(true); return }
    setPostcodeError(false)
    router.push(`/find-jobs?postcode=${encodeURIComponent(heroPostcode.trim())}`)
  }

  const handlePostJob = () => {
    if (!isSignedIn) {
      router.push("/auth/sign-up")
    } else if (userType === "company") {
      router.push("/")
    } else {
      router.push("/jobs/new")
    }
  }

  const handleNavClick = (path: string) => {
    if (!isSignedIn && path !== "/" && !path.startsWith("/auth")) {
      router.push("/auth/login")
    } else {
      router.push(path)
    }
  }

  // Handle trade search input with autocomplete
  const handleTradeSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.length >= 2) {
      const lowerValue = value.toLowerCase()
      const matches = searchableTrades.filter(trade =>
        trade.toLowerCase().includes(lowerValue)
      ).slice(0, 8) // Limit to 8 suggestions
      setTradeSuggestions(matches)
      setShowTradeSuggestions(matches.length > 0)
    } else {
      setTradeSuggestions([])
      setShowTradeSuggestions(false)
    }
  }

  const handleTradeSuggestionSelect = (trade: string) => {
    setSearchQuery(trade)
    setTradeSuggestions([])
    setShowTradeSuggestions(false)
    searchInputRef.current?.blur()
  }

  // Open map picker modal
  const handleMapPicker = () => {
    // Initialize map picker with current location or default to London
    if (selectedLocation) {
      setMapPickerLocation({
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        name: location || "Selected Location"
      })
    } else {
      setMapPickerLocation(null)
    }
    setMapPickerKey(prev => prev + 1)
    setShowMapPicker(true)
  }

  // Handle map click to select location
  const handleMapLocationPick = async (lat: number, lon: number) => {
    try {
      // Reverse geocode to get location name
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`
      )
      const data = await response.json()
      const locationName = data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`

      setMapPickerLocation({ lat, lon, name: locationName })
    } catch (error) {
      console.error("[MAP_PICKER] Reverse geocode error:", error)
      setMapPickerLocation({ lat, lon, name: `${lat.toFixed(4)}, ${lon.toFixed(4)}` })
    }
  }

  // Confirm map picker selection
  const confirmMapPickerLocation = () => {
    if (mapPickerLocation) {
      setLocation(mapPickerLocation.name)
      setSelectedLocation({ lat: mapPickerLocation.lat, lon: mapPickerLocation.lon })
      setDistance(mapPickerRadius)
    }
    setShowMapPicker(false)
  }

  // Cancel map picker
  const cancelMapPicker = () => {
    setMapPickerLocation(null)
    setShowMapPicker(false)
  }

  // Open filters panel
  const handleFilters = () => {
    setShowFilters(true)
  }

  // Apply filters and search
  const applyFiltersAndSearch = () => {
    setShowFilters(false)
    handleSearch()
  }

  // Handle feedback submission
  const submitFeedback = async (type: "like" | "dislike", message?: string) => {
    setIsSubmittingFeedback(true)
    setFeedbackError(null)
    try {
      const { error } = await supabase.from("app_feedback").insert({
        user_id: user?.id || null,
        feedback_type: type,
        message: message || null,
        page_url: typeof window !== "undefined" ? window.location.href : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      })

      if (error) {
        console.error("[FEEDBACK] Error submitting:", error)
        setFeedbackError("Failed to submit feedback. Please try again.")
      } else {
        setFeedbackSubmitted(type)
        setShowFeedbackModal(false)
        setShowLikeFeedbackModal(false)
        setFeedbackMessage("")
      }
    } catch (err) {
      console.error("[FEEDBACK] Exception:", err)
      setFeedbackError("Something went wrong. Please try again.")
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleLike = () => {
    if (feedbackSubmitted) return
    setFeedbackError(null)
    setFeedbackMessage("")
    setShowLikeFeedbackModal(true)
  }

  const handleDislike = () => {
    if (feedbackSubmitted) return
    setFeedbackError(null)
    setFeedbackMessage("")
    setShowFeedbackModal(true)
  }

  const handleFeedbackSubmit = () => {
    submitFeedback("dislike", feedbackMessage)
  }

  const handleFeedbackSkip = () => {
    submitFeedback("dislike")
  }

  const handleLikeFeedbackSubmit = () => {
    submitFeedback("like", feedbackMessage)
  }

  const handleLikeFeedbackSkip = () => {
    submitFeedback("like")
  }

  // If user has searched (has search params), show the search results view
  if (hasSearchParams) {
    return (
      <div className="min-h-screen bg-slate-900 pb-20 md:pb-0">
        {/* Back to Landing link */}
        <div className="container mx-auto px-4 py-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>

        {/* Main Search Component with results */}
        <div className="container mx-auto px-2 sm:px-4">
          <MainPageSearch initialUser={user} initialUserType={userType} adminSettings={adminSettings} profileLocation={serverProfileLocation} />
        </div>

        {/* Mobile Bottom Nav — only for logged-out users; logged-in users use global MobileBottomNav */}
        {!isSignedIn && <MobileBottomNavLanding isSignedIn={isSignedIn} userType={userType} onNavClick={handleNavClick} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20 md:pb-0">
      {/* Mode switch tabs — Uber-style pill toggle */}
      {!isSignedIn && <div className="bg-slate-900/95 sticky top-0 z-40 py-2.5 border-b border-slate-700/40">
        <div className="flex justify-center">
          <div className="flex bg-slate-800 rounded-full p-1 border border-slate-700/60 shadow-lg gap-0.5">
            <button
              onClick={() => setActiveTab("tradespeople")}
              className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                activeTab === "tradespeople"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Find a Tradesperson
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                activeTab === "jobs"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Find Jobs
            </button>
          </div>
        </div>
      </div>}

      {/* Job Notifications toggle — tradespeople tab, signed-in business only */}
      {activeTab === "jobs" && isSignedIn && isTradesPerson && (
        <div className="flex justify-center py-3 border-b border-slate-700/30">
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-300 ${
            availableForWork
              ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.28)]"
              : "border-slate-600/40 bg-slate-800/50"
          }`}>
            <div className="flex items-center gap-2">
              <Bell className={`h-4 w-4 flex-shrink-0 ${availableForWork ? "text-emerald-400" : "text-slate-500"}`} />
              <div>
                <p className={`text-sm font-bold tracking-wide leading-tight ${availableForWork ? "text-white" : "text-slate-400"}`}>
                  {availableForWork ? "Job Notifications On" : "Job Notifications Off"}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {availableForWork ? "You'll receive nearby job alerts" : "Job alerts paused"}
                </p>
              </div>
            </div>
            <Switch
              checked={availableForWork}
              onCheckedChange={handleToggleAvailability}
              disabled={isTogglingAvailability}
              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-600"
            />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  type="button"
                >
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-72 bg-slate-800 border-slate-700 text-white">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm font-semibold">Job Notifications</p>
                  </div>
                  <p className="text-xs text-slate-300">
                    When a nearby job matching your trade is posted, you receive an instant push notification to accept or skip.
                  </p>
                  <div className="text-xs border-t border-slate-700 pt-2 mt-2 bg-emerald-500/10 p-2 rounded">
                    <p className="font-medium text-emerald-300">What triggers a notification:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-emerald-200">
                      <li>Jobs matching your trade</li>
                      <li>Within your set distance</li>
                      <li>Instant push notification</li>
                    </ul>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Trust Signals Strip — tradespeople tab only (homeowners strip moved below map) */}
      {activeTab === "jobs" && (
        <div className="py-4 sm:py-5 border-b border-slate-700/30">
          <div className="container mx-auto px-4">
            <div
              key="trade-trust"
              className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-x-3 gap-y-2.5 sm:gap-x-10 sm:gap-y-0 animate-fade-in"
            >
              {[
                "Keep 100% of what you earn",
                "No pay-per-lead",
                "Apply only when you're available",
                "Direct chat with homeowners",
              ].map((label) => (
                <div key={label} className="flex items-start sm:items-center gap-2">
                  <span className="text-orange-400 font-bold flex-shrink-0 mt-0.5 sm:mt-0 text-[15px] sm:text-[26px]">✔</span>
                  <span className="text-slate-100 font-semibold leading-tight text-[13px] sm:text-[26px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-0 pb-6 md:pt-8 md:pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Hero Headline with Feedback Icons */}
            <div className="relative mb-5">
              <h1 className="font-bold text-center mb-4">
                {activeTab === "jobs" ? (
                  <>
                    <span className="text-orange-400 block" style={{ fontSize: '32px', lineHeight: '1.15' }}>Get real local jobs.</span>
                    <span className="text-white block" style={{ fontSize: '32px', lineHeight: '1.15' }}>No lead fees.</span>
                  </>
                ) : (
                  <div className="relative w-[calc(100%+2rem)] md:hidden overflow-hidden h-[220px] -mx-4 bg-slate-900">
                    {/* LCP image — explicit <img> so browser can preload and optimise it */}
                    <img
                      src="/Tradespeople.jpg"
                      alt=""
                      aria-hidden="true"
                      fetchPriority="high"
                      loading="eager"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover object-top md:object-contain md:object-center"
                    />
                    {/* Top gradient — keeps feedback icons readable */}
                    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
                    {/* Bottom fade — blends into page bg (#0f172a) */}
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#0f172a]" />
                    {/* Text anchored to the bottom of the photo, just above the search bar overlap */}
                    <div className="absolute inset-x-0 bottom-11 md:bottom-4 px-4">
                      <p className="font-black text-white drop-shadow-lg text-[15px] md:text-[28px]" style={{ lineHeight: '1.15' }}>
                        Nearby tradespeople respond in minutes<br /><span className="text-emerald-400">Check who is available today</span>
                      </p>
                    </div>
                  </div>
                )}
              </h1>

              {/* Like/Dislike Icons - Absolute positioned */}
              <div className="absolute right-0 top-0 flex flex-col gap-1">
                <button
                  onClick={handleLike}
                  disabled={feedbackSubmitted !== null}
                  className={`p-1.5 rounded-lg transition-all ${
                    feedbackSubmitted === "like"
                      ? "bg-emerald-500/30 text-emerald-400"
                      : feedbackSubmitted === "dislike"
                        ? "opacity-30 cursor-not-allowed text-slate-500"
                        : "hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400"
                  }`}
                  title="I like this app"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDislike}
                  disabled={feedbackSubmitted !== null}
                  className={`p-1.5 rounded-lg transition-all ${
                    feedbackSubmitted === "dislike"
                      ? "bg-red-500/30 text-red-400"
                      : feedbackSubmitted === "like"
                        ? "opacity-30 cursor-not-allowed text-slate-500"
                        : "hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                  }`}
                  title="I don't like this app"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Dynamic Visual CTA - Changes based on active tab */}
            {activeTab === "jobs" ? (
              /* ── TRADESPEOPLE: image-backed postcode section ── */
              <div className="mb-6 mt-3 md:mt-4 relative z-10">
                <div className="relative w-full h-44 md:h-52 rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl">
                  <img
                    src="/live_map.jpg"
                    alt="Active jobs near you on the map"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  {/* Live activity ticker — top left */}
                  <div className="absolute top-3 left-3 w-fit max-w-[calc(100%-24px)]">
                    <ActivityTickerCard
                      inline
                      className="bg-slate-900/80 backdrop-blur-sm rounded-full px-3 py-1 border border-slate-700/50 justify-start"
                      textClassName="text-[11px] font-semibold text-emerald-300 whitespace-nowrap"
                    />
                  </div>
                  {/* Postcode form — vertically centered */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3">
                    <form
                      onSubmit={handleJobsPostcodeSubmit}
                      className={`flex items-center gap-2 bg-white rounded-full px-3 py-2 w-full max-w-sm mx-auto shadow-2xl shadow-black/40 transition-all ${postcodeError ? "ring-2 ring-red-400" : ""}`}
                    >
                      <Search className="flex-shrink-0 h-4 w-4 text-gray-400 ml-1" />
                      <input
                        type="text"
                        value={heroPostcode}
                        onChange={(e) => { setHeroPostcode(e.target.value.toUpperCase()); setPostcodeError(false) }}
                        placeholder="Enter your postcode…"
                        maxLength={8}
                        className="flex-1 min-w-0 bg-transparent text-gray-700 placeholder:text-gray-400 text-sm font-medium outline-none"
                      />
                      <button
                        type="submit"
                        className="flex-shrink-0 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-400 active:bg-orange-600 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
                      >
                        View Jobs
                      </button>
                    </form>
                    {postcodeError && (
                      <p className="mt-2 text-center text-xs font-semibold text-white bg-red-500/80 backdrop-blur-sm rounded-full py-1 px-3 mx-auto w-fit">
                        Please enter your postcode
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── HOMEOWNERS: image-backed postcode section ── */
              <div className="mb-6 -mt-10 md:mt-0 relative z-10">
                <p className="hidden md:block text-center text-white font-bold text-3xl mb-4">
                  Find trusted tradespeople near you
                </p>
                <div className="relative w-full h-52 md:h-72 rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl">
                  <img
                    src="/live_map_trade.jpg"
                    alt="Find a tradesperson near you"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  {/* Live activity ticker — top left */}
                  <div className="absolute top-3 left-3 w-fit max-w-[calc(100%-24px)]">
                    <ActivityTickerCard
                      inline
                      className="bg-slate-900/80 backdrop-blur-sm rounded-full px-3 py-1 border border-slate-700/50 justify-start"
                      textClassName="text-[11px] font-semibold text-emerald-300 whitespace-nowrap"
                    />
                  </div>
                  {/* Postcode form — vertically centered */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 md:left-8 md:right-8">
                    <form
                      onSubmit={handlePostcodeSubmit}
                      className={`flex items-center gap-2 bg-white rounded-full px-4 py-2.5 md:py-3 w-full max-w-sm md:max-w-lg mx-auto shadow-2xl shadow-black/40 transition-all ${postcodeError ? "ring-2 ring-red-400" : ""}`}
                    >
                      <Search className="flex-shrink-0 h-4 w-4 md:h-5 md:w-5 text-gray-400 ml-1" />
                      <input
                        type="text"
                        value={heroPostcode}
                        onChange={(e) => { setHeroPostcode(e.target.value.toUpperCase()); setPostcodeError(false) }}
                        placeholder="Postcode…"
                        maxLength={8}
                        className="flex-1 min-w-0 bg-transparent text-gray-700 placeholder:text-gray-400 text-sm md:text-base font-medium outline-none"
                      />
                      <button
                        type="submit"
                        className="flex-shrink-0 text-xs md:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 active:bg-orange-600 rounded-full px-3 md:px-4 py-2 transition-colors whitespace-nowrap"
                      >
                        <span className="hidden sm:inline">See available trades</span>
                        <span className="sm:hidden">Search</span>
                      </button>
                    </form>
                    {postcodeError && (
                      <p className="mt-2 text-center text-xs font-semibold text-white bg-red-500/80 backdrop-blur-sm rounded-full py-1 px-3 mx-auto w-fit">
                        Please enter your postcode
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Dislike Feedback Modal */}
            {showFeedbackModal && (
              <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/60">
                <div className="bg-slate-800 rounded-xl p-5 w-full max-w-sm border border-slate-600 shadow-2xl relative">
                  {/* Close button */}
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <h3 className="text-lg font-semibold text-white mb-2">
                    Don't like the app?
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    How can we improve it?
                  </p>

                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Tell us what you'd like to see improved..."
                    className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  />

                  {feedbackError && (
                    <p className="text-sm text-red-400 mt-2">{feedbackError}</p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmittingFeedback}
                      className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                    >
                      {isSubmittingFeedback ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleFeedbackSkip}
                      disabled={isSubmittingFeedback}
                      variant="outline"
                      className="h-10 px-4 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Like Feedback Modal */}
            {showLikeFeedbackModal && (
              <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/60">
                <div className="bg-slate-800 rounded-xl p-5 w-full max-w-sm border border-slate-600 shadow-2xl relative">
                  {/* Close button */}
                  <button
                    onClick={() => setShowLikeFeedbackModal(false)}
                    className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Thanks!
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Tell us what you like?
                  </p>

                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="What do you enjoy about the app..."
                    className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  />

                  {feedbackError && (
                    <p className="text-sm text-red-400 mt-2">{feedbackError}</p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleLikeFeedbackSubmit}
                      disabled={isSubmittingFeedback}
                      className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                    >
                      {isSubmittingFeedback ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleLikeFeedbackSkip}
                      disabled={isSubmittingFeedback}
                      variant="outline"
                      className="h-10 px-4 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tradespeople" ? (

              /* ── HOMEOWNERS: Premium map section ── */
              <div className="mt-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-4">
                  What do you need help with?
                </h2>

                {/* Category horizontal scroll */}
                <div className="relative mb-6">
                  {/* Left arrow */}
                  <button
                    onClick={() => scrollCategories("left")}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-700/90 border border-slate-600/60 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors shadow-md"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Scroll container */}
                  <div
                    ref={categoryScrollRef}
                    className="flex gap-2 overflow-x-auto px-9 pb-1"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {helpItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleCategoryClick(item.category, item.industry, item.service)}
                        className={`group flex-shrink-0 flex flex-col items-center gap-1.5 py-3 px-2.5 w-20 rounded-xl bg-slate-800/70 border border-slate-700/50 ${item.border} hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm hover:shadow-md ${item.shadow}`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-300 group-hover:text-white transition-colors leading-tight text-center w-full">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Right arrow */}
                  <button
                    onClick={() => scrollCategories("right")}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-700/90 border border-slate-600/60 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors shadow-md"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Trust strip — below category grid */}
                {/* Trust items — no boxes */}
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 max-w-2xl mx-auto">
                  {[
                    { label: "Verified local trades",         sub: "Every trade is vetted" },
                    { label: "Real reviews & portfolios",     sub: "See their past work" },
                    { label: "Direct contact — no middleman", sub: "Chat directly, no fees" },
                    { label: "No hidden fees",                sub: "Free to post a job" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-100 font-semibold text-sm leading-tight">{item.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trustpilot badge */}
                <div className="mt-5 flex justify-center">
                  <a
                    href="https://uk.trustpilot.com/review/openjobmarket.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <img
                      src="/Trustpilot.png"
                      alt="Trustpilot reviews"
                      loading="lazy"
                      decoding="async"
                      className="h-8 sm:h-10 w-auto"
                    />
                  </a>
                </div>
              </div>

            ) : null}
          </div>
        </div>
      </section>


      {/* Value Props / How It Works — tab-aware */}
      <section className="py-6">
        <div className="container mx-auto px-4">

          {activeTab === "jobs" ? (

            /* ── HOW IT WORKS — For Tradespeople ────────────────── */
            <div className="max-w-2xl md:max-w-4xl mx-auto animate-fade-in">

              {/* Section header */}
              <div className="text-center mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/70 mb-1">
                  Trades need clarity.
                </p>
                <h2 className="text-2xl font-bold text-white">How It Works</h2>
              </div>

              {/* Step cards — 2-col on mobile, 4-col on desktop */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                {/* ── Step 1: Turn on Available ── */}
                <div className="bg-slate-800/70 rounded-2xl border border-slate-700/50 p-3 flex flex-col gap-3">
                  {/* Phone mockup */}
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-700/40 shadow-inner">
                    <div className="p-2.5 flex flex-col gap-2">
                      {/* Status bar */}
                      <div className="flex justify-between items-center px-0.5">
                        <span className="text-[8px] text-slate-500 font-medium">9:41</span>
                        <div className="flex gap-0.5 items-center">
                          <div className="w-2.5 h-1 rounded-sm bg-slate-600" />
                          <div className="w-1 h-1 rounded-full bg-slate-600" />
                        </div>
                      </div>
                      {/* Screen content */}
                      <p className="text-[9px] text-slate-400 text-center font-medium">Your Status</p>
                      <div className="bg-slate-800 rounded-lg p-2 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-white leading-none">Available</p>
                          <p className="text-[8px] text-emerald-400 mt-0.5">Open for work</p>
                        </div>
                        {/* Toggle ON */}
                        <div className="w-8 h-[18px] rounded-full bg-emerald-500 flex items-center justify-end pr-0.5 shadow-sm shadow-emerald-500/50">
                          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[8px] text-emerald-400">Looking for jobs</span>
                      </div>
                    </div>
                  </div>
                  {/* Step label */}
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">Turn on &ldquo;Available&rdquo;</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">One tap when you're ready for work</p>
                    </div>
                  </div>
                </div>

                {/* ── Step 2: Receive nearby job alerts ── */}
                <div className="bg-slate-800/70 rounded-2xl border border-slate-700/50 p-3 flex flex-col gap-3">
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-700/40 shadow-inner">
                    <div className="p-2.5 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center px-0.5 mb-0.5">
                        <span className="text-[8px] text-slate-500 font-medium">9:41</span>
                        <span className="text-[8px] text-orange-400 font-bold">● LIVE</span>
                      </div>
                      {/* Alert banner */}
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-2">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-white fill-white flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-white leading-tight truncate">Urgent plumbing nearby</p>
                            <p className="text-[8px] text-orange-100 leading-tight">0.8 mi · Needs help today</p>
                          </div>
                        </div>
                      </div>
                      {/* Job rows */}
                      {[{ t: "Boiler repair", d: "1.2 mi", e: "£80" }, { t: "Leak fix", d: "2.1 mi", e: "£60" }].map((j) => (
                        <div key={j.t} className="bg-slate-800 rounded-lg p-1.5 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-semibold text-white leading-none">{j.t}</p>
                            <p className="text-[8px] text-slate-400 mt-0.5">{j.d}</p>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-400">{j.e}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">Receive job alerts</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">Instant alerts for jobs near you</p>
                    </div>
                  </div>
                </div>

                {/* ── Step 3: Tap Apply ── */}
                <div className="bg-slate-800/70 rounded-2xl border border-slate-700/50 p-3 flex flex-col gap-3">
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-700/40 shadow-inner">
                    <div className="p-2.5 flex flex-col gap-2">
                      <div className="flex justify-between items-center px-0.5">
                        <span className="text-[8px] text-slate-500 font-medium">9:42</span>
                        <MapPin className="w-2.5 h-2.5 text-slate-500" />
                      </div>
                      {/* Job card */}
                      <div className="bg-slate-800 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-white leading-none">🔧 Boiler repair</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">1.2 mi · Today · £80–120</p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {["Plumbing", "Boiler"].map((tag) => (
                            <span key={tag} className="text-[7px] bg-slate-700 text-slate-300 px-1 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      </div>
                      {/* Apply button — highlighted with glow */}
                      <div className="w-full bg-orange-500 rounded-lg py-1.5 text-center shadow-md shadow-orange-500/40">
                        <span className="text-[10px] font-bold text-white">⚡ Apply Now</span>
                      </div>
                      <p className="text-[8px] text-slate-500 text-center">No bidding. One tap.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">Tap Apply</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">Interested? Apply in one tap</p>
                    </div>
                  </div>
                </div>

                {/* ── Step 4: Chat and arrange visit ── */}
                <div className="bg-slate-800/70 rounded-2xl border border-slate-700/50 p-3 flex flex-col gap-3">
                  <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-700/40 shadow-inner">
                    <div className="p-2.5 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center px-0.5 mb-0.5">
                        <span className="text-[8px] text-slate-500 font-medium">9:45</span>
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[7px] text-emerald-400">Online</span>
                        </div>
                      </div>
                      {/* Chat header */}
                      <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg px-2 py-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[7px] text-blue-300 font-bold">J</span>
                        </div>
                        <p className="text-[9px] font-semibold text-white">James (Homeowner)</p>
                      </div>
                      {/* Messages */}
                      <div className="flex justify-start">
                        <div className="bg-slate-700 rounded-lg rounded-bl-none px-2 py-1 max-w-[80%]">
                          <p className="text-[8px] text-slate-100 leading-tight">Can you come tomorrow at 10am?</p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-orange-500 rounded-lg rounded-br-none px-2 py-1 max-w-[80%]">
                          <p className="text-[8px] text-white leading-tight">Yes, see you at 10! ✓</p>
                        </div>
                      </div>
                      {/* Input bar */}
                      <div className="flex items-center gap-1 bg-slate-800 rounded-full px-2 py-1 mt-0.5">
                        <div className="flex-1 h-1 bg-slate-700 rounded-full" />
                        <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <Send className="w-2 h-2 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">Chat &amp; arrange visit</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">Direct message. No middleman.</p>
                    </div>
                  </div>
                </div>

              </div>{/* end grid */}
            </div>

          ) : (

            /* ── HOW IT WORKS — For Homeowners ──────────────────── */
            <div className="max-w-2xl md:max-w-4xl mx-auto animate-fade-in">

              {/* Section header */}
              <div className="text-center mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/70 mb-1">
                  Simple &amp; fast.
                </p>
                <h2 className="text-2xl font-bold text-white">How It Works</h2>
              </div>

              {/* Screenshot cards — 4 steps */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { step: 1, label: "Post job",             img: "/Post_job_3.jpg"                    },
                  { step: 2, label: "Tradespeople apply",   img: "/Tradesperson_get_notification.jpeg" },
                  { step: 3, label: "Get replies",          img: "/Find_tradespeople.jpg"              },
                  { step: 4, label: "Compare &amp; hire",   img: "/View_profile.jpeg"                  },
                ].map(item => (
                  <div key={item.step} className="flex flex-col gap-2">
                    {/* Step label — above image */}
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {item.step}
                      </span>
                      <p className="text-lg font-bold text-white leading-tight truncate" dangerouslySetInnerHTML={{ __html: item.label }} />
                    </div>
                    {/* Screenshot */}
                    <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-lg bg-slate-950">
                      <img
                        src={item.img}
                        alt={item.label}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          )}

        </div>
      </section>

      {/* Urgent Job Section — homeowners tab only */}
      {activeTab === "tradespeople" && (
        <section className="py-5 px-4">
          <div className="container mx-auto max-w-lg md:max-w-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-amber-500/20 bg-slate-800/60 px-5 py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">⚡</span>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">Need it done today?</p>
                  <p className="text-slate-400 text-xs mt-0.5">Alert nearby available trades instantly.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <button
                  onClick={handlePostJob}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 fill-white flex-shrink-0" />
                  Post Urgent Job
                </button>
                <button
                  onClick={handleSearch}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors border border-slate-600"
                >
                  <Map className="w-3.5 h-3.5 flex-shrink-0" />
                  View Available
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pricing banner — tradespeople tab only */}
      {activeTab === "jobs" && (
        <section className="py-5 px-4 animate-fade-in">
          <div className="container mx-auto max-w-lg md:max-w-2xl">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-950/40 shadow-lg shadow-emerald-900/20 p-5 sm:p-6">

              {/* Subtle glow orb */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl" />

              {/* Content */}
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">

                {/* Left — badge + headline */}
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60" />
                    <span className="text-emerald-300 text-sm font-bold tracking-wide uppercase">No Subscription required for 6 Months</span>
                  </div>

                  <p className="text-white font-bold leading-tight" style={{ fontSize: 20 }}>
                    Then just <span className="text-emerald-400">£10<span className="text-base font-semibold">/month</span></span> — no lead fees
                  </p>

                  <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                    {["Cancel anytime", "No contracts", "No hidden fees"].map((item) => (
                      <span key={item} className="flex items-center gap-1 text-xs text-slate-400">
                        <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right — CTA */}
                <div className="flex-shrink-0">
                  <button
                    onClick={handlePostJob}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold rounded-xl px-6 py-3 transition-all duration-200 shadow-md shadow-emerald-500/30 text-sm"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    Start Free Today
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mt-1.5">No card needed to start</p>
                </div>

              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comparison Table */}
      <section className="py-10 border-t border-slate-800/50">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-8">
            Why Homeowners Choose{" "}
            <span className="text-emerald-400 text-xl sm:text-2xl whitespace-nowrap">Open Job Market</span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Other platforms column */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
              <div className="text-center text-xs sm:text-sm font-bold text-slate-400 mb-4 pb-3 border-b border-slate-700">Other platforms</div>
              <ul className="space-y-2.5">
                {[
                  "Sell your request as paid leads",
                  "Multiple unwanted sales calls",
                  "Often matched with non-local companies",
                  "Slow quote process",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-red-400 flex-shrink-0 mt-0.5 text-xs">✕</span>
                    <span className="text-slate-400 text-[11px] sm:text-sm leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Open Job Market column */}
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-4">
              <div className="text-center text-xs sm:text-sm font-bold text-emerald-400 mb-4 pb-3 border-b border-emerald-800/50">Open Job Market</div>
              <ul className="space-y-2.5">
                {[
                  "No lead selling — fairer prices",
                  "Connect directly with nearby tradespeople",
                  "Message only — no spam calls",
                  "Uber-style for urgent jobs, Airbnb-style for flexible work",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 flex-shrink-0 mt-0.5 text-xs">✓</span>
                    <span className="text-slate-100 text-[11px] sm:text-sm font-medium leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Page Footer Links */}
      <div className="border-t border-slate-800 pt-5 pb-24 px-4">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-3">
          {[
            { href: "/site-map", label: "Sitemaps" },
            { href: "/about",   label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "/terms",   label: "Terms" },
            { href: "/privacy", label: "Privacy" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600">© 2025 Open Job Market Ltd.</p>
      </div>

      {/* Map Picker Dialog */}
      <Dialog open={showMapPicker} onOpenChange={(open) => {
        if (!open) cancelMapPicker()
      }}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-4xl max-h-[80vh] sm:max-h-[85vh] overflow-y-auto p-3 sm:p-6 bg-slate-900 border-slate-700" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg text-white">Pick Location on Map</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-400">
              Click on the map to select your search location and radius
            </DialogDescription>
          </DialogHeader>

          {/* Radius Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0" />
              <label className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">Search Radius</label>
              <Select value={mapPickerRadius} onValueChange={setMapPickerRadius}>
                <SelectTrigger className="w-28 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm font-medium border-slate-600 bg-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-slate-800 border-slate-600">
                  {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                    <SelectItem key={miles} value={miles.toString()} className="text-white hover:bg-slate-700">
                      {miles} {miles !== 1 ? "miles" : "mile"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mapPickerLocation && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                <span className="font-mono">{mapPickerLocation.lat.toFixed(4)}, {mapPickerLocation.lon.toFixed(4)}</span>
              </div>
            )}
          </div>

          {/* Map Area */}
          <div className="w-full h-[35vh] sm:h-[400px] rounded-lg overflow-hidden border border-slate-700 min-h-[200px]">
            <ProfessionalMap
              key={`map-picker-${mapPickerKey}`}
              professionals={[]}
              center={selectedLocation ? { lat: selectedLocation.lat, lon: selectedLocation.lon } : { lat: 50.8058, lon: -1.0872 }}
              zoom={8}
              height="100%"
              showRadius={!!mapPickerLocation}
              radiusCenter={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
              radiusKm={parseInt(mapPickerRadius) * 1.60934}
              onMapClick={handleMapLocationPick}
              selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
            <div className="text-xs sm:text-sm text-slate-400 text-center sm:text-left mb-2 sm:mb-0 sm:flex-1">
              {mapPickerLocation ? (
                <span className="font-medium text-emerald-400">
                  Location selected! Click "Use This Location" to confirm.
                </span>
              ) : (
                <span>
                  Click on the map to select a location
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-center sm:justify-end">
              <Button onClick={cancelMapPicker} variant="outline" size="sm" className="flex-1 sm:flex-none h-10 border-slate-600 text-slate-300 hover:bg-slate-800">
                Cancel
              </Button>
              <Button
                onClick={confirmMapPickerLocation}
                disabled={!mapPickerLocation}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none h-10"
              >
                Use This Location
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters Dialog */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Search Filters</DialogTitle>
            <DialogDescription className="text-slate-400">
              Refine your search with these filters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Job Type Filter (for Jobs tab) */}
            {activeTab === "jobs" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Job Type</label>
                <Select value={jobType} onValueChange={(value: "trade_jobs" | "vacancies") => setJobType(value)}>
                  <SelectTrigger className="w-full h-10 border-slate-600 bg-slate-800 text-white">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="trade_jobs" className="text-white hover:bg-slate-700">
                      Trade Jobs (Urgent / Nearby)
                    </SelectItem>
                    <SelectItem value="vacancies" className="text-white hover:bg-slate-700">
                      Vacancies (Long-term roles)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {jobType === "trade_jobs"
                    ? "Quick jobs with notifications to nearby tradespeople"
                    : "Permanent or contract positions"}
                </p>
              </div>
            )}

            {/* Distance Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Distance</label>
              <Select value={distance} onValueChange={setDistance}>
                <SelectTrigger className="w-full h-10 border-slate-600 bg-slate-800 text-white">
                  <SelectValue placeholder="Select distance" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {[5, 10, 15, 20, 25, 30, 50, 100].map((miles) => (
                    <SelectItem key={miles} value={miles.toString()} className="text-white hover:bg-slate-700">
                      Within {miles} miles
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trade Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Trade Category</label>
              <Select value={tradeCategory} onValueChange={setTradeCategory}>
                <SelectTrigger className="w-full h-10 border-slate-600 bg-slate-800 text-white">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-[200px]">
                  <SelectItem value="all" className="text-white hover:bg-slate-700">All categories</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry.id} value={industry.id} className="text-white hover:bg-slate-700">
                      {industry.icon} {industry.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency Filter (for Trade Jobs) */}
            {activeTab === "jobs" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Urgency</label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger className="w-full h-10 border-slate-600 bg-slate-800 text-white">
                    <SelectValue placeholder="Any urgency" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">Any urgency</SelectItem>
                    <SelectItem value="urgent" className="text-white hover:bg-slate-700">Urgent (ASAP)</SelectItem>
                    <SelectItem value="this_week" className="text-white hover:bg-slate-700">This week</SelectItem>
                    <SelectItem value="flexible" className="text-white hover:bg-slate-700">Flexible timing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 24/7 Service Filter (for Tradespeople) */}
            {activeTab === "tradespeople" && (
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-white">24/7 Service</label>
                  <p className="text-xs text-slate-400">Only show tradespeople available around the clock</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={is24_7}
                  onClick={() => setIs24_7(!is24_7)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    is24_7 ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      is24_7 ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Spoken Languages Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Spoken Languages</label>
              <div className="relative">
                {/* Selected language or search input */}
                {selectedLanguage !== "all" && !showLanguageSuggestions ? (
                  <div className="flex items-center justify-between h-10 px-3 bg-slate-800 border border-slate-600 rounded-md">
                    <span className="text-white">{selectedLanguage}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLanguage("all")
                        setLanguageSearch("")
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Input
                    ref={languageInputRef}
                    type="text"
                    placeholder="Search languages or select from list..."
                    value={languageSearch}
                    onChange={(e) => {
                      setLanguageSearch(e.target.value)
                      setShowLanguageSuggestions(true)
                    }}
                    onFocus={() => setShowLanguageSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLanguageSuggestions(false), 200)}
                    className="h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                )}

                {/* Language suggestions dropdown */}
                {showLanguageSuggestions && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-emerald-500 rounded-lg shadow-2xl max-h-48 overflow-auto">
                    {/* "Any language" option */}
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-emerald-500/20 text-slate-300 border-b border-slate-700"
                      onClick={() => {
                        setSelectedLanguage("all")
                        setLanguageSearch("")
                        setShowLanguageSuggestions(false)
                      }}
                    >
                      Any language
                    </button>

                    {/* Popular languages header */}
                    {!languageSearch && (
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-900/50">
                        Popular Languages
                      </div>
                    )}

                    {/* Languages list */}
                    {(languageSearch
                      ? allLanguages.filter(lang =>
                          lang.toLowerCase().includes(languageSearch.toLowerCase())
                        )
                      : popularLanguages
                    ).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-emerald-500/20 text-white border-b border-slate-700 last:border-b-0"
                        onClick={() => {
                          setSelectedLanguage(lang)
                          setLanguageSearch("")
                          setShowLanguageSuggestions(false)
                        }}
                      >
                        {lang}
                      </button>
                    ))}

                    {/* No results message */}
                    {languageSearch && allLanguages.filter(lang =>
                      lang.toLowerCase().includes(languageSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-400">
                        No languages found. Try a different search.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Find {activeTab === "tradespeople" ? "tradespeople" : "jobs"} that speak your preferred language
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => {
                setDistance("5")
                setTradeCategory("all")
                setUrgency("all")
                setIs24_7(false)
                setSelectedLanguage("all")
                setLanguageSearch("")
                setJobType("trade_jobs")
              }}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Reset
            </Button>
            <Button
              onClick={applyFiltersAndSearch}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Apply & Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Nav — only for logged-out users; logged-in users use global MobileBottomNav */}
      {!isSignedIn && <MobileBottomNavLanding isSignedIn={isSignedIn} userType={userType} onNavClick={handleNavClick} />}

      {/* Job wizard — opened when homeowner taps a "What do you need help with?" card */}
      {showJobWizard && (
        <div className="fixed inset-0" style={{ zIndex: 60 }}>
          <JobWizardModal
            companyProfile={null}
            userType="homeowner"
            guestMode={!isSignedIn}
            initialIndustry={wizardIndustry}
            initialService={wizardService}
            initialPostcode={heroPostcode.trim() || undefined}
            onClose={() => setShowJobWizard(false)}
          />
        </div>
      )}

      {/* Postcode modal — shown when user taps a category without a postcode entered */}
      <Dialog open={showPostcodeModal} onOpenChange={setShowPostcodeModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white w-[min(360px,calc(100vw-2rem))] p-4 rounded-2xl">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-sm font-bold text-white">Enter your postcode</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-0.5">
              {pendingIndustry ? `Find ${pendingIndustry} specialists near you.` : "Find tradespeople near you."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!modalPostcode.trim()) return
              setShowPostcodeModal(false)
              router.push(`${pendingMapRoute}?postcode=${encodeURIComponent(modalPostcode.trim())}${pendingIndustry ? `&industry=${encodeURIComponent(pendingIndustry)}` : ""}`)
            }}
            className="space-y-3"
          >
            <Input
              value={modalPostcode}
              onChange={e => setModalPostcode(e.target.value)}
              placeholder="e.g. SW1A 1AA"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 h-9 text-sm"
              autoFocus
            />
            <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold h-9 text-sm">
              Find {pendingIndustry ?? "tradespeople"} nearby
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mobile Bottom Navigation for Landing Page (all users)
function MobileBottomNavLanding({
  isSignedIn,
  userType,
  onNavClick
}: {
  isSignedIn: boolean
  userType?: string | null
  onNavClick: (path: string) => void
}) {
  const pathname = usePathname()

  const getDashboardUrl = () => {
    if (!userType) return "/dashboard"
    return `/dashboard/${userType}`
  }

  const getSavedUrl = () => {
    return `/dashboard/${userType || "professional"}/saved`
  }

  const navItems = [
    {
      key: "search",
      icon: Home,
      label: "Search",
      href: "/",
      isActive: pathname === "/" || pathname === "/br",
    },
    {
      key: "messages",
      icon: MessageCircle,
      label: "Messages",
      href: "/messages",
      isActive: pathname?.includes("/messages"),
      requiresAuth: true,
    },
    {
      key: "post",
      icon: Plus,
      label: "Post",
      href: "/jobs/new",
      isActive: pathname?.includes("/jobs/new"),
      isCenter: true,
    },
    {
      key: "saved",
      icon: Briefcase,
      label: "My Jobs",
      href: "/dashboard/professional/applications",
      isActive: pathname?.includes("/applications"),
      requiresAuth: true,
    },
    {
      key: "account",
      icon: isSignedIn ? User : LogIn,
      label: isSignedIn ? "Account" : "Log In",
      href: isSignedIn ? getDashboardUrl() : "/auth/login",
      isActive: pathname?.includes("/dashboard") && !pathname?.includes("/saved"),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900 border-t border-slate-700 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive

          if (item.isCenter) {
            return (
              <button
                key={item.key}
                onClick={() => onNavClick(item.href)}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <span className="text-xs mt-1 text-slate-400 font-medium">
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <button
              key={item.key}
              onClick={() => onNavClick(item.href)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors relative ${
                isActive
                  ? "text-emerald-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-xs mt-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
