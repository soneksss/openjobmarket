"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { Loader2, Save, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import pica from "pica"

interface HomeownerProfileEditFormProps {
  userId: string
  profile: any
}

export function HomeownerProfileEditForm({ userId, profile }: HomeownerProfileEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState<string>(profile.profile_photo_url || "")
  const [photoError, setPhotoError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: profile.first_name || "",
    lastName: profile.last_name || "",
    phone: profile.phone || "",
    location: profile.location || "",
    bio: profile.bio || "",
  })

  // ── Initials for avatar fallback ──────────────────────────────────────────
  const initials = `${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`.toUpperCase() || "HO"

  // ── Image resize helper (same pattern as company logo) ────────────────────
  const resizeImage = async (file: File, maxSize: number = 800): Promise<File> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error("Image processing timeout")), 15_000)

      const img = new Image()

      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas")
          let { width, height } = img
          if (width > height) {
            if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize }
          } else {
            if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize }
          }
          canvas.width = width
          canvas.height = height

          let blob: Blob | null = null
          try {
            const picaInstance = pica()
            await picaInstance.resize(img, canvas)
            blob = await picaInstance.toBlob(canvas, "image/webp", 0.85)
          } catch {
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Could not get canvas context")
            ctx.drawImage(img, 0, 0, width, height)
            blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85))
            if (!blob) throw new Error("Canvas toBlob returned null")
          }

          const ext = blob.type === "image/webp" ? "webp" : "jpg"
          URL.revokeObjectURL(img.src)
          clearTimeout(timeoutId)
          resolve(new File([blob], `avatar.${ext}`, { type: blob.type }))
        } catch (err) {
          clearTimeout(timeoutId)
          URL.revokeObjectURL(img.src)
          reject(err)
        }
      }

      img.onerror = () => { clearTimeout(timeoutId); reject(new Error("Failed to load image")) }
      img.src = URL.createObjectURL(file)
    })
  }

  // ── Photo upload handler ──────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, GIF or WebP image.", variant: "destructive" })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 10MB.", variant: "destructive" })
      return
    }

    setUploading(true)
    setUploadStatus(null)

    try {
      let fileToUpload = file
      let ext = file.name.split(".").pop()?.toLowerCase() || "jpg"

      if (file.size > 300 * 1024) {
        setUploadStatus("Optimizing image...")
        try {
          fileToUpload = await resizeImage(file, 800)
          ext = fileToUpload.name.split(".").pop() || "webp"
        } catch {
          // fall through with original
        }
      }

      setUploadStatus("Uploading...")

      const fileName = `${userId}/avatar.${ext}`

      // Fire-and-forget delete of old file
      if (profile.profile_photo_url) {
        const oldPath = profile.profile_photo_url.split("?")[0].split("/").slice(-2).join("/")
        supabase.storage.from("profile-photos").remove([oldPath]).catch(() => {})
      }

      const uploadPromise = supabase.storage
        .from("profile-photos")
        .upload(fileName, fileToUpload, { cacheControl: "3600", upsert: true })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out. Please check your connection.")), 30_000)
      )

      const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise])

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" })
        return
      }

      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`

      // Persist to DB immediately
      await supabase
        .from("homeowner_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("user_id", userId)

      setPhotoUrl(urlWithBust)
      setPhotoError(false)
      toast({ title: "✓ Photo uploaded", description: "Your profile photo has been updated." })
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Unexpected error. Please try again.", variant: "destructive" })
    } finally {
      setUploading(false)
      setUploadStatus(null)
    }
  }

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (!formData.firstName || !formData.lastName || !formData.location) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      setError("Request timed out. Please check your connection and try again.")
    }, 15_000)

    try {
      const { error: updateError } = await supabase
        .from("homeowner_profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          location: formData.location,
          bio: formData.bio || null,
        })
        .eq("user_id", userId)

      clearTimeout(timeoutId)

      if (updateError) throw new Error(updateError.message || `DB error (${updateError.code})`)

      setSuccess(true)
      setTimeout(() => router.push("/dashboard/homeowner"), 1500)
    } catch (err: any) {
      clearTimeout(timeoutId)
      setError(err.message || "Failed to update profile")
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="p-8 bg-slate-800/50 border-slate-700">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Edit Profile</h1>
          <p className="text-slate-400">Update your personal information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Photo upload ── */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-200">Profile Photo</Label>
            <div className="flex items-center space-x-4">
              <Label htmlFor="photo-upload" className="cursor-pointer group relative block">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-slate-600 group-hover:border-emerald-500 flex items-center justify-center transition-all bg-slate-700">
                  {photoUrl && !photoError ? (
                    <img
                      src={photoUrl}
                      alt="Profile photo"
                      className="h-full w-full object-cover"
                      onError={() => {
                        const clean = photoUrl.split("?")[0]
                        if (photoUrl !== clean) { setPhotoUrl(clean) } else { setPhotoError(true) }
                      }}
                      onLoad={() => setPhotoError(false)}
                    />
                  ) : (
                    <span className="text-xl font-bold text-emerald-400">{initials}</span>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/40 rounded-full transition-colors">
                  <Upload className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Label>

              <div className="space-y-2">
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-2 px-3 py-2 text-sm border-2 border-slate-600 rounded-md hover:bg-slate-700 hover:border-emerald-500 text-slate-200 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>{uploadStatus ?? "Upload Photo"}</span>
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
                <p className="text-xs text-slate-400">JPG, PNG or WebP. Max 10MB.</p>
              </div>
            </div>
          </div>

          {/* ── Name ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-slate-200">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-slate-200">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* ── Phone ── */}
          <div>
            <Label htmlFor="phone" className="text-slate-200">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7700 900000"
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          {/* ── Location ── */}
          <div>
            <Label htmlFor="location" className="text-slate-200">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., London, UK"
              required
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          {/* ── Bio ── */}
          <div>
            <Label htmlFor="bio" className="text-slate-200">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us a bit about yourself..."
              rows={4}
              className="bg-slate-700/50 border-2 border-slate-600 focus:border-emerald-500 text-white placeholder:text-slate-400"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm">
              Profile updated successfully! Redirecting...
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
