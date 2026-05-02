"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Edit, Clock, Eye, EyeOff, Camera, Upload, X as XIcon, Loader2, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface HomeownerJobActionsProps {
  jobId: string
  jobTitle: string
  isActive: boolean
  expiresAt: string | null
  jobStatus?: string
  urgencyType?: string
  currentJob: {
    title: string
    description: string
    short_description?: string
    location: string
    latitude?: number
    longitude?: number
    budget_min?: number
    budget_max?: number
    budget_period?: string
    work_location?: string
    job_photo_url?: string | null
  }
}

export function HomeownerJobActions({
  jobId,
  jobTitle,
  isActive,
  expiresAt,
  jobStatus,
  urgencyType,
  currentJob,
}: HomeownerJobActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const isUrgentJob = urgencyType === "asap" || urgencyType === "today"
  const [extensionValue, setExtensionValue] = useState(isUrgentJob ? "1" : "7")

  // Photo state
  const [jobPhoto, setJobPhoto] = useState<File | null>(null)
  const [jobPhotoUrl, setJobPhotoUrl] = useState<string | null>(currentJob.job_photo_url || null)
  const [photoChanged, setPhotoChanged] = useState(false)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: currentJob.title,
    description: currentJob.description,
    short_description: currentJob.short_description || "",
    location: currentJob.location,
    budget_min: currentJob.budget_min?.toString() || "",
    budget_max: currentJob.budget_max?.toString() || "",
    budget_period: currentJob.budget_period || "one_time",
    work_location: currentJob.work_location || "on-site", // Use hyphen, not underscore
  })

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "⚠️ File Too Large",
        description: "Photo size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "⚠️ Invalid File Type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    setIsProcessingPhoto(true)
    try {
      const processedFile = await compressImage(file, 1024 * 1024)
      const previewUrl = URL.createObjectURL(processedFile)
      setJobPhoto(processedFile)
      setJobPhotoUrl(previewUrl)
      setPhotoChanged(true)
    } catch (error) {
      toast({
        title: "❌ Image Processing Failed",
        description: "Failed to process image",
        variant: "destructive",
      })
    } finally {
      setIsProcessingPhoto(false)
    }
  }

  const compressImage = (file: File, maxSizeBytes: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0)

          let quality = 0.9
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'))
                  return
                }

                if (blob.size > maxSizeBytes && quality > 0.1) {
                  quality -= 0.1
                  tryCompress()
                  return
                }

                // Create file from blob (always JPEG)
                // Replace original extension with .jpg
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
                const jpegFileName = `${nameWithoutExt}.jpg`

                const compressedFile = new File([blob], jpegFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              },
              'image/jpeg',
              quality
            )
          }
          tryCompress()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const handleRemovePhoto = () => {
    if (jobPhotoUrl && photoChanged) {
      URL.revokeObjectURL(jobPhotoUrl)
    }
    setJobPhoto(null)
    setJobPhotoUrl(null)
    setPhotoChanged(true)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Use server-side admin route — bypasses RLS so the DELETE never hangs
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }

      setShowDeleteDialog(false)
      // Use location.href for a hard navigation — ensures the server page
      // re-fetches fresh data instead of serving the cached job list.
      window.location.href = "/dashboard/homeowner"
    } catch (error: any) {
      console.error("Error deleting job:", error)
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete job. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleToggleActive = async () => {
    setIsToggling(true)
    const supabase = createClient()

    try {
      const now = new Date()
      const isExpired = expiresAt ? new Date(expiresAt) < now : false
      const updateData: any = { is_active: !isActive }

      // When activating an expired job, also reset expires_at so it becomes visible again
      if (!isActive && isExpired) {
        const newExpiry = new Date(now)
        if (isUrgentJob) {
          newExpiry.setHours(newExpiry.getHours() + 1)
        } else {
          newExpiry.setDate(newExpiry.getDate() + 7)
        }
        updateData.expires_at = newExpiry.toISOString()
        updateData.matching_status = "searching"
      }

      const { error } = await supabase.from("jobs").update(updateData).eq("id", jobId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error toggling job status:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update job status. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsToggling(false)
    }
  }

  const handleExtend = async () => {
    setIsExtending(true)
    const supabase = createClient()

    try {
      // Calculate new expiry — always extend from now so expired jobs restart fresh
      const now = new Date()
      const newExpiry = new Date(now)

      if (isUrgentJob) {
        newExpiry.setHours(newExpiry.getHours() + parseInt(extensionValue))
      } else {
        newExpiry.setDate(newExpiry.getDate() + parseInt(extensionValue))
      }

      const { error } = await supabase
        .from("jobs")
        .update({
          expires_at:      newExpiry.toISOString(),
          is_active:       true,
          matching_status: "searching",
          // Reset dispatch state so the job can be re-dispatched
          ...(isUrgentJob ? { dispatch_state: null } : {}),
        })
        .eq("id", jobId)

      if (error) throw error

      if (isUrgentJob) {
        // Re-trigger Uber-style dispatch so tradespeople are re-notified,
        // then land directly on the live search screen.
        fetch(`/api/jobs/${jobId}/dispatch-urgent`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {}) // fire-and-forget — live view polls anyway

        setShowExtendDialog(false)
        router.push(`/jobs/${jobId}/live`)
      } else {
        router.refresh()
        setShowExtendDialog(false)
      }
    } catch (error) {
      console.error("Error extending job:", error)
      toast({
        title: "Extension Failed",
        description: "Failed to extend job. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsExtending(false)
    }
  }

  const handleEdit = async () => {
    setIsEditing(true)

    try {
      // Upload new photo to Supabase Storage if photo was changed
      let updatedPhotoUrl = jobPhotoUrl

      if (photoChanged) {
        if (jobPhoto) {
          // Upload new photo
          console.log("[HOMEOWNER-JOB-ACTIONS] Uploading new job photo...")
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) {
            toast({
              title: "⚠️ Authentication Required",
              description: "You must be logged in to upload photos",
              variant: "destructive",
            })
            setIsEditing(false)
            return
          }

          // Always use .jpg extension since we convert all images to JPEG
          // Use folder structure to match RLS policy: {userId}/filename.jpg
          const fileName = `${user.id}/${Date.now()}.jpg`

          const { error: uploadError } = await supabase.storage.from('job-photos').upload(fileName, jobPhoto, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg',
          })

          if (uploadError) {
            console.error("[HOMEOWNER-JOB-ACTIONS] Photo upload error:", uploadError)
            toast({
              title: "⚠️ Photo Upload Failed",
              description: "Failed to upload photo, but continuing with other changes",
              variant: "destructive",
            })
            updatedPhotoUrl = currentJob.job_photo_url || null
          } else {
            const { data: urlData } = supabase.storage
              .from('job-photos')
              .getPublicUrl(fileName)

            updatedPhotoUrl = urlData.publicUrl
            console.log("[HOMEOWNER-JOB-ACTIONS] Photo uploaded successfully:", updatedPhotoUrl)
          }
        } else {
          // Photo was removed
          updatedPhotoUrl = null
        }
      }

      // Build update object with only non-null values
      const updateData: any = {
        title: editForm.title,
        description: editForm.description,
        location: editForm.location,
      }

      // Add optional fields only if they have values
      if (editForm.short_description) {
        updateData.short_description = editForm.short_description
      }

      if (editForm.budget_min) {
        updateData.budget_min = parseInt(editForm.budget_min)
      }

      if (editForm.budget_max) {
        updateData.budget_max = parseInt(editForm.budget_max)
      }

      if (editForm.budget_period) {
        updateData.budget_period = editForm.budget_period
      }

      if (editForm.work_location) {
        updateData.work_location = editForm.work_location
      }

      // Add photo URL if it was changed
      if (photoChanged) {
        updateData.job_photo_url = updatedPhotoUrl
      }

      console.log("[HOMEOWNER-JOB-ACTIONS] Updating job with data:", updateData)

      const { error } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", jobId)

      if (error) {
        console.error("[HOMEOWNER-JOB-ACTIONS] Update error details:", error)
        throw error
      }

      console.log("[HOMEOWNER-JOB-ACTIONS] Job updated successfully")

      toast({
        title: "✅ Job Updated Successfully!",
        description: "Your job posting has been updated",
        variant: "default",
      })

      router.refresh()
      setShowEditDialog(false)
    } catch (error: any) {
      console.error("[HOMEOWNER-JOB-ACTIONS] Error updating job:", error)
      toast({
        title: "❌ Update Failed",
        description: error.message || "Failed to update job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEditing(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Edit Button */}
      <button
        onClick={() => setShowEditDialog(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
      >
        <Edit className="w-3.5 h-3.5 flex-shrink-0" />
        Edit
      </button>

      {/* Toggle Active/Inactive */}
      <button
        onClick={handleToggleActive}
        disabled={isToggling}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
      >
        {isActive ? <EyeOff className="w-3.5 h-3.5 flex-shrink-0" /> : <Eye className="w-3.5 h-3.5 flex-shrink-0" />}
        {isActive ? "Deactivate" : "Activate"}
      </button>

      {/* Extend */}
      <button
        onClick={() => setShowExtendDialog(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
      >
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        Extend
      </button>

      {/* Delete — icon only */}
      <button
        onClick={() => setShowDeleteDialog(true)}
        className="inline-flex items-center justify-center text-xs font-semibold px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Delete Confirmation — compact mobile-friendly overlay */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Icon */}
            <div className="flex flex-col items-center px-5 pt-6 pb-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-base font-bold text-white mb-1">Delete job?</p>
              <p className="text-sm text-slate-400 leading-snug">
                "<span className="text-white font-medium">{jobTitle}</span>" will be permanently removed along with all its applications.
              </p>
            </div>
            {/* Actions */}
            <div className="flex gap-2 px-4 pb-5">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Dialog */}
      {showExtendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <div className="px-5 pt-5 pb-4">
              <p className="text-base font-bold text-white mb-1">
                {isUrgentJob ? "Restart urgent search" : "Extend job posting"}
              </p>
              <p className="text-sm text-slate-400 mb-4">
                {isUrgentJob
                  ? "Choose a new search window. Nearby tradespeople will be re-notified and you'll go straight to the live search."
                  : "Choose how many days to extend. The job will be reactivated if expired."}
              </p>
              <Select value={extensionValue} onValueChange={setExtensionValue}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                {isUrgentJob ? (
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                  </SelectContent>
                ) : (
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                  </SelectContent>
                )}
              </Select>
            </div>
            <div className="flex gap-2 px-4 pb-5">
              <button
                onClick={() => setShowExtendDialog(false)}
                disabled={isExtending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={isExtending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isExtending ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {isUrgentJob ? "Starting…" : "Extending…"}</>
                ) : (
                  <><Clock className="w-3.5 h-3.5" /> {isUrgentJob ? "Start Live Search" : "Reopen Job"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col" style={{maxHeight: 'calc(100dvh - 80px)'}}>
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex-shrink-0" />

            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-slate-700/60">
              <p className="text-base font-bold text-white">Edit Job</p>
              <p className="text-sm text-slate-400 mt-0.5">Update your job details below.</p>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Job Title *</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="e.g., Plumber needed for bathroom installation"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>

              {/* Short Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Short Description</label>
                <input
                  value={editForm.short_description}
                  onChange={(e) => setEditForm({ ...editForm, short_description: e.target.value })}
                  placeholder="Brief summary (optional)"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Full Description *</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Describe the job in detail..."
                  rows={5}
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                />
              </div>

              {/* Job Photo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Job Photo (Optional)</label>
                {/* Gallery input */}
                <input id="edit-jobPhoto-gallery" type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                {/* Camera input — capture="environment" opens rear camera on mobile */}
                <input id="edit-jobPhoto-camera" type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />

                {isProcessingPhoto ? (
                  <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-xl p-6">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                    <span className="text-sm text-slate-400">Processing photo…</span>
                  </div>
                ) : !jobPhotoUrl ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      htmlFor="edit-jobPhoto-camera"
                      className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-colors"
                    >
                      <Camera className="h-7 w-7 text-slate-400" />
                      <span className="text-xs text-slate-400 font-medium">Take Photo</span>
                    </label>
                    <label
                      htmlFor="edit-jobPhoto-gallery"
                      className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="h-7 w-7 text-slate-400" />
                      <span className="text-xs text-slate-400 font-medium">Choose from Gallery</span>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={jobPhotoUrl} alt="Job preview" className="w-full max-h-48 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <label htmlFor="edit-jobPhoto-gallery" className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition-colors">
                        <Upload className="h-3.5 w-3.5" /> Change
                      </label>
                      <button onClick={handleRemovePhoto} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition-colors">
                        <XIcon className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Location *</label>
                <input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g., London, UK"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>

              {/* Budget */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Min (£)</label>
                  <input
                    type="number"
                    value={editForm.budget_min}
                    onChange={(e) => setEditForm({ ...editForm, budget_min: e.target.value })}
                    placeholder="500"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Max (£)</label>
                  <input
                    type="number"
                    value={editForm.budget_max}
                    onChange={(e) => setEditForm({ ...editForm, budget_max: e.target.value })}
                    placeholder="1000"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Period</label>
                  <Select value={editForm.budget_period} onValueChange={(v) => setEditForm({ ...editForm, budget_period: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-[42px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="per_job">Per Job</SelectItem>
                      <SelectItem value="per_hour">Per Hour</SelectItem>
                      <SelectItem value="per_day">Per Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-slate-700/60 flex-shrink-0">
              <button
                onClick={() => setShowEditDialog(false)}
                disabled={isEditing}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isEditing || !editForm.title || !editForm.description}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isEditing ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
