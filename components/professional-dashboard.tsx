"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Briefcase, MapPin, BookmarkIcon, FileText, ExternalLink, Clock, Eye, EyeOff, Search, TrendingUp, Info, Filter, Upload, Hammer } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import ProfessionalPaymentModal from "./professional-payment-modal"
import { LocationPicker } from "@/components/ui/location-picker"
import { AdminButton } from "@/components/admin-button"
import ActivelyLookingModal from "@/components/actively-looking-modal"
import { usePremiumStatus } from "@/hooks/use-premium-status"
import { useTranslation } from "@/lib/i18n/context"
import { useToast } from "@/hooks/use-toast"
import pica from "pica"

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
  accountTypeLabel: string
  canPostTradeJobs?: boolean
}

export default function ProfessionalDashboard({ user, profile, applications, savedJobs, hasCV, accountTypeLabel, canPostTradeJobs = false }: ProfessionalDashboardProps) {
  const { t, locale } = useTranslation()

  console.log("[PROFESSIONAL-DASHBOARD] Component received profile:", {
    hasProfile: !!profile,
    profilePhotoUrl: profile?.profile_photo_url,
    firstName: profile?.first_name,
    lastName: profile?.last_name
  })

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(profile.profile_photo_url || null)

  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

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
        const { data, error } = await supabase.rpc("get_public_admin_settings")

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

  const resizeImage = async (file: File, maxSize: number = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = async () => {
        try {
          if (img.width === 0 || img.height === 0) {
            reject(new Error("IMAGE_DIMENSIONS_INVALID: Image has invalid dimensions"))
            return
          }

          if (img.width > 10000 || img.height > 10000) {
            reject(new Error("IMAGE_TOO_LARGE: Image dimensions exceed 10000x10000 pixels"))
            return
          }

          const canvas = document.createElement("canvas")
          const size = Math.min(img.width, img.height)
          const cropX = (img.width - size) / 2
          const cropY = (img.height - size) / 2

          canvas.width = maxSize
          canvas.height = maxSize

          let blob: Blob | null = null

          try {
            const picaInstance = pica()
            const tempCanvas = document.createElement("canvas")
            tempCanvas.width = size
            tempCanvas.height = size
            const tempCtx = tempCanvas.getContext("2d")
            if (!tempCtx) {
              throw new Error("Failed to get temp canvas context")
            }

            tempCtx.drawImage(img, cropX, cropY, size, size, 0, 0, size, size)
            await picaInstance.resize(tempCanvas, canvas)
            // Aggressive compression for avatars - 0.75 quality (smaller file size, still good quality for small display)
            blob = await picaInstance.toBlob(canvas, "image/webp", 0.75)
          } catch (picaError) {
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("IMAGE_PROCESSING_FAILED: Failed to get canvas context"))
              return
            }

            ctx.drawImage(img, cropX, cropY, size, size, 0, 0, maxSize, maxSize)
            blob = await new Promise<Blob | null>((blobResolve) => {
              // Aggressive compression for avatars - 0.75 quality
              canvas.toBlob(blobResolve, "image/webp", 0.75)
            })
          }

          if (!blob || blob.size === 0) {
            reject(new Error("IMAGE_CONVERSION_FAILED: Failed to convert image to WebP format"))
            return
          }

          const resizedFile = new File([blob], "profile-photo.webp", { type: "image/webp" })
          URL.revokeObjectURL(img.src)
          resolve(resizedFile)
        } catch (error) {
          URL.revokeObjectURL(img.src)
          if (error instanceof Error) {
            reject(error)
          } else {
            reject(new Error("IMAGE_PROCESSING_FAILED: Unknown error during image processing"))
          }
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error("IMAGE_LOAD_FAILED: Unable to load image. The file may be corrupted or in an unsupported format"))
      }
      const objectUrl = URL.createObjectURL(file)
      img.src = objectUrl
    })
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (typeof window === 'undefined' || !window.Image) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support the required image processing features.",
        variant: "destructive",
      })
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid image file (JPEG, PNG, GIF, WebP).",
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `File size is ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum is 10MB.`,
        variant: "destructive",
      })
      return
    }

    setUploadingPhoto(true)
    try {
      const resizedFile = await resizeImage(file, 300)
      const fileName = `${user.id}/profile-photo.webp`

      // Delete old photo if exists
      if (profilePhotoUrl) {
        const oldFileName = profilePhotoUrl.split('/').pop()
        if (oldFileName) {
          await supabase.storage.from('profile-photos').remove([`${user.id}/${oldFileName}`])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, resizedFile, {
          upsert: true,
          contentType: 'image/webp',
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        toast({
          title: "Upload Failed",
          description: uploadError.message,
          variant: "destructive",
        })
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from("professional_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("id", profile.id)

      if (updateError) {
        console.error("Database update error:", updateError)
        toast({
          title: "Update Failed",
          description: updateError.message,
          variant: "destructive",
        })
        return
      }

      setProfilePhotoUrl(publicUrl)
      toast({
        title: "Success",
        description: "Profile photo updated successfully!",
      })
      router.refresh()
    } catch (error) {
      console.error("Error uploading photo:", error)

      if (error instanceof Error) {
        const errorMessage = error.message
        if (errorMessage.includes('IMAGE_LOAD_FAILED')) {
          toast({
            title: "Failed to Load Image",
            description: "The image file could not be loaded. Try a different file.",
            variant: "destructive",
          })
        } else if (errorMessage.includes('IMAGE_TOO_LARGE')) {
          toast({
            title: "Image Too Large",
            description: "Image dimensions exceed 10,000x10,000 pixels.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Upload Error",
            description: errorMessage,
            variant: "destructive",
          })
        }
      }
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-1.5 sm:gap-5 md:gap-6 lg:gap-8">
          {/* Profile Section - Order 1 on mobile */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-1">
            <Card>
              <CardHeader className="p-3 sm:p-4 relative">
                {/* Mobile & Desktop Layout */}
                <div className="flex items-start gap-3 mb-3 sm:mb-2">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-full">
                      <AvatarImage
                        src={profilePhotoUrl || "/placeholder.svg"}
                        className="object-cover w-full h-full rounded-full"
                      />
                      <AvatarFallback className="text-lg sm:text-2xl rounded-full">
                        {profile.first_name[0]}
                        {profile.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor="photo-upload"
                      className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                      title="Upload profile photo"
                    >
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Label>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </div>

                  {/* Profile Info - Center */}
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words mb-0.5 leading-tight">
                      {profile.first_name} {profile.last_name}
                    </h2>
                    {profile.nickname && (
                      <p className="text-sm text-blue-600 break-words mb-1">"{profile.nickname}"</p>
                    )}

                    {/* Account Type */}
                    <p className="text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded inline-block mb-1">
                      {accountTypeLabel}
                    </p>

                    {/* Title */}
                    <p className="text-sm sm:text-base text-muted-foreground break-words">{profile.title}</p>
                  </div>
                </div>

                {/* Toggles Section */}
                <div className="space-y-1 sm:space-y-2 pt-1 sm:pt-2 border-t">
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
                      {profileVisible ? t('common.visible') : t('common.hidden')}
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
                        <p className="text-sm text-muted-foreground">
                          {profileVisible ? t('dashboard.visibleToEmployers') : 'Hidden from employers'}
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Actively Looking Toggle */}
                  {adminSettings.professional_actively_looking_enabled && profileVisible && profile.available_for_work && (
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      {activelyLooking ? (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <Switch
                        checked={activelyLooking}
                        onCheckedChange={handleActivelyLookingToggle}
                        disabled={updatingActivelyLooking}
                        className="scale-75 sm:scale-90 data-[state=unchecked]:bg-muted-foreground/20"
                      />
                      <p className="text-[10px] sm:text-sm text-muted-foreground flex-1">
                        {activelyLooking ? "Actively looking" : "Not actively looking"}
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
                            <h4 className="font-semibold text-sm">Actively Looking Status</h4>
                            <p className="text-sm text-muted-foreground">
                              When enabled, you get priority visibility to employers and stand out as someone actively seeking new opportunities.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Expiration Warning */}
                  {expirationWarning && (
                    <div className="text-xs text-amber-600 flex items-center gap-1 pl-6">
                      <Clock className="h-3 w-3" />
                      {expirationWarning}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5 sm:space-y-1 p-2 sm:p-6 pt-1">
                {location && (
                  <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}

                {profile.bio && (
                  <p className="text-[10px] sm:text-sm text-foreground line-clamp-2 sm:line-clamp-3">{profile.bio}</p>
                )}

                {/* Skills */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="space-y-0.5 sm:space-y-1">
                    <h4 className="font-medium text-xs sm:text-sm text-foreground">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.skills.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {profile.skills.length > 3 && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">+{profile.skills.length - 3} {t('common.more')}</span>
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
                    <div className="text-xs font-medium text-foreground mb-0.5">{t('dashboard.applications')}</div>
                    <div className="text-lg font-bold text-foreground">{applications.length}</div>
                  </div>
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-lg p-2 h-16">
                <div className="flex items-center justify-between h-full">
                  <div>
                    <div className="text-xs font-medium text-foreground mb-0.5">{t('dashboard.savedJobs')}</div>
                    <div className="text-lg font-bold text-foreground">{savedJobs.length}</div>
                  </div>
                  <BookmarkIcon className="h-4 w-4 text-secondary" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-2 h-16">
                <div className="flex items-center justify-between h-full">
                  <div>
                    <div className="text-xs font-medium text-foreground mb-0.5">CV Status</div>
                    <div className="text-lg font-bold text-foreground">
                      {hasCV ? "Complete" : "Pending"}
                    </div>
                  </div>
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className={`grid ${canPostTradeJobs ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4'} gap-1.5 sm:gap-2 md:gap-3`}>
                <Button asChild className="h-auto p-1 sm:p-2 flex-col bg-blue-500 hover:bg-blue-600 text-white">
                  <Link href={locale === 'pt-BR' ? '/br' : '/'}>
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">{t('dashboard.backToSearch')}</span>
                    <span className="text-sm opacity-90 hidden md:block">{t('dashboard.mainPage')}</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto p-1 sm:p-2 flex-col bg-transparent border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  <Link href="/dashboard/professional/applications">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">{t('dashboard.applications')}</span>
                    <span className="text-xs sm:text-sm opacity-70">({applications.length})</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto p-1 sm:p-2 flex-col bg-transparent">
                  <Link href="/dashboard/professional/saved">
                    <BookmarkIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">{t('dashboard.savedJobs')}</span>
                    <span className="text-xs sm:text-sm opacity-70">({savedJobs.length})</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-auto p-1 sm:p-2 flex-col bg-transparent">
                  <Link href="/cv/builder">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                    <span className="font-semibold text-sm sm:text-base leading-tight">CV Builder</span>
                    <span className="text-sm opacity-70 hidden md:block">{hasCV ? 'Edit CV' : 'Create CV'}</span>
                  </Link>
                </Button>
                {canPostTradeJobs && (
                  <Button variant="outline" asChild className="h-auto p-1 sm:p-2 flex-col bg-transparent border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white">
                    <Link href="/dashboard/professional/post-job">
                      <Hammer className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mb-0.5" />
                      <span className="font-semibold text-sm sm:text-base leading-tight">Post Trade Job</span>
                      <span className="text-sm opacity-90 hidden md:block">Find Trades</span>
                    </Link>
                  </Button>
                )}
              </div>

              {/* Admin Button - Only visible for admin users */}
              <div className="flex justify-center">
                <AdminButton />
              </div>
            </div>
            </div>

            {/* Bottom Section: Cards - Order 3 on mobile */}
            <div className="order-3 lg:order-none space-y-1.5 sm:space-y-4">
            {/* Recent Applications */}
            <Card className="overflow-hidden">
              <CardHeader className="px-2 py-1.5 sm:p-4 md:p-6">
                {/* Mobile: Compact single line */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    <CardTitle className="text-lg font-semibold truncate">{t('dashboard.applications')}</CardTitle>
                    <Badge variant="secondary" className="text-base">{applications.length}</Badge>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-9 px-3">
                    <Link href="/dashboard/professional/applications">
                      <Eye className="h-5 w-5 mr-1" />
                      <span className="text-base">{t('common.view')}</span>
                    </Link>
                  </Button>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center text-foreground text-sm sm:text-base md:text-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {t('dashboard.yourRecentApplications')}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Latest applications (last 5)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-xs">
                    <Link href="/dashboard/professional/applications">
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {t('common.viewAll')}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-4 md:p-6">
                {applications.length === 0 ? (
                  <div className="hidden lg:block text-center py-3 sm:py-4 text-muted-foreground">
                    <p className="text-xs sm:text-sm">{t('dashboard.noApplicationsYet')}</p>
                  </div>
                ) : (
                  <div className="space-y-0 sm:space-y-4">
                    {applications.slice(0, 5).map((application, index) => (
                      <div
                        key={application.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 py-1.5 sm:p-4 border-0 sm:border rounded-none sm:rounded-lg hover:bg-muted/50 transition-colors gap-1.5 sm:gap-4 ${index > 0 ? 'border-t' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5 sm:mb-1">
                            <h4 className="font-medium text-foreground text-lg sm:text-xl truncate">{application.jobs.title}</h4>
                            <Badge className={`${getStatusColor(application.status)} text-base`}>
                              {application.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-base sm:text-lg text-muted-foreground">
                            <span className="truncate">{application.jobs.company_profiles.company_name}</span>
                            <span className="hidden sm:inline whitespace-nowrap">{formatDate(application.applied_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {applications.length > 5 && (
                      <Button variant="outline" asChild className="w-full bg-transparent">
                        <Link href="/dashboard/professional/applications">{t('common.viewAll')} ({applications.length})</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Jobs */}
            <Card className="overflow-hidden">
              <CardHeader className="px-2 py-1.5 sm:p-4 md:p-6">
                {/* Mobile: Compact single line */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <BookmarkIcon className="h-5 w-5 flex-shrink-0" />
                    <CardTitle className="text-lg font-semibold truncate">{t('dashboard.savedJobs')}</CardTitle>
                    <Badge variant="secondary" className="text-base">{savedJobs.length}</Badge>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-9 px-3">
                    <Link href="/dashboard/professional/saved">
                      <Eye className="h-5 w-5 mr-1" />
                      <span className="text-base">{t('common.view')}</span>
                    </Link>
                  </Button>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center text-foreground text-sm sm:text-base md:text-lg">
                      <BookmarkIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {t('dashboard.savedJobs')}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Jobs you've saved for later (last 5)</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-xs w-full sm:w-auto">
                    <Link href="/dashboard/professional/saved">
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {t('common.viewAll')}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-4 md:p-6">
                {savedJobs.length === 0 ? (
                  <div className="hidden lg:block text-center py-3 sm:py-4 text-muted-foreground">
                    <p className="text-xs sm:text-sm">No saved jobs yet</p>
                  </div>
                ) : (
                  <div className="space-y-0 sm:space-y-3 md:space-y-4">
                    {savedJobs.slice(0, 5).map((savedJob, index) => (
                      <div
                        key={savedJob.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 py-1.5 sm:p-3 md:p-4 border-0 sm:border rounded-none sm:rounded-lg hover:bg-muted/50 transition-colors gap-1.5 sm:gap-3 ${index > 0 ? 'border-t' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 mb-0.5">
                            <h4 className="font-medium text-foreground text-xs sm:text-sm truncate">
                              {savedJob.jobs.title}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground truncate hidden sm:block">{savedJob.jobs.company_profiles.company_name}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-1 sm:gap-2 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center whitespace-nowrap">
                              <MapPin className="h-3 w-3 mr-1" />
                              {savedJob.jobs.location}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {savedJob.jobs.job_type}
                            </Badge>
                            <span className="hidden sm:inline whitespace-nowrap">{formatDate(savedJob.saved_at)}</span>
                          </div>
                        </div>
                        <Button size="sm" asChild className="flex-1 sm:flex-none text-xs">
                          <Link href={`/jobs/${savedJob.jobs.id}`}>{t('common.view')}</Link>
                        </Button>
                      </div>
                    ))}
                    {savedJobs.length > 5 && (
                      <Button variant="outline" asChild className="w-full bg-transparent text-xs">
                        <Link href="/dashboard/professional/saved">{t('common.viewAll')} ({savedJobs.length})</Link>
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
