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
import { Upload, ArrowLeft, Building2, MapPin, Eye, EyeOff, Trash2, ShieldCheck, FileText, Calendar, Plus, X, Globe2, Camera, AlertCircle } from "lucide-react"
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
import { PortfolioPhotosEditor } from "@/components/portfolio-photos-editor"
import { CompanyVerificationSection } from "@/components/company-verification-section"
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
  custom_services?: string[]
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
  business_type?: "limited_company" | "sole_trader" | null
  company_registration_number?: string | null
  registered_address?: string | null
  insurance_document_path?: string | null
  insurance_expiry_date?: string | null
  insurance_provider?: string | null
  insurance_policy_type?: string | null
  insurance_cover_amount?: string | null
  google_maps_url?: string | null
  facebook_url?: string | null
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
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    (profile as any).industries?.length > 0
      ? (profile as any).industries
      : profile.industry ? [profile.industry] : []
  )
  const [services, setServices] = useState<string[]>(profile.services || [])
  const [customServices, setCustomServices] = useState<string[]>(profile.custom_services || [])
  const [customServiceInput, setCustomServiceInput] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || "")
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "")
  const [contactEmail, setContactEmail] = useState((profile as any).contact_email || "")
  const [location, setLocation] = useState(profile.location || "")
  const [fullAddress, setFullAddress] = useState(profile.full_address || "")

  // Online Presence — plain profile links (no API import, no cost)
  const [googleMapsUrl, setGoogleMapsUrl] = useState(profile.google_maps_url || "")
  const [facebookUrl, setFacebookUrl] = useState(profile.facebook_url || "")
  // Initialize with the plain URL — cache-busting is applied after mount to avoid hydration mismatch
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || "")

  useEffect(() => {
    if (profile.logo_url) {
      const separator = profile.logo_url.includes("?") ? "&" : "?"
      setLogoUrl(`${profile.logo_url}${separator}t=${Date.now()}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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

  // Business type verification fields
  const [businessType, setBusinessType] = useState<"limited_company" | "sole_trader" | null>(profile.business_type || null)
  const [companyRegNumber, setCompanyRegNumber] = useState(profile.company_registration_number || "")
  const [registeredAddress, setRegisteredAddress] = useState(profile.registered_address || "")
  const [insuranceDocPath, setInsuranceDocPath] = useState(profile.insurance_document_path || "")
  const [insuranceExpiry, setInsuranceExpiry] = useState(profile.insurance_expiry_date || "")
  const [insuranceProvider, setInsuranceProvider] = useState(profile.insurance_provider || "")
  const [insurancePolicyType, setInsurancePolicyType] = useState(profile.insurance_policy_type || "")
  const [insuranceCoverAmount, setInsuranceCoverAmount] = useState(profile.insurance_cover_amount || "")
  const [uploadingInsurance, setUploadingInsurance] = useState(false)
  const [viewingInsuranceDoc, setViewingInsuranceDoc] = useState(false)

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
      // A logo is never shown larger than ~100px (≈300px retina), so always
      // shrink it to a small webp unless it's already tiny.
      const shouldCompress = file.size > 60 * 1024

      if (shouldCompress) {
        console.log("[v0] Compressing logo before upload...")
        setUploadStatus("Optimizing image...")
        try {
          const resizedFile = await resizeImage(file, 512)
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
        const sep = publicUrl.includes("?") ? "&" : "?"
        setLogoUrl(`${publicUrl}${sep}t=${Date.now()}`)
        setLogoError(false)

        // Persist immediately — without this the DB still points to the old
        // (now-deleted) file if the user navigates away before hitting Save.
        await supabase
          .from("company_profiles")
          .update({ logo_url: publicUrl })
          .eq("id", profile.id)

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

  const addCustomService = () => {
    const trimmed = customServiceInput.trim()
    if (!trimmed || customServices.includes(trimmed)) return
    setCustomServices(prev => [...prev, trimmed])
    setCustomServiceInput("")
  }

  const removeCustomService = (service: string) => {
    setCustomServices(prev => prev.filter(s => s !== service))
  }

  const handleInsuranceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF, JPG, or PNG file.", variant: "destructive", duration: 5000 })
      e.target.value = ""
      return
    }

    const MAX_MB = 5
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max ${MAX_MB}MB allowed.`, variant: "destructive", duration: 4000 })
      e.target.value = ""
      return
    }

    setUploadingInsurance(true)
    try {
      // Upload via the server route (service-role) so it doesn't depend on the
      // insurance-documents storage RLS policy being present — a missing policy
      // was causing "new row violates row-level security policy" on the old
      // direct client upload. The file still lands under {auth.uid()}/ and the
      // bucket stays private.
      const fd = new FormData()
      fd.append("file", file)

      const uploadPromise = fetch("/api/company/insurance-document", {
        method: "POST",
        body: fd,
        credentials: "include",
      })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out. Please check your connection and try again.")), 30_000)
      )
      const res = await Promise.race([uploadPromise, timeoutPromise])
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.path) throw new Error(body?.error || "Upload failed")

      setInsuranceDocPath(body.path)
      toast({ title: "Document uploaded", description: "Insurance certificate saved.", duration: 3000 })
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive", duration: 4000 })
    } finally {
      setUploadingInsurance(false)
      e.target.value = ""
    }
  }

  const handleViewInsuranceDoc = async () => {
    setViewingInsuranceDoc(true)
    try {
      const res = await fetch("/api/company/insurance-document", { credentials: "include" })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error || "Could not open document")
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (err: any) {
      toast({ title: "Could not open document", description: err?.message || "Please try again.", variant: "destructive", duration: 4000 })
    } finally {
      setViewingInsuranceDoc(false)
    }
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
        industries: selectedIndustries.filter(i => i).length > 0 ? selectedIndustries.filter(i => i) : null,
        industry: selectedIndustries.find(i => i) || null,
        services: services.length > 0 ? services : null,
        custom_services: customServices.length > 0 ? customServices : null,
        website_url: websiteUrl || null,
        phone_number: phoneNumber || null,
        contact_email: contactEmail || null,
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
        business_type: businessType || null,
        company_registration_number: companyRegNumber || null,
        registered_address: registeredAddress || null,
        insurance_document_path: insuranceDocPath || null,
        insurance_expiry_date: insuranceExpiry || null,
        insurance_provider: insuranceProvider || null,
        insurance_policy_type: insurancePolicyType || null,
        insurance_cover_amount: insuranceCoverAmount || null,
        google_maps_url: googleMapsUrl || null,
        facebook_url: facebookUrl || null,
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
        // Deletion may still have gone through server-side (the data-deletion
        // RPC runs before any step that can produce `error`). Either way the
        // session is now unusable — log out rather than stranding the user on a
        // dead page. Only "not authenticated" means nothing was deleted, and
        // even then a clean redirect is the right move.
        console.warn("[COMPANY_EDIT] Account deletion returned an error, logging out anyway:", result.error)
      } else {
        console.log("[COMPANY_EDIT] Account deletion completed successfully")
      }

      // Always clear client-side session + hard-redirect to "/"
      const { manualLogout } = await import("@/hooks/use-auto-logout")
      await manualLogout()
    } catch (error) {
      console.warn("[COMPANY_EDIT] Unexpected error during account deletion — logging out:", error)
      try {
        const { manualLogout } = await import("@/hooks/use-auto-logout")
        await manualLogout()
      } catch {
        if (typeof window !== "undefined") window.location.href = "/"
      }
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
                  {uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-900/70 backdrop-blur-[1px]">
                      <span className="h-7 w-7 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                      <span className="text-[9px] font-medium text-slate-200 leading-none">
                        {uploadStatus === "Optimizing image..." ? "Resizing…" : "Uploading…"}
                      </span>
                    </div>
                  )}
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

              {/* Industries & Specialties — dropdown + Add more */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-200">
                  Industries &amp; Specialties
                </Label>
                <p className="text-xs text-slate-400">Choose your industry from the dropdown, tick your specialties, then add more industries if needed.</p>

                <div className="space-y-3">
                  {/* One row per selected industry */}
                  {(selectedIndustries.length === 0 ? [""] : selectedIndustries).map((industryTitle, idx) => {
                    const ind = TRADE_INDUSTRIES.find(i => i.title === industryTitle)
                    const unavailable = selectedIndustries.filter((_, i) => i !== idx)

                    return (
                      <div key={idx} className="rounded-lg border border-slate-600 overflow-hidden">
                        {/* Industry dropdown row */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-700/50">
                          <Select
                            value={industryTitle || "__placeholder__"}
                            onValueChange={(val) => {
                              if (val === "__placeholder__") return
                              const prev = selectedIndustries[idx]
                              // Remove old industry's services from selection
                              if (prev) {
                                const oldInd = TRADE_INDUSTRIES.find(i => i.title === prev)
                                if (oldInd) {
                                  setServices(s => s.filter(sv => !(oldInd.services as readonly string[]).includes(sv)))
                                }
                              }
                              setSelectedIndustries(arr => {
                                const next = [...arr]
                                next[idx] = val
                                return next
                              })
                            }}
                          >
                            <SelectTrigger className="flex-1 bg-slate-700 border-slate-600 text-white text-sm h-9">
                              <SelectValue placeholder="Select an industry…" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600 text-white max-h-72">
                              {TRADE_INDUSTRIES
                                .filter(i => i.title !== "Not sure / Other" && !unavailable.includes(i.title))
                                .map(i => (
                                  <SelectItem key={i.title} value={i.title} className="text-sm hover:bg-slate-700 focus:bg-slate-700">
                                    {i.icon} {i.title}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>

                          {/* Remove button — only show when there is more than one slot or the slot has a value */}
                          {(selectedIndustries.length > 1 || industryTitle) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (ind) {
                                  setServices(s => s.filter(sv => !(ind.services as readonly string[]).includes(sv)))
                                }
                                setSelectedIndustries(arr => arr.filter((_, i) => i !== idx))
                              }}
                              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                              aria-label="Remove industry"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>

                        {/* Specialties — shown when industry is picked */}
                        {ind && ind.services.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 p-3 bg-slate-800/60 border-t border-slate-600">
                            {(ind.services as readonly string[]).map((service) => (
                              <label key={service} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={services.includes(service)}
                                  onChange={() => toggleService(service)}
                                  className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 cursor-pointer"
                                />
                                <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{service}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add more button — only when all current slots have a value and fewer than all industries are selected */}
                  {selectedIndustries.length > 0 &&
                    selectedIndustries.every(i => i !== "") &&
                    selectedIndustries.length < TRADE_INDUSTRIES.filter(i => i.title !== "Not sure / Other").length && (
                    <button
                      type="button"
                      onClick={() => setSelectedIndustries(prev => [...prev, ""])}
                      className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors py-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add another industry
                    </button>
                  )}
                </div>

                {(selectedIndustries.filter(i => i).length > 0 || services.length > 0) && (
                  <p className="text-xs text-slate-400">
                    {selectedIndustries.filter(i => i).length} industr{selectedIndustries.filter(i => i).length === 1 ? "y" : "ies"} · {services.length} specialt{services.length === 1 ? "y" : "ies"} selected
                  </p>
                )}
              </div>

              {/* Additional (custom) services */}
              <div className="space-y-2 pt-1">
                <Label className="text-sm font-medium text-slate-200">Additional Services</Label>
                <p className="text-xs text-slate-400">Add services specific to your business that aren't in the standard list. These are shown on your profile but not used in search filters.</p>
                <div className="flex gap-2">
                  <Input
                    value={customServiceInput}
                    onChange={e => setCustomServiceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomService() } }}
                    placeholder="e.g. Flat roof, Leadwork, Drone surveys…"
                    className="h-9 text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={addCustomService}
                    disabled={!customServiceInput.trim()}
                    className="flex-shrink-0 flex items-center gap-1 px-3 h-9 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-sm font-medium transition-colors border border-slate-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
                {customServices.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {customServices.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 text-xs bg-slate-700 border border-slate-600 text-slate-200 pl-2.5 pr-1.5 py-1 rounded-lg">
                        {s}
                        <button type="button" onClick={() => removeCustomService(s)} className="text-slate-400 hover:text-white transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

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
                    address={location || fullAddress || undefined}
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

              {/* ── Online Presence ────────────────────────────────────── */}
              <div className="space-y-4 pt-6 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-blue-400" />
                  <h3 className="text-base font-semibold text-white">Online Presence <span className="text-slate-500 text-sm font-normal">(Optional)</span></h3>
                </div>
                <p className="text-xs text-slate-400">
                  Link your Google Business and Facebook pages so customers can click through and see your reviews.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="googleMapsUrl" className="text-sm font-medium text-slate-200">
                    Google Business / Maps Link
                  </Label>
                  <Input
                    id="googleMapsUrl"
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value.trim()
                      if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                        setGoogleMapsUrl(`https://${value}`)
                      }
                    }}
                    placeholder="https://g.page/yourbusiness or Google Maps link"
                    className="text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-400">Shown as a "View on Google" button on your public profile.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebookUrl" className="text-sm font-medium text-slate-200">
                    Facebook Page Link
                  </Label>
                  <Input
                    id="facebookUrl"
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value.trim()
                      if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                        setFacebookUrl(`https://${value}`)
                      }
                    }}
                    placeholder="https://facebook.com/yourbusiness"
                    className="text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-400">Shown as a "Visit Facebook" button on your public profile.</p>
                </div>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="contactEmail" className="text-sm font-medium text-slate-200">
                    Contact Email
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
                  </div>
                </div>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@yourcompany.com"
                  className="text-sm bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400">
                  {!hideContactInfo
                    ? "Your contact email will be visible to homeowners (shown on click)."
                    : "Your contact email will remain private."
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

            {/* ── Business Type & Verification ───────────────────────── */}
            <div className="space-y-4 pt-6 border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-semibold text-white">Business Type <span className="text-slate-500 text-sm font-normal">(Optional)</span></h3>
              </div>
              <p className="text-xs text-slate-400">
                Adding business verification builds trust with customers and shows on your public profile.
              </p>

              {/* Type selector */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBusinessType(businessType === "limited_company" ? null : "limited_company")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                    businessType === "limited_company"
                      ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
                      : "bg-slate-700/40 border-slate-600/50 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  Limited Company
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessType(businessType === "sole_trader" ? null : "sole_trader")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                    businessType === "sole_trader"
                      ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
                      : "bg-slate-700/40 border-slate-600/50 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  Sole Trader
                </button>
              </div>

              {/* Limited company fields */}
              {businessType === "limited_company" && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-300">Company Registration Number</Label>
                    <Input
                      placeholder="e.g. 12345678"
                      value={companyRegNumber}
                      onChange={(e) => setCompanyRegNumber(e.target.value)}
                      className="text-sm bg-slate-700/50 border-slate-600 focus:border-blue-500 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-300">Registered Address</Label>
                    <Input
                      placeholder="Registered office address"
                      value={registeredAddress}
                      onChange={(e) => setRegisteredAddress(e.target.value)}
                      className="text-sm bg-slate-700/50 border-slate-600 focus:border-blue-500 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}

              {/* Sole trader fields */}
              {businessType === "sole_trader" && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <p className="text-xs text-slate-500">No additional details needed for sole traders — add your insurance below.</p>
                </div>
              )}
            </div>

            {/* ── Insurance ───────────────────────────────────────────── */}
            <div className="space-y-4 pt-6 border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Insurance <span className="text-slate-500 text-sm font-normal">(Optional)</span></h3>
              </div>
              <p className="text-xs text-slate-400">
                Show homeowners you're insured. Your certificate stays private — only you and OpenJobMarket admins can view it; we only ever display the provider, policy type, cover amount and expiry date publicly.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-300">Insurance Provider</Label>
                  <Input
                    placeholder="e.g. Simply Business"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="text-sm bg-slate-700/50 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-300">Policy Type</Label>
                  <select
                    value={insurancePolicyType}
                    onChange={(e) => setInsurancePolicyType(e.target.value)}
                    className="w-full text-sm bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white rounded-md h-10 px-3"
                  >
                    <option value="">Select policy type</option>
                    <option value="Public Liability">Public Liability</option>
                    <option value="Professional Indemnity">Professional Indemnity</option>
                    <option value="Employers' Liability">Employers' Liability</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-300">Cover Amount</Label>
                  <Input
                    placeholder="e.g. £2,000,000"
                    value={insuranceCoverAmount}
                    onChange={(e) => setInsuranceCoverAmount(e.target.value)}
                    className="text-sm bg-slate-700/50 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Expiry Date
                  </Label>
                  <Input
                    type="date"
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className="text-sm bg-slate-700/50 border-slate-600 focus:border-emerald-500 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-300">Insurance Certificate (PDF, JPG or PNG)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    uploadingInsurance ? "opacity-50 cursor-not-allowed" : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                  }`}>
                    <FileText className="w-4 h-4" />
                    {uploadingInsurance ? "Uploading…" : insuranceDocPath ? "Replace File" : "Upload File"}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleInsuranceUpload}
                      disabled={uploadingInsurance}
                    />
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    uploadingInsurance ? "opacity-50 cursor-not-allowed" : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                  }`}>
                    <Camera className="w-4 h-4" />
                    Take Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleInsuranceUpload}
                      disabled={uploadingInsurance}
                    />
                  </label>
                  {insuranceDocPath && (
                    <button
                      type="button"
                      onClick={handleViewInsuranceDoc}
                      disabled={viewingInsuranceDoc}
                      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> {viewingInsuranceDoc ? "Opening…" : "View current document"}
                    </button>
                  )}
                </div>
                {insuranceExpiry && new Date(insuranceExpiry) < new Date() && (
                  <p className="text-xs text-amber-400 flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> This certificate has expired — upload a new one to keep your "Insurance Verified" badge.
                  </p>
                )}
              </div>
            </div>

            {/* ── Verification (optional trust layer) ─────────────────── */}
            <CompanyVerificationSection />

            {/* Portfolio Photos */}
            <div className="space-y-3 pt-6 border-t border-slate-700/60">
              <div>
                <h3 className="text-base sm:text-lg font-medium text-white flex items-center gap-2">
                  Portfolio Photos
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Show homeowners examples of your previous work (max 6 photos)
                </p>
              </div>
              <PortfolioPhotosEditor profileId={profile.id} />
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
