"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LocationInput } from "@/components/location-input"
import { Header } from "@/components/header"
import { StarRating } from "@/components/star-rating"
import Image from "next/image"
import {
  Briefcase,
  MapPin,
  Search,
  Building,
  Calendar,
  DollarSign,
  Users,
  Heart,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Mail,
  Phone,
  Download,
  User,
  Award,
  Star,
  Map,
  Target,
  X,
  List,
  Maximize,
  BookmarkIcon,
  MessageCircle,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import JobMap from "@/components/job-map"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { createClient } from "@/lib/client"

interface Job {
  id: string
  title: string
  description: string
  short_description?: string
  long_description?: string
  job_type: string
  experience_level: string
  work_location: string
  location: string
  full_address?: string
  latitude?: number
  longitude?: number
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  applications_count: number
  created_at: string
  company_profiles?: {
    company_name: string
    location: string
    industry: string
    logo_url?: string
    user_id: string
  }
  company_rating?: {
    average_rating: number
    total_reviews: number
  } | null
  poster_type?: 'company' | 'individual'
  poster_first_name?: string
  poster_last_name?: string
  poster_logo_url?: string
}

interface User {
  id: string
  email: string
}

interface JobMapViewProps {
  jobs: Job[]
  user: User | null
  searchParams: {
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
    posted?: string
    trainingProvided?: string
  }
  center: [number, number]
  categoriesSection?: React.ReactNode
  basePath?: string // e.g., '/jobs' or '/tasks'
  warningMessage?: string
}

export default function JobMapView({ jobs, user, searchParams, center, categoriesSection, basePath = '/jobs', warningMessage }: JobMapViewProps) {
  const router = useRouter()
  const urlSearchParams = useSearchParams()

  // Check if this is saved jobs view
  const isSavedJobsView = searchParams.saved === 'true'

  // Search state
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [location, setLocation] = useState(searchParams.location || "")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(
    searchParams.lat && searchParams.lng
      ? { lat: Number.parseFloat(searchParams.lat), lon: Number.parseFloat(searchParams.lng) }
      : null
  )
  const [salaryMin, setSalaryMin] = useState(searchParams.salaryMin || "")
  const [salaryMax, setSalaryMax] = useState(searchParams.salaryMax || "")
  const [radius, setRadius] = useState(searchParams.radius || "25")
  const [trainingProvided, setTrainingProvided] = useState(searchParams.trainingProvided === "true")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchError, setSearchError] = useState("")

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [mapPickerRadius, setMapPickerRadius] = useState("10")

  // Profile state
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [showProfileDetails, setShowProfileDetails] = useState(false)

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>(center)
  const [mapZoom, setMapZoom] = useState(
    searchParams.lat && searchParams.lng
      ? 12 // Coordinates provided - zoom in most
      : searchParams.location && searchParams.location.trim()
      ? 10 // Location provided but no coordinates - zoom in moderately
      : 6  // No location - default zoom
  )
  const [mapKey, setMapKey] = useState(Date.now())

  // Full-screen map mode state
  const [isFullScreenMode, setIsFullScreenMode] = useState(false)

  // View toggle state (for mobile - list vs map)
  const [activeView, setActiveView] = useState<"list" | "map">("map")

  // Selected job state (for pin expansion)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Expanded jobs state (for show more/less description)
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())

  // Sign-up dialog state
  const [showSignUpDialog, setShowSignUpDialog] = useState(false)

  // User type state
  const [userType, setUserType] = useState<string | null>(null)

  // Refs for scrolling to selected jobs
  const jobCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Scroll to selected job when it changes
  useEffect(() => {
    if (selectedJobId && jobCardRefs.current[selectedJobId]) {
      jobCardRefs.current[selectedJobId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      })
    }
  }, [selectedJobId])

  // Clear search error when location or job type changes
  useEffect(() => {
    if (searchError) {
      setSearchError("")
    }
  }, [location, searchParams.type])

  // Update map when center or search params change
  useEffect(() => {
    setMapCenter(center)
    // If we have specific coordinates from search params, zoom in most
    if (searchParams.lat && searchParams.lng) {
      setMapZoom(12)
    } else if (searchParams.location && searchParams.location.trim()) {
      // If we have a specific location but no coordinates, zoom in moderately
      setMapZoom(10)
    } else {
      // No location specified - default zoom
      setMapZoom(6)
    }
  }, [center, searchParams.lat, searchParams.lng, searchParams.location])

  // Sync search term with URL parameters (for category clicks)
  useEffect(() => {
    if (searchParams.search !== undefined) {
      setSearchTerm(searchParams.search)
    }
  }, [searchParams.search])

  // Automatically enable full-screen mode when user has performed a search with location
  useEffect(() => {
    // Only enable full-screen if location is provided (coordinates or location string)
    // Just having a search term should NOT trigger full-screen mode
    const hasLocationSearch = !!(
      (searchParams.lat && searchParams.lng) ||
      searchParams.location
    )
    // Enable full-screen if we have location-based search
    if (hasLocationSearch) {
      setIsFullScreenMode(true)
    } else {
      setIsFullScreenMode(false)
    }
  }, [searchParams.location, searchParams.lat, searchParams.lng])

  // Fetch user type when user is logged in
  useEffect(() => {
    const fetchUserType = async () => {
      if (user) {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .single()

        if (!error && data) {
          setUserType(data.user_type)
        }
      }
    }

    fetchUserType()
  }, [user])

  const handleLocationSelect = (locationName: string, lat: number, lon: number) => {
    setLocation(locationName)
    setSelectedLocation({ lat, lon })
    setMapCenter([lat, lon])
    setMapZoom(12) // Zoom in when location is selected
    setMapKey(Date.now())
  }

  const updateSearchParams = (key: string, value: string) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${basePath}?${params.toString()}`)
  }

  const handleSearch = () => {
    // Validate: require location OR remote job type
    const isRemoteJob = searchParams.type === "remote"
    const hasLocation = location.trim() !== ""

    if (!hasLocation && !isRemoteJob) {
      setSearchError("Please set a location or select 'Remote' job type to search")
      return
    }

    // Clear any previous error
    setSearchError("")

    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set("search", searchTerm.trim())
    if (location.trim()) params.set("location", location.trim())
    if (selectedLocation) {
      params.set("lat", selectedLocation.lat.toString())
      params.set("lng", selectedLocation.lon.toString())
    }
    if (searchParams.type && searchParams.type !== "all") params.set("type", searchParams.type)
    if (searchParams.level && searchParams.level !== "all") params.set("level", searchParams.level)
    if (searchParams.posted && searchParams.posted !== "all") params.set("posted", searchParams.posted)
    if (salaryMin.trim()) params.set("salaryMin", salaryMin.trim())
    if (salaryMax.trim()) params.set("salaryMax", salaryMax.trim())
    if (radius !== "25") params.set("radius", radius)
    if (trainingProvided) params.set("trainingProvided", "true")

    router.push(`${basePath}?${params.toString()}`)
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
      setLocation(mapPickerLocation.name)
      setSelectedLocation({ lat: mapPickerLocation.lat, lon: mapPickerLocation.lon })
      setRadius(mapPickerRadius)
      setMapCenter([mapPickerLocation.lat, mapPickerLocation.lon])
      setMapZoom(12)
      setShowMapPicker(false)
    }
  }

  const cancelMapPicker = () => {
    setShowMapPicker(false)
    setMapPickerLocation(null)
    setMapPickerRadius("10")
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

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`
    if (min) return `£${min.toLocaleString()}+`
    return `Up to £${max?.toLocaleString()}`
  }

  // Build job detail URL with current search params
  // Always use /jobs/ for detail pages since both tasks and jobs share the same detail route
  const buildJobUrl = (jobId: string) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    return `/jobs/${jobId}?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Saved Jobs Banner - Only show when there are jobs */}
      {isSavedJobsView && jobs.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 border-b border-blue-900">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookmarkIcon className="h-5 w-5 fill-white" />
              <div>
                <h1 className="text-lg font-bold">Saved Jobs</h1>
                <p className="text-blue-100 text-xs">
                  {jobs.length} active {jobs.length === 1 ? 'job' : 'jobs'} saved
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push(basePath)}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
            >
              Browse More Jobs
            </Button>
          </div>
        </div>
      )}

      {/* Empty Saved Jobs State */}
      {isSavedJobsView && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 bg-gradient-to-b from-gray-50 to-white">
          <div className="text-center max-w-md">
            <BookmarkIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Saved Jobs</h2>
            <p className="text-gray-600 mb-6">
              {!user
                ? "Please sign in to view your saved jobs."
                : "You haven't saved any jobs yet. Browse available jobs and click the bookmark icon to save them here."
              }
            </p>
            <div className="flex gap-3 justify-center">
              {!user ? (
                <>
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/jobs">Browse Jobs</Link>
                  </Button>
                </>
              ) : (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/jobs">Browse Jobs</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section - Matching Main Page */}
      {!isFullScreenMode && !isSavedJobsView && (
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
                Search jobs worldwide with advanced filters
              </h2>

              {/* Main Search Inputs - Made consistent sizing */}
              <div className="flex flex-col sm:flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. Software Engineer, Marketing, or Company name"
                    className="h-10 md:h-12 text-sm md:text-base px-3 md:px-4 bg-white border-0 focus:ring-2 focus:ring-emerald-500/30 rounded-lg font-medium placeholder:text-gray-500 shadow-md"
                  />
                </div>
                <div className="flex-1 flex gap-2">
                  <div className="flex-1">
                    <LocationInput
                      value={location}
                      onChange={setLocation}
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
                  onClick={handleSearch}
                  className={`w-full h-10 md:h-12 text-sm md:text-base font-bold text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] ${
                    basePath === '/tasks'
                      ? 'bg-purple-500 hover:bg-purple-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  <Search className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  {basePath === '/tasks' ? 'Search Jobs (Tasks)' : 'Search Jobs'}
                </Button>
                {searchError && (
                  <div className="mt-2 p-3 bg-red-500/90 backdrop-blur-sm text-white rounded-lg text-sm font-medium">
                    {searchError}
                  </div>
                )}
              </div>

              {/* Advanced Filters - Rounded Section */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Job Type - Hide for tasks page */}
                    {basePath !== '/tasks' && (
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Job Type</label>
                        <Select
                          value={searchParams.type || "all"}
                          onValueChange={(value) => updateSearchParams("type", value)}
                        >
                          <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="remote">🌍 Remote</SelectItem>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="freelance">Freelance</SelectItem>
                            <SelectItem value="internship">Internship</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Jobs Posted Date Filter - Only for tasks page */}
                    {basePath === '/tasks' && (
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Jobs Posted</label>
                        <Select
                          value={searchParams.posted || "all"}
                          onValueChange={(value) => updateSearchParams("posted", value)}
                        >
                          <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Show All</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="3days">Last 3 days</SelectItem>
                            <SelectItem value="5days">Last 5 days</SelectItem>
                            <SelectItem value="week">Last week</SelectItem>
                            <SelectItem value="2weeks">Last 2 weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Experience Level - Hide for tasks page */}
                    {basePath !== '/tasks' && (
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Experience Level</label>
                        <Select
                          value={searchParams.level || "all"}
                          onValueChange={(value) => updateSearchParams("level", value)}
                        >
                          <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg">
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
                    )}

                    {/* Training Provided - Only for jobs page */}
                    {basePath !== '/tasks' && (
                      <div>
                        <label className="block text-white text-sm font-medium mb-3">Training Provided</label>
                        <label className="flex items-center space-x-2 cursor-pointer bg-white/20 rounded-lg p-2.5 hover:bg-white/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={trainingProvided}
                            onChange={(e) => setTrainingProvided(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-white font-medium">Show only jobs with training</span>
                        </label>
                      </div>
                    )}

                    {/* Salary/Price Range */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">
                        {basePath === '/tasks' ? 'Min price (£)' : 'Min Salary (£)'}
                      </label>
                      <Input
                        type="number"
                        placeholder={basePath === '/tasks' ? 'e.g. 100' : 'e.g. 30000'}
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                        className="h-10 text-sm bg-white border-0 rounded-lg"
                      />
                    </div>

                    {/* Search Radius */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">Search Radius</label>
                      <Select value={radius} onValueChange={setRadius}>
                        <SelectTrigger className="w-full h-10 text-sm bg-white border-0 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 miles</SelectItem>
                          <SelectItem value="20">20 miles</SelectItem>
                          <SelectItem value="30">30 miles</SelectItem>
                          <SelectItem value="50">50 miles</SelectItem>
                          <SelectItem value="100">100 miles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Categories Section - Optional */}
      {categoriesSection && !isFullScreenMode && !isSavedJobsView && (
        <div className="pb-6">
          {categoriesSection}
        </div>
      )}

      {/* Map and Job List Section - Only show when there are location-based search parameters */}
      {(searchParams.location || searchParams.lat || searchParams.lng) && !isFullScreenMode && (
        <section className="py-6 sm:py-12 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
            {/* Map Section - Rounded */}
            <div className="flex-1">
              <Card className="h-[500px] lg:h-[600px] overflow-hidden shadow-xl border-0 rounded-xl">
                <CardContent className="p-0 h-full relative">
                  <JobMap
                    key={mapKey}
                    jobs={jobs}
                    center={mapCenter}
                    zoom={mapZoom}
                    height="100%"
                    showRadius={!!selectedLocation}
                    radiusCenter={selectedLocation ? [selectedLocation.lat, selectedLocation.lon] : undefined}
                    selectedJobId={selectedJobId}
                    onJobSelect={(job) => setSelectedJobId(job?.id || null)}
                    onProfileSelect={(profile) => {
                      setSelectedProfile(profile)
                      setShowProfileDetails(true)
                    }}
                  />
                  {/* Results Counter Overlay */}
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <div className="bg-white rounded-lg shadow-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-lg">
                          {jobs.length === 0 && !(searchParams.search || searchParams.location || searchParams.type || searchParams.level || searchParams.salaryMin)
                            ? "Search to find jobs"
                            : `${jobs.length} Job${jobs.length !== 1 ? "s" : ""} Found`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Warning Message for "Any" Search Limit */}
                    {warningMessage && (
                      <div className="bg-amber-500 text-white rounded-lg shadow-lg p-3 border border-amber-600 max-w-xs">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">{warningMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Screen Button */}
                  {jobs.length > 0 && (
                    <div className="absolute top-4 right-4 z-10">
                      <Button
                        onClick={() => setIsFullScreenMode(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                      >
                        <Maximize className="h-4 w-4 mr-2" />
                        Full Screen
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Job List or Profile Display */}
            <div className="w-full lg:w-96">
              <Card className="h-[500px] lg:h-[600px] overflow-hidden shadow-xl border-0 rounded-xl">
                {showProfileDetails && selectedProfile ? (
                  /* Profile Display */
                  <>
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowProfileDetails(false)
                            setSelectedProfile(null)
                          }}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back to Jobs
                        </Button>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Profile Details</h2>
                      <p className="text-sm text-gray-600">Complete professional information</p>
                    </div>

                    <div className="h-full overflow-y-auto p-4">
                      {/* Profile Header */}
                      <div className="text-center mb-6">
                        <Avatar className="h-20 w-20 mx-auto mb-3">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                            {selectedProfile.company_profiles?.company_name?.substring(0, 2).toUpperCase() || 'PR'}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {selectedProfile.title}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {selectedProfile.company_profiles?.company_name}
                        </p>
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-4 w-4" />
                          {selectedProfile.location}
                        </div>
                      </div>

                      {/* Job Details */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Job Information
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {selectedProfile.job_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {selectedProfile.work_location}
                              </Badge>
                            </div>
                            {formatSalary(selectedProfile.salary_min, selectedProfile.salary_max) && (
                              <div className="text-sm font-semibold text-green-600">
                                {formatSalary(selectedProfile.salary_min, selectedProfile.salary_max)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Job Description */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Job Description</h4>
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                            {selectedProfile.description}
                          </p>
                        </div>

                        {/* Skills Required */}
                        {selectedProfile.skills_required && selectedProfile.skills_required.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              Skills Required
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {selectedProfile.skills_required.map((skill: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Company Information */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Company Details
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">Industry:</span> {selectedProfile.company_profiles?.industry}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Location:</span> {selectedProfile.company_profiles?.location}
                            </p>
                          </div>
                        </div>

                        {/* Contact Actions */}
                        <div className="pt-4 space-y-2">
                          {userType === 'company' ? (
                            // For companies: Show Apply and View full details buttons
                            <>
                              <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                                <Link href={`${basePath}/${selectedProfile.id}#apply`}>
                                  Apply
                                </Link>
                              </Button>
                              <Button variant="outline" className="w-full" asChild>
                                <Link href={`${basePath}/${selectedProfile.id}`}>
                                  View full details
                                </Link>
                              </Button>
                            </>
                          ) : (
                            // For professionals and others: Show single Apply button
                            <>
                              <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                                <Link href={`${basePath}/${selectedProfile.id}`}>
                                  Apply for This Job
                                </Link>
                              </Button>
                              <Button variant="outline" className="w-full" disabled>
                                <Mail className="h-4 w-4 mr-2" />
                                Contact Employer
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Job List */
                  <>
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Job Results</h2>
                      <p className="text-sm text-gray-600">Click on jobs below or map markers</p>
                    </div>

                    <div className="h-full overflow-y-auto">
                      {jobs.length === 0 ? (
                        <div className="text-center py-12 px-4">
                          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2 text-gray-900">
                            {searchParams.search || searchParams.location || searchParams.type || searchParams.level || searchParams.salaryMin
                              ? "No jobs found"
                              : "Ready to search?"
                            }
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {searchParams.search || searchParams.location || searchParams.type || searchParams.level || searchParams.salaryMin
                              ? "Try adjusting your search criteria"
                              : "Use the search form above to find job opportunities"
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 p-4">
                          {jobs.map((job) => {
                            const isSelected = selectedJobId === job.id
                            return (
                              <Card
                                key={job.id}
                                ref={(el) => { jobCardRefs.current[job.id] = el }}
                                className={`cursor-pointer transition-all rounded-lg ${
                                  isSelected
                                    ? "shadow-xl border-2 border-blue-500 bg-blue-50"
                                    : "hover:shadow-md border"
                                }`}
                                onClick={() => {
                                  // Toggle selection when clicking job card
                                  setSelectedJobId(isSelected ? null : job.id)
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex gap-3">
                                    {(() => {
                                      const logoUrl = job.poster_logo_url || job.company_profiles?.logo_url
                                      const posterName =
                                        (job.poster_first_name && job.poster_last_name ? `${job.poster_first_name} ${job.poster_last_name}` : null) ||
                                        job.company_profiles?.company_name ||
                                        "Anonymous"

                                      if (logoUrl) {
                                        return (
                                          <div className="h-12 w-12 flex-shrink-0 relative rounded-full overflow-hidden bg-gray-100">
                                            <Image
                                              src={logoUrl}
                                              alt={posterName}
                                              fill
                                              className="object-cover"
                                            />
                                          </div>
                                        )
                                      } else {
                                        return (
                                          <Avatar className="h-12 w-12 flex-shrink-0">
                                            <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
                                              {posterName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        )
                                      }
                                    })()}

                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-base text-gray-900 mb-1 truncate">
                                        {job.title}
                                      </h3>

                                      {/* Poster Name/Nickname */}
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-500" />
                                          <p className="text-sm text-gray-600 font-medium">
                                            {(job.poster_first_name && job.poster_last_name ? `${job.poster_first_name} ${job.poster_last_name}` : null) ||
                                              job.company_profiles?.company_name ||
                                              "Anonymous"}
                                          </p>
                                        </div>
                                        {/* Only show company name separately if poster is a homeowner (not the company itself) */}
                                        {job.company_profiles?.company_name && job.poster_first_name && job.poster_last_name && (
                                          <>
                                            <span className="text-gray-400">•</span>
                                            <div className="flex items-center gap-1">
                                              <Building className="h-3 w-3 text-gray-500" />
                                              <p className="text-sm text-gray-600">
                                                {job.company_profiles?.company_name}
                                              </p>
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* Star Rating - Only show if company rating exists */}
                                      {job.company_rating && (
                                        <div className="mb-1">
                                          <StarRating
                                            rating={job.company_rating.average_rating}
                                            totalReviews={job.company_rating.total_reviews}
                                            size="sm"
                                            showCount={true}
                                          />
                                        </div>
                                      )}

                                      {/* Location */}
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                        <MapPin className="h-3 w-3" />
                                        {isSelected && job.full_address ? job.full_address : job.location}
                                      </div>

                                      {formatSalary(job.salary_min, job.salary_max) && (
                                        <div className="text-sm font-semibold text-green-600 mb-2">
                                          {formatSalary(job.salary_min, job.salary_max)}
                                        </div>
                                      )}

                                      {/* Job Type Badges (no experience level) */}
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        <Badge variant="secondary" className="text-xs">
                                          {job.job_type}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {job.work_location}
                                        </Badge>
                                      </div>

                                      {/* Description - Short or Long */}
                                      <div className="mb-2">
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                          {expandedJobs.has(job.id)
                                            ? (job.long_description || job.description)
                                            : ((job.short_description || job.description)?.substring(0, 150) +
                                               ((job.short_description || job.description)?.length > 150 ? "..." : ""))}
                                        </p>
                                        {(job.long_description || (job.short_description || job.description)?.length > 150) && (
                                          <Button
                                            variant="link"
                                            size="sm"
                                            className="p-0 h-auto text-blue-600 hover:text-blue-800 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              const newExpanded = new Set(expandedJobs)
                                              if (expandedJobs.has(job.id)) {
                                                newExpanded.delete(job.id)
                                              } else {
                                                newExpanded.add(job.id)
                                              }
                                              setExpandedJobs(newExpanded)
                                            }}
                                          >
                                            {expandedJobs.has(job.id) ? (
                                              <>
                                                <ChevronUp className="h-3 w-3 mr-1" />
                                                Show less
                                              </>
                                            ) : (
                                              <>
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                Show more
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>

                                      {/* Extended details - only show when selected */}
                                      {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">

                                          {/* Skills Required */}
                                          {job.skills_required && job.skills_required.length > 0 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-1">
                                                <Award className="h-3 w-3" />
                                                Skills Required
                                              </h4>
                                              <div className="flex flex-wrap gap-1">
                                                {job.skills_required.map((skill: string, index: number) => (
                                                  <Badge key={index} variant="outline" className="text-xs">
                                                    {skill}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Company Details */}
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-1">
                                              <Building className="h-3 w-3" />
                                              Company
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                              <span className="font-medium">Industry:</span> {job.company_profiles?.industry}
                                            </p>
                                          </div>

                                          {/* Application Stats */}
                                          <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                              <Users className="h-3 w-3" />
                                              {job.applications_count} applicant{job.applications_count !== 1 ? "s" : ""}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              Posted {formatDate(job.created_at)}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Action buttons */}
                                      <div className="flex items-center justify-between mt-3">
                                        {!isSelected && (
                                          <span className="text-xs text-gray-500">
                                            {formatDate(job.created_at)}
                                          </span>
                                        )}
                                        <div className={`flex gap-1 ${isSelected ? "w-full" : ""}`}>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (!user) {
                                                setShowSignUpDialog(true)
                                              }
                                            }}
                                            disabled={!user}
                                          >
                                            <Heart className="h-3 w-3" />
                                          </Button>
                                          {isSelected && userType === 'company' ? (
                                            // For companies when selected: Show Apply button
                                            <Button
                                              size="sm"
                                              className="h-8 flex-1 bg-blue-600 hover:bg-blue-700"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (!user) {
                                                  setShowSignUpDialog(true)
                                                } else {
                                                  router.push(`${buildJobUrl(job.id)}#apply`)
                                                }
                                              }}
                                            >
                                              Apply
                                            </Button>
                                          ) : isSelected && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-8 px-3"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (!user) {
                                                  setShowSignUpDialog(true)
                                                } else {
                                                  router.push(`/messages/new?jobId=${job.id}`)
                                                }
                                              }}
                                            >
                                              <MessageCircle className="h-3 w-3 mr-1" />
                                              Contact
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            className={`h-8 ${isSelected ? "flex-1" : "px-3"}`}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (!user) {
                                                setShowSignUpDialog(true)
                                              } else {
                                                router.push(buildJobUrl(job.id))
                                              }
                                            }}
                                          >
                                            <User className="h-3 w-3 mr-1" />
                                            {isSelected ? (userType === 'company' ? "View full details" : "View Profile") : "View"}
                                          </Button>
                                        </div>
                                      </div>
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
                )}
              </Card>
            </div>
            </div>
          </div>
        </section>
      )}

      {/* Success Stories Section - From Homepage */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-balance">
              Success Stories
            </h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto text-pretty px-2">
              Real results from professionals who found their perfect job through our platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg rounded-xl">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop"
                  alt="Team collaboration"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  This Week
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">
                  TechTeam Solutions - Development Team
                </h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "Found multiple positions through the map interface. The location-based search helped us discover opportunities we never knew existed."
                </p>
                <div className="flex items-center text-emerald-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">👥</span>
                  <span>Team hired together</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg rounded-xl">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop"
                  alt="UX Designer at work"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  Yesterday
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">Sarah M. - UX Designer</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "The advanced filters helped me find remote positions that matched my salary expectations. Got hired within 2 weeks!"
                </p>
                <div className="flex items-center text-blue-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">🏠</span>
                  <span>Remote position secured</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg rounded-xl">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=400&fit=crop"
                  alt="Project Manager"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  Last Week
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800">James K. - Project Manager</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                  "Map-based search showed me companies I never considered. Found my dream role just 5 miles from home."
                </p>
                <div className="flex items-center text-orange-600 font-semibold text-sm md:text-base">
                  <span className="text-xl md:text-2xl mr-2">⬆️</span>
                  <span>Career advancement</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center mt-8 md:mt-12">
            <p className="text-gray-500 text-base md:text-lg mb-4 md:mb-6">
              Join thousands who found their perfect match
            </p>
            {!user ? (
              <Button
                size="lg"
                asChild
                className="px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Link href="/auth/sign-up">Start Your Success Story</Link>
              </Button>
            ) : (
              <Button
                size="lg"
                asChild
                className="px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Why Choose Section - From Homepage */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-white text-balance">
              Why Choose Our Job Map?
            </h2>
            <p className="text-base md:text-xl text-white/90 max-w-3xl mx-auto text-pretty px-2">
              Revolutionary features that transform how you discover opportunities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <div className="text-center text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Location-Based Discovery</h3>
              <p className="text-sm md:text-base text-white/90 leading-relaxed">
                Visualize job opportunities geographically. Find the perfect role based on location, commute preferences, and local insights.
              </p>
            </div>

            <div className="text-center text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Filter className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Advanced Filtering</h3>
              <p className="text-sm md:text-base text-white/90 leading-relaxed">
                Powerful search filters for job type, experience level, salary range, and work location to find exactly what you're looking for.
              </p>
            </div>

            <div className="text-center text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Real-Time Results</h3>
              <p className="text-sm md:text-base text-white/90 leading-relaxed">
                Connect with the latest opportunities instantly. Real-time job updates and immediate access to company information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
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
              <JobMap
                key={`picker-${Date.now()}`}
                jobs={[]}
                center={mapCenter}
                zoom={8}
                height="100%"
                showRadius={!!mapPickerLocation}
                radiusCenter={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
                radiusKm={parseInt(mapPickerRadius) * 1.60934} // Convert miles to km
                onMapClick={handleMapLocationPick}
                selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
              />

              {/* Crosshair indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Target className="h-8 w-8 text-red-500 opacity-70" />
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Radius:</label>
                    <Select value={mapPickerRadius} onValueChange={setMapPickerRadius}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 50 }, (_, i) => i + 1).map((miles) => (
                          <SelectItem key={miles} value={miles.toString()}>
                            {miles} mi
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {mapPickerLocation && (
                    <div className="text-sm text-gray-600">
                      Location: {mapPickerLocation.lat.toFixed(4)}, {mapPickerLocation.lon.toFixed(4)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={cancelMapPicker} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmMapPickerLocation}
                    disabled={!mapPickerLocation}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Use This Location
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Map Mode */}
      {isFullScreenMode && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Site Header */}
          <Header user={user} />

          {/* Top Search Bar */}
          <div className="sticky top-0 z-20 bg-white shadow-lg border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. Software Engineer, Marketing Manager"
                  className="h-12 flex-1 bg-white/95 shadow-lg border-2 font-medium text-base"
                />
                <div className="flex-1 flex gap-2">
                  <div className="flex-1">
                    <LocationInput
                      value={location}
                      onChange={setLocation}
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
                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant="outline"
                  className="h-12 px-4 bg-white shadow-lg"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Button
                  onClick={handleSearch}
                  className={`h-12 px-6 text-white shadow-lg font-semibold ${
                    basePath === '/tasks'
                      ? 'bg-purple-500 hover:bg-purple-600'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </Button>
                <Button
                  onClick={() => {
                    setIsFullScreenMode(false)
                    router.push(basePath)
                  }}
                  variant="outline"
                  className="h-12 px-3 bg-white shadow-lg"
                  title="Exit full-screen"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Search Error Message */}
              {searchError && (
                <div className="mt-3 p-3 bg-red-500 text-white rounded-lg text-sm font-medium shadow-lg">
                  {searchError}
                </div>
              )}

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="mt-3 p-4 bg-white rounded-lg shadow-md border-2 border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Job Type - Hide for tasks page */}
                    {basePath !== '/tasks' && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
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

                    {/* Jobs Posted Date Filter - Only for tasks page */}
                    {basePath === '/tasks' && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <label className="block text-gray-900 text-sm font-semibold mb-2">Jobs Posted</label>
                        <Select
                          value={searchParams.posted || "all"}
                          onValueChange={(value) => updateSearchParams("posted", value)}
                        >
                          <SelectTrigger className="w-full h-10 text-sm bg-white font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Show All</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="3days">Last 3 days</SelectItem>
                            <SelectItem value="5days">Last 5 days</SelectItem>
                            <SelectItem value="week">Last week</SelectItem>
                            <SelectItem value="2weeks">Last 2 weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Experience Level - Hide for tasks page */}
                    {basePath !== '/tasks' && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
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
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Training Provided - Only for jobs page */}
                    {basePath !== '/tasks' && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <label className="block text-gray-900 text-sm font-semibold mb-3">Training Provided</label>
                        <label className="flex items-center space-x-2 cursor-pointer bg-white rounded-lg p-2.5 hover:bg-gray-50 transition-colors border border-gray-200">
                          <input
                            type="checkbox"
                            checked={trainingProvided}
                            onChange={(e) => setTrainingProvided(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900 font-medium">Show only jobs with training</span>
                        </label>
                      </div>
                    )}

                    {/* Salary/Price Range */}
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <label className="block text-gray-900 text-sm font-semibold mb-2">
                        {basePath === '/tasks' ? 'Min price (£)' : 'Min Salary (£)'}
                      </label>
                      <Input
                        placeholder={basePath === '/tasks' ? 'e.g. 100' : 'e.g. 30000'}
                        value={salaryMin}
                        type="number"
                        onChange={(e) => setSalaryMin(e.target.value)}
                        className="h-10 text-sm bg-white font-medium"
                      />
                    </div>

                    {/* Search Radius */}
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <label className="block text-gray-900 text-sm font-semibold mb-2">Search Radius</label>
                      <Select value={radius} onValueChange={setRadius}>
                        <SelectTrigger className="w-full h-10 text-sm bg-white font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 25, 30, 40, 50].map((miles) => (
                            <SelectItem key={miles} value={miles.toString()}>
                              {miles} miles
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content: Map + Sidebar with Resizable Panels */}
          <PanelGroup direction="horizontal" className="flex-1">
            {/* Map Panel */}
            <Panel defaultSize={60} minSize={30} className={activeView === "list" ? "hidden md:block" : ""}>
              <div className="h-full relative">
                <JobMap
                  key={mapKey}
                  jobs={jobs}
                  center={mapCenter}
                  zoom={mapZoom}
                  height="100%"
                  showRadius={!!selectedLocation}
                  radiusCenter={selectedLocation ? [selectedLocation.lat, selectedLocation.lon] : undefined}
                  selectedJobId={selectedJobId}
                  onJobSelect={(job) => setSelectedJobId(job?.id || null)}
                  onProfileSelect={(profile) => {
                    setSelectedProfile(profile)
                  }}
                />

                {/* Results Counter */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <div className="bg-white rounded-lg shadow-lg p-3 border">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-lg">
                        {jobs.length} Job{jobs.length !== 1 ? "s" : ""} Found
                      </span>
                    </div>
                  </div>

                  {/* Warning Message for "Any" Search Limit */}
                  {warningMessage && (
                    <div className="bg-amber-500 text-white rounded-lg shadow-lg p-3 border border-amber-600 max-w-xs">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{warningMessage}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile View Toggle (Bottom Center) */}
                <div className="md:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "map")} className="w-auto">
                    <TabsList className="bg-white shadow-lg border-2">
                      <TabsTrigger value="map" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        <Map className="h-4 w-4 mr-2" />
                        Map
                      </TabsTrigger>
                      <TabsTrigger value="list" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        <List className="h-4 w-4 mr-2" />
                        List
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </Panel>

            {/* Resize Handle - Hidden on mobile */}
            <PanelResizeHandle className="hidden md:block w-2 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

            {/* Right Sidebar - Job List Panel */}
            <Panel defaultSize={40} minSize={25} className={`bg-white ${activeView === "map" ? "hidden md:block" : ""}`}>
              <div className="h-full bg-white border-l shadow-xl flex flex-col">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">
                  {selectedProfile ? "Job Details" : "Jobs"}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedProfile ? "Complete job information" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} found`}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedProfile ? (
                  /* Job Details */
                  <div className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProfile(null)}
                      className="mb-3"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to List
                    </Button>
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-xl font-bold mb-2">{selectedProfile.title}</h2>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <Building className="h-4 w-4" />
                          <span>{selectedProfile.company_profiles?.company_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="h-4 w-4" />
                          <span>{selectedProfile.location}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge>{selectedProfile.job_type}</Badge>
                      </div>
                      {formatSalary(selectedProfile.salary_min, selectedProfile.salary_max) && (
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          {formatSalary(selectedProfile.salary_min, selectedProfile.salary_max)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-line">
                          {selectedProfile.description}
                        </p>
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/jobs/${selectedProfile.id}`}>View Full Details</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Job List */
                  <div>
                    {jobs.map((job) => {
                      const isSelected = selectedJobId === job.id
                      return (
                        <div
                          key={job.id}
                          ref={(el) => { jobCardRefs.current[job.id] = el }}
                          className={`p-4 border-b cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-50 border-l-4 border-l-blue-500 shadow-md"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            // Toggle selection when clicking job card
                            setSelectedJobId(isSelected ? null : job.id)
                          }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {(() => {
                              const logoUrl = job.poster_logo_url || job.company_profiles?.logo_url
                              const posterName =
                                (job.poster_first_name && job.poster_last_name ? `${job.poster_first_name} ${job.poster_last_name}` : null) ||
                                job.company_profiles?.company_name ||
                                "Anonymous"

                              if (logoUrl) {
                                return (
                                  <div className="h-10 w-10 flex-shrink-0 relative rounded-full overflow-hidden bg-gray-100">
                                    <Image
                                      src={logoUrl}
                                      alt={posterName}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )
                              } else {
                                return (
                                  <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-xs">
                                      {posterName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )
                              }
                            })()}
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-0">{job.title}</h3>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-600">
                                  {(job.poster_first_name && job.poster_last_name ? `${job.poster_first_name} ${job.poster_last_name}` : null) ||
                                    job.company_profiles?.company_name ||
                                    "Anonymous"}
                                </p>
                                {job.company_rating && (
                                  <StarRating
                                    rating={job.company_rating.average_rating}
                                    totalReviews={job.company_rating.total_reviews}
                                    size="sm"
                                    showCount={true}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{job.job_type}</Badge>
                            <Badge variant="outline" className="text-xs">{job.work_location}</Badge>
                          </div>
                          {formatSalary(job.salary_min, job.salary_max) && (
                            <div className="text-sm font-semibold text-green-600 mb-2">
                              {formatSalary(job.salary_min, job.salary_max)}
                            </div>
                          )}

                          {/* Short Description - Always visible */}
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                              {job.short_description || job.description}
                            </p>
                          </div>

                          {/* Extended details - only show when selected */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                              {/* Location/Address */}
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {job.full_address || job.location}
                              </div>

                              {/* Job Description */}
                              <div>
                                <h4 className="font-semibold text-sm text-gray-900 mb-1">Description</h4>
                                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                                  {job.description}
                                </p>
                              </div>

                              {/* Skills Required */}
                              {job.skills_required && job.skills_required.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    Skills Required
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    {job.skills_required.map((skill: string, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Company Details - Only show if company_profiles exists */}
                              {job.company_profiles && job.company_profiles.industry && (
                                <div>
                                  <h4 className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    Company
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Industry:</span> {job.company_profiles.industry}
                                  </p>
                                </div>
                              )}

                              {/* Application Stats */}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {job.applications_count} applicant{job.applications_count !== 1 ? "s" : ""}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Posted {formatDate(job.created_at)}
                                </span>
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2">
                                {userType === 'company' ? (
                                  // For companies: Show Apply and View full details buttons
                                  <>
                                    <Button
                                      size="sm"
                                      asChild
                                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Link href={`${buildJobUrl(job.id)}#apply`}>
                                        Apply
                                      </Link>
                                    </Button>
                                    <Button
                                      size="sm"
                                      asChild
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      <Link href={buildJobUrl(job.id)}>
                                        View full details
                                      </Link>
                                    </Button>
                                  </>
                                ) : (
                                  // For professionals and others: Show single combined button
                                  <Button
                                    size="sm"
                                    asChild
                                    className="flex-1"
                                  >
                                    <Link href={buildJobUrl(job.id)}>
                                      View Full Details & Apply
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Mobile View Toggle (Bottom) - Also in sidebar for convenience */}
              <div className="md:hidden p-3 border-t bg-gray-50">
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "map")} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="map" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                      <Map className="h-4 w-4 mr-2" />
                      Map
                    </TabsTrigger>
                    <TabsTrigger value="list" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                      <List className="h-4 w-4 mr-2" />
                      List
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      )}

      {/* Sign Up Dialog */}
      <Dialog open={showSignUpDialog} onOpenChange={setShowSignUpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Sign Up Required</DialogTitle>
            <DialogDescription className="text-center text-lg pt-4">
              Sign up to send messages or view profiles
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/auth/sign-up">
                Create Account
              </Link>
            </Button>
            <div className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Log in
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}