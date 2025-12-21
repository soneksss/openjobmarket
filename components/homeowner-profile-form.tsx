"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/client"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Loader2, ToggleLeft, ToggleRight, Upload } from "lucide-react"
import Link from "next/link"
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
  cv_url?: string
  portfolio_url?: string
  linkedin_url?: string
  available_for_work?: boolean
}

interface HomeownerProfileFormProps {
  profile: HomeownerProfile
  userId: string
}

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
  const [showMarketFields, setShowMarketFields] = useState(initialProfile.on_market || setupMarket)

  useEffect(() => {
    if (setupMarket && !profile.on_market) {
      setShowMarketFields(true)
    }
  }, [setupMarket, profile.on_market])

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
          // Validate image dimensions
          if (img.width === 0 || img.height === 0) {
            console.error("[Homeowner Photo] Invalid dimensions:", img.width, img.height)
            reject(new Error("IMAGE_DIMENSIONS_INVALID: Image has invalid dimensions"))
            return
          }

          // Check if image is too large to process
          if (img.width > 10000 || img.height > 10000) {
            console.error("[Homeowner Photo] Image too large:", img.width, img.height)
            reject(new Error("IMAGE_TOO_LARGE: Image dimensions exceed 10000x10000 pixels"))
            return
          }

          const canvas = document.createElement("canvas")
          console.log("[Homeowner Photo] Canvas created")

          // Create square image for circular photo display
          const size = Math.min(img.width, img.height)
          const cropX = (img.width - size) / 2
          const cropY = (img.height - size) / 2

          canvas.width = maxSize
          canvas.height = maxSize
          console.log("[Homeowner Photo] Target dimensions:", maxSize, "x", maxSize, "(square)")
          console.log("[Homeowner Photo] Cropping from center:", { cropX, cropY, size })

          let blob: Blob | null = null

          // Try using pica for high-quality resizing first
          try {
            console.log("[Homeowner Photo] Starting pica resize...")
            const picaInstance = pica()

            // Create a temporary canvas with the cropped square
            const tempCanvas = document.createElement("canvas")
            tempCanvas.width = size
            tempCanvas.height = size
            const tempCtx = tempCanvas.getContext("2d")
            if (!tempCtx) {
              throw new Error("Failed to get temp canvas context")
            }

            // Draw the cropped square portion
            tempCtx.drawImage(img, cropX, cropY, size, size, 0, 0, size, size)
            console.log("[Homeowner Photo] Cropped source canvas created")

            // Resize to target size
            await picaInstance.resize(tempCanvas, canvas)
            console.log("[Homeowner Photo] Pica resize completed")

            // Convert to WebP for better compression
            console.log("[Homeowner Photo] Converting to WebP...")
            blob = await picaInstance.toBlob(canvas, "image/webp", 0.85)
            console.log("[Homeowner Photo] WebP conversion completed. Blob size:", blob?.size || 0)
          } catch (picaError) {
            console.warn("[Homeowner Photo] Pica failed, falling back to native canvas:", picaError)

            // Fallback to native canvas resizing
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("IMAGE_PROCESSING_FAILED: Failed to get canvas context"))
              return
            }

            // Use native canvas drawing with crop parameters
            ctx.drawImage(img, cropX, cropY, size, size, 0, 0, maxSize, maxSize)
            console.log("[Homeowner Photo] Native canvas resize completed with center crop")

            // Convert to WebP using canvas.toBlob
            blob = await new Promise<Blob | null>((blobResolve) => {
              canvas.toBlob(blobResolve, "image/webp", 0.85)
            })
            console.log("[Homeowner Photo] Native WebP conversion completed. Blob size:", blob?.size || 0)
          }

          if (!blob || blob.size === 0) {
            console.error("[Homeowner Photo] Blob creation failed")
            reject(new Error("IMAGE_CONVERSION_FAILED: Failed to convert image to WebP format"))
            return
          }

          const resizedFile = new File([blob], "profile-photo.webp", { type: "image/webp" })
          console.log("[Homeowner Photo] Resized file created successfully")

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
      console.log("[Homeowner Photo] Object URL created:", objectUrl)
      img.src = objectUrl
    })
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true)
    try {
      console.log("[Homeowner Photo] Starting photo upload for file:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2) + "MB")

      console.log("[Homeowner Photo] About to call resizeImage...")
      // Resize and optimize the image
      const resizedFile = await resizeImage(file, 300)
      console.log("[Homeowner Photo] resizeImage completed successfully")
      console.log("[Homeowner Photo] Image resized:", "New size:", (resizedFile.size / 1024).toFixed(2) + "KB")

      const fileName = `${userId}/profile-photo.webp`

      // Delete old photo if exists
      if (profile.profile_photo_url) {
        try {
          const oldPath = profile.profile_photo_url.split('/').slice(-2).join('/') // Get userId/filename
          console.log("[Homeowner Photo] Attempting to delete old photo:", oldPath)
          await supabase.storage.from("profile-photos").remove([oldPath])
        } catch (deleteError) {
          console.warn("[Homeowner Photo] Could not delete old photo:", deleteError)
          // Continue with upload even if deletion fails
        }
      }

      // Upload resized photo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, resizedFile, {
          cacheControl: "3600",
          upsert: true, // Allow overwriting if file exists
        })

      if (uploadError) {
        console.error("[Homeowner Photo] Upload error:", uploadError)

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
            description: `Error uploading photo: ${uploadError.message}`,
            variant: "destructive",
            duration: 5000,
          })
        }
        return
      }

      console.log("[Homeowner Photo] Upload successful:", uploadData)

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(fileName)

      console.log("[Homeowner Photo] Public URL generated:", publicUrl)

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from("homeowner_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("id", profile.id)

      if (updateError) {
        console.error("[Homeowner Photo] Error updating profile with photo URL:", updateError)
        toast({
          title: "Update Failed",
          description: "Photo uploaded but failed to update profile. Please refresh the page.",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      console.log("[Homeowner Photo] Photo upload completed successfully!")

      // Show success toast
      toast({
        title: "✓ Photo Updated Successfully",
        description: "Your profile photo has been updated. The page will reload to show the changes.",
        duration: 2000,
      })

      // Update local state and refresh
      setProfile({ ...profile, profile_photo_url: publicUrl })

      // Refresh the page to show the new photo (after a short delay for the toast)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("[Homeowner Photo] Unexpected error:", error)

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
          description: "An unexpected error occurred while uploading your photo. Please try again with a different image file.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } finally {
      setUploading(false)
      // Reset the file input so the same file can be selected again
      const fileInput = document.querySelector<HTMLInputElement>('#photo-upload')
      if (fileInput) fileInput.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    // Validate professional fields if on_market is true
    if (profile.on_market) {
      if (!profile.title || !profile.skills || profile.skills.length === 0) {
        const errorMsg = "Please fill in your job title and skills to appear on the market"
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
      const { error: updateError } = await supabase
        .from("homeowner_profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          location: profile.location,
          full_address: profile.full_address,
          bio: profile.bio,
          on_market: profile.on_market,
          title: profile.title,
          skills: profile.skills,
          experience_level: profile.experience_level,
          salary_min: profile.salary_min,
          salary_max: profile.salary_max,
          cv_url: profile.cv_url,
          portfolio_url: profile.portfolio_url,
          linkedin_url: profile.linkedin_url,
          available_for_work: profile.available_for_work
        })
        .eq("id", profile.id)

      if (updateError) throw updateError

      setSuccess(true)

      toast({
        title: "✓ Profile Updated Successfully",
        description: "Your profile information has been saved.",
        duration: 3000,
      })

      router.refresh()

      // If successfully enabled market mode, show success and redirect
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

  const handleSkillsChange = (value: string) => {
    // Convert comma-separated string to array
    const skillsArray = value.split(",").map(s => s.trim()).filter(s => s.length > 0)
    setProfile({ ...profile, skills: skillsArray })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard/homeowner">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>

            <div className="space-y-4">
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
                      {profile.first_name[0]}{profile.last_name[0]}
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
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+44 7700 900000"
                />
              </div>

              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  required
                  placeholder="London, UK"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
            </div>
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

          {/* Professional Fields (only shown when on_market is true) */}
          {showMarketFields && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Professional Information
                <span className="text-sm font-normal text-gray-500 ml-2">(Required for market visibility)</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={profile.title || ""}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    placeholder="e.g., Plumber, Electrician, Carpenter"
                    required={showMarketFields}
                  />
                </div>

                <div>
                  <Label htmlFor="skills">Skills * (comma-separated)</Label>
                  <Input
                    id="skills"
                    value={profile.skills?.join(", ") || ""}
                    onChange={(e) => handleSkillsChange(e.target.value)}
                    placeholder="e.g., Plumbing, Heating, Boiler Installation"
                    required={showMarketFields}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Separate skills with commas
                  </p>
                </div>

                <div>
                  <Label htmlFor="experience_level">Experience Level</Label>
                  <select
                    id="experience_level"
                    value={profile.experience_level || ""}
                    onChange={(e) => setProfile({ ...profile, experience_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select experience level</option>
                    <option value="entry">Entry Level (0-2 years)</option>
                    <option value="intermediate">Intermediate (2-5 years)</option>
                    <option value="senior">Senior (5-10 years)</option>
                    <option value="expert">Expert (10+ years)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salary_min">Minimum Hourly Rate (£)</Label>
                    <Input
                      id="salary_min"
                      type="number"
                      value={profile.salary_min || ""}
                      onChange={(e) => setProfile({ ...profile, salary_min: parseFloat(e.target.value) })}
                      placeholder="15"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salary_max">Maximum Hourly Rate (£)</Label>
                    <Input
                      id="salary_max"
                      type="number"
                      value={profile.salary_max || ""}
                      onChange={(e) => setProfile({ ...profile, salary_max: parseFloat(e.target.value) })}
                      placeholder="50"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
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
                  />
                </div>

                <div>
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
                  />
                </div>

                <div>
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
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="available_for_work"
                    type="checkbox"
                    checked={profile.available_for_work || false}
                    onChange={(e) => setProfile({ ...profile, available_for_work: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="available_for_work" className="cursor-pointer">
                    I am currently available for work
                  </Label>
                </div>
              </div>
            </Card>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              ✅ Profile updated successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
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
