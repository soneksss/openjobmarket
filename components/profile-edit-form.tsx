"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n/context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { Upload, X, Plus, ArrowLeft, Eye, EyeOff, Phone, Trash2, CheckCircle, MapPin, Lock, Unlock } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { LocationPicker } from "@/components/ui/location-picker"
import { deleteProfessionalAccount } from "@/lib/actions"
import LanguageSelector from "@/components/language-selector"

interface User {
  id: string
  email: string
}

interface UserData {
  id: string
  email: string
  user_type: string
  profile_photo_url?: string
  full_name?: string
  bio?: string
  location?: string
  phone?: string
  phone_visible?: boolean
  website?: string
}

interface ProfessionalProfile {
  id: string
  first_name: string
  last_name: string
  title: string
  bio: string
  location: string
  experience_level: string
  skills: string[]
  portfolio_url?: string
  linkedin_url?: string
  github_url?: string
  salary_min?: number
  salary_max?: number
  is_self_employed?: boolean
  spoken_languages?: string[]
  ready_to_relocate?: boolean
  employed_open_to_offers?: boolean
  unemployed_seeking?: boolean
  nickname?: string
  share_personal_info?: boolean
  profile_photo_url?: string
  actively_looking?: boolean
  hide_personal_name?: boolean
  hide_address_details?: boolean
  hide_bio?: boolean
  hide_professional_title?: boolean
  hide_portfolio_links?: boolean
  hide_email?: boolean
  latitude?: number
  longitude?: number
  valid_driving_license?: boolean
  own_transport?: boolean
}

interface ProfileEditFormProps {
  user: User
  userData: UserData | null
  professionalProfile: ProfessionalProfile | null
}

export default function ProfileEditForm({ user, userData, professionalProfile }: ProfileEditFormProps) {
  const router = useRouter()
  const { t, locale } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState(false)

  // Dashboard path with locale
  const dashboardBasePath = userData?.user_type === "professional" ? "/dashboard/professional" : "/dashboard/company"
  const dashboardPath = locale === 'pt-BR' ? `/br${dashboardBasePath}` : dashboardBasePath

  // Form state
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(userData?.profile_photo_url || "")
  const [fullName, setFullName] = useState(userData?.full_name || "")
  const [bio, setBio] = useState(userData?.bio || "")
  const [location, setLocation] = useState(userData?.location || "")
  const [phone, setPhone] = useState(userData?.phone || "")
  const [phoneVisible, setPhoneVisible] = useState(userData?.phone_visible ?? false)
  const [website, setWebsite] = useState(userData?.website || "")

  // Professional profile state
  const [nickname, setNickname] = useState(professionalProfile?.nickname || "")
  const [firstName, setFirstName] = useState(professionalProfile?.first_name || "")
  const [lastName, setLastName] = useState(professionalProfile?.last_name || "")
  const [title, setTitle] = useState(professionalProfile?.title || "")
  const [professionalBio, setProfessionalBio] = useState(professionalProfile?.bio || "")
  const [professionalLocation, setProfessionalLocation] = useState(professionalProfile?.location || "")
  const [skills, setSkills] = useState<string[]>(professionalProfile?.skills || [])
  const [portfolioUrl, setPortfolioUrl] = useState(professionalProfile?.portfolio_url || "")
  const [linkedinUrl, setLinkedinUrl] = useState(professionalProfile?.linkedin_url || "")
  const [salaryMin, setSalaryMin] = useState(professionalProfile?.salary_min?.toString() || "")

  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(professionalProfile?.spoken_languages || [])
  const [readyToRelocate, setReadyToRelocate] = useState(professionalProfile?.ready_to_relocate || false)
  // Employment status as exclusive options
  const [employmentStatus, setEmploymentStatus] = useState<'none' | 'employed' | 'unemployed'>(
    professionalProfile?.employed_open_to_offers ? 'employed' :
    professionalProfile?.unemployed_seeking ? 'unemployed' : 'none'
  )
  const [sharePersonalInfo, setSharePersonalInfo] = useState(professionalProfile?.share_personal_info || false)
  const [validDrivingLicense, setValidDrivingLicense] = useState(professionalProfile?.valid_driving_license || false)
  const [ownTransport, setOwnTransport] = useState(professionalProfile?.own_transport || false)

  // Privacy control states
  const [hidePersonalName, setHidePersonalName] = useState(professionalProfile?.hide_personal_name || false)
  const [hideAddressDetails, setHideAddressDetails] = useState(professionalProfile?.hide_address_details || false)
  const [hideBio, setHideBio] = useState(professionalProfile?.hide_bio || false)
  const [hideProfessionalTitle, setHideProfessionalTitle] = useState(professionalProfile?.hide_professional_title || false)
  const [hidePortfolioLinks, setHidePortfolioLinks] = useState(professionalProfile?.hide_portfolio_links || false)
  const [hideEmail, setHideEmail] = useState(professionalProfile?.hide_email || false)

  // Location coordinates for map pin functionality
  const [latitude, setLatitude] = useState<number | null>((userData as any)?.latitude || professionalProfile?.latitude || null)
  const [longitude, setLongitude] = useState<number | null>((userData as any)?.longitude || professionalProfile?.longitude || null)

  const [newSkill, setNewSkill] = useState("")
  const [newLanguage, setNewLanguage] = useState("")

  const supabase = createClient()

  // Image resizing helper function
  const resizeImage = async (file: File, maxSize: number = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          if (!ctx) {
            reject(new Error("Could not get canvas context"))
            return
          }

          // Set canvas size to square
          canvas.width = maxSize
          canvas.height = maxSize

          // Calculate dimensions for center cropping
          const size = Math.min(img.width, img.height)
          const x = (img.width - size) / 2
          const y = (img.height - size) / 2

          // Draw image with center cropping
          ctx.drawImage(img, x, y, size, size, 0, 0, maxSize, maxSize)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Could not create blob"))
                return
              }
              const resizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(resizedFile)
            },
            "image/jpeg",
            0.8
          )
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => reject(new Error("Could not load image"))
      img.src = URL.createObjectURL(file)
    })
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.")
      return
    }

    setUploading(true)
    try {
      // Resize and crop image to 300x300 square
      const resizedFile = await resizeImage(file, 300)

      const fileName = `${user.id}/${user.id}-${Date.now()}.jpg`

      // Delete old photo if exists (for professionals)
      if (userData?.user_type === "professional" && professionalProfile?.profile_photo_url) {
        const oldFileName = professionalProfile.profile_photo_url.split("/").pop()
        if (oldFileName) {
          await supabase.storage.from("profile-photos").remove([`${user.id}/${oldFileName}`])
        }
      }

      // Upload to the appropriate bucket
      const bucketName = userData?.user_type === "professional" ? "profile-photos" : "avatars"
      const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, resizedFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        alert("Error uploading photo. Please try again.")
        return
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(fileName)

      console.log("[PROFILE-EDIT] Photo uploaded to storage successfully:", publicUrl)
      console.log("[PROFILE-EDIT] IMPORTANT: Photo will be saved to database when you click 'Save Changes'")
      setProfilePhotoUrl(publicUrl)
      setPhotoUploaded(true)
    } catch (error) {
      console.error("Error:", error)
      alert("Error processing image. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const addLanguage = () => {
    if (newLanguage.trim() && !spokenLanguages.includes(newLanguage.trim())) {
      setSpokenLanguages([...spokenLanguages, newLanguage.trim()])
      setNewLanguage("")
    }
  }

  const removeLanguage = (language: string) => {
    setSpokenLanguages(spokenLanguages.filter((l) => l !== language))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update users table with basic fields first
      const userUpdateData: any = {
        profile_photo_url: profilePhotoUrl || null,
        full_name: fullName || null,
        bio: bio || null,
        location: location || null,
        website: website || null,
      }

      // Add phone fields conditionally (they might not exist in all database schemas)
      if (phone !== undefined) {
        userUpdateData.phone = phone || null
      }
      if (phoneVisible !== undefined) {
        userUpdateData.phone_visible = phoneVisible
      }

      // Only add these fields if user is professional (to avoid errors on missing columns)
      if (userData?.user_type === "professional") {
        userUpdateData.nickname = nickname || null
        userUpdateData.latitude = latitude
        userUpdateData.longitude = longitude
      }

      const { error: userError } = await supabase
        .from("users")
        .update(userUpdateData)
        .eq("id", user.id)

      if (userError) {
        console.error("User update error details:", userError)
        throw new Error(`Failed to update user profile: ${userError.message}`)
      }

      // Update professional profile if exists
      if (professionalProfile && userData?.user_type === "professional") {
        console.log("[PROFILE-EDIT] Saving profile photo URL to database:", profilePhotoUrl || "(none)")
        const profileUpdateData: any = {
          profile_photo_url: profilePhotoUrl || null,
          phone: phone || null,
          first_name: firstName,
          last_name: lastName,
          title: title,
          bio: professionalBio,
          location: professionalLocation,
          skills: skills,
          portfolio_url: portfolioUrl || null,
          linkedin_url: linkedinUrl || null,
          spoken_languages: spokenLanguages,
          ready_to_relocate: readyToRelocate,
          latitude: latitude,
          longitude: longitude,
        }

        // Add optional fields that might not exist in all database schemas
        try {
          profileUpdateData.nickname = nickname
          profileUpdateData.salary_min = salaryMin ? Number.parseInt(salaryMin) : null
          profileUpdateData.employed_open_to_offers = employmentStatus === 'employed'
          profileUpdateData.unemployed_seeking = employmentStatus === 'unemployed'
          profileUpdateData.share_personal_info = sharePersonalInfo
          profileUpdateData.hide_personal_name = hidePersonalName
          profileUpdateData.hide_address_details = hideAddressDetails
          profileUpdateData.hide_bio = hideBio
          profileUpdateData.hide_professional_title = hideProfessionalTitle
          profileUpdateData.hide_portfolio_links = hidePortfolioLinks
          profileUpdateData.hide_email = hideEmail
          profileUpdateData.valid_driving_license = validDrivingLicense
          profileUpdateData.own_transport = ownTransport
        } catch (err) {
          console.warn("Some profile fields may not be available in database:", err)
        }

        const { error: profileError } = await supabase
          .from("professional_profiles")
          .update(profileUpdateData)
          .eq("user_id", user.id)

        if (profileError) {
          console.error("Professional profile update error details:", profileError)
          throw new Error(`Failed to update professional profile: ${profileError.message}`)
        }
      }

      // Show success message
      setSaveSuccess(true)
      setPhotoUploaded(false) // Clear photo uploaded flag

      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        router.push(dashboardPath)
      }, 1500)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      const errorMessage = error?.message || "Unknown error occurred"
      console.error("Detailed error:", {
        error,
        userType: userData?.user_type,
        hasProfile: !!professionalProfile,
        userId: user.id
      })
      alert(`Error updating profile: ${errorMessage}. Please check the console for details and try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      console.log("[PROFILE_EDIT] Starting account deletion process")

      if (userData?.user_type === "professional" && professionalProfile) {
        // Call the server action to delete the account
        const result = await deleteProfessionalAccount(professionalProfile.id)

        if (result.error) {
          console.error("[PROFILE_EDIT] Account deletion error:", result.error)
          alert(`Error deleting account: ${result.error}`)
          return
        }

        console.log("[PROFILE_EDIT] Account deletion completed successfully")
        // Redirect to homepage
        router.push(locale === 'pt-BR' ? '/br' : '/')
      } else {
        // For company accounts, we can implement later
        alert("Company account deletion not yet implemented")
      }

    } catch (error) {
      console.error("[PROFILE_EDIT] Unexpected error during account deletion:", error)
      alert("An unexpected error occurred while deleting your account. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const getInitials = () => {
    if (professionalProfile) {
      if (nickname) {
        return nickname.slice(0, 2).toUpperCase()
      }
      return `${firstName[0] || ""}${lastName[0] || ""}`
    }
    return fullName
      ? fullName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
      : user.email[0].toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-green-800 font-medium">{t('profileEdit.profileUpdated')}</p>
            <p className="text-green-700 text-sm">{t('profileEdit.redirectingSoon')}</p>
          </div>
        </div>
      )}

      {/* Photo Uploaded Reminder */}
      {photoUploaded && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
          <Upload className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-blue-800 font-medium">{t('profileEdit.photoUploaded')}</p>
            <p className="text-blue-700 text-sm">{t('profileEdit.photoUploadReminder')}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={dashboardPath}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('profileEdit.backToDashboard')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profileEdit.title')}</CardTitle>
          <CardDescription>{t('profileEdit.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Section */}
            <div className="space-y-4">
              <Label>{t('profileEdit.profilePhoto')}</Label>
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 rounded-full">
                  <AvatarImage
                    src={profilePhotoUrl || "/placeholder.svg"}
                    className="object-cover w-full h-full rounded-full"
                  />
                  <AvatarFallback className="text-lg rounded-full">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="flex items-center space-x-2 px-4 py-2 border border-input rounded-md hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      <span>{uploading ? t('profileEdit.uploading') : t('profileEdit.uploadPhoto')}</span>
                    </div>
                  </Label>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">{t('profileEdit.photoFormatInfo')}</p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('profileEdit.basicInformation')}</h3>

              {userData?.user_type === "professional" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="nickname">{t('profileEdit.nickname')}</Label>
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">{t('profileEdit.alwaysVisible')}</span>
                      </div>
                    </div>
                    <Input
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder={t('profileEdit.nicknamePlaceholder')}
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('profileEdit.nicknameDescription')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('profileEdit.realName')}</Label>
                      <div className="flex items-center space-x-2">
                        {!hidePersonalName ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {!hidePersonalName ? t('profileEdit.visibleToEmployers') : t('profileEdit.private')}
                        </span>
                        <Switch
                          checked={!hidePersonalName}
                          onCheckedChange={(checked) => setHidePersonalName(!checked)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t('profileEdit.firstName')}</Label>

<Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required  className="border-2 border-gray-300 focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t('profileEdit.lastName')}</Label>

<Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required  className="border-2 border-gray-300 focus:border-blue-500" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {!hidePersonalName
                        ? t('profileEdit.realNameVisibleInfo')
                        : t('profileEdit.realNamePrivateInfo')
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('profileEdit.fullName')}</Label>

<Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}  className="border-2 border-gray-300 focus:border-blue-500" />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="flex items-center">
                    {t('profileEdit.email')}
                  </Label>
                  {userData?.user_type === "professional" && (
                    <div className="flex items-center space-x-2">
                      {!hideEmail ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideEmail ? t('profileEdit.visibleToEmployers') : t('profileEdit.private')}
                      </span>
                      <Switch
                        checked={!hideEmail}
                        onCheckedChange={(checked) => setHideEmail(!checked)}
                        className="scale-75"
                      />
                    </div>
                  )}
                </div>

<Input id="email" value={user.email} readOnly className="bg-gray-50 cursor-not-allowed border-2 border-gray-300 focus:border-blue-500" />
                <p className="text-xs text-muted-foreground">
                  {!hideEmail
                    ? t('profileEdit.emailVisibleInfo')
                    : t('profileEdit.emailPrivateInfo')
                  }
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone" className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {t('profileEdit.phoneNumber')}
                  </Label>
                  <div className="flex items-center space-x-2">
                    {phoneVisible ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {phoneVisible ? t('profileEdit.visibleToEmployers') : t('profileEdit.private')}
                    </span>
                    <Switch
                      checked={phoneVisible}
                      onCheckedChange={setPhoneVisible}
                      className="scale-75"
                    />
                  </div>
                </div>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('profileEdit.phonePlaceholder')}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  {phoneVisible
                    ? t('profileEdit.phoneVisibleInfo')
                    : t('profileEdit.phonePrivateInfo')
                  }
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="location">{t('profileEdit.location')}</Label>
                  {userData?.user_type === "professional" && (
                    <div className="flex items-center space-x-2">
                      {!hideAddressDetails ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideAddressDetails ? t('profileEdit.visibleToEmployers') : t('profileEdit.cityOnly')}
                      </span>
                      <Switch
                        checked={!hideAddressDetails}
                        onCheckedChange={(checked) => setHideAddressDetails(!checked)}
                        className="scale-75"
                      />
                    </div>
                  )}
                </div>
                <Input
                  id="location"
                  value={userData?.user_type === "professional" ? professionalLocation : location}
                  onChange={(e) =>
                    userData?.user_type === "professional"
                      ? setProfessionalLocation(e.target.value)
                      : setLocation(e.target.value)
                  }
                  placeholder={t('profileEdit.locationPlaceholder')}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                {userData?.user_type === "professional" && (
                  <p className="text-xs text-muted-foreground">
                    {!hideAddressDetails
                      ? t('profileEdit.locationFullInfo')
                      : t('profileEdit.locationCityOnlyInfo')
                    }
                  </p>
                )}
              </div>

              {/* Map Location Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {t('profileEdit.mapLocation')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('profileEdit.mapLocationDescription')}
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">{t('profileEdit.bio')}</Label>
                  {userData?.user_type === "professional" && (
                    <div className="flex items-center space-x-2">
                      {!hideBio ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideBio ? t('profileEdit.visibleToEmployers') : t('profileEdit.private')}
                      </span>
                      <Switch
                        checked={!hideBio}
                        onCheckedChange={(checked) => setHideBio(!checked)}
                        className="scale-75"
                      />
                    </div>
                  )}
                </div>
                <Textarea
                  id="bio"
                  value={userData?.user_type === "professional" ? professionalBio : bio}
                  onChange={(e) =>
                    userData?.user_type === "professional" ? setProfessionalBio(e.target.value) : setBio(e.target.value)
                  }
                  placeholder={t('profileEdit.bioPlaceholder')}
                  rows={4}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{t('profileEdit.website')}</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onBlur={(e) => {
                    const value = e.target.value.trim()
                    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                      setWebsite(`https://${value}`)
                    }
                  }}
                  placeholder={t('profileEdit.websitePlaceholder')}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Professional Information */}
            {userData?.user_type === "professional" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('profileEdit.professionalInformation')}</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title">{t('profileEdit.professionalTitle')}</Label>
                    <div className="flex items-center space-x-2">
                      {!hideProfessionalTitle ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideProfessionalTitle ? t('profileEdit.visibleToEmployers') : t('profileEdit.private')}
                      </span>
                      <Switch
                        checked={!hideProfessionalTitle}
                        onCheckedChange={(checked) => setHideProfessionalTitle(!checked)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('profileEdit.titlePlaceholder')}
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    {!hideProfessionalTitle
                      ? t('profileEdit.titleVisibleInfo')
                      : t('profileEdit.titlePrivateInfo')
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('profileEdit.skills')}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('profileEdit.addSkillPlaceholder')}
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                    <Button type="button" onClick={addSkill} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('profileEdit.spokenLanguages')}</Label>
                  <LanguageSelector
                    selectedLanguages={spokenLanguages}
                    onChange={setSpokenLanguages}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t('profileEdit.links')}</h4>
                    <div className="flex items-center space-x-2">
                      {!hidePortfolioLinks ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hidePortfolioLinks ? t('profileEdit.visibleToEmployers') : t('profileEdit.private')}
                      </span>
                      <Switch
                        checked={!hidePortfolioLinks}
                        onCheckedChange={(checked) => setHidePortfolioLinks(!checked)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolioUrl">{t('profileEdit.portfolioUrl')}</Label>
                    <Input
                      id="portfolioUrl"
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                          setPortfolioUrl(`https://${value}`)
                        }
                      }}
                      placeholder={t('profileEdit.portfolioPlaceholder')}
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">{t('profileEdit.linkedinUrl')}</Label>
                    <Input
                      id="linkedinUrl"
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                          setLinkedinUrl(`https://${value}`)
                        }
                      }}
                      placeholder={t('profileEdit.linkedinPlaceholder')}
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {!hidePortfolioLinks
                      ? t('profileEdit.linksVisibleInfo')
                      : t('profileEdit.linksPrivateInfo')
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">{t('profileEdit.additionalInformation')}</h4>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="readyToRelocate"
                      checked={readyToRelocate}
                      onChange={(e) => setReadyToRelocate(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="readyToRelocate" className="text-base">
                      {t('profileEdit.readyToRelocate')}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="validDrivingLicense"
                      checked={validDrivingLicense}
                      onChange={(e) => setValidDrivingLicense(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="validDrivingLicense" className="text-base">
                      {t('profileEdit.validDrivingLicense')}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ownTransport"
                      checked={ownTransport}
                      onChange={(e) => setOwnTransport(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="ownTransport" className="text-base">
                      {t('profileEdit.ownTransport')}
                    </Label>
                  </div>


                  <div className="space-y-4">
                    <Label className="text-base font-medium">{t('profileEdit.employmentStatus')}</Label>
                    <div className="space-y-3">
                      <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                        employmentStatus === 'employed' ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          id="employedOpenToOffers"
                          name="employmentStatus"
                          checked={employmentStatus === 'employed'}
                          onChange={(e) => e.target.checked && setEmploymentStatus('employed')}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <div className="flex-1">
                          <Label htmlFor="employedOpenToOffers" className="font-medium cursor-pointer">
                            {t('profileEdit.employedOpenToOffers')}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('profileEdit.employedOpenToOffersDesc')}
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                        employmentStatus === 'unemployed' ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          id="unemployedSeeking"
                          name="employmentStatus"
                          checked={employmentStatus === 'unemployed'}
                          onChange={(e) => e.target.checked && setEmploymentStatus('unemployed')}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <div className="flex-1">
                          <Label htmlFor="unemployedSeeking" className="font-medium cursor-pointer">
                            {t('profileEdit.unemployedSeeking')}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('profileEdit.unemployedSeekingDesc')}
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                        employmentStatus === 'none' ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          id="noEmploymentStatus"
                          name="employmentStatus"
                          checked={employmentStatus === 'none'}
                          onChange={(e) => e.target.checked && setEmploymentStatus('none')}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <div className="flex-1">
                          <Label htmlFor="noEmploymentStatus" className="font-medium cursor-pointer">
                            {t('profileEdit.preferNotToSpecify')}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('profileEdit.preferNotToSpecifyDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" asChild>
                <Link href={dashboardPath}>
                  {t('profileEdit.cancel')}
                </Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('profileEdit.saving') : t('profileEdit.saveChanges')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Account Link */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDeleting}
            >
              {t('profileEdit.permanentlyDeleteAccount')}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('profileEdit.areYouSure')}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
                <div>
                  {t('profileEdit.deleteWarning')}
                </div>
                {userData?.user_type === "professional" && (
                  <>
                    <div className="text-sm font-medium">{t('profileEdit.willDelete')}</div>
                    <ul className="text-sm list-disc pl-4 space-y-1">
                      <li>{t('profileEdit.deleteItems.profile')}</li>
                      <li>{t('profileEdit.deleteItems.applications')}</li>
                      <li>{t('profileEdit.deleteItems.savedJobs')}</li>
                      <li>{t('profileEdit.deleteItems.cv')}</li>
                      <li>{t('profileEdit.deleteItems.records')}</li>
                      <li>{t('profileEdit.deleteItems.files')}</li>
                      <li>{t('profileEdit.deleteItems.account')}</li>
                    </ul>
                  </>
                )}
                <div className="text-sm font-medium text-red-600">
                  {t('profileEdit.signOutWarning')}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('profileEdit.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? t('profileEdit.deleting') : t('profileEdit.yesDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
