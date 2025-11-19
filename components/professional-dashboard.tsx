"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Briefcase, MapPin, Edit, BookmarkIcon, FileText, ExternalLink, Clock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import ProfessionalPaymentModal from "./professional-payment-modal"
import { LocationPicker } from "@/components/ui/location-picker"
import { AdminButton } from "@/components/admin-button"
import ActivelyLookingModal from "@/components/actively-looking-modal"
import { usePremiumStatus } from "@/hooks/use-premium-status"

interface User {
  id: string
  email: string
  profile_photo_url?: string
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  nickname?: string
  title: string
  bio: string
  location: string
  experience_level: string
  skills: string[]
  portfolio_url?: string
  linkedin_url?: string
  github_url?: string
  salary_min?: number
  available_for_work: boolean
  cv_url?: string
  profile_photo_url?: string
  profile_visible?: boolean
  resume_url?: string
  actively_looking?: boolean
  actively_looking_until?: string
  cv_public?: boolean
  latitude?: number
  longitude?: number
}

interface Application {
  id: string
  status: string
  applied_at: string
  jobs: {
    id: string
    title: string
    company_profiles: {
      company_name: string
    }
  }
}

interface SavedJob {
  id: string
  saved_at: string
  jobs: {
    id: string
    title: string
    location: string
    job_type: string
    company_profiles: {
      company_name: string
    }
  }
}

interface ProfessionalDashboardProps {
  user: User
  profile: Profile
  applications: Application[]
  savedJobs: SavedJob[]
  hasCV: boolean
}

export default function ProfessionalDashboard({ user, profile, applications, savedJobs, hasCV }: ProfessionalDashboardProps) {
  const [profileVisible, setProfileVisible] = useState(profile.profile_visible ?? true)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const [activelyLooking, setActivelyLooking] = useState(profile.actively_looking ?? false)
  const [updatingActivelyLooking, setUpdatingActivelyLooking] = useState(false)
  const [activelyLookingUntil, setActivelyLookingUntil] = useState<Date | null>(
    profile.actively_looking_until ? new Date(profile.actively_looking_until) : null
  )
  const [showActivelyLookingModal, setShowActivelyLookingModal] = useState(false)
  const [expirationWarning, setExpirationWarning] = useState<string | null>(null)
  const [cvPublic, setCvPublic] = useState(profile.cv_public ?? false)
  const [updatingCvVisibility, setUpdatingCvVisibility] = useState(false)
  const [adminSettings, setAdminSettings] = useState({
    professional_actively_looking_enabled: true,
    job_posting_free: true,
    job_posting_default_price: 0.00,
    enquiry_fee: 5.00,
    actively_looking_price: 0.00,
    actively_looking_free: true,
    subscriptions_enabled: false
  })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [latitude, setLatitude] = useState<number | null>(profile.latitude || null)
  const [longitude, setLongitude] = useState<number | null>(profile.longitude || null)
  const [location, setLocation] = useState<string>(profile.location || '')
  const [salaryMin, setSalaryMin] = useState<number | null>(profile.salary_min || null)
  const [loadingJobs, setLoadingJobs] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  // NOTE: Subscriptions are only for companies and contractors (businesses), not jobseekers/professionals
  // Passing 'professional' ensures the hook returns early without checking
  const premiumStatus = usePremiumStatus(user.id, 'professional')

  console.log("[PROFESSIONAL-DASHBOARD] Component received user:", {
    hasUser: !!user,
    userEmail: user?.email,
    userEmailExists: !!user?.email,
    userMetadataEmail: (user as any)?.user_metadata?.email,
    userNewEmail: (user as any)?.new_email,
    userObject: user
  })

  // Check for expired "actively looking" status on mount and periodically
  useEffect(() => {
    const checkExpiration = async () => {
      if (activelyLooking && activelyLookingUntil) {
        const now = new Date()
        const expirationDate = new Date(activelyLookingUntil)

        // If expired, disable it
        if (expirationDate <= now) {
          console.log("[PROFESSIONAL-DASHBOARD] Actively looking status expired")
          setActivelyLooking(false)
          setActivelyLookingUntil(null)
          setExpirationWarning("Your 'Actively Looking' status has expired. Enable it again to stay visible to employers.")

          // Update database
          await supabase
            .from("professional_profiles")
            .update({ actively_looking: false, actively_looking_until: null })
            .eq("id", profile.id)
        } else {
          // Check if expiring soon (within 24 hours)
          const hoursUntilExpiry = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
          if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0) {
            const daysRemaining = Math.floor(hoursUntilExpiry / 24)
            const hoursRemaining = Math.floor(hoursUntilExpiry % 24)

            if (daysRemaining > 0) {
              setExpirationWarning(`Your "Actively Looking" status expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`)
            } else if (hoursRemaining > 1) {
              setExpirationWarning(`Your "Actively Looking" status expires in ${hoursRemaining} hours`)
            } else {
              setExpirationWarning(`Your "Actively Looking" status expires in less than 1 hour!`)
            }
          } else {
            setExpirationWarning(null)
          }
        }
      }
    }

    checkExpiration()

    // Check expiration every minute
    const interval = setInterval(checkExpiration, 60000)
    return () => clearInterval(interval)
  }, [activelyLooking, activelyLookingUntil, profile.id, supabase])

  // Load admin settings to check if actively looking feature is enabled
  useEffect(() => {
    async function loadAdminSettings() {
      try {
        const { data, error } = await supabase.rpc("get_admin_settings")

        if (error) {
          console.warn("Admin settings unavailable, using defaults:", error.message)
          // Use default settings if admin settings can't be loaded
          setAdminSettings({
            professional_actively_looking_enabled: true,
            job_posting_free: true,
            job_posting_default_price: 0.00,
            enquiry_fee: 5.00,
            actively_looking_price: 0.00,
            actively_looking_free: true,
            subscriptions_enabled: false
          })
          return
        }

        if (data) {
          setAdminSettings(data)
        } else {
          // Fallback to defaults if no data returned
          setAdminSettings({
            professional_actively_looking_enabled: true,
            job_posting_free: true,
            job_posting_default_price: 0.00,
            enquiry_fee: 5.00,
            actively_looking_price: 0.00,
            actively_looking_free: true,
            subscriptions_enabled: false
          })
        }
      } catch (err) {
        console.warn("Exception loading admin settings, using defaults:", err)
        // Graceful fallback on any exception
        setAdminSettings({
          professional_actively_looking_enabled: true,
          job_posting_free: true,
          job_posting_default_price: 0.00,
          enquiry_fee: 5.00,
          actively_looking_price: 0.00,
          actively_looking_free: true,
          subscriptions_enabled: false
        })
      }
    }

    loadAdminSettings()
  }, [supabase])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-800"
      case "reviewed":
        return "bg-blue-100 text-blue-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }


  const handleVisibilityToggle = async (visible: boolean) => {
    setUpdatingVisibility(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("professional_profiles")
        .update({ profile_visible: visible })
        .eq("id", profile.id)

      if (error) {
        console.error("[v0] Error updating profile visibility:", error.message)
        if (error.message.includes("profile_visible")) {
          console.log("[v0] Profile visibility feature not yet available - database migration needed")
        }
        return
      }

      setProfileVisible(visible)
      console.log("[v0] Profile visibility updated successfully:", visible)
    } catch (error) {
      console.error("[v0] Error updating profile visibility:", error)
    } finally {
      setUpdatingVisibility(false)
    }
  }

  const handleActivelyLookingToggle = async (actively: boolean) => {
    // If turning off, disable it
    if (!actively) {
      setUpdatingActivelyLooking(true)
      try {
        const { error } = await supabase
          .from("professional_profiles")
          .update({
            actively_looking: false,
            actively_looking_until: null
          })
          .eq("id", profile.id)

        if (error) {
          console.error("[PROFESSIONAL-DASHBOARD] Error disabling actively looking:", error.message)
          return
        }

        setActivelyLooking(false)
        setActivelyLookingUntil(null)
        setExpirationWarning(null)
        console.log("[PROFESSIONAL-DASHBOARD] Actively looking status disabled")
      } catch (error) {
        console.error("[PROFESSIONAL-DASHBOARD] Error updating actively looking status:", error)
      } finally {
        setUpdatingActivelyLooking(false)
      }
      return
    }

    // If turning on, show modal to select duration
    setShowActivelyLookingModal(true)
  }

  const handleActivelyLookingConfirm = async (days: number) => {
    setUpdatingActivelyLooking(true)
    try {
      // Calculate expiration date
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + days)

      const { error } = await supabase
        .from("professional_profiles")
        .update({
          actively_looking: true,
          actively_looking_until: expirationDate.toISOString()
        })
        .eq("id", profile.id)

      if (error) {
        console.error("[PROFESSIONAL-DASHBOARD] Error enabling actively looking:", error.message)
        return
      }

      setActivelyLooking(true)
      setActivelyLookingUntil(expirationDate)
      setExpirationWarning(null)
      console.log("[PROFESSIONAL-DASHBOARD] Actively looking enabled for", days, "days until", expirationDate)
    } catch (error) {
      console.error("[PROFESSIONAL-DASHBOARD] Error updating actively looking status:", error)
    } finally {
      setUpdatingActivelyLooking(false)
    }
  }

  const handlePaymentComplete = async (paymentData: any) => {
    console.log("[v0] Payment completed for actively looking feature:", paymentData)
    setShowPaymentModal(false)

    // Show modal to select duration after successful payment
    setShowActivelyLookingModal(true)

    // Here you could also store payment record in database
    // await supabase.from("professional_payments").insert({
    //   user_id: user.id,
    //   feature: "actively_looking",
    //   payment_data: paymentData,
    //   amount: adminSettings.actively_looking_price
    // })
  }

  const handleSalaryUpdate = async (value: string) => {
    try {
      const numericValue = value === "" ? null : parseInt(value)

      // Update local state immediately for responsive UI
      setSalaryMin(numericValue)

      console.log(`[SALARY-UPDATE] Attempting to update salary_min to:`, numericValue)
      console.log(`[SALARY-UPDATE] Profile ID:`, profile.id)
      console.log(`[SALARY-UPDATE] User ID:`, user.id)

      // First, let's test if we can read the profile
      const { data: testRead, error: readError } = await supabase
        .from("professional_profiles")
        .select("id, salary_min")
        .eq("id", profile.id)
        .single()

      if (readError) {
        console.error(`[SALARY-UPDATE] Error reading profile:`, readError)
        setSalaryMin(profile.salary_min || null)
        return
      }

      console.log(`[SALARY-UPDATE] Current profile data:`, testRead)

      const { data: updateData, error } = await supabase
        .from("professional_profiles")
        .update({ salary_min: numericValue })
        .eq("id", profile.id)
        .select()

      if (error) {
        console.error(`[SALARY-UPDATE] Error updating salary_min:`, error.message)
        console.error(`[SALARY-UPDATE] Full error:`, error)
        console.error(`[SALARY-UPDATE] Error code:`, error.code)
        // Revert local state on error
        setSalaryMin(profile.salary_min || null)
        return
      }

      console.log(`[SALARY-UPDATE] salary_min updated successfully:`, numericValue)
      console.log(`[SALARY-UPDATE] Update result:`, updateData)
    } catch (error) {
      console.error(`[SALARY-UPDATE] Exception updating salary_min:`, error)
      // Revert local state on error
      setSalaryMin(profile.salary_min || null)
    }
  }

  const handleCvVisibilityToggle = async (isPublic: boolean) => {
    setUpdatingCvVisibility(true)
    try {
      const { error } = await supabase
        .from("professional_profiles")
        .update({ cv_public: isPublic })
        .eq("id", profile.id)

      if (error) {
        console.error("[v0] Error updating CV visibility:", error.message)
        return
      }

      setCvPublic(isPublic)
      console.log("[v0] CV visibility updated successfully:", isPublic)
    } catch (error) {
      console.error("[v0] Error updating CV visibility:", error)
    } finally {
      setUpdatingCvVisibility(false)
    }
  }

  const handleLocationSelect = async (lat: number, lng: number, address?: string) => {
    try {
      const updateData: any = {
        latitude: lat,
        longitude: lng
      }

      // If we have an address, also update the location field
      if (address) {
        updateData.location = address
      }

      const { error } = await supabase
        .from("professional_profiles")
        .update(updateData)
        .eq("id", profile.id)

      if (error) {
        console.error("Error updating location:", error)
        return
      }

      setLatitude(lat)
      setLongitude(lng)

      // Update the location state if we have an address
      if (address) {
        setLocation(address)
      }

      console.log("Location updated successfully", address ? `with address: ${address}` : '')
    } catch (error) {
      console.error("Error updating location:", error)
    }
  }

  const handleLocationClear = async () => {
    try {
      const { error } = await supabase
        .from("professional_profiles")
        .update({
          latitude: null,
          longitude: null,
          location: null
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Error clearing location:", error)
        return
      }

      setLatitude(null)
      setLongitude(null)
      setLocation('')
      console.log("Location cleared successfully")
    } catch (error) {
      console.error("Error clearing location:", error)
    }
  }

  const handleBrowseJobs = () => {
    setLoadingJobs(true)

    // Get user's location
    if (!latitude || !longitude) {
      // Try to get current geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude
            const userLon = position.coords.longitude
            // Navigate to jobs page with location pre-filled
            router.push(`/jobs?lat=${userLat}&lng=${userLon}&radius=10`)
            setLoadingJobs(false)
          },
          (error) => {
            console.error("Error getting location:", error)
            // Navigate to jobs page without location - user can set it there
            router.push("/jobs")
            setLoadingJobs(false)
          }
        )
      } else {
        // Navigate to jobs page without location
        router.push("/jobs")
        setLoadingJobs(false)
      }
    } else {
      // Navigate to jobs page with profile location
      router.push(`/jobs?lat=${latitude}&lng=${longitude}&radius=10&location=${encodeURIComponent(location)}`)
      setLoadingJobs(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 py-4 md:px-4 md:py-8">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-1 space-y-3 md:space-y-6">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 md:space-x-4 flex-1">
                    <Avatar className="h-12 w-12 md:h-16 md:w-16 rounded-full">
                      <AvatarImage
                        src={profile.profile_photo_url || user.profile_photo_url || "/placeholder.svg"}
                        className="object-cover w-full h-full rounded-full"
                      />
                      <AvatarFallback className="text-sm md:text-lg rounded-full">
                        {profile.first_name[0]}
                        {profile.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {profile.nickname && (
                        <p className="text-base md:text-lg font-bold text-blue-800 truncate break-words">"{profile.nickname}"</p>
                      )}
                      <h2 className="text-lg md:text-xl font-semibold text-foreground truncate break-words">
                        {profile.first_name} {profile.last_name}
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground truncate break-words">{profile.title}</p>
                      <div className="mt-2 space-y-3">
                        {/* Profile Visibility Section */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                profileVisible && profile.available_for_work ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs md:text-sm font-medium truncate">
                                {profileVisible && profile.available_for_work
                                  ? "Available for work"
                                  : "Not available for work"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {profileVisible ? "Visible to employers" : "Hidden from employers"}
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

                        {/* Actively Looking Section */}
                        {adminSettings.professional_actively_looking_enabled && profileVisible && profile.available_for_work && (
                          <div className="flex items-center justify-between pl-4 border-l-2 border-gray-200">
                            <div className="flex flex-col min-w-0 flex-1 pr-3">
                              <span className="text-xs md:text-sm font-medium">
                                {activelyLooking ? "Priority visibility" : "Stand out to employers"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {activelyLooking ? "Visible on map with priority" : "Show that you're actively looking"}
                              </span>
                              {activelyLooking && activelyLookingUntil && (
                                <div className="mt-1">
                                  <span className="text-xs font-bold text-green-600 block">
                                    Actively looking for opportunities
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    Expires: {new Date(activelyLookingUntil).toLocaleDateString()} at {new Date(activelyLookingUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                              {expirationWarning && (
                                <span className="text-xs font-semibold text-amber-600 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {expirationWarning}
                                </span>
                              )}
                            </div>
                            <Switch
                              checked={activelyLooking}
                              onCheckedChange={handleActivelyLookingToggle}
                              disabled={updatingActivelyLooking}
                              className="scale-75 flex-shrink-0"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild className="ml-2 flex-shrink-0 bg-transparent">
                    <Link href="/profile/edit">
                      <Edit className="h-3 w-3 md:h-4 md:w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 pt-0">
                {location && (
                  <div className="flex items-center text-sm md:text-base text-muted-foreground">
                    <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}

                <LocationPicker
                  latitude={latitude || undefined}
                  longitude={longitude || undefined}
                  onLocationSelect={handleLocationSelect}
                  onLocationClear={handleLocationClear}
                  className="w-full"
                />

                {profile.bio && <p className="text-sm md:text-base text-foreground">{profile.bio}</p>}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm md:text-base text-foreground">Experience Level</h4>
                  <Badge variant="secondary" className="capitalize text-xs md:text-sm">
                    {profile.experience_level.replace("_", " ")}
                  </Badge>
                </div>

                {profile.skills && profile.skills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm md:text-base text-foreground">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {profile.skills.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{profile.skills.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm md:text-base text-foreground flex items-center">
                    Salary Expectations
                  </h4>
                  <div className="bg-muted rounded-lg p-2 md:p-3 space-y-3">
                    {salaryMin ? (
                      <div>
                        <p className="text-sm md:text-base font-medium text-foreground">
                          Minimum £{salaryMin?.toLocaleString()} per year
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No minimum salary set</p>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="salary_min" className="text-xs text-muted-foreground">Update minimum salary (£)</Label>
                      <Input
                        id="salary_min"
                        type="number"
                        placeholder="Enter amount (e.g., 35000)"
                        value={salaryMin || ""}
                        onChange={(e) => handleSalaryUpdate(e.target.value)}
                        className="text-xs h-8"
                      />
                      <p className="text-xs text-muted-foreground">Changes are saved automatically</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  {profile.portfolio_url && (
                    <Button variant="outline" size="sm" asChild className="text-xs md:text-sm bg-transparent">
                      <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        Portfolio
                      </a>
                    </Button>
                  )}
                  {profile.linkedin_url && (
                    <Button variant="outline" size="sm" asChild className="text-xs md:text-sm bg-transparent">
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {profile.github_url && (
                    <Button variant="outline" size="sm" asChild className="text-xs md:text-sm bg-transparent">
                      <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        GitHub
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex items-center text-foreground text-base md:text-lg">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  CV Builder
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Build your professional CV directly on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 md:py-8">
                  <div className={`${hasCV ? 'bg-green-50 border-2 border-green-200' : 'bg-blue-50 border-2 border-blue-200'} rounded-lg p-3 md:p-6`}>
                    <div className="flex justify-center mb-2 md:mb-3">
                      <div className={`${hasCV ? 'bg-green-100' : 'bg-blue-100'} p-2 md:p-3 rounded-full`}>
                        <FileText className={`h-6 w-6 md:h-8 md:w-8 ${hasCV ? 'text-green-600' : 'text-blue-600'}`} />
                      </div>
                    </div>
                    {hasCV ? (
                      <>
                        <p className="text-base md:text-lg font-medium text-green-800 mb-1 md:mb-2">
                          CV Ready
                        </p>
                        <p className="text-xs md:text-sm text-green-700 mb-3 md:mb-4">
                          Your professional CV is built and ready for employers
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
                          <Button className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm" asChild>
                            <Link href="/cv/builder">Edit CV</Link>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-base md:text-lg font-medium text-blue-800 mb-1 md:mb-2">
                          Build Your Professional CV
                        </p>
                        <p className="text-xs md:text-sm text-blue-700 mb-3 md:mb-4">
                          Create a structured CV that employers can easily search and filter
                        </p>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm mb-4" asChild>
                          <Link href="/cv/builder">Start Building CV</Link>
                        </Button>
                      </>
                    )}

                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-3 md:space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
                <Button
                  onClick={handleBrowseJobs}
                  disabled={loadingJobs}
                  className="h-auto p-2 sm:p-3 md:p-4 flex-col bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  <Briefcase className="h-7 w-7 sm:h-10 sm:w-10 md:h-12 md:w-12 mb-1 md:mb-2" />
                  <span className="font-bold text-xs sm:text-sm md:text-lg">
                    {loadingJobs ? "Loading..." : "Browse Jobs"}
                  </span>
                  <span className="text-xs opacity-70 hidden md:block">Find opportunities</span>
                </Button>
                <Button
                  asChild
                  className="h-auto p-2 sm:p-3 md:p-4 flex-col bg-orange-600 hover:bg-orange-700 text-white border-0"
                >
                  <Link href="/contractors">
                    <Briefcase className="h-7 w-7 sm:h-10 sm:w-10 md:h-12 md:w-12 mb-1 md:mb-2" />
                    <span className="font-bold text-xs sm:text-sm md:text-lg">Browse Contractors</span>
                    <span className="text-xs opacity-70 hidden md:block">Find Trades</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-2 sm:p-3 md:p-4 flex-col bg-transparent"
                >
                  <Link href="/dashboard/professional/saved">
                    <BookmarkIcon className="h-7 w-7 sm:h-10 sm:w-10 md:h-12 md:w-12 mb-1 md:mb-2" />
                    <span className="font-bold text-xs sm:text-sm md:text-lg">Saved Jobs</span>
                    <span className="text-xs opacity-70">({savedJobs.length})</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-2 sm:p-3 md:p-4 flex-col bg-transparent"
                >
                  <Link href="/dashboard/professional/applications">
                    <FileText className="h-7 w-7 sm:h-10 sm:w-10 md:h-12 md:w-12 mb-1 md:mb-2" />
                    <span className="font-bold text-xs sm:text-sm md:text-lg">Applications</span>
                    <span className="text-xs opacity-70">({applications.length})</span>
                  </Link>
                </Button>
              </div>

              {/* Admin Button - Only visible for admin users */}
              <div className="flex justify-center">
                <AdminButton />
              </div>
            </div>


            <Card>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="flex items-center text-foreground text-sm md:text-base">
                  <FileText className="h-4 w-4 mr-2" />
                  Recent Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-3 md:py-4 text-muted-foreground">
                    <FileText className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium mb-1 text-sm">No applications yet</p>
                    <p className="text-xs mb-2">Start applying to jobs</p>
                    <Button size="sm" asChild className="text-xs">
                      <Link href="/jobs">Browse Jobs</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {applications.slice(0, 3).map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {application.jobs.title}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {application.jobs.company_profiles.company_name}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(application.status)} text-xs ml-2 flex-shrink-0`}>
                          {application.status}
                        </Badge>
                      </div>
                    ))}
                    <Button variant="outline" asChild className="w-full bg-transparent text-xs">
                      <Link href="/dashboard/professional/applications">
                        View All Applications ({applications.length})
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="flex items-center text-foreground text-sm md:text-base">
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  Saved Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedJobs.length === 0 ? (
                  <div className="text-center py-3 md:py-4 text-muted-foreground">
                    <BookmarkIcon className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium mb-1 text-sm">No saved jobs yet</p>
                    <p className="text-xs mb-2">Save jobs to apply later</p>
                    <Button size="sm" asChild className="text-xs">
                      <Link href="/jobs">Browse Jobs</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedJobs.slice(0, 3).map((savedJob) => (
                      <div
                        key={savedJob.id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {savedJob.jobs.title}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {savedJob.jobs.company_profiles.company_name}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="flex items-center truncate">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              {savedJob.jobs.location}
                            </span>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {savedJob.jobs.job_type}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="ml-2 flex-shrink-0 text-xs bg-transparent"
                        >
                          <Link href={`/jobs/${savedJob.jobs.id}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" asChild className="w-full bg-transparent text-xs">
                      <Link href="/dashboard/professional/saved">
                        View All Saved Jobs ({savedJobs.length})
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <ProfessionalPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        featureName="Actively Looking"
        price={adminSettings.actively_looking_price || 0}
        description="Get priority visibility to employers and stand out as someone actively seeking new opportunities"
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Actively Looking Duration Modal */}
      <ActivelyLookingModal
        isOpen={showActivelyLookingModal}
        onClose={() => setShowActivelyLookingModal(false)}
        onConfirm={handleActivelyLookingConfirm}
        isPremium={premiumStatus.isPremium}
      />
    </div>
  )
}
