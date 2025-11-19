"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import Image from "next/image"
import {
  Briefcase,
  MapPin,
  Edit,
  Plus,
  Users,
  FileText,
  TrendingUp,
  ExternalLink,
  Eye,
  EyeOff,
  Calendar,
  Search,
  Filter,
  BarChart3,
  Building2,
  Camera,
  Clock,
  AlertTriangle,
  Store,
  UserCheck,
  Globe,
  Star,
  Info,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import pica from "pica"
import JobExpirationAlerts from "./job-expiration-alerts"
import { LocationPicker } from "@/components/ui/location-picker"
import { AdminButton } from "@/components/admin-button"
import { StarRating } from "@/components/star-rating"

interface User {
  id: string
  email: string
}

interface CompanyProfile {
  id: string
  company_name: string
  description: string
  industry: string
  services?: string[]
  website_url?: string
  location: string
  latitude?: number
  longitude?: number
  logo_url?: string
  profile_visible?: boolean
  open_for_business?: boolean
  is_hiring?: boolean
}

interface Job {
  id: string
  title: string
  job_type: string
  work_location: string
  location: string
  is_active: boolean
  applications_count: number
  views_count: number
  created_at: string
  expires_at?: string
  expiration_status?: string
  days_until_expiration?: number
}

interface ReceivedApplication {
  id: string
  status: string
  applied_at: string
  jobs: {
    id: string
    title: string
  }
  professional_profiles: {
    first_name: string
    last_name: string
    title: string
    location: string
    profile_photo_url?: string
    user_id?: string
  } | null
  company_profiles: {
    id: string
    company_name: string
    industry: string
    location: string
    logo_url?: string
    user_id?: string
  } | null
  applicant_type: "professional" | "company" | "unknown"
}

interface SubmittedApplication {
  id: string
  status: string
  applied_at: string
  job_id: string
  jobs: {
    id: string
    title: string
    location: string
    job_type: string
    is_tradespeople_job: boolean
  }
  job_poster_name: string
  job_poster_avatar: string | null
}

interface Stats {
  totalApplications: number
  activeJobs: number
  totalJobs: number
}

interface Rating {
  average_rating: number
  total_reviews: number
}

interface Review {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  is_edited: boolean
  reviewer_id: string
  reviewer_name: string
  reviewer_avatar: string | null
}

interface CompanyDashboardProps {
  user: User
  profile: CompanyProfile
  jobs: Job[]
  receivedApplications: ReceivedApplication[]
  submittedApplications: SubmittedApplication[]
  stats: Stats
  rating: Rating
  reviews: Review[]
}

export default function CompanyDashboard({ user, profile, jobs, receivedApplications, submittedApplications, stats, rating, reviews }: CompanyDashboardProps) {
  const router = useRouter()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [profileVisible, setProfileVisible] = useState(profile.profile_visible ?? true)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const [openForBusiness, setOpenForBusiness] = useState(profile.open_for_business ?? false)
  const [hiring, setHiring] = useState(profile.is_hiring ?? false)
  const [updatingBusinessStatus, setUpdatingBusinessStatus] = useState(false)
  const [updatingHiringStatus, setUpdatingHiringStatus] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [latitude, setLatitude] = useState<number | null>(profile.latitude || null)
  const [longitude, setLongitude] = useState<number | null>(profile.longitude || null)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)

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

  const getJobStatusBadge = (job: Job) => {
    if (job.expiration_status === "expired") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      )
    } else if (job.expiration_status === "expiring_soon") {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expires in {job.days_until_expiration} day{job.days_until_expiration === 1 ? "" : "s"}
        </Badge>
      )
    } else if (job.is_active) {
      return <Badge variant="default">Active</Badge>
    } else {
      return <Badge variant="secondary">Inactive</Badge>
    }
  }

  // Image resizing helper function
  const resizeImage = async (file: File, maxSize: number = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas")

          // Maintain aspect ratio
          let { width, height } = img
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height

          // Use pica for high-quality resizing
          const picaInstance = pica()
          await picaInstance.resize(img, canvas)

          // Convert to WebP for better compression
          const blob = await picaInstance.toBlob(canvas, "image/webp", 0.85)
          const resizedFile = new File([blob], "logo.webp", { type: "image/webp" })

          URL.revokeObjectURL(img.src)
          resolve(resizedFile)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Original file size validation (10MB before resize)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadingLogo(true)
    try {
      const supabase = createClient()
      console.log("[v0] Starting logo upload and resize for file:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2) + "MB")

      // Resize and optimize the image
      const resizedFile = await resizeImage(file, 300)
      console.log("[v0] Image resized:", "New size:", (resizedFile.size / 1024).toFixed(2) + "KB")

      const fileName = `${user.id}/logo.webp`

      // Delete old logo if exists
      if (profile.logo_url) {
        try {
          const oldPath = profile.logo_url.split('/').slice(-2).join('/') // Get user_id/filename
          console.log("[v0] Attempting to delete old logo:", oldPath)
          await supabase.storage.from("company-logos").remove([oldPath])
        } catch (deleteError) {
          console.warn("[v0] Could not delete old logo:", deleteError)
          // Continue with upload even if deletion fails
        }
      }

      // Upload resized logo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, resizedFile, {
          cacheControl: "3600",
          upsert: true, // Allow overwriting if file exists
        })

      if (uploadError) {
        console.error("[v0] Upload error:", uploadError)

        // Provide more specific error messages
        if (uploadError.message.includes('bucket')) {
          alert("Storage bucket not configured. Please run the CREATE_STORAGE_BUCKETS.sql script in Supabase.")
        } else if (uploadError.message.includes('policy')) {
          alert("Permission denied. Please ensure you're logged in and try again.")
        } else {
          alert(`Error uploading logo: ${uploadError.message}`)
        }
        return
      }

      console.log("[v0] Upload successful:", uploadData)

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("company-logos").getPublicUrl(fileName)

      console.log("[v0] Public URL generated:", publicUrl)

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from("company_profiles")
        .update({ logo_url: publicUrl })
        .eq("id", profile.id)

      if (updateError) {
        console.error("[v0] Error updating profile with logo URL:", updateError)
        alert("Logo uploaded but failed to update profile. Please refresh the page.")
        return
      }

      // Refresh the page to show the new logo
      window.location.reload()
    } catch (error) {
      console.error("[v0] Unexpected error:", error)
      if (error instanceof Error && error.message.includes('canvas')) {
        alert("Error processing image. Please try a different image file.")
      } else {
        alert("Unexpected error uploading logo. Please try again.")
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleVisibilityToggle = async (visible: boolean) => {
    setUpdatingVisibility(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("company_profiles")
        .update({ profile_visible: visible })
        .eq("id", profile.id)

      if (error) {
        console.error("[v0] Error updating company visibility:", error.message)
        if (error.message.includes("column") && error.message.includes("profile_visible")) {
          console.log("[v0] Company visibility feature not yet available - database migration needed")
          alert("Company visibility feature will be available soon. Database migration required.")
        } else {
          alert(`Error updating visibility: ${error.message}`)
        }
        return
      }

      setProfileVisible(visible)
      console.log("[v0] Company visibility updated successfully:", visible)
    } catch (error) {
      console.error("[v0] Error updating company visibility:", error)
      alert("Error updating visibility. Please try again.")
    } finally {
      setUpdatingVisibility(false)
    }
  }

  const handleBusinessStatusToggle = async (status: boolean) => {
    // Update UI immediately
    setOpenForBusiness(status)
    setUpdatingBusinessStatus(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("company_profiles")
        .update({ open_for_business: status })
        .eq("id", profile.id)

      if (error) {
        console.error("[v0] Error updating business status:", error.message)
        if (error.message.includes("column") && error.message.includes("open_for_business")) {
          console.log("[v0] Open for business feature not yet available - database migration needed")
          // Column doesn't exist yet, but keep UI updated
        } else {
          alert(`Error updating business status: ${error.message}`)
          // Revert on actual error
          setOpenForBusiness(!status)
        }
        return
      }

      console.log("[v0] Business status updated successfully:", status)
    } catch (error) {
      console.error("[v0] Error updating business status:", error)
      alert("Error updating business status. Please try again.")
      setOpenForBusiness(!status) // Revert on error
    } finally {
      setUpdatingBusinessStatus(false)
    }
  }

  const handleHiringStatusToggle = async (status: boolean) => {
    // Update UI immediately
    setHiring(status)
    setUpdatingHiringStatus(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("company_profiles")
        .update({ is_hiring: status })
        .eq("id", profile.id)

      if (error) {
        console.error("[v0] Error updating hiring status:", error.message)
        if (error.message.includes("column") && error.message.includes("is_hiring")) {
          console.log("[v0] Hiring status feature not yet available - database migration needed")
          // Column doesn't exist yet, but keep UI updated
        } else {
          alert(`Error updating hiring status: ${error.message}`)
          // Revert on actual error
          setHiring(!status)
        }
        return
      }

      console.log("[v0] Hiring status updated successfully:", status)
    } catch (error) {
      console.error("[v0] Error updating hiring status:", error)
      alert("Error updating hiring status. Please try again.")
      setHiring(!status) // Revert on error
    } finally {
      setUpdatingHiringStatus(false)
    }
  }

  const handleLocationSelect = async (lat: number, lng: number) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("company_profiles")
        .update({
          latitude: lat,
          longitude: lng
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Error updating location:", error)
        return
      }

      setLatitude(lat)
      setLongitude(lng)
      console.log("Location updated successfully")
    } catch (error) {
      console.error("Error updating location:", error)
    }
  }

  const handleLocationClear = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("company_profiles")
        .update({
          latitude: null,
          longitude: null
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Error clearing location:", error)
        return
      }

      setLatitude(null)
      setLongitude(null)
      console.log("Location cleared successfully")
    } catch (error) {
      console.error("Error clearing location:", error)
    }
  }

  const handleSearchJobs = () => {
    setLoadingJobs(true)

    // Get user's location
    if (!latitude || !longitude) {
      // Try to get current geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude
            const userLon = position.coords.longitude
            // Navigate to tasks page with location pre-filled
            router.push(`/tasks?lat=${userLat}&lng=${userLon}&radius=10`)
            setLoadingJobs(false)
          },
          (error) => {
            console.error("Error getting location:", error)
            // Navigate to tasks page without location - user can set it there
            router.push("/tasks")
            setLoadingJobs(false)
          }
        )
      } else {
        // Navigate to tasks page without location
        router.push("/tasks")
        setLoadingJobs(false)
      }
    } else {
      // Navigate to tasks page with profile location
      router.push(`/tasks?lat=${latitude}&lng=${longitude}&radius=10&location=${encodeURIComponent(profile.location)}`)
      setLoadingJobs(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="grid lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Company Profile Section */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-6">
            <Card>
              <CardHeader className="p-2 sm:p-4 relative">
                {/* Edit Button - Top Right Corner */}
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="absolute top-2 right-2 h-8 w-8 p-0 sm:h-9 sm:w-9 bg-transparent z-10"
                >
                  <Link href="/company/profile/edit">
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Link>
                </Button>

                {/* Logo - Top Left */}
                <div className="flex items-start space-x-3 mb-2">
                  <div className="relative flex-shrink-0">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-muted rounded-full overflow-hidden border flex items-center justify-center">
                      {profile.logo_url ? (
                        <img
                          src={profile.logo_url}
                          alt={`${profile.company_name} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="text-sm sm:text-lg font-medium text-muted-foreground">
                          {profile.company_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="bg-primary text-primary-foreground rounded-full p-1 hover:bg-primary/90 transition-colors">
                          <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </div>
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 min-w-0 pr-8">
                    {/* Star Rating */}
                    <div
                      className="mb-1.5 cursor-pointer hover:opacity-80 transition-opacity inline-block"
                      onClick={() => setShowReviewsModal(true)}
                      title="Click to view reviews"
                    >
                      <StarRating
                        rating={rating.average_rating}
                        totalReviews={rating.total_reviews}
                        size="sm"
                        showCount={true}
                      />
                    </div>

                    {/* Company Name */}
                    <h2 className="text-base sm:text-lg font-semibold text-foreground break-words mb-1 leading-tight">
                      {profile.company_name}
                    </h2>

                    {/* Industry */}
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">{profile.industry}</p>
                  </div>
                </div>

                {/* Toggles Section - Moved Below */}
                <div className="space-y-2 pt-2 border-t">
                  {/* Visibility Toggle */}
                  <div className="flex items-center space-x-2">
                    {profileVisible ? (
                      <Eye className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Switch
                      checked={profileVisible}
                      onCheckedChange={handleVisibilityToggle}
                      disabled={updatingVisibility}
                      className="scale-90 data-[state=unchecked]:bg-muted-foreground/20"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground flex-1">
                      {profileVisible ? "Visible to all users" : "Hidden from all users"}
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Learn more"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Profile Visibility</h4>
                          <p className="text-sm text-muted-foreground">
                            When enabled, your company profile is visible to all users on the platform. When disabled, your profile is hidden from search results and public view.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Available Toggle */}
                  <div className="flex items-center space-x-2">
                    {openForBusiness ? (
                      <Store className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Switch
                      checked={openForBusiness}
                      onCheckedChange={handleBusinessStatusToggle}
                      disabled={updatingBusinessStatus}
                      className="scale-90 data-[state=unchecked]:bg-muted-foreground/20"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground flex-1">
                      {openForBusiness ? "Available" : "Not available"}
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Learn more"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Business Availability</h4>
                          <p className="text-sm text-muted-foreground">
                            When enabled, you indicate that your company is currently available and accepting new business opportunities. When disabled, users will see that you're not available for new projects.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Hiring Toggle */}
                  <div className="flex items-center space-x-2">
                    {hiring ? (
                      <UserCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Switch
                      checked={hiring}
                      onCheckedChange={handleHiringStatusToggle}
                      disabled={updatingHiringStatus}
                      className="scale-90 data-[state=unchecked]:bg-muted-foreground/20"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground flex-1">
                      {hiring ? "Hiring" : "Not hiring"}
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Learn more"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Hiring Status</h4>
                          <p className="text-sm text-muted-foreground">
                            When enabled, you indicate that your company is actively hiring and looking for new talent. This makes your company more visible to job seekers. When disabled, users will see that you're not currently hiring.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 p-3 sm:p-6 pt-1">
                {profile.location && (
                  <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}

                {profile.description && (
                  <p className="text-xs sm:text-sm text-foreground line-clamp-3">{profile.description}</p>
                )}

                <div className="space-y-1 sm:space-y-2">
                  <h4 className="font-medium text-xs sm:text-sm text-foreground flex items-center">
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Services
                  </h4>
                  {profile.services && profile.services.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {profile.services.slice(0, 3).map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                      {profile.services.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{profile.services.length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not specified</p>
                  )}
                </div>

                <LocationPicker
                  latitude={latitude || undefined}
                  longitude={longitude || undefined}
                  onLocationSelect={handleLocationSelect}
                  onLocationClear={handleLocationClear}
                  className="w-full"
                />

              </CardContent>
            </Card>

          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Stats Cards - Compact size */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-2 h-16">
                <div className="flex items-center justify-between h-full">
                  <div>
                    <div className="text-xs font-medium text-foreground mb-0.5">Active Jobs</div>
                    <div className="text-lg font-bold text-foreground">{stats.activeJobs}</div>
                  </div>
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-lg p-2 h-16">
                <div className="flex items-center justify-between h-full">
                  <div>
                    <div className="text-xs font-medium text-foreground mb-0.5">Total Apps</div>
                    <div className="text-lg font-bold text-foreground">{stats.totalApplications}</div>
                  </div>
                  <Users className="h-4 w-4 text-secondary" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-2 h-16">
                <div className="flex items-center justify-between h-full">
                  <div>
                    <div className="text-xs font-medium text-foreground mb-0.5">Avg. Apps</div>
                    <div className="text-lg font-bold text-foreground">
                      {stats.activeJobs > 0 ? Math.round(stats.totalApplications / stats.activeJobs) : 0}
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                <Button asChild className="h-auto p-2 flex-col bg-green-500 hover:bg-green-600 text-white">
                  <Link href="/professionals">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                    <span className="font-semibold text-xs">Find Talent</span>
                    <span className="text-xs opacity-90 hidden md:block">Search professionals</span>
                  </Link>
                </Button>
                <Button asChild className="h-auto p-2 flex-col bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href="/contractors">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                    <span className="font-semibold text-xs">Find Tradespeople</span>
                    <span className="text-xs opacity-90 hidden md:block">Search contractors</span>
                  </Link>
                </Button>
                <Button
                  onClick={handleSearchJobs}
                  disabled={loadingJobs}
                  className="h-auto p-2 flex-col bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                  <span className="font-semibold text-xs">
                    {loadingJobs ? "Loading..." : "Search Jobs"}
                  </span>
                  <span className="text-xs opacity-90 hidden md:block">Find tasks</span>
                </Button>
                <Button asChild className="h-auto p-2 flex-col bg-primary hover:bg-primary/90">
                  <Link href="/jobs/new">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                    <span className="font-semibold text-xs">Post New Job</span>
                    <span className="text-xs opacity-90 hidden md:block">Create job listing</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-2 flex-col bg-transparent border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  <Link href="/dashboard/company/jobs">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                    <span className="font-semibold text-xs">Manage Jobs</span>
                    <span className="text-xs opacity-70">({jobs.length})</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto p-2 flex-col bg-transparent">
                  <Link href="/dashboard/company/analytics">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                    <span className="font-semibold text-xs">Analytics</span>
                    <span className="text-xs opacity-70 hidden md:block">View insights</span>
                  </Link>
                </Button>
              </div>

              {/* Admin Button - Only visible for admin users */}
              <div className="flex justify-center">
                <AdminButton />
              </div>
            </div>

            {/* Recent Jobs */}
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center text-foreground text-sm sm:text-base md:text-lg">
                      <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Your Recent Posted Jobs
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Latest vacancies you've posted (last 5)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-xs">
                    <Link href="/dashboard/company/jobs">
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                {jobs.length === 0 ? (
                  <div className="text-center py-3 sm:py-4 text-muted-foreground">
                    <p className="text-xs sm:text-sm">No jobs posted yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3 sm:gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{job.title}</h4>
                            {getJobStatusBadge(job)}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center whitespace-nowrap">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {job.job_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {job.work_location}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center whitespace-nowrap">
                              <Users className="h-3 w-3 mr-1" />
                              {job.applications_count} apps
                            </span>
                            <span className="flex items-center whitespace-nowrap">
                              <Eye className="h-3 w-3 mr-1" />
                              {job.views_count} views
                            </span>
                            <span className="flex items-center whitespace-nowrap hidden sm:flex">
                              <Calendar className="h-3 w-3 mr-1" />
                              Posted {formatDate(job.created_at)}
                            </span>
                            {job.expires_at && job.expiration_status !== "expired" && (
                              <span className="flex items-center whitespace-nowrap">
                                <Clock className="h-3 w-3 mr-1" />
                                Expires {formatDate(job.expires_at)}
                              </span>
                            )}
                            {job.expiration_status === "expired" && job.expires_at && (
                              <span className="flex items-center text-red-600 whitespace-nowrap">
                                <Clock className="h-3 w-3 mr-1" />
                                Expired {formatDate(job.expires_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          {(job.expiration_status === "expired" || job.expiration_status === "expiring_soon") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 text-green-700 hover:bg-green-100 text-xs"
                              asChild
                            >
                              <Link href={`/jobs/${job.id}/extend`}>
                                <Clock className="h-3 w-3 mr-1" />
                                Extend
                              </Link>
                            </Button>
                          )}
                          <Button size="sm" variant="outline" asChild className="text-xs">
                            <Link href={`/jobs/${job.id}/applications`}>Apps ({job.applications_count})</Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild className="text-xs">
                            <Link href={`/jobs/${job.id}/edit`}>Edit</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {jobs.length >= 5 && (
                      <Button variant="outline" asChild className="w-full bg-transparent">
                        <Link href="/dashboard/company/jobs">View All Jobs</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applications Received */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-foreground">
                      <Users className="h-5 w-5 mr-2" />
                      Applications Received
                    </CardTitle>
                    <CardDescription>Candidates who applied to your posted jobs (last 5)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/company/applications">
                      <Filter className="h-4 w-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {receivedApplications.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No applications received yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedApplications.slice(0, 5).map((application) => {
                      // Determine display values based on applicant type
                      const isCompanyApplicant = application.applicant_type === "company"
                      const isProfessionalApplicant = application.applicant_type === "professional"

                      const displayName = isCompanyApplicant && application.company_profiles
                        ? application.company_profiles.company_name
                        : isProfessionalApplicant && application.professional_profiles
                        ? `${application.professional_profiles.first_name} ${application.professional_profiles.last_name}`
                        : "Unknown Applicant"

                      const displayTitle = isCompanyApplicant && application.company_profiles
                        ? application.company_profiles.industry
                        : isProfessionalApplicant && application.professional_profiles
                        ? application.professional_profiles.title
                        : ""

                      const displayLocation = isCompanyApplicant && application.company_profiles
                        ? application.company_profiles.location
                        : isProfessionalApplicant && application.professional_profiles
                        ? application.professional_profiles.location
                        : "Location not specified"

                      const displayAvatar = isCompanyApplicant && application.company_profiles
                        ? application.company_profiles.logo_url
                        : isProfessionalApplicant && application.professional_profiles
                        ? application.professional_profiles.profile_photo_url
                        : undefined

                      const displayInitials = isCompanyApplicant && application.company_profiles
                        ? application.company_profiles.company_name.substring(0, 2).toUpperCase()
                        : isProfessionalApplicant && application.professional_profiles
                        ? `${application.professional_profiles.first_name[0]}${application.professional_profiles.last_name[0]}`
                        : "?"

                      return (
                        <div
                          key={application.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage
                                src={displayAvatar}
                                alt={displayName}
                              />
                              <AvatarFallback>
                                {displayInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-foreground">
                                {displayName}
                                {isCompanyApplicant && (
                                  <Badge variant="outline" className="ml-2 text-xs">Company</Badge>
                                )}
                              </h4>
                              <p className="text-sm text-muted-foreground">{displayTitle}</p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                                <span>Applied for: {application.jobs.title}</span>
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {displayLocation}
                                </span>
                                <span>{formatDate(application.applied_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                            <Button size="sm" asChild>
                              <Link href={`/applications/${application.id}`}>Review</Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {receivedApplications.length > 5 && (
                      <Button variant="outline" asChild className="w-full bg-transparent">
                        <Link href="/dashboard/company/applications">View All Received Applications</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Recent Applications (Submitted) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-foreground">
                      <FileText className="h-5 w-5 mr-2" />
                      Your Recent Applications
                    </CardTitle>
                    <CardDescription>Jobs you've applied to (last 5)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/company/my-applications">
                      <Filter className="h-4 w-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {submittedApplications.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No applications submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submittedApplications.slice(0, 5).map((application) => {
                      const displayInitials = application.job_poster_name.substring(0, 2).toUpperCase()

                      return (
                        <div
                          key={application.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage
                                src={application.job_poster_avatar || undefined}
                                alt={application.job_poster_name}
                              />
                              <AvatarFallback>
                                {displayInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-foreground">
                                {application.jobs.title}
                                {application.jobs.is_tradespeople_job && (
                                  <Badge variant="outline" className="ml-2 text-xs">Task</Badge>
                                )}
                              </h4>
                              <p className="text-sm text-muted-foreground">Posted by: {application.job_poster_name}</p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {application.jobs.location}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {application.jobs.job_type}
                                </Badge>
                                <span>{formatDate(application.applied_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                            <Button size="sm" asChild>
                              <Link href={`/jobs/${application.job_id}`}>View Job</Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {submittedApplications.length > 5 && (
                      <Button variant="outline" asChild className="w-full bg-transparent">
                        <Link href="/dashboard/company/my-applications">View All My Applications</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      <Dialog open={showReviewsModal} onOpenChange={setShowReviewsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Company Reviews
            </DialogTitle>
            <DialogDescription>
              View all reviews and ratings for {profile.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rating Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">
                    {rating.average_rating > 0 ? rating.average_rating.toFixed(1) : "0.0"}
                  </div>
                  <div className="text-sm text-gray-600">out of 5</div>
                </div>
                <div className="flex-1">
                  <StarRating
                    rating={rating.average_rating}
                    totalReviews={rating.total_reviews}
                    size="lg"
                    showCount={false}
                  />
                  <div className="text-sm text-gray-600 mt-1">
                    Based on {rating.total_reviews} review{rating.total_reviews !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => {
                  return (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {review.reviewer_avatar ? (
                            <div className="h-8 w-8 flex-shrink-0 relative rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                              <Image
                                src={review.reviewer_avatar}
                                alt={review.reviewer_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {review.reviewer_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div className="font-semibold text-sm">{review.reviewer_name}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                              {review.is_edited && " (edited)"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-gray-700 mt-2">{review.review_text}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No reviews yet for your company.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
