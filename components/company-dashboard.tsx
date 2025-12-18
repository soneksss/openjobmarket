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
  X,
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
import { useToast } from "@/hooks/use-toast"

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
  is_tradespeople_job?: boolean
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
  const { toast } = useToast()
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
    console.log("[v0] [resizeImage] Starting resize for:", file.name, "Type:", file.type)
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = async () => {
        console.log("[v0] [resizeImage] Image loaded successfully. Dimensions:", img.width, "x", img.height)
        try {
          // Validate image dimensions
          if (img.width === 0 || img.height === 0) {
            console.error("[v0] [resizeImage] Invalid dimensions:", img.width, img.height)
            reject(new Error("IMAGE_DIMENSIONS_INVALID: Image has invalid dimensions"))
            return
          }

          // Check if image is too large to process
          if (img.width > 10000 || img.height > 10000) {
            console.error("[v0] [resizeImage] Image too large:", img.width, img.height)
            reject(new Error("IMAGE_TOO_LARGE: Image dimensions exceed 10000x10000 pixels"))
            return
          }

          const canvas = document.createElement("canvas")
          console.log("[v0] [resizeImage] Canvas created")

          // Create square image for circular logo display
          // Calculate crop dimensions to get a square from the center
          const size = Math.min(img.width, img.height)
          const cropX = (img.width - size) / 2
          const cropY = (img.height - size) / 2

          // Set canvas to square dimensions
          canvas.width = maxSize
          canvas.height = maxSize
          console.log("[v0] [resizeImage] Target dimensions:", maxSize, "x", maxSize, "(square)")
          console.log("[v0] [resizeImage] Cropping from center:", { cropX, cropY, size })

          let blob: Blob | null = null

          // Try using pica for high-quality resizing first
          try {
            console.log("[v0] [resizeImage] Starting pica resize...")
            const picaInstance = pica()

            // Create a temporary canvas with the cropped square from the original image
            const tempCanvas = document.createElement("canvas")
            tempCanvas.width = size
            tempCanvas.height = size
            const tempCtx = tempCanvas.getContext("2d")
            if (!tempCtx) {
              throw new Error("Failed to get temp canvas context")
            }

            // Draw the cropped square portion
            tempCtx.drawImage(img, cropX, cropY, size, size, 0, 0, size, size)
            console.log("[v0] [resizeImage] Cropped source canvas created")

            // Resize the cropped square to the target size
            await picaInstance.resize(tempCanvas, canvas)
            console.log("[v0] [resizeImage] Pica resize completed")

            // Convert to WebP for better compression
            console.log("[v0] [resizeImage] Converting to WebP...")
            blob = await picaInstance.toBlob(canvas, "image/webp", 0.85)
            console.log("[v0] [resizeImage] WebP conversion completed. Blob size:", blob?.size || 0)
          } catch (picaError) {
            console.warn("[v0] [resizeImage] Pica failed, falling back to native canvas:", picaError)

            // Fallback to native canvas resizing
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("IMAGE_PROCESSING_FAILED: Failed to get canvas context"))
              return
            }

            // Use native canvas drawing with crop parameters (works with fingerprinting protection)
            // drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight)
            ctx.drawImage(img, cropX, cropY, size, size, 0, 0, maxSize, maxSize)
            console.log("[v0] [resizeImage] Native canvas resize completed with center crop")

            // Convert to WebP using canvas.toBlob
            blob = await new Promise<Blob | null>((blobResolve) => {
              canvas.toBlob(blobResolve, "image/webp", 0.85)
            })
            console.log("[v0] [resizeImage] Native WebP conversion completed. Blob size:", blob?.size || 0)
          }

          if (!blob || blob.size === 0) {
            console.error("[v0] [resizeImage] Blob creation failed")
            reject(new Error("IMAGE_CONVERSION_FAILED: Failed to convert image to WebP format"))
            return
          }

          const resizedFile = new File([blob], "logo.webp", { type: "image/webp" })
          console.log("[v0] [resizeImage] Resized file created successfully")

          URL.revokeObjectURL(img.src)
          resolve(resizedFile)
        } catch (error) {
          console.error("[v0] [resizeImage] Error during processing:", error)
          URL.revokeObjectURL(img.src)
          if (error instanceof Error) {
            reject(error)
          } else {
            reject(new Error("IMAGE_PROCESSING_FAILED: Unknown error during image processing"))
          }
        }
      }
      img.onerror = (event) => {
        console.error("[v0] [resizeImage] Image load failed:", event)
        URL.revokeObjectURL(img.src)
        reject(new Error("IMAGE_LOAD_FAILED: Unable to load image. The file may be corrupted or in an unsupported format"))
      }
      const objectUrl = URL.createObjectURL(file)
      console.log("[v0] [resizeImage] Object URL created:", objectUrl)
      img.src = objectUrl
    })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check browser support for required APIs
    if (typeof window === 'undefined' || !window.Image) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support the required image processing features. Please use a modern browser like Chrome, Firefox, Edge, or Safari.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a valid image file. Supported formats: JPEG, PNG, GIF, WebP. You selected: ${file.type || 'Unknown type'}`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    // Original file size validation (10MB before resize)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `The file size is ${(file.size / 1024 / 1024).toFixed(2)}MB, which exceeds the 10MB limit. Please compress the image or use a smaller file.`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    setUploadingLogo(true)
    try {
      const supabase = createClient()
      console.log("[v0] Starting logo upload and resize for file:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2) + "MB")

      console.log("[v0] About to call resizeImage...")
      // Resize and optimize the image
      const resizedFile = await resizeImage(file, 300)
      console.log("[v0] resizeImage completed successfully")
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
          toast({
            title: "Storage Error",
            description: "Storage bucket not configured. Please contact support.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (uploadError.message.includes('policy')) {
          toast({
            title: "Permission Denied",
            description: "Please ensure you're logged in and try again.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Upload Failed",
            description: `Error uploading logo: ${uploadError.message}`,
            variant: "destructive",
            duration: 5000,
          })
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
        toast({
          title: "Update Failed",
          description: "Logo uploaded but failed to update profile. Please refresh the page.",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      console.log("[v0] Logo upload completed successfully!")

      // Show success toast
      toast({
        title: "✓ Logo Updated Successfully",
        description: "Your profile logo has been updated. The page will reload to show the changes.",
        duration: 2000,
      })

      // Refresh the page to show the new logo (after a short delay for the toast)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("[v0] Unexpected error:", error)

      if (error instanceof Error) {
        const errorMessage = error.message

        // Parse custom error codes from resizeImage
        if (errorMessage.includes('IMAGE_LOAD_FAILED')) {
          toast({
            title: "Failed to Load Image",
            description: "The image file could not be loaded. The file may be corrupted or in an unsupported format. Try using a different image file.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_DIMENSIONS_INVALID')) {
          toast({
            title: "Invalid Image Dimensions",
            description: "The image has invalid or zero dimensions. Please choose a different image file.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_TOO_LARGE')) {
          toast({
            title: "Image Too Large",
            description: "The image dimensions exceed 10,000x10,000 pixels. Please resize the image to smaller dimensions (e.g., 2000x2000 or less).",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_CONVERSION_FAILED')) {
          toast({
            title: "Image Conversion Failed",
            description: "Failed to convert your image to WebP format. Try using a different browser (Chrome or Edge recommended) or a different image file.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('IMAGE_PROCESSING_FAILED')) {
          toast({
            title: "Image Processing Failed",
            description: "An error occurred while processing your image. Try using a smaller image file or closing other browser tabs to free up memory.",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('canvas')) {
          toast({
            title: "Canvas Processing Error",
            description: "Your browser encountered an error while processing the image. Try using a different browser (Chrome or Edge work best).",
            variant: "destructive",
            duration: 5000,
          })
        } else if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
          toast({
            title: "Memory Error",
            description: "Your browser ran out of memory while processing the image. Try using a smaller image file or closing other browser tabs.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Upload Error",
            description: `${errorMessage}. If this problem persists, try using a different image file or browser.`,
            variant: "destructive",
            duration: 5000,
          })
        }
      } else {
        toast({
          title: "Unexpected Error",
          description: "An unexpected error occurred while uploading your logo. Please try again with a different image file.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } finally {
      setUploadingLogo(false)
      // Reset the file input so the same file can be selected again
      const fileInputs = document.querySelectorAll<HTMLInputElement>('#logo-upload, #logo-upload-desktop')
      fileInputs.forEach(input => {
        if (input) input.value = ''
      })
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
          toast({
            title: "Feature Unavailable",
            description: "Company visibility feature will be available soon. Database migration required.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Update Failed",
            description: `Error updating visibility: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          })
        }
        return
      }

      setProfileVisible(visible)
      console.log("[v0] Company visibility updated successfully:", visible)
    } catch (error) {
      console.error("[v0] Error updating company visibility:", error)
      toast({
        title: "Update Failed",
        description: "Error updating visibility. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
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
          toast({
            title: "Update Failed",
            description: `Error updating business status: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          })
          // Revert on actual error
          setOpenForBusiness(!status)
        }
        return
      }

      console.log("[v0] Business status updated successfully:", status)
    } catch (error) {
      console.error("[v0] Error updating business status:", error)
      toast({
        title: "Update Failed",
        description: "Error updating business status. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
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
          toast({
            title: "Update Failed",
            description: `Error updating hiring status: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          })
          // Revert on actual error
          setHiring(!status)
        }
        return
      }

      console.log("[v0] Hiring status updated successfully:", status)
    } catch (error) {
      console.error("[v0] Error updating hiring status:", error)
      toast({
        title: "Update Failed",
        description: "Error updating hiring status. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
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
    // Navigate to main page with Trade Jobs tab selected
    router.push("/?tab=jobs_tasks")
    setLoadingJobs(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-1.5 sm:gap-5 md:gap-6 lg:gap-8">
          {/* Company Profile Section - Order 1 on mobile */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-1">
            <Card>
              <CardHeader className="p-3 sm:p-4 relative">
                {/* Edit Button - Top Right Corner - Hidden on mobile, visible on desktop */}
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="hidden lg:block absolute -top-1 right-2 h-8 w-8 p-0 sm:h-9 sm:w-9 bg-white shadow-sm z-20"
                >
                  <Link href="/company/profile/edit">
                    <Edit className="h-4 w-4 sm:h-4 sm:w-4" />
                  </Link>
                </Button>

                {/* Mobile Layout: Company name at top, then logo and toggles below */}
                <div className="lg:hidden">
                  {/* Company Name - Top Center */}
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words mb-1.5 leading-tight text-center">
                    {profile.company_name}
                  </h2>

                  {/* Main Row: Logo, Info, Toggles */}
                  <div className="flex items-start gap-2 mb-2">
                    {/* Left: Logo */}
                    <div className="relative flex-shrink-0">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted rounded-full overflow-hidden border flex items-center justify-center">
                        {profile.logo_url ? (
                          <Image
                            src={profile.logo_url}
                            alt={`${profile.company_name} logo`}
                            width={80}
                            height={80}
                            className="h-full w-full object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="text-xl sm:text-2xl font-medium text-muted-foreground">
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

                    {/* Center: Company Info */}
                    <div className="flex-1 min-w-0">
                      {/* Star Rating */}
                      <div
                        className="mb-0.5 cursor-pointer hover:opacity-80 transition-opacity inline-block"
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

                      {/* Industry */}
                      <p className="text-sm sm:text-base text-muted-foreground break-words mb-1">{profile.industry}</p>
                    </div>

                    {/* Right: Toggles */}
                    <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground w-16 text-right">{profileVisible ? "Visible" : "Hidden"}</span>
                        <Switch
                          checked={profileVisible}
                          onCheckedChange={handleVisibilityToggle}
                          disabled={updatingVisibility}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground w-16 text-right">{openForBusiness ? "Open" : "Closed"}</span>
                        <Switch
                          checked={openForBusiness}
                          onCheckedChange={handleBusinessStatusToggle}
                          disabled={updatingBusinessStatus}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground w-16 text-right">{hiring ? "Hiring" : "Not Hiring"}</span>
                        <Switch
                          checked={hiring}
                          onCheckedChange={handleHiringStatusToggle}
                          disabled={updatingHiringStatus}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location Button - Full Width Below */}
                  <button
                    onClick={() => setShowLocationPicker(true)}
                    className="flex items-center justify-between gap-2 bg-blue-600 border border-blue-700 rounded-lg px-3 py-2 hover:bg-blue-700 transition-colors w-full shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-white flex-shrink-0" />
                      <span className="text-sm font-semibold text-white">Location</span>
                    </div>
                    {latitude && longitude ? (
                      <span className="font-mono text-xs text-white font-medium">
                        {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-white/80">Not set</span>
                    )}
                  </button>
                </div>

                {/* Desktop Layout: Original layout */}
                <div className="hidden lg:flex items-start gap-3 mb-3 sm:mb-2">
                  <div className="relative flex-shrink-0">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted rounded-full overflow-hidden border flex items-center justify-center">
                      {profile.logo_url ? (
                        <Image
                          src={profile.logo_url}
                          alt={`${profile.company_name} logo`}
                          width={80}
                          height={80}
                          className="h-full w-full object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="text-xl sm:text-2xl font-medium text-muted-foreground">
                          {profile.company_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <Label htmlFor="logo-upload-desktop" className="cursor-pointer">
                        <div className="bg-primary text-primary-foreground rounded-full p-1 hover:bg-primary/90 transition-colors">
                          <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </div>
                      </Label>
                      <Input
                        id="logo-upload-desktop"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </div>
                  </div>

                  {/* Company Info - Center */}
                  <div className="flex-1 min-w-0">
                    {/* Company Name - 50% larger */}
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words mb-0.5 leading-tight">
                      {profile.company_name}
                    </h2>

                    {/* Star Rating */}
                    <div
                      className="mb-1 cursor-pointer hover:opacity-80 transition-opacity inline-block"
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

                    {/* Industry - 30% larger */}
                    <p className="text-sm sm:text-base text-muted-foreground break-words">{profile.industry}</p>
                  </div>
                </div>

                {/* Toggles Section - Desktop Only */}
                <div className="hidden lg:block space-y-1 sm:space-y-2 pt-1 sm:pt-2 border-t">
                  {/* Visibility Toggle */}
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    {profileVisible ? (
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Switch
                      checked={profileVisible}
                      onCheckedChange={handleVisibilityToggle}
                      disabled={updatingVisibility}
                      className="scale-75 sm:scale-90 data-[state=unchecked]:bg-muted-foreground/20"
                    />
                    <p className="text-[10px] sm:text-sm text-muted-foreground flex-1">
                      {profileVisible ? "Visible" : "Hidden"}
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
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
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    {openForBusiness ? (
                      <Store className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Store className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Switch
                      checked={openForBusiness}
                      onCheckedChange={handleBusinessStatusToggle}
                      disabled={updatingBusinessStatus}
                      className="scale-75 sm:scale-90 data-[state=unchecked]:bg-muted-foreground/20"
                    />
                    <p className="text-[10px] sm:text-sm text-muted-foreground flex-1">
                      {openForBusiness ? "Available" : "Not available"}
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
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
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    {hiring ? (
                      <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Switch
                      checked={hiring}
                      onCheckedChange={handleHiringStatusToggle}
                      disabled={updatingHiringStatus}
                      className="scale-75 sm:scale-90 data-[state=unchecked]:bg-muted-foreground/20"
                    />
                    <p className="text-[10px] sm:text-sm text-muted-foreground flex-1">
                      {hiring ? "Hiring" : "Not hiring"}
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
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
              <CardContent className="hidden lg:block space-y-0.5 sm:space-y-1 p-2 sm:p-6 pt-1">
                {profile.location && (
                  <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}

                {profile.description && (
                  <p className="text-[10px] sm:text-sm text-foreground line-clamp-2 sm:line-clamp-3 hidden sm:block">{profile.description}</p>
                )}

                {profile.services && profile.services.length > 0 && (
                  <div className="space-y-0.5 sm:space-y-1 hidden sm:block">
                    <h4 className="font-medium text-xs sm:text-sm text-foreground flex items-center">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Services
                    </h4>
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
                  </div>
                )}

                <div className="hidden sm:block">
                  <LocationPicker
                    latitude={latitude || undefined}
                    longitude={longitude || undefined}
                    onLocationSelect={handleLocationSelect}
                    onLocationClear={handleLocationClear}
                    className="w-full"
                  />
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Main Content - Reordered for mobile */}
          <div className="lg:col-span-3 flex flex-col space-y-1.5 sm:space-y-6 order-2">
            {/* Upper Section: Stats + Main Actions - Order 2 on mobile */}
            <div className="order-2 lg:order-none space-y-1.5 sm:space-y-3">
            {/* Stats Cards - Hidden on mobile, visible on desktop */}
            <div className="hidden lg:grid grid-cols-3 gap-2">
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

            {/* Quick Actions - Text 30% larger */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
                <Button asChild className="h-auto p-1 sm:p-2 flex-col bg-green-500 hover:bg-green-600 text-white">
                  <Link href="/?tab=talents">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">Find Talent</span>
                    <span className="text-sm opacity-90 hidden md:block">Search professionals</span>
                  </Link>
                </Button>
                <Button asChild className="h-auto p-1 sm:p-2 flex-col bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href="/?tab=traders">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">Trades</span>
                    <span className="text-sm opacity-90 hidden md:block">Search contractors</span>
                  </Link>
                </Button>
                <Button
                  onClick={handleSearchJobs}
                  disabled={loadingJobs}
                  className="h-auto p-1 sm:p-2 flex-col bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                  <span className="font-semibold text-sm sm:text-base leading-tight">
                    {loadingJobs ? "..." : "Jobs"}
                  </span>
                  <span className="text-sm opacity-90 hidden md:block">Find tasks</span>
                </Button>
                <Button asChild className="h-auto p-1 sm:p-2 flex-col bg-primary hover:bg-primary/90">
                  <Link href="/jobs/new">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">Post Job</span>
                    <span className="text-sm opacity-90 hidden md:block">Create job listing</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-1 sm:p-2 flex-col bg-transparent border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  <Link href="/dashboard/company/jobs">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">Manage</span>
                    <span className="text-xs sm:text-sm opacity-70">({jobs.length})</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto p-1 sm:p-2 flex-col bg-transparent">
                  <Link href="/dashboard/company/analytics">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">Analytics</span>
                    <span className="text-sm opacity-70 hidden md:block">View insights</span>
                  </Link>
                </Button>
              </div>

              {/* Admin Button - Only visible for admin users */}
              <div className="flex justify-center">
                <AdminButton />
              </div>
            </div>
            </div>

            {/* Bottom Section: Cards - Order 3 on mobile */}
            <div className="order-3 lg:order-none space-y-1.5 sm:space-y-4">
            {/* Recent Jobs */}
            <Card className="overflow-hidden">
              <CardHeader className="px-2 py-1.5 sm:p-4 md:p-6">
                {/* Mobile: Compact single line - 30% larger text */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Briefcase className="h-5 w-5 flex-shrink-0" />
                    <CardTitle className="text-lg font-semibold truncate">Your Posted Jobs</CardTitle>
                    <Badge variant="secondary" className="text-base">{jobs.length}</Badge>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-9 px-3">
                    <Link href="/dashboard/company/jobs">
                      <Eye className="h-5 w-5 mr-1" />
                      <span className="text-base">View</span>
                    </Link>
                  </Button>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
              <CardContent className="p-0 sm:p-4 md:p-6">
                {jobs.length === 0 ? (
                  <div className="hidden lg:block text-center py-3 sm:py-4 text-muted-foreground">
                    <p className="text-xs sm:text-sm">No jobs posted yet</p>
                  </div>
                ) : (
                  <div className="space-y-0 sm:space-y-4">
                    {jobs.map((job, index) => (
                      <div
                        key={job.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 py-1.5 sm:p-4 border-0 sm:border rounded-none sm:rounded-lg hover:bg-muted/50 transition-colors gap-1.5 sm:gap-4 ${index > 0 ? 'border-t' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5 sm:mb-1">
                            <h4 className="font-medium text-foreground text-lg sm:text-xl truncate">{job.title}</h4>
                            {getJobStatusBadge(job)}
                            {job.is_tradespeople_job ? (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                                Trade Job
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                                Vacancy
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-base sm:text-lg text-muted-foreground">
                            <span className="flex items-center whitespace-nowrap">
                              <MapPin className="h-5 w-5 mr-1 flex-shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </span>
                            <Badge variant="outline" className="text-base">
                              {job.job_type}
                            </Badge>
                            <Badge variant="outline" className="text-base">
                              {job.work_location}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-base text-muted-foreground mt-0.5 sm:mt-1">
                            <span className="flex items-center whitespace-nowrap">
                              <Users className="h-5 w-5 mr-1" />
                              {job.applications_count} apps
                            </span>
                            <span className="flex items-center whitespace-nowrap">
                              <Eye className="h-5 w-5 mr-1" />
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
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
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
            <Card className="overflow-hidden">
              <CardHeader className="px-2 py-1.5 sm:p-4 md:p-6">
                {/* Mobile: Compact single line - 30% larger text */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Users className="h-5 w-5 flex-shrink-0" />
                    <CardTitle className="text-lg font-semibold truncate">Applications</CardTitle>
                    <Badge variant="secondary" className="text-base">{receivedApplications.length}</Badge>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-9 px-3">
                    <Link href="/dashboard/company/applications">
                      <Eye className="h-5 w-5 mr-1" />
                      <span className="text-base">View</span>
                    </Link>
                  </Button>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center text-foreground text-sm sm:text-base md:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Applications Received
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Candidates who applied to your posted jobs (last 5)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-xs w-full sm:w-auto">
                    <Link href="/dashboard/company/applications">
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-4 md:p-6">
                {receivedApplications.length === 0 ? (
                  <div className="hidden lg:block text-center py-3 sm:py-4 text-muted-foreground">
                    <p className="text-xs sm:text-sm">No applications received yet</p>
                  </div>
                ) : (
                  <div className="space-y-0 sm:space-y-3 md:space-y-4">
                    {receivedApplications.slice(0, 5).map((application, index) => {
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
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 py-1.5 sm:p-3 md:p-4 border-0 sm:border rounded-none sm:rounded-lg hover:bg-muted/50 transition-colors gap-1.5 sm:gap-3 ${index > 0 ? 'border-t' : ''}`}
                        >
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                              <AvatarImage
                                src={displayAvatar}
                                alt={displayName}
                              />
                              <AvatarFallback className="text-xs">
                                {displayInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 mb-0.5">
                                <h4 className="font-medium text-foreground text-xs sm:text-sm truncate">
                                  {displayName}
                                </h4>
                                {isCompanyApplicant && (
                                  <Badge variant="outline" className="text-xs">Company</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate hidden sm:block">{displayTitle}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-1 sm:gap-2 text-xs text-muted-foreground mt-1">
                                <span className="truncate">For: {application.jobs.title}</span>
                                <span className="hidden sm:flex items-center whitespace-nowrap">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {displayLocation}
                                </span>
                                <span className="hidden sm:inline whitespace-nowrap">{formatDate(application.applied_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Badge className={`${getStatusColor(application.status)} text-xs flex-1 sm:flex-none justify-center`}>{application.status}</Badge>
                            <Button size="sm" asChild className="flex-1 sm:flex-none text-xs">
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
            <Card className="overflow-hidden">
              <CardHeader className="px-2 py-1.5 sm:p-4 md:p-6">
                {/* Mobile: Compact single line - 30% larger text */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    <CardTitle className="text-lg font-semibold truncate">My Applications</CardTitle>
                    <Badge variant="secondary" className="text-base">{submittedApplications.length}</Badge>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-9 px-3">
                    <Link href="/dashboard/company/my-applications">
                      <Eye className="h-5 w-5 mr-1" />
                      <span className="text-base">View</span>
                    </Link>
                  </Button>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center text-foreground text-sm sm:text-base md:text-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Your Recent Applications
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Jobs you've applied to (last 5)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-xs w-full sm:w-auto">
                    <Link href="/dashboard/company/my-applications">
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-4 md:p-6">
                {submittedApplications.length === 0 ? (
                  <div className="hidden lg:block text-center py-3 sm:py-4 text-muted-foreground">
                    <p className="text-xs sm:text-sm">No applications submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-0 sm:space-y-3 md:space-y-4">
                    {submittedApplications.slice(0, 5).map((application, index) => {
                      const displayInitials = application.job_poster_name.substring(0, 2).toUpperCase()

                      return (
                        <div
                          key={application.id}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 py-1.5 sm:p-3 md:p-4 border-0 sm:border rounded-none sm:rounded-lg hover:bg-muted/50 transition-colors gap-1.5 sm:gap-3 ${index > 0 ? 'border-t' : ''}`}
                        >
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                              <AvatarImage
                                src={application.job_poster_avatar || undefined}
                                alt={application.job_poster_name}
                              />
                              <AvatarFallback className="text-xs">
                                {displayInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 mb-0.5">
                                <h4 className="font-medium text-foreground text-xs sm:text-sm truncate">
                                  {application.jobs.title}
                                </h4>
                                {application.jobs.is_tradespeople_job && (
                                  <Badge variant="outline" className="text-xs">Task</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">By: {application.job_poster_name}</p>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-1">
                                <span className="hidden sm:flex items-center whitespace-nowrap">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {application.jobs.location}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {application.jobs.job_type}
                                </Badge>
                                <span className="hidden sm:inline whitespace-nowrap">{formatDate(application.applied_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Badge className={`${getStatusColor(application.status)} text-xs flex-1 sm:flex-none justify-center`}>{application.status}</Badge>
                            <Button size="sm" asChild className="flex-1 sm:flex-none text-xs">
                              <Link href={`/jobs/${application.job_id}`}>View Job</Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {submittedApplications.length > 5 && (
                      <Button variant="outline" asChild className="w-full bg-transparent text-xs">
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

      {/* LocationPicker with controlled dialog state - Hidden wrapper, only dialog shows */}
      <LocationPicker
        latitude={latitude || undefined}
        longitude={longitude || undefined}
        onLocationSelect={handleLocationSelect}
        onLocationClear={handleLocationClear}
        isOpen={showLocationPicker}
        onOpenChange={setShowLocationPicker}
      />
    </div>
  )
}
