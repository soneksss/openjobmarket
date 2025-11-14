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
import { Badge } from "@/components/ui/badge"
import { Upload, ArrowLeft, Building2, MapPin, Eye, EyeOff, Trash2, Plus, X } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import pica from "pica"
import { LocationPicker } from "@/components/ui/location-picker"
import { deleteCompanyAccount } from "@/lib/actions"
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
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [companyName, setCompanyName] = useState(profile.company_name)
  const [description, setDescription] = useState(profile.description || "")
  const [industry, setIndustry] = useState(profile.industry || "")
  const [customIndustry, setCustomIndustry] = useState("")
  const [showCustomIndustry, setShowCustomIndustry] = useState(false)
  const [services, setServices] = useState<string[]>(profile.services || [])
  const [newService, setNewService] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || "")
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "")
  const [location, setLocation] = useState(profile.location || "")
  const [fullAddress, setFullAddress] = useState(profile.full_address || "")
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || "")

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

  // Check if industry is a custom value (not in predefined list)
  useEffect(() => {
    const predefinedIndustries = [
      "Technology", "Healthcare", "Finance", "Education", "Retail",
      "Manufacturing", "Construction", "Real Estate", "Marketing", "Consulting"
    ]
    if (industry && !predefinedIndustries.includes(industry)) {
      setShowCustomIndustry(true)
      setCustomIndustry(industry)
    }
  }, [])

  // Image resizing helper function
  const resizeImage = async (file: File, maxSize: number = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
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

    setUploading(true)
    try {
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
      setLogoUrl(publicUrl)
      alert("Logo uploaded and optimized successfully!")
    } catch (error) {
      console.error("[v0] Unexpected error:", error)
      if (error instanceof Error && error.message.includes('canvas')) {
        alert("Error processing image. Please try a different image file.")
      } else {
        alert("Unexpected error uploading logo. Please try again.")
      }
    } finally {
      setUploading(false)
    }
  }

  const addService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()])
      setNewService("")
    }
  }

  const removeService = (service: string) => {
    setServices(services.filter((s) => s !== service))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from("company_profiles")
        .update({
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
          logo_url: logoUrl || null,
          spoken_languages: spokenLanguages,
          service_24_7: service24_7,
          price_list: priceList || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      // Redirect back to dashboard
      router.push("/dashboard/company")
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Error updating profile. Please try again.")
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
        console.error("[COMPANY_EDIT] Account deletion error:", result.error)
        alert(`Error deleting account: ${result.error}`)
        setDeleting(false)
        return
      }

      console.log("[COMPANY_EDIT] Account deletion completed successfully")

      // Import and use manualLogout to properly clear client-side session
      const { manualLogout } = await import("@/hooks/use-auto-logout")
      await manualLogout()

      // manualLogout will redirect to "/" and clear all storage
    } catch (error) {
      console.error("[COMPANY_EDIT] Unexpected error during account deletion:", error)
      alert("An unexpected error occurred while deleting your account. Please try again.")
      setDeleting(false)
    }
  }

  return (
    <div className="antialiased space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/company">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="antialiased">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-semibold">
            <Building2 className="h-5 w-5 mr-2" />
            Edit Company Profile
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Update your company information and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Logo Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Company Logo</Label>
              <div className="flex items-center space-x-4">
                <div className="relative h-16 w-24 sm:h-20 sm:w-32 bg-muted rounded-lg overflow-hidden border-2 border-gray-300">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      <div className="text-xs sm:text-sm font-medium text-muted-foreground text-center">
                        {getInitials()}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center space-x-2 px-3 py-2 text-sm border-2 border-gray-300 rounded-md hover:bg-accent hover:border-blue-400 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>{uploading ? "Uploading..." : "Upload Logo"}</span>
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
                  <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 5MB.</p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium">Company Information</h3>
                <div className="flex items-center space-x-2">
                  {!hideCompanyInfo ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
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
                <Label htmlFor="companyName" className="text-sm font-medium">
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Enter your company name"
                  className="text-sm border-2 border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm font-medium">
                  Industry
                </Label>
                {!showCustomIndustry ? (
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "Other") {
                        setShowCustomIndustry(true)
                        setIndustry("")
                      } else {
                        setIndustry(value)
                      }
                    }}
                    className="w-full text-sm border-2 border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background"
                  >
                    <option value="">Select an industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Retail">Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Construction">Construction</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Other">Other (Enter manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter your industry"
                      value={customIndustry}
                      onChange={(e) => {
                        setCustomIndustry(e.target.value)
                        setIndustry(e.target.value)
                      }}
                      className="text-sm border-2 border-gray-300 focus:border-blue-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCustomIndustry(false)
                        setCustomIndustry("")
                        setIndustry("")
                      }}
                      className="shrink-0"
                    >
                      Back to List
                    </Button>
                  </div>
                )}
              </div>

              {/* Services */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Services</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a service (e.g., Lightning design, Electrical installation)"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
                    className="text-sm border-2 border-gray-300 focus:border-blue-500"
                  />
                  <Button type="button" onClick={addService} size="icon" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map((service) => (
                    <Badge key={service} variant="secondary" className="flex items-center gap-1 text-xs">
                      {service}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeService(service)} />
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  List the services your company provides (helps customers find you by service type)
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fullAddress" className="flex items-center text-sm font-medium">
                      <MapPin className="h-4 w-4 mr-1" />
                      Business Address (Optional)
                    </Label>
                    <div className="flex items-center space-x-2">
                      {!hideAddress ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
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
                    className="text-sm resize-none border-2 border-gray-300 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    {!hideAddress
                      ? "Your full business address will be visible to users. Your city/region is automatically detected from your map location."
                      : "Your address will remain private. Only your city/region from the map location will be shown."
                    }
                  </p>
                </div>

                {/* Map Location Picker Section */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Map Location
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Set your precise location on the map for better job posting visibility. This will be used for location-based searches.
                  </p>

                  <LocationPicker
                    latitude={latitude || undefined}
                    longitude={longitude || undefined}
                    onLocationSelect={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                    }}
                    onLocationClear={() => {
                      setLatitude(null)
                      setLongitude(null)
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="websiteUrl" className="text-sm font-medium">
                    Website URL
                  </Label>
                  <div className="flex items-center space-x-2">
                    {!hideContactInfo ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
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
                  className="text-sm border-2 border-gray-300 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  {!hideContactInfo
                    ? "Your website URL will be visible to job seekers."
                    : "Your website URL will remain private."
                  }
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <div className="flex items-center space-x-2">
                    {!hideContactInfo ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
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
                  className="text-sm border-2 border-gray-300 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  {!hideContactInfo
                    ? "Your phone number will be visible to job seekers."
                    : "Your phone number will remain private."
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Company Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your company..."
                  rows={4}
                  className="text-sm resize-none border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Contractor Services Section */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-foreground">Contractor Services</h3>

              {/* Spoken Languages */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Spoken Languages</Label>
                <LanguageSelector
                  selectedLanguages={spokenLanguages}
                  onChange={setSpokenLanguages}
                />
                <p className="text-xs text-muted-foreground">
                  Languages your company can provide services in
                </p>
              </div>

              {/* 24/7 Service */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="service24_7" className="text-sm font-medium">
                    24/7 Service Availability
                  </Label>
                  <div className="flex items-center space-x-2">
                    {service24_7 ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">
                  {service24_7
                    ? "Your company is marked as available for emergency services 24/7."
                    : "Your company operates during regular business hours."
                  }
                </p>
              </div>

              {/* Price List */}
              <div className="space-y-2">
                <Label htmlFor="priceList" className="text-sm font-medium">
                  Price List (Optional)
                </Label>
                <Textarea
                  id="priceList"
                  placeholder="Example:&#10;Standard Electrical Installation: £50-150&#10;Emergency Call-out: £80-200&#10;Kitchen Rewire: £500-1000"
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                  rows={6}
                  className="text-sm border-2 border-gray-300 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  Add common service prices to help customers understand costs. Companies with clear pricing attract more customers.
                </p>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="space-y-4 pt-6 border-t border-destructive/20">
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-medium text-destructive flex items-center">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your company account and all associated data. This action cannot be undone.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-destructive hover:text-destructive/80 underline font-medium"
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
              <Button type="button" variant="outline" asChild className="text-sm bg-transparent">
                <Link href="/dashboard/company">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading} className="text-sm">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
