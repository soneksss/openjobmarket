"use client"

import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
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
  Eye,
  EyeOff,
  User,
  Search
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
  const [profileVisible, setProfileVisible] = useState(true)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const router = useRouter()

  const handleVisibilityToggle = async (visible: boolean) => {
    setUpdatingVisibility(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("homeowner_profiles")
        .update({ profile_visible: visible })
        .eq("id", profile.id)

      if (error) throw error

      setProfileVisible(visible)
      router.refresh()
    } catch (err) {
      console.error("Failed to toggle visibility:", err)
    } finally {
      setUpdatingVisibility(false)
    }
  }

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
    // Get user's location and navigate to contractors page
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude
          const userLon = position.coords.longitude
          // Navigate to contractors page with location pre-filled
          router.push(`/contractors?lat=${userLat}&lng=${userLon}&radius=10`)
        },
        (error) => {
          console.error("Error getting location:", error)
          // Navigate to contractors page without location - user can set it there
          router.push("/contractors")
        }
      )
    } else {
      // Navigate to contractors page without location
      router.push("/contractors")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 py-4 md:px-4 md:py-8">
        <div className="grid lg:grid-cols-4 gap-4 md:gap-8">
          {/* Left Column - Profile */}
          <div className="lg:col-span-1 space-y-3 md:space-y-6">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 md:space-x-4 flex-1">
                    <Avatar className="h-12 w-12 md:h-16 md:w-16 rounded-full">
                      <AvatarImage
                        src={profile.profile_photo_url || user?.profile_photo_url || "/placeholder.svg"}
                        className="object-cover w-full h-full rounded-full"
                      />
                      <AvatarFallback className="text-sm md:text-lg rounded-full">
                        {profile.first_name[0]}
                        {profile.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h2 className="text-lg md:text-xl font-semibold text-foreground truncate break-words">
                        {profile.first_name} {profile.last_name}
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground truncate break-words">Homeowner</p>
                      <div className="mt-2 space-y-3">
                        {/* Profile Visibility Section */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                profileVisible ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs md:text-sm font-medium truncate">
                                {profileVisible ? "Profile Visible" : "Profile Hidden"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {profileVisible ? "Tradespeople can see you" : "Hidden from tradespeople"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {profileVisible ? (
                              <Eye className="h-3 w-3 text-green-500" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                            )}
                            <Switch
                              checked={profileVisible}
                              onCheckedChange={handleVisibilityToggle}
                              disabled={updatingVisibility}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link href="/dashboard/homeowner/profile">
                    <Button variant="ghost" size="icon" className="ml-2 flex-shrink-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <div className="px-6 pb-6 space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{profile.location}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Member since {new Date().getFullYear()}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Middle & Right Columns - Main Content */}
          <div className="lg:col-span-3 space-y-4 md:space-y-8">
        {/* Quick Actions Card */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Need help with your project? Post your job (task) with a clear description and budget, or search profiles of local tradespeople.</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleFindTradespeople}
              className="w-full h-20 justify-start bg-orange-500 hover:bg-orange-600 text-white text-lg"
            >
              <Search className="w-6 h-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Find Tradespeople</div>
                <div className="text-xs opacity-90">Search for contractors nearby</div>
              </div>
            </Button>
            <Link href="/dashboard/homeowner/post-job" className="block">
              <Button className="w-full h-20 justify-start bg-blue-600 hover:bg-blue-700 text-white text-lg">
                <Plus className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Post a New Job</div>
                  <div className="text-xs opacity-90">Create a job posting</div>
                </div>
              </Button>
            </Link>
          </div>
        </Card>

        {/* Put Me on the Market Toggle */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                {onMarket ? (
                  <ToggleRight className="w-6 h-6 text-green-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
                Put Me on the Market
              </h3>
              <p className="text-gray-600">
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
              size="lg"
              className={onMarket ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isTogglingMarket ? "..." : onMarket ? "Turn Off" : "Turn On"}
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs Posted</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalJobs}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.activeJobs}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.completedJobs}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Jobs</h2>
            <Link href="/dashboard/homeowner/jobs">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          {jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs yet</h3>
              <p className="text-gray-600 mb-6">
                Post your first job to get started with finding help for your tasks
              </p>
              <Link href="/dashboard/homeowner/post-job">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job) => {
                const statusInfo = getStatusInfo(job)
                const expiryText = formatExpiryDate(job.expires_at)

                return (
                  <Card key={job.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <Badge className={statusInfo.color}>
                            {statusInfo.text}
                          </Badge>
                          {job.is_tradespeople_job && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Tradespeople
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {job.short_description || job.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                          {job.salary_min && job.salary_max && (
                            <span>
                              £{job.salary_min} - £{job.salary_max}
                              {job.salary_frequency && ` ${job.salary_frequency.replace('_', ' ')}`}
                            </span>
                          )}
                          {expiryText && (
                            <span className={statusInfo.text === 'Expired' ? 'text-red-600 font-medium' : ''}>
                              {expiryText}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/dashboard/homeowner/jobs/${job.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
