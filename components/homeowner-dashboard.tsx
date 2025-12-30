"use client"

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RatingDisplay } from "@/components/rating-display"
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
  User,
  Search,
  Users,
  Eye,
  FileText,
  BookmarkIcon,
  Home,
  Edit
} from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"

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
  nickname?: string
  title?: string
  location: string
  on_market: boolean
  profile_photo_url?: string
  average_rating?: number
  reviews_count?: number
  skills?: string[]
  bio?: string
  cv_url?: string
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
  const { t, locale } = useTranslation()
  const [onMarket, setOnMarket] = useState(profile.on_market)
  const [isTogglingMarket, setIsTogglingMarket] = useState(false)
  const [profileVisible, setProfileVisible] = useState(true)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
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

      if (!onMarket) {
        router.push("/dashboard/homeowner/profile?setup_market=true")
      }
    } catch (err) {
      console.error("Failed to toggle market status:", err)
    } finally {
      setIsTogglingMarket(false)
    }
  }

  const handleToggleVisibility = async () => {
    setUpdatingVisibility(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("homeowner_profiles")
        .update({ profile_visible: !profileVisible })
        .eq("id", profile.id)

      if (error) throw error

      setProfileVisible(!profileVisible)
    } catch (err) {
      console.error("Failed to toggle visibility:", err)
    } finally {
      setUpdatingVisibility(false)
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


  const displayTitle = onMarket ? (profile.title || "Professional") : "Homeowner"
  const displayName = onMarket && profile.nickname ? profile.nickname : `${profile.first_name} ${profile.last_name}`

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <Card className="p-3">
              <div className="relative">
                <Link href="/dashboard/homeowner/profile" className="absolute top-0 right-0">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-12 w-12 rounded-full">
                    <AvatarImage
                      src={profile.profile_photo_url || user?.profile_photo_url || "/placeholder.svg"}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-sm">
                      {profile.first_name[0]}{profile.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold truncate">{displayName}</h2>
                    <p className="text-xs text-muted-foreground">{displayTitle}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </div>

                  <RatingDisplay
                    rating={profile.average_rating || 0}
                    reviewsCount={profile.reviews_count || 0}
                    size="sm"
                  />

                  <div className="flex items-center text-muted-foreground">
                    <User className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span>Member {new Date().getFullYear()}</span>
                  </div>

                  {onMarket && (
                    <>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Visibility</span>
                          <Switch
                            checked={profileVisible}
                            onCheckedChange={handleToggleVisibility}
                            disabled={updatingVisibility}
                            className="scale-75"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {profileVisible ? <><Eye className="h-2 w-2 inline mr-1" />Visible</> : "Hidden"}
                        </p>
                      </div>

                      {profile.skills && profile.skills.length > 0 && (
                        <div className="pt-1">
                          <p className="text-xs font-medium mb-1">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {profile.skills.slice(0, 3).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs px-1 py-0">
                                {skill}
                              </Badge>
                            ))}
                            {profile.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                +{profile.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <Link href="/dashboard/homeowner/profile" className="block pt-2">
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                      <Settings className="h-3 w-3 mr-1" />
                      Edit Profile
                    </Button>
                  </Link>

                  <Link href="/account/settings" className="block">
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                      Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-3">
            {/* Put Me on the Market Toggle */}
            <Card className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold flex items-center gap-1 mb-1">
                    {onMarket ? (
                      <ToggleRight className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm">Put Me on the Market</span>
                  </h2>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {onMarket ? (
                      "✅ Visible as professional!"
                    ) : (
                      "Turn on to appear as professional"
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleToggleMarket}
                  disabled={isTogglingMarket}
                  size="sm"
                  className={`${onMarket ? "bg-green-600 hover:bg-green-700" : ""} h-7 text-xs flex-shrink-0`}
                >
                  {isTogglingMarket ? "..." : onMarket ? "Off" : "On"}
                </Button>
              </div>
            </Card>

            {/* Professional Features - Only shown when on_market is true */}
            {onMarket && (
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <FileText className="h-3 w-3" />
                    <h3 className="text-xs font-semibold">CV Builder</h3>
                  </div>
                  <Link href="/dashboard/homeowner/cv-builder">
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                      {profile.cv_url ? "Edit" : "Build"}
                    </Button>
                  </Link>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      <h3 className="text-xs font-semibold">Applications</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs px-1 py-0">0</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">No applications</p>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <BookmarkIcon className="h-3 w-3" />
                      <h3 className="text-xs font-semibold">Saved</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs px-1 py-0">0</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">No saved jobs</p>
                </Card>
              </div>
            )}

            {/* Homeowner Services */}
            <Card className="p-3">
              <div className="flex items-center gap-1 mb-2">
                <Home className="h-4 w-4" />
                <h2 className="text-sm font-bold">Homeowner Services</h2>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Button asChild size="sm" className="h-auto py-2 flex-col bg-blue-500 hover:bg-blue-600 text-xs">
                  <Link href={locale === 'pt-BR' ? '/br' : '/'}>
                    <Search className="h-4 w-4 mb-1" />
                    <span className="font-semibold leading-tight">Back to Search</span>
                  </Link>
                </Button>

                <Button asChild size="sm" className="h-auto py-2 flex-col bg-purple-600 hover:bg-purple-700 text-xs">
                  <Link href="/dashboard/homeowner/post-job">
                    <Plus className="h-4 w-4 mb-1" />
                    <span className="font-semibold leading-tight">Post</span>
                  </Link>
                </Button>

                <Button variant="outline" asChild size="sm" className="h-auto py-2 flex-col text-xs">
                  <Link href="/dashboard/homeowner/jobs">
                    <Briefcase className="h-4 w-4 mb-1" />
                    <span className="font-semibold leading-tight">Jobs</span>
                    <span className="text-xs opacity-70">({stats.totalJobs})</span>
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-lg font-bold">{stats.totalJobs}</div>
                    </div>
                    <Briefcase className="h-4 w-4 text-primary opacity-50" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Active</div>
                      <div className="text-lg font-bold">{stats.activeJobs}</div>
                    </div>
                    <Clock className="h-4 w-4 text-green-600 opacity-50" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Done</div>
                      <div className="text-lg font-bold">{stats.completedJobs}</div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-purple-600 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Recent Jobs */}
              {jobs.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Recent Jobs</h3>
                    <Link href="/dashboard/homeowner/jobs">
                      <Button variant="ghost" size="sm" className="h-6 text-xs">All</Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {jobs.slice(0, 3).map((job) => {
                      const statusInfo = getStatusInfo(job)

                      return (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <div className="flex items-center gap-1 mb-1">
                              <h4 className="text-xs font-semibold truncate">{job.title}</h4>
                              <Badge className={`${statusInfo.color} text-xs px-1 py-0`}>
                                {statusInfo.text}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-2 h-2 flex-shrink-0" />
                                <span className="truncate">{job.location}</span>
                              </span>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Users className="w-2 h-2" />
                                {job.applications_count || 0}
                              </span>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Eye className="w-2 h-2" />
                                {job.views_count || 0}
                              </span>
                            </div>
                          </div>
                          <Link href={`/dashboard/homeowner/jobs/${job.id}`}>
                            <Button variant="outline" size="sm" className="h-6 text-xs px-2">View</Button>
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <h3 className="text-sm font-semibold mb-1">No jobs yet</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Post your first job
                  </p>
                  <Link href="/dashboard/homeowner/post-job">
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Post Job
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
