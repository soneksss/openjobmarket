"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Clock, Eye, EyeOff, Calendar, Camera, Upload, X as XIcon } from "lucide-react"
import { createClient } from "@/lib/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  currentJob: {
    title: string
    description: string
    short_description?: string
    location: string
    latitude?: number
    longitude?: number
    salary_min?: number
    salary_max?: number
    salary_frequency?: string
    work_location?: string
    job_type?: string
    job_photo_url?: string | null
  }
}

export function HomeownerJobActions({
  jobId,
  jobTitle,
  isActive,
  expiresAt,
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
  const [extensionDays, setExtensionDays] = useState("30")

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
    salary_min: currentJob.salary_min?.toString() || "",
    salary_max: currentJob.salary_max?.toString() || "",
    salary_frequency: currentJob.salary_frequency || "one_time",
    work_location: currentJob.work_location || "on-site", // Use hyphen, not underscore
    job_type: currentJob.job_type || "contract",
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

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Delete job
      const { error } = await supabase.from("jobs").delete().eq("id", jobId)

      if (error) throw error

      // Redirect to dashboard
      router.push("/dashboard/homeowner")
      router.refresh()
    } catch (error) {
      console.error("Error deleting job:", error)
      alert("Failed to delete job. Please try again.")
    } finally {
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
      alert("Failed to update job status. Please try again.")
    } finally {
      setIsToggling(false)
    }
  }

  const handleExtend = async () => {
    setIsExtending(true)
    const supabase = createClient()

    try {
      // Calculate new expiry date
      const currentExpiry = expiresAt ? new Date(expiresAt) : new Date()
      const now = new Date()

      // If job is expired, extend from now, otherwise extend from current expiry
      const baseDate = currentExpiry > now ? currentExpiry : now
      const newExpiry = new Date(baseDate)
      newExpiry.setDate(newExpiry.getDate() + parseInt(extensionDays))

      const { error } = await supabase
        .from("jobs")
        .update({
          expires_at: newExpiry.toISOString(),
          is_active: true, // Reactivate the job
        })
        .eq("id", jobId)

      if (error) throw error

      router.refresh()
      setShowExtendDialog(false)
    } catch (error) {
      console.error("Error extending job:", error)
      alert("Failed to extend job. Please try again.")
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

          const { error: uploadError } = await supabase.storage
            .from('job-photos')
            .upload(fileName, jobPhoto, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg'
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

      if (editForm.salary_min) {
        updateData.salary_min = parseInt(editForm.salary_min)
      }

      if (editForm.salary_max) {
        updateData.salary_max = parseInt(editForm.salary_max)
      }

      if (editForm.salary_frequency) {
        updateData.salary_frequency = editForm.salary_frequency
      }

      if (editForm.work_location) {
        updateData.work_location = editForm.work_location
      }

      if (editForm.job_type) {
        updateData.job_type = editForm.job_type
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{jobTitle}". This action cannot be undone. All applications for this job
              will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Job Posting</DialogTitle>
            <DialogDescription>
              Choose how many days to extend this job posting. The job will be reactivated if it's currently expired.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days">Extension Period</Label>
              <Select value={extensionDays} onValueChange={setExtensionDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days (1 month)</SelectItem>
                  <SelectItem value="60">60 days (2 months)</SelectItem>
                  <SelectItem value="90">90 days (3 months)</SelectItem>
                </SelectContent>
              </Select>
              {expiresAt && (
                <p className="text-sm text-muted-foreground">
                  Current expiry: {new Date(expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtend} disabled={isExtending}>
              {isExtending ? "Extending..." : "Extend Job"}
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
                <Label htmlFor="edit-salary-min">Min Budget (£)</Label>
                <Input
                  id="edit-salary-min"
                  type="number"
                  value={editForm.salary_min}
                  onChange={(e) => setEditForm({ ...editForm, salary_min: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary-max">Max Budget (£)</Label>
                <Input
                  id="edit-salary-max"
                  type="number"
                  value={editForm.salary_max}
                  onChange={(e) => setEditForm({ ...editForm, salary_max: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary-freq">Period</Label>
                <Select
                  value={editForm.salary_frequency}
                  onValueChange={(value) => setEditForm({ ...editForm, salary_frequency: value })}
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

            {/* Job Type */}
            <div className="space-y-2">
              <Label htmlFor="edit-job-type">Job Type</Label>
              <Select value={editForm.job_type} onValueChange={(value) => setEditForm({ ...editForm, job_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
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
