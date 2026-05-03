"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Plus, ArrowLeft, Eye, EyeOff, Phone, CheckCircle, MapPin, ToggleLeft, ToggleRight, Loader2, FileText } from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"
import { LocationPicker } from "@/components/ui/location-picker"
import { useRouter, useSearchParams } from "next/navigation"
import pica from "pica"
import { useToast } from "@/hooks/use-toast"

interface HomeownerProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone?: string
  location: string
  full_address?: string
  latitude?: number
  longitude?: number
  profile_photo_url?: string
  bio?: string
  on_market: boolean
  title?: string
  skills?: string[]
  experience_level?: string
  salary_min?: number
  salary_max?: number
  salary_type?: string
  cv_url?: string
  portfolio_url?: string
  linkedin_url?: string
  available_for_work?: boolean
  nickname?: string
  spoken_languages?: string[]
  ready_to_relocate?: boolean
  employed_open_to_offers?: boolean
  unemployed_seeking?: boolean
  is_self_employed?: boolean
  valid_driving_license?: boolean
  own_transport?: boolean
  // Privacy controls
  hide_personal_name?: boolean
  hide_address_details?: boolean
  hide_bio?: boolean
  hide_professional_title?: boolean
  hide_portfolio_links?: boolean
  hide_email?: boolean
  phone_visible?: boolean
}

interface HomeownerProfileFormProps {
  profile: HomeownerProfile
  userId: string
}

// Common job titles for suggestions
const JOB_TITLE_SUGGESTIONS = [
  "Plumber", "Electrician", "Carpenter", "Painter", "Roofer",
  "Landscaper", "HVAC Technician", "General Contractor", "Mason",
  "Tiler", "Plasterer", "Cleaner", "Handyman", "Builder",
  "Decorator", "Gardener"
]

// Common skills for suggestions
const SKILL_SUGGESTIONS = [
  "Plumbing", "Electrical Work", "Carpentry", "Painting", "Roofing",
  "Landscaping", "HVAC", "Masonry", "Tiling", "Plastering",
  "Cleaning", "General Repairs", "Building", "Decorating", "Gardening"
]

export function HomeownerProfileForm({ profile: initialProfile, userId }: HomeownerProfileFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setupMarket = searchParams.get("setup_market") === "true"
  const supabase = createClient()
  const { toast } = useToast()

  const [profile, setProfile] = useState<HomeownerProfile>(initialProfile)
  const [isLoading, setIsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState(false)
  const [showMarketFields, setShowMarketFields] = useState(initialProfile.on_market || setupMarket)

  // Professional fields
  const [newSkill, setNewSkill] = useState("")
  const [newLanguage, setNewLanguage] = useState("")
  const [skills, setSkills] = useState<string[]>(initialProfile.skills || [])
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(initialProfile.spoken_languages || [])

  // Title suggestions
  const [titleInput, setTitleInput] = useState(initialProfile.title || "")
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [filteredTitleSuggestions, setFilteredTitleSuggestions] = useState<string[]>([])

  // Skill suggestions
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
  const [filteredSkillSuggestions, setFilteredSkillSuggestions] = useState<string[]>([])

  // Employment status
  const [employmentStatus, setEmploymentStatus] = useState<'none' | 'employed' | 'unemployed'>(
    initialProfile.employed_open_to_offers ? 'employed' :
    initialProfile.unemployed_seeking ? 'unemployed' : 'none'
  )

  useEffect(() => {
    if (setupMarket && !profile.on_market) {
      setShowMarketFields(true)
    }
  }, [setupMarket, profile.on_market])

  // Filter title suggestions
  useEffect(() => {
    if (titleInput) {
      const filtered = JOB_TITLE_SUGGESTIONS.filter(title =>
        title.toLowerCase().includes(titleInput.toLowerCase())
      )
      setFilteredTitleSuggestions(filtered)
    } else {
      setFilteredTitleSuggestions([])
    }
  }, [titleInput])

  // Filter skill suggestions
  useEffect(() => {
    if (newSkill) {
      const filtered = SKILL_SUGGESTIONS.filter(skill =>
        skill.toLowerCase().includes(newSkill.toLowerCase()) &&
        !skills.includes(skill)
      )
      setFilteredSkillSuggestions(filtered)
    } else {
      setFilteredSkillSuggestions([])
    }
  }, [newSkill, skills])

  const handleToggleMarket = () => {
    setShowMarketFields(!showMarketFields)
    setProfile({ ...profile, on_market: !showMarketFields })
  }

  const resizeImage = async (file: File, maxSize: number = 300): Promise<File> => {
    console.log("[Homeowner Photo] Starting resize for:", file.name, "Type:", file.type)
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = async () => {
        console.log("[Homeowner Photo] Image loaded successfully. Dimensions:", img.width, "x", img.height)
        try {
          if (img.width === 0 || img.height === 0) {
            console.error("[Homeowner Photo] Invalid dimensions:", img.width, img.height)
            reject(new Error("IMAGE_DIMENSIONS_INVALID: Image has invalid dimensions"))
            return
          }

          if (img.width > 10000 || img.height > 10000) {
            console.error("[Homeowner Photo] Image too large:", img.width, img.height)
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
            blob = await picaInstance.toBlob(canvas, "image/webp", 0.85)
          } catch (picaError) {
            console.warn("[Homeowner Photo] Pica failed, falling back to native canvas:", picaError)
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("IMAGE_PROCESSING_FAILED: Failed to get canvas context"))
              return
            }

            ctx.drawImage(img, cropX, cropY, size, size, 0, 0, maxSize, maxSize)
            blob = await new Promise<Blob | null>((blobResolve) => {
              canvas.toBlob(blobResolve, "image/webp", 0.85)
            })
          }

          if (!blob || blob.size === 0) {
            console.error("[Homeowner Photo] Blob creation failed")
            reject(new Error("IMAGE_CONVERSION_FAILED: Failed to convert image to WebP format"))
            return
          }

          const resizedFile = new File([blob], "profile-photo.webp", { type: "image/webp" })
          URL.revokeObjectURL(img.src)
          resolve(resizedFile)
        } catch (error) {
          console.error("[Homeowner Photo] Error during processing:", error)
          URL.revokeObjectURL(img.src)
          if (error instanceof Error) {
            reject(error)
          } else {
            reject(new Error("IMAGE_PROCESSING_FAILED: Unknown error during image processing"))
          }
        }
      }
      img.onerror = (event) => {
        console.error("[Homeowner Photo] Image load failed:", event)
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
        description: "Your browser does not support the required image processing features. Please use a modern browser like Chrome, Firefox, Edge, or Safari.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a valid image file. Supported formats: JPEG, PNG, GIF, WebP.`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `The file size is ${(file.size / 1024 / 1024).toFixed(2)}MB, which exceeds the 10MB limit.`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    setUploading(true)
    try {
      const resizedFile = await resizeImage(file, 300)
      const fileName = `${userId}/profile-photo.webp`

      if (profile.profile_photo_url) {
        try {
          const oldPath = profile.profile_photo_url.split('/').slice(-2).join('/')
          await supabase.storage.from("profile-photos").remove([oldPath])
        } catch (deleteError) {
          console.warn("[Homeowner Photo] Could not delete old photo:", deleteError)
        }
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, resizedFile, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        toast({
          title: "Upload Failed",
          description: `Error uploading photo: ${uploadError.message}`,
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from("homeowner_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("id", profile.id)

      if (updateError) {
        toast({
          title: "Update Failed",
          description: "Photo uploaded but failed to update profile. Please refresh the page.",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      toast({
        title: "✓ Photo Updated Successfully",
        description: "Your profile photo has been updated.",
        duration: 2000,
      })

      setProfile({ ...profile, profile_photo_url: publicUrl })
      setPhotoUploaded(true)

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("[Homeowner Photo] Unexpected error:", error)

      if (error instanceof Error) {
        const errorMessage = error.message

        if (errorMessage.includes('IMAGE_LOAD_FAILED')) {
          toast({
            title: "Failed to Load Image",
            description: "The image file could not be loaded. Try using a different image file.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Upload Error",
            description: `${errorMessage}`,
            variant: "destructive",
            duration: 5000,
          })
        }
      }
    } finally {
      setUploading(false)
      const fileInput = document.querySelector<HTMLInputElement>('#photo-upload')
      if (fileInput) fileInput.value = ''
    }
  }

  const addSkill = (skillToAdd?: string) => {
    const skill = skillToAdd || newSkill.trim()
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill])
      setNewSkill("")
      setShowSkillSuggestions(false)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (profile.on_market) {
      if (!titleInput || skills.length === 0) {
        const errorMsg = "Please fill in your job title and at least one skill to appear on the market"
        setError(errorMsg)
        toast({
          title: "Validation Error",
          description: errorMsg,
          variant: "destructive",
          duration: 5000,
        })
        setIsLoading(false)
        return
      }
    }

    try {
      const updateData: any = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        location: profile.location,
        full_address: profile.full_address,
        bio: profile.bio,
        on_market: profile.on_market,
        latitude: profile.latitude,
        longitude: profile.longitude,
        phone_visible: profile.phone_visible
      }

      // Add professional fields when on_market is true
      if (profile.on_market) {
        updateData.title = titleInput
        updateData.skills = skills
        updateData.experience_level = profile.experience_level
        updateData.salary_min = profile.salary_min
        updateData.salary_max = profile.salary_max
        updateData.salary_type = profile.salary_type || 'hourly'
        updateData.cv_url = profile.cv_url
        updateData.portfolio_url = profile.portfolio_url
        updateData.linkedin_url = profile.linkedin_url
        updateData.available_for_work = profile.available_for_work
        updateData.nickname = profile.nickname
        updateData.spoken_languages = spokenLanguages
        updateData.ready_to_relocate = profile.ready_to_relocate
        updateData.employed_open_to_offers = employmentStatus === 'employed'
        updateData.unemployed_seeking = employmentStatus === 'unemployed'
        updateData.is_self_employed = profile.is_self_employed
        updateData.valid_driving_license = profile.valid_driving_license
        updateData.own_transport = profile.own_transport
        // Privacy controls
        updateData.hide_personal_name = profile.hide_personal_name
        updateData.hide_address_details = profile.hide_address_details
        updateData.hide_bio = profile.hide_bio
        updateData.hide_professional_title = profile.hide_professional_title
        updateData.hide_portfolio_links = profile.hide_portfolio_links
        updateData.hide_email = profile.hide_email
      }

      const { error: updateError } = await supabase
        .from("homeowner_profiles")
        .update(updateData)
        .eq("id", profile.id)

      if (updateError) throw updateError

      setSuccess(true)

      toast({
        title: "✓ Profile Updated Successfully",
        description: "Your profile information has been saved.",
        duration: 3000,
      })

      router.refresh()

      if (profile.on_market && setupMarket) {
        setTimeout(() => {
          router.push("/dashboard/homeowner?market_enabled=true")
        }, 1500)
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to update profile"
      setError(errorMsg)
      toast({
        title: "Update Failed",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = () => {
    if (profile.nickname) {
      return profile.nickname.slice(0, 2).toUpperCase()
    }
    return `${profile.first_name[0] || ""}${profile.last_name[0] || ""}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard/homeowner">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="container mx-auto px-4 pt-4 max-w-4xl">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-green-800 font-medium">Profile updated successfully!</p>
              <p className="text-green-700 text-sm">Your changes have been saved.</p>
            </div>
          </div>
        </div>
      )}

      {/* Photo Uploaded Reminder */}
      {photoUploaded && (
        <div className="container mx-auto px-4 pt-4 max-w-4xl">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
            <Upload className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-blue-800 font-medium">Photo uploaded successfully!</p>
              <p className="text-blue-700 text-sm">Don't forget to click "Save Changes" to save all your updates.</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Photo */}
              <div className="mb-6">
                <Label>Profile Photo</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Avatar className="h-20 w-20 rounded-full">
                    <AvatarImage
                      src={profile.profile_photo_url || "/placeholder.svg"}
                      className="object-cover w-full h-full rounded-full"
                    />
                    <AvatarFallback className="text-lg rounded-full">
                      {getInitials()}
                    </AvatarFallback>
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
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 10MB.</p>
                  </div>
                </div>
              </div>

              {/* Nickname - Only shown when on market */}
              {showMarketFields && (
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
                    value={profile.nickname || ""}
                    onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                    placeholder="How you'd like to be known publicly"
                    className="border-2 border-gray-300 focus:border-blue-500"
                  />
                  <p className="text-sm text-muted-foreground">
                    This is what employers will see instead of your real name
                  </p>
                </div>
              )}

              {/* Real Name */}
              <div className="space-y-2">
                {showMarketFields && (
                  <div className="flex items-center justify-between">
                    <Label>Real Name (First & Last)</Label>
                    <div className="flex items-center space-x-2">
                      {!profile.hide_personal_name ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!profile.hide_personal_name ? "Visible to employers" : "Private"}
                      </span>
                      <Switch
                        checked={!profile.hide_personal_name}
                        onCheckedChange={(checked) => setProfile({ ...profile, hide_personal_name: !checked })}
                        className="scale-75"
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      required
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      required
                      className="border-2 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                </div>
                {showMarketFields && (
                  <p className="text-xs text-muted-foreground">
                    {!profile.hide_personal_name
                      ? "Your real name will be visible to employers when you apply to jobs."
                      : "Your real name will remain private. Only your nickname will be shown to employers."
                    }
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone" className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone Number
                  </Label>
                  {showMarketFields && (
                    <div className="flex items-center space-x-2">
                      {profile.phone_visible ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {profile.phone_visible ? "Visible to employers" : "Private"}
                      </span>
                      <Switch
                        checked={profile.phone_visible || false}
                        onCheckedChange={(checked) => setProfile({ ...profile, phone_visible: checked })}
                        className="scale-75"
                      />
                    </div>
                  )}
                </div>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+44 7700 900000"
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                {showMarketFields && (
                  <p className="text-xs text-muted-foreground">
                    {profile.phone_visible
                      ? "Your phone number will be visible to employers when you apply to jobs."
                      : "Your phone number will remain private. You can choose to share it when applying to specific jobs."
                    }
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="location">Location *</Label>
                  {showMarketFields && (
                    <div className="flex items-center space-x-2">
                      {!profile.hide_address_details ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!profile.hide_address_details ? "Visible to employers" : "City only"}
                      </span>
                      <Switch
                        checked={!profile.hide_address_details}
                        onCheckedChange={(checked) => setProfile({ ...profile, hide_address_details: !checked })}
                        className="scale-75"
                      />
                    </div>
                  )}
                </div>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  required
                  placeholder="London, UK"
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                {showMarketFields && (
                  <p className="text-xs text-muted-foreground">
                    {!profile.hide_address_details
                      ? "Your full address details will be visible to employers."
                      : "Only your city will be shown to employers, specific address details remain private."
                    }
                  </p>
                )}
              </div>

              {/* Map Location - Only shown when on market */}
              {showMarketFields && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Map Location
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Set your precise location on the map for better job matching. This will be used instead of the text location above.
                  </p>
                  <LocationPicker
                    latitude={profile.latitude || undefined}
                    longitude={profile.longitude || undefined}
                    onLocationSelect={(lat, lng) => {
                      setProfile({ ...profile, latitude: lat, longitude: lng })
                    }}
                    onLocationClear={() => {
                      setProfile({ ...profile, latitude: undefined, longitude: undefined })
                    }}
                  />
                </div>
              )}

              {/* Bio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">Bio</Label>
                  {showMarketFields && (
                    <div className="flex items-center space-x-2">
                      {!profile.hide_bio ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {!profile.hide_bio ? "Visible to employers" : "Private"}
                      </span>
                      <Switch
                        checked={!profile.hide_bio}
                        onCheckedChange={(checked) => setProfile({ ...profile, hide_bio: !checked })}
                        className="scale-75"
                      />
                    </div>
                  )}
                </div>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Put Me on the Market Toggle */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  {showMarketFields ? (
                    <ToggleRight className="w-6 h-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                  Put Me on the Market
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {showMarketFields
                    ? "Complete your professional profile below to appear on the map and receive job offers"
                    : "Turn this on to appear as a professional and receive job offers from employers"}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleToggleMarket}
                className={showMarketFields ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {showMarketFields ? "Turn Off" : "Turn On"}
              </Button>
            </div>

            {setupMarket && !profile.on_market && showMarketFields && (
              <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-3 rounded-lg text-sm">
                ℹ️ Complete the professional fields below and save to activate your market presence
              </div>
            )}
          </Card>

          {/* Professional Fields - Only shown when on_market is true */}
          {showMarketFields && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                  <CardDescription>Required for market visibility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Professional Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="title">Professional Title *</Label>
                      <div className="flex items-center space-x-2">
                        {!profile.hide_professional_title ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {!profile.hide_professional_title ? "Visible to employers" : "Private"}
                        </span>
                        <Switch
                          checked={!profile.hide_professional_title}
                          onCheckedChange={(checked) => setProfile({ ...profile, hide_professional_title: !checked })}
                          className="scale-75"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        id="title"
                        value={titleInput}
                        onChange={(e) => {
                          setTitleInput(e.target.value)
                          setShowTitleSuggestions(true)
                        }}
                        onFocus={() => setShowTitleSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowTitleSuggestions(false), 200)
                        }}
                        placeholder="e.g., Plumber, Electrician, Carpenter"
                        required={showMarketFields}
                        className="border-2 border-gray-300 focus:border-blue-500"
                      />
                      {showTitleSuggestions && filteredTitleSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredTitleSuggestions.map((suggestion) => (
                            <div
                              key={suggestion}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                setTitleInput(suggestion)
                                setShowTitleSuggestions(false)
                              }}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {!profile.hide_professional_title
                        ? "Your professional title will be visible to employers."
                        : "Your professional title will remain private."
                      }
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <Label>Skills *</Label>
                    <div className="relative">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a skill"
                          value={newSkill}
                          onChange={(e) => {
                            setNewSkill(e.target.value)
                            setShowSkillSuggestions(true)
                          }}
                          onFocus={() => setShowSkillSuggestions(true)}
                          onBlur={() => {
                            setTimeout(() => setShowSkillSuggestions(false), 200)
                          }}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                          className="border-2 border-gray-300 focus:border-blue-500"
                        />
                        <Button type="button" onClick={() => addSkill()} size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {showSkillSuggestions && filteredSkillSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredSkillSuggestions.map((suggestion) => (
                            <div
                              key={suggestion}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                addSkill(suggestion)
                              }}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Type and press Enter or click + to add skills. Suggestions will appear as you type.
                    </p>
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-2">
                    <Label htmlFor="experience_level">Experience Level</Label>
                    <Select
                      value={profile.experience_level || ""}
                      onValueChange={(value) => setProfile({ ...profile, experience_level: value })}
                    >
                      <SelectTrigger className="border-2 border-gray-300">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                        <SelectItem value="senior">Senior (5-10 years)</SelectItem>
                        <SelectItem value="expert">Expert (10+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Salary */}
                  <div className="space-y-4">
                    <Label>Salary Expectations</Label>
                    <div className="space-y-2">
                      <Label htmlFor="salary_type">Salary Type</Label>
                      <Select
                        value={profile.salary_type || "hourly"}
                        onValueChange={(value) => setProfile({ ...profile, salary_type: value })}
                      >
                        <SelectTrigger className="border-2 border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly Rate</SelectItem>
                          <SelectItem value="daily">Daily Rate</SelectItem>
                          <SelectItem value="monthly">Monthly Salary</SelectItem>
                          <SelectItem value="annual">Annual Salary</SelectItem>
                          <SelectItem value="contract">Contract (Project-based)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="salary_min">Minimum Rate (£)</Label>
                        <Input
                          id="salary_min"
                          type="number"
                          value={profile.salary_min || ""}
                          onChange={(e) => setProfile({ ...profile, salary_min: parseFloat(e.target.value) || undefined })}
                          placeholder="15"
                          min="0"
                          step="0.01"
                          className="border-2 border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salary_max">Maximum Rate (£)</Label>
                        <Input
                          id="salary_max"
                          type="number"
                          value={profile.salary_max || ""}
                          onChange={(e) => setProfile({ ...profile, salary_max: parseFloat(e.target.value) || undefined })}
                          placeholder="50"
                          min="0"
                          step="0.01"
                          className="border-2 border-gray-300 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Spoken Languages */}
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

                  {/* Links */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Links</h4>
                      <div className="flex items-center space-x-2">
                        {!profile.hide_portfolio_links ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {!profile.hide_portfolio_links ? "Visible to employers" : "Private"}
                        </span>
                        <Switch
                          checked={!profile.hide_portfolio_links}
                          onCheckedChange={(checked) => setProfile({ ...profile, hide_portfolio_links: !checked })}
                          className="scale-75"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cv_url">CV/Resume URL</Label>
                      <Input
                        id="cv_url"
                        type="url"
                        value={profile.cv_url || ""}
                        onChange={(e) => setProfile({ ...profile, cv_url: e.target.value })}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                            setProfile({ ...profile, cv_url: `https://${value}` })
                          }
                        }}
                        placeholder="https://example.com/my-cv.pdf"
                        className="border-2 border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolio_url">Portfolio URL</Label>
                      <Input
                        id="portfolio_url"
                        type="url"
                        value={profile.portfolio_url || ""}
                        onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                            setProfile({ ...profile, portfolio_url: `https://${value}` })
                          }
                        }}
                        placeholder="https://example.com/portfolio"
                        className="border-2 border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                      <Input
                        id="linkedin_url"
                        type="url"
                        value={profile.linkedin_url || ""}
                        onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                            setProfile({ ...profile, linkedin_url: `https://${value}` })
                          }
                        }}
                        placeholder="https://linkedin.com/in/yourprofile"
                        className="border-2 border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {!profile.hide_portfolio_links
                        ? "Your CV and portfolio links will be visible to employers."
                        : "Your CV and portfolio links will remain private."
                      }
                    </p>
                  </div>

                  {/* CV Builder Button */}
                  <div className="pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link href="/dashboard/homeowner/cv-builder">
                        <FileText className="h-4 w-4 mr-2" />
                        Build Your CV
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Create a professional CV to share with employers
                    </p>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Additional Information</h4>

                    <div className="flex items-center space-x-2">
                      <input
                        id="is_self_employed"
                        type="checkbox"
                        checked={profile.is_self_employed || false}
                        onChange={(e) => setProfile({ ...profile, is_self_employed: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor="is_self_employed" className="cursor-pointer text-base">
                        I am self-employed (available for contract work)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="ready_to_relocate"
                        type="checkbox"
                        checked={profile.ready_to_relocate || false}
                        onChange={(e) => setProfile({ ...profile, ready_to_relocate: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor="ready_to_relocate" className="cursor-pointer text-base">
                        Ready to relocate
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="valid_driving_license"
                        type="checkbox"
                        checked={profile.valid_driving_license || false}
                        onChange={(e) => setProfile({ ...profile, valid_driving_license: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor="valid_driving_license" className="cursor-pointer text-base">
                        Valid driving license
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="own_transport"
                        type="checkbox"
                        checked={profile.own_transport || false}
                        onChange={(e) => setProfile({ ...profile, own_transport: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor="own_transport" className="cursor-pointer text-base">
                        Own transport
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="available_for_work"
                        type="checkbox"
                        checked={profile.available_for_work || false}
                        onChange={(e) => setProfile({ ...profile, available_for_work: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor="available_for_work" className="cursor-pointer text-base">
                        I am currently available for work
                      </Label>
                    </div>
                  </div>

                  {/* Employment Status */}
                  <div className="space-y-4 pt-4 border-t">
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
                </CardContent>
              </Card>
            </>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pb-4 md:pb-0">
            <Link href="/dashboard/homeowner">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
