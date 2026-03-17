"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Clock, Eye, EyeOff, Calendar, Camera, Upload, X as XIcon, Play } from "lucide-react"
import { createClient } from "@/lib/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface HomeownerJobActionsProps {
  jobId: string
  jobTitle: string
  isActive: boolean
  expiresAt: string | null
  jobStatus?: string
  isFlexibleJob?: boolean
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
  isFlexibleJob,
  urgencyType,
  currentJob,
}: HomeownerJobActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isMarkingInProgress, setIsMarkingInProgress] = useState(false)
  const [localStatus, setLocalStatus] = useState(jobStatus)
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

    try {
      // Always convert to JPEG format (required by Supabase Storage bucket)
      console.log("[HOMEOWNER] Processing image from", (file.size / 1024 / 1024).toFixed(2), "MB")
      const processedFile = await compressImage(file, 1024 * 1024) // 1MB target, always convert to JPEG
      console.log("[HOMEOWNER] Processed to", (processedFile.size / 1024 / 1024).toFixed(2), "MB")

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

  const handleMarkInProgress = async () => {
    setIsMarkingInProgress(true)
    try {
      const { error } = await supabase.rpc('mark_flexible_in_progress', { p_job_id: jobId })
      if (error) throw error
      setLocalStatus('ACTIVE')
      toast({ title: "Job marked as in progress" })
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsMarkingInProgress(false)
    }
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
      const { error } = await supabase.from("jobs").update({ is_active: !isActive }).eq("id", jobId)

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
        // Urgent/ASAP jobs extend in hours
        newExpiry.setHours(newExpiry.getHours() + parseInt(extensionValue))
      } else {
        // Flexible/standard jobs extend in days
        newExpiry.setDate(newExpiry.getDate() + parseInt(extensionValue))
      }

      const { error } = await supabase
        .from("jobs")
        .update({
          expires_at: newExpiry.toISOString(),
          is_active: true,
          // Reset matching_status so the trigger allows new applications
          matching_status: "searching",
        })
        .eq("id", jobId)

      if (error) throw error

      router.refresh()
      setShowExtendDialog(false)
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

          // 10-second timeout — storage hangs indefinitely if bucket/RLS not configured
          const photoAbort = new AbortController()
          const photoTimeout = setTimeout(() => photoAbort.abort(), 10000)

          const { error: uploadError } = await Promise.race([
            supabase.storage.from('job-photos').upload(fileName, jobPhoto, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg',
            }),
            new Promise<{ data: null; error: Error }>((resolve) =>
              photoAbort.signal.addEventListener("abort", () =>
                resolve({ data: null, error: new Error("upload_timeout") })
              )
            ),
          ])

          clearTimeout(photoTimeout)

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
    <div className="flex flex-wrap gap-3">
      {/* Mark In Progress — flexible jobs only, while still POSTED */}
      {isFlexibleJob && localStatus === 'POSTED' && (
        <Button
          onClick={handleMarkInProgress}
          disabled={isMarkingInProgress}
          variant="outline"
          className="border-purple-500/50 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30"
        >
          <Play className="w-4 h-4 mr-2" />
          {isMarkingInProgress ? "Updating..." : "Mark as in progress"}
        </Button>
      )}

      {/* Edit Button */}
      <Button onClick={() => setShowEditDialog(true)} variant="outline">
        <Edit className="w-4 h-4 mr-2" />
        Edit Job
      </Button>

      {/* Toggle Active/Inactive Button */}
      <Button onClick={handleToggleActive} disabled={isToggling} variant="outline">
        {isActive ? (
          <>
            <EyeOff className="w-4 h-4 mr-2" />
            Deactivate
          </>
        ) : (
          <>
            <Eye className="w-4 h-4 mr-2" />
            Activate
          </>
        )}
      </Button>

      {/* Extend/Renew Button */}
      <Button onClick={() => setShowExtendDialog(true)} variant="outline">
        <Clock className="w-4 h-4 mr-2" />
        Extend
      </Button>

      {/* Delete Button */}
      <Button onClick={() => setShowDeleteDialog(true)} variant="destructive">
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

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
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Job Posting</DialogTitle>
            <DialogDescription>
              {isUrgentJob
                ? "Choose how many hours to reopen this urgent job. The search window restarts from now."
                : "Choose how many days to extend this job posting. The job will be reactivated if it's currently expired."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extension-value">Extension Period</Label>
              <Select value={extensionValue} onValueChange={setExtensionValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                {isUrgentJob ? (
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                  </SelectContent>
                ) : (
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days (2 weeks)</SelectItem>
                    <SelectItem value="30">30 days (1 month)</SelectItem>
                  </SelectContent>
                )}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtend} disabled={isExtending}>
              {isExtending ? "Extending..." : "Reopen Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update your job details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Job Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="e.g., Plumber needed for bathroom installation"
              />
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-short-desc">Short Description</Label>
              <Input
                id="edit-short-desc"
                value={editForm.short_description}
                onChange={(e) => setEditForm({ ...editForm, short_description: e.target.value })}
                placeholder="Brief summary (optional)"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Full Description *</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Describe the job in detail..."
                rows={6}
              />
            </div>

            {/* Job Photo */}
            <div className="space-y-2">
              <Label htmlFor="edit-jobPhoto">Job Photo (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload a photo to help describe the job (max 5MB)
              </p>
              <div className="flex flex-col gap-4">
                {!jobPhotoUrl ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      id="edit-jobPhoto"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-jobPhoto"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Camera className="h-10 w-10 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        Click to upload a photo
                      </span>
                      <span className="text-xs text-gray-500">
                        JPG, PNG or other image formats
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={jobPhotoUrl}
                      alt="Job preview"
                      className="w-full max-h-[200px] object-cover rounded-lg shadow-md"
                    />
                    <Button
                      type="button"
                      onClick={handleRemovePhoto}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <XIcon className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                    <input
                      id="edit-jobPhoto"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-jobPhoto"
                      className="absolute bottom-2 right-2 cursor-pointer"
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          Change
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location *</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g., London, UK"
              />
            </div>

            {/* Budget */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-budget-min">Min Budget (£)</Label>
                <Input
                  id="edit-budget-min"
                  type="number"
                  value={editForm.budget_min}
                  onChange={(e) => setEditForm({ ...editForm, budget_min: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget-max">Max Budget (£)</Label>
                <Input
                  id="edit-budget-max"
                  type="number"
                  value={editForm.budget_max}
                  onChange={(e) => setEditForm({ ...editForm, budget_max: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget-period">Period</Label>
                <Select
                  value={editForm.budget_period}
                  onValueChange={(value) => setEditForm({ ...editForm, budget_period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_job">Per Job</SelectItem>
                    <SelectItem value="per_hour">Per Hour</SelectItem>
                    <SelectItem value="per_day">Per Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Work Location */}
            <div className="space-y-2">
              <Label htmlFor="edit-work-location">Work Location</Label>
              <Select
                value={editForm.work_location}
                onValueChange={(value) => setEditForm({ ...editForm, work_location: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-site">On Site</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing || !editForm.title || !editForm.description}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
