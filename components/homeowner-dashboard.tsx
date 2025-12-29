"use client"

import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import {
  Briefcase,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Settings,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  User,
  Search,
  Users,
  Eye
} from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

interface HomeownerJob {
  id: string
  title: string
  description: string
  short_description?: string
  location: string
  salary_min?: number
  salary_max?: number
  salary_frequency?: string
  is_active: boolean
  expires_at?: string
  created_at: string
  updated_at?: string
  is_tradespeople_job?: boolean
  work_location?: string
  applications_count?: number
  views_count?: number
}

interface HomeownerProfile {
  id: string
  first_name: string
  last_name: string
  location: string
  on_market: boolean
  profile_photo_url?: string
}

interface HomeownerDashboardProps {
  user?: any
  profile: HomeownerProfile
  jobs: HomeownerJob[]
  stats: {
    totalJobs: number
    activeJobs: number
    completedJobs: number
  }
}

export function HomeownerDashboard({ profile, jobs, stats, user }: HomeownerDashboardProps) {
  const [onMarket, setOnMarket] = useState(profile.on_market)
  const [isTogglingMarket, setIsTogglingMarket] = useState(false)
  const router = useRouter()

  const handleToggleMarket = async () => {
    setIsTogglingMarket(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("homeowner_profiles")
        .update({ on_market: !onMarket })
        .eq("id", profile.id)

      if (error) throw error

      setOnMarket(!onMarket)
      router.refresh()

      // If turning on market, redirect to profile to complete professional fields
      if (!onMarket) {
        router.push("/dashboard/homeowner/profile?setup_market=true")
      }
    } catch (err) {
      console.error("Failed to toggle market status:", err)
    } finally {
      setIsTogglingMarket(false)
    }
  }

  const getStatusInfo = (job: HomeownerJob) => {
    const now = new Date()
    const expiresAt = job.expires_at ? new Date(job.expires_at) : null
    const isExpired = expiresAt && expiresAt < now

    if (!job.is_active || isExpired) {
      return { text: "Expired", color: "bg-gray-100 text-gray-800" }
    }

    return { text: "Active", color: "bg-green-100 text-green-800" }
  }

  const formatExpiryDate = (expiresAt: string | undefined) => {
    if (!expiresAt) return null
    const date = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return `Expired ${Math.abs(daysUntilExpiry)} days ago`
    } else if (daysUntilExpiry === 0) {
      return "Expires today"
    } else if (daysUntilExpiry === 1) {
      return "Expires tomorrow"
    } else {
      return `Expires in ${daysUntilExpiry} days`
    }
  }

  const handleFindTradespeople = () => {
    // Navigate to main page with traders tab selected
    router.push("/?tab=traders")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-1.5 sm:gap-5 md:gap-6 lg:gap-8">
          {/* Left Column - Profile */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-1">
            <Card>
              <CardHeader className="p-3 sm:p-4 relative">
                {/* Edit Button - Top Right Corner - Hidden on mobile, visible on desktop */}
                <div className="hidden lg:flex absolute -top-1 right-2 gap-1 z-20">
                  <Link href="/dashboard/homeowner/profile">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 sm:h-9 sm:w-9 bg-white shadow-sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Mobile Layout: Name at top, then avatar and info below */}
                <div className="lg:hidden">
                  {/* Name - Top Center */}
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words mb-1.5 leading-tight text-center">
                    {profile.first_name} {profile.last_name}
                  </h2>

                  {/* Main Row: Avatar, Info, Toggles */}
                  <div className="flex items-start gap-2 mb-2">
                    {/* Left: Avatar */}
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex-shrink-0">
                      <AvatarImage
                        src={profile.profile_photo_url || user?.profile_photo_url || "/placeholder.svg"}
                        className="object-cover w-full h-full rounded-full"
                      />
                      <AvatarFallback className="text-xl sm:text-2xl rounded-full">
                        {profile.first_name[0]}{profile.last_name[0]}
                      </AvatarFallback>
                    </Avatar>

                    {/* Center: Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base text-muted-foreground break-words mb-1">Homeowner</p>
                      <div className="flex items-start text-xs sm:text-sm text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{profile.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout: Original layout */}
                <div className="hidden lg:flex items-start gap-3 mb-3">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex-shrink-0">
                    <AvatarImage
                      src={profile.profile_photo_url || user?.profile_photo_url || "/placeholder.svg"}
                      className="object-cover w-full h-full rounded-full"
                    />
                    <AvatarFallback className="text-xl sm:text-2xl rounded-full">
                      {profile.first_name[0]}{profile.last_name[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words mb-0.5 leading-tight">
                      {profile.first_name} {profile.last_name}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground break-words">Homeowner</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="hidden lg:block space-y-0.5 sm:space-y-1 p-2 sm:p-6 pt-1">
                <div className="flex items-start text-[10px] sm:text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{profile.location}</span>
                </div>
                <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">Member since {new Date().getFullYear()}</span>
                </div>
                <Link href="/account/homeowner" className="block mt-2">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Account Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Middle & Right Columns - Main Content */}
          <div className="lg:col-span-3 flex flex-col space-y-1.5 sm:space-y-6 order-2">
            {/* Upper Section: Stats + Main Actions - Order 2 on mobile */}
            <div className="order-2 lg:order-none space-y-1.5 sm:space-y-3">
        {/* Quick Actions Card */}
        <Card className="p-3 sm:p-4 md:p-6">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Need help with your project? Post your job (task) with a clear description and budget, or search profiles of local tradespeople.</h3>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2 md:gap-3">
            <Button
              onClick={handleFindTradespeople}
              className="h-auto p-1 sm:p-2 flex-col bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
              <span className="font-semibold text-sm sm:text-base leading-tight">Find Trades</span>
              <span className="text-xs opacity-90 hidden md:block">Search contractors</span>
            </Button>
            <Button asChild className="h-auto p-1 sm:p-2 flex-col bg-purple-600 hover:bg-purple-700 text-white">
              <Link href="/dashboard/homeowner/post-job">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                <span className="font-semibold text-sm sm:text-base leading-tight">Post Trade Job</span>
                <span className="text-xs opacity-90 hidden md:block">Create trade job posting</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-auto p-1 sm:p-2 flex-col bg-transparent"
            >
              <Link href="/dashboard/homeowner/jobs">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                <span className="font-semibold text-sm sm:text-base leading-tight">My Jobs</span>
                <span className="text-xs sm:text-sm opacity-70">({stats.totalJobs})</span>
              </Link>
            </Button>
          </div>
        </Card>

        {/* Put Me on the Market Toggle */}
        <Card className="p-3 sm:p-4 md:p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 sm:justify-between">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2">
                {onMarket ? (
                  <ToggleRight className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <ToggleLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                )}
                <span className="text-sm sm:text-base md:text-xl">Put Me on the Market</span>
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                {onMarket ? (
                  <>
                    ✅ You're visible to employers! Your profile appears on the professionals map.
                  </>
                ) : (
                  <>
                    Turn this on to appear as a professional and receive job offers. You'll need to complete your professional profile (CV, skills, salary expectations).
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={handleToggleMarket}
              disabled={isTogglingMarket}
              size="sm"
              className={`${onMarket ? "bg-green-600 hover:bg-green-700" : ""} sm:size-default md:size-lg flex-shrink-0 text-xs sm:text-sm`}
            >
              {isTogglingMarket ? "..." : onMarket ? "Turn Off" : "Turn On"}
            </Button>
          </div>
        </Card>

        {/* Stats - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-2 h-16">
            <div className="flex items-center justify-between h-full">
              <div>
                <div className="text-xs font-medium text-foreground mb-0.5">Total Jobs</div>
                <div className="text-lg font-bold text-foreground">{stats.totalJobs}</div>
              </div>
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-2 h-16">
            <div className="flex items-center justify-between h-full">
              <div>
                <div className="text-xs font-medium text-foreground mb-0.5">Active Jobs</div>
                <div className="text-lg font-bold text-foreground">{stats.activeJobs}</div>
              </div>
              <Clock className="h-4 w-4 text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-2 h-16">
            <div className="flex items-center justify-between h-full">
              <div>
                <div className="text-xs font-medium text-foreground mb-0.5">Completed</div>
                <div className="text-lg font-bold text-foreground">{stats.completedJobs}</div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </div>
            </div>

            {/* Bottom Section: Jobs - Order 3 on mobile */}
            <div className="order-3 lg:order-none space-y-1.5 sm:space-y-4">
        {/* Your Jobs */}
        <Card className="overflow-hidden">
          <div className="px-2 py-1.5 sm:p-4 md:p-6">
            {/* Mobile: Compact single line */}
            <div className="flex lg:hidden items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Briefcase className="h-5 w-5 flex-shrink-0" />
                <h2 className="text-lg font-semibold truncate">Your Jobs</h2>
                <Badge variant="secondary" className="text-base">{jobs.length}</Badge>
              </div>
              <Link href="/dashboard/homeowner/jobs">
                <Button variant="outline" size="sm" className="h-9 px-3">
                  <Eye className="h-5 w-5 mr-1" />
                  <span className="text-base">View</span>
                </Button>
              </Link>
            </div>
            {/* Desktop: Original layout */}
            <div className="hidden lg:flex items-center justify-between">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Your Jobs</h2>
              <Link href="/dashboard/homeowner/jobs">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">View All</Button>
              </Link>
            </div>
          </div>
          <div className="p-0 sm:p-4 md:p-6 pt-0">

          {jobs.length === 0 ? (
            <div className="hidden lg:block text-center py-6 sm:py-8 md:py-12">
              <Briefcase className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2">No jobs yet</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Post your first job to get started with finding help for your tasks
              </p>
              <Link href="/dashboard/homeowner/post-job">
                <Button size="sm" className="text-xs sm:text-sm md:text-base">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Post Your First Job
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-0 sm:space-y-4">
              {jobs.slice(0, 5).map((job, index) => {
                const statusInfo = getStatusInfo(job)
                const expiryText = formatExpiryDate(job.expires_at)

                return (
                  <div
                    key={job.id}
                    className={`flex flex-col sm:flex-row sm:items-start sm:justify-between px-2 py-1.5 sm:p-4 border-0 sm:border rounded-none sm:rounded-lg hover:bg-muted/50 transition-colors gap-1.5 sm:gap-4 ${index > 0 ? 'border-t' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5 sm:mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
                        <Badge className={`${statusInfo.color} text-xs`}>
                          {statusInfo.text}
                        </Badge>
                        {job.is_tradespeople_job && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            Tradespeople
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 line-clamp-2 hidden sm:block">
                        {job.short_description || job.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </span>
                        {job.salary_min && job.salary_max && (
                          <span className="whitespace-nowrap">
                            £{job.salary_min} - £{job.salary_max}
                          </span>
                        )}
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          {job.applications_count || 0} apps
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          {job.views_count || 0} views
                        </span>
                        {expiryText && (
                          <span className={`whitespace-nowrap text-xs ${statusInfo.text === 'Expired' ? 'text-red-600 font-medium' : ''}`}>
                            {expiryText}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/dashboard/homeowner/jobs/${job.id}`} className="flex-shrink-0 w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
