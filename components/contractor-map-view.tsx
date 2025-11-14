"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LocationInput } from "@/components/location-input"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import {
  MapPin,
  Search,
  Building,
  Users,
  ExternalLink,
  Filter,
  ChevronDown,
  ArrowLeft,
  Mail,
  User,
  Award,
  Star,
  Map,
  Target,
  X,
  Globe,
  Clock,
  Phone,
  Calendar,
  List,
  Maximize,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import ProfessionalMap from "@/components/professional-map"
import ContractorMap from "@/components/contractor-map"
import { Header } from "@/components/header"

// Category Carousel Component
function CategoryCarousel({ onCategoryClick }: { onCategoryClick: (name: string) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const categories = [
    // Trades
    { name: "Plumber", icon: "🔧", color: "from-blue-500 to-blue-600" },
    { name: "Electrician", icon: "⚡", color: "from-yellow-500 to-orange-500" },
    { name: "Builder", icon: "🏗️", color: "from-orange-500 to-red-500" },
    { name: "Carpenter", icon: "🪵", color: "from-amber-600 to-amber-700" },
    { name: "Painter", icon: "🖌️", color: "from-purple-500 to-pink-500" },
    { name: "Roofer", icon: "🏘️", color: "from-gray-600 to-gray-700" },
    { name: "Gardener", icon: "🌿", color: "from-green-500 to-emerald-600" },
    { name: "Cleaner", icon: "✨", color: "from-cyan-500 to-blue-500" },
    { name: "Handyman", icon: "🔨", color: "from-indigo-500 to-indigo-600" },
    { name: "Locksmith", icon: "🔑", color: "from-red-500 to-red-600" },
    { name: "Bathrooms", icon: "🛁", color: "from-teal-500 to-teal-600" },
    { name: "Tiler", icon: "◼️", color: "from-slate-500 to-slate-600" },
    { name: "Heating", icon: "♨️", color: "from-rose-500 to-rose-600" },
    { name: "Gas Boiler", icon: "🔥", color: "from-orange-600 to-orange-700" },
    { name: "Plasterer", icon: "🧱", color: "from-stone-500 to-stone-600" },
    { name: "Driveways", icon: "🛤️", color: "from-zinc-500 to-zinc-600" },
    { name: "Fencing", icon: "⬛", color: "from-lime-600 to-lime-700" },
    { name: "Tree Surgeon", icon: "🌲", color: "from-emerald-600 to-emerald-700" },
    { name: "Windows/Doors", icon: "🪟", color: "from-sky-500 to-sky-600" },
    { name: "Mechanic", icon: "🔩", color: "from-gray-500 to-gray-600" },
    { name: "Flooring", icon: "📐", color: "from-brown-500 to-amber-600" },
    { name: "Kitchen Fitter", icon: "🍽️", color: "from-orange-400 to-red-500" },
    { name: "HVAC", icon: "🌡️", color: "from-blue-400 to-cyan-500" },
    { name: "Glazier", icon: "🪞", color: "from-sky-400 to-blue-500" },
    { name: "Decorator", icon: "🎨", color: "from-pink-400 to-purple-500" },
    { name: "Bricklayer", icon: "🧱", color: "from-red-600 to-orange-600" },
    { name: "Scaffolder", icon: "🏗️", color: "from-gray-500 to-slate-600" },
    { name: "Welder", icon: "⚡", color: "from-yellow-600 to-orange-600" },

    // Tech & IT
    { name: "Developer", icon: "💻", color: "from-blue-600 to-indigo-600" },
    { name: "Software Engineer", icon: "⚙️", color: "from-indigo-600 to-purple-600" },
    { name: "Web Designer", icon: "🎨", color: "from-pink-500 to-rose-500" },
    { name: "Designer", icon: "✏️", color: "from-violet-500 to-purple-500" },
    { name: "AI Specialist", icon: "🤖", color: "from-cyan-600 to-blue-600" },
    { name: "IT Support", icon: "🖥️", color: "from-blue-500 to-cyan-500" },
    { name: "Data Analyst", icon: "📊", color: "from-green-600 to-teal-600" },
    { name: "Cybersecurity", icon: "🔒", color: "from-red-600 to-pink-600" },
    { name: "DevOps", icon: "🔄", color: "from-purple-600 to-indigo-600" },

    // Healthcare
    { name: "Nurse", icon: "👩‍⚕️", color: "from-red-400 to-pink-400" },
    { name: "Carer", icon: "🤝", color: "from-green-400 to-emerald-500" },
    { name: "Doctor", icon: "🩺", color: "from-blue-400 to-cyan-400" },
    { name: "Pharmacist", icon: "💊", color: "from-green-500 to-emerald-600" },
    { name: "Dentist", icon: "🦷", color: "from-sky-400 to-blue-500" },

    // Professional Services
    { name: "Administrator", icon: "📋", color: "from-slate-600 to-gray-600" },
    { name: "Accountant", icon: "💰", color: "from-green-600 to-teal-600" },
    { name: "Marketing", icon: "📢", color: "from-orange-500 to-amber-500" },
    { name: "Sales", icon: "💼", color: "from-blue-500 to-sky-500" },
    { name: "HR Manager", icon: "👥", color: "from-purple-500 to-violet-500" },
    { name: "Lawyer", icon: "⚖️", color: "from-gray-700 to-slate-700" },
    { name: "Teacher", icon: "📚", color: "from-amber-500 to-yellow-500" },
    { name: "Recruiter", icon: "🎯", color: "from-indigo-500 to-purple-500" },
    { name: "Consultant", icon: "💡", color: "from-yellow-500 to-orange-500" },
    { name: "Architect", icon: "📐", color: "from-slate-600 to-gray-700" },

    // Other Services
    { name: "Chef", icon: "👨‍🍳", color: "from-red-500 to-orange-500" },
    { name: "Driver", icon: "🚗", color: "from-blue-400 to-cyan-400" },
    { name: "Warehouse", icon: "📦", color: "from-orange-600 to-red-600" },
    { name: "Security", icon: "🛡️", color: "from-slate-700 to-zinc-700" },
    { name: "Photographer", icon: "📷", color: "from-purple-400 to-pink-500" },
    { name: "Barber", icon: "✂️", color: "from-red-500 to-pink-500" },
    { name: "Personal Trainer", icon: "💪", color: "from-orange-500 to-red-500" },
    { name: "Event Planner", icon: "🎉", color: "from-pink-500 to-purple-500" },
  ]

  const itemsPerRow = 8 // Show 8 items per row
  const itemsToShow = itemsPerRow * 2 // 2 rows
  const maxIndex = Math.max(0, Math.ceil(categories.length / itemsPerRow) - 2)

  const handlePrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
  }

  const handleNext = () => {
    setCurrentIndex(Math.min(maxIndex, currentIndex + 1))
  }

  const visibleCategories = categories.slice(currentIndex * itemsPerRow, currentIndex * itemsPerRow + itemsToShow)

  return (
    <div className="relative mx-auto flex items-center gap-1">
      {/* Left Arrow */}
      <Button
        onClick={handlePrev}
        disabled={currentIndex === 0}
        className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed p-0"
        variant="outline"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* Categories Container - 2 Rows */}
      <div className="flex-1 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-0.5">
        {visibleCategories.map((category) => (
          <button
            key={category.name}
            onClick={() => onCategoryClick(category.name)}
            className={`group relative overflow-hidden rounded-lg p-0.5 bg-gradient-to-br ${category.color} text-white shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 aspect-square max-w-[100px]`}
          >
            <div className="flex flex-col items-center justify-center text-center h-full gap-0.5">
              <div className="flex items-center justify-center flex-shrink-0">
                <span className="text-4xl sm:text-5xl drop-shadow-lg leading-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{category.icon}</span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold drop-shadow-md leading-tight line-clamp-2 px-1">{category.name}</span>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      <Button
        onClick={handleNext}
        disabled={currentIndex >= maxIndex}
        className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed p-0"
        variant="outline"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  )
}

interface Contractor {
  id: string
  user_id: string
  type: 'professional' | 'company'
  name: string
  display_name: string
  description: string
  location: string
  latitude?: number
  longitude?: number
  photo_url?: string
  spoken_languages?: string[]
  skills?: string[]
  created_at: string
  rating?: number | null
  reviewCount?: number
  // Professional specific
  title?: string
  is_self_employed?: boolean
  ready_to_relocate?: boolean
  // Company specific
  company_name?: string
  industry?: string
  service_24_7?: boolean
}

interface ContractorMapViewProps {
  contractors: Contractor[]
  user: any | null
  searchParams: {
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
  }
  center: [number, number]
}

export default function ContractorMapView({
  contractors,
  user,
  searchParams,
  center,
}: ContractorMapViewProps) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [locationFilter, setLocationFilter] = useState(searchParams.location || "")
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lon: number } | null>(
    searchParams.lat && searchParams.lng
      ? { lat: parseFloat(searchParams.lat), lon: parseFloat(searchParams.lng) }
      : null
  )
  const [skillsFilter, setSkillsFilter] = useState(searchParams.skills || "")
  const [languageFilter, setLanguageFilter] = useState(searchParams.language || "")
  const [selfEmployedFilter, setSelfEmployedFilter] = useState(searchParams.self_employed === "true")
  const [companyFilter, setCompanyFilter] = useState(searchParams.company === "true")
  const [service24_7Filter, setService24_7Filter] = useState(searchParams.service_24_7 === "true")
  const [radius, setRadius] = useState("25")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [showContractorDetails, setShowContractorDetails] = useState(false)
  const [expandedContractorId, setExpandedContractorId] = useState<string | null>(null)

  // Full-screen map mode state
  const [isFullScreenMode, setIsFullScreenMode] = useState(false)

  // View toggle state (for mobile - list vs map)
  const [activeView, setActiveView] = useState<"list" | "map">("map")

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [mapPickerRadius, setMapPickerRadius] = useState("10")
  const [mapPickerKey, setMapPickerKey] = useState(0)

  // No results message state
  const [showNoResultsMessage, setShowNoResultsMessage] = useState(true)

  // Map resize trigger
  const [mapResizeTrigger, setMapResizeTrigger] = useState(0)

  // Refs for contractor cards to enable scrolling
  const contractorCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Auto-scroll to selected contractor card when selected from map
  useEffect(() => {
    if (selectedContractor && contractorCardRefs.current[selectedContractor.id]) {
      const cardElement = contractorCardRefs.current[selectedContractor.id]
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedContractor])

  // Reset "no results" message when contractors change
  useEffect(() => {
    setShowNoResultsMessage(true)
  }, [contractors])

  // Automatically enable full-screen mode when there are search parameters
  useEffect(() => {
    const hasSearchParams = !!(
      searchParams.search ||
      searchParams.location ||
      searchParams.lat ||
      searchParams.lng ||
      searchParams.self_employed ||
      searchParams.company ||
      searchParams.language ||
      searchParams.service_24_7 ||
      searchParams.skills
    )
    setIsFullScreenMode(hasSearchParams)
  }, [searchParams])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (locationFilter) params.set("location", locationFilter)
    if (selectedLocationCoords) {
      params.set("lat", selectedLocationCoords.lat.toString())
      params.set("lng", selectedLocationCoords.lon.toString())
    }
    if (skillsFilter) params.set("skills", skillsFilter)
    if (languageFilter) params.set("language", languageFilter)
    if (selfEmployedFilter) params.set("self_employed", "true")
    if (companyFilter) params.set("company", "true")
    if (service24_7Filter) params.set("service_24_7", "true")
    router.push(`/contractors?${params.toString()}`)
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
    setSelfEmployedFilter(false)
    setCompanyFilter(false)
    setService24_7Filter(false)
    router.push("/contractors")
  }

  const handleMapPickerClick = () => {
    console.log('[CONTRACTOR-MAP-VIEW] Map picker button clicked')
    console.log('[CONTRACTOR-MAP-VIEW] Current state:', {
      showMapPicker,
      isFullScreenMode,
      hasSearchParams: !!(searchParams.search || searchParams.location || searchParams.lat || searchParams.lng),
      searchParams
    })
    setMapPickerKey(prev => prev + 1) // Force new map instance
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

      // Automatically trigger search after location is selected
      const params = new URLSearchParams()
      if (searchTerm) params.set("search", searchTerm)
      params.set("lat", mapPickerLocation.lat.toString())
      params.set("lng", mapPickerLocation.lon.toString())
      params.set("location", mapPickerLocation.name)
      if (mapPickerRadius) params.set("radius", mapPickerRadius)
      router.push(`/contractors?${params.toString()}`)
    }
  }

  const cancelMapPicker = () => {
    setShowMapPicker(false)
    setMapPickerLocation(null)
    setMapPickerRadius("10")
  }

  const handleRadiusChange = (value: string) => {
    console.log('[CONTRACTOR-MAP-VIEW] Radius changed to:', value)
    setMapPickerRadius(value)
  }

  const handleSendInquiry = async (contractorId: string, contractorName: string) => {
    // Navigate to direct message conversation with contractor
    const contractor = contractors.find(c => c.id === contractorId)
    if (contractor) {
      console.log('[CONTRACTOR-MAP-VIEW] Opening conversation with:', {
        contractorId,
        contractorName,
        userId: contractor.user_id,
        type: contractor.type
      })
      // Navigate directly to conversation page with the contractor's user_id
      router.push(`/messages/${contractor.user_id}`)
    }
  }

  const handleViewProfile = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId)
    if (contractor) {
      if (contractor.type === 'professional') {
        router.push(`/professionals/${contractorId}`)
      } else {
        // For companies, navigate to company profile view
        router.push(`/companies/${contractorId}`)
      }
    }
  }

  const getInitials = (contractor: Contractor) => {
    if (contractor.type === 'professional') {
      return contractor.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    } else {
      return contractor.company_name?.slice(0, 2).toUpperCase() || "CO"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Matching Main Page */}
      {!isFullScreenMode && (
      <section
        className="relative py-3 sm:py-4 md:py-6 overflow-hidden"
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
            {/* Page Header */}
            <div className="text-center mb-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-500 mb-2">
                Find Tradespeople
              </h1>
            </div>

            {/* Enhanced Search Component */}
            <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 shadow-xl border border-white/10">
              <h2 className="text-sm sm:text-base md:text-xl font-bold text-white mb-3 sm:mb-4 md:mb-6 text-center">
                Search tradespeople worldwide with advanced filters
              </h2>

              {/* Main Search Inputs */}
              <div className="flex flex-col sm:flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. Electrician, Plumber, Web Developer, Company name"
                    className="h-10 md:h-12 text-sm md:text-base px-3 md:px-4 bg-white border-0 focus:ring-2 focus:ring-orange-500/30 rounded-lg font-medium placeholder:text-gray-500 shadow-md"
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
                    className="h-10 md:h-12 px-3 md:px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    title="Pick location on map"
                  >
                    <Map className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </div>

              {/* Search Button */}
              <div className="mb-4">
                <Button
                  onClick={handleSearch}
                  className="w-full h-10 md:h-12 text-sm md:text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01]"
                >
                  <Search className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  Search Contractors
                </Button>
              </div>

              {/* Advanced Filters - Dropdown Section */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div
                  className="flex items-center cursor-pointer mb-3"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 text-white mr-2" />
                  <span className="text-white font-medium">Advanced Filters</span>
                  <ChevronDown className={`h-4 w-4 text-white ml-auto transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                </div>

                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Contractor Type */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Contractor Type</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="selfEmployed"
                            checked={selfEmployedFilter}
                            onChange={(e) => setSelfEmployedFilter(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <label htmlFor="selfEmployed" className="text-white text-sm">
                            Self-employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="company"
                            checked={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <label htmlFor="company" className="text-white text-sm">
                            Company
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">Language</label>
                      <Input
                        placeholder="e.g. Spanish, French"
                        value={languageFilter}
                        onChange={(e) => setLanguageFilter(e.target.value)}
                        className="h-10 text-sm bg-white border-0 rounded-lg"
                      />
                    </div>

                    {/* Service Options */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Service Options</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="service24_7"
                          checked={service24_7Filter}
                          onChange={(e) => setService24_7Filter(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <label htmlFor="service24_7" className="text-white text-sm">
                          24/7 Service
                        </label>
                      </div>
                    </div>

                    {/* Search Radius */}
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-white text-sm font-medium mb-1">Search Radius</label>
                      <Select value={radius} onValueChange={setRadius}>
                        <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 miles</SelectItem>
                          <SelectItem value="20">20 miles</SelectItem>
                          <SelectItem value="25">25 miles</SelectItem>
                          <SelectItem value="50">50 miles</SelectItem>
                          <SelectItem value="100">100 miles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters */}
                    <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full h-10 text-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Browse Popular Categories Section - Always show when not in fullscreen */}
      {!isFullScreenMode && (
      <section className="py-0 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-1 sm:px-2">
          <div className="text-center mb-2">
            <h2 className="text-lg md:text-xl font-bold">
              Browse Our Most Popular Categories
            </h2>
          </div>

          <CategoryCarousel
            onCategoryClick={(categoryName) => {
              setSearchTerm(categoryName)
              setShowMapPicker(true)
            }}
          />
        </div>
      </section>
      )}

      {/* Map and Contractor List Section - Hidden on landing page, only shown in fullscreen mode */}
      {false && (
        <section className="py-6 sm:py-12 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
            {/* Map Section */}
            <div className="flex-1 lg:order-2">
              <Card className="h-[500px] lg:h-[600px] overflow-hidden shadow-xl border-0 rounded-xl">
                <CardContent className="p-0 h-full relative">
                  <ContractorMap
                    key="normal-map"
                    contractors={contractors}
                    center={center}
                    selectedContractor={selectedContractor}
                    onContractorSelect={(contractor: any) => {
                      setSelectedContractor(contractor)
                      setShowContractorDetails(true)
                    }}
                    showMapPicker={showMapPicker}
                    onMapPick={handleMapLocationPick}
                    mapPickerLocation={mapPickerLocation}
                    onConfirmLocation={confirmMapPickerLocation}
                    onCancelMapPicker={() => {
                      setShowMapPicker(false)
                      setMapPickerLocation(null)
                    }}
                  />
                  {/* Results Counter Overlay */}
                  <div className="absolute top-4 left-4 z-10">
                    <div className="bg-white rounded-lg shadow-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-lg">
                          {contractors.length === 0 && !(searchParams.search || searchParams.location)
                            ? "Search to find contractors"
                            : `${contractors.length} Contractor${contractors.length !== 1 ? "s" : ""} Found`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Contractor List or Profile Display */}
            <div className="w-full lg:w-96 lg:order-1">
              <Card className="h-[500px] lg:h-[600px] overflow-hidden shadow-xl border-0 rounded-xl">
                {showContractorDetails && selectedContractor ? (
                  /* Contractor Details */
                  <>
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowContractorDetails(false)
                            setSelectedContractor(null)
                          }}
                          className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back to Contractors
                        </Button>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Contractor Details</h2>
                      <p className="text-sm text-gray-600">Complete professional information</p>
                    </div>

                    <div className="h-full overflow-y-auto p-4">
                      {/* Contractor Header */}
                      <div className="text-center mb-6">
                        <Avatar className="h-20 w-20 mx-auto mb-3">
                          {selectedContractor?.photo_url ? (
                            <img
                              src={selectedContractor!.photo_url}
                              alt={selectedContractor!.display_name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <AvatarFallback className="bg-orange-100 text-orange-600 text-2xl font-bold">
                              {getInitials(selectedContractor!)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {selectedContractor?.display_name}
                        </h3>
                        {selectedContractor?.type === 'professional' && selectedContractor!.title && (
                          <p className="text-gray-600 mb-2">
                            {selectedContractor!.title}
                          </p>
                        )}
                        {selectedContractor?.type === 'company' && selectedContractor!.industry && (
                          <p className="text-gray-600 mb-2">
                            {selectedContractor!.industry}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-4 w-4" />
                          {selectedContractor!.location}
                        </div>
                      </div>

                      {/* Contractor Details */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Contractor Information
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {selectedContractor!.type === 'professional' ? 'Individual' : 'Company'}
                              </Badge>
                              {selectedContractor!.type === 'professional' && selectedContractor!.is_self_employed && (
                                <Badge variant="outline" className="text-xs">
                                  Self-Employed
                                </Badge>
                              )}
                              {selectedContractor!.type === 'company' && selectedContractor!.service_24_7 && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  24/7 Service
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {selectedContractor!.description && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                              {selectedContractor!.description}
                            </p>
                          </div>
                        )}

                        {/* Skills/Services */}
                        {(selectedContractor?.skills?.length ?? 0) > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              Skills & Services
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {selectedContractor!.skills!.map((skill: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Languages */}
                        {(selectedContractor?.spoken_languages?.length ?? 0) > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Languages
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {selectedContractor!.spoken_languages!.map((language: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {language}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contact Actions */}
                        <div className="pt-4 space-y-2">
                          <Button
                            className="w-full bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleSendInquiry(selectedContractor!.id, selectedContractor!.name)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact Contractor
                          </Button>
                          <Button variant="outline" className="w-full" onClick={() => handleViewProfile(selectedContractor!.id)}>
                            <User className="h-4 w-4 mr-2" />
                            View Full Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Contractor List */
                  <>
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
                      <h2 className="text-lg font-semibold text-gray-900">Available Contractors</h2>
                      <p className="text-sm text-gray-600">Click on a contractor to see more details</p>
                    </div>

                    <div className="h-full overflow-y-auto">
                      {contractors.length > 0 ? (
                        <div className="space-y-1">
                          {contractors.map((contractor) => (
                            <div
                              key={contractor.id}
                              className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                                selectedContractor?.id === contractor.id ? "bg-orange-50 border-orange-200" : ""
                              }`}
                              onClick={() => {
                                setSelectedContractor(contractor)
                                setShowContractorDetails(true)
                              }}
                            >
                              <div className="flex items-start space-x-3">
                                <Avatar className="h-12 w-12 shrink-0">
                                  {contractor.photo_url ? (
                                    <img
                                      src={contractor.photo_url}
                                      alt={contractor.display_name}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <AvatarFallback>{getInitials(contractor)}</AvatarFallback>
                                  )}
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm truncate text-gray-900">
                                    {contractor.display_name}
                                  </h3>

                                  {contractor.type === 'professional' && contractor.title && (
                                    <p className="text-xs text-gray-600 truncate">
                                      {contractor.title}
                                    </p>
                                  )}

                                  {contractor.type === 'company' && contractor.industry && (
                                    <p className="text-xs text-gray-600 truncate">
                                      {contractor.industry}
                                    </p>
                                  )}

                                  <div className="flex items-center mt-1 text-xs text-gray-500">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    <span className="truncate">{contractor.location}</span>
                                  </div>

                                  <div className="flex flex-wrap gap-1 mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {contractor.type === 'professional' ? 'Individual' : 'Company'}
                                    </Badge>

                                    {contractor.type === 'professional' && contractor.is_self_employed && (
                                      <Badge variant="outline" className="text-xs">
                                        Self-Employed
                                      </Badge>
                                    )}

                                    {contractor.type === 'company' && contractor.service_24_7 && (
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        24/7
                                      </Badge>
                                    )}

                                    {contractor.spoken_languages && contractor.spoken_languages.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <Globe className="h-3 w-3 mr-1" />
                                        {contractor.spoken_languages.length}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No contractors found</h3>
                          <p className="text-gray-600 mb-4">
                            Try adjusting your search criteria or location filters.
                          </p>
                          <Button variant="outline" onClick={clearFilters}>
                            Clear all filters
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
            </div>
          </div>
        </section>
      )}

      {/* Success Stories Section */}
      {!isFullScreenMode && (
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-balance">
              Success Stories
            </h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto text-pretty px-2">
              Real results from homeowners who found the perfect tradesperson through our platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg rounded-xl">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop"
                  alt="Home renovation completed"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  This Week
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">
                  Sarah's Kitchen Renovation
                </h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "Found a fantastic local plumber within minutes. The map made it so easy to see who was nearby. Job completed on time and under budget!"
                </p>
                <div className="flex items-center text-orange-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">🔧</span>
                  <span>Project completed</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg rounded-xl">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop"
                  alt="Electrician at work"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  Yesterday
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">John's Electrical Work</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "The category search helped me find certified electricians in my area. Very professional service and great communication!"
                </p>
                <div className="flex items-center text-blue-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">⚡</span>
                  <span>Fast & reliable</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg rounded-xl">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=400&fit=crop"
                  alt="Home construction"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  Last Week
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">Emma's Garden Project</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "Discovered an amazing local builder just streets away. The map view helped me find someone I could trust nearby."
                </p>
                <div className="flex items-center text-green-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">🏡</span>
                  <span>Local & trusted</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
      )}

      {/* Full-Screen Map Mode */}
      {isFullScreenMode && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Site Header */}
          <Header user={user} />

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
                  placeholder="e.g. Electrician, Plumber, Web Developer"
                  className="h-12 flex-1 bg-white/95 shadow-lg border-2 font-medium text-base"
                />

                {/* Location Input */}
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
                    className="h-12 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    title="Pick location on map"
                  >
                    <Map className="h-5 w-5" />
                  </Button>
                </div>

                {/* Radius Select */}
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger className="w-32 h-12">
                    <SelectValue placeholder="Radius" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 25, 50, 100].map((miles) => (
                      <SelectItem key={miles} value={miles.toString()}>
                        {miles} miles
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Search Button */}
                <Button
                  onClick={handleSearch}
                  className="bg-orange-500 hover:bg-orange-600 shrink-0 h-12 px-6"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>

                {/* Filters Dropdown Button */}
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="shrink-0 h-12 px-4"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                </Button>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsFullScreenMode(false)
                    setShowAdvancedFilters(false)
                  }}
                  className="shrink-0 h-12"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Advanced Filters Dropdown */}
              {showAdvancedFilters && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Language */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <Input
                        value={languageFilter}
                        onChange={(e) => setLanguageFilter(e.target.value)}
                        placeholder="e.g., English, Spanish"
                        className="h-10"
                      />
                    </div>

                    {/* Contractor Type Checkboxes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contractor Type</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="selfEmployed"
                            checked={selfEmployedFilter}
                            onChange={(e) => setSelfEmployedFilter(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <label htmlFor="selfEmployed" className="text-sm text-gray-700">
                            Self-employed
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="company"
                            checked={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <label htmlFor="company" className="text-sm text-gray-700">
                            Company
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Service Options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Options</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="service24_7"
                          checked={service24_7Filter}
                          onChange={(e) => setService24_7Filter(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <label htmlFor="service24_7" className="text-sm text-gray-700">
                          24/7 Service
                        </label>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full h-10"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fullscreen Map with Resizable Panels */}
          <PanelGroup direction="horizontal" className="flex-1">
            {/* Map Panel */}
            <Panel defaultSize={60} minSize={30}>
              <div className="h-full relative">
                <ProfessionalMap
                  key="fullscreen-map"
                  professionals={contractors
                    .filter(c => c.latitude && c.longitude)
                    .map(c => ({
                      id: c.id,
                      name: c.display_name,
                      first_name: c.name.split(' ')[0] || '',
                      last_name: c.name.split(' ')[1] || '',
                      title: c.title || c.industry || 'Contractor',
                      location: c.location,
                      coordinates: { lat: c.latitude!, lon: c.longitude! },
                      skills: c.skills || [],
                      experience: '',
                      avatar: c.photo_url || '',
                      profile_photo_url: c.photo_url || '',
                      isAvailable: true,
                      user_id: c.user_id
                    }))}
                  center={{ lat: center[0], lon: center[1] }}
                  zoom={10}
                  height="100%"
                  user={user}
                  selectedProfessionalId={selectedContractor?.id}
                  onProfileSelect={(profile) => {
                    const contractor = contractors.find(c => c.id === profile.id)
                    if (contractor) {
                      // Toggle: if clicking the same contractor, deselect it
                      if (selectedContractor?.id === contractor.id) {
                        setSelectedContractor(null)
                        setExpandedContractorId(null)
                      } else {
                        setSelectedContractor(contractor)
                        setExpandedContractorId(contractor.id)
                      }
                    }
                  }}
                />

                {/* Results Counter or No Results Message */}
                {contractors.length > 0 ? (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl px-4 py-2 z-[1000] border-2 border-green-500">
                    <p className="text-sm font-medium">
                      {contractors.length} {contractors.length !== 1 ? 'tradespeople' : 'tradesperson'} found
                    </p>
                  </div>
                ) : showNoResultsMessage ? (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl px-6 py-3 z-[1000] border-2 border-orange-500 max-w-md">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNoResultsMessage(false)}
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="text-center space-y-1">
                        <p className="text-base font-bold text-gray-900">No Tradespeople Found</p>
                        <p className="text-sm text-gray-600">
                          No tradespeople found in your selected location. Try increasing the search radius.
                        </p>
                        <p className="text-xs text-gray-500">
                          Current search radius: {radius || '10'} miles
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-orange-400 transition-colors cursor-col-resize" />

            {/* Results List Panel */}
            <Panel defaultSize={40} minSize={25}>
              <div className="h-full overflow-y-auto bg-gray-50 p-4" id="contractors-list">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {contractors.length} {contractors.length !== 1 ? 'Tradespeople' : 'Tradesperson'} Found
                  </h3>

                  {contractors.map((contractor) => {
                    const isExpanded = expandedContractorId === contractor.id
                    const isSelected = selectedContractor?.id === contractor.id

                    return (
                      <Card
                        key={contractor.id}
                        ref={(el) => {
                          contractorCardRefs.current[contractor.id] = el
                        }}
                        className={`hover:shadow-lg transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-orange-500 shadow-xl' : ''
                        }`}
                        onClick={() => {
                          // Toggle: if clicking the same contractor, deselect/collapse it
                          if (selectedContractor?.id === contractor.id && isExpanded) {
                            setSelectedContractor(null)
                            setExpandedContractorId(null)
                          } else {
                            setSelectedContractor(contractor)
                            setExpandedContractorId(contractor.id)
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <Avatar className="h-16 w-16 shrink-0">
                              {contractor.photo_url && <AvatarImage src={contractor.photo_url} alt={contractor.name} />}
                              <AvatarFallback className="bg-orange-100 text-orange-600 text-lg">
                                {contractor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 truncate">{contractor.name}</h4>
                                  {contractor.title && (
                                    <p className="text-sm text-gray-600">{contractor.title}</p>
                                  )}
                                  {contractor.industry && !contractor.title && (
                                    <p className="text-sm text-gray-600">{contractor.industry}</p>
                                  )}
                                </div>
                                <Badge variant={contractor.type === 'company' ? 'default' : 'secondary'} className="shrink-0">
                                  {contractor.type === 'company' ? 'Company' : 'Professional'}
                                </Badge>
                              </div>

                              {/* Rating and Reviews */}
                              {contractor.rating !== null && contractor.rating !== undefined && contractor.reviewCount !== undefined && contractor.reviewCount > 0 && (
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-4 w-4 ${
                                          star <= Math.round(contractor.rating!)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {contractor.rating.toFixed(1)} ({contractor.reviewCount} {contractor.reviewCount === 1 ? 'review' : 'reviews'})
                                  </span>
                                </div>
                              )}

                              {/* Description - Always show if not expanded, full if expanded */}
                              {contractor.description && (
                                <p className={`text-sm text-gray-600 mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {contractor.description}
                                </p>
                              )}

                              {/* Location */}
                              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span className="truncate">{contractor.location}</span>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="mt-4 space-y-3 pt-3 border-t">
                                  {/* Type and Employment Status */}
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Contractor Information
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {contractor.type === 'professional' ? 'Individual' : 'Company'}
                                      </Badge>
                                      {contractor.type === 'professional' && contractor.is_self_employed && (
                                        <Badge variant="outline" className="text-xs">
                                          Self-Employed
                                        </Badge>
                                      )}
                                      {contractor.type === 'company' && contractor.service_24_7 && (
                                        <Badge variant="outline" className="text-xs">
                                          <Clock className="h-3 w-3 mr-1" />
                                          24/7 Service
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* All Skills/Services when expanded */}
                                  {contractor.skills && contractor.skills.length > 0 && (
                                    <div>
                                      <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <Award className="h-4 w-4" />
                                        Skills & Services
                                      </h5>
                                      <div className="flex flex-wrap gap-1">
                                        {contractor.skills.map((skill, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* All Languages when expanded */}
                                  {contractor.spoken_languages && contractor.spoken_languages.length > 0 && (
                                    <div>
                                      <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        Languages
                                      </h5>
                                      <div className="flex flex-wrap gap-1">
                                        {contractor.spoken_languages.map((lang, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {lang}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Collapsed Preview */}
                              {!isExpanded && (
                                <>
                                  {/* Languages */}
                                  {contractor.spoken_languages && contractor.spoken_languages.length > 0 && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <Globe className="h-4 w-4 text-gray-500 shrink-0" />
                                      <div className="flex flex-wrap gap-1">
                                        {contractor.spoken_languages.slice(0, 3).map((lang, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {lang}
                                          </Badge>
                                        ))}
                                        {contractor.spoken_languages.length > 3 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{contractor.spoken_languages.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Services/Skills */}
                                  {contractor.skills && contractor.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {contractor.skills.slice(0, 4).map((skill, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {skill}
                                        </Badge>
                                      ))}
                                      {contractor.skills.length > 4 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{contractor.skills.length - 4} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {/* Availability - 24/7 Service */}
                                  {contractor.service_24_7 && (
                                    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700 mb-2">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Available 24/7
                                    </Badge>
                                  )}
                                </>
                              )}

                              {/* Action Buttons */}
                              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewProfile(contractor.id)}
                                  className="flex-1"
                                >
                                  View Full Profile
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSendInquiry(contractor.id, contractor.name)}
                                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  Contact
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      )}


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
                center={{ lat: center[0], lon: center[1] }}
                zoom={8}
                height="100%"
                showRadius={!!mapPickerLocation}
                radiusCenter={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
                radiusKm={parseInt(mapPickerRadius) * 1.60934}
                onMapClick={handleMapLocationPick}
                selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
              />

              {/* Radius Control Overlay - Top of Map */}
              <div className="absolute top-4 right-4 z-[10000]">
                <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-emerald-500">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <label className="text-sm font-semibold text-gray-900 whitespace-nowrap">Search Radius:</label>
                    <Select value={mapPickerRadius} onValueChange={handleRadiusChange}>
                      <SelectTrigger className="w-28 h-9 text-sm font-medium border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] z-[10001]">
                        {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                          <SelectItem key={miles} value={miles.toString()}>
                            {miles} mile{miles !== 1 ? 's' : ''}
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
    </div>
  )
}