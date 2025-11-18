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
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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
  const [isSelfEmployed, setIsSelfEmployed] = useState(professionalProfile?.is_self_employed || false)

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

      setProfilePhotoUrl(publicUrl)
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
          is_self_employed: isSelfEmployed,
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
      setTimeout(() => setSaveSuccess(false), 3000) // Hide after 3 seconds

      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        if (userData?.user_type === "professional") {
          router.push("/dashboard/professional")
        } else {
          router.push("/dashboard/company")
        }
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
        router.push('/')
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
            <p className="text-green-800 font-medium">Profile updated successfully!</p>
            <p className="text-green-700 text-sm">You will be redirected to your dashboard shortly.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={userData?.user_type === "professional" ? "/dashboard/professional" : "/dashboard/company"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your profile information and photo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Section */}
            <div className="space-y-4">
              <Label>Profile Photo</Label>
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
                      <span>{uploading ? "Uploading..." : "Upload Photo"}</span>
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
                  <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 5MB.</p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              {userData?.user_type === "professional" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="nickname">Nickname (Public Display Name)</Label>
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Always visible</span>
                      </div>
                    </div>
                    <Input
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="How you'd like to be known publicly"
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                    <p className="text-sm text-muted-foreground">
                      This is what employers will see instead of your real name
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Real Name (First & Last)</Label>
                      <div className="flex items-center space-x-2">
                        {!hidePersonalName ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {!hidePersonalName ? "Visible to employers" : "Private"}
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
                        <Label htmlFor="firstName">First Name</Label>
                        
<Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required  className="border-2 border-gray-300 focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        
<Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required  className="border-2 border-gray-300 focus:border-blue-500" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {!hidePersonalName
                        ? "Your real name will be visible to employers when you apply to jobs."
                        : "Your real name will remain private. Only your nickname will be shown to employers."
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  
<Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}  className="border-2 border-gray-300 focus:border-blue-500" />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="flex items-center">
                    Email
                  </Label>
                  {userData?.user_type === "professional" && (
                    <div className="flex items-center space-x-2">
                      {!hideEmail ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideEmail ? "Visible to employers" : "Private"}
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
                    ? "Your email will be visible to employers when you apply to jobs or message them."
                    : "Your email will remain private. You can choose to share it when applying to specific jobs."
                  }
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone" className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone Number
                  </Label>
                  <div className="flex items-center space-x-2">
                    {phoneVisible ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {phoneVisible ? "Visible to employers" : "Private"}
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
                  placeholder="+1 (555) 123-4567"
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  {phoneVisible
                    ? "Your phone number will be visible to employers when you apply to jobs or message them."
                    : "Your phone number will remain private. You can choose to share it when applying to specific jobs."
                  }
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="location">Location</Label>
                  {userData?.user_type === "professional" && (
                    <div className="flex items-center space-x-2">
                      {!hideAddressDetails ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideAddressDetails ? "Visible to employers" : "City only"}
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
                  placeholder="City, State"
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                {userData?.user_type === "professional" && (
                  <p className="text-xs text-muted-foreground">
                    {!hideAddressDetails
                      ? "Your full address details will be visible to employers."
                      : "Only your city will be shown to employers, specific address details remain private."
                    }
                  </p>
                )}
              </div>

              {/* Map Location Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Map Location
                </h4>
                <p className="text-sm text-muted-foreground">
                  Set your precise location on the map for better job matching. This will be used instead of the text location above.
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
                  <Label htmlFor="bio">Bio</Label>
                  {userData?.user_type === "professional" && (
                    <div className="flex items-center space-x-2">
                      {!hideBio ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideBio ? "Visible to employers" : "Private"}
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
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
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
                  placeholder="https://yourwebsite.com"
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Professional Information */}
            {userData?.user_type === "professional" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Professional Information</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title">Professional Title</Label>
                    <div className="flex items-center space-x-2">
                      {!hideProfessionalTitle ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hideProfessionalTitle ? "Visible to employers" : "Private"}
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
                    placeholder="e.g. Senior Software Engineer"
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    {!hideProfessionalTitle
                      ? "Your professional title will be visible to employers."
                      : "Your professional title will remain private."
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
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
                  <Label>Spoken Languages</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a language"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                    <Button type="button" onClick={addLanguage} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {spokenLanguages.map((language) => (
                      <Badge key={language} variant="secondary" className="flex items-center gap-1">
                        {language}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeLanguage(language)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Links</h4>
                    <div className="flex items-center space-x-2">
                      {!hidePortfolioLinks ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!hidePortfolioLinks ? "Visible to employers" : "Private"}
                      </span>
                      <Switch
                        checked={!hidePortfolioLinks}
                        onCheckedChange={(checked) => setHidePortfolioLinks(!checked)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolioUrl">Portfolio URL</Label>
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
                      placeholder="https://yourportfolio.com"
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
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
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {!hidePortfolioLinks
                      ? "Your portfolio and LinkedIn links will be visible to employers."
                      : "Your portfolio and LinkedIn links will remain private."
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Additional Information</h4>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isSelfEmployed"
                      checked={isSelfEmployed}
                      onChange={(e) => setIsSelfEmployed(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="isSelfEmployed" className="text-base">
                      I am self-employed (available for contract work)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="readyToRelocate"
                      checked={readyToRelocate}
                      onChange={(e) => setReadyToRelocate(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="readyToRelocate" className="text-base">
                      Ready to relocate
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
                      Valid driving license
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
                      Own transport
                    </Label>
                  </div>


                  <div className="space-y-4">
                    <Label className="text-base font-medium">Employment Status</Label>
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
                            Currently employed but open to job offers
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            You have a job but are open to new opportunities
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
                            Currently unemployed and looking for a job
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            You are actively seeking employment
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
                            Prefer not to specify
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Keep employment status private
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
                <Link href={userData?.user_type === "professional" ? "/dashboard/professional" : "/dashboard/company"}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone - Delete Account */}
      <Card className="border-red-200">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center text-red-600 text-base md:text-lg">
            <Trash2 className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full text-xs md:text-sm"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting Account..." : "Delete Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </div>
                  {userData?.user_type === "professional" && (
                    <>
                      <div className="text-sm font-medium">This will delete:</div>
                      <ul className="text-sm list-disc pl-4 space-y-1">
                        <li>Your professional profile and all personal information</li>
                        <li>All job applications</li>
                        <li>All saved jobs</li>
                        <li>Your CV and portfolio files</li>
                        <li>Your skills, experience, and education records</li>
                        <li>Your profile photos and uploaded documents</li>
                        <li>Your entire user account</li>
                      </ul>
                    </>
                  )}
                  <div className="text-sm font-medium text-red-600">
                    You will be immediately signed out and redirected to the homepage.
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
