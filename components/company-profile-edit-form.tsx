"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, ArrowLeft, Building2, MapPin, Eye, EyeOff, Trash2 } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import pica from "pica"
import { LocationPicker } from "@/components/ui/location-picker"
import { deleteCompanyAccount, updateCompanyProfile } from "@/lib/actions"
import LanguageSelector from "@/components/language-selector"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/context"
import { TRADE_INDUSTRIES, findTradeIndustry } from "@/lib/data/trade-industries"

interface User {
  id: string
  email: string
}

interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  description: string
  industry: string
  services?: string[]
  website_url?: string
  phone_number?: string
  location: string
  full_address?: string
  logo_url?: string
  hide_address?: boolean
  hide_company_info?: boolean
  hide_contact_info?: boolean
  latitude?: number
  longitude?: number
  spoken_languages?: string[]
  service_24_7?: boolean
  price_list?: string
}

interface CompanyProfileEditFormProps {
  user: User
  profile: CompanyProfile
}

export default function CompanyProfileEditForm({ user, profile }: CompanyProfileEditFormProps) {
  const router = useRouter()
  const { locale } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [companyName, setCompanyName] = useState(profile.company_name)
  const [description, setDescription] = useState(profile.description || "")
  const [industry, setIndustry] = useState(profile.industry || "")
  const [services, setServices] = useState<string[]>(profile.services || [])
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || "")
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "")
  const [location, setLocation] = useState(profile.location || "")
  const [fullAddress, setFullAddress] = useState(profile.full_address || "")
  // Add cache-busting to logo URL to prevent stale cache issues
  const getLogoUrlWithCacheBust = (url: string | undefined) => {
    if (!url) return ""
    // Add timestamp as cache-buster
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}t=${Date.now()}`
  }
  const [logoUrl, setLogoUrl] = useState(getLogoUrlWithCacheBust(profile.logo_url))
  const [logoError, setLogoError] = useState(false)

  // Privacy toggle states
  const [hideAddress, setHideAddress] = useState(profile.hide_address || false)
  const [hideCompanyInfo, setHideCompanyInfo] = useState(profile.hide_company_info || false)
  const [hideContactInfo, setHideContactInfo] = useState(profile.hide_contact_info || false)

  // Location coordinates for map pin functionality
  const [latitude, setLatitude] = useState<number | null>(profile.latitude || null)
  const [longitude, setLongitude] = useState<number | null>(profile.longitude || null)

  // Contractor-specific fields
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(profile.spoken_languages || [])
  const [service24_7, setService24_7] = useState(profile.service_24_7 || false)
  const [priceList, setPriceList] = useState(profile.price_list || "")

  const supabase = createClient()

  // Debug: Log logo URL on mount
  useEffect(() => {
    console.log("[COMPANY-EDIT] Component mounted with logo_url:", profile.logo_url)
    console.log("[COMPANY-EDIT] Current logoUrl state (with cache-bust):", logoUrl)
    console.log("[COMPANY-EDIT] logoError state:", logoError)
  }, [])

  // Image resizing helper function with timeout and fallback
  const resizeImage = async (file: File, maxSize: number = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      console.log("[v0] resizeImage: Starting image resize process")

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn("[v0] resizeImage: Timeout reached after 15 seconds")
        reject(new Error('Image processing timeout'))
      }, 15000) // 15 second timeout (reduced from 30)

      const img = new Image()

      img.onload = async () => {
        console.log("[v0] resizeImage: Image loaded, dimensions:", img.width, "x", img.height)

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
          console.log("[v0] resizeImage: Canvas created, target size:", width, "x", height)

          // Try pica first, fall back to native canvas if it fails
          let blob: Blob | null = null

          try {
            console.log("[v0] resizeImage: Attempting pica resize...")
            const picaInstance = pica()
            await picaInstance.resize(img, canvas)
            console.log("[v0] resizeImage: Pica resize successful, converting to blob...")
            blob = await picaInstance.toBlob(canvas, "image/webp", 0.85)
            console.log("[v0] resizeImage: Pica blob created, size:", blob.size)
          } catch (picaError) {
            console.warn("[v0] resizeImage: Pica failed, using native canvas fallback:", picaError)

            // Fallback to native canvas resize
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              throw new Error("Could not get canvas 2d context")
            }

            ctx.drawImage(img, 0, 0, width, height)
            console.log("[v0] resizeImage: Native canvas draw complete")

            // Try to get blob from canvas
            blob = await new Promise<Blob | null>((resolveBlob) => {
              canvas.toBlob(resolveBlob, "image/jpeg", 0.85)
            })

            if (!blob) {
              throw new Error("Canvas toBlob returned null")
            }
            console.log("[v0] resizeImage: Native canvas blob created, size:", blob.size)
          }

          const fileExtension = blob.type === "image/webp" ? "webp" : "jpg"
          const resizedFile = new File([blob], `logo.${fileExtension}`, { type: blob.type })

          URL.revokeObjectURL(img.src)
          clearTimeout(timeoutId)
          console.log("[v0] resizeImage: Resize complete, file size:", resizedFile.size)
          resolve(resizedFile)
        } catch (error) {
          console.warn("[v0] resizeImage: Error during resize:", error)
          clearTimeout(timeoutId)
          URL.revokeObjectURL(img.src)
          reject(error)
        }
      }

      img.onerror = (error) => {
        console.warn("[v0] resizeImage: Image load error:", error)
        clearTimeout(timeoutId)
        reject(new Error("Failed to load image"))
      }

      const objectUrl = URL.createObjectURL(file)
      console.log("[v0] resizeImage: Created object URL, loading image...")
      img.src = objectUrl
    })
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    // Original file size validation (10MB before resize)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    setUploading(true)
    setUploadStatus(null)

    // Helper function to upload a file to storage
    const uploadToStorage = async (fileToUpload: File, fileExtension: string) => {
      const fileName = `${user.id}/logo.${fileExtension}`

      // Fire-and-forget delete of old file — don't await, upsert=true handles overwriting
      // Awaiting the delete caused the whole upload to hang when Supabase stalled
      if (profile.logo_url) {
        const oldPath = profile.logo_url.split('?')[0].split('/').slice(-2).join('/')
        supabase.storage.from("company-logos").remove([oldPath]).catch(() => {})
      }

      // Upload logo with 30-second timeout
      const uploadPromise = supabase.storage
        .from("company-logos")
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: true,
        })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out. Please check your connection.")), 30_000)
      )

      const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise])

      if (uploadError) {
        console.warn("[v0] Upload error:", uploadError)

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
        return null
      }

      console.log("[v0] Upload successful:", uploadData)

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("company-logos").getPublicUrl(fileName)

      return publicUrl
    }

    try {
      console.log("[v0] Starting logo upload for file:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2) + "MB")

      let publicUrl: string | null = null
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const shouldCompress = file.size > 300 * 1024 // compress anything above 300KB

      if (shouldCompress) {
        console.log("[v0] File is above 300KB, compressing before upload...")
        setUploadStatus("Optimizing image...")
        try {
          const resizedFile = await resizeImage(file, 800)
          console.log("[v0] Image compressed:", "New size:", (resizedFile.size / 1024).toFixed(2) + "KB")
          setUploadStatus("Uploading...")
          publicUrl = await uploadToStorage(resizedFile, "webp")
        } catch (resizeError) {
          console.warn("[v0] Compress failed, uploading original file instead:", resizeError)
          setUploadStatus("Uploading...")
          publicUrl = await uploadToStorage(file, fileExtension)
        }
      } else {
        console.log("[v0] File is small (<300KB), uploading directly...")
        setUploadStatus("Uploading...")
        publicUrl = await uploadToStorage(file, fileExtension)
      }

      if (publicUrl) {
        console.log("[v0] Logo uploaded successfully, public URL:", publicUrl)
        setLogoUrl(getLogoUrlWithCacheBust(publicUrl))
        setLogoError(false)
        toast({
          title: "✓ Logo Uploaded",
          description: shouldCompress ? "Your logo has been uploaded and optimized." : "Your logo has been uploaded.",
          duration: 5000,
        })
      }
    } catch (error) {
      console.warn("[v0] Unexpected error:", error)
      toast({
        title: "Upload Failed",
        description: "Unexpected error uploading logo. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setUploading(false)
      setUploadStatus(null)
    }
  }

  const toggleService = (service: string) => {
    setServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("[COMPANY-EDIT] Starting profile update...")
      console.log("[COMPANY-EDIT] Profile ID:", profile.id)
      console.log("[COMPANY-EDIT] User ID:", user.id)

      const updateData = {
        company_name: companyName,
        description: description || null,
        industry: industry || null,
        services: services.length > 0 ? services : null,
        website_url: websiteUrl || null,
        phone_number: phoneNumber || null,
        location: location || null,
        full_address: fullAddress || null,
        hide_address: hideAddress,
        hide_company_info: hideCompanyInfo,
        hide_contact_info: hideContactInfo,
        latitude: latitude,
        longitude: longitude,
        logo_url: logoUrl ? logoUrl.split("?")[0] : null,
        spoken_languages: spokenLanguages,
        service_24_7: service24_7,
        price_list: priceList || null,
      }

      console.log("[COMPANY-EDIT] Update data:", {
        company_name: updateData.company_name,
        industry: updateData.industry,
        location: updateData.location,
        services_count: services.length,
        has_description: !!updateData.description,
        has_website: !!updateData.website_url,
        has_phone: !!updateData.phone_number,
      })

      const result = await updateCompanyProfile(updateData)

      if (result.error) {
        console.warn("[COMPANY-EDIT] ❌ Server action error:", result.error)
        throw new Error(result.error)
      }

      console.log("[COMPANY-EDIT] ✅ Profile updated successfully")
      console.log("[COMPANY-EDIT] Redirecting to dashboard...")

      toast({
        title: "Profile Updated",
        description: "Your company profile has been updated successfully.",
        duration: 3000,
      })

      // Redirect back to dashboard
      router.push(locale === 'pt-BR' ? '/br/dashboard/company' : '/dashboard/company')
    } catch (error: any) {
      console.warn("[COMPANY-EDIT] ❌ Unexpected error:", error)
      console.warn("[COMPANY-EDIT] Error type:", error?.constructor?.name)
      console.warn("[COMPANY-EDIT] Error stack:", error?.stack)

      toast({
        title: "Update Failed",
        description: error?.message || "Error updating profile. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    return companyName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      console.log("[COMPANY_EDIT] Starting account deletion process")

      // Call the server action to delete the account
      const result = await deleteCompanyAccount(profile.id)

      if (result.error) {
        console.warn("[COMPANY_EDIT] Account deletion error:", result.error)
        toast({
          title: "Deletion Failed",
          description: `Error deleting account: ${result.error}`,
          variant: "destructive",
          duration: 5000,
        })
        setDeleting(false)
        return
      }

      console.log("[COMPANY_EDIT] Account deletion completed successfully")

      // Import and use manualLogout to properly clear client-side session
      const { manualLogout } = await import("@/hooks/use-auto-logout")
      await manualLogout()

      // manualLogout will redirect to "/" and clear all storage
    } catch (error) {
      console.warn("[COMPANY_EDIT] Unexpected error during account deletion:", error)
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while deleting your account. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
      setDeleting(false)
    }
  }

  return (
    <div className="antialiased space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-slate-700">
          <Link href={locale === 'pt-BR' ? '/br/dashboard/company' : '/dashboard/company'}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="antialiased bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-semibold text-white">
            <Building2 className="h-5 w-5 mr-2 text-emerald-400" />
            Edit Company Profile
          </CardTitle>
          <CardDescription className="text-sm text-slate-400">
            Update your company information and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Logo Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-200">Company Logo</Label>
              <div className="flex items-center space-x-4">
                <Label htmlFor="logo-upload" className="cursor-pointer group relative block">
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-600 group-hover:border-emerald-500 flex items-center justify-center transition-all">
                    {logoUrl && !logoError ? (
                      <img
                        src={logoUrl}
                        alt="Company logo"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          // Retry without the cache-bust parameter if the URL has one
                          const cleanUrl = logoUrl.split("?")[0]
                          if (logoUrl !== cleanUrl) {
                            setLogoUrl(cleanUrl)
                          } else {
                            setLogoError(true)
                          }
                        }}
                        onLoad={() => setLogoError(false)}
                      />
                    ) : (
                      <div className="text-xs sm:text-sm font-medium text-slate-400 text-center px-1">
                        {logoUrl && logoError ? "Load Error" : getInitials()}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/40 rounded-lg transition-colors">
                    <Upload className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Label>
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center space-x-2 px-3 py-2 text-sm border-2 border-slate-600 rounded-md hover:bg-slate-700 hover:border-emerald-500 text-slate-200 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>{uploadStatus ?? "Upload Logo"}</span>
                    </div>
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-400">JPG, PNG or GIF. Max size 5MB.</p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-white">Company Information</h3>
                <div className="flex items-center space-x-2">
                  {!hideCompanyInfo ? (
                    <Eye className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  )}
                  <span className="text-sm text-slate-400">
                    {!hideCompanyInfo ? "Visible to users" : "Private"}
                  </span>
                  <Switch
                    checked={!hideCompanyInfo}
                    onCheckedChange={(checked) => setHideCompanyInfo(!checked)}
                    className="scale-75"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-slate-200">
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Enter your company name"
                  className="text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm font-medium text-slate-200">
                  Trade / Industry
                </Label>
                <Select
                  value={industry}
                  onValueChange={(value) => {
                    setIndustry(value)
                    // Keep only services that belong to the new industry
                    const industryData = findTradeIndustry(value)
                    if (industryData && industryData.services.length > 0) {
                      setServices(prev => prev.filter(s => (industryData.services as readonly string[]).includes(s)))
                    } else {
                      setServices([])
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-sm bg-slate-700/50 border-2 border-slate-600 hover:border-slate-500 focus:border-emerald-500 focus:ring-0 text-white data-[placeholder]:text-slate-400">
                    <SelectValue placeholder="Select your trade" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border border-slate-700 text-white shadow-xl max-h-72">
                    {TRADE_INDUSTRIES.map((ind) => (
                      <SelectItem
                        key={ind.title}
                        value={ind.title}
                        className="text-slate-200 focus:bg-emerald-600/20 focus:text-emerald-300 cursor-pointer"
                      >
                        {ind.icon} {ind.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Services */}
              {(() => {
                const industryData = findTradeIndustry(industry)
                const availableServices = industryData?.services ?? []
                return (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-200">Services</Label>
                    {availableServices.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                        {availableServices.map((service) => (
                          <label key={service} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={services.includes(service)}
                              onChange={() => toggleService(service)}
                              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 cursor-pointer"
                            />
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{service}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        {industry ? "No predefined services for this trade — add a description below." : "Select a trade above to see available services."}
                      </p>
                    )}
                    {services.length > 0 && (
                      <p className="text-xs text-slate-400">
                        {services.length} service{services.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>
                )
              })()}

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fullAddress" className="flex items-center text-sm font-medium text-slate-200">
                      <MapPin className="h-4 w-4 mr-1 text-emerald-400" />
                      Business Address (Optional)
                    </Label>
                    <div className="flex items-center space-x-2">
                      {!hideAddress ? (
                        <Eye className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      )}
                      <span className="text-sm text-slate-400">
                        {!hideAddress ? "Visible to users" : "Private"}
                      </span>
                      <Switch
                        checked={!hideAddress}
                        onCheckedChange={(checked) => setHideAddress(!checked)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  <Textarea
                    id="fullAddress"
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="e.g. 123 High Street, Apartment 4B, London, Greater London, SW1A 1AA, United Kingdom"
                    rows={3}
                    className="text-sm resize-none bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-400">
                    {!hideAddress
                      ? "Your full business address will be visible to users. Your city/region is automatically detected from your map location."
                      : "Your address will remain private. Only your city/region from the map location will be shown."
                    }
                  </p>
                </div>

                {/* Map Location Picker Section */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center text-slate-200">
                    <MapPin className="h-4 w-4 mr-2 text-emerald-400" />
                    Map Location
                  </h4>
                  <p className="text-sm text-slate-400">
                    Set your precise location on the map for better job posting visibility. This will be used for location-based searches.
                  </p>

                  <LocationPicker
                    latitude={latitude || undefined}
                    longitude={longitude || undefined}
                    onLocationSelect={(lat, lng, address) => {
                      setLatitude(lat)
                      setLongitude(lng)
                      if (address) {
                        setLocation(address)
                        setFullAddress(address)
                      }
                    }}
                    onLocationClear={() => {
                      setLatitude(null)
                      setLongitude(null)
                      setLocation("")
                      setFullAddress("")
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="websiteUrl" className="text-sm font-medium text-slate-200">
                    Website URL
                  </Label>
                  <div className="flex items-center space-x-2">
                    {!hideContactInfo ? (
                      <Eye className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    )}
                    <span className="text-sm text-slate-400">
                      {!hideContactInfo ? "Visible to users" : "Private"}
                    </span>
                    <Switch
                      checked={!hideContactInfo}
                      onCheckedChange={(checked) => setHideContactInfo(!checked)}
                      className="scale-75"
                    />
                  </div>
                </div>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onBlur={(e) => {
                    const value = e.target.value.trim()
                    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                      setWebsiteUrl(`https://${value}`)
                    }
                  }}
                  placeholder="https://yourcompany.com"
                  className="text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400">
                  {!hideContactInfo
                    ? "Your website URL will be visible to job seekers."
                    : "Your website URL will remain private."
                  }
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium text-slate-200">
                    Phone Number
                  </Label>
                  <div className="flex items-center space-x-2">
                    {!hideContactInfo ? (
                      <Eye className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    )}
                    <span className="text-sm text-slate-400">
                      {!hideContactInfo ? "Visible to users" : "Private"}
                    </span>
                    <Switch
                      checked={!hideContactInfo}
                      onCheckedChange={(checked) => setHideContactInfo(!checked)}
                      className="scale-75"
                    />
                  </div>
                </div>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+44 20 1234 5678"
                  className="text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400">
                  {!hideContactInfo
                    ? "Your phone number will be visible to job seekers."
                    : "Your phone number will remain private."
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-200">
                  Company Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your company..."
                  rows={4}
                  className="text-sm resize-none bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Contractor Services Section */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-white">Contractor Services</h3>

              {/* Spoken Languages */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-200">Spoken Languages</Label>
                <LanguageSelector
                  selectedLanguages={spokenLanguages}
                  onChange={setSpokenLanguages}
                />
                <p className="text-xs text-slate-400">
                  Languages your company can provide services in
                </p>
              </div>

              {/* 24/7 Service */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="service24_7" className="text-sm font-medium text-slate-200">
                    24/7 Service Availability
                  </Label>
                  <div className="flex items-center space-x-2">
                    {service24_7 ? (
                      <Eye className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    )}
                    <span className="text-sm text-slate-400">
                      {service24_7 ? "Available 24/7" : "Regular hours"}
                    </span>
                    <Switch
                      id="service24_7"
                      checked={service24_7}
                      onCheckedChange={setService24_7}
                      className="scale-75"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {service24_7
                    ? "Your company is marked as available for emergency services 24/7."
                    : "Your company operates during regular business hours."
                  }
                </p>
              </div>

              {/* Price List */}
              <div className="space-y-2">
                <Label htmlFor="priceList" className="text-sm font-medium text-slate-200">
                  Price List (Optional)
                </Label>
                <Textarea
                  id="priceList"
                  placeholder="Example:&#10;Standard Electrical Installation: £50-150&#10;Emergency Call-out: £80-200&#10;Kitchen Rewire: £500-1000"
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                  rows={6}
                  className="text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400">
                  Add common service prices to help customers understand costs. Companies with clear pricing attract more customers.
                </p>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="space-y-4 pt-6 border-t border-red-500/20">
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-medium text-red-400 flex items-center">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Danger Zone
                </h3>
                <p className="text-sm text-slate-400">
                  Permanently delete your company account and all associated data. This action cannot be undone.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-red-400 hover:text-red-300 underline font-medium"
                    disabled={deleting}
                  >
                    Delete the account
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your company profile, all job postings, applications, and associated data.
                      You can make your company invisible instead by clicking the Visibility switch on your dashboard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Yes, I am sure"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
              <Button type="button" variant="outline" asChild className="text-sm bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                <Link href={locale === 'pt-BR' ? '/br/dashboard/company' : '/dashboard/company'}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
