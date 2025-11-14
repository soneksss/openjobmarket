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

  const resizeImage = (file: File, maxSize: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = maxSize
          canvas.height = maxSize

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Could not get canvas context"))
            return
          }

          const size = Math.min(img.width, img.height)
          const x = (img.width - size) / 2
          const y = (img.height - size) / 2

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

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.")
      return
    }

    setUploading(true)
    try {
      const resizedFile = await resizeImage(file, 300)
      const fileName = `${userId}/${userId}-${Date.now()}.jpg`

      // Delete old photo if exists
      if (profile.profile_photo_url) {
        const oldFileName = profile.profile_photo_url.split("/").pop()
        if (oldFileName) {
          await supabase.storage.from("profile-photos").remove([`${userId}/${oldFileName}`])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, resizedFile, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        alert("Error uploading photo. Please try again.")
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(fileName)

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from("homeowner_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("id", profile.id)

      if (updateError) {
        console.error("Error updating profile:", updateError)
        alert("Error updating profile. Please try again.")
        return
      }

      setProfile({ ...profile, profile_photo_url: publicUrl })
    } catch (error) {
      console.error("Error:", error)
      alert("Error processing image. Please try again.")
    } finally {
      setUploading(false)
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
        setError("Please fill in your job title and skills to appear on the market")
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
      router.refresh()

      // If successfully enabled market mode, show success and redirect
      if (profile.on_market && setupMarket) {
        setTimeout(() => {
          router.push("/dashboard/homeowner?market_enabled=true")
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
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
