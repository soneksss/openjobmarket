"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Briefcase, MapPin, Plus, X, ArrowLeft, Map, Target, Upload, Camera } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createJob, updateJob } from "@/app/jobs/actions"
import { LocationInput } from "@/components/location-input"
import { ProfessionalMap } from "@/components/professional-map"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/client"
import { useToast } from "@/hooks/use-toast"

interface CompanyProfile {
  id: string
  company_name: string
  location: string
}

interface JobPostingFormProps {
  companyProfile: CompanyProfile
  existingJob?: any
}

export default function JobPostingForm({ companyProfile, existingJob }: JobPostingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detect if this is a job/task (for tradespeople) or a vacancy (for jobseekers)
  const isJobTask = existingJob?.is_tradespeople_job === true

  const [formData, setFormData] = useState({
    title: existingJob?.title || "",
    description: existingJob?.description || "",
    requirements: existingJob?.requirements || [],
    responsibilities: existingJob?.responsibilities || [],
    jobTypes: existingJob?.job_type ? [existingJob.job_type] : [],
    experienceLevels: existingJob?.experience_level ? [existingJob.experience_level] : [],
    workLocations: existingJob?.work_location ? [existingJob.work_location] : [],
    location: existingJob?.location || companyProfile.location,
    salaryMin: existingJob?.salary_min?.toString() || "",
    salaryMax: existingJob?.salary_max?.toString() || "",
    salaryPeriod: existingJob?.salary_period || (isJobTask ? "per_job" : "yearly"),
    skillsRequired: existingJob?.skills_required || [],
    benefits: existingJob?.benefits || [],
    isActive: existingJob?.is_active ?? true,
  })

  // Photo state
  const [jobPhoto, setJobPhoto] = useState<File | null>(null)
  const [jobPhotoUrl, setJobPhotoUrl] = useState<string | null>(existingJob?.job_photo_url || null)
  const [photoChanged, setPhotoChanged] = useState(false)

  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(
    existingJob?.latitude && existingJob?.longitude
      ? { lat: existingJob.latitude, lon: existingJob.longitude }
      : null
  )
  const [locationError, setLocationError] = useState("")

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)

  const [newRequirement, setNewRequirement] = useState("")
  const [newResponsibility, setNewResponsibility] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const [newBenefit, setNewBenefit] = useState("")

  const addItem = (type: "requirements" | "responsibilities" | "skillsRequired" | "benefits", value: string) => {
    if (value.trim() && !formData[type].includes(value.trim())) {
      setFormData((prev) => ({
        ...prev,
        [type]: [...prev[type], value.trim()],
      }))
      // Clear the input
      if (type === "requirements") setNewRequirement("")
      if (type === "responsibilities") setNewResponsibility("")
      if (type === "skillsRequired") setNewSkill("")
      if (type === "benefits") setNewBenefit("")
    }
  }

  const removeItem = (type: "requirements" | "responsibilities" | "skillsRequired" | "benefits", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_: any, i: number) => i !== index),
    }))
  }

  const toggleArrayItem = (field: "jobTypes" | "experienceLevels" | "workLocations", value: string) => {
    setFormData((prev) => {
      const currentArray = prev[field]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [field]: newArray }
    })
  }

  const handleLocationSelect = (locationName: string, lat: number, lon: number) => {
    setFormData((prev) => ({ ...prev, location: locationName }))
    setSelectedLocation({ lat, lon })
    setLocationError("")
  }

  const handleMapPickerClick = () => {
    setShowMapPicker(true)
  }

  const handleMapLocationPick = (lat: number, lon: number) => {
    setMapPickerLocation({
      lat,
      lon,
      name: `Location ${lat.toFixed(4)}, ${lon.toFixed(4)}`
    })
  }

  const confirmMapPickerLocation = () => {
    if (mapPickerLocation) {
      setFormData((prev) => ({ ...prev, location: mapPickerLocation.name }))
      setSelectedLocation({ lat: mapPickerLocation.lat, lon: mapPickerLocation.lon })
      setShowMapPicker(false)
      setLocationError("")
    }
  }

  const cancelMapPicker = () => {
    setShowMapPicker(false)
    setMapPickerLocation(null)
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "⚠️ File Too Large",
        description: "Photo size must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "⚠️ Invalid File Type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }

    try {
      // Always convert to JPEG format (required by Supabase Storage bucket)
      console.log("[Job Edit] Processing image from", (file.size / 1024 / 1024).toFixed(2), "MB")
      const processedFile = await compressImage(file, 1024 * 1024) // 1MB target, always convert to JPEG
      console.log("[Job Edit] Processed to", (processedFile.size / 1024 / 1024).toFixed(2), "MB")

      const previewUrl = URL.createObjectURL(processedFile)
      setJobPhoto(processedFile)
      setJobPhotoUrl(previewUrl)
      setPhotoChanged(true)
    } catch (error) {
      console.error("[Job Edit] Error processing image:", error)
      toast({
        title: "❌ Image Processing Failed",
        description: "Failed to process image. Please try another photo.",
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

          // Try different quality levels to get under target size
          let quality = 0.9
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'))
                  return
                }

                // If still too large and quality can be reduced, try again
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Upload new photo to Supabase Storage if photo was changed
      let updatedPhotoUrl = jobPhotoUrl

      if (photoChanged) {
        if (jobPhoto) {
          // Upload new photo
          console.log("[Job Edit] Uploading new job photo...")
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) {
            setError("You must be logged in to update photos")
            setLoading(false)
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
            console.error("[Job Edit] Photo upload error:", uploadError)
            toast({
              title: "⚠️ Photo Upload Failed",
              description: "Failed to upload photo, but continuing with other changes",
              variant: "destructive",
            })
            updatedPhotoUrl = existingJob?.job_photo_url || null
          } else {
            const { data: urlData } = supabase.storage
              .from('job-photos')
              .getPublicUrl(fileName)

            updatedPhotoUrl = urlData.publicUrl
            console.log("[Job Edit] Photo uploaded successfully:", updatedPhotoUrl)
          }
        } else {
          // Photo was removed
          updatedPhotoUrl = null
        }
      }

      const jobData: any = {
        company_id: companyProfile.id,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        responsibilities: formData.responsibilities,
        job_type: formData.jobTypes[0] || "full-time", // Use first selected or default
        experience_level: formData.experienceLevels[0] || "mid", // Use first selected or default
        work_location: formData.workLocations[0] || "hybrid", // Use first selected or default
        location: formData.location,
        latitude: selectedLocation?.lat || null,
        longitude: selectedLocation?.lon || null,
        salary_min: formData.salaryMin ? Number.parseInt(formData.salaryMin) : null,
        salary_max: formData.salaryMax ? Number.parseInt(formData.salaryMax) : null,
        salary_period: formData.salaryPeriod || null,
        skills_required: formData.skillsRequired,
        benefits: formData.benefits,
        is_active: formData.isActive,
      }

      // Add photo URL if it exists or was changed
      if (photoChanged) {
        jobData.job_photo_url = updatedPhotoUrl
      }

      let result
      if (existingJob) {
        result = await updateJob(existingJob.id, jobData)
      } else {
        result = await createJob(jobData)
      }

      if (result.error) {
        setError(result.error)
        return
      }

      toast({
        title: "✅ Job Updated Successfully!",
        description: "Your job posting has been updated",
        variant: "default",
      })

      router.push("/dashboard/company")
    } catch (error) {
      console.error("Error saving job:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{existingJob ? "Edit Job" : "Post a New Job"}</h1>
          <p className="text-muted-foreground">
            {existingJob ? "Update your job posting" : "Create a job posting to attract talented candidates"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Essential details about the position</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Senior Software Engineer"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the role, company culture, and what makes this opportunity exciting..."
                    rows={6}
                    required
                  />
                </div>

                {/* Photo Upload - Only for tasks */}
                {isJobTask && (
                  <div className="space-y-2">
                    <Label htmlFor="jobPhoto">Job Photo (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a photo to help describe the job (max 5MB, will be compressed to 1MB)
                    </p>
                    <div className="flex flex-col gap-4">
                      {!jobPhotoUrl ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                          <input
                            id="jobPhoto"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                          <label
                            htmlFor="jobPhoto"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Camera className="h-12 w-12 text-gray-400" />
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
                            className="w-full max-h-[300px] object-cover rounded-lg shadow-md"
                          />
                          <Button
                            type="button"
                            onClick={handleRemovePhoto}
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove Photo
                          </Button>
                          <input
                            id="jobPhoto"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                          <label
                            htmlFor="jobPhoto"
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
                                Change Photo
                              </span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Job Type * (select all that apply)</Label>
                    <div className="space-y-2">
                      {[
                        { value: "full-time", label: "Full-time" },
                        { value: "part-time", label: "Part-time" },
                        { value: "contract", label: "Contract" },
                        { value: "freelance", label: "Freelance" },
                        { value: "internship", label: "Internship" },
                      ].map((type) => (
                        <div key={type.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`jobType-${type.value}`}
                            checked={formData.jobTypes.includes(type.value)}
                            onCheckedChange={() => toggleArrayItem("jobTypes", type.value)}
                          />
                          <Label htmlFor={`jobType-${type.value}`} className="cursor-pointer">{type.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Only show Experience Level for vacancies (not for jobs/tasks) */}
                  {!isJobTask && (
                    <div className="space-y-2">
                      <Label>Experience Level * (select all that apply)</Label>
                      <div className="space-y-2">
                        {[
                          { value: "entry", label: "Entry Level" },
                          { value: "mid", label: "Mid Level" },
                          { value: "senior", label: "Senior" },
                          { value: "lead", label: "Lead" },
                          { value: "executive", label: "Executive" },
                        ].map((level) => (
                          <div key={level.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`expLevel-${level.value}`}
                              checked={formData.experienceLevels.includes(level.value)}
                              onCheckedChange={() => toggleArrayItem("experienceLevels", level.value)}
                            />
                            <Label htmlFor={`expLevel-${level.value}`} className="cursor-pointer">{level.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location & Work Setup */}
            <Card>
              <CardHeader>
                <CardTitle>Location & Work Setup</CardTitle>
                <CardDescription>Where will this person work?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Work Location * (select all that apply)</Label>
                  <div className="flex flex-wrap gap-6">
                    {[
                      { value: "remote", label: "Remote" },
                      { value: "hybrid", label: "Hybrid" },
                      { value: "onsite", label: "On-site" },
                    ].map((location) => (
                      <div key={location.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`workLoc-${location.value}`}
                          checked={formData.workLocations.includes(location.value)}
                          onCheckedChange={() => toggleArrayItem("workLocations", location.value)}
                        />
                        <Label htmlFor={`workLoc-${location.value}`} className="cursor-pointer">{location.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <LocationInput
                        value={formData.location}
                        onChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
                        onLocationSelect={handleLocationSelect}
                        placeholder="e.g. San Francisco, CA or Remote"
                        error={locationError}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleMapPickerClick}
                      className="px-3"
                      variant="outline"
                      title="Pick location on map"
                    >
                      <Map className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedLocation && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Coordinates:</span>
                        <code className="text-blue-700 bg-white px-2 py-0.5 rounded">
                          {selectedLocation.lat.toFixed(6)}, {selectedLocation.lon.toFixed(6)}
                        </code>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        ✓ This job will appear on map searches
                      </p>
                    </div>
                  )}
                  {!selectedLocation && (
                    <p className="text-sm text-amber-600">
                      ⚠ Select a location from the dropdown or use the map picker to enable map display
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Compensation / Budget */}
            <Card>
              <CardHeader>
                <CardTitle>{isJobTask ? "Budget" : "Compensation"}</CardTitle>
                <CardDescription>
                  {isJobTask ? "Budget range for this job" : "Salary range for this position"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">{isJobTask ? "Minimum Budget (£)" : "Minimum Salary (£)"}</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData((prev) => ({ ...prev, salaryMin: e.target.value }))}
                      placeholder={isJobTask ? "200" : "50000"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">{isJobTask ? "Maximum Budget (£)" : "Maximum Salary (£)"}</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData((prev) => ({ ...prev, salaryMax: e.target.value }))}
                      placeholder={isJobTask ? "400" : "80000"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryPeriod">Payment Period</Label>
                    <Select
                      value={formData.salaryPeriod}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, salaryPeriod: value }))}
                    >
                      <SelectTrigger id="salaryPeriod">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_job">Per Job</SelectItem>
                        <SelectItem value="hourly">Per Hour</SelectItem>
                        <SelectItem value="daily">Per Day</SelectItem>
                        <SelectItem value="yearly">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.salaryMin && formData.salaryMax && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {isJobTask ? "Budget" : "Salary"} range: £{Number.parseInt(formData.salaryMin).toLocaleString()} - £{Number.parseInt(formData.salaryMax).toLocaleString()} {formData.salaryPeriod === "per_job" ? "per job" : formData.salaryPeriod}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
                <CardDescription>What qualifications and experience are needed?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a requirement"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addItem("requirements", newRequirement))
                    }
                  />
                  <Button type="button" onClick={() => addItem("requirements", newRequirement)} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.requirements.map((req: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {req}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem("requirements", index)} />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Responsibilities - Only show for vacancies (not for jobs/tasks) */}
            {!isJobTask && (
              <Card>
                <CardHeader>
                  <CardTitle>Responsibilities</CardTitle>
                  <CardDescription>What will this person be responsible for?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a responsibility"
                      value={newResponsibility}
                      onChange={(e) => setNewResponsibility(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addItem("responsibilities", newResponsibility))
                      }
                    />
                    <Button type="button" onClick={() => addItem("responsibilities", newResponsibility)} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.responsibilities.map((resp: string, index: number) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {resp}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem("responsibilities", index)} />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
                <CardDescription>What technical and soft skills are needed?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("skillsRequired", newSkill))}
                  />
                  <Button type="button" onClick={() => addItem("skillsRequired", newSkill)} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skillsRequired.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem("skillsRequired", index)} />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Benefits & Perks</CardTitle>
                <CardDescription>What benefits and perks do you offer?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a benefit"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem("benefits", newBenefit))}
                  />
                  <Button type="button" onClick={() => addItem("benefits", newBenefit)} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {benefit}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem("benefits", index)} />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Publishing Options */}
            <Card>
              <CardHeader>
                <CardTitle>Publishing Options</CardTitle>
                <CardDescription>Control how your job appears</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                  />
                  <Label htmlFor="isActive">Publish job immediately</Label>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-600 text-sm">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/company">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : existingJob ? "Update Job" : "Post Job"}
              </Button>
            </div>
          </div>
        </form>

        {/* Map Picker Modal */}
        {showMapPicker && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col relative z-[10000]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pick Job Location on Map</h3>
                  <p className="text-sm text-gray-600">Click anywhere on the map to select the job location</p>
                </div>
                <Button
                  onClick={cancelMapPicker}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Map Area */}
              <div className="flex-1 relative">
                <ProfessionalMap
                  key={`picker-${Date.now()}`}
                  professionals={[]}
                  center={selectedLocation ? { lat: selectedLocation.lat, lon: selectedLocation.lon } : { lat: 51.5074, lon: -0.1278 }}
                  zoom={10}
                  height="100%"
                  onMapClick={handleMapLocationPick}
                  selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
                />

                {/* Location Display Overlay - Top Left */}
                {mapPickerLocation && (
                  <div className="absolute top-4 left-4 z-[1000]">
                    <div className="bg-white rounded-lg shadow-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900">Selected Location</div>
                          <code className="text-gray-600 text-xs">{mapPickerLocation.lat.toFixed(6)}, {mapPickerLocation.lon.toFixed(6)}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Crosshair indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Target className="h-8 w-8 text-red-500 opacity-70" />
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {mapPickerLocation ? (
                      <span className="font-medium text-gray-900">
                        Click "Use This Location" to confirm your selection
                      </span>
                    ) : (
                      <span>
                        Click anywhere on the map to select a location
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={cancelMapPicker} variant="outline">
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmMapPickerLocation}
                      disabled={!mapPickerLocation}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Use This Location
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
